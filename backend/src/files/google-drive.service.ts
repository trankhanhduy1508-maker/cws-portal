import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, promises as fsPromises } from 'fs';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { basename, join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { AppConfig } from '../config/configuration';
import { B2StorageService } from './b2-storage.service';
import { getInputFormat } from './input-file.util';

const FILE_LINK_PATTERN = /\/file\/d\/([\w-]+)/;
const OPEN_ID_PATTERN = /[?&]id=([\w-]+)/;
const FOLDER_LINK_PATTERN = /\/folders\/([\w-]+)/;
const GOOGLE_DRIVE_HOST_PATTERN = /^https:\/\/drive\.google\.com\//;
const GOOGLE_DOWNLOAD_HOSTS = new Set([
  'drive.google.com',
  'drive.usercontent.google.com',
]);
const SUPPORTED_PROJECT_PATTERN = /\.(blend|zip|rar)$/i;
const MAX_INPUT_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_WARNING_PAGE_BYTES = 4 * 1024 * 1024;
const FILE_DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
// Blender-native compressed .blend files use the standard Zstandard frame
// magic instead of the ASCII BLENDER header.
const ZSTD_BLEND_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

type ResolvedDriveFile = {
  fileName: string | null;
  fileSizeBytes: number | null;
  resolvedDriveLink?: string;
  /** Present when this resolve call already materialized the input to B2. */
  fileRef?: string;
};

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly driveRequestControllers = new WeakMap<
    Response,
    { controller: AbortController; timeout: ReturnType<typeof setTimeout> }
  >();

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly b2StorageService: B2StorageService,
  ) {}

  private extractFileId(driveLink: string): string {
    const fileMatch = FILE_LINK_PATTERN.exec(driveLink);
    if (fileMatch) return fileMatch[1];
    const idMatch = OPEN_ID_PATTERN.exec(driveLink);
    if (idMatch) return idMatch[1];
    throw new BadRequestException(
      'Khong nhan dien duoc file ID tu link Google Drive.',
    );
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
      this.logger.warn(
        'Non-Google Drive link cannot be resolved by the current API.',
      );
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
        (file) =>
          typeof file.id === 'string' &&
          SUPPORTED_PROJECT_PATTERN.test(file.name ?? ''),
      );
      if (candidates.length !== 1) {
        throw new BadRequestException(
          candidates.length === 0
            ? 'Folder must contain exactly one .blend, .zip or .rar project.'
            : 'Folder contains multiple .blend/.zip/.rar projects; selection is ambiguous.',
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
      this.logger.log(
        `Resolving public Drive file ${fileId} through direct download (no API key).`,
      );
      const imported = await this.materializePublicFileToB2(driveLink, fileId);
      return {
        fileName: imported.fileName,
        fileSizeBytes: imported.fileSizeBytes,
        fileRef: imported.key,
      };
    }
    const url =
      `https://www.googleapis.com/drive/v3/files/${fileId}?key=${encodeURIComponent(apiKey)}` +
      '&fields=name,size';
    const response = await this.driveRequest(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new BadRequestException(
          'File not found or not shared; kiểm tra quyền chia sẻ.',
        );
      }
      this.logger.error(
        `Google Drive API returned ${response.status} for file metadata.`,
      );
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
    const fileId = this.extractFileId(driveLink);
    const apiKey = this.configService.get('googleDriveApiKey', { infer: true });

    // Public-link MVP path: the resolve endpoint already materializes the
    // file when it is called before job creation. This method remains the
    // fallback for clients that create a job with driveLink directly.
    if (!apiKey) {
      return this.materializePublicFileToB2(driveLink, fileId);
    }

    const metadata = await this.resolve(driveLink);
    const fileName = metadata.fileName ?? '';
    if (!getInputFormat(fileName)) {
      throw new BadRequestException(
        'Google Drive chỉ hỗ trợ file .blend, .zip hoặc .rar',
      );
    }
    if (!metadata.fileSizeBytes || metadata.fileSizeBytes > MAX_INPUT_BYTES) {
      throw new BadRequestException(
        'Kích thước file Google Drive không hợp lệ hoặc vượt giới hạn 2GB',
      );
    }

    const response = await this.download(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`,
    );
    if (!response.ok || !response.body) {
      throw new BadRequestException(
        'Không tải được file Google Drive; kiểm tra quyền chia sẻ.',
      );
    }
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (
      declaredSize &&
      (declaredSize !== metadata.fileSizeBytes ||
        declaredSize > MAX_INPUT_BYTES)
    ) {
      throw new BadRequestException(
        'Kích thước file Google Drive không hợp lệ',
      );
    }

    const tempPath = join(tmpdir(), `cws-drive-${randomUUID()}`);
    let written = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        written += chunk.length;
        if (written > MAX_INPUT_BYTES) {
          callback(
            new BadRequestException('File Google Drive vượt giới hạn 2GB'),
          );
          return;
        }
        callback(null, chunk);
      },
    });
    try {
      await pipeline(
        Readable.fromWeb(response.body as never),
        limiter,
        createWriteStream(tempPath, { flags: 'wx' }),
      );
      if (written !== metadata.fileSizeBytes) {
        throw new BadRequestException('File Google Drive tải không đủ dữ liệu');
      }
      await this.validateProjectSignature(tempPath, fileName);
      const uploaded = await this.b2StorageService.uploadFile({
        path: tempPath,
        originalname: fileName,
        size: written,
        mimetype:
          getInputFormat(fileName) === 'zip'
            ? 'application/zip'
            : getInputFormat(fileName) === 'rar'
              ? 'application/vnd.rar'
              : 'application/octet-stream',
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

  /**
   * Downloads a public Drive file exactly once into a temporary file and
   * immediately uploads that file to canonical B2 input storage. This is the
   * MVP path and deliberately does not use the Drive API or expose Drive to a
   * Worker.
   */
  private async materializePublicFileToB2(
    driveLink: string,
    fileId: string,
  ): Promise<{ key: string; fileName: string; fileSizeBytes: number }> {
    const initialUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    let tempPath: string | null = null;
    let initialResponse: Response | null = null;
    let downloadResponse: Response | null = null;
    let discoveredName: string | null = null;

    try {
      const initial = await this.fetchDrive(
        initialUrl,
        FILE_DOWNLOAD_TIMEOUT_MS,
      );
      initialResponse = initial;
      this.assertDriveResponseUrl(initial, initialUrl);
      if (!initial.ok || !initial.body) {
        this.logger.warn(
          `Drive initial download failed: status=${initial.status} url=${initial.url}`,
        );
        throw this.publicAccessError();
      }

      const initialContentType = initial.headers.get('content-type') ?? '';
      downloadResponse = initial;
      if (initialContentType.toLowerCase().includes('text/html')) {
        const warningHtml = await this.readBoundedText(
          initial,
          MAX_WARNING_PAGE_BYTES,
        );
        this.releaseDriveResponse(initial);
        const uuid = /name=["']uuid["']\s+value=["']([^"']+)["']/i.exec(
          warningHtml,
        )?.[1];
        discoveredName = this.extractHtmlFileName(warningHtml);
        if (!uuid) {
          this.logger.warn(
            `Drive public download returned an access page without uuid: fileId=${fileId}`,
          );
          throw this.publicAccessError();
        }
        const retryUrl = new URL(
          'https://drive.usercontent.google.com/download',
        );
        retryUrl.searchParams.set('id', fileId);
        retryUrl.searchParams.set('export', 'download');
        retryUrl.searchParams.set('confirm', 't');
        retryUrl.searchParams.set('uuid', uuid);
        downloadResponse = await this.fetchDrive(
          retryUrl.toString(),
          FILE_DOWNLOAD_TIMEOUT_MS,
        );
        initialResponse = initial;
        this.assertDriveResponseUrl(downloadResponse, retryUrl.toString());
      }

      if (!downloadResponse.ok || !downloadResponse.body) {
        this.logger.warn(
          `Drive file download failed: status=${downloadResponse.status} url=${downloadResponse.url}`,
        );
        throw this.publicAccessError();
      }
      const responseContentType =
        downloadResponse.headers.get('content-type') ?? '';
      if (responseContentType.toLowerCase().includes('text/html')) {
        await this.readBoundedText(downloadResponse, MAX_WARNING_PAGE_BYTES);
        throw this.publicAccessError();
      }

      const headerName = this.extractContentDispositionFileName(
        downloadResponse.headers.get('content-disposition'),
      );
      const requestedName = headerName ?? discoveredName ?? `drive-${fileId}`;
      tempPath = join(tmpdir(), `cws-drive-${randomUUID()}`);
      const written = await this.streamResponseToTemp(
        downloadResponse,
        tempPath,
      );
      const fileName = await this.ensureSupportedFileName(
        tempPath,
        requestedName,
      );
      await this.validateProjectSignature(tempPath, fileName);

      const uploaded = await this.b2StorageService.uploadFile({
        path: tempPath,
        originalname: fileName,
        size: written,
        mimetype: this.mimeTypeFor(fileName),
      } as Express.Multer.File);
      return { key: uploaded.key, fileName, fileSizeBytes: written };
    } catch (error) {
      this.logger.error(
        `Drive public materialization failed for ${driveLink}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    } finally {
      if (initialResponse) this.releaseDriveResponse(initialResponse);
      if (downloadResponse) this.releaseDriveResponse(downloadResponse);
      if (tempPath) await fsPromises.unlink(tempPath).catch(() => undefined);
    }
  }

  private async fetchDrive(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let currentUrl = url;
    try {
      for (let redirectCount = 0; redirectCount <= 4; redirectCount += 1) {
        const response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
        });
        if (response.status < 300 || response.status >= 400) {
          this.assertDriveResponseUrl(response, currentUrl);
          this.driveRequestControllers.set(response, { controller, timeout });
          return response;
        }
        const location = response.headers.get('location');
        if (!location)
          throw new BadRequestException(
            'Google Drive trả về redirect không hợp lệ.',
          );
        const nextUrl = new URL(location, currentUrl);
        if (!GOOGLE_DOWNLOAD_HOSTS.has(nextUrl.hostname)) {
          throw new BadRequestException(
            'Google Drive trả về chuyển hướng không an toàn.',
          );
        }
        currentUrl = nextUrl.toString();
      }
      throw new BadRequestException('Google Drive redirect quá nhiều lần.');
    } catch (error) {
      clearTimeout(timeout);
      if (controller.signal.aborted) {
        throw new BadRequestException(
          'Google Drive tải quá thời gian cho phép.',
        );
      }
      throw error;
    }
  }

  private releaseDriveResponse(response: Response): void {
    const request = this.driveRequestControllers.get(response);
    if (!request) return;
    clearTimeout(request.timeout);
    request.controller.abort();
    this.driveRequestControllers.delete(response);
  }

  private assertDriveResponseUrl(
    response: Response,
    requestedUrl: string,
  ): void {
    let hostname: string;
    try {
      hostname = new URL(response.url || requestedUrl).hostname;
    } catch {
      throw new BadRequestException(
        'Google Drive trả về URL tải không hợp lệ.',
      );
    }
    if (!GOOGLE_DOWNLOAD_HOSTS.has(hostname)) {
      this.logger.error(`Rejected unexpected Drive redirect host: ${hostname}`);
      throw new BadRequestException(
        'Google Drive trả về chuyển hướng không an toàn.',
      );
    }
  }

  private async readBoundedText(
    response: Response,
    maxBytes: number,
  ): Promise<string> {
    if (!response.body) return '';
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        const chunk = Buffer.from(next.value);
        total += chunk.length;
        if (total > maxBytes) {
          throw new BadRequestException(
            'Google Drive trả về trang phản hồi quá lớn.',
          );
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  private async streamResponseToTemp(
    response: Response,
    tempPath: string,
  ): Promise<number> {
    if (!response.body) throw this.publicAccessError();
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_INPUT_BYTES) {
      throw new BadRequestException('File Google Drive vượt giới hạn 2GB.');
    }
    let written = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        written += chunk.length;
        if (written > MAX_INPUT_BYTES) {
          callback(
            new BadRequestException('File Google Drive vượt giới hạn 2GB.'),
          );
          return;
        }
        callback(null, chunk);
      },
    });
    await pipeline(
      Readable.fromWeb(response.body as never),
      limiter,
      createWriteStream(tempPath, { flags: 'wx' }),
    );
    if (declaredSize && declaredSize !== written) {
      throw new BadRequestException('File Google Drive tải không đủ dữ liệu.');
    }
    return written;
  }

  private extractContentDispositionFileName(
    value: string | null,
  ): string | null {
    if (!value) return null;
    const match = /filename\*?=(?:UTF-8''|"|')?([^"';]+)["']?/i.exec(value);
    return match?.[1] ? this.safeFileName(decodeURIComponent(match[1])) : null;
  }

  private extractHtmlFileName(html: string): string | null {
    const match = /<a\b[^>]*>([^<]+)\s*\([^<]*\)<\/a>/i.exec(html);
    return match?.[1]
      ? this.safeFileName(this.decodeHtml(match[1].trim()))
      : null;
  }

  private async ensureSupportedFileName(
    path: string,
    requestedName: string,
  ): Promise<string> {
    const safeRequested = this.safeFileName(requestedName);
    if (getInputFormat(safeRequested)) return safeRequested;
    const handle = await fsPromises.open(path, 'r');
    const prefix = Buffer.alloc(8);
    try {
      await handle.read(prefix, 0, prefix.length, 0);
    } finally {
      await handle.close();
    }
    const inferred =
      prefix.subarray(0, 7).toString() === 'BLENDER'
        ? 'blend'
        : prefix.subarray(0, 4).toString() === 'PK\u0003\u0004'
          ? 'zip'
          : prefix.subarray(0, 7).toString() === 'Rar!\u001a\u0007\u0000'
            ? 'rar'
            : null;
    if (!inferred)
      throw new BadRequestException(
        'Không xác định được định dạng file Google Drive.',
      );
    return `${safeRequested.replace(/\.[^.]*$/, '') || 'drive-input'}.${inferred}`;
  }

  private safeFileName(value: string): string {
    const base = basename(value.replace(/\\/g, '/'));
    return base.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 180) || 'drive-input';
  }

  private decodeHtml(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private mimeTypeFor(fileName: string): string {
    const format = getInputFormat(fileName);
    return format === 'zip'
      ? 'application/zip'
      : format === 'rar'
        ? 'application/vnd.rar'
        : 'application/octet-stream';
  }

  private publicAccessError(): BadRequestException {
    return new BadRequestException(
      'Không thể tải file Google Drive. Hãy bật “Anyone with the link” (Viewer). MVP chưa hỗ trợ file riêng tư hoặc yêu cầu đăng nhập Google Drive.',
    );
  }

  private async validateProjectSignature(
    path: string,
    fileName: string,
  ): Promise<void> {
    const handle = await fsPromises.open(path, 'r');
    const prefix = Buffer.alloc(8);
    try {
      await handle.read(prefix, 0, prefix.length, 0);
    } finally {
      await handle.close();
    }
    if (
      getInputFormat(fileName) === 'blend' &&
      (prefix.subarray(0, 7).toString() === 'BLENDER' ||
        prefix.subarray(0, 4).equals(ZSTD_BLEND_MAGIC))
    )
      return;
    if (
      getInputFormat(fileName) === 'zip' &&
      prefix.subarray(0, 4).toString() === 'PK\u0003\u0004'
    )
      return;
    if (
      getInputFormat(fileName) === 'rar' &&
      prefix.subarray(0, 7).toString() === 'Rar!\u001a\u0007\u0000'
    )
      return;
    throw new BadRequestException(
      'File Google Drive không phải .blend/.zip/.rar hợp lệ',
    );
  }
}
