import { JobsRealtimeServer } from './jobs-realtime.server';
import { RenderOrder } from '../jobs/domain/render-order';
import { JobStatus } from '../jobs/domain/job-status.enum';

describe('JobsRealtimeServer — kiểm tra quyền sở hữu qua WebSocket (IDOR fix)', () => {
  function baseOrder(overrides: Partial<RenderOrder> = {}): RenderOrder {
    return {
      id: 'job-1',
      projectName: 'scene.blend',
      software: null,
      softwareVersion: null,
      notes: null,
      storageCode: 'CWS-AAAAAAAA',
      customerId: 'customer-owner',
      status: JobStatus.RENDERING,
      stageProgress: 0.5,
      paymentId: null,
      paymentStatus: 'unpaid',
      estimate: { etaSeconds: 0, costVnd: 0, queueSeconds: 0 },
      finalPriceVnd: null,
      workerRuntimeSeconds: null,
      driveLink: 'https://drive.google.com/file/d/abc',
      uploadedFileB2Key: null,
      fileSizeBytes: 1000,
      internalJobId: 'internal-1',
      createdAt: Date.now(),
      downloadUrl: null,
      durationSec: null,
      resultSizeBytes: null,
      isPlaceholder: false,
      ...overrides,
    };
  }

  function makeClient() {
    return {
      readyState: 1,
      OPEN: 1,
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };
  }

  function makeServer(
    order: RenderOrder | null,
    getUserResult: { data: { user: { id: string } | null }; error: unknown },
  ) {
    const ordersRepository = { findById: jest.fn().mockResolvedValue(order) };
    const supabaseService = {
      getClient: () => ({
        auth: { getUser: jest.fn().mockResolvedValue(getUserResult) },
        channel: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: jest.fn() }) }),
        }),
      }),
    };
    const server = new JobsRealtimeServer(
      supabaseService as never,
      ordersRepository as never,
    );
    return { server, ordersRepository };
  }

  it('đóng kết nối (4003), không gửi dữ liệu, nếu token thuộc khách khác chủ job', async () => {
    const { server } = makeServer(baseOrder(), {
      data: { user: { id: 'customer-attacker' } },
      error: null,
    });
    const client = makeClient();

    await (server as unknown as { handleConnection: (c: unknown, id: string, t: string | null) => Promise<void> })
      .handleConnection(client, 'job-1', 'token-of-attacker');

    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('đóng kết nối nếu không có token mà job đã có chủ', async () => {
    const { server } = makeServer(baseOrder(), {
      data: { user: null },
      error: { message: 'no token' },
    });
    const client = makeClient();

    await (server as unknown as { handleConnection: (c: unknown, id: string, t: string | null) => Promise<void> })
      .handleConnection(client, 'job-1', null);

    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('gửi snapshot nếu token khớp đúng chủ job', async () => {
    const { server } = makeServer(baseOrder(), {
      data: { user: { id: 'customer-owner' } },
      error: null,
    });
    const client = makeClient();

    await (server as unknown as { handleConnection: (c: unknown, id: string, t: string | null) => Promise<void> })
      .handleConnection(client, 'job-1', 'token-of-owner');

    expect(client.close).not.toHaveBeenCalled();
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('đóng kết nối (4004) nếu job không tồn tại', async () => {
    const { server } = makeServer(null, {
      data: { user: null },
      error: { message: 'no token' },
    });
    const client = makeClient();

    await (server as unknown as { handleConnection: (c: unknown, id: string, t: string | null) => Promise<void> })
      .handleConnection(client, 'job-khong-ton-tai', null);

    expect(client.close).toHaveBeenCalledWith(4004, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('gửi snapshot nếu job chưa có chủ', async () => {
    const { server } = makeServer(baseOrder({ customerId: null }), {
      data: { user: null },
      error: { message: 'no token' },
    });
    const client = makeClient();

    await (server as unknown as { handleConnection: (c: unknown, id: string, t: string | null) => Promise<void> })
      .handleConnection(client, 'job-1', null);

    expect(client.close).not.toHaveBeenCalled();
    expect(client.send).toHaveBeenCalledTimes(1);
  });
});
