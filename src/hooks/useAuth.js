import { useState, useCallback, useEffect } from 'react';
import {
  startFacebookLogin,
  consumeTokenFromUrl,
  getStoredCustomer,
  logout as logoutService,
  isLoggedIn,
} from '../services/AuthService';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const gotTokenFromRedirect = consumeTokenFromUrl();
    if (gotTokenFromRedirect || isLoggedIn()) {
      setIsAuthenticated(true);
      setCustomer(getStoredCustomer());
    }
  }, []);

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend thật: startFacebookLogin() điều hướng rời trang (trả về
      // null) — App sẽ quay lại đây sau khi Facebook redirect xong, lúc
      // đó useEffect ở trên bắt token. Mock: trả về customer ngay.
      const result = await startFacebookLogin();
      if (result) {
        setIsAuthenticated(true);
        setCustomer(result);
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutService();
    setIsAuthenticated(false);
    setCustomer(null);
  }, []);

  return { isAuthenticated, customer, isLoading, error, login, logout };
}
