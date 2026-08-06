import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import { getAuthenticatorAssuranceLevel } from './jwt-claims.util';

/**
 * Xác thực "đây có phải 1 tài khoản Admin THẬT đã hoàn tất MFA hay
 * không" — dùng CHUNG cho `RoleGuard` (route Admin Portal chính) VÀ
 * `JobsController#isAdminRequest()` — các route job đều dùng Bearer token
 * thật đã hoàn tất MFA; shared `x-admin-key` legacy không còn là danh tính
 * Admin.
 *
 * Chỉ đọc Bearer token từ header. Query token bị loại bỏ để tránh làm lộ
 * session trong URL, lịch sử trình duyệt và referrer.
 */
export async function isAuthenticatedMfaAdmin(
  req: Request,
  supabaseService: SupabaseService,
): Promise<boolean> {
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : null;
  const token = headerToken;
  if (!token) return false;

  if (getAuthenticatorAssuranceLevel(token) !== 'aal2') return false;

  const client = supabaseService.getClient();
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return false;

  const { data: roleRow } = await client
    .from('staff_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  return roleRow?.role === 'admin';
}
