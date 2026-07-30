import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createJob, subscribeToJobUpdates, cancelJob as cancelJobApi, approveJob, getPaymentDetails,
} from '../services/RenderService';
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
  const [paymentInfo, setPaymentInfo] = useState(null);
  const unsubscribeRef = useRef(null);
  const paymentFetchedForRef = useRef(null); // paymentId đã fetch chi tiết, tránh gọi lại mỗi lần onUpdate

  /** Dùng chung cho cả start() (job mới) lẫn attach() (mở lại job cũ):
   * nếu job đang AWAITING_PAYMENT mà paymentInfo chưa có (vd Reload lại
   * trang, hoặc mở lại từ Job Dashboard) — tự lấy lại chi tiết QR/nội
   * dung chuyển khoản thay vì để PaymentScreen trống. */
  function makeHandlers() {
    return {
      onUpdate: (job) => {
        setStatus(job.status);
        setStageProgress(job.stageProgress ?? 0);
        if (
          job.status === JOB_STATUS.AWAITING_PAYMENT &&
          job.paymentId &&
          paymentFetchedForRef.current !== job.paymentId
        ) {
          paymentFetchedForRef.current = job.paymentId;
          getPaymentDetails(job.paymentId).then(setPaymentInfo).catch(() => {});
        }
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
    };
  }

  /** Tạo job NGAY — render miễn phí, không cần paymentId (thanh toán chỉ
   * diễn ra sau khi khách duyệt preview, xem approve() bên dưới). */
  const start = useCallback(async ({ input, profileId }) => {
    setStatus(JOB_STATUS.QUEUED);
    setStageProgress(0);
    setResult(null);
    setError(null);
    setPaymentInfo(null);
    paymentFetchedForRef.current = null;

    try {
      const { jobId: newJobId } = await createJob({ input, profileId });
      setJobId(newJobId);
      unsubscribeRef.current = subscribeToJobUpdates(newJobId, makeHandlers());
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
    setPaymentInfo(null);
    paymentFetchedForRef.current = null;

    unsubscribeRef.current = subscribeToJobUpdates(existingJobId, makeHandlers());
  }, []);

  const cancel = useCallback(async () => {
    if (jobId) await cancelJobApi(jobId);
    // Trạng thái CANCELLED sẽ tự đến qua onUpdate (server/mock tự thông
    // báo), không cần setState thủ công ở đây.
  }, [jobId]);

  /** Khách duyệt bản preview (status === REVIEW_READY) -> Backend sinh
   * QR MB Bank ngay trong response này (không cần gọi thêm API nào) —
   * trạng thái job mới (AWAITING_PAYMENT rồi FINISHED sau khi webhook
   * xác nhận) tự đến qua onUpdate/onComplete như các bước khác. */
  const approve = useCallback(async () => {
    if (!jobId) return;
    const res = await approveJob(jobId);
    setPaymentInfo(res.payment ?? null);
  }, [jobId]);

  const reset = useCallback(() => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    setJobId(null);
    setStatus(JOB_STATUS.IDLE);
    setStageProgress(0);
    setResult(null);
    setError(null);
    setPaymentInfo(null);
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
    paymentInfo,
    isProcessing: ![JOB_STATUS.IDLE, JOB_STATUS.FINISHED, JOB_STATUS.ERROR, JOB_STATUS.CANCELLED].includes(status),
    start,
    attach,
    cancel,
    approve,
    reset,
  };
}
