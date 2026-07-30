import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { AppConfig } from '../config/configuration';

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

  /** Ghép URL công khai từ object key — dùng khi cần trả URL cho 1 key
   * đã biết trước (vd đọc lại review_images.image_path từ DB). */
  getPublicUrl(key: string): string {
    return `https://${this.endpoint}/${this.bucketName}/${key}`;
  }

  /** Upload file lên B2, trả về object key (dùng làm fileRef). */
  async uploadFile(file: Express.Multer.File): Promise<{ key: string; url: string }> {
    const key = `uploads/${randomUUID()}-${file.originalname}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Upload B2 thất bại cho key ${key}: ${message}`);
      throw new Error(`Upload file lên B2 thất bại: ${message}`);
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
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `https://${this.endpoint}/${this.bucketName}/${key}`;
  }
}
