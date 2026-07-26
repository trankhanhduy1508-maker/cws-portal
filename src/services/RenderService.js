// ============================================================
// RenderService — CỔNG DUY NHẤT để giao tiếp với Backend CWS.
//
// QUY TẮC BẮT BUỘC: không Component nào được gọi fetch()/axios trực tiếp.
// Mọi thao tác tạo Job, theo dõi tiến trình, tải kết quả, hủy job, lấy
// lịch sử đều phải đi qua đây. Lý do: khi Backend CWS thật hoàn thành,
// chỉ cần viết lại PHẦN THÂN của các hàm bên dưới (giữ nguyên tên hàm +
// shape tham số/callback), không phải sửa bất kỳ Component/Hook nào
// đang gọi RenderService.
//
// HIỆN TẠI: chưa có Backend (IS_BACKEND_CONFIGURED === false), nên mọi
// hàm bên dưới chạy bằng mock nội bộ (giả lập trạng thái, không gọi mạng
// thật). Khi Dy nối Backend thật, sửa đúng file này.
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';
import { JOB_STATUS, STAGE_SEQUENCE, JOB_HISTORY_STATUS } from '../constants/renderConstants';

const MOCK_STAGE_DURATIONS_MS = {
  [JOB_STATUS.UPLOADING]: 1200,
  [JOB_STATUS.PREPARING]: 1400,
  [JOB_STATUS.WAITING_WORKER]: 1400,
  [JOB_STATUS.RENDERING]: 3200,
  [JOB_STATUS.PACKAGING]: 1000,
};

// ============================================================
// 1. TẠO & THEO DÕI JOB
// ============================================================

/**
 * Tạo và theo dõi 1 render job.
 *
 * @param {Object} params
 * @param {File|null} params.file - file người dùng đã chọn (null nếu dùng Google Drive)
 * @param {string|null} params.driveLink - link Google Drive (null nếu dùng file trực tiếp)
 * @param {string} params.speed - id tốc độ render (xem RENDER_SPEEDS)
 * @param {(status: string, progressWithinStage: number) => void} params.onProgress
 * @param {(result: { previewUrl: string, downloadUrl: string, durationSec: number, resultSizeBytes: number }) => void} params.onComplete
 * @param {(error: { message: string, code: string }) => void} params.onError
 *
 * @returns {{ cancel: () => void, jobId: string }}
 */
export function submitRenderJob({ file, driveLink, speed, onProgress, onComplete, onError }) {
  if (IS_BACKEND_CONFIGURED) {
    return submitRenderJobReal({ file, driveLink, speed, onProgress, onComplete, onError });
  }
  return submitRenderJobMock({ file, driveLink, speed, onProgress, onComplete, onError });
}

/**
 * Hủy 1 job đang chạy. Trả về Promise<boolean> — true nếu hủy thành công.
 * Component nên gọi cancel() (trả về từ submitRenderJob) để dừng theo dõi
 * ở FE NGAY LẬP TỨC, và gọi hàm này để báo Backend hủy job thật (khi có).
 */
export async function cancelJob(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_CANCEL(jobId)}`, { method: 'POST' });
    return res.ok;
  }
  // Mock: không có job thật ở Backend để hủy, luôn trả về thành công.
  return true;
}

/**
 * Ước tính thời gian & giá TRƯỚC khi bắt đầu render — dùng cho màn hình
 * xác nhận Job. Mock hiện tại tính dựa trên dung lượng file (heuristic
 * đơn giản), KHÔNG phải công thức thật — Backend thật sẽ thay bằng ước
 * tính dựa trên phân tích scene thật (xem Render Optimizer ở phần khác
 * của hệ thống CWS).
 *
 * @returns {Promise<{ etaSeconds: number, priceVnd: number }>}
 */
export async function getJobEstimate({ file, driveLink, speed }) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_ESTIMATE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file?.name, fileSize: file?.size, driveLink, speed }),
    });
    if (!res.ok) throw new Error('Không ước tính được thời gian/giá');
    return res.json();
  }

  // Mock: heuristic thô dựa trên dung lượng file, chỉ để có số hiển thị,
  // KHÔNG phản ánh thời gian/giá thật. Thay bằng API thật khi có Backend.
  const sizeMb = file ? file.size / (1024 * 1024) : 80; // giả định 80MB nếu dùng Drive link (chưa biết dung lượng thật)
  const speedMultiplier = { eco: 1.6, standard: 1.0, fast: 0.65, ultra: 0.4 }[speed] ?? 1.0;
  const etaSeconds = Math.round(Math.max(180, sizeMb * 9 * speedMultiplier));
  const priceVnd = Math.round(Math.max(15000, sizeMb * 380 * (1 / speedMultiplier)) / 1000) * 1000;

  await new Promise((r) => setTimeout(r, 350)); // giả lập độ trễ gọi API thật
  return { etaSeconds, priceVnd };
}

/**
 * Lấy trạng thái hàng đợi HIỆN TẠI (trước khi job bắt đầu render) — dùng
 * để hiển thị "đang chờ bao nhiêu máy xử lý trước". Mock trả về số ngẫu
 * nhiên nhỏ, Backend thật sẽ trả về số liệu thật từ Worker Pool.
 *
 * @returns {Promise<{ workersAhead: number, etaStartSeconds: number }>}
 */
export async function getQueueStatus() {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QUEUE_STATUS}`);
    if (!res.ok) throw new Error('Không lấy được trạng thái hàng đợi');
    return res.json();
  }
  // Mock: phần lớn trường hợp không phải chờ (workersAhead = 0), thỉnh
  // thoảng giả lập có chờ để UI có cái mà hiển thị lúc demo.
  const workersAhead = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
  return { workersAhead, etaStartSeconds: workersAhead * 240 };
}

/**
 * Trả về URL tải file kết quả theo jobId (dùng khi mở lại 1 job cũ từ
 * Job History, không phải job vừa submit trong phiên hiện tại).
 */
export function getDownloadUrl(jobId) {
  if (IS_BACKEND_CONFIGURED) {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD(jobId)}`;
  }
  return null;
}

// ============================================================
// 2. GOOGLE DRIVE
// ============================================================

/**
 * "Resolve" 1 link Google Drive — cố gắng lấy tên file/kích thước NẾU
 * Backend hỗ trợ (cần Backend gọi Google Drive API bằng OAuth/API key
 * riêng, KHÔNG thể làm từ trình duyệt do CORS + quyền truy cập).
 *
 * Mock hiện tại KHÔNG thể biết tên file thật (vì chưa có Backend), nên
 * trả về null cho các trường không biết được — UI cần xử lý trường hợp
 * "không rõ tên file" một cách rõ ràng, không bịa dữ liệu giả.
 *
 * @returns {Promise<{ fileName: string|null, fileSizeBytes: number|null }>}
 */
export async function resolveDriveLink(driveLink) {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DRIVE_RESOLVE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driveLink }),
    });
    if (!res.ok) throw new Error('Không đọc được thông tin file từ Google Drive');
    return res.json();
  }
  // Mock: chưa có Backend để hỏi Google Drive thật, nên thành thật trả
  // về "không biết" thay vì bịa tên file/dung lượng giả.
  await new Promise((r) => setTimeout(r, 300));
  return { fileName: null, fileSizeBytes: null };
}

// ============================================================
// 3. JOB HISTORY
// ============================================================

const MOCK_HISTORY_STORAGE_KEY = 'cws_mock_job_history';

/**
 * Lấy danh sách Job đã submit trước đó (Job History).
 * @returns {Promise<Array<{ id, fileName, status, createdAt, durationSec, downloadUrl }>>}
 */
export async function getJobHistory() {
  if (IS_BACKEND_CONFIGURED) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_HISTORY}`);
    if (!res.ok) throw new Error('Không lấy được lịch sử render');
    return res.json();
  }
  // Mock: đọc từ sessionStorage — chỉ tồn tại trong phiên trình duyệt
  // hiện tại, KHÔNG phải dữ liệu thật lưu trên server. Mất khi đóng tab.
  try {
    const raw = sessionStorage.getItem(MOCK_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Ghi 1 job vào lịch sử mock (chỉ dùng nội bộ khi IS_BACKEND_CONFIGURED === false) */
function appendMockHistory(entry) {
  try {
    const existing = JSON.parse(sessionStorage.getItem(MOCK_HISTORY_STORAGE_KEY) || '[]');
    existing.unshift(entry);
    sessionStorage.setItem(MOCK_HISTORY_STORAGE_KEY, JSON.stringify(existing.slice(0, 20)));
  } catch {
    // sessionStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt) — bỏ
    // qua an toàn, Job History mock chỉ là tiện ích demo, không quan trọng.
  }
}

// ============================================================
// IMPLEMENTATION THẬT (chưa dùng vì chưa có Backend — giữ sẵn khung sườn)
// ============================================================
function submitRenderJobReal({ file, driveLink, speed, onProgress, onComplete, onError }) {
  const controller = new AbortController();
  let jobId = null;

  (async () => {
    try {
      let createRes;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('speed', speed);
        createRes = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_JOB}`, {
          method: 'POST', body: formData, signal: controller.signal,
        });
      } else {
        createRes = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_JOB}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driveLink, speed }),
          signal: controller.signal,
        });
      }
      if (!createRes.ok) throw new Error(`Tạo job thất bại (${createRes.status})`);
      const created = await createRes.json();
      jobId = created.jobId;

      await pollJobStatus(jobId, controller.signal, onProgress, onComplete);
    } catch (err) {
      if (err.name === 'AbortError') return;
      onError({ message: err.message || 'Có lỗi xảy ra', code: 'NETWORK_ERROR' });
    }
  })();

  return { cancel: () => controller.abort(), jobId };
}

async function pollJobStatus(jobId, signal, onProgress, onComplete) {
  const POLL_INTERVAL_MS = 2000;
  while (!signal.aborted) {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_STATUS(jobId)}`, { signal });
    if (!res.ok) throw new Error(`Không lấy được trạng thái job (${res.status})`);
    const data = await res.json();

    onProgress(data.status, data.stageProgress ?? 0);

    if (data.status === JOB_STATUS.FINISHED) {
      onComplete({
        previewUrl: data.previewUrl,
        downloadUrl: data.downloadUrl,
        durationSec: data.durationSec,
        resultSizeBytes: data.resultSizeBytes,
      });
      return;
    }
    if (data.status === JOB_STATUS.ERROR) {
      throw new Error(data.errorMessage || 'Render thất bại');
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// ============================================================
// MOCK IMPLEMENTATION — dùng hiện tại vì chưa có Backend thật.
// ============================================================
function submitRenderJobMock({ file, driveLink, speed: _speed, onProgress, onComplete, onError: _onError }) {
  let cancelled = false;
  const jobId = `mock-${Date.now()}`;
  const stages = STAGE_SEQUENCE.map((s) => s.key);
  let stageIdx = 0;
  let rafId = null;
  const startedAt = Date.now();

  function runStage() {
    if (cancelled) return;

    if (stageIdx >= stages.length - 1) {
      onProgress(JOB_STATUS.FINISHED, 1);
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      // CHƯA CÓ BACKEND: chưa có file render thật để trả về. Dùng Blob
      // URL THẬT của chính file gốc (nếu có) — cơ chế <a download> vẫn
      // là cơ chế tải thật, chỉ nội dung là placeholder. Nếu người dùng
      // dùng Google Drive (không có File object), không có gì để tạo
      // Blob URL — downloadUrl sẽ là null, UI cần xử lý rõ ràng.
      const placeholderDownloadUrl = file ? URL.createObjectURL(file) : null;
      const resultSizeBytes = file ? file.size : null;

      appendMockHistory({
        id: jobId,
        fileName: file?.name || (driveLink ? '(File từ Google Drive)' : 'Không rõ tên file'),
        status: JOB_HISTORY_STATUS.COMPLETED,
        createdAt: startedAt,
        durationSec,
        downloadUrl: placeholderDownloadUrl,
      });

      onComplete({
        previewUrl: null,
        downloadUrl: placeholderDownloadUrl,
        isPlaceholder: true,
        durationSec,
        resultSizeBytes,
      });
      return;
    }

    const stageKey = stages[stageIdx];
    const duration = MOCK_STAGE_DURATIONS_MS[stageKey] ?? 1500;
    const start = performance.now();

    function tick(now) {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      onProgress(stageKey, t);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        stageIdx += 1;
        runStage();
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  runStage();

  return {
    jobId,
    cancel: () => {
      if (!cancelled) {
        appendMockHistory({
          id: jobId,
          fileName: file?.name || (driveLink ? '(File từ Google Drive)' : 'Không rõ tên file'),
          status: JOB_HISTORY_STATUS.CANCELLED,
          createdAt: startedAt,
          durationSec: Math.round((Date.now() - startedAt) / 1000),
          downloadUrl: null,
        });
      }
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}
