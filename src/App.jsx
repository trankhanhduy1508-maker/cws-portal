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
import { useFileSelection } from './hooks/useFileSelection';
import { useDriveLink } from './hooks/useDriveLink';
import { useFileUploadResolver } from './hooks/useFileUploadResolver';
import { useProfileEstimates } from './hooks/useProfileEstimates';
import { usePayment } from './hooks/usePayment';
import { useRenderJob } from './hooks/useRenderJob';
import { useJobHistory } from './hooks/useJobHistory';
import { useAuth } from './hooks/useAuth';
import { JOB_STATUS, FILE_SOURCE } from './constants/renderConstants';

// Screen điều hướng — tuyến tính theo đúng end-to-end workflow:
// Facebook Login -> Upload -> Render Profile -> Payment -> Processing
// (Job chạy thật, bao gồm cả lúc xong/lỗi/hủy - xem điều kiện render
// bên trong PROCESSING). History có thể mở từ bất kỳ đâu qua nút ở header.
const SCREEN = {
  LANDING: 'landing',
  LOGIN: 'login',
  UPLOAD: 'upload',
  PROFILE: 'profile',
  PAYMENT: 'payment',
  PROCESSING: 'processing',
  HISTORY: 'history',
};

export default function App() {
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
  const payment = usePayment();
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

  // ---- Bước 2: Render Profile -> Payment ----
  const handleContinueToPayment = useCallback(() => setScreen(SCREEN.PAYMENT), []);

  // ---- Bước 3: Payment -> Processing (tạo job thật sau khi thanh toán) ----
  const handlePay = useCallback(async () => {
    const amountVnd = estimates[selectedProfileId]?.costVnd;
    const paymentId = await payment.pay(amountVnd);
    if (paymentId) {
      setScreen(SCREEN.PROCESSING);
      job.start({ input: resolvedInput, profileId: selectedProfileId, paymentId });
    }
  }, [estimates, selectedProfileId, payment, job, resolvedInput]);

  const handleCancelJob = useCallback(() => { job.cancel(); }, [job]);

  const handleRetry = useCallback(() => {
    job.reset();
    payment.reset();
    clearFile();
    clearLink();
    setResolvedInput(null);
    setActiveProjectName(null);
    setSelectedProfileId(null);
    setScreen(SCREEN.UPLOAD);
  }, [job, payment, clearFile, clearLink]);

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
      if (historyJob.downloadUrl) window.open(historyJob.downloadUrl, '_blank', 'noopener');
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
            onContinue={handleContinueToPayment}
            onBack={() => setScreen(SCREEN.UPLOAD)}
          />
        )}

        {screen === SCREEN.PAYMENT && (
          <PaymentScreen
            key="payment"
            amountVnd={estimates[selectedProfileId]?.costVnd}
            method={payment.method}
            setMethod={payment.setMethod}
            status={payment.status}
            error={payment.error}
            transferContent={payment.transferContent}
            qrImageUrl={payment.qrImageUrl}
            onPay={handlePay}
            onBack={() => setScreen(SCREEN.PROFILE)}
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
          ![JOB_STATUS.ERROR, JOB_STATUS.CANCELLED, JOB_STATUS.FINISHED, JOB_STATUS.REVIEW_READY].includes(job.status) && (
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
