import { useState, useEffect } from 'react';
import { estimateJob } from '../services/RenderService';
import { RENDER_PROFILES } from '../constants/renderConstants';

/**
 * Gọi RenderService.estimateJob() cho TỪNG Render Profile (song song)
 * để hiển thị comparison card — mỗi profile có ETA/giá/hàng đợi riêng.
 *
 * @param {Object|null} input - { fileRef, driveLink, fileSizeBytes } hoặc null nếu chưa sẵn sàng
 * @returns {{ estimates: Record<string, {etaSeconds, costVnd, queueSeconds}>, isLoading, error }}
 */
export function useProfileEstimates(input) {
  const [estimates, setEstimates] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all(
      RENDER_PROFILES.map((profile) =>
        estimateJob(input, profile.id).then((result) => [profile.id, result])
      )
    )
      .then((pairs) => {
        if (cancelled) return;
        setEstimates(Object.fromEntries(pairs));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Không lấy được ước tính');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [input]);

  return { estimates, isLoading, error };
}
