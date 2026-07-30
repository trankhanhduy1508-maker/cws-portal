import { Notification } from '../domain/storage-object';

export const NOTIFICATIONS_REPOSITORY = Symbol('NOTIFICATIONS_REPOSITORY');

export interface INotificationsRepository {
  create(jobId: string | null, title: string, content: string): Promise<Notification>;
  findByJobId(jobId: string): Promise<Notification[]>;
}
