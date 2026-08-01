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
 * Đọc customerId từ Bearer token NẾU có, KHÔNG bắt buộc phải đăng nhập
 * (khác jwt-auth.guard.ts — guard đó throw 401 nếu thiếu/sai token, hàm
 * này chỉ trả null). Dùng cho các route công khai muốn "biết thêm" khách
 * là ai nếu đã đăng nhập, mà không chặn khách chưa đăng nhập.
 *
 * Token ở đây là session token do SUPABASE AUTH cấp (Google OAuth qua
 * supabase.auth.signInWithOAuth() ở Portal) — KHÔNG phải JWT tự ký nữa.
 * Xác thực bằng cách hỏi thẳng Supabase Auth (auth.getUser), không tự
 * verify chữ ký — đơn giản, đúng, không cần biết JWT secret của Supabase.
 *
 * Fallback `?token=` query string khi KHÔNG có Bearer header — bắt
 * buộc phải có cho `GET /jobs/:id/download` (Portal dùng thẳng
 * `<a href>`/`window.open()` để tải, trình duyệt KHÔNG set được custom
 * header cho điều hướng thường, chỉ `fetch()` mới set được). Không có
 * fallback này thì `JobsService.assertOwnership()` sẽ luôn coi khách
 * đã đăng nhập là "ẩn danh" trên route download — tự chặn nhầm chính
 * chủ job của họ ngay khi Google Provider bật thật.
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

  const queryToken = req.query.token;
  return resolveCustomerId(
    typeof queryToken === 'string' ? queryToken : null,
    supabaseService,
  );
}
