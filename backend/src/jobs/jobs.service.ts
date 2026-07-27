import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
      paymentStatus: 'paid', // Backend chỉ nhận request tạo job SAU khi PaymentsService xác nhận paid ở tầng Controller
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
}
