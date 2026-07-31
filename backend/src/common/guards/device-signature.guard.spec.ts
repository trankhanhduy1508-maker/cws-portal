import { ExecutionContext, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { DeviceSignatureGuard } from './device-signature.guard';

const DEVICE_ID = 'device-abc';
const SECRET = 'test-secret';

function sign(timestamp: string, dto: { transaction_id: string; amount: number; transfer_content: string }) {
  const canonical = [DEVICE_ID, timestamp, dto.transaction_id, dto.amount, dto.transfer_content].join('.');
  return createHmac('sha256', SECRET).update(canonical).digest('hex');
}

function makeContext(headers: Record<string, string>, body: Record<string, unknown>): {
  context: ExecutionContext;
  request: Record<string, unknown>;
} {
  const request: Record<string, unknown> = { headers, body };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeSupabase(device: { device_id: string; secret: string; is_active: boolean } | null, notificationCount = 0) {
  return {
    getClient: () => ({
      from: (table: string) => {
        if (table === 'payment_devices') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: device, error: null }) }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              gte: jest.fn().mockResolvedValue({ count: notificationCount, error: null }),
            }),
          }),
        };
      },
    }),
  } as unknown as SupabaseService;
}

const baseDto = { transaction_id: 'FT001', amount: 45000, transfer_content: 'CWS CWS-AAAAAAAA AB12CD34' };

describe('DeviceSignatureGuard', () => {
  it('từ chối khi thiếu header bắt buộc', async () => {
    const guard = new DeviceSignatureGuard(makeSupabase(null));
    const { context } = makeContext({}, baseDto);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('CHỐNG REPLAY: từ chối khi x-timestamp lệch quá 5 phút', async () => {
    const guard = new DeviceSignatureGuard(makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: true }));
    const oldTimestamp = String(Date.now() - 10 * 60 * 1000);
    const { context } = makeContext(
      {
        'x-device-id': DEVICE_ID,
        'x-timestamp': oldTimestamp,
        'x-signature': sign(oldTimestamp, baseDto),
      },
      baseDto,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('từ chối khi thiết bị chưa đăng ký', async () => {
    const guard = new DeviceSignatureGuard(makeSupabase(null));
    const timestamp = String(Date.now());
    const { context } = makeContext(
      { 'x-device-id': DEVICE_ID, 'x-timestamp': timestamp, 'x-signature': sign(timestamp, baseDto) },
      baseDto,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('từ chối khi thiết bị bị vô hiệu hoá (is_active=false)', async () => {
    const guard = new DeviceSignatureGuard(
      makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: false }),
    );
    const timestamp = String(Date.now());
    const { context } = makeContext(
      { 'x-device-id': DEVICE_ID, 'x-timestamp': timestamp, 'x-signature': sign(timestamp, baseDto) },
      baseDto,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('từ chối khi chữ ký sai (device dùng secret sai/payload bị sửa)', async () => {
    const guard = new DeviceSignatureGuard(
      makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: true }),
    );
    const timestamp = String(Date.now());
    const { context } = makeContext(
      { 'x-device-id': DEVICE_ID, 'x-timestamp': timestamp, 'x-signature': 'sai-chu-ky' },
      baseDto,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('TỪ CHỐI khi payload bị sửa số tiền sau khi ký (chữ ký không còn khớp)', async () => {
    const guard = new DeviceSignatureGuard(
      makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: true }),
    );
    const timestamp = String(Date.now());
    const signature = sign(timestamp, baseDto); // ký với amount=45000
    const { context } = makeContext(
      { 'x-device-id': DEVICE_ID, 'x-timestamp': timestamp, 'x-signature': signature },
      { ...baseDto, amount: 999 }, // body bị sửa thành 999 sau khi ký
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('RATE LIMIT: từ chối khi thiết bị vượt quá 20 request/phút', async () => {
    const guard = new DeviceSignatureGuard(
      makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: true }, 20),
    );
    const timestamp = String(Date.now());
    const { context } = makeContext(
      { 'x-device-id': DEVICE_ID, 'x-timestamp': timestamp, 'x-signature': sign(timestamp, baseDto) },
      baseDto,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('cho qua khi mọi điều kiện hợp lệ và gắn deviceId vào request', async () => {
    const guard = new DeviceSignatureGuard(
      makeSupabase({ device_id: DEVICE_ID, secret: SECRET, is_active: true }, 0),
    );
    const timestamp = String(Date.now());
    const { context, request } = makeContext(
      { 'x-device-id': DEVICE_ID, 'x-timestamp': timestamp, 'x-signature': sign(timestamp, baseDto) },
      baseDto,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.paymentDevice).toEqual({ deviceId: DEVICE_ID });
  });
});
