import { hasBlenderHeader } from './blend-validation';

describe('hasBlenderHeader', () => {
  it('allows a native Blender signature without executing the file', () => {
    expect(hasBlenderHeader(Buffer.from('BLENDER-v401\\0'))).toBe(true);
  });

  it('rejects an empty, truncated, or renamed non-Blender file', () => {
    expect(hasBlenderHeader(Buffer.alloc(0))).toBe(false);
    expect(hasBlenderHeader(Buffer.from('BLENDE'))).toBe(false);
    expect(hasBlenderHeader(Buffer.from('MZ\\0\\0fake-exe'))).toBe(false);
  });
});
