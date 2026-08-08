import { BadRequestException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { WorkerStorageCapabilityService } from './worker-storage-capability.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://s3.us-west-004.backblazeb2.com/signed'),
}));

const spec = {
  job_id: 'job-1',
  task_id: '42',
  attempt_id: 'attempt-7',
  lease_generation: 3,
  project_uri: 'b2://MTEB90/uploads/input.blend',
  frame_start: 1,
  frame_end: 10,
  output_prefix: 'renders/job-1',
  output_format: 'png',
};

function makeService(specResult: unknown = [spec]) {
  const config = {
    get: () => ({
      endpoint: 's3.us-west-004.backblazeb2.com',
      bucketName: 'MTEB90',
      keyId: 'server-key-id',
      applicationKey: 'server-application-key',
    }),
  };
  const rpc = { call: jest.fn().mockResolvedValue(specResult) };
  const service = new WorkerStorageCapabilityService(config as any, rpc as any);
  return { service, rpc };
}

describe('WorkerStorageCapabilityService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('issues an object-specific short-lived input GET after fenced spec lookup', async () => {
    const { service, rpc } = makeService();
    const result = await service.issue('worker-a', {
      action: 'input_download',
      task_id: 42,
      generation: 3,
    });

    expect(rpc.call).toHaveBeenCalledWith('get_claimed_task_spec', 'worker-a', {
      p_task_id: 42,
      p_generation: 3,
    });
    expect(result).toMatchObject({
      method: 'GET',
      object_key: 'uploads/input.blend',
      expires_in_seconds: 120,
    });
    expect(String(result)).not.toContain('server-application-key');
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('supports the canonical upload-key URI without exposing another prefix', async () => {
    const uploadSpec = {
      ...spec,
      project_uri: 'b2://uploads/abc123-scene.blend',
    };
    const { service } = makeService([uploadSpec]);
    await expect(
      service.issue('worker-a', {
        action: 'input_download',
        task_id: 42,
        generation: 3,
      }),
    ).resolves.toMatchObject({ object_key: 'uploads/abc123-scene.blend' });

    const { service: rejected } = makeService([
      { ...uploadSpec, project_uri: 'b2://final/other-customer.blend' },
    ]);
    await expect(
      rejected.issue('worker-a', {
        action: 'input_download',
        task_id: 42,
        generation: 3,
      }),
    ).rejects.toThrow('claimed task input is not an allowed B2 object');
  });

  it('signs only the exact claimed frame with integrity metadata', async () => {
    const { service } = makeService();
    const result = await service.issue('worker-a', {
      action: 'frame_upload',
      task_id: 42,
      generation: 3,
      frame: 7,
      bytes: 1234,
      sha256: 'a'.repeat(64),
    });

    expect(result).toMatchObject({
      method: 'PUT',
      object_key: 'renders/job-1/42/frame_0007.png',
      expires_in_seconds: 120,
      headers: {
        'content-length': '1234',
        'content-type': 'image/png',
        'x-amz-meta-job_id': 'job-1',
        'x-amz-meta-attempt_id': 'attempt-7',
        'x-amz-meta-generation': '3',
        'x-amz-meta-sha256': 'a'.repeat(64),
      },
    });
  });

  it('rejects stale/unclaimed requests and frames outside the assignment', async () => {
    await expect(
      makeService([]).service.issue('worker-a', {
        action: 'input_download',
        task_id: 42,
        generation: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      makeService().service.issue('worker-a', {
        action: 'frame_upload',
        task_id: 42,
        generation: 3,
        frame: 11,
        bytes: 1,
        sha256: 'b'.repeat(64),
      }),
    ).rejects.toThrow('frame is outside the claimed task range');
  });

  it('returns a resumable GET only for metadata owned by the current attempt', async () => {
    const { service } = makeService();
    jest.spyOn((service as any).s3, 'send').mockResolvedValue({
      Metadata: {
        job_id: 'job-1',
        task_id: '42',
        attempt_id: 'attempt-7',
        generation: '3',
        frame: '7',
        bytes: '1234',
        sha256: 'c'.repeat(64),
      },
    });
    const result = await service.issue('worker-a', {
      action: 'frame_download',
      task_id: 42,
      generation: 3,
      frame: 7,
    });
    expect(result).toMatchObject({
      exists: true,
      method: 'GET',
      bytes: 1234,
      sha256: 'c'.repeat(64),
    });
  });
});
