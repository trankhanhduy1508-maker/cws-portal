import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Đọc customerId từ Bearer token NẾU có, KHÔNG bắt buộc phải đăng nhập
 * (khác jwt-auth.guard.ts — guard đó throw 401 nếu thiếu/sai token, hàm
 * này chỉ trả null). Dùng cho các route công khai muốn "biết thêm" khách
 * là ai nếu đã đăng nhập, mà không chặn khách chưa đăng nhập.
 *
 * Token ở đây là session token do SUPABASE AUTH cấp (Facebook OAuth qua
 * supabase.auth.signInWithOAuth() ở Portal) — KHÔNG phải JWT tự ký nữa.
 * Xác thực bằng cách hỏi thẳng Supabase Auth (auth.getUser), không tự
 * verify chữ ký — đơn giản, đúng, không cần biết JWT secret của Supabase.
 */
export async function getOptionalCustomerId(
  req: Request,
  supabaseService: SupabaseService,
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const { data, error } = await supabaseService.getClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
