import { readFileSync } from 'fs';
import { resolve } from 'path';

function file(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('credential hygiene contracts', () => {
  it('does not distribute literal Supabase or B2 credentials', () => {
    const worker = file('../../../cws_worker_full.py');
    const launcher = file('../../../cws_worker.bat');
    const video = file('../../../cws_auto_ghep_video.bat');

    for (const content of [worker, launcher, video]) {
      expect(content).not.toMatch(/SUPABASE_KEY\s*=\s*["'][^"']+["']/);
      expect(content).not.toMatch(/set\s+"SUPABASE_KEY=(?!%)[^\r\n]+"/i);
      expect(content).not.toMatch(/B2_APP_KEY\s*=\s*["'][^"']+["']/);
      expect(content).not.toMatch(/set\s+"B2_APP_KEY=(?!%)[^\r\n]+"/i);
      expect(content).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/);
    }

    expect(worker).toContain('os.environ.get("CWS_SUPABASE_KEY", "")');
    expect(launcher).toContain('%CWS_SUPABASE_KEY%');
    expect(launcher).toContain('%CWS_B2_KEY_ID%');
    expect(launcher).toContain('%CWS_B2_APP_KEY%');
  });
});
