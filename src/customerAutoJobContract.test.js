import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(join(process.cwd(), 'src/App.jsx'), 'utf8');
const driveHook = readFileSync(join(process.cwd(), 'src/hooks/useDriveLink.js'), 'utf8');
const uploadHook = readFileSync(join(process.cwd(), 'src/hooks/useFileUploadResolver.js'), 'utf8');

describe('Spec 008 automatic customer Job contract', () => {
  it('does not start a second Job from the Customer app after submission', () => {
    expect(app).not.toContain('job.start(');
    expect(app).toContain('job.attach(nextInput.jobId)');
  });

  it('requires Drive submission to return the Backend-created Job', () => {
    expect(driveHook).toContain("typeof result?.jobId !== 'string'");
    expect(driveHook).toContain('Backend chưa tự tạo Job sau INPUT_SAFE');
  });

  it('requires direct upload to return the Backend-created Job', () => {
    expect(uploadHook).toContain("typeof result?.jobId !== 'string'");
    expect(uploadHook).toContain('Backend chưa tự tạo Job sau INPUT_SAFE');
  });
});
