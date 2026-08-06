import { createWriteStream, mkdirSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { EventEmitter } from 'events';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { StorageEngine } from 'multer';

export const CWS_UPLOAD_TEMP_DIR = join(tmpdir(), 'cws-uploads');
mkdirSync(CWS_UPLOAD_TEMP_DIR, { recursive: true });

/** Disk-backed Multer storage with stream backpressure and abort cleanup. */
export class CwsTempUploadStorage implements StorageEngine {
  _handleFile(
    request: Express.Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    const path = join(CWS_UPLOAD_TEMP_DIR, randomUUID());
    const output = createWriteStream(path, { flags: 'wx' });
    const requestEvents = request as unknown as EventEmitter;
    let settled = false;

    const cleanup = async (): Promise<void> => {
      try {
        await fsPromises.unlink(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    };
    const onAborted = (): void => {
      output.destroy(new Error('Upload client disconnected'));
    };
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      requestEvents.off('aborted', onAborted);
      if (error) {
        void cleanup().finally(() => callback(error));
        return;
      }
      callback(null, {
        destination: CWS_UPLOAD_TEMP_DIR,
        filename: path.slice(CWS_UPLOAD_TEMP_DIR.length + 1),
        path,
        size: output.bytesWritten,
      });
    };

    requestEvents.once('aborted', onAborted);
    output.once('error', finish);
    output.once('finish', () => finish());
    file.stream.once('error', (error: Error) => output.destroy(error));
    file.stream.pipe(output);
  }

  _removeFile(
    _request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ): void {
    if (!file.path) {
      callback(null);
      return;
    }
    void fsPromises.unlink(file.path).then(
      () => callback(null),
      (error: NodeJS.ErrnoException) => callback(error.code === 'ENOENT' ? null : error),
    );
  }
}
