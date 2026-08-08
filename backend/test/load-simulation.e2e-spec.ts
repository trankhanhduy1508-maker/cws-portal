import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { AppModule } from './../src/app.module';
import { SupabaseService } from '../src/supabase/supabase.service';
import { WorkerFleetGateway } from '../src/jobs/worker-fleet.gateway';
import {
  IRenderOrdersRepository,
  RENDER_ORDERS_REPOSITORY,
} from '../src/jobs/repositories/render-orders.repository.interface';
import { RenderOrder } from '../src/jobs/domain/render-order';
import { JobStatus } from '../src/jobs/domain/job-status.enum';
import { StorageService } from '../src/storage/storage.service';
import { PreviewService } from '../src/storage/preview.service';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { InputUploadsService } from '../src/files/input-uploads.service';

type LoadTask = {
  jobId: string;
  status: 'queued' | 'active' | 'done';
  workerId: string | null;
  generation: number;
};

class LoadOrdersRepository implements IRenderOrdersRepository {
  readonly orders = new Map<string, RenderOrder>();

  async create(order: RenderOrder): Promise<RenderOrder> {
    if (
      order.idempotencyKey &&
      [...this.orders.values()].some(
        (item) => item.idempotencyKey === order.idempotencyKey,
      )
    ) {
      throw new Error('duplicate idempotency key');
    }
    this.orders.set(order.id, structuredClone(order));
    return structuredClone(order);
  }

  async findByIdempotencyKey(key: string): Promise<RenderOrder | null> {
    const order = [...this.orders.values()].find(
      (item) => item.idempotencyKey === key,
    );
    return order ? structuredClone(order) : null;
  }

  async findById(id: string): Promise<RenderOrder | null> {
    const order = this.orders.get(id);
    return order ? structuredClone(order) : null;
  }

  async findByStorageCode(storageCode: string): Promise<RenderOrder | null> {
    const order = [...this.orders.values()].find(
      (item) => item.storageCode === storageCode,
    );
    return order ? structuredClone(order) : null;
  }

  async findAll(): Promise<RenderOrder[]> {
    return [...this.orders.values()].map((order) => structuredClone(order));
  }

  async findByCustomerId(customerId: string): Promise<RenderOrder[]> {
    return [...this.orders.values()]
      .filter((order) => order.customerId === customerId)
      .map((order) => structuredClone(order));
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    stageProgress: number,
  ): Promise<RenderOrder | null> {
    const order = this.orders.get(id);
    if (!order) return null;
    order.status = status;
    order.stageProgress = stageProgress;
    return structuredClone(order);
  }

  async updateResult(): Promise<RenderOrder | null> {
    return null;
  }

  async markCancelled(id: string): Promise<RenderOrder | null> {
    return this.updateStatus(id, JobStatus.CANCELLED, 0);
  }

  async attachInternalJobId(id: string, internalJobId: string): Promise<void> {
    const order = this.orders.get(id);
    if (order) order.internalJobId = internalJobId;
  }

  async attachPayment(): Promise<RenderOrder | null> {
    return null;
  }

  async markPaymentPaid(): Promise<void> {
    return undefined;
  }

  async findActiveOrders(): Promise<RenderOrder[]> {
    return [...this.orders.values()]
      .filter(
        (order) =>
          ![JobStatus.FINISHED, JobStatus.ERROR, JobStatus.CANCELLED].includes(
            order.status,
          ),
      )
      .map((order) => structuredClone(order));
  }
}

class LoadWorkerGateway {
  readonly tasks = new Map<string, LoadTask>();
  onlineWorkers = 0;
  claimAttempts = 0;
  duplicateClaims = 0;
  failovers = 0;
  staleCompletionsRejected = 0;
  workerDisconnects = 0;
  workerReconnects = 0;
  timeoutRecoveries = 0;

  async createInternalJobWithProbeTask(params: {
    internalJobId: string;
  }): Promise<string> {
    this.tasks.set(params.internalJobId, {
      jobId: params.internalJobId,
      status: 'queued',
      workerId: null,
      generation: 1,
    });
    return params.internalJobId;
  }

  async countOnlineWorkers(): Promise<number> {
    return this.onlineWorkers;
  }

  async getTasksForJobs(ids: string[]): Promise<Map<string, LoadTask[]>> {
    const result = new Map<string, LoadTask[]>();
    for (const id of ids) {
      const task = this.tasks.get(id);
      if (task) result.set(id, [structuredClone(task)]);
    }
    return result;
  }

  async getTasks(id: string): Promise<LoadTask[]> {
    const task = this.tasks.get(id);
    return task ? [structuredClone(task)] : [];
  }

  async getTotalFrames(): Promise<number | null> {
    // The synthetic workload is one bounded task per customer; it does not
    // exercise Blender probe expansion or create fake frame metadata.
    return null;
  }

  async claim(workerId: string): Promise<LoadTask | null> {
    this.claimAttempts += 1;
    const task = [...this.tasks.values()].find(
      (item) => item.status === 'queued',
    );
    if (!task) return null;
    task.status = 'active';
    task.workerId = workerId;
    return structuredClone(task);
  }

  async failAndReassign(jobId: string): Promise<void> {
    const task = this.tasks.get(jobId);
    if (!task || task.status !== 'active')
      throw new Error('active task required');
    const staleGeneration = task.generation;
    task.status = 'queued';
    task.workerId = null;
    task.generation += 1;
    this.failovers += 1;
    this.workerDisconnects += 1;
    this.timeoutRecoveries += 1;
    const replacement = await this.claim('replacement-worker');
    if (!replacement) throw new Error('replacement worker did not claim task');
    this.workerReconnects += 1;
    if (!this.complete(jobId, staleGeneration, 'failed-worker')) {
      this.staleCompletionsRejected += 1;
    }
  }

  complete(jobId: string, generation: number, workerId: string): boolean {
    const task = this.tasks.get(jobId);
    if (
      !task ||
      task.status !== 'active' ||
      task.generation !== generation ||
      task.workerId !== workerId
    ) {
      return false;
    }
    task.status = 'done';
    return true;
  }

  async completeAll(): Promise<void> {
    for (const task of this.tasks.values()) {
      if (task.status === 'active')
        this.complete(task.jobId, task.generation, task.workerId!);
    }
  }
}

function percentile(values: number[], p: number): number {
  const ordered = [...values].sort((a, b) => a - b);
  return (
    ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * p))] ?? 0
  );
}

describe('CWS real Nest load simulation (safe, no external writes)', () => {
  let app: INestApplication;
  let orders: LoadOrdersRepository;
  let workers: LoadWorkerGateway;
  let scheduler: SchedulerService;
  let baseUrl: string;

  beforeAll(async () => {
    orders = new LoadOrdersRepository();
    workers = new LoadWorkerGateway();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => ({
          auth: {
            getUser: async (token: string) => ({
              data: {
                user: token?.startsWith('load-') ? { id: token } : null,
              },
              error: null,
            }),
          },
        }),
      })
      .overrideProvider(RENDER_ORDERS_REPOSITORY)
      .useValue(orders)
      .overrideProvider(WorkerFleetGateway)
      .useValue(workers)
      .overrideProvider(StorageService)
      .useValue({
        notify: async () => ({}),
        logWorkerEvent: async () => ({}),
      })
      .overrideProvider(PreviewService)
      .useValue({ generateReviewPreview: async () => undefined })
      .overrideProvider(InputUploadsService)
      .useValue({
        assertOwned: async (fileRef: string, customerId: string) => {
          const duplicate = /duplicate-(\d+)\.blend$/.exec(fileRef);
          if (duplicate && customerId === `load-duplicate-${duplicate[1]}`)
            return;
          const input = /input-(\d+)-(\d+)\.blend$/.exec(fileRef);
          if (input && customerId === `load-user-${input[1]}-${input[2]}`)
            return;
          throw new Error('synthetic upload ownership mismatch');
        },
      })
      .compile();
    app = module.createNestApplication();
    // The harness represents independent customers behind distinct test
    // proxy addresses. Production proxy trust remains unchanged.
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    scheduler = app.get(SchedulerService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('measures 10/25/50/100 concurrent customer submissions through real Nest flow', async () => {
    const reports: Record<string, unknown>[] = [];

    for (const customers of [10, 25, 50, 100]) {
      orders.orders.clear();
      workers.tasks.clear();
      workers.claimAttempts = 0;
      workers.duplicateClaims = 0;
      workers.failovers = 0;
      workers.staleCompletionsRejected = 0;
      workers.workerDisconnects = 0;
      workers.workerReconnects = 0;
      workers.timeoutRecoveries = 0;
      workers.onlineWorkers = Math.max(3, Math.floor(customers / 4));
      const rampLatencies: number[] = [];
      let rampErrors = 0;
      for (let offset = 0; offset < customers; offset += 10) {
        const rampBatch = await Promise.all(
          Array.from(
            { length: Math.min(10, customers - offset) },
            async (_, batchIndex) => {
              const customerIndex = offset + batchIndex;
              const started = performance.now();
              const response = await fetch(`${baseUrl}/jobs/estimate`, {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  'x-forwarded-for': `198.51.100.${customerIndex + 1}`,
                },
                body: JSON.stringify({
                  profileId: 'standard',
                  fileSizeBytes: 1024,
                }),
              });
              rampLatencies.push(performance.now() - started);
              return response.status;
            },
          ),
        );
        rampErrors += rampBatch.filter((status) => status !== 200).length;
      }
      const duplicatePayload = {
        fileRef: `load-test/duplicate-${customers}.blend`,
        fileName: `duplicate-${customers}.blend`,
        profileId: 'standard',
        fileSizeBytes: 1024,
      };
      const duplicateResponses = await Promise.all(
        [0, 1].map(() =>
          fetch(`${baseUrl}/jobs`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer load-duplicate-${customers}`,
              'Idempotency-Key': `load-duplicate-key-${customers.toString().padStart(3, '0')}`,
              'x-forwarded-for': '198.51.100.250',
            },
            body: JSON.stringify(duplicatePayload),
          }).then(async (response) => ({
            status: response.status,
            body: (await response.json()) as { jobId?: string },
          })),
        ),
      );
      const duplicateReturnedSameJob =
        duplicateResponses.every((response) => response.status === 201) &&
        new Set(duplicateResponses.map((response) => response.body.jobId))
          .size === 1;
      orders.orders.clear();
      workers.tasks.clear();
      const submissionLatencies: number[] = [];
      const startMemory = process.memoryUsage().rss;
      const submitted: Array<{
        status: number;
        body: { jobId?: string };
        customerToken?: string;
        error?: string;
      }> = await Promise.all(
        Array.from({ length: customers }, async (_, index) => {
          try {
            const customerToken = `load-user-${customers}-${index}`;
            const started = performance.now();
            const response = await fetch(`${baseUrl}/jobs`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${customerToken}`,
                'Idempotency-Key': `load-${customers}-${index.toString().padStart(3, '0')}-key-x`,
                'x-forwarded-for': `198.51.100.${index + 1}`,
              },
              body: JSON.stringify({
                fileRef: `load-test/input-${customers}-${index}.blend`,
                fileName: `load-test-${customers}-${index}.blend`,
                profileId: 'standard',
                fileSizeBytes: 1024,
                notes: `synthetic-customer-${index}`,
              }),
            });
            const body = (await response.json()) as { jobId?: string };
            submissionLatencies.push(performance.now() - started);
            return { status: response.status, body, customerToken };
          } catch (error) {
            return { status: 0, body: {}, error: String(error) };
          }
        }),
      );
      const transportErrors = submitted.filter((response) => response.error);
      if (transportErrors.length > 0) {
        console.log(
          `CWS_LOAD_TRANSPORT_ERRORS customers=${customers} count=${transportErrors.length} first=${transportErrors[0].error}`,
        );
      }
      const jobIds = submitted
        .filter((response) => response.status === 201 && response.body.jobId)
        .map((response) => response.body.jobId as string);
      expect(transportErrors).toHaveLength(0);
      expect(submitted.every((response) => response.status === 201)).toBe(true);
      expect(new Set(jobIds).size).toBe(customers);

      const refreshResponses = await Promise.all(
        submitted
          .filter((response) => response.status === 201 && response.body.jobId)
          .map((response) =>
            fetch(`${baseUrl}/jobs/${response.body.jobId}/status`, {
              headers: { authorization: `Bearer ${response.customerToken}` },
            }),
          ),
      );
      expect(
        refreshResponses.every((response) => response.status === 200),
      ).toBe(true);

      const schedulerStarted = performance.now();
      await scheduler.tick();
      const schedulerLatency = performance.now() - schedulerStarted;

      const claimStarted = performance.now();
      const claimResults = await Promise.all(
        Array.from(
          { length: Math.max(customers, workers.onlineWorkers * 3) },
          (_, index) =>
            workers.claim(`load-worker-${index % workers.onlineWorkers}`),
        ),
      );
      const assignmentLatency = performance.now() - claimStarted;
      expect(claimResults.filter(Boolean).length).toBe(customers);
      expect(
        new Set(claimResults.filter(Boolean).map((task) => task!.jobId)).size,
      ).toBe(customers);

      await scheduler.tick();
      if (customers >= 25) await workers.failAndReassign(jobIds[0]);
      await workers.completeAll();
      await scheduler.tick();

      const finalOrders = await orders.findAll();
      const completed = finalOrders.filter(
        (order) => order.status === JobStatus.REVIEW_READY,
      ).length;
      const endMemory = process.memoryUsage().rss;
      const report = {
        customers,
        workerCapacity: workers.onlineWorkers,
        submitted: submitted.length,
        submissionErrors: submitted.filter((response) => response.status >= 400)
          .length,
        refreshed: refreshResponses.length,
        completedReviewReady: completed,
        duplicateClaims: workers.duplicateClaims,
        claimAttempts: workers.claimAttempts,
        failovers: workers.failovers,
        staleCompletionsRejected: workers.staleCompletionsRejected,
        workerDisconnects: workers.workerDisconnects,
        workerReconnects: workers.workerReconnects,
        timeoutRecoveries: workers.timeoutRecoveries,
        rampUpRequests: rampLatencies.length,
        rampUpErrors: rampErrors,
        rampUpP95Ms: Number(percentile(rampLatencies, 0.95).toFixed(2)),
        duplicateSubmissionReturnedSameJob: duplicateReturnedSameJob,
        p50SubmissionMs: Number(
          percentile(submissionLatencies, 0.5).toFixed(2),
        ),
        p95SubmissionMs: Number(
          percentile(submissionLatencies, 0.95).toFixed(2),
        ),
        p99SubmissionMs: Number(
          percentile(submissionLatencies, 0.99).toFixed(2),
        ),
        assignmentMs: Number(assignmentLatency.toFixed(2)),
        schedulerMs: Number(schedulerLatency.toFixed(2)),
        rssDeltaMb: Number(
          ((endMemory - startMemory) / 1024 / 1024).toFixed(2),
        ),
        result:
          completed === customers &&
          workers.staleCompletionsRejected === (customers >= 25 ? 1 : 0)
            ? 'PASS'
            : 'FAIL',
      };
      reports.push(report);
      console.log(`CWS_LOAD_SCENARIO ${JSON.stringify(report)}`);
      expect(report.result).toBe('PASS');
    }

    expect(reports).toHaveLength(4);
  }, 120000);
});
