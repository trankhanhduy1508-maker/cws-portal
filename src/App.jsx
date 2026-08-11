import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import PortalShell from './layouts/PortalShell';
import LandingScreen from './pages/LandingScreen';
import UploadScreen from './pages/UploadScreen';
import RenderProfileScreen from './pages/RenderProfileScreen';
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
import { useProfileEstimates } from './hooks/useProfileEstimates';
import { useRenderJob } from './hooks/useRenderJob';
import { useJobHistory } from './hooks/useJobHistory';
import { useAuth } from './hooks/useAuth';
import { JOB_STATUS, FILE_SOURCE } from './constants/renderConstants';
import { getDownloadUrl } from './services/RenderService';

// Screen Ä‘iá»u hÆ°á»›ng: LANDING giá» lÃ  1 trang DUY NHáº¤T gá»™p cáº£ hero +
// Upload/Drive link + nÃºt Google Login + CTA "Báº¯t Ä‘áº§u render" (yÃªu cáº§u
// má»›i: khÃ¡ch pháº£i tháº¥y háº¿t cÃ¡c hÃ nh Ä‘á»™ng ngay tá»« Ä‘áº§u, KHÃ”NG báº¯t báº¥m
// "Báº¯t Ä‘áº§u" má»›i lá»™ ra Upload, vÃ  KHÃ”NG cÃ³ mÃ n hÃ¬nh Login riÃªng cháº·n
// trÆ°á»›c â€” Ä‘Äƒng nháº­p chá»‰ Ä‘Æ°á»£c yÃªu cáº§u Ä‘Ãºng lÃºc khÃ¡ch báº¥m Render, xem
// handleContinueFromUpload). -> Render Profile -> Processing (Job cháº¡y
// tháº­t, MIá»„N PHÃ, bao gá»“m cáº£ lÃºc xong/lá»—i/há»§y/preview/CHá»œ THANH TOÃN â€”
// xem Ä‘iá»u kiá»‡n render bÃªn trong PROCESSING). Thanh toÃ¡n (QR MB Bank)
// chá»‰ diá»…n ra SAU khi khÃ¡ch duyá»‡t preview (CWS_MVP_WORKFLOW_FINAL.md),
// nÃªn KHÃ”NG pháº£i 1 SCREEN riÃªng trÆ°á»›c Processing ná»¯a â€” nÃ³ lÃ  1 tráº¡ng
// thÃ¡i con cá»§a Processing (job.status === AWAITING_PAYMENT), giá»‘ng
// REVIEW_READY/FINISHED. Payment Ä‘Æ°á»£c táº¡o sau render/preview, khÃ´ng chá»
// customer approve. History cÃ³ thá»ƒ má»Ÿ tá»« báº¥t ká»³ Ä‘Ã¢u qua nÃºt á»Ÿ header.
const SCREEN = {
  LANDING: 'landing',
  PROFILE: 'profile',
  PROCESSING: 'processing',
  HISTORY: 'history',
};

// Google/Supabase OAuth redirect (redirectTo: window.location.origin) lÃ 
// Ä‘iá»u hÆ°á»›ng TRANG THáº¬T â€” lÃ m máº¥t toÃ n bá»™ state React Ä‘ang cÃ³ (ká»ƒ cáº£
// driveLink Ä‘Ã£ dÃ¡n). LÆ°u táº¡m á»Ÿ Ä‘Ã¢y (chá»‰ chuá»—i text, KHÃ”NG lÆ°u File object
// vÃ¬ File khÃ´ng sá»‘ng sÃ³t qua Ä‘iá»u hÆ°á»›ng trang) Ä‘á»ƒ khÃ´i phá»¥c láº¡i sau khi
// khÃ¡ch quay vá» Ä‘Ã£ Ä‘Äƒng nháº­p xong, xem effect khÃ´i phá»¥c trong CustomerPortalApp.
const PENDING_DRIVE_LINK_KEY = 'cws_pending_drive_link';

export default function App() {
  // Admin Dashboard (Giai Ä‘oáº¡n 7) â€” hoÃ n toÃ n tÃ¡ch biá»‡t khá»i luá»“ng
  // khÃ¡ch hÃ ng, chá»‰ vÃ o Ä‘Æ°á»£c qua URL kÃ¨m #admin (khÃ´ng cÃ³ nÃºt/link nÃ o
  // dáº«n tá»›i tá»« giao diá»‡n khÃ¡ch hÃ ng). Báº£o vá»‡ á»Ÿ táº§ng Backend qua
  // Bearer + AAL2 (xem AdminScreen.jsx), khÃ´ng pháº£i qua áº©n URL. TÃ¡ch
  // thÃ nh nhÃ¡nh riÃªng á»Ÿ NGOÃ€I CustomerPortalApp (khÃ´ng pháº£i early
  // return bÃªn trong nÃ³) Ä‘á»ƒ khÃ´ng vi pháº¡m Rules of Hooks â€” App() á»Ÿ
  // Ä‘Ã¢y khÃ´ng gá»i hook nÃ o, chá»‰ CustomerPortalApp() má»›i gá»i.
  // Support both canonical links used historically (`#admin`) and the
  // hash-router form used by production links (`#/admin`).
  if (
    window.location.pathname === '/admin'
    || window.location.hash === '#admin'
    || window.location.hash === '#/admin'
  ) {
    return <AdminScreen />;
  }
  // ÄÄƒng nháº­p nhÃ¢n sá»± tháº­t (Pháº§n 6) â€” tÃ¡ch biá»‡t Google Login cá»§a
  // khÃ¡ch hÃ ng. #host Báº®T BUá»˜C qua Ä‘Ã¢y (khÃ´ng cÃ³ secret key thay tháº¿
  // nhÆ° #admin) â€” xem HostGate bÃªn dÆ°á»›i, kiá»ƒm tra role qua Backend
  // (GET /staff/me), KHÃ”NG tá»± Ä‘oÃ¡n á»Ÿ Frontend.
  if (window.location.hash === '#staff-login') {
    return <StaffLoginScreen />;
  }
  if (window.location.hash === '#host') {
    return <HostGate />;
  }
  return <CustomerPortalApp />;
}

/** Cháº·n #host cho tá»›i khi xÃ¡c nháº­n ÄÃšNG role='host' qua Backend tháº­t
 * (RoleGuard) â€” khÃ´ng chá»‰ dá»±a vÃ o viá»‡c cÃ³ access token Supabase hay
 * khÃ´ng (1 khÃ¡ch Google Ä‘Ã£ Ä‘Äƒng nháº­p cÅ©ng cÃ³ access token, nhÆ°ng
 * KHÃ”NG cÃ³ role trong staff_roles nÃªn GET /staff/me sáº½ tráº£ 403). */
function HostGate() {
  const [state, setState] = useState('loading'); // loading | ok | denied

  useEffect(() => {
    getStaffMe()
      .then((me) => setState(me.role === 'host' ? 'ok' : 'denied'))
      .catch(() => setState('denied'));
  }, []);

  useEffect(() => {
    // window.location.hash khÃ´ng tá»± kÃ­ch hoáº¡t App() render láº¡i (khÃ´ng cÃ³
    // hashchange listener) â€” reload() Ä‘á»ƒ cháº¯c cháº¯n StaffLoginScreen hiá»‡n
    // ra, cÃ¹ng cÃ¡ch StaffLoginScreen/HostScreen Ä‘ang lÃ m sau Ä‘Äƒng nháº­p/xuáº¥t.
    if (state === 'denied') {
      window.location.hash = '#staff-login';
      window.location.reload();
    }
  }, [state]);

  if (state === 'ok') return <HostScreen />;
  return <p style={{ padding: 24 }}>Äang kiá»ƒm tra quyá»n truy cáº­p...</p>;
}

function CustomerPortalApp() {
  const [screen, setScreen] = useState(SCREEN.LANDING);
  const [screenBeforeHistory, setScreenBeforeHistory] = useState(SCREEN.LANDING);
  const [source, setSource] = useState(FILE_SOURCE.UPLOAD);
  const [resolvedInput, setResolvedInput] = useState(null); // { fileRef, driveLink, fileName, fileSizeBytes }
  const [activeProjectName, setActiveProjectName] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

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
  const { estimates, isLoading: isLoadingEstimates } = useProfileEstimates(
    screen === SCREEN.PROFILE ? resolvedInput : null
  );
  const job = useRenderJob();
  const jobHistory = useJobHistory();
  const auth = useAuth();
  // true Ä‘Ãºng 1 nhá»‹p: vá»«a khÃ´i phá»¥c xong driveLink sau khi Google redirect
  // vá» (xem 2 effect bÃªn dÆ°á»›i) -> tá»± báº¥m tiáº¿p giÃºp khÃ¡ch, khÃ´ng báº¯t thao
  // tÃ¡c láº¡i tá»« Ä‘áº§u chá»‰ vÃ¬ vá»«a pháº£i Ä‘Äƒng nháº­p.
  const autoContinueRef = useRef(false);

  // Google/Supabase redirect tháº­t Ä‘Ã£ táº£i láº¡i trang xong (máº¥t háº¿t state) â€”
  // náº¿u khÃ¡ch tá»«ng dÃ¡n link Drive trÆ°á»›c khi bá»‹ yÃªu cáº§u Ä‘Äƒng nháº­p, khÃ´i
  // phá»¥c láº¡i link Ä‘Ã³ (Ä‘Ã£ lÆ°u táº¡m á»Ÿ handleContinueFromUpload) rá»“i tá»±
  // resolve láº¡i qua Backend tháº­t (KHÃ”NG bá»‹a dá»¯ liá»‡u, gá»i láº¡i y há»‡t lÃºc
  // dÃ¡n tay). TrÆ°á»ng há»£p source=UPLOAD (chá»n file tay): KHÃ”NG khÃ´i phá»¥c
  // Ä‘Æ°á»£c â€” File object khÃ´ng sá»‘ng sÃ³t qua Ä‘iá»u hÆ°á»›ng trang, Ä‘Ã¢y lÃ  giá»›i
  // háº¡n tháº­t cá»§a trÃ¬nh duyá»‡t, khÃ¡ch cáº§n chá»n láº¡i file (váº«n Ä‘Ã£ Ä‘Äƒng nháº­p
  // sáºµn nÃªn báº¥m "Báº¯t Ä‘áº§u render" láº§n 2 sáº½ qua ngay).
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
      // sessionStorage cÃ³ thá»ƒ bá»‹ cháº·n â€” bá» qua an toÃ n, khÃ¡ch tá»± dÃ¡n láº¡i link.
    }
    if (!pendingInput?.driveLink) return;
    try {
      sessionStorage.removeItem(PENDING_DRIVE_LINK_KEY);
    } catch {
      // xem ghi chÃº á»Ÿ trÃªn
    }
    autoContinueRef.current = true;
    setSource(FILE_SOURCE.GOOGLE_DRIVE);
    if (pendingInput.fileRef) {
      restoreResolved(pendingInput);
    } else {
      submitLink(pendingInput.driveLink);
    }
  }, [auth.isAuthenticated, screen, restoreResolved, submitLink]);

  // ---- ÄÄƒng nháº­p Google â€” dÃ¹ng chung cho nÃºt Google trÃªn Landing láº«n
  // bÆ°á»›c báº¯t buá»™c Ä‘Äƒng nháº­p khi báº¥m Render (handleContinueFromUpload).
  // LÆ°u táº¡m driveLink (náº¿u Ä‘ang á»Ÿ nhÃ¡nh Drive vÃ  Ä‘Ã£ cÃ³ link) TRÆ¯á»šC khi
  // gá»i auth.login() vÃ¬ Backend tháº­t Ä‘iá»u hÆ°á»›ng rá»i trang gáº§n nhÆ° ngay láº­p tá»©c. ----
  const triggerGoogleLogin = useCallback(async () => {
    if (source === FILE_SOURCE.GOOGLE_DRIVE && driveLink) {
      try {
        sessionStorage.setItem(
          PENDING_DRIVE_LINK_KEY,
          JSON.stringify({ driveLink, ...(resolvedInfo || {}) }),
        );
      } catch {
        // sessionStorage cÃ³ thá»ƒ bá»‹ cháº·n â€” bá» qua an toÃ n, khÃ¡ch tá»± dÃ¡n
        // láº¡i link sau khi Ä‘Äƒng nháº­p náº¿u trÃ¬nh duyá»‡t khÃ´ng há»— trá»£.
      }
    }
    return auth.login();
  }, [auth, source, driveLink, resolvedInfo]);

  // ---- BÆ°á»›c 1: Upload/Drive -> Render Profile. ÄÄƒng nháº­p Google chá»‰
  // thá»±c sá»± Báº®T BUá»˜C táº¡i Ä‘Ã¢y (khÃ¡ch Ä‘Æ°á»£c xem/chá»n Upload hoáº·c dÃ¡n link
  // tá»± do trÆ°á»›c Ä‘Ã³ trÃªn cÃ¹ng trang Landing, xem UploadScreen bÃªn dÆ°á»›i). ----
  const handleContinueFromUpload = useCallback(async () => {
    if (!auth.isAuthenticated) {
      // Backend tháº­t: triggerGoogleLogin() Ä‘iá»u hÆ°á»›ng rá»i trang ngay
      // (Supabase OAuth) -> loggedInNow luÃ´n false, hÃ m return á»Ÿ Ä‘Ã¢y,
      // flow tháº­t sá»± tiáº¿p tá»¥c sau khi khÃ¡ch quay vá» (xem 2 effect trÃªn).
      // Mock (demo, khÃ´ng cÃ³ Google tháº­t): tráº£ vá» true ngay, KHÃ”NG Ä‘iá»u
      // hÆ°á»›ng, nÃªn tiáº¿p tá»¥c luÃ´n bÃªn dÆ°á»›i khÃ´ng cáº§n khÃ¡ch báº¥m láº¡i.
      const loggedInNow = await triggerGoogleLogin();
      if (!loggedInNow) return;
      // Mock: Ä‘Äƒng nháº­p xong ngay, KHÃ”NG Ä‘iá»u hÆ°á»›ng -> tiáº¿p tá»¥c luÃ´n bÃªn
      // dÆ°á»›i trong cÃ¹ng lÆ°á»£t gá»i nÃ y, key táº¡m á»Ÿ sessionStorage (náº¿u vá»«a
      // ghi trong triggerGoogleLogin) khÃ´ng cÃ²n cáº§n ná»¯a, xoÃ¡ Ä‘á»ƒ trÃ¡nh
      // effect khÃ´i phá»¥c Ä‘á»c nháº§m 1 link cÅ© á»Ÿ láº§n Ä‘Äƒng nháº­p/táº£i trang sau.
      try {
        sessionStorage.removeItem(PENDING_DRIVE_LINK_KEY);
      } catch {
        // bá» qua an toÃ n, xem ghi chÃº tÆ°Æ¡ng tá»± á»Ÿ trÃªn
      }
    }
    try {
      if (source === FILE_SOURCE.UPLOAD) {
        const uploaded = await fileUploadResolver.resolve(file);
        setResolvedInput({ fileRef: uploaded.fileRef, driveLink: null, fileName: uploaded.fileName, fileSizeBytes: uploaded.fileSizeBytes });
        setActiveProjectName(uploaded.fileName);
      } else {
        const fileName = resolvedInfo?.fileName || driveLink;
        setResolvedInput({
          fileRef: resolvedInfo?.fileRef || null,
          driveLink: resolvedInfo?.fileRef ? null : driveLink,
          fileName,
          fileSizeBytes: resolvedInfo?.fileSizeBytes,
        });
        setActiveProjectName(fileName);
      }
      setScreen(SCREEN.PROFILE);
    } catch {
      // Lá»—i Ä‘Ã£ Ä‘Æ°á»£c lÆ°u trong fileUploadResolver.uploadError, hiá»ƒn thá»‹
      // ngay trÃªn UploadScreen (xem UploadZone/fileError phÃ­a dÆ°á»›i).
    }
  }, [auth.isAuthenticated, triggerGoogleLogin, source, file, driveLink, resolvedInfo, fileUploadResolver]);

  // Vá»«a khÃ´i phá»¥c xong driveLink sau khi Ä‘Äƒng nháº­p xong (effect phÃ­a
  // trÃªn) VÃ€ backend vá»«a resolve xong (isResolving chuyá»ƒn false) -> tá»±
  // tiáº¿p tá»¥c luÃ´n, khÃ¡ch khÃ´ng pháº£i báº¥m "Báº¯t Ä‘áº§u render" láº§n 2.
  useEffect(() => {
    if (!autoContinueRef.current || isResolving) return;
    autoContinueRef.current = false;
    if (resolvedInfo && !linkError) {
      handleContinueFromUpload();
    }
  }, [isResolving, resolvedInfo, linkError, handleContinueFromUpload]);

  // ---- BÆ°á»›c 2: Render Profile -> Processing (táº¡o job NGAY; payment chá»‰
  // Ä‘Æ°á»£c táº¡o sau render, validate, full-output lock vÃ  preview tháº­t). ----
  const handleContinueToProcessing = useCallback(() => {
    setScreen(SCREEN.PROCESSING);
    job.start({ input: resolvedInput, profileId: selectedProfileId });
  }, [job, resolvedInput, selectedProfileId]);

  // Sá»¬A Lá»–I (tá»± phÃ¡t hiá»‡n 31/07/2026): trÆ°á»›c Ä‘Ã¢y gá»i job.cancel() khÃ´ng
  // await/catch â€” job.cancel() lÃ  async, náº¿u Backend tá»« chá»‘i huá»· (vd
  // job Ä‘Ã£ AWAITING_PAYMENT trá»Ÿ Ä‘i, xem JobsService.cancel()) lá»—i bá»‹ bá»
  // qua hoÃ n toÃ n, khÃ¡ch báº¥m nÃºt khÃ´ng tháº¥y pháº£n há»“i gÃ¬. window.alert()
  // dÃ¹ng táº¡m (nháº¥t quÃ¡n vá»›i cÃ¡c dialog native khÃ¡c Ä‘Ã£ dÃ¹ng trong dá»± Ã¡n,
  // vd AdminScreen.jsx) â€” Ä‘á»§ cho 1 hÃ nh Ä‘á»™ng hiáº¿m khi tháº¥t báº¡i.
  const handleCancelJob = useCallback(async () => {
    try {
      await job.cancel();
    } catch (err) {
      window.alert(err.message || 'KhÃ´ng huá»· Ä‘Æ°á»£c job.');
    }
  }, [job]);

  const handleRetry = useCallback(() => {
    job.reset();
    clearFile();
    clearLink();
    setResolvedInput(null);
    setActiveProjectName(null);
    setSelectedProfileId(null);
    setScreen(SCREEN.LANDING);
  }, [job, clearFile, clearLink]);

  // ---- Job Dashboard / History (chá»‰ khÃ¡ch Ä‘Ã£ Ä‘Äƒng nháº­p má»›i xem Ä‘Æ°á»£c) ----
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
      // LuÃ´n qua route GET /jobs/:id/download (ghi log + kiá»ƒm tra chá»§ sá»Ÿ
      // há»¯u) â€” KHÃ”NG má»Ÿ tháº³ng historyJob.downloadUrl (URL B2 ná»™i bá»™, cÃ³
      // thá»ƒ Ä‘Ã£ háº¿t háº¡n náº¿u lÃ  presigned URL, xem b2-storage.service.ts).
      // getDownloadUrl() giá» async (cáº§n láº¥y access token trÆ°á»›c) â€” má»Ÿ tab
      // trá»‘ng NGAY trong lÃºc click (Ä‘á»“ng bá»™) rá»“i má»›i gÃ¡n location sau,
      // Ä‘á»ƒ trÃ¬nh duyá»‡t khÃ´ng cháº·n popup (chá»‰ cho phÃ©p window.open() gá»i
      // trá»±c tiáº¿p trong user gesture, khÃ´ng pháº£i sau 1 await).
      const win = window.open('', '_blank', 'noopener');
      getDownloadUrl(historyJob.id).then((url) => {
        if (url && win) win.location.href = url;
        else if (win) win.close();
      });
      return;
    }
    // Job Ä‘ang cháº¡y â€” má»Ÿ láº¡i (subscribe), KHÃ”NG táº¡o job má»›i.
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
              onContinue={handleContinueFromUpload}
              isContinuing={fileUploadResolver.isUploading}
            />
          </div>
        )}

        {screen === SCREEN.PROFILE && (
          <RenderProfileScreen
            key="profile"
            estimates={estimates}
            isLoadingEstimates={isLoadingEstimates}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
            onContinue={handleContinueToProcessing}
            onBack={() => setScreen(SCREEN.LANDING)}
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
