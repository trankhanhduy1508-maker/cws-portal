import { useState, useCallback, useEffect } from 'react';
import {
  startGoogleLogin,
  logout as logoutService,
  onAuthStateChange,
  getCurrentUser,
  consumeOAuthErrorFromUrl,
} from '../services/AuthService';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const oauthError = consumeOAuthErrorFromUrl();
    if (oauthError) setError(oauthError);

    getCurrentUser().then((user) => {
      setIsAuthenticated(Boolean(user));
      setCustomer(user);
    });

    // Bắt sự kiện đăng nhập/đăng xuất xảy ra SAU (vd Google redirect
    // về xong, hoặc đăng xuất từ tab khác) — Supabase tự bắn sự kiện
    // này, không cần Portal tự poll.
    const unsubscribe = onAuthStateChange((user) => {
      setIsAuthenticated(Boolean(user));
      setCustomer(user);
    });
    return unsubscribe;
  }, []);

  /** @returns {Promise<boolean>} true nếu đã đăng nhập XONG ngay trong lệnh
   * gọi này (chỉ xảy ra ở mock — không có Google thật để điều hướng).
   * Backend thật: startGoogleLogin() điều hướng rời trang gần như ngay
   * lập tức (Supabase OAuth), nên luôn trả về false ở đây — trang sắp
   * unload, isAuthenticated thật sẽ được set SAU khi Google/Supabase
   * redirect về (onAuthStateChange ở trên). Gọi nơi cần biết "có nên
   * tiếp tục flow ngay bây giờ không" (xem App.jsx#handleContinueFromUpload). */
  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await startGoogleLogin();
      if (result) {
        setIsAuthenticated(true);
        setCustomer(result);
        return true;
      }
      return false;
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setIsAuthenticated(false);
    setCustomer(null);
  }, []);

  return { isAuthenticated, customer, isLoading, error, login, logout };
}
