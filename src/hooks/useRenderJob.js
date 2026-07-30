import { useState, useCallback, useRef, useEffect } from 'react';
import { createJob, subscribeToJobUpdates, cancelJob as cancelJobApi, approveJob } from '../services/RenderService';
import { JOB_STATUS, STAGE_SEQUENCE } from '../constants/renderConstants';

/**
 * Hook điều phối vòng đời render TỪ SAU KHI job đã được tạo (sau thanh
 * toán). Khác biệt quan trọng so với thiết kế trước: job KHÔNG chạy
 * "trong" hook này — job chạy phía RenderService (mock hoặc Backend
 * thật), hook chỉ subscribe để nhận cập nhật. Nếu Component unmount
 * rồi mount lại (vd chuyển màn hình rồi quay lại), job vẫn tiếp tục
 * chạy đúng, không bị mất tiến trình.
 */
export function useRenderJob() {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(JOB_STATUS.IDLE);
  const [stageProgress, setStageProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  const start = useCallback(async ({ input, profileId, paymentId }) => {
    setStatus(JOB_STATUS.QUEUED);
    setStageProgress(0);
    setResult(null);
    setError(null);

    try {
      const { jobId: newJobId } = await createJob({ input, profileId, paymentId });
      setJobId(newJobId);

      unsubscribeRef.current = subscribeToJobUpdates(newJobId, {
        onUpdate: (job) => {
          setStatus(job.status);
          setStageProgress(job.stageProgress ?? 0);
        },
        onComplete: (job) => {
          setResult({
            downloadUrl: job.downloadUrl,
            durationSec: job.durationSec,
            resultSizeBytes: job.resultSizeBytes,
            isPlaceholder: Boolean(job.isPlaceholder),
          });
        },
        onError: (err) => {
          setStatus(JOB_STATUS.ERROR);
          setError(err);
        },
      });
    } catch (err) {
      setStatus(JOB_STATUS.ERROR);
      setError({ message: err.message || 'Không tạo được job' });
    }
  }, []);

  /** Mở lại (subscribe) 1 job ĐÃ TỒN TẠI — dùng khi người dùng bấm vào
   * 1 job đang chạy trong Job Dashboard, không phải tạo job mới. */
  const attach = useCallback((existingJobId) => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    setJobId(existingJobId);
    setError(null);
    setResult(null);

    unsubscribeRef.current = subscribeToJobUpdates(existingJobId, {
      onUpdate: (job) => {
        setStatus(job.status);
        setStageProgress(job.stageProgress ?? 0);
      },
      onComplete: (job) => {
        setResult({
          downloadUrl: job.downloadUrl,
          durationSec: job.durationSec,
          resultSizeBytes: job.resultSizeBytes,
          isPlaceholder: Boolean(job.isPlaceholder),
        });
      },
      onError: (err) => {
        setStatus(JOB_STATUS.ERROR);
        setError(err);
      },
    });
  }, []);

  const cancel = useCallback(async () => {
    if (jobId) await cancelJobApi(jobId);
    // Trạng thái CANCELLED sẽ tự đến qua onUpdate (server/mock tự thông
    // báo), không cần setState thủ công ở đây.
  }, [jobId]);

  /** Khách duyệt bản preview (status === REVIEW_READY) -> Backend đóng
   * gói + mở link tải, trạng thái mới tự đến qua onUpdate/onComplete. */
  const approve = useCallback(async () => {
    if (!jobId) return;
    await approveJob(jobId);
  }, [jobId]);

  const reset = useCallback(() => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    setJobId(null);
    setStatus(JOB_STATUS.IDLE);
    setStageProgress(0);
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, []);

  const stageIndex = Math.max(0, STAGE_SEQUENCE.findIndex((s) => s.key === status));
  const overallProgress = status === JOB_STATUS.IDLE
    ? 0
    : ((stageIndex + stageProgress) / (STAGE_SEQUENCE.length - 1)) * 100;

  return {
    jobId,
    status,
    stageIndex,
    stageProgress,
    overallProgress,
    result,
    error,
    isProcessing: ![JOB_STATUS.IDLE, JOB_STATUS.FINISHED, JOB_STATUS.ERROR, JOB_STATUS.CANCELLED].includes(status),
    start,
    attach,
    cancel,
    approve,
    reset,
  };
}
