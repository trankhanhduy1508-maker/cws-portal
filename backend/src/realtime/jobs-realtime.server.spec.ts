import { JobsRealtimeServer } from './jobs-realtime.server';
import { RenderOrder } from '../jobs/domain/render-order';
import { JobStatus } from '../jobs/domain/job-status.enum';
import { RenderProfileId } from '../jobs/domain/render-profile';

describe('JobsRealtimeServer — one-time owner ticket boundary', () => {
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

  function makeServer(order: RenderOrder | null, ticketCustomerId: string | null) {
    const ordersRepository = { findById: jest.fn().mockResolvedValue(order) };
    const supabaseService = {
      getClient: () => ({
        channel: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: jest.fn() }) }),
        }),
      }),
    };
    const ticketService = {
      consume: jest.fn().mockResolvedValue(ticketCustomerId),
    };
    const server = new JobsRealtimeServer(
      supabaseService as never,
      ordersRepository as never,
      ticketService as never,
    );
    return { server, ticketService };
  }

  async function connect(server: JobsRealtimeServer, client: unknown, id: string, ticket: string | null) {
    await (server as unknown as {
      handleConnection: (c: unknown, id: string, ticket: string | null) => Promise<void>;
    }).handleConnection(client, id, ticket);
  }

  it('denies a ticket belonging to another customer', async () => {
    const { server } = makeServer(baseOrder(), 'customer-attacker');
    const client = makeClient();
    await connect(server, client, 'job-1', 'opaque-ticket');
    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('denies missing or expired tickets', async () => {
    const { server } = makeServer(baseOrder(), null);
    const client = makeClient();
    await connect(server, client, 'job-1', null);
    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('sends a snapshot for the matching owner ticket', async () => {
    const { server } = makeServer(baseOrder(), 'customer-owner');
    const client = makeClient();
    await connect(server, client, 'job-1', 'opaque-ticket');
    expect(client.close).not.toHaveBeenCalled();
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('denies a job without an owner instead of exposing its snapshot', async () => {
    const { server } = makeServer(baseOrder({ customerId: null }), null);
    const client = makeClient();
    await connect(server, client, 'job-1', null);
    expect(client.close).toHaveBeenCalledWith(4003, expect.any(String));
    expect(client.send).not.toHaveBeenCalled();
  });

  it('closes (4004) before consuming a ticket when the job does not exist', async () => {
    const { server, ticketService } = makeServer(null, null);
    const client = makeClient();
    await connect(server, client, 'missing-job', 'opaque-ticket');
    expect(client.close).toHaveBeenCalledWith(4004, expect.any(String));
    expect(ticketService.consume).not.toHaveBeenCalled();
  });
});
