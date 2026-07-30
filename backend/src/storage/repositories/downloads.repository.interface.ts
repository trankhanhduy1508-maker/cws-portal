import { DownloadLog } from '../domain/storage-object';

export const DOWNLOADS_REPOSITORY = Symbol('DOWNLOADS_REPOSITORY');

export interface IDownloadsRepository {
  log(jobId: string, ipAddress: string | null): Promise<DownloadLog>;
}
