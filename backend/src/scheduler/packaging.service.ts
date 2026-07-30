import { Injectable, Logger } from '@nestjs/common';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { B2StorageService } from '../files/b2-storage.service';
import { VideoAssemblyService } from './video-assembly.service';

/**
 * Đóng gói kết quả render thành file cuối khách tải về. Ưu tiên ghép
 * thành video MP4 (VideoAssemblyService, cần ffmpeg cài sẵn trên môi
 * trường chạy Backend) — nếu ffmpeg không có/thất bại, rơi về đóng gói
 * .zip chứa frame PNG như hành vi cũ (KHÔNG làm hỏng cả job chỉ vì
 * thiếu ffmpeg, không giả vờ đã dựng được video khi không dựng được).
 */
@Injectable()
export class PackagingService {
  private readonly logger = new Logger(PackagingService.name);

  constructor(
    private readonly b2StorageService: B2StorageService,
    private readonly videoAssemblyService: VideoAssemblyService,
  ) {}

  async packageRenderResult(
    internalJobId: string,
    renderOrderId: string,
    fps: number,
  ): Promise<{ downloadUrl: string; resultSizeBytes: number }> {
    const frameKeys = await this.b2StorageService.listObjectsByPrefix(
      `renders/${internalJobId}/`,
    );

    if (frameKeys.length === 0) {
      throw new Error(
        `Không tìm thấy frame nào trên B2 cho job ${internalJobId} — chưa thể đóng gói kết quả`,
      );
    }

    const frames = await Promise.all(
      frameKeys.map(async (key) => ({ key, buffer: await this.b2StorageService.getObjectBuffer(key) })),
    );

    const videoBuffer = await this.tryBuildVideo(internalJobId, frames, fps);
    if (videoBuffer) {
      const videoKey = `results/${renderOrderId}.mp4`;
      const downloadUrl = await this.b2StorageService.uploadBuffer(videoKey, videoBuffer, 'video/mp4');
      this.logger.log(
        `Đã ghép ${frames.length} frame thành ${videoKey} (${videoBuffer.length} bytes)`,
      );
      return { downloadUrl, resultSizeBytes: videoBuffer.length };
    }

    return this.packageAsZip(frames, renderOrderId);
  }

  /** Không throw ra ngoài — lỗi ffmpeg (build thiếu codec, timeout...)
   * chỉ log rồi rơi về .zip, không chặn cả việc đóng gói kết quả. */
  private async tryBuildVideo(
    internalJobId: string,
    frames: { key: string; buffer: Buffer }[],
    fps: number,
  ): Promise<Buffer | null> {
    try {
      return await this.videoAssemblyService.buildVideo(frames, fps);
    } catch (err) {
      this.logger.error(
        `Dựng video thất bại cho job ${internalJobId}, rơi về .zip: ${String(err)}`,
      );
      return null;
    }
  }

  private async packageAsZip(
    frames: { key: string; buffer: Buffer }[],
    renderOrderId: string,
  ): Promise<{ downloadUrl: string; resultSizeBytes: number }> {
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();
    passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));

    const donePromise = new Promise<void>((resolve, reject) => {
      passthrough.on('end', () => resolve());
      archive.on('error', (err: Error) => reject(err));
    });

    archive.pipe(passthrough);

    for (const { key, buffer } of frames) {
      const fileName = key.split('/').pop() ?? key;
      archive.append(buffer, { name: fileName });
    }

    await archive.finalize();
    await donePromise;

    const zipBuffer = Buffer.concat(chunks);
    const zipKey = `results/${renderOrderId}.zip`;
    const downloadUrl = await this.b2StorageService.uploadBuffer(zipKey, zipBuffer, 'application/zip');

    this.logger.log(
      `Đã đóng gói ${frames.length} frame thành ${zipKey} (${zipBuffer.length} bytes)`,
    );

    return { downloadUrl, resultSizeBytes: zipBuffer.length };
  }
}
