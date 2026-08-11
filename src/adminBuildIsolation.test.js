import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const entry = readFileSync(join(process.cwd(), 'apps/admin/src/main.jsx'), 'utf8');

describe('separate Admin build boundary', () => {
  it('mounts AdminScreen directly', () => {
    expect(entry).toContain('AdminScreen');
    expect(entry).toContain('<AdminScreen />');
  });

  it('does not import the Customer application shell', () => {
    expect(entry).not.toMatch(/from\s+['\"].*App\.jsx['\"]/);
    expect(entry).not.toContain('CustomerPortalApp');
    expect(entry).not.toContain('LandingScreen');
    expect(entry).not.toContain('UploadScreen');
  });
});
