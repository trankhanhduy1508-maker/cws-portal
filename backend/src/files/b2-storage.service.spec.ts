import { ConfigService } from '@nestjs/config';
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
 * Test cho `extractKeyFromPublicUrl()` â€” hÃ m má»›i thÃªm khi sá»­a lá»— há»•ng
 * "URL cÃ´ng khai tÄ©nh" (xem docs/MVP_GAP_REPORT.md): trÃ­ch láº¡i object
 * key tá»« URL Ä‘Ã£ lÆ°u trong DB Ä‘á»ƒ kÃ½ láº¡i thÃ nh presigned URL cÃ³ háº¡n,
 * KHÃ”NG cáº§n Ä‘á»•i schema. ÄÃ¢y lÃ  logic string thuáº§n, khÃ´ng cáº§n gá»i B2
 * tháº­t nÃªn test Ä‘Æ°á»£c trá»±c tiáº¿p (khÃ¡c `getSignedUrl()` â€” cáº§n kÃ½ tháº­t,
 * Ä‘á»ƒ láº¡i cho kiá»ƒm thá»­ thá»§ cÃ´ng/tÃ­ch há»£p vá»›i B2 tháº­t).
 */
describe('B2StorageService.extractKeyFromPublicUrl()', () => {
  it('trÃ­ch Ä‘Ãºng key tá»« URL Ä‘Ã£ ghÃ©p bá»Ÿi getPublicUrl()/uploadBuffer()', () => {
    const service = makeService();
    const url =
      'https://s3.us-west-000.backblazeb2.com/cws-bucket/results/abc-123.zip';

    expect(service.extractKeyFromPublicUrl(url)).toBe('results/abc-123.zip');
  });

  it('nÃ©m lá»—i náº¿u URL khÃ´ng thuá»™c Ä‘Ãºng bucket/endpoint hiá»‡n táº¡i (trÃ¡nh kÃ½ nháº§m key cá»§a nÆ¡i khÃ¡c)', () => {
    const service = makeService();
    const url = 'https://evil.example.com/other-bucket/results/abc-123.zip';

    expect(() => service.extractKeyFromPublicUrl(url)).toThrow();
  });
});

describe('B2StorageService.uploadFile()', () => {
  it('does not copy client path separators or unsafe filename characters into the B2 key', async () => {
    const service = makeService() as any;
    const sent: any[] = [];
    service.s3 = { send: jest.fn(async (command: any) => { sent.push(command.input); }) };

    await service.uploadFile({
      originalname: '..\\customer/scene name.blend',
      mimetype: 'application/octet-stream',
      buffer: Buffer.from('BLENDER'),
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].Key).toMatch(/^uploads\/[0-9a-f-]+-scene_name\.blend$/);
    expect(sent[0].Key).not.toContain('..');
    expect(sent[0].Key).not.toContain('\\');
  });
});

