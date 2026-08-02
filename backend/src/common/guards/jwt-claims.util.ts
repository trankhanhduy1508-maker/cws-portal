/**
 * Đọc claim `aal` (Authenticator Assurance Level) từ access token Supabase
 * Auth — CHỈ được gọi SAU KHI `client.auth.getUser(token)` đã xác thực
 * thành công (đảm bảo chữ ký/tính hợp lệ của token), nên tự decode phần
 * payload ở đây (không verify lại chữ ký) là an toàn — đúng pattern
 * chính thức của Supabase ("Checking AAL Server-Side": parse JWT, đọc
 * claim `aal`, so sánh giá trị — https://supabase.com/docs/guides/auth/auth-mfa).
 *
 * `aal2` = đã hoàn tất thử thách MFA (TOTP) trong phiên đăng nhập này.
 * `aal1` = mới chỉ đăng nhập bằng 1 yếu tố (mật khẩu/OAuth), CHƯA MFA.
 * JWT không có claim `aal` (token cũ/không phải Supabase) → coi là aal1
 * (thấp nhất), không suy đoán cao hơn thực tế.
 */
export function getAuthenticatorAssuranceLevel(accessToken: string): 'aal1' | 'aal2' | null {
  const parts = accessToken.split('.');
  if (parts.length !== 3) return null;

  try {
    const payloadJson = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const payload = JSON.parse(payloadJson) as { aal?: string };
    if (payload.aal === 'aal2') return 'aal2';
    return 'aal1';
  } catch {
    return null;
  }
}
