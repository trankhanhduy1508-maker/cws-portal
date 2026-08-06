import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

const FILE_LINK_PATTERN = /\/file\/d\/([\w-]+)/;
const OPEN_ID_PATTERN = /[?&]id=([\w-]+)/;
const FOLDER_LINK_PATTERN = /\/folders\//;
const GOOGLE_DRIVE_HOST_PATTERN = /^https:\/\/drive\.google\.com\//;

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  /**
   * Trích file ID từ link. Chủ động phát hiện SỚM trường hợp link
   * folder (không phải file) — đây chính là nguyên nhân gây sự cố thật
   * đã xảy ra với job CWS-JOB5 (worker crash sau khi đã tạo job xong,
   * lãng phí hàng giờ debug). Phát hiện ngay ở bước resolve() này giúp
   * khách biết ngay để sửa link, thay vì job tạo xong rồi mới lỗi.
   */
  private extractFileId(driveLink: string): string {
    if (FOLDER_LINK_PATTERN.test(driveLink)) {
      throw new BadRequestException(
        'Link này là link THƯ MỤC (folder), không phải link file. ' +
          'Vui lòng mở thư mục, bấm chuột phải vào đúng file .blend, chọn "Chia sẻ" > "Sao chép liên kết".',
      );
    }
    const fileMatch = FILE_LINK_PATTERN.exec(driveLink);
    if (fileMatch) return fileMatch[1];
    const idMatch = OPEN_ID_PATTERN.exec(driveLink);
    if (idMatch) return idMatch[1];
    throw new BadRequestException(
      'Không nhận diện được file ID từ link Google Drive này.',
    );
  }

  /**
   * @returns { fileName, fileSizeBytes } — null nếu chưa cấu hình
   * GOOGLE_DRIVE_API_KEY (honest fallback, giống hành vi mock trước
   * đây: không bịa dữ liệu giả khi chưa thể lấy thật), hoặc nếu link
   * là OneDrive/Dropbox (CWS_ROADMAP_MVP_V1.md chấp nhận cả 2 nguồn
   * này, nhưng CHƯA có tích hợp API thật để lấy tên/dung lượng file —
   * trả null thay vì bịa, giống đúng nguyên tắc đã áp dụng cho Drive).
   */
  async resolve(
    driveLink: string,
  ): Promise<{ fileName: string | null; fileSizeBytes: number | null }> {
    if (!GOOGLE_DRIVE_HOST_PATTERN.test(driveLink)) {
      this.logger.warn(
        'Link không phải Google Drive (OneDrive/Dropbox) — chưa có API thật để resolve.',
      );
      return { fileName: null, fileSizeBytes: null };
    }

    const fileId = this.extractFileId(driveLink);

    const apiKey = this.configService.get('googleDriveApiKey', { infer: true });
    if (!apiKey) {
      this.logger.warn(
        'GOOGLE_DRIVE_API_KEY chưa cấu hình — trả về fileName/fileSizeBytes = null (không bịa dữ liệu giả).',
      );
      return { fileName: null, fileSizeBytes: null };
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?key=${encodeURIComponent(apiKey)}&fields=name,size`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'error', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      if (res.status === 404) {
        throw new BadRequestException(
          'Không tìm thấy file — kiểm tra lại quyền chia sẻ (chọn "Bất kỳ ai có link") hoặc link đã đúng chưa.',
        );
      }
      this.logger.error(
        `Google Drive API trả lỗi ${res.status} cho fileId=${fileId}`,
      );
      return { fileName: null, fileSizeBytes: null };
    }

    const data = (await res.json()) as { name?: string; size?: string };
    return {
      fileName: data.name ?? null,
      fileSizeBytes: data.size ? parseInt(data.size, 10) : null,
    };
  }
}
