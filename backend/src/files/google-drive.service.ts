import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, promises as fsPromises } from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { AppConfig } from '../config/configuration';
import { B2StorageService } from './b2-storage.service';
import { getInputFormat } from './input-file.util';

const FILE_LINK_PATTERN = /\/file\/d\/([\w-]+)/;
const OPEN_ID_PATTERN = /[?&]id=([\w-]+)/;
const FOLDER_LINK_PATTERN = /\/folders\/([\w-]+)/;
const GOOGLE_DRIVE_HOST_PATTERN = /^https:\/\/drive\.google\.com\//;
const SUPPORTED_PROJECT_PATTERN = /\.(blend|zip)$/i;
const MAX_INPUT_BYTES = 2 * 1024 * 1024 * 1024;

type ResolvedDriveFile = {
  fileName: string | null;
  fileSizeBytes: number | null;
  resolvedDriveLink?: string;
};

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly b2StorageService: B2StorageService,
  ) {}

  private extractFileId(driveLink: string): string {
    const fileMatch = FILE_LINK_PATTERN.exec(driveLink);
    if (fileMatch) return fileMatch[1];
    const idMatch = OPEN_ID_PATTERN.exec(driveLink);
    if (idMatch) return idMatch[1];
    throw new BadRequestException('Khong nhan dien duoc file ID tu link Google Drive.');
  }

  private extractFolderId(driveLink: string): string | null {
    return FOLDER_LINK_PATTERN.exec(driveLink)?.[1] ?? null;
  }

  private async driveRequest(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      return await fetch(url, { redirect: 'error', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async resolve(driveLink: string): Promise<ResolvedDriveFile> {
    if (!GOOGLE_DRIVE_HOST_PATTERN.test(driveLink)) {
      this.logger.warn('Non-Google Drive link cannot be resolved by the current API.');
      return { fileName: null, fileSizeBytes: null };
    }

    const apiKey = this.configService.get('googleDriveApiKey', { infer: true });
    const folderId = this.extractFolderId(driveLink);
    if (folderId) {
      if (!apiKey) {
        throw new BadRequestException(
          'Link này là link THƯ MỤC; folder resolution is unavailable because Google Drive API is not configured.',
        );
      }
      const query = `'${folderId}' in parents and trashed = false`;
      const url =
        `https://www.googleapis.com/drive/v3/files?key=${encodeURIComponent(apiKey)}` +
        `&q=${encodeURIComponent(query)}&fields=files(id,name,size,mimeType)&pageSize=100`;
      const response = await this.driveRequest(url);
      if (!response.ok) {
        throw new BadRequestException(
          'Cannot read the Google Drive folder; check its sharing permission.',
        );
      }
      const data = (await response.json()) as {
        files?: Array<{ id?: string; name?: string; size?: string }>;
      };
      const candidates = (data.files ?? []).filter(
        (file) => typeof file.id === 'string' && SUPPORTED_PROJECT_PATTERN.test(file.name ?? ''),
      );
      if (candidates.length !== 1) {
        throw new BadRequestException(
          candidates.length === 0
            ? 'Folder must contain exactly one .blend or .zip project.'
            : 'Folder contains multiple .blend/.zip projects; selection is ambiguous.',
        );
      }
      const file = candidates[0];
      return {
        fileName: file.name ?? null,
        fileSizeBytes: file.size ? parseInt(file.size, 10) : null,
        resolvedDriveLink: `https://drive.google.com/file/d/${file.id}/view`,
      };
    }

    const fileId = this.extractFileId(driveLink);
    if (!apiKey) {
      // A Drive URL must not be accepted as a render input merely because its
      // syntax is valid. The canonical Worker is B2-only unless an explicit
      // Drive capability exists; creating an order here would leave it queued
      // forever and make the portal look as if it were rendering. Fail before
      // job creation until the trusted Backend can verify/materialize the file.
      void fileId;
      this.logger.warn('GOOGLE_DRIVE_API_KEY is not configured; rejecting Drive input.');
      throw new ServiceUnavailableException(
        'Google Drive import chưa được cấu hình. Hãy tải file .blend/.zip trực tiếp hoặc liên hệ CWS.',
      );
    }
    const url =
      `https://www.googleapis.com/drive/v3/files/${fileId}?key=${encodeURIComponent(apiKey)}` +
      '&fields=name,size';
    const response = await this.driveRequest(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new BadRequestException('File not found or not shared; kiểm tra quyền chia sẻ.');
      }
      this.logger.error(`Google Drive API returned ${response.status} for file metadata.`);
      return { fileName: null, fileSizeBytes: null };
    }
    const data = (await response.json()) as { name?: string; size?: string };
    return {
      fileName: data.name ?? null,
      fileSizeBytes: data.size ? parseInt(data.size, 10) : null,
    };
  }

  /**
   * Copies an approved public Drive project into the trusted B2 input prefix.
   * The Worker consequently receives only a fenced B2 capability, never a
   * Google key or a Drive URL that it cannot safely claim.
   */
  async materializeToB2(
    driveLink: string,
  ): Promise<{ key: string; fileName: string; fileSizeBytes: number }> {
    const metadata = await this.resolve(driveLink);
    const fileId = this.extractFileId(driveLink);
    const fileName = metadata.fileName ?? '';
    if (!getInputFormat(fileName)) {
      throw new BadRequestException('Google Drive chỉ hỗ trợ file .blend hoặc .zip');
    }
    if (!metadata.fileSizeBytes || metadata.fileSizeBytes > MAX_INPUT_BYTES) {
      throw new BadRequestException('Kích thước file Google Drive không hợp lệ hoặc vượt giới hạn 2GB');
    }

    const apiKey = this.configService.get('googleDriveApiKey', { infer: true });
    if (!apiKey) {
      throw new ServiceUnavailableException('Google Drive import chưa được cấu hình.');
    }
    const response = await this.download(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`,
    );
    if (!response.ok || !response.body) {
      throw new BadRequestException('Không tải được file Google Drive; kiểm tra quyền chia sẻ.');
    }
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize && (declaredSize !== metadata.fileSizeBytes || declaredSize > MAX_INPUT_BYTES)) {
      throw new BadRequestException('Kích thước file Google Drive không hợp lệ');
    }

    const tempPath = join(tmpdir(), `cws-drive-${randomUUID()}`);
    let written = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        written += chunk.length;
        if (written > MAX_INPUT_BYTES) {
          callback(new BadRequestException('File Google Drive vượt giới hạn 2GB'));
          return;
        }
        callback(null, chunk);
      },
    });
    try {
      await pipeline(Readable.fromWeb(response.body as never), limiter, createWriteStream(tempPath, { flags: 'wx' }));
      if (written !== metadata.fileSizeBytes) {
        throw new BadRequestException('File Google Drive tải không đủ dữ liệu');
      }
      await this.validateProjectSignature(tempPath, fileName);
      const uploaded = await this.b2StorageService.uploadFile({
        path: tempPath,
        originalname: fileName,
        size: written,
        mimetype: getInputFormat(fileName) === 'zip' ? 'application/zip' : 'application/octet-stream',
      } as Express.Multer.File);
      return { key: uploaded.key, fileName, fileSizeBytes: written };
    } finally {
      await fsPromises.unlink(tempPath).catch(() => undefined);
    }
  }

  private async download(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30 * 60 * 1000);
    try {
      return await fetch(url, { redirect: 'error', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async validateProjectSignature(path: string, fileName: string): Promise<void> {
    const handle = await fsPromises.open(path, 'r');
    const prefix = Buffer.alloc(8);
    try {
      await handle.read(prefix, 0, prefix.length, 0);
    } finally {
      await handle.close();
    }
    if (getInputFormat(fileName) === 'blend' && prefix.subarray(0, 7).toString() === 'BLENDER') return;
    if (getInputFormat(fileName) === 'zip' && prefix.subarray(0, 4).toString() === 'PK\u0003\u0004') return;
    throw new BadRequestException('File Google Drive không phải .blend/.zip hợp lệ');
  }
}
