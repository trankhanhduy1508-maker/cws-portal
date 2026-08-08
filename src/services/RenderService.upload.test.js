import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./AuthService', () => ({
  getAccessToken: vi.fn(),
}));
vi.mock('./apiConfig', () => ({
  IS_BACKEND_CONFIGURED: true,
  API_CONFIG: {
    BASE_URL: 'https://backend.example',
    ENDPOINTS: { UPLOAD_FILE: '/files/upload' },
  },
}));

import { getAccessToken } from './AuthService';
import { uploadFile } from './RenderService';

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
      json: async () => ({ fileRef: 'uploads/input.blend' }),
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
});
