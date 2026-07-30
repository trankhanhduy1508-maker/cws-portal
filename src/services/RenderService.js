// ============================================================
// RenderService — CỔNG DUY NHẤT giao tiếp với Backend CWS.
//
// Đây là toàn bộ "API Contract" của Frontend: mọi hành động của người
// dùng (chọn file, ước tính, thanh toán, tạo job, theo dõi realtime,
// hủy job, xem lịch sử) đều đi qua các hàm export ở đây. KHÔNG Component
// nào được gọi fetch()/WebSocket trực tiếp, và KHÔNG được gọi thẳng
// Worker/Scheduler — Frontend chỉ nói chuyện với RenderService, Backend
// thật (sau này) mới là nơi biết Worker/Scheduler tồn tại.
//
// HIỆN TẠI: chưa có Backend (IS_BACKEND_CONFIGURED === false) nên mọi
// hàm bên dưới ủy quyền cho `mockBackend.js` — 1 "server giả" có state
// sống độc lập với UI (xem comment trong file đó). Khi Dy nối Backend
// thật, chỉ cần hoàn thiện các hàm `*Real` trong file này, KHÔNG đổi
// tên hàm export hay shape tham số/callback — Component/Hook không cần
// sửa gì.
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';
import * as mock from './mockBackend';
import { validateFile, validateDriveLink } from '../utils/fileUtils';
import { getAccessToken } from './AuthService';

// Giữ tham chiếu File thật theo fileRef — CHỈ dùng ở mock mode để tạo
// Blob URL placeholder lúc job hoàn thành (xem ghi chú "download thật"
// trong PreviewDownloadScreen). Backend thật không cần cấu trúc này vì
// server thật giữ file thật, không phải trình duyệt.
const mockFileRefRegistry = new Map();

// ============================================================
// 1. UPLOAD FILE / GOOGLE DRIVE
// ============================================================

/**
 * "Tải lên" 1 file đã được validate cú pháp (xem utils/fileUtils).
 * Trả về 1 "fileRef" — tham chiếu để các bước sau (estimate, createJob)
 * dùng lại, thay vì phải truyền cả File object qua nhiều tầng.
 *
 * @returns {Promise<{ fileRef: string, fileName: string, fileSizeBytes: number }>}
 */
export async function uploadFile(file) {
  const { valid, error } = validateFile(file);
  if (!valid) throw new Error(error);

  if (IS_BACKEND_CONFIGURED) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_FILE}`, {
      method: 'POST', body: formData,
    });
    if (!res.ok) throw new Error(`Tải file thất bại (${res.status})`);
    return res.json();
  }

  // Mock: chưa có server thật để tải lên, chỉ giữ tham chiếu cục bộ.
  await new Promise((r) => setTimeout(r, 400));
  const fileRef = `local-${Date.now()}`;
  mockFileRefRegistry.set(fileRef, file);
  return { fileRef, fileName: file.name, fileSizeBytes: file.size };
}

/**
 * Xác nhận + "resolve" 1 link Google Drive.
 * @returns {Promise<{ fileRef: null, driveLink: string, fileName: string|null, fileSizeBytes: number|null }>}
 */
export async function submitGoogleDrive(rawLink) {
  const { valid, error } = validateDriveLink(rawLink);
  if (!valid) throw new Error(error);
  const driveLink = rawLink.trim();

  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DRIVE_RESOLVE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driveLink }),
    });
    if (!res.ok) throw new Error('Không đọc được thông tin file từ Google Drive');
    const data = await res.json();
    return { fileRef: null, driveLink, ...data };
  }

  // Mock: chưa có Backend để hỏi Google Drive thật — thành thật trả về
  // "không biết" thay vì bịa tên file/dung lượng giả.
  await new Promise((r) => setTimeout(r, 300));
  return { fileRef: null, driveLink, fileName: null, fileSizeBytes: null };
}

// ============================================================
// 2. ƯỚC TÍNH (dùng cho comparison card của từng Render Profile)
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
    if (!res.ok) throw new Error('Không ước tính được thời gian/giá');
    return res.json();
  }

  await new Promise((r) => setTimeout(r, 200)); // giả lập độ trễ gọi API thật
  return mock.computeEstimate({ fileSizeBytes: input.fileSizeBytes, profileId });
}

// ============================================================
// 3. THANH TOÁN
// ============================================================

/**
 * @returns {Promise<{ paymentId: string, status: string }>}
 */
export async function createPaymentIntent({ amountVnd, method }) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_PAYMENT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountVnd, method }),
    });
    if (!res.ok) throw new Error('Không tạo được giao dịch thanh toán');
    return res.json();
  }
  return mock.mockCreatePaymentIntent({ amountVnd, method });
}

/** @returns {Promise<{ paymentId: string, status: string }>} */
export async function getPaymentStatus(paymentId) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_PAYMENT_STATUS(paymentId)}`);
  if (!res.ok) throw new Error('Không lấy được trạng thái thanh toán');
  return res.json();
}

const PAYMENT_POLL_INTERVAL_MS = 3000;
const PAYMENT_POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút — đủ thời gian khách mở app ngân hàng chuyển khoản

/**
 * Backend thật: KHÔNG có nút "xác nhận" nào để Frontend tự đặt PAID —
 * chỉ webhook ngân hàng mới làm được việc đó (xem payments.controller.ts).
 * Hàm này chờ bằng cách poll trạng thái, giữ nguyên chữ ký/hành vi cũ
 * (trả về khi PAID) để usePayment.js không cần đổi gì.
 * @returns {Promise<{ paymentId: string, status: string }>}
 */
export async function confirmPayment({ paymentId, method }) {
  if (IS_BACKEND_CONFIGURED) {
    const start = Date.now();
    while (Date.now() - start < PAYMENT_POLL_TIMEOUT_MS) {
      const { status } = await getPaymentStatus(paymentId);
      if (status === 'paid' || status === 'failed') return { paymentId, status };
      await new Promise((r) => setTimeout(r, PAYMENT_POLL_INTERVAL_MS));
    }
    throw new Error('Hết thời gian chờ xác nhận thanh toán — vui lòng thử lại');
  }
  return mock.mockConfirmPayment({ paymentId, method });
}

// ============================================================
// 4. TẠO & THEO DÕI JOB
// ============================================================

/**
 * Tạo job render — CHỈ gọi sau khi thanh toán thành công.
 * @returns {Promise<{ jobId: string }>}
 */
export async function createJob({ input, profileId, paymentId }) {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_JOB}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...input, profileId, paymentId }),
    });
    if (!res.ok) throw new Error(`Tạo job thất bại (${res.status})`);
    const data = await res.json();
    return { jobId: data.jobId };
  }

  const downloadSourceFile = input.fileRef ? mockFileRefRegistry.get(input.fileRef) : null;
  const jobId = mock.mockCreateJob({
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    driveLink: input.driveLink,
    profileId,
    paymentId,
    downloadSourceFile,
  });
  return { jobId };
}

/**
 * Kênh realtime theo dõi 1 job — mock dùng pub-sub nội bộ (xem
 * mockBackend.js), Backend thật sẽ dùng WebSocket/SSE thật. Component
 * gọi hàm này 1 lần, nhận lại unsubscribe() để dọn dẹp khi rời màn hình.
 *
 * @returns {() => void} unsubscribe
 */
export function subscribeToJobUpdates(jobId, { onUpdate, onComplete, onError }) {
  if (IS_BACKEND_CONFIGURED) {
    return subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError });
  }
  return mock.mockSubscribeToJob(jobId, { onUpdate, onComplete, onError });
}

/** @returns {Promise<boolean>} */
export async function cancelJob(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CANCEL_JOB(jobId)}`, { method: 'POST' });
    return res.ok;
  }
  return mock.mockCancelJob(jobId);
}

/** Lấy snapshot hiện tại của 1 job (dùng khi mở lại từ Job Dashboard). */
export async function getJob(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_JOB(jobId)}`);
    if (!res.ok) throw new Error('Không lấy được thông tin job');
    return res.json();
  }
  return mock.mockGetJob(jobId);
}

/** Danh sách job (Job Dashboard / History) — nếu đã đăng nhập Facebook,
 * Backend chỉ trả job của đúng khách đó (xem JobsController.listAll()). */
export async function listJobs() {
  if (IS_BACKEND_CONFIGURED) {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LIST_JOBS}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Không lấy được danh sách job');
    return res.json();
  }
  return mock.mockListJobs();
}

/** 3-5 ảnh preview có watermark — gọi khi job ở REVIEW_READY.
 * @returns {Promise<{ images: { url: string, displayOrder: number|null }[] }>}
 */
export async function getJobPreview(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_PREVIEW(jobId)}`);
    if (!res.ok) throw new Error('Không lấy được ảnh xem trước');
    return res.json();
  }
  return mock.mockGetJobPreview(jobId);
}

/** Khách duyệt bản preview -> đóng gói kết quả cuối + mở link tải. */
export async function approveJob(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APPROVE_JOB(jobId)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Duyệt kết quả thất bại');
    return res.json();
  }
  return mock.mockApproveJob(jobId);
}

/** URL tải file kết quả theo jobId. */
export function getDownloadUrl(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD(jobId)}`;
  }
  return mock.mockGetJob(jobId)?.downloadUrl ?? null;
}

// ============================================================
// IMPLEMENTATION THẬT (chưa dùng vì chưa có Backend — giữ khung sườn
// WebSocket sẵn để khi Dy nối Backend chỉ cần hoàn thiện, không đổi
// chữ ký hàm subscribeToJobUpdates() ở trên).
// ============================================================
function subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError }) {
  const wsUrl = `${API_CONFIG.WS_BASE_URL}${API_CONFIG.ENDPOINTS.JOB_REALTIME_WS(jobId)}`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate?.(data);
      if (data.status === 'finished') onComplete?.(data);
    } catch {
      onError?.({ message: 'Dữ liệu realtime không hợp lệ', code: 'PARSE_ERROR' });
    }
  };
  socket.onerror = () => {
    onError?.({ message: 'Mất kết nối realtime', code: 'WS_ERROR' });
  };

  return () => socket.close();
}
