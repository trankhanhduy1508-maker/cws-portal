import { Injectable, Logger } from '@nestjs/common';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { B2StorageService } from '../files/b2-storage.service';

/**
 * GIỚI HẠN THẬT (ghi rõ, không giả vờ): hiện tại chỉ đóng gói các frame
 * PNG thành 1 file .zip — KHÔNG tự động dựng thành video MP4 (việc đó
 * Dy vẫn đang làm tay bằng ffmpeg theo quy trình hiện có). Tự động hoá
 * encode MP4 là việc lớn hơn (cần ffmpeg cài trong môi trường chạy
 * Backend, xử lý thứ tự frame, framerate...) — để lại như 1 cải tiến
 * sau, không âm thầm giả vờ đã làm được.
 */
@Injectable()
export class PackagingService {
  private readonly logger = new Logger(PackagingService.name);

  constructor(private readonly b2StorageService: B2StorageService) {}

  async packageRenderResult(
    internalJobId: string,
    renderOrderId: string,
  ): Promise<{ downloadUrl: string; resultSizeBytes: number }> {
    const frameKeys = await this.b2StorageService.listObjectsByPrefix(
      `renders/${internalJobId}/`,
    );

    if (frameKeys.length === 0) {
      throw new Error(
        `Không tìm thấy frame nào trên B2 cho job ${internalJobId} — chưa thể đóng gói kết quả`,
      );
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

    for (const key of frameKeys) {
      const buffer = await this.b2StorageService.getObjectBuffer(key);
      const fileName = key.split('/').pop() ?? key;
      archive.append(buffer, { name: fileName });
    }

    await archive.finalize();
    await donePromise;

    const zipBuffer = Buffer.concat(chunks);
    const zipKey = `results/${renderOrderId}.zip`;
    const downloadUrl = await this.b2StorageService.uploadBuffer(
      zipKey,
      zipBuffer,
      'application/zip',
    );

    this.logger.log(
      `Đã đóng gói ${frameKeys.length} frame thành ${zipKey} (${zipBuffer.length} bytes)`,
    );

    return { downloadUrl, resultSizeBytes: zipBuffer.length };
  }
}
