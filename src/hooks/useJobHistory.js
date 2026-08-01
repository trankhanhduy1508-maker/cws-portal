import { useState, useCallback } from 'react';
import { listJobs } from '../services/RenderService';

/** KHÔNG tự fetch lúc mount — App.jsx đã gọi reload() ngay khi khách
 * thật sự mở History (handleOpenHistory). Tự fetch lúc mount từng gây
 * 1 request GET /jobs thừa mỗi lần tải trang cho MỌI khách (kể cả
 * khách ẩn danh chưa đăng nhập, luôn nhận 401 vì route này yêu cầu
 * đăng nhập/x-admin-key) — phát hiện qua network trace thật khi verify
 * Backend production, không phải suy đoán. */
export function useJobHistory() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    listJobs()
      .then(setJobs)
      .catch((err) => setError(err.message || 'Không lấy được danh sách job'))
      .finally(() => setIsLoading(false));
  }, []);

  return { jobs, isLoading, error, reload };
}
