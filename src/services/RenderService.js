// ============================================================
// RenderService — CỔNG DUY NHẤT giao tiếp với Backend CWS.
//
// Mọi hành động Customer đi qua đây. Frontend không gọi thẳng Worker/
// Scheduler và không tự quyết định tài nguyên render. Scheduler tự chọn
// capacity theo deadline/capability thật.
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';
import { validateFile, validateDriveLink, validateMaterializedInput } from '../utils/fileUtils';
import { getAccessToken } from './AuthService';

function requireBackend() {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('CWS Backend chưa được cấu hình; không thể chạy chế độ demo.');
  }
}

export async function uploadFile(file) {
  const { valid, error } = validateFile(file);
  if (!valid) throw new Error(error);
  requireBackend();
  const formData = new FormData();
  formData.append('file', file);
  const token = await getAccessToken();
  if (!token) throw new Error('Cần đăng nhập Google trước khi tải file');
  let res;
  try {
    res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_FILE}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ upload. Vui lòng thử lại.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Tải file thất bại (${res.status})`);
  }
  const data = await res.json();
  const materialized = validateMaterializedInput(data);
  if (!materialized.valid) throw new Error(materialized.error);
  return data;
}

export async function submitGoogleDrive(rawLink) {
  const { valid, error } = validateDriveLink(rawLink);
  if (!valid) throw new Error(error);
  const driveLink = rawLink.trim();

  requireBackend();
  const token = await getAccessToken();
  if (!token) throw new Error('Cần đăng nhập Google trước khi kiểm tra Google Drive');
  let res;
  try {
    res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DRIVE_RESOLVE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ driveLink }),
    });
  } catch {
    throw new Error('Không thể kết nối Google Drive. Vui lòng thử lại.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Không đọc được thông tin file từ Google Drive (${res.status})`);
  }
  const data = await res.json();
  const materialized = validateMaterializedInput(data);
  if (!materialized.valid) throw new Error(materialized.error);
  return { driveLink: data.resolvedDriveLink || driveLink, ...data };
}

export async function getPaymentDetails(paymentId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_PAYMENT_STATUS(paymentId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được thông tin thanh toán');
  return res.json();
}

export async function createJob({ input, idempotencyKey }) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_JOB}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Tạo job thất bại (${res.status})`);
  const data = await res.json();
  return { jobId: data.jobId };
}

export async function subscribeToJobUpdates(jobId, { onUpdate, onComplete, onError }) {
  requireBackend();
  return subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError });
}

export async function cancelJob(jobId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CANCEL_JOB(jobId)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Huỷ job thất bại (${res.status})`);
  }
  return true;
}

export async function getJob(jobId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_JOB(jobId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được thông tin job');
  return res.json();
}

export async function listJobs() {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LIST_JOBS}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được danh sách job');
  return res.json();
}

export async function getJobPreview(jobId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_PREVIEW(jobId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được ảnh xem trước');
  return res.json();
}

export async function approveJob(jobId) {
  requireBackend();
  const token = await getAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APPROVE_JOB(jobId)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không lấy được thông tin thanh toán');
  return res.json();
}

export async function requestJobChanges(jobId, note) {
  requireBackend();
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

export async function getDownloadUrl(jobId) {
  requireBackend();
  const token = await getAccessToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD(jobId)}${tokenParam}`;
}

async function subscribeToJobUpdatesReal(jobId, { onUpdate, onComplete, onError }) {
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
