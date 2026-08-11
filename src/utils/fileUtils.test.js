import { describe, expect, it } from 'vitest';
import { validateFile, validateMaterializedInput } from './fileUtils';

describe('validateFile', () => {
  it('accepts .blend, .zip and .rar inputs', () => {
    expect(validateFile({ name: 'scene.blend', size: 10 }).valid).toBe(true);
    expect(validateFile({ name: 'project.ZIP', size: 10 }).valid).toBe(true);
    expect(validateFile({ name: 'project.RAR', size: 10 }).valid).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    const result = validateFile({ name: 'scene.exe', size: 10 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.blend, .zip, .rar');
  });
});

describe('validateDriveLink', () => {
  it('accepts only a Google Drive file link for the real resolver', async () => {
    const { validateDriveLink } = await import('./fileUtils');
    expect(validateDriveLink('https://drive.google.com/file/d/abc/view').valid).toBe(true);
    expect(validateDriveLink('https://1drv.ms/f/abc').valid).toBe(false);
  });
});

describe('validateMaterializedInput', () => {
  it('requires a Backend fileRef and complete supported metadata', () => {
    expect(validateMaterializedInput({ fileName: 'scene.blend', fileSizeBytes: 10 }).valid).toBe(false);
    expect(validateMaterializedInput({ fileRef: 'uploads/1', fileName: 'scene.blend', fileSizeBytes: 10 }).valid).toBe(true);
  });

  it('rejects unsupported or empty materialized responses', () => {
    expect(validateMaterializedInput({ fileRef: 'uploads/1', fileName: 'scene.exe', fileSizeBytes: 10 }).valid).toBe(false);
    expect(validateMaterializedInput({ fileRef: 'uploads/1', fileName: 'scene.blend', fileSizeBytes: 0 }).valid).toBe(false);
  });
});
