// ============================================================
// MOCK BACKEND — CHỈ dùng khi chưa có Backend thật (IS_BACKEND_CONFIGURED
// === false). Đây KHÔNG phải "giả tiến trình trong UI" — state của job
// sống ở đây (module scope + sessionStorage), độc lập với bất kỳ
// Component nào. UI chỉ là subscriber: đăng ký nghe, hủy đăng ký, không
// giữ state tiến trình cho riêng mình. Đây chính là mô hình client-server
// thật (job chạy phía "server" bất kể client có đang nghe hay không),
// chỉ khác là "server" ở đây là 1 module JS thay vì máy chủ thật.
//
// Khi có Backend thật: RenderService.js sẽ KHÔNG gọi module này nữa,
// mà gọi thẳng fetch()/WebSocket thật — xem các hàm *Real trong
// RenderService.js.
// ============================================================

import { JOB_STATUS, STAGE_SEQUENCE, PAYMENT_STATUS, RENDER_PROFILES } from '../constants/renderConstants';

const STORAGE_KEY = 'cws_mock_jobs_v2';

// Thời lượng animation NỘI BỘ cho demo (giây thật của trình duyệt, KHÔNG
// phải ETA hiển thị cho khách — ETA hiển thị dùng công thức riêng, thực
// tế hơn nhiều). Tách biệt 2 khái niệm này là chủ ý: khách thấy ETA hợp
// lý (vd "còn 32 phút"), nhưng demo chạy nhanh để test được ngay.
const DEMO_STAGE_DURATION_MS = {
  [JOB_STATUS.QUEUED]: 800,
  [JOB_STATUS.SEARCHING_WORKERS]: 1000,
  [JOB_STATUS.ALLOCATING_WORKERS]: 1000,
  [JOB_STATUS.WORKERS_CONNECTED]: 700,
  [JOB_STATUS.RENDERING]: 3500,
  [JOB_STATUS.PACKAGING]: 1000,
};

function loadJobs() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveJobs(jobs) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // sessionStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt) — bỏ
    // qua an toàn, đây chỉ là tiện ích demo, không phải dữ liệu quan trọng.
  }
}

const jobsStore = loadJobs();
const subscribersByJob = new Map(); // jobId -> Set<{ onUpdate, onComplete, onError }>
const timersByJob = new Map(); // jobId -> { cancelled }

function persist() {
  saveJobs(jobsStore);
}

function notify(jobId) {
  const job = jobsStore[jobId];
  const subs = subscribersByJob.get(jobId);
  if (!job || !subs) return;
  subs.forEach((sub) => sub.onUpdate?.(job));
}

function notifyComplete(jobId) {
  const job = jobsStore[jobId];
  const subs = subscribersByJob.get(jobId);
  if (!job || !subs) return;
  subs.forEach((sub) => sub.onComplete?.(job));
}

// ============================================================
// ƯỚC TÍNH (dùng cho cả comparison card lúc chọn Profile lẫn lúc chạy
// thật) — heuristic thô dựa trên dung lượng file, KHÔNG phải công thức
// thật. Backend thật sẽ thay bằng ước tính dựa trên phân tích scene.
// ============================================================
export function computeEstimate({ fileSizeBytes, profileId }) {
  const profile = RENDER_PROFILES.find((p) => p.id === profileId);
  const sizeMb = fileSizeBytes ? fileSizeBytes / (1024 * 1024) : 80;

  const baseEtaSeconds = Math.max(180, sizeMb * 9);
  const baseCostVnd = Math.max(15000, sizeMb * 380);
  const baseQueueSeconds = Math.random() < 0.3 ? (Math.floor(Math.random() * 3) + 1) * 240 : 0;

  return {
    etaSeconds: Math.round(baseEtaSeconds * profile.durationMultiplier),
    costVnd: Math.round((baseCostVnd * profile.costMultiplier) / 1000) * 1000,
    queueSeconds: Math.round(baseQueueSeconds * profile.queueMultiplier),
  };
}

// ============================================================
// PAYMENT (mock)
// ============================================================
export async function mockCreatePaymentIntent({ amountVnd, method }) {
  await new Promise((r) => setTimeout(r, 300));
  return { paymentId: `pay-${Date.now()}`, amountVnd, method, status: PAYMENT_STATUS.PROCESSING };
}

export async function mockConfirmPayment({ paymentId, method }) {
  // Ví CWS: xác nhận ngay. QR ngân hàng: giả lập độ trễ như đang chờ
  // khách quét mã xong. Đây là DEMO — không có giao dịch tiền thật nào
  // xảy ra.
  const delayMs = method === 'wallet' ? 400 : 1800;
  await new Promise((r) => setTimeout(r, delayMs));
  return { paymentId, status: PAYMENT_STATUS.PAID };
}

// ============================================================
// JOB LIFECYCLE (mock)
// ============================================================
export function mockCreateJob({ fileName, fileSizeBytes, driveLink, profileId, paymentId, downloadSourceFile }) {
  const jobId = `job-${Date.now()}`;
  const estimate = computeEstimate({ fileSizeBytes, profileId });

  jobsStore[jobId] = {
    id: jobId,
    projectName: fileName || (driveLink ? '(File từ Google Drive)' : 'Không rõ tên file'),
    profileId,
    status: estimate.queueSeconds > 0 ? JOB_STATUS.QUEUED : JOB_STATUS.SEARCHING_WORKERS,
    stageProgress: 0,
    paymentId,
    paymentStatus: PAYMENT_STATUS.PAID,
    estimate,
    createdAt: Date.now(),
    downloadUrl: null,
    durationSec: null,
    resultSizeBytes: null,
  };
  persist();

  runSimulation(jobId, downloadSourceFile);
  return jobId;
}

function runSimulation(jobId, downloadSourceFile) {
  timersByJob.set(jobId, { cancelled: false });
  const stages = STAGE_SEQUENCE.map((s) => s.key);
  const job = jobsStore[jobId];
  let stageIdx = stages.indexOf(job.status);
  if (stageIdx < 0) stageIdx = 0;
  const startedAt = Date.now();

  function isCancelled() {
    return timersByJob.get(jobId)?.cancelled;
  }

  function step() {
    if (isCancelled()) return;

    if (stageIdx >= stages.length - 1) {
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      const downloadUrl = downloadSourceFile ? URL.createObjectURL(downloadSourceFile) : null;
      jobsStore[jobId] = {
        ...jobsStore[jobId],
        status: JOB_STATUS.FINISHED,
        stageProgress: 1,
        durationSec,
        downloadUrl,
        resultSizeBytes: downloadSourceFile ? downloadSourceFile.size : null,
        isPlaceholder: true,
      };
      persist();
      notify(jobId);
      notifyComplete(jobId);
      return;
    }

    const stageKey = stages[stageIdx];
    const duration = DEMO_STAGE_DURATION_MS[stageKey] ?? 1200;
    const start = performance.now();

    function tick(now) {
      if (isCancelled()) return;
      const t = Math.min(1, (now - start) / duration);
      jobsStore[jobId] = { ...jobsStore[jobId], status: stageKey, stageProgress: t };
      persist();
      notify(jobId);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        stageIdx += 1;
        step();
      }
    }
    requestAnimationFrame(tick);
  }

  step();
}

export function mockSubscribeToJob(jobId, { onUpdate, onComplete, onError }) {
  if (!subscribersByJob.has(jobId)) subscribersByJob.set(jobId, new Set());
  const sub = { onUpdate, onComplete, onError };
  subscribersByJob.get(jobId).add(sub);

  // Gửi ngay snapshot hiện tại lúc vừa subscribe — quan trọng để UI
  // không bị "trống" nếu người dùng rời màn hình rồi quay lại giữa chừng.
  if (jobsStore[jobId]) onUpdate?.(jobsStore[jobId]);

  return function unsubscribe() {
    subscribersByJob.get(jobId)?.delete(sub);
  };
}

export function mockCancelJob(jobId) {
  const timer = timersByJob.get(jobId);
  if (timer) timer.cancelled = true;
  if (jobsStore[jobId]) {
    jobsStore[jobId] = { ...jobsStore[jobId], status: JOB_STATUS.CANCELLED };
    persist();
    notify(jobId);
  }
  return true;
}

export function mockGetJob(jobId) {
  return jobsStore[jobId] ?? null;
}

export function mockListJobs() {
  return Object.values(jobsStore).sort((a, b) => b.createdAt - a.createdAt);
}
