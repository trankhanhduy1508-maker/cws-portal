import { useState, useEffect, useCallback } from 'react';
import { getJobHistory } from '../services/RenderService';

export function useJobHistory() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    getJobHistory()
      .then(setJobs)
      .catch((err) => setError(err.message || 'Không lấy được lịch sử'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { jobs, isLoading, error, reload };
}
