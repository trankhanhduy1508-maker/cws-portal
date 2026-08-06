import { useState } from 'react';
import StaffMfaLogin from '../components/StaffMfaLogin';
import { getStaffMe } from '../services/staffApi';

/** Đăng nhập Admin/Host THẬT (Phần 6) — tách biệt hoàn toàn khỏi
 * LoginScreen.jsx (Google, dành cho khách hàng). Tài khoản tạo thủ
 * công qua Supabase (xem backend/migrations/013_staff_roles_rbac.sql),
 * không có màn hình tự đăng ký. Sau khi đăng nhập, gọi GET /staff/me để
 * biết role thật rồi điều hướng #admin/#host — KHÔNG tự đoán ở đây. */
export default function StaffLoginScreen() {
  const [error, setError] = useState(null);

  const handleAuthenticated = async () => {
    try {
      const me = await getStaffMe();
      window.location.hash = me.role === 'host' ? '#host' : '#admin';
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    }
  };

  return <>
    <StaffMfaLogin onAuthenticated={handleAuthenticated} />
    {error && <p role="alert" style={{ color: '#E5484D', textAlign: 'center' }}>{error}</p>}
  </>;
}
