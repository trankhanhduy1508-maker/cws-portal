import { ConfigService } from '@nestjs/config';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { B2StorageService } from './b2-storage.service';
import { AppConfig } from '../config/configuration';

function makeService(): B2StorageService {
  const configService = {
    get: jest.fn().mockReturnValue({
      endpoint: 's3.us-west-000.backblazeb2.com',
      keyId: 'fake-key-id',
      applicationKey: 'fake-application-key',
      bucketName: 'cws-bucket',
    }),
  } as unknown as ConfigService<AppConfig, true>;
  return new B2StorageService(configService);
}

/**
 * Test cho `extractKeyFromPublicUrl()` — hàm mới thêm khi sửa lỗ hổng
 * "URL công khai tĩnh" (xem docs/MVP_GAP_REPORT.md): trích lại object
 * key từ URL đã lưu trong DB để ký lại thành presigned URL có hạn,
 * KHÔNG cần đổi schema. Đây là logic string thuần, không cần gọi B2
 * thật nên test được trực tiếp (khác `getSignedUrl()` — cần ký thật,
 * để lại cho kiểm thử thủ công/tích hợp với B2 thật).
 */
describe('B2StorageService.extractKeyFromPublicUrl()', () => {
  it('trích đúng key từ URL đã ghép bởi getPublicUrl()/uploadBuffer()', () => {
    const service = makeService();
    const url =
      'https://s3.us-west-000.backblazeb2.com/cws-bucket/results/abc-123.zip';

    expect(service.extractKeyFromPublicUrl(url)).toBe('results/abc-123.zip');
  });

  it('ném lỗi nếu URL không thuộc đúng bucket/endpoint hiện tại (tránh ký nhầm key của nơi khác)', () => {
    const service = makeService();
    const url = 'https://evil.example.com/other-bucket/results/abc-123.zip';

    expect(() => service.extractKeyFromPublicUrl(url)).toThrow();
  });
});

describe('B2StorageService.uploadFile()', () => {
  it('cleans the streamed temporary file when storage fails', async () => {
    const service = makeService();
    const path = join(tmpdir(), `cws-upload-test-${Date.now()}`);
    await fsPromises.writeFile(path, 'blend-data');
    (service as any).s3 = {
      send: jest.fn().mockRejectedValue(new Error('storage unavailable')),
    };

    await expect(
      service.uploadFile({
        path,
        size: 10,
        originalname: 'scene.blend',
        mimetype: 'application/octet-stream',
      } as Express.Multer.File),
    ).rejects.toThrow('Upload file lên B2 thất bại');
    await expect(fsPromises.access(path)).rejects.toThrow();
  });
});
