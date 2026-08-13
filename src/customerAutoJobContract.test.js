import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(join(process.cwd(), 'src/App.jsx'), 'utf8');
const driveHook = readFileSync(join(process.cwd(), 'src/hooks/useDriveLink.js'), 'utf8');
const uploadHook = readFileSync(join(process.cwd(), 'src/hooks/useFileUploadResolver.js'), 'utf8');
const driveModal = readFileSync(join(process.cwd(), 'src/components/GoogleDriveModal.jsx'), 'utf8');
const driveCard = readFileSync(join(process.cwd(), 'src/components/DriveLinkCard.jsx'), 'utf8');

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

  it('submits a Drive link directly without a separate check/confirm step', () => {
    expect(driveModal).toContain('onSubmit(value)');
    expect(driveModal).toContain('Gửi link Drive');
    expect(driveModal).not.toContain('Xác nhận link');
    expect(driveModal).not.toContain('Đang kiểm tra');
    expect(driveModal).not.toContain('OneDrive/Dropbox/Direct Link');
    expect(driveCard).not.toContain('Đang kiểm tra file');
  });

  it('does not render structured errors as object coercion', () => {
    expect(driveHook).toContain('toReadableErrorMessage(err');
    expect(driveHook).not.toContain('String(err)');
    expect(uploadHook).toContain('toReadableErrorMessage(err');
    expect(driveModal).not.toContain('{linkError.message}');
  });

  it('does not contain a legacy frontend POST /jobs fallback', () => {
    expect(app).not.toContain('createJob(');
    expect(app).not.toContain('job.start(');
    expect(app).toContain('job.attach(nextInput.jobId)');
  });
});
