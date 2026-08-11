import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const entry = readFileSync(new URL('../apps/admin/src/main.jsx', import.meta.url), 'utf8');

describe('separate Admin build boundary', () => {
  it('mounts AdminScreen directly', () => {
    expect(entry).toContain("AdminScreen");
    expect(entry).toContain('<AdminScreen />');
  });

  it('does not import the Customer application shell', () => {
    expect(entry).not.toMatch(/from\s+['\"].*App\.jsx['\"]/);
    expect(entry).not.toContain('CustomerPortalApp');
    expect(entry).not.toContain('LandingScreen');
    expect(entry).not.toContain('UploadScreen');
  });
});
