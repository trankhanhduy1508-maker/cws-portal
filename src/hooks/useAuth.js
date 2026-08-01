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

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await startGoogleLogin();
      if (result) {
        // Mock: trả về customer ngay. Backend thật: startGoogleLogin()
        // điều hướng rời trang (trả về null) — khi Google/Supabase
        // redirect về, onAuthStateChange ở trên tự cập nhật state.
        setIsAuthenticated(true);
        setCustomer(result);
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
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
