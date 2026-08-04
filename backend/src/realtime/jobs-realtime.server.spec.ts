import { JobsRealtimeServer } from './jobs-realtime.server';
import { RenderOrder } from '../jobs/domain/render-order';
import { JobStatus } from '../jobs/domain/job-status.enum';
import { RenderProfileId } from '../jobs/domain/render-profile';

/**
 * Test cho lỗ hổng IDOR ở tầng WebSocket phát hiện qua self-review liên
 * tiếp (sau khi đã sửa cùng lỗ hổng ở tầng REST, xem jobs.controller.ts):
 * trước đây /ws/jobs/:id gửi TOÀN BỘ snapshot job cho bất kỳ ai kết nối
 * biết job id, không kiểm tra chủ sở hữu — bỏ qua hoàn toàn việc kiểm
 * tra đã làm ở REST. Đã sửa bằng cách đọc token qua query string, xác
 * thực qua resolveCustomerId(), đối chiếu với order.customerId.
 */
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
      profileId: RenderProfileId.STANDARD,
      status: JobStatus.RENDERING,
      stageProgress: 0.5,
      paymentId: null,
      paymentStatus: 'unpaid',
      estimate: { etaSeconds: 900, costVnd: 45000, queueSeconds: 0 },
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

  it('đóng kết nối (4003), KHÔNG gửi dữ liệu, nếu token thuộc về khách KHÁC chủ job', async () => {
    const { server } = makeServer(baseOrder(), {
      data: { user: { id: 'customer-attacker' } },
      error: null,
    });
    const client = makeClient();

    await (
      server as unknown as {
        handleConnection: (
          c: unknown,
          id: string,
          t: string | null,
        ) => Promise<void>;
      }
    ).handleConnection(client, 'job-1', 'token-of-attacker');

    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('đóng kết nối nếu KHÔNG có token (ẩn danh) mà job đã có chủ', async () => {
    const { server } = makeServer(baseOrder(), {
      data: { user: null },
      error: { message: 'no token' },
    });
    const client = makeClient();

    await (
      server as unknown as {
        handleConnection: (
          c: unknown,
          id: string,
          t: string | null,
        ) => Promise<void>;
      }
    ).handleConnection(client, 'job-1', null);

    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('gửi snapshot bình thường nếu token khớp đúng chủ job', async () => {
    const { server } = makeServer(baseOrder(), {
      data: { user: { id: 'customer-owner' } },
      error: null,
    });
    const client = makeClient();

    await (
      server as unknown as {
        handleConnection: (
          c: unknown,
          id: string,
          t: string | null,
        ) => Promise<void>;
      }
    ).handleConnection(client, 'job-1', 'token-of-owner');

    expect(client.close).not.toHaveBeenCalled();
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('đóng kết nối (4004), KHÔNG mở kênh Realtime, nếu job KHÔNG tồn tại', async () => {
    const { server } = makeServer(null, {
      data: { user: null },
      error: { message: 'no token' },
    });
    const client = makeClient();

    await (
      server as unknown as {
        handleConnection: (
          c: unknown,
          id: string,
          t: string | null,
        ) => Promise<void>;
      }
    ).handleConnection(client, 'job-khong-ton-tai', null);

    expect(client.close).toHaveBeenCalledWith(4004, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('từ chối job chưa có chủ để không còn anonymous realtime access', async () => {
    const { server } = makeServer(baseOrder({ customerId: null }), {
      data: { user: null },
      error: { message: 'no token' },
    });
    const client = makeClient();

    await (
      server as unknown as {
        handleConnection: (
          c: unknown,
          id: string,
          t: string | null,
        ) => Promise<void>;
      }
    ).handleConnection(client, 'job-1', null);

    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });
});
