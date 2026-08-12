import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { InputSecurityService } from './input-security.service';

describe('InputSecurityService', () => {
  let path: string;
  let service: InputSecurityService;

  beforeEach(async () => {
    path = join(tmpdir(), `cws-security-${randomUUID()}.blend`);
    await fs.writeFile(path, Buffer.concat([Buffer.from('BLENDER'), Buffer.from('test')]));
    service = new InputSecurityService();
  });

  afterEach(async () => fs.unlink(path).catch(() => undefined));

  it('fails closed when the scanner is unavailable/error', async () => {
    (service as any).runClamAv = jest.fn().mockResolvedValue({
      verdict: 'ERROR', engine: 'clamav', version: null, signatureDatabaseVersion: null,
    });
    await expect(service.inspect(path, 'scene.blend', 11)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts only a clean signature-validated input', async () => {
    (service as any).runClamAv = jest.fn().mockResolvedValue({
      verdict: 'CLEAN', engine: 'clamdscan', version: '1.0', signatureDatabaseVersion: '2',
    });
    await expect(service.inspect(path, 'scene.blend', 11)).resolves.toMatchObject({
      verdict: 'CLEAN', scannerEngine: 'clamdscan', contentSha256: expect.any(String),
    });
  });

  it('rejects archive input with unsafe structure before B2 promotion', async () => {
    const zipPath = path.replace(/\.blend$/, '.zip');
    await fs.rename(path, zipPath);
    path = zipPath;
    await fs.writeFile(path, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    await expect(service.inspect(path, 'scene.zip', 4)).rejects.toBeInstanceOf(BadRequestException);
  });
});
