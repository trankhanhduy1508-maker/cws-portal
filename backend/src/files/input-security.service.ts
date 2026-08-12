import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { getInputFormat, hasValidInputSignature } from './input-file.util';

const MAX_SCAN_BYTES = 2 * 1024 * 1024 * 1024;
const SCAN_TIMEOUT_MS = 30 * 60 * 1000;

export type SecurityEvidence = {
  verdict: 'CLEAN';
  reason: string;
  scannerEngine: string;
  scannerVersion: string | null;
  signatureDatabaseVersion: string | null;
  contentSha256: string;
  scannedAt: string;
};

/** Pre-B2 security boundary. Missing scanner or unknown verdict fails closed. */
@Injectable()
export class InputSecurityService {
  async inspect(path: string, fileName: string, sizeBytes: number): Promise<SecurityEvidence> {
    const format = getInputFormat(fileName);
    if (!format || sizeBytes <= 0 || sizeBytes > MAX_SCAN_BYTES) {
      throw new BadRequestException('Input không hợp lệ hoặc vượt giới hạn an toàn.');
    }
    if (!(await hasValidInputSignature(path, fileName))) {
      throw new BadRequestException('Chữ ký nội dung không khớp phần mở rộng.');
    }

    // RAR has no trusted parser in the current dependency set. Rejecting it is
    // fail-closed; it must never reach B2 merely because the AV scan is clean.
    if (format === 'rar') {
      throw new BadRequestException('RAR chưa có bộ kiểm tra cấu trúc an toàn.');
    }
    if (format === 'zip') await this.assertSafeZip(path);

    const contentSha256 = await this.sha256(path);
    const scan = await this.runClamAv(path);
    if (scan.verdict !== 'CLEAN') {
      throw new BadRequestException('Input bị từ chối bởi kiểm tra bảo mật.');
    }
    return {
      verdict: 'CLEAN',
      reason: 'CLEAN',
      scannerEngine: scan.engine,
      scannerVersion: scan.version,
      signatureDatabaseVersion: scan.signatureDatabaseVersion,
      contentSha256,
      scannedAt: new Date().toISOString(),
    };
  }

  private async sha256(path: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest('hex');
  }

  private async assertSafeZip(path: string): Promise<void> {
    // Bounded structural preflight without extracting customer content. The
    // full archive must still pass ClamAV; unsafe names fail before promotion.
    const stat = await fs.stat(path);
    if (stat.size < 22) throw new BadRequestException('ZIP không hợp lệ.');
    const tailSize = Math.min(stat.size, 66_000);
    const handle = await fs.open(path, 'r');
    try {
      const tail = Buffer.alloc(tailSize);
      await handle.read(tail, 0, tailSize, stat.size - tailSize);
      const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
      if (eocd < 0) throw new BadRequestException('ZIP thiếu central directory.');
      const entries = tail.readUInt16LE(eocd + 10);
      const centralSize = tail.readUInt32LE(eocd + 12);
      if (entries > 10_000 || centralSize > 256 * 1024 * 1024) {
        throw new BadRequestException('ZIP vượt giới hạn cấu trúc.');
      }
      const centralOffset = tail.readUInt32LE(eocd + 16);
      if (centralOffset + centralSize > stat.size || centralSize > 0) {
        const central = Buffer.alloc(centralSize);
        await handle.read(central, 0, centralSize, centralOffset);
        let offset = 0;
        for (let index = 0; index < entries; index += 1) {
          if (central.readUInt32LE(offset) !== 0x02014b50) {
            throw new BadRequestException('ZIP central directory không hợp lệ.');
          }
          const nameLength = central.readUInt16LE(offset + 28);
          const extraLength = central.readUInt16LE(offset + 30);
          const commentLength = central.readUInt16LE(offset + 32);
          const name = central.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
          const normalized = name.replace(/\\/g, '/');
          if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || normalized.split('/').includes('..')) {
            throw new BadRequestException('ZIP chứa đường dẫn nguy hiểm.');
          }
          const unixMode = central.readUInt32LE(offset + 38) >>> 16;
          if ((unixMode & 0xf000) === 0xa000) {
            throw new BadRequestException('ZIP chứa symbolic link không được phép.');
          }
          offset += 46 + nameLength + extraLength + commentLength;
          if (offset > central.length) throw new BadRequestException('ZIP central directory bị cắt.');
        }
      }
    } finally {
      await handle.close();
    }
  }

  private runClamAv(path: string): Promise<{
    verdict: 'CLEAN' | 'INFECTED' | 'ERROR';
    engine: string;
    version: string | null;
    signatureDatabaseVersion: string | null;
  }> {
    return new Promise((resolve) => {
      const candidates = ['clamdscan', 'clamscan'];
      let index = 0;
      const tryNext = () => {
        const engine = candidates[index++];
        if (!engine) {
          resolve({ verdict: 'ERROR', engine: 'clamav', version: null, signatureDatabaseVersion: null });
          return;
        }
        const child = spawn(engine, ['--no-summary', path], { windowsHide: true });
        let output = '';
        let settled = false;
        const finish = (result: { verdict: 'CLEAN' | 'INFECTED' | 'ERROR'; version: string | null; signatureDatabaseVersion: string | null }) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ engine, ...result });
        };
        const timer = setTimeout(() => {
          child.kill();
          finish({ verdict: 'ERROR', version: null, signatureDatabaseVersion: null });
        }, SCAN_TIMEOUT_MS);
        child.stdout.on('data', (chunk) => { output += chunk.toString(); });
        child.stderr.on('data', (chunk) => { output += chunk.toString(); });
        child.once('error', () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          tryNext();
        });
        child.once('close', (code) => {
          if (code === 0) finish({ verdict: 'CLEAN', version: this.versionFrom(output), signatureDatabaseVersion: this.dbVersionFrom(output) });
          else if (code === 1) finish({ verdict: 'INFECTED', version: this.versionFrom(output), signatureDatabaseVersion: this.dbVersionFrom(output) });
          else finish({ verdict: 'ERROR', version: this.versionFrom(output), signatureDatabaseVersion: this.dbVersionFrom(output) });
        });
      };
      tryNext();
    });
  }

  private versionFrom(output: string): string | null {
    return /ClamAV\s+([0-9.]+)/i.exec(output)?.[1] ?? null;
  }

  private dbVersionFrom(output: string): string | null {
    return /(?:version|database)[=: ]+([0-9]{6,})/i.exec(output)?.[1] ?? null;
  }
}
