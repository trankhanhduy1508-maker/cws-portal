import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ACCEPTED_INPUT_EXTENSIONS,
  getInputFormat,
  hasValidInputSignature,
} from './input-file.util';

describe('input file format contract', () => {
  it('accepts blend, zip and rar case-insensitively', () => {
    expect(ACCEPTED_INPUT_EXTENSIONS).toEqual(['.blend', '.zip', '.rar']);
    expect(getInputFormat('scene.blend')).toBe('blend');
    expect(getInputFormat('PROJECT.ZIP')).toBe('zip');
    expect(getInputFormat('PROJECT.RAR')).toBe('rar');
  });

  it('does not infer a format from an unsafe or missing name', () => {
    expect(getInputFormat('scene.blend.exe')).toBeNull();
    expect(getInputFormat('../scene')).toBeNull();
    expect(getInputFormat(null)).toBeNull();
  });
});

describe('hasValidInputSignature', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'cws-input-signature-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const validSignatures: Array<[string, Buffer]> = [
    ['scene.blend', Buffer.from('BLENDER-v305')],
    ['project.zip', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])],
    ['project-rar4.rar', Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00])],
    ['project-rar5.rar', Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])],
  ];

  it.each(validSignatures)('accepts a valid %s signature', async (fileName, bytes) => {
    const filePath = join(directory, fileName);
    await writeFile(filePath, bytes);
    await expect(hasValidInputSignature(filePath, fileName)).resolves.toBe(true);
  });

  const mismatchedSignatures: Array<[string, Buffer]> = [
    ['scene.blend', Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    ['project.zip', Buffer.from('not-a-zip')],
    ['project.rar', Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])],
    ['wrong-marker.rar', Buffer.from([0x52, 0x61, 0x72, 0x20, 0x1a, 0x07, 0x00])],
  ];

  it.each(mismatchedSignatures)(
    'rejects a signature/content mismatch for %s',
    async (fileName, bytes) => {
      const filePath = join(directory, fileName);
      await writeFile(filePath, bytes);
      await expect(hasValidInputSignature(filePath, fileName)).resolves.toBe(false);
    },
  );

  it('rejects a missing or unreadable file', async () => {
    await expect(
      hasValidInputSignature(join(directory, 'missing.blend'), 'missing.blend'),
    ).resolves.toBe(false);
  });
});
