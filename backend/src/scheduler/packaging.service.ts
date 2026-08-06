import { Injectable, Logger } from '@nestjs/common';
import type { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { B2StorageService } from '../files/b2-storage.service';
import { VideoAssemblyService } from './video-assembly.service';

/** Số lượng frame tải song song từ B2 — giới hạn để tránh giữ hàng
 * trăm/nghìn buffer trong RAM cùng lúc (job nhiều frame độ phân giải
 * cao) và tránh dội quá nhiều request đồng thời lên B2. Đây vẫn là
 * đánh đổi CHẤP NHẬN ĐƯỢC ở quy mô MVP, không phải giải pháp streaming
 * hoàn chỉnh cho render hàng chục nghìn frame (cải tiến sau nếu cần). */
const FRAME_FETCH_CONCURRENCY = 8;

type ArchiverModule = {
  ZipArchive?: new (options: { zlib: { level: number } }) => ZipArchive;
};

// archiver is ESM-only in the current lockfile while Nest compiles the backend
// to CommonJS. A real dynamic import keeps production startup compatible with
// both module systems; a static import would make `dist/main.js` fail before
// the app can serve health checks.
const importEsm = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<ArchiverModule>;

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

    const frames = await this.fetchFramesLimited(frameKeys);

    // Render tĩnh (1 frame, vd ảnh still không phải animation): ghép
    // "video" 1 frame là vô nghĩa (chỉ vài chục mili-giây, tệ hơn hẳn
    // so với giao thẳng file ảnh) — bỏ qua bước dựng video, rơi thẳng
    // về .zip như render nhiều frame không dựng được video.
    const videoBuffer = frames.length > 1 ? await this.tryBuildVideo(internalJobId, frames, fps) : null;
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

  /** Tải frame theo lô (FRAME_FETCH_CONCURRENCY cùng lúc) thay vì bắn
   * hết tất cả request 1 lượt — xem ghi chú ở hằng số phía trên. */
  private async fetchFramesLimited(frameKeys: string[]): Promise<{ key: string; buffer: Buffer }[]> {
    const results: { key: string; buffer: Buffer }[] = new Array(frameKeys.length);
    let nextIndex = 0;

    async function worker(b2: B2StorageService): Promise<void> {
      while (nextIndex < frameKeys.length) {
        const index = nextIndex++;
        results[index] = { key: frameKeys[index], buffer: await b2.getObjectBuffer(frameKeys[index]) };
      }
    }

    const workerCount = Math.min(FRAME_FETCH_CONCURRENCY, frameKeys.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker(this.b2StorageService)));

    return results;
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
    const archiverModule = await importEsm('archiver');
    const ZipArchive = archiverModule.ZipArchive;
    if (!ZipArchive) {
      throw new Error('Không thể tải ZipArchive từ archiver ESM module');
    }
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
