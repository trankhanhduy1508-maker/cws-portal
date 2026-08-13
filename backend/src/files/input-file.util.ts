import { promises as fs } from 'node:fs';

export type SupportedInputFormat = 'blend' | 'zip' | 'rar';

export const ACCEPTED_INPUT_EXTENSIONS = ['.blend', '.zip', '.rar'] as const;
export const ZSTD_BLEND_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

export function getInputFormat(
  fileName: string | null | undefined,
): SupportedInputFormat | null {
  const name = String(fileName ?? '')
    .trim()
    .toLowerCase();
  if (name.endsWith('.blend')) return 'blend';
  if (name.endsWith('.zip')) return 'zip';
  if (name.endsWith('.rar')) return 'rar';
  return null;
}

async function readHeader(filePath: string): Promise<Buffer | null> {
  try {
    const handle = await fs.open(filePath, 'r');
    try {
      const header = Buffer.alloc(8);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      return header.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

export async function hasValidInputSignature(
  filePath: string,
  fileName: string | null | undefined,
): Promise<boolean> {
  const format = getInputFormat(fileName);
  if (!format) return false;

  const header = await readHeader(filePath);
  if (!header) return false;

  if (format === 'blend') {
    return (
      header.subarray(0, 7).toString('ascii') === 'BLENDER'
      || header.subarray(0, 4).equals(ZSTD_BLEND_MAGIC)
    );
  }

  if (format === 'zip') {
    return (
      header.length >= 4
      && header[0] === 0x50
      && header[1] === 0x4b
      && (
        (header[2] === 0x03 && header[3] === 0x04)
        || (header[2] === 0x05 && header[3] === 0x06)
        || (header[2] === 0x07 && header[3] === 0x08)
      )
    );
  }

  const rarMarker = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]);
  if (header.length < 7 || !header.subarray(0, 6).equals(rarMarker)) {
    return false;
  }
  if (header[6] === 0x00) return true;
  return header[6] === 0x01 && header.length >= 8 && header[7] === 0x00;
}
