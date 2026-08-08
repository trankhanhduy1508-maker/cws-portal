import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import {
  IRenderOrdersRepository,
  RENDER_ORDERS_REPOSITORY,
} from './repositories/render-orders.repository.interface';
import { RenderOrder, JobEstimate } from './domain/render-order';
import { JobStatus } from './domain/job-status.enum';
import { RENDER_PROFILES, RenderProfileId } from './domain/render-profile';
import { CreateJobDto, EstimateJobDto } from './dto/create-job.dto';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import {
  PACKAGING_SERVICE,
  IPackagingService,
} from './services/packaging.interface';
import { StorageService } from '../storage/storage.service';
import { B2StorageService } from '../files/b2-storage.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentMethod, PaymentStatus } from '../payments/payment.types';
import { PricingService } from './services/pricing.service';

/** Thời hạn presigned URL cho ảnh preview — đủ dài để xem trong 1 phiên
 * (modal Admin, màn Review), tự động ký lại mỗi lần gọi GET .../preview
 * nên không cần thời hạn dài hơn. */
const PREVIEW_URL_TTL_SECONDS = 1800;
/** Thời hạn presigned URL cho file tải cuối — đủ để trình duyệt bắt đầu
 * tải xong (kể cả mạng chậm/file lớn), ngắn để giảm rủi ro nếu URL vô
 * tình lộ ra (log, lịch sử trình duyệt...). Ký lại mỗi lần gọi
 * GET /jobs/:id/download nên khách bấm tải lại lúc nào cũng có URL mới. */
const DOWNLOAD_URL_TTL_SECONDS = 300;

/**
 * Ước tính ETA/giá/hàng đợi — CHỦ Ý dùng cùng công thức heuristic thô
 * như mockBackend.js phía Portal (dựa trên dung lượng file), để hành
 * vi nhất quán giữa lúc demo (mock) và lúc chạy Backend thật lần đầu.
 * Đây KHÔNG phải công thức thật cuối cùng — khi có Render Optimizer/
 * Scene Analyzer phân tích thật (đã có sẵn 1 phần trong Worker), nên
 * thay thế hàm này bằng ước tính dựa trên phân tích scene thật.
 */
function computeEstimate(
  fileSizeBytes: number | null,
  profileId: RenderProfileId,
): JobEstimate {
  const profile = RENDER_PROFILES[profileId];
  const sizeMb = fileSizeBytes ? fileSizeBytes / (1024 * 1024) : 80;

  const baseEtaSeconds = Math.max(180, sizeMb * 9);
  const baseCostVnd = Math.max(15000, sizeMb * 380);

  return {
    etaSeconds: Math.round(baseEtaSeconds * profile.durationMultiplier),
    costVnd: Math.round((baseCostVnd * profile.costMultiplier) / 1000) * 1000,
    queueSeconds: 0, // Số liệu hàng đợi THẬT sẽ do SchedulerService tính (đọc số Worker online thật), không phải số ngẫu nhiên như bản mock.
  };
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(RENDER_ORDERS_REPOSITORY)
    private readonly ordersRepository: IRenderOrdersRepository,
    private readonly workerFleetGateway: WorkerFleetGateway,
    @Inject(PACKAGING_SERVICE)
    private readonly packagingService: IPackagingService,
    private readonly storageService: StorageService,
    private readonly b2StorageService: B2StorageService,
    private readonly paymentsService: PaymentsService,
    private readonly pricingService: PricingService,
  ) {}

  async estimate(dto: EstimateJobDto): Promise<JobEstimate> {
    const baseEstimate = computeEstimate(
      dto.fileSizeBytes ?? null,
      dto.profileId,
    );

    // Hàng đợi thật: nếu số Worker online hiện tại là 0, báo hàng đợi
    // ước tính dựa trên số lượng order đang active — đơn giản, trung
    // thực hơn số ngẫu nhiên của bản mock trước đây.
    const onlineWorkers = await this.workerFleetGateway.countOnlineWorkers();
    const activeOrders = await this.ordersRepository.findActiveOrders();
    const queueSeconds =
      onlineWorkers > 0 ? 0 : Math.min(activeOrders.length * 240, 3600);

    return { ...baseEstimate, queueSeconds };
  }

  /**
   * Tạo job NGAY, không cần thanh toán trước — render là miễn phí, chỉ
   * việc MỞ TẢI file gốc mới cần thanh toán (CWS_MVP_WORKFLOW_FINAL.md:
   * Google Login → Job → Upload → Render → Preview → Khách duyệt →
   * Sinh QR → Webhook → PAID → Mở tải). Payment chỉ được tạo sau, tại
   * approve() — xem ghi chú ở đó.
   */
  async createOrder(
    dto: CreateJobDto,
    customerId: string | null = null,
    idempotencyKey?: string,
  ): Promise<{ jobId: string }> {
    if (!dto.driveLink && !dto.fileRef) {
      throw new Error('Cần có driveLink hoặc fileRef để tạo job');
    }
    if (!idempotencyKey || !/^[A-Za-z0-9._~-]{16,128}$/.test(idempotencyKey)) {
      throw new BadRequestException(
        'Thiếu hoặc sai Idempotency-Key (16-128 ký tự an toàn)',
      );
    }

    const requestFingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          customerId,
          fileRef: dto.fileRef ?? null,
          driveLink: dto.driveLink ?? null,
          fileName: dto.fileName ?? null,
          fileSizeBytes: dto.fileSizeBytes ?? null,
          software: dto.software ?? null,
          softwareVersion: dto.softwareVersion ?? null,
          notes: dto.notes ?? null,
          profileId: dto.profileId,
        }),
      )
      .digest('hex');

    const existing = this.ordersRepository.findByIdempotencyKey
      ? await this.ordersRepository.findByIdempotencyKey(idempotencyKey)
      : null;
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new ForbiddenException(
          'Idempotency-Key đã được dùng cho request khác',
        );
      }
      return { jobId: existing.id };
    }

    const estimate = await this.estimate({
      fileRef: dto.fileRef,
      driveLink: dto.driveLink,
      fileSizeBytes: dto.fileSizeBytes,
      profileId: dto.profileId,
    });

    const id = randomUUID();
    const projectName =
      dto.fileName ||
      (dto.driveLink ? '(File từ Google Drive)' : 'Không rõ tên file');

    const initialStatus =
      estimate.queueSeconds > 0
        ? JobStatus.QUEUED
        : JobStatus.SEARCHING_WORKERS;

    const storageCode = `CWS-${id.slice(0, 8).toUpperCase()}`;

    const order: RenderOrder = {
      id,
      projectName,
      software: dto.software ?? null,
      softwareVersion: dto.softwareVersion ?? null,
      notes: dto.notes ?? null,
      storageCode,
      customerId,
      profileId: dto.profileId,
      status: initialStatus,
      stageProgress: 0,
      paymentId: null,
      paymentStatus: 'unpaid',
      estimate,
      finalPriceVnd: null,
      workerRuntimeSeconds: null,
      driveLink: dto.driveLink ?? null,
      uploadedFileB2Key: dto.fileRef ?? null,
      fileSizeBytes: dto.fileSizeBytes ?? null,
      internalJobId: null,
      createdAt: Date.now(),
      downloadUrl: null,
      durationSec: null,
      resultSizeBytes: null,
      isPlaceholder: false,
      idempotencyKey,
      requestFingerprint,
    };

    try {
      await this.ordersRepository.create(order);
    } catch (error) {
      // A concurrent retry may win the unique database insert. Re-read the
      // durable row and return it instead of creating/dispatching a duplicate.
      const raced =
        await this.ordersRepository.findByIdempotencyKey(idempotencyKey);
      if (!raced) throw error;
      if (raced.requestFingerprint !== requestFingerprint) {
        throw new ForbiddenException(
          'Idempotency-Key đã được dùng cho request khác',
        );
      }
      return { jobId: raced.id };
    }

    // Dispatch cho Worker Fleet ngay (Model 1) — SchedulerService (chạy
    // định kỳ) sẽ tiếp tục theo dõi và xử lý Model 2 nếu cần Wake.
    await this.dispatchToWorkerFleet(order);

    return { jobId: id };
  }

  private async dispatchToWorkerFleet(order: RenderOrder): Promise<void> {
    // blend_link: ưu tiên driveLink nếu có, nếu không dùng B2 key đã
    // upload (Backend cần build URL B2 thật ở FilesService — xem đó
    // để biết chi tiết, ở đây chỉ ghép chuỗi tối thiểu).
    const blendLink = order.driveLink ?? `b2://${order.uploadedFileB2Key}`;
    const blendFile = order.projectName;

    const internalJobId =
      await this.workerFleetGateway.createInternalJobWithProbeTask({
        internalJobId: order.id,
        blendLink,
        blendFile,
      });

    await this.ordersRepository.attachInternalJobId(order.id, internalJobId);
  }

  async getById(id: string): Promise<RenderOrder> {
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException(`Không tìm thấy job ${id}`);
    return order;
  }

  /**
   * Job có chủ (order.customerId khác null) -> BẮT BUỘC customerId của
   * người gọi phải khớp, kể cả khách chưa đăng nhập (customerId=null bị
   * chặn) — trước đây mọi route theo `:id` (preview/approve/cancel/
   * download/logs/notifications) chỉ dựa vào việc UUID khó đoán, KHÔNG
   * hề kiểm tra chủ sở hữu, nên ai biết được id là xem/thao tác được
   * job của người khác (IDOR). Job KHÔNG có chủ (tạo lúc chưa đăng nhập,
   * customerId=null) vẫn mở cho bất kỳ ai biết id — giữ đúng hành vi cũ
   * cho luồng khách vãng lai (chưa ép đăng nhập được, xem jwt-auth.guard.ts).
   * `isAdmin=true` (chỉ Bearer + AAL2 đã được xác thực ở controller) bỏ qua
   * kiểm tra — Admin Dashboard cần xem/thao tác job của MỌI khách.
   */
  private assertOwnership(
    order: RenderOrder,
    customerId: string | null,
    isAdmin = false,
  ): void {
    if (isAdmin) return;
    if (order.customerId && order.customerId !== customerId) {
      throw new ForbiddenException(`Không có quyền truy cập job ${order.id}`);
    }
  }

  /** Dùng cho route GET /jobs/:id, GET /jobs/:id/status — có kiểm tra chủ sở hữu. */
  async getByIdForCustomer(
    id: string,
    customerId: string | null,
    isAdmin = false,
  ): Promise<RenderOrder> {
    const order = await this.getById(id);
    this.assertOwnership(order, customerId, isAdmin);
    return order;
  }

  /** Admin tra cứu theo Storage Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  async getByStorageCode(storageCode: string): Promise<RenderOrder> {
    const order = await this.ordersRepository.findByStorageCode(storageCode);
    if (!order)
      throw new NotFoundException(
        `Không tìm thấy job với storage code ${storageCode}`,
      );
    return order;
  }

  /** customerId có -> chỉ trả job của đúng khách đó (đã đăng nhập Google).
   * customerId null -> TRẢ TOÀN BỘ job của mọi khách (giới hạn đã biết:
   * Portal chưa bắt buộc đăng nhập, xem jwt-auth.guard.ts và
   * API_DOCUMENTATION.md). */
  async listAll(customerId: string | null = null): Promise<RenderOrder[]> {
    if (customerId) return this.ordersRepository.findByCustomerId(customerId);
    return this.ordersRepository.findAll();
  }

  /** Các trạng thái CÒN Ở GIAI ĐOẠN MIỄN PHÍ (trước khi sinh QR thanh
   * toán tại approve()) — CHỈ những trạng thái này được phép huỷ. Sửa
   * lỗi nghiêm trọng phát hiện qua tự rà soát 31/07/2026: trước đây
   * cancel() KHÔNG kiểm tra status, cho phép huỷ ngay cả khi đã
   * AWAITING_PAYMENT (QR đã sinh, có thể khách ĐÃ chuyển khoản thật) —
   * nếu khách bấm "Huỷ job" đúng lúc webhook ngân hàng sắp/vừa xác nhận
   * PAID, `finalizeDelivery()` sẽ từ chối đóng gói/mở tải vì status
   * không còn là AWAITING_PAYMENT nữa, khiến khách MẤT TIỀN THẬT mà
   * KHÔNG BAO GIỜ nhận được file, và hệ thống không có cơ chế hoàn
   * tiền/cảnh báo nào cho trường hợp này. */
  private static readonly CANCELLABLE_STATUSES = new Set<JobStatus>([
    JobStatus.QUEUED,
    JobStatus.SEARCHING_WORKERS,
    JobStatus.ALLOCATING_WORKERS,
    JobStatus.WORKERS_CONNECTED,
    JobStatus.RENDERING,
    JobStatus.REVIEW_READY,
  ]);

  async cancel(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ): Promise<RenderOrder> {
    const existing = await this.getById(id);
    this.assertOwnership(existing, customerId, isAdmin);
    if (!JobsService.CANCELLABLE_STATUSES.has(existing.status)) {
      throw new BadRequestException(
        `Job ${id} đã sang giai đoạn thanh toán/hoàn tất (trạng thái hiện tại: ${existing.status}) — không thể tự huỷ nữa, vui lòng liên hệ Admin.`,
      );
    }
    const order = await this.ordersRepository.markCancelled(id);
    if (!order) throw new NotFoundException(`Không tìm thấy job ${id}`);

    // Đóng lỗ hổng: trước đây chỉ update render_orders.status, Worker
    // Fleet không hề biết job đã bị huỷ nên vẫn tiếp tục render. Dùng
    // internalJobId (khoá nối sang bảng `jobs`/`tasks` của Worker Fleet,
    // xem WorkerFleetGateway) — KHÔNG phải render_orders.id, dù 2 giá
    // trị này thường trùng nhau lúc tạo job (xem start()). Có thể null
    // nếu job chưa từng tạo internal job (huỷ ngay khi mới queued) —
    // bỏ qua, không có gì bên Worker Fleet để huỷ. Lỗi RPC (network/DB)
    // chỉ log, KHÔNG chặn việc khách nhìn thấy job đã huỷ.
    if (existing.internalJobId) {
      try {
        await this.workerFleetGateway.adminCancelJob(existing.internalJobId);
      } catch (err) {
        this.logger.error(
          `cancel(${id}): huỷ trên Worker Fleet thất bại — ${(err as Error).message}`,
        );
      }
    }

    return order;
  }

  /** Upload the full rendered result before payment, but keep the delivery
   * route locked until the payment record becomes PAID. */
  async prepareLockedOutput(id: string): Promise<RenderOrder> {
    const order = await this.getById(id);
    if (order.downloadUrl) return order;
    if (!order.internalJobId) {
      throw new BadRequestException(`Job ${id} thiếu internalJobId — không thể upload final output`);
    }
    const { fps } = await this.workerFleetGateway.getJobMeta(order.internalJobId);
    const { downloadUrl, resultSizeBytes } = await this.packagingService.packageRenderResult(
      order.internalJobId,
      order.id,
      fps,
    );
    const updated = await this.ordersRepository.updateLockedResult(id, {
      downloadUrl,
      durationSec: Math.max(1, Math.round((Date.now() - order.createdAt) / 1000)),
      resultSizeBytes,
    });
    if (!updated) throw new NotFoundException(`Không lưu được final output của job ${id}`);
    return updated;
  }

  /**
   * Render-first payment boundary.  The Scheduler calls this only after the
   * locked B2 output and real watermarked previews exist.  The old customer
   * approve endpoint delegates here for compatibility, but approval is no
   * longer a prerequisite for creating payment.
   */
  async createPaymentAfterRender(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ): Promise<{
    order: RenderOrder;
    payment: {
      paymentId: string;
      paymentCode: string | null;
      transferContent: string | null;
      qrImageUrl: string | null;
      amountVnd: number;
    };
  }> {
    const order = await this.getById(id);
    this.assertOwnership(order, customerId, isAdmin);
    if (order.paymentId) {
      const existing = await this.paymentsService.getPublicDetails(order.paymentId, customerId, isAdmin);
      return {
        order,
        payment: {
          paymentId: existing.paymentId,
          paymentCode: existing.paymentCode,
          transferContent: existing.transferContent,
          qrImageUrl: existing.qrImageUrl,
          amountVnd: existing.amountVnd,
        },
      };
    }
    if (order.status !== JobStatus.REVIEW_READY) {
      throw new BadRequestException(
        `Job ${id} chưa sẵn sàng tạo payment (trạng thái hiện tại: ${order.status})`,
      );
    }
    if (!order.internalJobId) {
      throw new BadRequestException(
        `Job ${id} thiếu internalJobId — không thể tính giá thật`,
      );
    }

    const { finalPriceVnd, workerRuntimeSeconds } =
      await this.pricingService.computeFinalPriceVnd(order.internalJobId);

    const { paymentId, paymentCode, transferContent, qrImageUrl } =
      await this.paymentsService.createIntent(
        { amountVnd: finalPriceVnd, method: PaymentMethod.QR_BANK },
        { jobId: order.id, storageCode: order.storageCode },
      );

    const updated = await this.ordersRepository.attachPayment(
      id,
      paymentId,
      finalPriceVnd,
      workerRuntimeSeconds,
    );
    if (!updated) throw new NotFoundException(`Không tìm thấy job ${id}`);

    return {
      order: updated,
      payment: {
        paymentId,
        paymentCode,
        transferContent,
        qrImageUrl,
        amountVnd: finalPriceVnd,
      },
    };
  }

  /** Backward-compatible endpoint name; it no longer gates payment creation. */
  async approve(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ) {
    return this.createPaymentAfterRender(id, customerId, isAdmin);
  }

  /**
   * Webhook đã xác nhận PAID cho payment của job này.  The final object was
   * already uploaded under `final/` before payment; this method only flips
   * the delivery state and must never render or upload again.
   */
  async finalizeDelivery(id: string): Promise<RenderOrder | null> {
    const order = await this.getById(id);
    if (order.status === JobStatus.FINISHED) return order;
    if (order.status !== JobStatus.AWAITING_PAYMENT || !order.paymentId)
      return null;

    const paymentStatus = await this.paymentsService.getStatus(order.paymentId);
    if (paymentStatus !== PaymentStatus.PAID) return null;

    if (!order.downloadUrl || !order.resultSizeBytes) {
      throw new BadRequestException(
        `Job ${id} thiếu locked final output — không thể mở tải`,
      );
    }

    await this.ordersRepository.markPaymentPaid(id);
    const updated = await this.ordersRepository.unlockResult(id);
    if (!updated) throw new NotFoundException(`Không tìm thấy job ${id}`);
    return updated;
  }

  /**
   * Khách yêu cầu chỉnh sửa thay vì duyệt (CWS_MVP_WORKFLOW_FINAL.md,
   * mục Review: "Đồng ý. Hoặc yêu cầu chỉnh sửa."). CHỦ Ý KHÔNG tự
   * động re-render hay hoàn tiền — job vẫn ở REVIEW_READY (khách vẫn
   * duyệt được nếu đổi ý), chỉ ghi lại yêu cầu để admin liên hệ khách
   * và xử lý thủ công (re-render hoặc hoàn tiền là quyết định nghiệp
   * vụ, không phải việc tự động hoá được).
   */
  async requestChanges(
    id: string,
    note: string | null,
    customerId: string | null = null,
    isAdmin = false,
  ): Promise<void> {
    const order = await this.getById(id);
    this.assertOwnership(order, customerId, isAdmin);
    if (order.status !== JobStatus.REVIEW_READY) {
      throw new BadRequestException(
        `Job ${id} chưa ở trạng thái chờ duyệt (hiện tại: ${order.status})`,
      );
    }

    await this.storageService.notify(
      id,
      'Khách yêu cầu chỉnh sửa',
      note?.trim()
        ? `Job "${order.projectName}": ${note.trim()}`
        : `Job "${order.projectName}": khách yêu cầu chỉnh sửa (không có ghi chú thêm). Cần liên hệ khách để xác nhận thay đổi.`,
    );
    await this.storageService.logWorkerEvent(
      id,
      null,
      note?.trim() || 'Khách yêu cầu chỉnh sửa, chưa có ghi chú',
      'info',
    );
  }

  /** Danh sách ảnh preview (3-5 ảnh, đã watermark, kèm URL công khai) để khách xem trước khi duyệt. */
  async getReviewImages(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ): Promise<{ url: string; displayOrder: number | null }[]> {
    this.assertOwnership(await this.getById(id), customerId, isAdmin);
    const images = await this.storageService.getReviewImages(id);
    return Promise.all(
      images.map(async (img) => ({
        url: await this.b2StorageService.getSignedUrl(
          img.imagePath,
          PREVIEW_URL_TTL_SECONDS,
        ),
        displayOrder: img.displayOrder,
      })),
    );
  }

  /** Ghi log lượt tải (CWS_DATABASE_SCHEMA.md, bảng downloads) rồi trả
   * về URL thật để Controller redirect — CHỈ cho phép khi job đã
   * FINISHED và có downloadUrl (chưa duyệt thì chưa có gì để tải). */
  async getDownloadRedirectUrl(
    id: string,
    ipAddress: string | null,
    customerId: string | null = null,
    isAdmin = false,
  ): Promise<string> {
    const order = await this.getById(id);
    this.assertOwnership(order, customerId, isAdmin);
    if (order.status !== JobStatus.FINISHED || !order.downloadUrl) {
      throw new BadRequestException(
        `Job ${id} chưa có file để tải (trạng thái hiện tại: ${order.status})`,
      );
    }
    await this.storageService.logDownload(id, ipAddress);
    const key = this.b2StorageService.extractKeyFromPublicUrl(
      order.downloadUrl,
    );
    return this.b2StorageService.getSignedUrl(key, DOWNLOAD_URL_TTL_SECONDS);
  }

  /** Admin xem log Worker (báo lỗi render, CWS_DATABASE_SCHEMA.md bảng worker_logs). */
  async getWorkerLogs(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ) {
    this.assertOwnership(await this.getById(id), customerId, isAdmin);
    return this.storageService.getWorkerLogs(id);
  }

  /** Thông báo hệ thống liên quan tới job (render xong/lỗi). */
  async getNotifications(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ) {
    this.assertOwnership(await this.getById(id), customerId, isAdmin);
    return this.storageService.getNotifications(id);
  }
}
