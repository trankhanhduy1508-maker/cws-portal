import { Inject, Injectable } from '@nestjs/common';
import {
  STORAGE_OBJECTS_REPOSITORY,
  IStorageObjectsRepository,
} from './repositories/storage-objects.repository.interface';
import {
  REVIEW_IMAGES_REPOSITORY,
  IReviewImagesRepository,
} from './repositories/review-images.repository.interface';
import { DOWNLOADS_REPOSITORY, IDownloadsRepository } from './repositories/downloads.repository.interface';
import { WORKER_LOGS_REPOSITORY, IWorkerLogsRepository } from './repositories/worker-logs.repository.interface';
import { NOTIFICATIONS_REPOSITORY, INotificationsRepository } from './repositories/notifications.repository.interface';
import { StorageObject, ReviewImage, DownloadLog, WorkerLog, Notification } from './domain/storage-object';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_OBJECTS_REPOSITORY)
    private readonly storageObjectsRepository: IStorageObjectsRepository,
    @Inject(REVIEW_IMAGES_REPOSITORY)
    private readonly reviewImagesRepository: IReviewImagesRepository,
    @Inject(DOWNLOADS_REPOSITORY)
    private readonly downloadsRepository: IDownloadsRepository,
    @Inject(WORKER_LOGS_REPOSITORY)
    private readonly workerLogsRepository: IWorkerLogsRepository,
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly notificationsRepository: INotificationsRepository,
  ) {}

  async recordPaths(
    jobId: string,
    paths: Partial<Pick<StorageObject, 'sourcePath' | 'reviewPath' | 'finalPath' | 'logPath'>>,
  ): Promise<StorageObject> {
    return this.storageObjectsRepository.upsertByJobId(jobId, paths);
  }

  async getPaths(jobId: string): Promise<StorageObject | null> {
    return this.storageObjectsRepository.findByJobId(jobId);
  }

  /** Gọi khi Worker render xong — publish đúng 3-5 ảnh preview có watermark (CWS_ROADMAP_MVP_V1.md, Giai đoạn 4). */
  async publishReviewImages(jobId: string, imagePaths: string[]): Promise<ReviewImage[]> {
    if (imagePaths.length < 3 || imagePaths.length > 5) {
      throw new Error(
        `Số ảnh preview phải từ 3-5 theo MVP (nhận được ${imagePaths.length}) — kiểm tra lại bước chọn frame đại diện`,
      );
    }
    return this.reviewImagesRepository.replaceForJob(jobId, imagePaths);
  }

  async getReviewImages(jobId: string): Promise<ReviewImage[]> {
    return this.reviewImagesRepository.findByJobId(jobId);
  }

  /** Ghi log mỗi lần khách tải file cuối (CWS_DATABASE_SCHEMA.md, bảng downloads). */
  async logDownload(jobId: string, ipAddress: string | null): Promise<DownloadLog> {
    return this.downloadsRepository.log(jobId, ipAddress);
  }

  /** Ghi log Worker (CWS_DATABASE_SCHEMA.md, bảng worker_logs) — dùng khi báo lỗi render. */
  async logWorkerEvent(
    jobId: string,
    workerName: string | null,
    message: string | null,
    level: string,
  ): Promise<WorkerLog> {
    return this.workerLogsRepository.log(jobId, workerName, message, level);
  }

  async getWorkerLogs(jobId: string): Promise<WorkerLog[]> {
    return this.workerLogsRepository.findByJobId(jobId);
  }

  /** Thông báo hệ thống (CWS_DATABASE_SCHEMA.md, bảng notifications). */
  async notify(jobId: string | null, title: string, content: string): Promise<Notification> {
    return this.notificationsRepository.create(jobId, title, content);
  }

  async getNotifications(jobId: string): Promise<Notification[]> {
    return this.notificationsRepository.findByJobId(jobId);
  }
}
