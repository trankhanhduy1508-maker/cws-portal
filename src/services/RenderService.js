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
// Production path chỉ gọi Backend thật. Nếu thiếu cấu hình, request phải fail
// rõ ràng thay vì tạo job/progress/payment giả trong trình duyệt.
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';
import { validateFile, validateDriveLink } from '../utils/fileUtils';
import { getAccessToken } from './AuthService';

function requireBackend() {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('CWS Backend chưa được cấu hình; không thể chạy chế độ demo.');
  }
}

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
  requireBackend();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_FILE}`, {
    method: 'POST', body: formData,
  });
  if (!res.ok) throw new Error(`Tải file thất bại (${res.status})`);
  return res.json();
}

/**
 * Xác nhận + "resolve" 1 link Google Drive.
 * @returns {Promise<{ fileRef: null, driveLink: string, fileName: string|null, fileSizeBytes: number|null }>}
 */
export async function submitGoogleDrive(rawLink) {
  const { valid, error } = validateDriveLink(rawLink);
  if (!valid) throw new Error(error);
  const driveLink = rawLink.trim();

  requireBackend();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DRIVE_RESOLVE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driveLink }),
  });
  if (!res.ok) throw new Error('Không đọc được thông tin file từ Google Drive');
  const data = await res.json();
  return { fileRef: null, driveLink: data.resolvedDriveLink || driveLink, ...data };
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
  requireBackend();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ESTIMATE_JOB}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, profileId }),
  });
  if (!res.ok) throw new Error('Không ước tính được thời gian/giá');
  return res.json();
}

// ============================================================
// 3. THANH TOÁN — CHỈ tra cứu chi tiết 1 payment ĐÃ TỒN TẠI (payment
// được Backend tự tạo bên trong approveJob(), Portal không tự tạo
// payment độc lập nữa — xem CWS_MVP_WORKFLOW_FINAL.md: QR chỉ sinh SAU
// khi khách duyệt preview, không phải trước khi tạo job).
// ============================================================

/** Chi tiết 1 payment (QR/nội dung chuyển khoản) — dùng khi cần hiển
 * thị lại (vd khách tải lại trang lúc đang chờ thanh toán).
 * @returns {Promise<{ paymentId: string, status: string, paymentCode: string|null, transferContent: string|null, amountVnd: number, qrImageUrl: string|null }>}
 */
export async function getPaymentDetails(paymentId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_PAYMENT_STATUS(paymentId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được thông tin thanh toán');
  return res.json();
}

// ============================================================
// 4. TẠO & THEO DÕI JOB
// ============================================================

/**
 * Tạo job render — miễn phí, không cần thanh toán trước (thanh toán
 * chỉ diễn ra sau khi khách duyệt preview, xem approveJob()).
 * @returns {Promise<{ jobId: string }>}
 */
export async function createJob({ input, profileId, idempotencyKey }) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_JOB}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...input, profileId }),
  });
  if (!res.ok) throw new Error(`Tạo job thất bại (${res.status})`);
  const data = await res.json();
  return { jobId: data.jobId };
}

/**
 * Kênh realtime theo dõi 1 job — mock dùng pub-sub nội bộ (xem
 * mockBackend.js), Backend thật sẽ dùng WebSocket/SSE thật. Component
 * gọi hàm này 1 lần, nhận lại unsubscribe() để dọn dẹp khi rời màn hình.
 *
 * Async vì cần lấy access token trước khi mở WebSocket (xem
 * subscribeToJobUpdatesReal) — Backend kiểm tra chủ sở hữu job qua
 * token này, không còn gửi dữ liệu công khai cho bất kỳ ai biết jobId.
 *
 * @returns {Promise<() => void>} unsubscribe
 */
export async function subscribeToJobUpdates(jobId, { onUpdate, onComplete, onError }) {
  requireBackend();
  return subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError });
}

/** @returns {Promise<boolean>} */
export async function cancelJob(jobId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CANCEL_JOB(jobId)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
    // SỬA LỖI (tự phát hiện 31/07/2026): đây là hàm DUY NHẤT trong file
    // này trước đây "return res.ok" thay vì throw khi thất bại — mọi hàm
    // khác đều throw new Error(...) đúng quy ước chung. Hệ quả: khi
    // Backend từ chối huỷ (vd job đã AWAITING_PAYMENT trở đi, xem
    // JobsService.cancel()), lỗi bị NUỐT hoàn toàn, khách bấm "Huỷ job"
    // không thấy gì xảy ra, không có phản hồi nào. Đọc message thật từ
    // Backend (BadRequestException trả về lý do rõ ràng) thay vì chỉ báo
    // chung chung.
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || `Huỷ job thất bại (${res.status})`);
    }
  return true;
}

/** Lấy snapshot hiện tại của 1 job (dùng khi mở lại từ Job Dashboard). */
export async function getJob(jobId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_JOB(jobId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được thông tin job');
  return res.json();
}

/** Danh sách job (Job Dashboard / History) — nếu đã đăng nhập Google,
 * Backend chỉ trả job của đúng khách đó (xem JobsController.listAll()). */
export async function listJobs() {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LIST_JOBS}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được danh sách job');
  return res.json();
}

/** 3-5 ảnh preview có watermark — gọi khi job ở REVIEW_READY.
 * @returns {Promise<{ images: { url: string, displayOrder: number|null }[] }>}
 */
export async function getJobPreview(jobId) {
  requireBackend();
  {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_PREVIEW(jobId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Không lấy được ảnh xem trước');
    return res.json();
  }
}

/** Khách duyệt bản preview -> Backend sinh QR MB Bank ngay trong response
 * này (field `payment`); đóng gói + mở link tải chỉ diễn ra SAU khi
 * webhook xác nhận PAID (job tự chuyển AWAITING_PAYMENT -> FINISHED). */
export async function approveJob(jobId) {
  requireBackend();
  {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APPROVE_JOB(jobId)}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Duyệt kết quả thất bại');
    return res.json();
  }
}

/** Khách yêu cầu chỉnh sửa thay vì duyệt — CHỈ ghi nhận yêu cầu để
 * admin liên hệ khách, KHÔNG tự động re-render hay hoàn tiền (đó là
 * quyết định nghiệp vụ, xem jobs.service.ts#requestChanges). Job vẫn
 * ở REVIEW_READY sau khi gọi hàm này. */
export async function requestJobChanges(jobId, note) {
  requireBackend();
  {
    const token = await getAccessToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUEST_CHANGES_JOB(jobId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ note: note || undefined }),
    });
    if (!res.ok) throw new Error('Gửi yêu cầu chỉnh sửa thất bại');
    return res.json();
  }
}

/**
 * URL tải file kết quả theo jobId — dùng thẳng làm `href`/`window.open()`
 * (điều hướng trình duyệt thật, KHÔNG qua `fetch()`), nên phải đính token
 * qua query string `?token=` giống `subscribeToJobUpdatesReal()` — trình
 * duyệt không set được Authorization header cho điều hướng thường.
 * Thiếu bước này thì Backend sẽ coi khách đã đăng nhập là ẩn danh, tự
 * chặn nhầm (403) chính chủ job của họ (xem optional-auth.util.ts).
 *
 * Async vì cần `await getAccessToken()` trước khi ghép URL — nơi gọi
 * phải `await` trước khi dùng làm `href`/`window.open()`.
 * @returns {Promise<string|null>}
 */
export async function getDownloadUrl(jobId) {
  requireBackend();
  {
    const token = await getAccessToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD(jobId)}${tokenParam}`;
  }
}

// ============================================================
// IMPLEMENTATION THẬT (chưa dùng vì chưa có Backend — giữ khung sườn
// WebSocket sẵn để khi Dy nối Backend chỉ cần hoàn thiện, không đổi
// chữ ký hàm subscribeToJobUpdates() ở trên).
// ============================================================
async function subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError }) {
  // Token qua query string vì WebSocket() của trình duyệt không set được
  // custom header — Backend đọc lại qua resolveCustomerId() để kiểm tra
  // chủ sở hữu job trước khi gửi bất kỳ dữ liệu nào (xem jobs-realtime.server.ts).
  const token = await getAccessToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const wsUrl = `${API_CONFIG.WS_BASE_URL}${API_CONFIG.ENDPOINTS.JOB_REALTIME_WS(jobId)}${tokenParam}`;
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
