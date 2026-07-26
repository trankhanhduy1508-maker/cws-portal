import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import PortalShell from './layouts/PortalShell';
import LandingScreen from './pages/LandingScreen';
import UploadScreen from './pages/UploadScreen';
import JobConfirmScreen from './pages/JobConfirmScreen';
import ProgressScreen from './pages/ProgressScreen';
import PreviewDownloadScreen from './pages/PreviewDownloadScreen';
import ErrorScreen from './pages/ErrorScreen';
import HistoryScreen from './pages/HistoryScreen';
import { useFileSelection } from './hooks/useFileSelection';
import { useDriveLink } from './hooks/useDriveLink';
import { useRenderJob } from './hooks/useRenderJob';
import { useJobEstimate } from './hooks/useJobEstimate';
import { useJobHistory } from './hooks/useJobHistory';
import { JOB_STATUS, FILE_SOURCE } from './constants/renderConstants';

// Screen điều hướng — tuyến tính theo đúng flow yêu cầu, cộng thêm
// nhánh History có thể mở từ bất kỳ đâu qua nút ở header.
const SCREEN = {
  LANDING: 'landing',
  UPLOAD: 'upload',
  CONFIRM: 'confirm',
  PROCESSING: 'processing',
  DONE: 'done',
  HISTORY: 'history',
};

export default function App() {
  const [screen, setScreen] = useState(SCREEN.LANDING);
  const [screenBeforeHistory, setScreenBeforeHistory] = useState(SCREEN.LANDING);
  const [source, setSource] = useState(FILE_SOURCE.UPLOAD);
  const [speed, setSpeed] = useState(null);

  const { file, fileError, setFile, clearFile } = useFileSelection();
  const { driveLink, linkError, resolvedInfo, isResolving, submitLink, clearLink } = useDriveLink();
  const job = useRenderJob();
  const jobHistory = useJobHistory();

  const activeInput = useMemo(
    () => (source === FILE_SOURCE.UPLOAD ? { file } : { driveLink }),
    [source, file, driveLink]
  );
  const estimateInput = useMemo(
    () => ({
      file: source === FILE_SOURCE.UPLOAD ? file : null,
      driveLink: source === FILE_SOURCE.GOOGLE_DRIVE ? driveLink : null,
      speed,
    }),
    [source, file, driveLink, speed]
  );
  const { estimate, queueStatus, isLoading: isLoadingEstimate } = useJobEstimate(
    screen === SCREEN.CONFIRM ? estimateInput : {}
  );

  const handleContinueToConfirm = useCallback(() => setScreen(SCREEN.CONFIRM), []);

  const handleStartRender = useCallback(() => {
    setScreen(SCREEN.PROCESSING);
    job.start(activeInput, speed);
  }, [job, activeInput, speed]);

  const handleCancelJob = useCallback(async () => {
    await job.cancel();
  }, [job]);

  const handleRetry = useCallback(() => {
    job.reset();
    clearFile();
    clearLink();
    setSpeed(null);
    setScreen(SCREEN.UPLOAD);
  }, [job, clearFile, clearLink]);

  const handleOpenHistory = useCallback(() => {
    setScreenBeforeHistory(screen);
    setScreen(SCREEN.HISTORY);
    jobHistory.reload();
  }, [screen, jobHistory]);

  const handleOpenHistoryJob = useCallback((historyJob) => {
    if (historyJob.downloadUrl) {
      window.open(historyJob.downloadUrl, '_blank', 'noopener');
    }
  }, []);

  // Khi job hoàn thành, tự động chuyển sang màn hình Download
  if (job.status === JOB_STATUS.FINISHED && screen === SCREEN.PROCESSING) {
    setScreen(SCREEN.DONE);
  }
  // Khi job bị lỗi hoặc bị hủy, ở lại vùng "processing" nhưng render
  // ErrorScreen/CancelledScreen thay vì thanh tiến trình (xử lý ở JSX dưới)

  return (
    <PortalShell onOpenHistory={screen !== SCREEN.HISTORY ? handleOpenHistory : undefined}>
      <AnimatePresence mode="wait">
        {screen === SCREEN.LANDING && (
          <LandingScreen key="landing" onStart={() => setScreen(SCREEN.UPLOAD)} />
        )}

        {screen === SCREEN.UPLOAD && (
          <UploadScreen
            key="upload"
            source={source}
            setSource={setSource}
            file={file}
            fileError={fileError}
            onFileSelected={setFile}
            driveLink={driveLink}
            linkError={linkError}
            resolvedInfo={resolvedInfo}
            isResolving={isResolving}
            onDriveLinkSubmit={submitLink}
            speed={speed}
            setSpeed={setSpeed}
            onContinue={handleContinueToConfirm}
          />
        )}

        {screen === SCREEN.CONFIRM && (
          <JobConfirmScreen
            key="confirm"
            source={source}
            file={file}
            driveLink={driveLink}
            resolvedInfo={resolvedInfo}
            speed={speed}
            estimate={estimate}
            queueStatus={queueStatus}
            isLoadingEstimate={isLoadingEstimate}
            onConfirm={handleStartRender}
            onBack={() => setScreen(SCREEN.UPLOAD)}
          />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.ERROR && (
          <ErrorScreen
            key="error"
            variant="error"
            errorMessage={job.error?.message}
            onRetry={handleRetry}
          />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.CANCELLED && (
          <ErrorScreen
            key="cancelled"
            variant="cancelled"
            onRetry={handleRetry}
          />
        )}

        {screen === SCREEN.PROCESSING && job.status !== JOB_STATUS.ERROR && job.status !== JOB_STATUS.CANCELLED && (
          <ProgressScreen
            key="progress"
            stageIndex={job.stageIndex}
            overallProgress={job.overallProgress}
            fileName={source === FILE_SOURCE.UPLOAD ? file?.name : (resolvedInfo?.fileName || 'File từ Google Drive')}
            etaSeconds={estimate?.etaSeconds}
            onCancel={handleCancelJob}
          />
        )}

        {screen === SCREEN.DONE && (
          <PreviewDownloadScreen
            key="done"
            fileName={source === FILE_SOURCE.UPLOAD ? file?.name : (resolvedInfo?.fileName || 'File từ Google Drive')}
            downloadUrl={job.result?.downloadUrl}
            isPlaceholder={job.result?.isPlaceholder}
            durationSec={job.result?.durationSec}
            resultSizeBytes={job.result?.resultSizeBytes}
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
