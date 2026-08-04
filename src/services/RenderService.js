// ============================================================
// RenderService â€” Cá»”NG DUY NHáº¤T giao tiáº¿p vá»›i Backend CWS.
//
// ÄÃ¢y lÃ  toÃ n bá»™ "API Contract" cá»§a Frontend: má»i hÃ nh Ä‘á»™ng cá»§a ngÆ°á»i
// dÃ¹ng (chá»n file, Æ°á»›c tÃ­nh, thanh toÃ¡n, táº¡o job, theo dÃµi realtime,
// há»§y job, xem lá»‹ch sá»­) Ä‘á»u Ä‘i qua cÃ¡c hÃ m export á»Ÿ Ä‘Ã¢y. KHÃ”NG Component
// nÃ o Ä‘Æ°á»£c gá»i fetch()/WebSocket trá»±c tiáº¿p, vÃ  KHÃ”NG Ä‘Æ°á»£c gá»i tháº³ng
// Worker/Scheduler â€” Frontend chá»‰ nÃ³i chuyá»‡n vá»›i RenderService, Backend
// tháº­t (sau nÃ y) má»›i lÃ  nÆ¡i biáº¿t Worker/Scheduler tá»“n táº¡i.
//
// HIá»†N Táº I: chÆ°a cÃ³ Backend (IS_BACKEND_CONFIGURED === false) nÃªn má»i
// hÃ m bÃªn dÆ°á»›i á»§y quyá»n cho `mockBackend.js` â€” 1 "server giáº£" cÃ³ state
// sá»‘ng Ä‘á»™c láº­p vá»›i UI (xem comment trong file Ä‘Ã³). Khi Dy ná»‘i Backend
// tháº­t, chá»‰ cáº§n hoÃ n thiá»‡n cÃ¡c hÃ m `*Real` trong file nÃ y, KHÃ”NG Ä‘á»•i
// tÃªn hÃ m export hay shape tham sá»‘/callback â€” Component/Hook khÃ´ng cáº§n
// sá»­a gÃ¬.
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';
import * as mock from './mockBackend';
import { validateFile, validateDriveLink } from '../utils/fileUtils';
import { getAccessToken } from './AuthService';

// Giá»¯ tham chiáº¿u File tháº­t theo fileRef â€” CHá»ˆ dÃ¹ng á»Ÿ mock mode Ä‘á»ƒ táº¡o
// Blob URL placeholder lÃºc job hoÃ n thÃ nh (xem ghi chÃº "download tháº­t"
// trong PreviewDownloadScreen). Backend tháº­t khÃ´ng cáº§n cáº¥u trÃºc nÃ y vÃ¬
// server tháº­t giá»¯ file tháº­t, khÃ´ng pháº£i trÃ¬nh duyá»‡t.
const mockFileRefRegistry = new Map();

// ============================================================
// 1. UPLOAD FILE / GOOGLE DRIVE
// ============================================================

const RESUMABLE_SESSION_PREFIX = 'cws-resumable-upload:';
const RESUMABLE_FINGERPRINT = (file) => [file.name, file.size, file.lastModified].join(':');

async function uploadFileResumable(file) {
  const fingerprint = RESUMABLE_FINGERPRINT(file);
  const storageKey = RESUMABLE_SESSION_PREFIX + fingerprint;
  const token = await getAccessToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const resumeSessionId = sessionStorage.getItem(storageKey);
  const initResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_RESUMABLE_INIT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size, contentType: file.type || 'application/octet-stream', resumeSessionId }),
  });
  if (!initResponse.ok) {
    if (resumeSessionId) {
      sessionStorage.removeItem(storageKey);
      return uploadFileResumable(file);
    }
    throw new Error(`KhÃ´ng khá»Ÿi táº¡o Ä‘Æ°á»£c upload (${initResponse.status})`);
  }
  const session = await initResponse.json();
  sessionStorage.setItem(storageKey, session.sessionId);
  const uploadedParts = new Set(session.uploadedParts || []);
  for (let partNumber = 1; partNumber <= session.totalParts; partNumber += 1) {
    if (uploadedParts.has(partNumber)) continue;
    const start = (partNumber - 1) * session.chunkSizeBytes;
    const end = Math.min(start + session.chunkSizeBytes, file.size);
    const formData = new FormData();
    formData.append('chunk', file.slice(start, end), file.name);
    const partResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_RESUMABLE_PART(session.sessionId, partNumber)}`, { method: 'PUT', headers: authHeaders, body: formData });
    if (!partResponse.ok) throw new Error(`Upload chunk ${partNumber}/${session.totalParts} tháº¥t báº¡i (${partResponse.status})`);
  }
  const completeResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_RESUMABLE_COMPLETE(session.sessionId)}`, { method: 'POST', headers: authHeaders });
  if (!completeResponse.ok) throw new Error(`HoÃ n táº¥t upload tháº¥t báº¡i (${completeResponse.status})`);
  sessionStorage.removeItem(storageKey);
  return completeResponse.json();
}


/**
 * "Táº£i lÃªn" 1 file Ä‘Ã£ Ä‘Æ°á»£c validate cÃº phÃ¡p (xem utils/fileUtils).
 * Tráº£ vá» 1 "fileRef" â€” tham chiáº¿u Ä‘á»ƒ cÃ¡c bÆ°á»›c sau (estimate, createJob)
 * dÃ¹ng láº¡i, thay vÃ¬ pháº£i truyá»n cáº£ File object qua nhiá»u táº§ng.
 *
 * @returns {Promise<{ fileRef: string, fileName: string, fileSizeBytes: number }>}
 */
export async function uploadFile(file) {
  const { valid, error } = validateFile(file);
  if (!valid) throw new Error(error);

  if (IS_BACKEND_CONFIGURED) return uploadFileResumable(file);
  // Mock: chÆ°a cÃ³ server tháº­t Ä‘á»ƒ táº£i lÃªn, chá»‰ giá»¯ tham chiáº¿u cá»¥c bá»™.
  await new Promise((r) => setTimeout(r, 400));
  const fileRef = `local-${Date.now()}`;
  mockFileRefRegistry.set(fileRef, file);
  return { fileRef, fileName: file.name, fileSizeBytes: file.size };
}

/**
 * XÃ¡c nháº­n + "resolve" 1 link Google Drive.
 * @returns {Promise<{ fileRef: null, driveLink: string, fileName: string|null, fileSizeBytes: number|null }>}
 */
export async function submitGoogleDrive(rawLink) {
  const { valid, error } = validateDriveLink(rawLink);
  if (!valid) throw new Error(error);
  const driveLink = rawLink.trim();

  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DRIVE_RESOLVE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ driveLink }),
    });
    if (!res.ok) throw new Error('KhÃ´ng Ä‘á»c Ä‘Æ°á»£c thÃ´ng tin file tá»« Google Drive');
    const data = await res.json();
    return { fileRef: null, driveLink, ...data };
  }

  // Mock: chÆ°a cÃ³ Backend Ä‘á»ƒ há»i Google Drive tháº­t â€” thÃ nh tháº­t tráº£ vá»
  // "khÃ´ng biáº¿t" thay vÃ¬ bá»‹a tÃªn file/dung lÆ°á»£ng giáº£.
  await new Promise((r) => setTimeout(r, 300));
  return { fileRef: null, driveLink, fileName: null, fileSizeBytes: null };
}

// ============================================================
// 2. Æ¯á»šC TÃNH (dÃ¹ng cho comparison card cá»§a tá»«ng Render Profile)
// ============================================================

/**
 * @param {Object} input - { fileRef, driveLink, fileSizeBytes }
 * @param {string} profileId - xem RENDER_PROFILES
 * @returns {Promise<{ etaSeconds: number, costVnd: number, queueSeconds: number }>}
 */
export async function estimateJob(input, profileId) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ESTIMATE_JOB}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, profileId }),
    });
    if (!res.ok) throw new Error('KhÃ´ng Æ°á»›c tÃ­nh Ä‘Æ°á»£c thá»i gian/giÃ¡');
    return res.json();
  }

  await new Promise((r) => setTimeout(r, 200)); // giáº£ láº­p Ä‘á»™ trá»… gá»i API tháº­t
  return mock.computeEstimate({ fileSizeBytes: input.fileSizeBytes, profileId });
}

// ============================================================
// 3. THANH TOÃN â€” CHá»ˆ tra cá»©u chi tiáº¿t 1 payment ÄÃƒ Tá»’N Táº I (payment
// Ä‘Æ°á»£c Backend tá»± táº¡o bÃªn trong approveJob(), Portal khÃ´ng tá»± táº¡o
// payment Ä‘á»™c láº­p ná»¯a â€” xem CWS_MVP_WORKFLOW_FINAL.md: QR chá»‰ sinh SAU
// khi khÃ¡ch duyá»‡t preview, khÃ´ng pháº£i trÆ°á»›c khi táº¡o job).
// ============================================================

/** Chi tiáº¿t 1 payment (QR/ná»™i dung chuyá»ƒn khoáº£n) â€” dÃ¹ng khi cáº§n hiá»ƒn
 * thá»‹ láº¡i (vd khÃ¡ch táº£i láº¡i trang lÃºc Ä‘ang chá» thanh toÃ¡n).
 * @returns {Promise<{ paymentId: string, status: string, paymentCode: string|null, transferContent: string|null, amountVnd: number, qrImageUrl: string|null }>}
 */
export async function getPaymentDetails(paymentId) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_PAYMENT_STATUS(paymentId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('KhÃ´ng láº¥y Ä‘Æ°á»£c thÃ´ng tin thanh toÃ¡n');
    return res.json();
  }
  return mock.mockGetPaymentDetails(paymentId);
}

// ============================================================
// 4. Táº O & THEO DÃ•I JOB
// ============================================================

/**
 * Táº¡o job render â€” miá»…n phÃ­, khÃ´ng cáº§n thanh toÃ¡n trÆ°á»›c (thanh toÃ¡n
 * chá»‰ diá»…n ra sau khi khÃ¡ch duyá»‡t preview, xem approveJob()).
 * @returns {Promise<{ jobId: string }>}
 */
export async function createJob({ input, profileId }) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_JOB}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...input, profileId }),
    });
    if (!res.ok) throw new Error(`Táº¡o job tháº¥t báº¡i (${res.status})`);
    const data = await res.json();
    return { jobId: data.jobId };
  }

  const downloadSourceFile = input.fileRef ? mockFileRefRegistry.get(input.fileRef) : null;
  const jobId = mock.mockCreateJob({
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    driveLink: input.driveLink,
    software: input.software,
    softwareVersion: input.softwareVersion,
    notes: input.notes,
    profileId,
    downloadSourceFile,
  });
  return { jobId };
}

/**
 * KÃªnh realtime theo dÃµi 1 job â€” mock dÃ¹ng pub-sub ná»™i bá»™ (xem
 * mockBackend.js), Backend tháº­t sáº½ dÃ¹ng WebSocket/SSE tháº­t. Component
 * gá»i hÃ m nÃ y 1 láº§n, nháº­n láº¡i unsubscribe() Ä‘á»ƒ dá»n dáº¹p khi rá»i mÃ n hÃ¬nh.
 *
 * Async vÃ¬ cáº§n láº¥y access token trÆ°á»›c khi má»Ÿ WebSocket (xem
 * subscribeToJobUpdatesReal) â€” Backend kiá»ƒm tra chá»§ sá»Ÿ há»¯u job qua
 * token nÃ y, khÃ´ng cÃ²n gá»­i dá»¯ liá»‡u cÃ´ng khai cho báº¥t ká»³ ai biáº¿t jobId.
 *
 * @returns {Promise<() => void>} unsubscribe
 */
export async function subscribeToJobUpdates(jobId, { onUpdate, onComplete, onError }) {
  if (IS_BACKEND_CONFIGURED) {
    return subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError });
  }
  return mock.mockSubscribeToJob(jobId, { onUpdate, onComplete, onError });
}

/** @returns {Promise<boolean>} */
export async function cancelJob(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CANCEL_JOB(jobId)}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    // Sá»¬A Lá»–I (tá»± phÃ¡t hiá»‡n 31/07/2026): Ä‘Ã¢y lÃ  hÃ m DUY NHáº¤T trong file
    // nÃ y trÆ°á»›c Ä‘Ã¢y "return res.ok" thay vÃ¬ throw khi tháº¥t báº¡i â€” má»i hÃ m
    // khÃ¡c Ä‘á»u throw new Error(...) Ä‘Ãºng quy Æ°á»›c chung. Há»‡ quáº£: khi
    // Backend tá»« chá»‘i huá»· (vd job Ä‘Ã£ AWAITING_PAYMENT trá»Ÿ Ä‘i, xem
    // JobsService.cancel()), lá»—i bá»‹ NUá»T hoÃ n toÃ n, khÃ¡ch báº¥m "Huá»· job"
    // khÃ´ng tháº¥y gÃ¬ xáº£y ra, khÃ´ng cÃ³ pháº£n há»“i nÃ o. Äá»c message tháº­t tá»«
    // Backend (BadRequestException tráº£ vá» lÃ½ do rÃµ rÃ ng) thay vÃ¬ chá»‰ bÃ¡o
    // chung chung.
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || `Huá»· job tháº¥t báº¡i (${res.status})`);
    }
    return true;
  }
  return mock.mockCancelJob(jobId);
}

/** Láº¥y snapshot hiá»‡n táº¡i cá»§a 1 job (dÃ¹ng khi má»Ÿ láº¡i tá»« Job Dashboard). */
export async function getJob(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_JOB(jobId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('KhÃ´ng láº¥y Ä‘Æ°á»£c thÃ´ng tin job');
    return res.json();
  }
  return mock.mockGetJob(jobId);
}

/** Danh sÃ¡ch job (Job Dashboard / History) â€” náº¿u Ä‘Ã£ Ä‘Äƒng nháº­p Google,
 * Backend chá»‰ tráº£ job cá»§a Ä‘Ãºng khÃ¡ch Ä‘Ã³ (xem JobsController.listAll()). */
export async function listJobs() {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LIST_JOBS}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('KhÃ´ng láº¥y Ä‘Æ°á»£c danh sÃ¡ch job');
    return res.json();
  }
  return mock.mockListJobs();
}

/** 3-5 áº£nh preview cÃ³ watermark â€” gá»i khi job á»Ÿ REVIEW_READY.
 * @returns {Promise<{ images: { url: string, displayOrder: number|null }[] }>}
 */
export async function getJobPreview(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_PREVIEW(jobId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('KhÃ´ng láº¥y Ä‘Æ°á»£c áº£nh xem trÆ°á»›c');
    return res.json();
  }
  return mock.mockGetJobPreview(jobId);
}

/** KhÃ¡ch duyá»‡t báº£n preview -> Backend sinh QR MB Bank ngay trong response
 * nÃ y (field `payment`); Ä‘Ã³ng gÃ³i + má»Ÿ link táº£i chá»‰ diá»…n ra SAU khi
 * webhook xÃ¡c nháº­n PAID (job tá»± chuyá»ƒn AWAITING_PAYMENT -> FINISHED). */
export async function approveJob(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APPROVE_JOB(jobId)}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Duyá»‡t káº¿t quáº£ tháº¥t báº¡i');
    return res.json();
  }
  return mock.mockApproveJob(jobId);
}

/** KhÃ¡ch yÃªu cáº§u chá»‰nh sá»­a thay vÃ¬ duyá»‡t â€” CHá»ˆ ghi nháº­n yÃªu cáº§u Ä‘á»ƒ
 * admin liÃªn há»‡ khÃ¡ch, KHÃ”NG tá»± Ä‘á»™ng re-render hay hoÃ n tiá»n (Ä‘Ã³ lÃ 
 * quyáº¿t Ä‘á»‹nh nghiá»‡p vá»¥, xem jobs.service.ts#requestChanges). Job váº«n
 * á»Ÿ REVIEW_READY sau khi gá»i hÃ m nÃ y. */
export async function requestJobChanges(jobId, note) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUEST_CHANGES_JOB(jobId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ note: note || undefined }),
    });
    if (!res.ok) throw new Error('Gá»­i yÃªu cáº§u chá»‰nh sá»­a tháº¥t báº¡i');
    return res.json();
  }
  return mock.mockRequestChanges(jobId, note);
}

/** Tráº¡ng thÃ¡i yÃªu cáº§u chá»‰nh sá»­a cá»§a Ä‘Ãºng job â€” Backend kiá»ƒm tra ownership. */
export async function getJobEditRequests(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_EDIT_REQUESTS(jobId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('KhÃ´ng láº¥y Ä‘Æ°á»£c tráº¡ng thÃ¡i yÃªu cáº§u chá»‰nh sá»­a');
    return res.json();
  }
  return { requests: [] };
}

/**
 * Äá»•i Authorization Bearer láº¥y signed URL TTL 5 phÃºt.
 * Bearer token khÃ´ng Ä‘i vÃ o URL; file navigation Ä‘i tháº³ng tá»›i B2
 * sau khi Backend Ä‘Ã£ kiá»ƒm tra ownership vÃ  ghi audit event.
 */
export async function getDownloadUrl(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD_URL(jobId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`KhÃ´ng láº¥y Ä‘Æ°á»£c signed URL (${res.status})`);
    const data = await res.json();
    return data.url ?? null;
  }
  return mock.mockGetJob(jobId)?.downloadUrl ?? null;
}


// ============================================================
// IMPLEMENTATION THáº¬T (chÆ°a dÃ¹ng vÃ¬ chÆ°a cÃ³ Backend â€” giá»¯ khung sÆ°á»n
// WebSocket sáºµn Ä‘á»ƒ khi Dy ná»‘i Backend chá»‰ cáº§n hoÃ n thiá»‡n, khÃ´ng Ä‘á»•i
// chá»¯ kÃ½ hÃ m subscribeToJobUpdates() á»Ÿ trÃªn).
// ============================================================
async function subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError }) {
  const token = await getAccessToken();
  if (!token) {
    onError?.({ message: 'Cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ theo dÃµi Job', code: 'AUTH_REQUIRED' });
    return () => {};
  }

  const ticketResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_REALTIME_TICKET(jobId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ticketResponse.ok) {
    onError?.({ message: 'KhÃ´ng má»Ÿ Ä‘Æ°á»£c realtime cho Job', code: 'REALTIME_AUTH_FAILED' });
    return () => {};
  }
  const { ticket } = await ticketResponse.json();
  const wsUrl = `${API_CONFIG.WS_BASE_URL}${API_CONFIG.ENDPOINTS.JOB_REALTIME_WS(jobId)}?ticket=${encodeURIComponent(ticket)}`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate?.(data);
      if (data.status === 'finished') onComplete?.(data);
    } catch {
      onError?.({ message: 'Dá»¯ liá»‡u realtime khÃ´ng há»£p lá»‡', code: 'PARSE_ERROR' });
    }
  };
  socket.onerror = () => {
    onError?.({ message: 'Máº¥t káº¿t ná»‘i realtime', code: 'WS_ERROR' });
  };

  return () => socket.close();
}


/** Support ticket tháº­t â€” khÃ´ng giáº£ láº­p ticket trong mock, vÃ¬ ticket pháº£i Ä‘Æ°á»£c Admin xá»­ lÃ½. */
async function supportFetch(path, options = {}) {
  if (!IS_BACKEND_CONFIGURED) throw new Error('Support chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh Backend tháº­t.');
  const token = await getAccessToken();
  if (!token) throw new Error('Cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ gá»­i yÃªu cáº§u há»— trá»£.');
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) throw new Error('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n hoáº·c khÃ´ng cÃ³ quyá»n.');
  if (!res.ok) throw new Error(`YÃªu cáº§u há»— trá»£ tháº¥t báº¡i (${res.status})`);
  return res.json();
}

export function createSupportTicket({ subject, message, jobId = null }) {
  return supportFetch(API_CONFIG.ENDPOINTS.SUPPORT_TICKETS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, message, jobId }),
  });
}

export function listSupportTickets() {
  return supportFetch(API_CONFIG.ENDPOINTS.SUPPORT_TICKETS);
}

async function affiliateFetch(path, options = {}) {
  if (!IS_BACKEND_CONFIGURED) throw new Error('Affiliate cáº§n Backend tháº­t.');
  const token = await getAccessToken();
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || `Affiliate request tháº¥t báº¡i (${res.status})`);
  return body;
}

export function trackAffiliateReferral(referralCode) {
  return affiliateFetch(`${API_CONFIG.ENDPOINTS.AFFILIATE_TRACK}?ref=${encodeURIComponent(referralCode)}`, { method: 'POST' });
}

export function attachAffiliateReferral(attributionToken) {
  return affiliateFetch(API_CONFIG.ENDPOINTS.AFFILIATE_ATTACH, { method: 'POST', body: JSON.stringify({ attributionToken }) });
}

export function registerAffiliate() { return affiliateFetch(API_CONFIG.ENDPOINTS.AFFILIATE_REGISTER, { method: 'POST' }); }
export function getAffiliateDashboard() { return affiliateFetch(API_CONFIG.ENDPOINTS.AFFILIATE_DASHBOARD); }
export function saveAffiliateBankAccount(input) { return affiliateFetch(API_CONFIG.ENDPOINTS.AFFILIATE_BANK_ACCOUNT, { method: 'POST', body: JSON.stringify(input) }); }
export function requestAffiliateWithdrawal(amountVnd) { return affiliateFetch(API_CONFIG.ENDPOINTS.AFFILIATE_WITHDRAWAL, { method: 'POST', body: JSON.stringify({ amountVnd }) }); }
export function sendAffiliateFeedback(input) { return affiliateFetch(API_CONFIG.ENDPOINTS.AFFILIATE_FEEDBACK, { method: 'POST', body: JSON.stringify(input) }); }
