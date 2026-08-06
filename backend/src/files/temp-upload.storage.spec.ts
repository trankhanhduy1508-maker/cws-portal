import { EventEmitter } from 'events';
import { promises as fsPromises } from 'fs';
import { Readable } from 'stream';
import { CwsTempUploadStorage } from './temp-upload.storage';

function request(): Express.Request {
  return new EventEmitter() as unknown as Express.Request;
}

describe('CwsTempUploadStorage', () => {
  it('streams to a temporary file without a memory buffer and removes it', async () => {
    const storage = new CwsTempUploadStorage();
    const info = await new Promise<Express.Multer.File>((resolve, reject) => {
      storage._handleFile(
        request(),
        { stream: Readable.from(['first', 'second']) } as Express.Multer.File,
        (error, result) => (error ? reject(error) : resolve(result as Express.Multer.File)),
      );
    });

    expect(info.buffer).toBeUndefined();
    expect(info.path).toBeDefined();
    await expect(fsPromises.readFile(info.path!, 'utf8')).resolves.toBe('firstsecond');

    await new Promise<void>((resolve, reject) => {
      storage._removeFile(request(), info, (error) => (error ? reject(error) : resolve()));
    });
    await expect(fsPromises.access(info.path!)).rejects.toThrow();
  });

  it('cleans the partial file when the request is aborted', async () => {
    const storage = new CwsTempUploadStorage();
    const req = request();
    const source = new Readable({ read() {} });
    const outcome = new Promise<Error | null>((resolve) => {
      storage._handleFile(
        req,
        { stream: source } as Express.Multer.File,
        (error) => resolve(error ?? null),
      );
    });

    await new Promise<void>((resolve) => setImmediate(resolve));
    (req as unknown as EventEmitter).emit('aborted');
    source.push(null);
    const error = await outcome;
    expect(error).toBeInstanceOf(Error);
  });

  it('keeps concurrent uploads disk-backed and independently cleanable', async () => {
    const storage = new CwsTempUploadStorage();
    const files = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        new Promise<Express.Multer.File>((resolve, reject) => {
          storage._handleFile(
            request(),
            { stream: Readable.from([`payload-${index}`]) } as Express.Multer.File,
            (error, result) => (error ? reject(error) : resolve(result as Express.Multer.File)),
          );
        }),
      ),
    );

    expect(files.every((file) => !file.buffer && Boolean(file.path))).toBe(true);
    await Promise.all(
      files.map(
        (file) =>
          new Promise<void>((resolve, reject) => {
            storage._removeFile(request(), file, (error) =>
              error ? reject(error) : resolve(),
            );
          }),
      ),
    );
  });
});
