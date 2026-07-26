import { useState, useCallback, useRef, useEffect } from 'react';
import { submitRenderJob, cancelJob } from '../services/RenderService';
import { JOB_STATUS, STAGE_SEQUENCE } from '../constants/renderConstants';

/**
 * Hook điều phối vòng đời render: idle -> uploading -> ... -> finished/error/cancelled.
 * Component chỉ cần gọi `start(input, speed)` và đọc lại state trả về —
 * không cần biết RenderService bên dưới đang mock hay gọi API thật.
 *
 * `input` là { file } hoặc { driveLink } tuỳ nguồn người dùng chọn.
 */
export function useRenderJob() {
  const [status, setStatus] = useState(JOB_STATUS.IDLE);
  const [stageProgress, setStageProgress] = useState(0);
  const [result, setResult] = useState(null); // { previewUrl, downloadUrl, durationSec, resultSizeBytes }
  const [error, setError] = useState(null);
  const jobRef = useRef(null);

  const start = useCallback(({ file, driveLink }, speed) => {
    setStatus(JOB_STATUS.UPLOADING);
    setStageProgress(0);
    setResult(null);
    setError(null);

    jobRef.current = submitRenderJob({
      file,
      driveLink,
      speed,
      onProgress: (stageKey, progress) => {
        setStatus(stageKey);
        setStageProgress(progress);
      },
      onComplete: (jobResult) => {
        setStatus(JOB_STATUS.FINISHED);
        setStageProgress(1);
        setResult(jobResult);
      },
      onError: (err) => {
        setStatus(JOB_STATUS.ERROR);
        setError(err);
      },
    });
  }, []);

  /** Người dùng chủ động hủy job đang chạy (khác với reset — reset chỉ
   * dọn state ở FE, cancel còn báo cho Backend biết để dừng render thật). */
  const cancel = useCallback(async () => {
    if (jobRef.current) {
      jobRef.current.cancel();
      await cancelJob(jobRef.current.jobId);
    }
    setStatus(JOB_STATUS.CANCELLED);
  }, []);

  const reset = useCallback(() => {
    if (jobRef.current) jobRef.current.cancel();
    setStatus(JOB_STATUS.IDLE);
    setStageProgress(0);
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => { if (jobRef.current) jobRef.current.cancel(); };
  }, []);

  const stageIndex = Math.max(0, STAGE_SEQUENCE.findIndex((s) => s.key === status));
  const overallProgress = status === JOB_STATUS.IDLE
    ? 0
    : ((stageIndex + stageProgress) / (STAGE_SEQUENCE.length - 1)) * 100;

  return {
    status,
    stageIndex,
    stageProgress,
    overallProgress,
    result,
    error,
    isProcessing: ![JOB_STATUS.IDLE, JOB_STATUS.FINISHED, JOB_STATUS.ERROR, JOB_STATUS.CANCELLED].includes(status),
    start,
    cancel,
    reset,
  };
}
