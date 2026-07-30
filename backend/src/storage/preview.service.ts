import { Injectable, Logger } from '@nestjs/common';
import { B2StorageService } from '../files/b2-storage.service';
import { StorageService } from './storage.service';
import { applyDiagonalWatermark } from './watermark.util';

const MIN_PREVIEW_IMAGES = 3;
const MAX_PREVIEW_IMAGES = 5;

@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);

  constructor(
    private readonly b2StorageService: B2StorageService,
    private readonly storageService: StorageService,
  ) {}

  /** Chọn 3-5 frame đại diện, thêm watermark, upload lên review/, ghi vào review_images. */
  async generateReviewPreview(internalJobId: string, renderOrderId: string): Promise<void> {
    const frameKeys = await this.b2StorageService.listObjectsByPrefix(`renders/${internalJobId}/`);
    if (frameKeys.length === 0) {
      throw new Error(`Không tìm thấy frame nào trên B2 cho job ${internalJobId} — chưa thể tạo preview`);
    }

    const sortedKeys = [...frameKeys].sort();
    const selectedKeys = pickEvenlySpaced(sortedKeys, MAX_PREVIEW_IMAGES, MIN_PREVIEW_IMAGES);

    const reviewPaths: string[] = [];
    for (let i = 0; i < selectedKeys.length; i++) {
      const frameBuffer = await this.b2StorageService.getObjectBuffer(selectedKeys[i]);
      const watermarked = await applyDiagonalWatermark(frameBuffer);
      const reviewKey = `review/${renderOrderId}/preview_${i + 1}.png`;
      await this.b2StorageService.uploadBuffer(reviewKey, watermarked, 'image/png');
      reviewPaths.push(reviewKey);
    }

    await this.storageService.publishReviewImages(renderOrderId, reviewPaths);
    await this.storageService.recordPaths(renderOrderId, { reviewPath: `review/${renderOrderId}/` });

    this.logger.log(`Order ${renderOrderId}: đã tạo ${reviewPaths.length} ảnh preview có watermark`);
  }
}

/** Chọn tối đa `max` phần tử cách đều nhau trong mảng đã sort — nếu mảng
 * nhỏ hơn `min`, lặp lại phần tử cuối cho đủ số lượng tối thiểu MVP yêu cầu. */
function pickEvenlySpaced<T>(items: T[], max: number, min: number): T[] {
  const count = Math.min(max, Math.max(min, Math.min(items.length, max)));
  if (items.length <= count) {
    const result = [...items];
    while (result.length < min && result.length > 0) {
      result.push(result[result.length - 1]);
    }
    return result;
  }

  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.round((i * (items.length - 1)) / (count - 1));
    picked.push(items[index]);
  }
  return picked;
}
