import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { promises as fsPromises } from 'fs';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { basename } from 'path';
import { AppConfig } from '../config/configuration';

export function sanitizeUploadObjectName(originalName: string): string {
  const baseName = basename(originalName.replace(/\\/g, '/'));
  const safeName = baseName.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 180);
  return safeName || 'upload.blend';
}

@Injectable()
export class B2StorageService {
  private readonly logger = new Logger(B2StorageService.name);
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const b2 = this.configService.get('b2', { infer: true });
    this.bucketName = b2.bucketName;
    this.endpoint = b2.endpoint;
    this.s3 = new S3Client({
      endpoint: `https://${b2.endpoint}`,
      region: 'auto',
      credentials: {
        accessKeyId: b2.keyId,
        secretAccessKey: b2.applicationKey,
      },
    });
  }

  /** Ghép URL "công khai" (không ký, không hết hạn) từ object key — CHỈ
   * dùng làm giá trị lưu nội bộ (DB), KHÔNG trả trực tiếp cho khách xem/
   * tải nữa (xem getSignedUrl bên dưới). Nếu bucket B2 thật đang để
   * public-read, URL dạng này ai đoán được key cũng tải được, bỏ qua
   * hoàn toàn kiểm tra chủ sở hữu ở tầng Backend — đây chính là lỗ hổng
   * đã phát hiện qua self-review (xem docs/MVP_GAP_REPORT.md). */
  getPublicUrl(key: string): string {
    return `https://${this.endpoint}/${this.bucketName}/${key}`;
  }

  /** Trích object key từ URL đã lưu bằng getPublicUrl()/uploadBuffer() ở
   * trên — dùng để ký lại thành presigned URL ngay trước khi trả cho
   * khách, KHÔNG cần đổi schema DB (vẫn lưu chuỗi URL tĩnh như cũ, chỉ
   * không dùng thẳng nó nữa). */
  extractKeyFromPublicUrl(url: string): string {
    const prefix = `https://${this.endpoint}/${this.bucketName}/`;
    if (!url.startsWith(prefix)) {
      throw new Error(
        `URL không thuộc bucket B2 hiện tại, không trích được key: ${url}`,
      );
    }
    return url.slice(prefix.length);
  }

  /**
   * URL có CHỮ KÝ + THỜI HẠN cho 1 object — đây mới là URL thật sự nên
   * đưa cho khách (ảnh preview/file tải cuối), thay cho getPublicUrl()
   * tĩnh ở trên. An toàn dù bucket B2 đang public-read hay private:
   * presigned URL vẫn hoạt động đúng với bucket public (không hại gì
   * thêm), và bắt buộc phải có nếu bucket được chuyển sang private.
   */
  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  /** Upload file lên B2, trả về object key (dùng làm fileRef). */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string }> {
    const key = `uploads/${randomUUID()}-${sanitizeUploadObjectName(file.originalname)}`;
    const uploadStream = file.path ? createReadStream(file.path) : null;
    // Keep a listener attached even when the S3 client fails before it starts
    // consuming the stream; otherwise a late open/read error becomes an
    // unhandled process error during cleanup.
    uploadStream?.on('error', () => undefined);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: uploadStream ?? file.buffer,
          ContentLength: file.size,
          ContentType: file.mimetype || 'application/octet-stream',
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Upload B2 thất bại cho key ${key}: ${message}`);
      throw new Error(`Upload file lên B2 thất bại: ${message}`);
    } finally {
      if (file.path) {
        try {
          await fsPromises.unlink(file.path);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            this.logger.warn(
              `Không cleanup được file tạm upload: ${(error as Error).message}`,
            );
          }
        }
      }
    }

    const url = `https://${this.endpoint}/${this.bucketName}/${key}`;
    return { key, url };
  }

  /** Liệt kê toàn bộ object theo prefix — dùng để tìm các frame PNG
   * mà Worker đã upload cho 1 job (đường dẫn dạng renders/JOB_ID/
   * task_ID/frame_N.png). */
  async listObjectsByPrefix(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const res = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }

  /** Tải nội dung 1 object về dạng Buffer — dùng khi đóng gói kết quả
   * (tải từng frame PNG để nén vào file zip). */
  async getObjectBuffer(key: string): Promise<Buffer> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    const stream = res.Body;
    if (!stream || !('transformToByteArray' in stream)) {
      throw new Error(`Không đọc được nội dung object ${key} từ B2`);
    }
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }

  /** Upload buffer (vd file zip đã nén) lên B2, trả về URL trực tiếp. */
  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    const remote = await this.s3.send(
      new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (remote.ContentLength !== buffer.length) {
      throw new Error(
        `B2 remote verification failed for ${key}: expected ${buffer.length} bytes, received ${remote.ContentLength ?? 'unknown'}`,
      );
    }
    return `https://${this.endpoint}/${this.bucketName}/${key}`;
  }
}
