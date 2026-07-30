import { WorkerLog } from '../domain/storage-object';

export const WORKER_LOGS_REPOSITORY = Symbol('WORKER_LOGS_REPOSITORY');

export interface IWorkerLogsRepository {
  log(jobId: string, workerName: string | null, message: string | null, level: string): Promise<WorkerLog>;
  findByJobId(jobId: string): Promise<WorkerLog[]>;
}
