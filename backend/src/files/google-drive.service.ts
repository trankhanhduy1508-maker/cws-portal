import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

const FILE_LINK_PATTERN = /\/file\/d\/([\w-]+)/;
const OPEN_ID_PATTERN = /[?&]id=([\w-]+)/;
const FOLDER_LINK_PATTERN = /\/folders\/([\w-]+)/;
const GOOGLE_DRIVE_HOST_PATTERN = /^https:\/\/drive\.google\.com\//;
const SUPPORTED_PROJECT_PATTERN = /\.(blend|zip)$/i;

type ResolvedDriveFile = {
  fileName: string | null;
  fileSizeBytes: number | null;
  resolvedDriveLink?: string;
};

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

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
      this.logger.warn('GOOGLE_DRIVE_API_KEY is not configured; returning unknown metadata.');
      return { fileName: null, fileSizeBytes: null };
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
}
