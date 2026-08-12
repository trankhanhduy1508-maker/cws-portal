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
import { CreateJobDto } from './dto/create-job.dto';
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

const PREVIEW_URL_TTL_SECONDS = 1800;
const DOWNLOAD_URL_TTL_SECONDS = 300;

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

  private async buildQueueSnapshot(): Promise<JobEstimate> {
    const onlineWorkers = await this.workerFleetGateway.countOnlineWorkers();
    const activeOrders = await this.ordersRepository.findActiveOrders();
    const queueSeconds =
      onlineWorkers > 0 ? 0 : Math.min(activeOrders.length * 240, 3600);

    // No customer render tier/pre-render price heuristic. These fields remain
    // only as a neutral compatibility snapshot until the adaptive scheduler
    // exposes grounded ETA telemetry.
    return { etaSeconds: 0, costVnd: 0, queueSeconds };
  }

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
          fileRef: idempotencyKey.startsWith('auto-') ? null : (dto.fileRef ?? null),
          driveLink: dto.driveLink ?? null,
          fileName: dto.fileName ?? null,
          fileSizeBytes: dto.fileSizeBytes ?? null,
          software: dto.software ?? null,
          softwareVersion: dto.softwareVersion ?? null,
          notes: dto.notes ?? null,
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

    const estimate = await this.buildQueueSnapshot();
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

    await this.dispatchToWorkerFleet(order);
    return { jobId: id };
  }

  private async dispatchToWorkerFleet(order: RenderOrder): Promise<void> {
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

  async getByIdForCustomer(
    id: string,
    customerId: string | null,
    isAdmin = false,
  ): Promise<RenderOrder> {
    const order = await this.getById(id);
    this.assertOwnership(order, customerId, isAdmin);
    return order;
  }

  async getByStorageCode(storageCode: string): Promise<RenderOrder> {
    const order = await this.ordersRepository.findByStorageCode(storageCode);
    if (!order)
      throw new NotFoundException(
        `Không tìm thấy job với storage code ${storageCode}`,
      );
    return order;
  }

  async listAll(customerId: string | null = null): Promise<RenderOrder[]> {
    if (customerId) return this.ordersRepository.findByCustomerId(customerId);
    return this.ordersRepository.findAll();
  }

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

  async approve(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ) {
    return this.createPaymentAfterRender(id, customerId, isAdmin);
  }

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

  async getWorkerLogs(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ) {
    this.assertOwnership(await this.getById(id), customerId, isAdmin);
    return this.storageService.getWorkerLogs(id);
  }

  async getNotifications(
    id: string,
    customerId: string | null = null,
    isAdmin = false,
  ) {
    this.assertOwnership(await this.getById(id), customerId, isAdmin);
    return this.storageService.getNotifications(id);
  }
}
