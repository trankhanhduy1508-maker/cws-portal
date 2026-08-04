import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

  /** GhÃ©p URL "cÃ´ng khai" (khÃ´ng kÃ½, khÃ´ng háº¿t háº¡n) tá»« object key â€” CHá»ˆ
   * dÃ¹ng lÃ m giÃ¡ trá»‹ lÆ°u ná»™i bá»™ (DB), KHÃ”NG tráº£ trá»±c tiáº¿p cho khÃ¡ch xem/
   * táº£i ná»¯a (xem getSignedUrl bÃªn dÆ°á»›i). Náº¿u bucket B2 tháº­t Ä‘ang Ä‘á»ƒ
   * public-read, URL dáº¡ng nÃ y ai Ä‘oÃ¡n Ä‘Æ°á»£c key cÅ©ng táº£i Ä‘Æ°á»£c, bá» qua
   * hoÃ n toÃ n kiá»ƒm tra chá»§ sá»Ÿ há»¯u á»Ÿ táº§ng Backend â€” Ä‘Ã¢y chÃ­nh lÃ  lá»— há»•ng
   * Ä‘Ã£ phÃ¡t hiá»‡n qua self-review (xem docs/MVP_GAP_REPORT.md). */
  getPublicUrl(key: string): string {
    return `https://${this.endpoint}/${this.bucketName}/${key}`;
  }

  /** TrÃ­ch object key tá»« URL Ä‘Ã£ lÆ°u báº±ng getPublicUrl()/uploadBuffer() á»Ÿ
   * trÃªn â€” dÃ¹ng Ä‘á»ƒ kÃ½ láº¡i thÃ nh presigned URL ngay trÆ°á»›c khi tráº£ cho
   * khÃ¡ch, KHÃ”NG cáº§n Ä‘á»•i schema DB (váº«n lÆ°u chuá»—i URL tÄ©nh nhÆ° cÅ©, chá»‰
   * khÃ´ng dÃ¹ng tháº³ng nÃ³ ná»¯a). */
  extractKeyFromPublicUrl(url: string): string {
    const prefix = `https://${this.endpoint}/${this.bucketName}/`;
    if (!url.startsWith(prefix)) {
      throw new Error(
        `URL khÃ´ng thuá»™c bucket B2 hiá»‡n táº¡i, khÃ´ng trÃ­ch Ä‘Æ°á»£c key: ${url}`,
      );
    }
    return url.slice(prefix.length);
  }

  /**
   * URL cÃ³ CHá»® KÃ + THá»œI Háº N cho 1 object â€” Ä‘Ã¢y má»›i lÃ  URL tháº­t sá»± nÃªn
   * Ä‘Æ°a cho khÃ¡ch (áº£nh preview/file táº£i cuá»‘i), thay cho getPublicUrl()
   * tÄ©nh á»Ÿ trÃªn. An toÃ n dÃ¹ bucket B2 Ä‘ang public-read hay private:
   * presigned URL váº«n hoáº¡t Ä‘á»™ng Ä‘Ãºng vá»›i bucket public (khÃ´ng háº¡i gÃ¬
   * thÃªm), vÃ  báº¯t buá»™c pháº£i cÃ³ náº¿u bucket Ä‘Æ°á»£c chuyá»ƒn sang private.
   */
  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  /** Upload file lÃªn B2, tráº£ vá» object key (dÃ¹ng lÃ m fileRef). */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string }> {
    // Never place a client-controlled path or raw filename in an object key.
    // B2 keys are not filesystem paths, but keeping separators/control
    // characters out prevents confusing downstream workers and log tooling.
    const safeName = (file.originalname || 'upload.blend')
      .split(/[\\/]/)
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 160) || 'upload.blend';
    const key = `uploads/${randomUUID()}-${safeName}`;

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
      this.logger.error(`Upload B2 tháº¥t báº¡i cho key ${key}: ${message}`);
      throw new Error(`Upload file lÃªn B2 tháº¥t báº¡i: ${message}`);
    }

    const url = `https://${this.endpoint}/${this.bucketName}/${key}`;
    return { key, url };
  }


  async createMultipartUpload(key: string, contentType: string): Promise<{ uploadId: string }> {
    const result = await this.s3.send(new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    }));
    if (!result.UploadId) throw new Error('B2 khÃ´ng tráº£ vá» multipart upload id');
    return { uploadId: result.UploadId };
  }

  async uploadMultipartPart(key: string, uploadId: string, partNumber: number, buffer: Buffer): Promise<string> {
    const result = await this.s3.send(new UploadPartCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: buffer,
      ContentLength: buffer.length,
    }));
    if (!result.ETag) throw new Error('B2 khÃ´ng tráº£ vá» ETag cho chunk');
    return result.ETag;
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: { PartNumber: number; ETag: string }[]): Promise<void> {
    await this.s3.send(new CompleteMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }));
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await this.s3.send(new AbortMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
    }));
  }
  /** Liá»‡t kÃª toÃ n bá»™ object theo prefix â€” dÃ¹ng Ä‘á»ƒ tÃ¬m cÃ¡c frame PNG
   * mÃ  Worker Ä‘Ã£ upload cho 1 job (Ä‘Æ°á»ng dáº«n dáº¡ng renders/JOB_ID/
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

  /** Táº£i ná»™i dung 1 object vá» dáº¡ng Buffer â€” dÃ¹ng khi Ä‘Ã³ng gÃ³i káº¿t quáº£
   * (táº£i tá»«ng frame PNG Ä‘á»ƒ nÃ©n vÃ o file zip). */
  async getObjectBuffer(key: string): Promise<Buffer> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    const stream = res.Body;
    if (!stream || !('transformToByteArray' in stream)) {
      throw new Error(`KhÃ´ng Ä‘á»c Ä‘Æ°á»£c ná»™i dung object ${key} tá»« B2`);
    }
    const bytes = await stream.transformToByteArray();
    return Buffer.from(bytes);
  }

  /** Upload buffer (vd file zip Ä‘Ã£ nÃ©n) lÃªn B2, tráº£ vá» URL trá»±c tiáº¿p. */
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
    return `https://${this.endpoint}/${this.bucketName}/${key}`;
  }
}

