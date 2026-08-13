import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import PortalShell from './layouts/PortalShell';
import LandingScreen from './pages/LandingScreen';
import UploadScreen from './pages/UploadScreen';
import PaymentScreen from './pages/PaymentScreen';
import ProgressScreen from './pages/ProgressScreen';
import ReviewScreen from './pages/ReviewScreen';
import PreviewDownloadScreen from './pages/PreviewDownloadScreen';
import ErrorScreen from './pages/ErrorScreen';
import HistoryScreen from './pages/HistoryScreen';
import AdminScreen from './pages/AdminScreen';
import StaffLoginScreen from './pages/StaffLoginScreen';
import HostScreen from './pages/HostScreen';
import { getStaffMe } from './services/staffApi';
import { useFileSelection } from './hooks/useFileSelection';
import { useDriveLink } from './hooks/useDriveLink';
import { useFileUploadResolver } from './hooks/useFileUploadResolver';
import { useRenderJob } from './hooks/useRenderJob';
import { useJobHistory } from './hooks/useJobHistory';
import { useAuth } from './hooks/useAuth';
import { JOB_STATUS, FILE_SOURCE } from './constants/renderConstants';
import { getDownloadUrl } from './services/RenderService';
import { validateMaterializedInput } from './utils/fileUtils';

// Screen điều hướng: LANDING giờ là 1 trang DUY NHẤT gộp cả hero +
// Upload/Drive link + nút Google Login + CTA "Bắt đầu render" (yêu cầu
// mới: khách phải thấy hết các hành động ngay từ đầu, KHÔNG bắt bấm
// "Bắt đầu" mới lộ ra Upload, và KHÔNG có màn hình Login riêng chặn
// trước — đăng nhập chỉ được yêu cầu đúng lúc khách bấm Render, xem
// handleContinueFromUpload). -> Processing (Job chạy
// thật, MIỄN PHÍ, bao gồm cả lúc xong/lỗi/hủy/preview/CHỜ THANH TOÁN —
// xem điều kiện render bên trong PROCESSING). Thanh toán (QR MB Bank)
// chỉ diễn ra SAU khi khách duyệt preview (CWS_MVP_WORKFLOW_FINAL.md),
// nên KHÔNG phải 1 SCREEN riêng trước Processing nữa — nó là 1 trạng
// thái con của Processing (job.status === AWAITING_PAYMENT), giống
// REVIEW_READY/FINISHED. Payment được tạo sau render/preview, không chờ
// customer approve. History có thể mở từ bất kỳ đâu qua nút ở header.
const SCREEN = {
  LANDING: 'landing',
  PROCESSING: 'processing',
  HISTORY: 'history',
};

// Google/Supabase OAuth redirect (redirectTo: window.location.origin) là
// điều hướng TRANG THẬT — làm mất toàn bộ state React đang có (kể cả
// driveLink đã dán). Lưu tạm ở đây (chỉ chuỗi text, KHÔNG lưu File object
// vì File không sống sót qua điều hướng trang) để khôi phục lại sau khi
// khách quay về đã đăng nhập xong, xem effect khôi phục trong CustomerPortalApp.
const PENDING_DRIVE_LINK_KEY = 'cws_pending_drive_link';

export default function App() {
  // Admin Dashboard (Giai đoạn 7) — hoàn toàn tách biệt khỏi luồng
  // khách hàng, chỉ vào được qua URL kèm #admin (không có nút/link nào
  // dẫn tới từ giao diện khách hàng). Bảo vệ ở tầng Backend qua
  // Bearer + AAL2 (xem AdminScreen.jsx), không phải qua ẩn URL. Tách
  // thành nhánh riêng ở NGOÀI CustomerPortalApp (không phải early
  // return bên trong nó) để không vi phạm Rules of Hooks — App() ở
  // đây không gọi hook nào, chỉ CustomerPortalApp() mới gọi.
  // Support both canonical links used historically (`#admin`) and the
  // hash-router form used by production links (`#/admin`).
  if (
    window.location.pathname === '/admin'
    || window.location.hash === '#admin'
    || window.location.hash === '#/admin'
  ) {
    return <AdminScreen />;
  }
  // Đăng nhập nhân sự thật (Phần 6) — tách biệt Google Login của
  // khách hàng. #host BẮT BUỘC qua đây (không có secret key thay thế
  // như #admin) — xem HostGate bên dưới, kiểm tra role qua Backend
  // (GET /staff/me), KHÔNG tự đoán ở Frontend.
  if (window.location.hash === '#staff-login') {
    return <StaffLoginScreen />;
  }
  if (window.location.hash === '#host') {
    return <HostGate />;
  }
  return <CustomerPortalApp />;
}

/** Chặn #host cho tới khi xác nhận ĐÚNG role='host' qua Backend thật
 * (RoleGuard) — không chỉ dựa vào việc có access token Supabase hay
 * không (1 khách Google đã đăng nhập cũng có access token, nhưng
 * KHÔNG có role trong staff_roles nên GET /staff/me sẽ trả 403). */
function HostGate() {
  const [state, setState] = useState('loading'); // loading | ok | denied

  useEffect(() => {
    getStaffMe()
      .then((me) => setState(me.role === 'host' ? 'ok' : 'denied'))
      .catch(() => setState('denied'));
  }, []);

  useEffect(() => {
    // window.location.hash không tự kích hoạt App() render lại (không có
    // hashchange listener) — reload() để chắc chắn StaffLoginScreen hiện
    // ra, cùng cách StaffLoginScreen/HostScreen đang làm sau đăng nhập/xuất.
    if (state === 'denied') {
      window.location.hash = '#staff-login';
      window.location.reload();
    }
  }, [state]);

  if (state === 'ok') return <HostScreen />;
  return <p style={{ padding: 24 }}>Đang kiểm tra quyền truy cập...</p>;
}

function CustomerPortalApp() {
  const [screen, setScreen] = useState(SCREEN.LANDING);
  const [screenBeforeHistory, setScreenBeforeHistory] = useState(SCREEN.LANDING);
  const [source, setSource] = useState(FILE_SOURCE.UPLOAD);
  const [resolvedInput, setResolvedInput] = useState(null); // { fileRef, driveLink, fileName, fileSizeBytes }
  const [activeProjectName, setActiveProjectName] = useState(null);

  const { file, fileError, setFile, clearFile } = useFileSelection();
  const {
    driveLink,
    linkError,
    resolvedInfo,
    isResolving,
    submitLink,
    restoreResolved,
    clearLink,
  } = useDriveLink();
  const fileUploadResolver = useFileUploadResolver();
  const job = useRenderJob();
  const jobHistory = useJobHistory();
  const auth = useAuth();
  // true đúng 1 nhịp: vừa khôi phục xong driveLink sau khi Google redirect
  // về (xem 2 effect bên dưới) -> tự bấm tiếp giúp khách, không bắt thao
  // tác lại từ đầu chỉ vì vừa phải đăng nhập.
  const autoContinueRef = useRef(false);

  // Google/Supabase redirect thật đã tải lại trang xong (mất hết state) —
  // nếu khách từng dán link Drive trước khi bị yêu cầu đăng nhập, khôi
  // phục lại link đó (đã lưu tạm ở handleContinueFromUpload) rồi tự
  // resolve lại qua Backend thật (KHÔNG bịa dữ liệu, gọi lại y hệt lúc
  // dán tay). Trường hợp source=UPLOAD (chọn file tay): KHÔNG khôi phục
  // được — File object không sống sót qua điều hướng trang, đây là giới
  // hạn thật của trình duyệt, khách cần chọn lại file (vẫn đã đăng nhập
  // sẵn nên bấm "Bắt đầu render" lần 2 sẽ qua ngay).
  useEffect(() => {
    if (!auth.isAuthenticated || screen !== SCREEN.LANDING) return;
    let pendingInput = null;
    try {
      const raw = sessionStorage.getItem(PENDING_DRIVE_LINK_KEY);
      if (raw) {
        try {
          pendingInput = JSON.parse(raw);
        } catch {
          pendingInput = { driveLink: raw };
        }
      }
    } catch {
      // sessionStorage có thể bị chặn — bỏ qua an toàn, khách tự dán lại link.
    }
    if (!pendingInput?.driveLink) return;
    try {
      sessionStorage.removeItem(PENDING_DRIVE_LINK_KEY);
    } catch {
      // xem ghi chú ở trên
    }
    autoContinueRef.current = true;
    setSource(FILE_SOURCE.GOOGLE_DRIVE);
    if (pendingInput.fileRef) {
      restoreResolved(pendingInput);
    } else {
      submitLink(pendingInput.driveLink);
    }
  }, [auth.isAuthenticated, screen, restoreResolved, submitLink]);

  // ---- Đăng nhập Google — dùng chung cho nút Google trên Landing lẫn
  // bước bắt buộc đăng nhập khi bấm Render (handleContinueFromUpload).
  // Lưu tạm driveLink (nếu đang ở nhánh Drive và đã có link) TRƯỚC khi
  // gọi auth.login() vì Backend thật điều hướng rời trang gần như ngay lập tức. ----
  const triggerGoogleLogin = useCallback(async () => {
    if (source === FILE_SOURCE.GOOGLE_DRIVE && driveLink) {
      try {
        sessionStorage.setItem(
          PENDING_DRIVE_LINK_KEY,
          JSON.stringify({ driveLink, ...(resolvedInfo || {}) }),
        );
      } catch {
        // sessionStorage có thể bị chặn — bỏ qua an toàn, khách tự dán
        // lại link sau khi đăng nhập nếu trình duyệt không hỗ trợ.
      }
    }
    return auth.login();
  }, [auth, source, driveLink, resolvedInfo]);

  // ---- Bước 1: Upload/Drive -> Render Profile. Đăng nhập Google chỉ
  // thực sự BẮT BUỘC tại đây (khách được xem/chọn Upload hoặc dán link
  // tự do trước đó trên cùng trang Landing, xem UploadScreen bên dưới). ----
  const handleContinueFromUpload = useCallback(async () => {
    if (!auth.isAuthenticated) {
      // Backend thật: triggerGoogleLogin() điều hướng rời trang ngay
      // (Supabase OAuth) -> loggedInNow luôn false, hàm return ở đây,
      // flow thật sự tiếp tục sau khi khách quay về (xem 2 effect trên).
      // Mock (demo, không có Google thật): trả về true ngay, KHÔNG điều
      // hướng, nên tiếp tục luôn bên dưới không cần khách bấm lại.
      const loggedInNow = await triggerGoogleLogin();
      if (!loggedInNow) return;
      // Mock: đăng nhập xong ngay, KHÔNG điều hướng -> tiếp tục luôn bên
      // dưới trong cùng lượt gọi này, key tạm ở sessionStorage (nếu vừa
      // ghi trong triggerGoogleLogin) không còn cần nữa, xoá để tránh
      // effect khôi phục đọc nhầm 1 link cũ ở lần đăng nhập/tải trang sau.
      try {
        sessionStorage.removeItem(PENDING_DRIVE_LINK_KEY);
      } catch {
        // bỏ qua an toàn, xem ghi chú tương tự ở trên
      }
    }
    try {
      let nextInput;
      if (source === FILE_SOURCE.UPLOAD) {
        const uploaded = await fileUploadResolver.resolve(file);
        const validation = validateMaterializedInput(uploaded);
        if (!validation.valid) throw new Error(validation.error);
        nextInput = { fileRef: uploaded.fileRef, driveLink: null, fileName: uploaded.fileName, fileSizeBytes: uploaded.fileSizeBytes, jobId: uploaded.jobId };
        setResolvedInput(nextInput);
        setActiveProjectName(uploaded.fileName);
      } else {
        const validation = validateMaterializedInput(resolvedInfo);
        if (!validation.valid) throw new Error(validation.error);
        const fileName = resolvedInfo?.fileName || driveLink;
        nextInput = {
          fileRef: resolvedInfo?.fileRef || null,
          driveLink: resolvedInfo?.fileRef ? null : driveLink,
          fileName,
          fileSizeBytes: resolvedInfo?.fileSizeBytes,
          jobId: resolvedInfo?.jobId,
        };
        setResolvedInput(nextInput);
        setActiveProjectName(fileName);
      }
      setScreen(SCREEN.PROCESSING);
      if (!nextInput.jobId) throw new Error('Backend chưa trả về Job sau INPUT_SAFE');
      await job.attach(nextInput.jobId);
    } catch {
      // Lỗi đã được lưu trong fileUploadResolver.uploadError, hiển thị
      // ngay trên UploadScreen (xem UploadZone/fileError phía dưới).
    }
  }, [auth.isAuthenticated, triggerGoogleLogin, source, file, driveLink, resolvedInfo, fileUploadResolver, job]);

  // Vừa khôi phục xong driveLink sau khi đăng nhập xong (effect phía
  // trên) VÀ backend vừa resolve xong (isResolving chuyển false) -> tự
  // tiếp tục luôn, khách không phải bấm "Bắt đầu render" lần 2.
  useEffect(() => {
    if (!autoContinueRef.current || isResolving) return;
    autoContinueRef.current = false;
    if (resolvedInfo && !linkError) {
      handleContinueFromUpload();
    }
  }, [isResolving, resolvedInfo, linkError, handleContinueFromUpload]);

  // A successful Drive submission already passed INPUT_SAFE and the Backend
  // created the one idempotent Job. Attach to that Job immediately; there is
  // no second customer Render/Start Render action.
  useEffect(() => {
    if (autoContinueRef.current || screen !== SCREEN.LANDING || isResolving) return;
    if (!resolvedInfo?.jobId || linkError) return;
    setResolvedInput(resolvedInfo);
    setActiveProjectName(resolvedInfo.fileName);
    setScreen(SCREEN.PROCESSING);
    void job.attach(resolvedInfo.jobId);
  }, [screen, isResolving, resolvedInfo, linkError, job]);

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
    setScreen(SCREEN.LANDING);
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
          <div key="landing" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>
            <LandingScreen
              isAuthenticated={auth.isAuthenticated}
              customerName={auth.customer?.user_metadata?.full_name || auth.customer?.fullName || auth.customer?.email || null}
              isAuthLoading={auth.isLoading}
              authError={auth.error}
              onGoogleLogin={triggerGoogleLogin}
            />
            <UploadScreen
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
              onDriveLinkChange={clearLink}
              onContinue={handleContinueFromUpload}
              isContinuing={fileUploadResolver.isUploading}
              isAuthenticated={auth.isAuthenticated}
              onGoogleLogin={triggerGoogleLogin}
              isAuthLoading={auth.isLoading}
            />
          </div>
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
            onApprove={null}
          />
        )}

        {screen === SCREEN.PROCESSING && job.status === JOB_STATUS.AWAITING_PAYMENT && (
          <div key="payment-flow" style={{ display: 'grid', gap: 16, width: '100%' }}>
            <ReviewScreen jobId={job.jobId} fileName={activeProjectName} onApprove={null} allowChanges={false} />
            <PaymentScreen
              amountVnd={job.paymentInfo?.amountVnd}
              transferContent={job.paymentInfo?.transferContent}
              qrImageUrl={job.paymentInfo?.qrImageUrl}
            />
          </div>
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
