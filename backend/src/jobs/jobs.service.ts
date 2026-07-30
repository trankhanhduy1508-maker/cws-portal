import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IRenderOrdersRepository,
  RENDER_ORDERS_REPOSITORY,
} from './repositories/render-orders.repository.interface';
import { RenderOrder, JobEstimate } from './domain/render-order';
import { JobStatus } from './domain/job-status.enum';
import { RENDER_PROFILES, RenderProfileId } from './domain/render-profile';
import { CreateJobDto, EstimateJobDto } from './dto/create-job.dto';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { PACKAGING_SERVICE, IPackagingService } from './services/packaging.interface';
import { StorageService } from '../storage/storage.service';
import { B2StorageService } from '../files/b2-storage.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '../payments/payment.types';

/**
 * Ước tính ETA/giá/hàng đợi — CHỦ Ý dùng cùng công thức heuristic thô
 * như mockBackend.js phía Portal (dựa trên dung lượng file), để hành
 * vi nhất quán giữa lúc demo (mock) và lúc chạy Backend thật lần đầu.
 * Đây KHÔNG phải công thức thật cuối cùng — khi có Render Optimizer/
 * Scene Analyzer phân tích thật (đã có sẵn 1 phần trong Worker), nên
 * thay thế hàm này bằng ước tính dựa trên phân tích scene thật.
 */
function computeEstimate(fileSizeBytes: number | null, profileId: RenderProfileId): JobEstimate {
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
  constructor(
    @Inject(RENDER_ORDERS_REPOSITORY)
    private readonly ordersRepository: IRenderOrdersRepository,
    private readonly workerFleetGateway: WorkerFleetGateway,
    @Inject(PACKAGING_SERVICE) private readonly packagingService: IPackagingService,
    private readonly storageService: StorageService,
    private readonly b2StorageService: B2StorageService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async estimate(dto: EstimateJobDto): Promise<JobEstimate> {
    const baseEstimate = computeEstimate(dto.fileSizeBytes ?? null, dto.profileId);

    // Hàng đợi thật: nếu số Worker online hiện tại là 0, báo hàng đợi
    // ước tính dựa trên số lượng order đang active — đơn giản, trung
    // thực hơn số ngẫu nhiên của bản mock trước đây.
    const onlineWorkers = await this.workerFleetGateway.countOnlineWorkers();
    const activeOrders = await this.ordersRepository.findActiveOrders();
    const queueSeconds = onlineWorkers > 0 ? 0 : Math.min(activeOrders.length * 240, 3600);

    return { ...baseEstimate, queueSeconds };
  }

  async createOrder(dto: CreateJobDto): Promise<{ jobId: string }> {
    if (!dto.driveLink && !dto.fileRef) {
      throw new Error('Cần có driveLink hoặc fileRef để tạo job');
    }

    // Chỉ tạo job nếu paymentId thật sự đã PAID — tránh việc Client tự
    // gửi 1 paymentId bất kỳ (chưa thanh toán) để tạo job miễn phí.
    const paymentStatus = await this.paymentsService.getStatus(dto.paymentId);
    if (paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException(
        `Payment ${dto.paymentId} chưa ở trạng thái PAID (hiện tại: ${paymentStatus})`,
      );
    }

    const estimate = await this.estimate({
      fileRef: dto.fileRef,
      driveLink: dto.driveLink,
      fileSizeBytes: dto.fileSizeBytes,
      profileId: dto.profileId,
    });

    const id = randomUUID();
    const projectName =
      dto.fileName || (dto.driveLink ? '(File từ Google Drive)' : 'Không rõ tên file');

    const initialStatus = estimate.queueSeconds > 0 ? JobStatus.QUEUED : JobStatus.SEARCHING_WORKERS;

    const order: RenderOrder = {
      id,
      projectName,
      profileId: dto.profileId,
      status: initialStatus,
      stageProgress: 0,
      paymentId: dto.paymentId,
      paymentStatus: paymentStatus as unknown as RenderOrder['paymentStatus'],
      estimate,
      driveLink: dto.driveLink ?? null,
      uploadedFileB2Key: dto.fileRef ?? null,
      fileSizeBytes: dto.fileSizeBytes ?? null,
      internalJobId: null,
      createdAt: Date.now(),
      downloadUrl: null,
      durationSec: null,
      resultSizeBytes: null,
      isPlaceholder: false,
    };

    await this.ordersRepository.create(order);

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

    const internalJobId = await this.workerFleetGateway.createInternalJobWithProbeTask({
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

  async listAll(): Promise<RenderOrder[]> {
    return this.ordersRepository.findAll();
  }

  async cancel(id: string): Promise<RenderOrder> {
    const order = await this.ordersRepository.markCancelled(id);
    if (!order) throw new NotFoundException(`Không tìm thấy job ${id}`);
    return order;
  }

  /**
   * Khách duyệt bản preview (CWS_ROADMAP_MVP_V1.md, Giai đoạn 4) — CHỈ
   * từ đây mới đóng gói kết quả cuối + mở link tải. Gọi trước đó (khi
   * order chưa ở REVIEW_READY) là lỗi rõ ràng, không âm thầm bỏ qua.
   */
  async approve(id: string): Promise<RenderOrder> {
    const order = await this.getById(id);
    if (order.status !== JobStatus.REVIEW_READY) {
      throw new BadRequestException(
        `Job ${id} chưa sẵn sàng để duyệt (trạng thái hiện tại: ${order.status})`,
      );
    }
    if (!order.internalJobId) {
      throw new BadRequestException(`Job ${id} thiếu internalJobId — không thể đóng gói`);
    }

    await this.ordersRepository.updateStatus(id, JobStatus.PACKAGING, 0);

    const { downloadUrl, resultSizeBytes } = await this.packagingService.packageRenderResult(
      order.internalJobId,
      order.id,
    );

    const durationSec = Math.round((Date.now() - order.createdAt) / 1000);

    const updated = await this.ordersRepository.updateResult(id, {
      downloadUrl,
      durationSec,
      resultSizeBytes,
      isPlaceholder: false,
    });
    if (!updated) throw new NotFoundException(`Không tìm thấy job ${id}`);
    return updated;
  }

  /** Danh sách ảnh preview (3-5 ảnh, đã watermark, kèm URL công khai) để khách xem trước khi duyệt. */
  async getReviewImages(id: string): Promise<{ url: string; displayOrder: number | null }[]> {
    await this.getById(id); // 404 nếu job không tồn tại
    const images = await this.storageService.getReviewImages(id);
    return images.map((img) => ({
      url: this.b2StorageService.getPublicUrl(img.imagePath),
      displayOrder: img.displayOrder,
    }));
  }

  /** Ghi log lượt tải (CWS_DATABASE_SCHEMA.md, bảng downloads) rồi trả
   * về URL thật để Controller redirect — CHỈ cho phép khi job đã
   * FINISHED và có downloadUrl (chưa duyệt thì chưa có gì để tải). */
  async getDownloadRedirectUrl(id: string, ipAddress: string | null): Promise<string> {
    const order = await this.getById(id);
    if (order.status !== JobStatus.FINISHED || !order.downloadUrl) {
      throw new BadRequestException(`Job ${id} chưa có file để tải (trạng thái hiện tại: ${order.status})`);
    }
    await this.storageService.logDownload(id, ipAddress);
    return order.downloadUrl;
  }
}
