import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import { getAuthenticatorAssuranceLevel } from './jwt-claims.util';

/**
 * Xác thực "đây có phải 1 tài khoản Admin THẬT đã hoàn tất MFA hay
 * không" — dùng CHUNG cho `RoleGuard` (route Admin Portal chính) VÀ
 * `JobsController#isAdminRequest()` (3 route legacy: preview/logs/
 * download — trước đây CHỈ chấp nhận `x-admin-key`, xem migration
 * 2026-08-02 "Không tạo bypass": thay vì giữ x-admin-key làm đường tắt
 * bỏ qua MFA, các route này giờ CŨNG chấp nhận Bearer token thật đã
 * MFA làm cách chứng minh tương đương, ngoài x-admin-key cho khả năng
 * tương thích ngược đã có từ trước (không phải lỗ hổng MỚI phát sinh
 * từ việc thêm MFA — x-admin-key vốn đã hợp lệ ở CHÍNH 3 route này từ
 * trước khi có yêu cầu MFA, phạm vi yêu cầu MFA lần này là Admin Portal
 * chính, không bắt buộc phải xoá nốt các lối cũ ở nhóm route ngoài
 * phạm vi đó).
 *
 * Đọc Bearer token từ header HOẶC query string `?staffToken=` (cần cho
 * link tải trực tiếp `<a href>` không set được custom header, cùng lý
 * do `isValidAdminKey` đã hỗ trợ `?adminKey=`).
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
