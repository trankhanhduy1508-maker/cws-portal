import { describe, expect, it } from 'vitest';
import { validateFile } from './fileUtils';

describe('validateFile', () => {
  it('accepts .blend and .zip inputs', () => {
    expect(validateFile({ name: 'scene.blend', size: 10 }).valid).toBe(true);
    expect(validateFile({ name: 'project.ZIP', size: 10 }).valid).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    const result = validateFile({ name: 'scene.exe', size: 10 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.blend, .zip');
  });
});
