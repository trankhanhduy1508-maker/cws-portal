import { StorageObject } from '../domain/storage-object';

export const STORAGE_OBJECTS_REPOSITORY = Symbol('STORAGE_OBJECTS_REPOSITORY');

export interface IStorageObjectsRepository {
  findByJobId(jobId: string): Promise<StorageObject | null>;
  upsertByJobId(
    jobId: string,
    paths: Partial<Pick<StorageObject, 'sourcePath' | 'reviewPath' | 'finalPath' | 'logPath'>>,
  ): Promise<StorageObject>;
}
