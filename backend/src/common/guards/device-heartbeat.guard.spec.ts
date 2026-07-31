import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { DeviceHeartbeatGuard } from './device-heartbeat.guard';

const DEVICE_ID = 'device-abc';
const SECRET = 'test-secret';

function sign(timestamp: string) {
  return createHmac('sha256', SECRET).update(`${DEVICE_ID}.${timestamp}`).digest('hex');
}

function makeContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: Record<string, unknown>;
} {
  const request: Record<string, unknown> = { headers, body: {} };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeSupabase(device: { device_id: string; secret: string; is_active: boolean } | null) {
  return {
    getClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: device, error: null }) }),
        }),
      }),
    }),
  } as unknown as SupabaseService;
}

describe('DeviceHeartbeatGuard', () => {
  it('cho qua khi chữ ký hợp lệ (canonical KHÔNG gồm dữ liệu tài chính, chỉ deviceId+timestamp)', async () => {
    const guard = new DeviceHeartbeatGuard(
      makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: true }),
    );
    const timestamp = String(Date.now());
    const { context, request } = makeContext({
      'x-device-id': DEVICE_ID,
      'x-timestamp': timestamp,
      'x-signature': sign(timestamp),
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.paymentDevice).toEqual({ deviceId: DEVICE_ID });
  });

  it('từ chối khi chữ ký sai', async () => {
    const guard = new DeviceHeartbeatGuard(
      makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: true }),
    );
    const timestamp = String(Date.now());
    const { context } = makeContext({
      'x-device-id': DEVICE_ID,
      'x-timestamp': timestamp,
      'x-signature': 'sai-chu-ky',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('từ chối khi thiết bị chưa đăng ký', async () => {
    const guard = new DeviceHeartbeatGuard(makeSupabase(null));
    const timestamp = String(Date.now());
    const { context } = makeContext({
      'x-device-id': DEVICE_ID,
      'x-timestamp': timestamp,
      'x-signature': sign(timestamp),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
