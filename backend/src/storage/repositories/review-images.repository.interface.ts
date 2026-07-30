import { ReviewImage } from '../domain/storage-object';

export const REVIEW_IMAGES_REPOSITORY = Symbol('REVIEW_IMAGES_REPOSITORY');

export interface IReviewImagesRepository {
  findByJobId(jobId: string): Promise<ReviewImage[]>;
  /** Thay toàn bộ preview cũ của job bằng danh sách mới (Worker render lại thì preview cũ không còn đúng). */
  replaceForJob(jobId: string, imagePaths: string[]): Promise<ReviewImage[]>;
}
