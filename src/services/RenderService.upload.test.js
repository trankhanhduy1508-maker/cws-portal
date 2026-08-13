import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./AuthService', () => ({
  getAccessToken: vi.fn(),
}));
vi.mock('./apiConfig', () => ({
  IS_BACKEND_CONFIGURED: true,
  API_CONFIG: {
    BASE_URL: 'https://backend.example',
    ENDPOINTS: { UPLOAD_FILE: '/files/upload', DRIVE_RESOLVE: '/drive/resolve' },
  },
}));

import { getAccessToken } from './AuthService';
import { submitGoogleDrive, toReadableErrorMessage, uploadFile } from './RenderService';

describe('RenderService.uploadFile authentication', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails before network upload when no customer session exists', async () => {
    getAccessToken.mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const file = new File(['BLENDER'], 'scene.blend', {
      type: 'application/octet-stream',
    });

    await expect(uploadFile(file)).rejects.toThrow(
      'Cần đăng nhập Google trước khi tải file',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends the Supabase bearer token with the upload', async () => {
    getAccessToken.mockResolvedValue('customer-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        fileRef: 'uploads/input.blend',
        fileName: 'scene.blend',
        fileSizeBytes: 7,
      }),
    });
    const file = new File(['BLENDER'], 'scene.blend', {
      type: 'application/octet-stream',
    });

    await uploadFile(file);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/files/upload'),
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer customer-access-token' },
      }),
    );
  });

  it('rejects a successful HTTP response without a materialized fileRef', async () => {
    getAccessToken.mockResolvedValue('customer-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ fileName: 'scene.blend', fileSizeBytes: 7 }),
    });
    const file = new File(['BLENDER'], 'scene.blend');

    await expect(uploadFile(file)).rejects.toThrow(/fileRef/i);
  });

  it('requires auth and a complete materialized response for Google Drive', async () => {
    getAccessToken.mockResolvedValue('customer-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        fileRef: 'uploads/drive-scene.blend',
        resolvedDriveLink: 'https://drive.google.com/file/d/id/view',
        fileName: 'scene.blend',
        fileSizeBytes: 7,
        jobId: 'job-drive-1',
      }),
    });

    await expect(submitGoogleDrive('https://drive.google.com/file/d/id/view')).resolves.toMatchObject({
      fileRef: 'uploads/drive-scene.blend',
      fileName: 'scene.blend',
      fileSizeBytes: 7,
      jobId: 'job-drive-1',
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/drive/resolve'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer customer-access-token',
        },
      }),
    );
  });

  it('normalizes structured backend Drive errors without object coercion', async () => {
    getAccessToken.mockResolvedValue('customer-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: { detail: 'File chưa vượt qua kiểm tra an toàn' } }),
    });

    await expect(submitGoogleDrive('https://drive.google.com/file/d/id/view'))
      .rejects.toThrow('File chưa vượt qua kiểm tra an toàn');
    expect(toReadableErrorMessage({ message: { detail: 'Readable error' } }, 'fallback'))
      .toBe('Readable error');
    expect(toReadableErrorMessage({ message: { code: 'UNKNOWN' } }, 'fallback'))
      .toBe('fallback');
    expect(toReadableErrorMessage({ message: {} }, 'fallback')).not.toContain('[object Object]');
    expect(toReadableErrorMessage({ message: 'x'.repeat(600) }, 'fallback')).toHaveLength(500);
  });

  it('normalizes structured direct-upload errors through the same customer-safe helper', async () => {
    getAccessToken.mockResolvedValue('customer-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: { detail: 'File không an toàn' } }),
    });

    await expect(uploadFile(new File(['scene'], 'scene.blend')))
      .rejects.toThrow('File không an toàn');
  });

  it('fails closed when Drive success omits the Backend-created jobId', async () => {
    getAccessToken.mockResolvedValue('customer-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        fileRef: 'uploads/drive-scene.blend',
        fileName: 'scene.blend',
        fileSizeBytes: 7,
      }),
    });

    await expect(submitGoogleDrive('https://drive.google.com/file/d/id/view'))
      .rejects.toThrow('Backend chưa trả về Job sau INPUT_SAFE');
  });
});
