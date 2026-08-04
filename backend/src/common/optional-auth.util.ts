import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Xác thực 1 access token THÔ (không cần Request) qua Supabase Auth —
 * dùng chung cho cả `getOptionalCustomerId` (Bearer header, route HTTP
 * thường) lẫn `JobsRealtimeServer` (token qua query string, vì WebSocket
 * handshake của trình duyệt không set được custom header). Trả null
 * nếu token rỗng/sai/hết hạn, KHÔNG throw — gọi nơi nào cần bắt buộc
 * đăng nhập thì tự kiểm tra kết quả null đó.
 */
export async function resolveCustomerId(
  token: string | null,
  supabaseService: SupabaseService,
): Promise<string | null> {
  if (!token) return null;
  const { data, error } = await supabaseService.getClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Đọc customerId từ Authorization Bearer token nếu có.
 * Query-string bearer tokens bị từ chối để tránh access token lọt vào
 * browser history, referrer hoặc HTTP access log. WebSocket dùng
 * realtime ticket riêng, không gọi helper này.
 */

export async function getOptionalCustomerId(
  req: Request,
  supabaseService: SupabaseService,
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return resolveCustomerId(
      authHeader.slice('Bearer '.length),
      supabaseService,
    );
  }

  return null;
}
