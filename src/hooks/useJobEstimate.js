import { useState, useEffect } from 'react';
import { getJobEstimate, getQueueStatus } from '../services/RenderService';

/**
 * Hook gọi RenderService để lấy ETA + giá dự kiến, đồng thời lấy trạng
 * thái hàng đợi hiện tại (bao nhiêu máy đang xử lý trước). Tự chạy khi
 * file/driveLink/speed thay đổi.
 */
export function useJobEstimate({ file, driveLink, speed }) {
  const [estimate, setEstimate] = useState(null); // { etaSeconds, priceVnd }
  const [queueStatus, setQueueStatus] = useState(null); // { workersAhead, etaStartSeconds }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file && !driveLink) return;
    if (!speed) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getJobEstimate({ file, driveLink, speed }),
      getQueueStatus(),
    ])
      .then(([estimateResult, queueResult]) => {
        if (cancelled) return;
        setEstimate(estimateResult);
        setQueueStatus(queueResult);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Không lấy được ước tính');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [file, driveLink, speed]);

  return { estimate, queueStatus, isLoading, error };
}
