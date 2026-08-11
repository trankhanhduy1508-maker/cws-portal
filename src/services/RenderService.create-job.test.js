import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./AuthService', () => ({
  getAccessToken: vi.fn(),
}));
vi.mock('./apiConfig', () => ({
  IS_BACKEND_CONFIGURED: true,
  API_CONFIG: {
    BASE_URL: 'https://backend.example',
    ENDPOINTS: { CREATE_JOB: '/jobs' },
  },
}));

import { getAccessToken } from './AuthService';
import { createJob } from './RenderService';

describe('RenderService.createJob customer contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getAccessToken.mockResolvedValue('customer-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'job-1' }),
    });
  });

  it('creates exactly one job payload from canonical input fields', async () => {
    await expect(createJob({
      input: {
        fileRef: 'uploads/scene.blend',
        driveLink: null,
        fileName: 'scene.blend',
        fileSizeBytes: 7,
      },
      idempotencyKey: 'customer-retry-key-0001',
    })).resolves.toEqual({ jobId: 'job-1' });

    const [, request] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({
      fileRef: 'uploads/scene.blend',
      driveLink: null,
      fileName: 'scene.blend',
      fileSizeBytes: 7,
    });
  });
});
