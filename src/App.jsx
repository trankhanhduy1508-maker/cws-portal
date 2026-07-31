import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import PortalShell from './layouts/PortalShell';
import LandingScreen from './pages/LandingScreen';
import LoginScreen from './pages/LoginScreen';
import UploadScreen from './pages/UploadScreen';
import RenderProfileScreen from './pages/RenderProfileScreen';
import PaymentScreen from './pages/PaymentScreen';
import ProgressScreen from './pages/ProgressScreen';
import ReviewScreen from './pages/ReviewScreen';
import PreviewDownloadScreen from './pages/PreviewDownloadScreen';
import ErrorScreen from './pages/ErrorScreen';
import HistoryScreen from './pages/HistoryScreen';
import AdminScreen from './pages/AdminScreen';
import { useFileSelection } from './hooks/useFileSelection';
import { useDriveLink } from './hooks/useDriveLink';
import { useFileUploadResolver } from './hooks/useFileUploadResolver';
import { useProfileEstimates } from './hooks/useProfileEstimates';
import { useRenderJob } from './hooks/useRenderJob';
import { useJobHistory } from './hooks/useJobHistory';
import { useAuth } from './hooks/useAuth';
import { JOB_STATUS, FILE_SOURCE } from './constants/renderConstants';
import { getDownloadUrl } from './services/RenderService';

// Screen điều hướng — tuyến tính theo đúng end-to-end workflow:
// Facebook Login -> Upload -> Render Profile -> Processing (Job chạy
// thật, MIỄN PHÍ, bao gồm cả lúc xong/lỗi/hủy/preview/CHỜ THANH TOÁN —
// xem điều kiện render bên trong PROCESSING). Thanh toán (QR MB Bank)
// chỉ diễn ra SAU khi khách duyệt preview (CWS_MVP_WORKFLOW_FINAL.md),
// nên KHÔNG phải 1 SCREEN riêng trước Processing nữa — nó là 1 trạng
// thái con của Processing (job.status === AWAITING_PAYMENT), giống
// REVIEW_READY/FINISHED. History có thể mở từ bất kỳ đâu qua nút ở header.
const SCREEN = {
  LANDING: 'landing',
  LOGIN: 'login',
  UPLOAD: 'upload',
  PROFILE: 'profile',
  PROCESSING: 'processing',
  HISTORY: 'history',
};

export default function App() {
  // Admin Dashboard (Giai đoạn 7) — hoàn toàn tách biệt khỏi luồng
  // khách hàng, chỉ vào được qua URL kèm #admin (không có nút/link nào
  // dẫn tới từ giao diện khách hàng). Bảo vệ ở tầng Backend qua
  // x-admin-key (xem AdminScreen.jsx), không phải qua ẩn URL. Tách
  // thành nhánh riêng ở NGOÀI CustomerPortalApp (không phải early
  // return bên trong nó) để không vi phạm Rules of Hooks — App() ở
  // đây không gọi hook nào, chỉ CustomerPortalApp() mới gọi.
  if (window.location.hash === '#admin') {
    return <AdminScreen />;
  }
  return <CustomerPortalApp />;
}

function CustomerPortalApp() {
  const [screen, setScreen] = useState(SCREEN.LANDING);
  const [screenBeforeHistory, setScreenBeforeHistory] = useState(SCREEN.LANDING);
  const [source, setSource] = useState(FILE_SOURCE.UPLOAD);
  const [resolvedInput, setResolvedInput] = useState(null); // { fileRef, driveLink, fileName, fileSizeBytes }
  const [activeProjectName, setActiveProjectName] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const { file, fileError, setFile, clearFile } = useFileSelection();
  const { driveLink, linkError, resolvedInfo, isResolving, submitLink, clearLink } = useDriveLink();
  const fileUploadResolver = useFileUploadResolver();
  const { estimates, isLoading: isLoadingEstimates } = useProfileEstimates(
    screen === SCREEN.PROFILE ? resolvedInput : null
  );
  const job = useRenderJob();
  const jobHistory = useJobHistory();
  const auth = useAuth();

  // Backend thật redirect khách về đây kèm ?token= sau khi đăng nhập
  // Facebook xong (useAuth đã bắt token lúc mount) — nếu vừa đăng nhập
  // xong mà vẫn đang ở Landing/Login thì tự chuyển tiếp sang Upload.
  useEffect(() => {
    if (auth.isAuthenticated && (screen === SCREEN.LANDING || screen === SCREEN.LOGIN)) {
      setScreen(SCREEN.UPLOAD);
    }
  }, [auth.isAuthenticated, screen]);

  // ---- Bước 0: Landing -> Login (nếu chưa đăng nhập) hoặc thẳng Upload ----
  const handleStart = useCallback(() => {
    setScreen(auth.isAuthenticated ? SCREEN.UPLOAD : SCREEN.LOGIN);
  }, [auth.isAuthenticated]);

  // ---- Bước 1: Upload/Drive -> Render Profile ----
  const handleContinueFromUpload = useCallback(async () => {
    try {
      if (source === FILE_SOURCE.UPLOAD) {
        const uploaded = await fileUploadResolver.resolve(file);
        setResolvedInput({ fileRef: uploaded.fileRef, driveLink: null, fileName: uploaded.fileName, fileSizeBytes: uploaded.fileSizeBytes });
        setActiveProjectName(uploaded.fileName);
      } else {
        const fileName = resolvedInfo?.fileName || driveLink;
        setResolvedInput({ fileRef: null, driveLink, fileName, fileSizeBytes: resolvedInfo?.fileSizeBytes });
        setActiveProjectName(fileName);
      }
      setScreen(SCREEN.PROFILE);
    } catch {
      // Lỗi đã được lưu trong fileUploadResolver.uploadError, hiển thị
      // ngay trên UploadScreen (xem UploadZone/fileError phía dưới).
    }
  }, [source, file, driveLink, resolvedInfo, fileUploadResolver]);

  // ---- Bước 2: Render Profile -> Processing (tạo job NGAY, render miễn
  // phí — thanh toán chỉ diễn ra sau khi khách duyệt preview, xem
  // job.status === AWAITING_PAYMENT bên dưới). ----
  const handleContinueToProcessing = useCallback(() => {
    setScreen(SCREEN.PROCESSING);
    job.start({ input: resolvedInput, profileId: selectedProfileId });
  }, [job, resolvedInput, selectedProfileId]);

  // SỬA LỖI (tự phát hiện 31/07/2026): trước đây gọi job.cancel() không
  // await/catch — job.cancel() là async, nếu Backend từ chối huỷ (vd
  // job đã AWAITING_PAYMENT trở đi, xem JobsService.cancel()) lỗi bị bỏ
  // qua hoàn toàn, khách bấm nút không thấy phản hồi gì. window.alert()
  // dùng tạm (nhất quán với các dialog native khác đã dùng trong dự án,
  // vd AdminScreen.jsx) — đủ cho 1 hành động hiếm khi thất bại.
  const handleCancelJob = useCallback(async () => {
    try {
      await job.cancel();
    } catch (err) {
      window.alert(err.message || 'Không huỷ được job.');
    }
  }, [job]);

  const handleRetry = useCallback(() => {
    job.reset();
    clearFile();
    clearLink();
    setResolvedInput(null);
    setActiveProjectName(null);
    setSelectedProfileId(null);
    setScreen(SCREEN.UPLOAD);
  }, [job, clearFile, clearLink]);

  // ---- Job Dashboard / History (chỉ khách đã đăng nhập mới xem được) ----
  const handleOpenHistory = useCallback(() => {
    setScreenBeforeHistory(screen);
    setScreen(SCREEN.HISTORY);
    jobHistory.reload();
  }, [screen, jobHistory]);

  const handleLogout = useCallback(async () => {
    await auth.logout();
    setScreen(SCREEN.LANDING);
  }, [auth]);

  const handleOpenHistoryJob = useCallback((historyJob) => {
    const isTerminal = [JOB_STATUS.FINISHED, JOB_STATUS.ERROR, JOB_STATUS.CANCELLED].includes(historyJob.status);
    if (isTerminal) {
      // Luôn qua route GET /jobs/:id/download (ghi log + kiểm tra chủ sở
      // hữu) — KHÔNG mở thẳng historyJob.downloadUrl (URL B2 nội bộ, có
      // thể đã hết hạn nếu là presigned URL, xem b2-storage.service.ts).
      // getDownloadUrl() giờ async (cần lấy access token trước) — mở tab
      // trống NGAY trong lúc click (đồng bộ) rồi mới gán location sau,
      // để trình duyệt không chặn popup (chỉ cho phép window.open() gọi
      // trực tiếp trong user gesture, không phải sau 1 await).
      const win = window.open('', '_blank', 'noopener');
      getDownloadUrl(historyJob.id).then((url) => {
        if (url && win) win.location.href = url;
        else if (win) win.close();
      });
      return;
    }
    // Job đang chạy — mở lại (subscribe), KHÔNG tạo job mới.
    setActiveProjectName(historyJob.projectName);
    setSelectedProfileId(historyJob.profileId);
    job.attach(historyJob.id);
    setScreen(SCREEN.PROCESSING);
  }, [job]);

  return (
    <PortalShell
      onOpenHistory={auth.isAuthenticated && screen !== SCREEN.HISTORY ? handleOpenHistory : undefined}
      isAuthenticated={auth.isAuthenticated}
      onLogout={handleLogout}
    >
      <AnimatePresence mode="wait">
        {screen === SCREEN.LANDING && (
          <LandingScreen key="landing" onStart={handleStart} />
        )}

        {screen === SCREEN.LOGIN && (
          <LoginScreen
            key="login"
            onLogin={auth.login}
            isLoading={auth.isLoading}
            error={auth.error}
          />
        )}

        {screen === SCREEN.UPLOAD && (
          <UploadScreen
            key="upload"
            source={source}
            setSource={setSource}
            file={file}
            fileError={fileError || fileUploadResolver.uploadError}
            onFileSelected={setFile}
            driveLink={driveLink}
            linkError={linkError}
            resolvedInfo={resolvedInfo}
            isResolving={isResolving}
            onDriveLinkSubmit={submitLink}
            onContinue={handleContinueFromUpload}
            isContinuing={fileUploadResolver.isUploading}
          />
        )}

        {screen === SCREEN.PROFILE && (
          <RenderProfileScreen
            key="profile"
            estimates={estimates}
            isLoadingEstimates={isLoadingEstimates}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
            onContinue={handleContinueToProcessing}
            onBack={() => setScreen(SCREEN.UPLOAD)}
          />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.ERROR && (
          <ErrorScreen key="error" variant="error" errorMessage={job.error?.message} onRetry={handleRetry} />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.CANCELLED && (
          <ErrorScreen key="cancelled" variant="cancelled" onRetry={handleRetry} />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.REVIEW_READY && (
          <ReviewScreen
            key="review"
            jobId={job.jobId}
            fileName={activeProjectName}
            onApprove={job.approve}
          />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.AWAITING_PAYMENT && (
          <PaymentScreen
            key="payment"
            // SỬA LỖI (31/07/2026): KHÔNG fallback về estimates[...] (ước
            // tính heuristic trước render) nữa — nếu paymentInfo (giá
            // THẬT vừa tính từ approve()) chưa tải xong, PaymentScreen tự
            // hiện "đang tải" thay vì hiện nhầm số ước tính SAI cho khách.
            amountVnd={job.paymentInfo?.amountVnd}
            transferContent={job.paymentInfo?.transferContent}
            qrImageUrl={job.paymentInfo?.qrImageUrl}
            onCancel={handleCancelJob}
          />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.FINISHED && (
          <PreviewDownloadScreen
            key="done"
            jobId={job.jobId}
            fileName={activeProjectName}
            downloadUrl={job.result?.downloadUrl}
            isPlaceholder={job.result?.isPlaceholder}
            durationSec={job.result?.durationSec}
            resultSizeBytes={job.result?.resultSizeBytes}
          />
        )}

        {screen === SCREEN.PROCESSING &&
          ![JOB_STATUS.ERROR, JOB_STATUS.CANCELLED, JOB_STATUS.FINISHED, JOB_STATUS.REVIEW_READY, JOB_STATUS.AWAITING_PAYMENT].includes(job.status) && (
          <ProgressScreen
            key="progress"
            stageIndex={job.stageIndex}
            overallProgress={job.overallProgress}
            fileName={activeProjectName}
            etaSeconds={estimates[selectedProfileId]?.etaSeconds}
            onCancel={handleCancelJob}
          />
        )}

        {screen === SCREEN.HISTORY && (
          <HistoryScreen
            key="history"
            jobs={jobHistory.jobs}
            isLoading={jobHistory.isLoading}
            onBack={() => setScreen(screenBeforeHistory)}
            onOpenJob={handleOpenHistoryJob}
          />
        )}
      </AnimatePresence>
    </PortalShell>
  );
}
