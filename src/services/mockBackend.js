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
  // Giả lập thời gian chờ webhook ngân hàng xác nhận — Backend thật chờ
  // thật sự (có thể vài phút), demo rút ngắn để test được ngay.
  [JOB_STATUS.AWAITING_PAYMENT]: 2000,
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
const resumeAfterReviewByJob = new Map(); // jobId -> () => void, chỉ tồn tại khi đang REVIEW_READY chờ duyệt

/** Ảnh preview demo — SVG watermark "CWS RENDER" lặp chéo, KHÔNG phải
 * frame render thật (mock không có Worker thật để render). */
function generateMockPreviewImages() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270">
    <rect width="100%" height="100%" fill="#2b2b30"/>
    <text x="50%" y="50%" font-size="18" fill="#9a9aa0" text-anchor="middle" font-family="sans-serif">CWS PREVIEW (demo)</text>
    <text x="10%" y="20%" font-size="14" fill="rgba(255,255,255,0.25)" transform="rotate(-25 48 54)" font-family="sans-serif">CWS RENDER</text>
    <text x="60%" y="80%" font-size="14" fill="rgba(255,255,255,0.25)" transform="rotate(-25 288 216)" font-family="sans-serif">CWS RENDER</text>
  </svg>`;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return [0, 1, 2].map((i) => ({ url, displayOrder: i }));
}

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
// AUTH (mock) — không có Google thật để chuyển hướng, tạo ngay 1
// khách demo cố định để luồng end-to-end vẫn chạy được không cần Backend.
// ============================================================
export async function mockGoogleLogin() {
  await new Promise((r) => setTimeout(r, 400));
  return {
    token: 'mock-token-demo',
    customer: {
      id: 'mock-customer-demo',
      fullName: 'Khách demo',
      avatarUrl: null,
    },
  };
}

// ============================================================
// PAYMENT (mock) — payment chỉ được tạo BÊN TRONG mockApproveJob(),
// khớp Backend thật (JobsService.approve() mới là nơi sinh QR, không
// phải 1 API tạo payment độc lập gọi trước khi có job).
// ============================================================
const paymentsStore = new Map(); // paymentId -> payment record (chỉ sống trong memory, đủ cho demo)

export async function mockGetPaymentDetails(paymentId) {
  await new Promise((r) => setTimeout(r, 150));
  const record = paymentsStore.get(paymentId);
  if (!record) throw new Error(`Không tìm thấy payment ${paymentId}`);
  return record;
}

// ============================================================
// JOB LIFECYCLE (mock)
// ============================================================
export function mockCreateJob({ fileName, fileSizeBytes, driveLink, profileId, software, softwareVersion, notes, downloadSourceFile }) {
  const jobId = `job-${Date.now()}`;
  const storageCode = `CWS-${jobId.slice(-8).toUpperCase()}`;
  const estimate = computeEstimate({ fileSizeBytes, profileId });

  jobsStore[jobId] = {
    id: jobId,
    projectName: fileName || (driveLink ? '(File từ Google Drive)' : 'Không rõ tên file'),
    software: software || null,
    softwareVersion: softwareVersion || null,
    notes: notes || null,
    storageCode,
    profileId,
    status: estimate.queueSeconds > 0 ? JOB_STATUS.QUEUED : JOB_STATUS.SEARCHING_WORKERS,
    stageProgress: 0,
    paymentId: null,
    paymentStatus: PAYMENT_STATUS.UNPAID,
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
      } else if (stageKey === JOB_STATUS.REVIEW_READY) {
        // Dừng lại chờ khách duyệt — KHÔNG tự đóng gói/mở link tải
        // (đúng CWS_ROADMAP_MVP_V1.md, Giai đoạn 4).
        jobsStore[jobId] = { ...jobsStore[jobId], previewImages: generateMockPreviewImages() };
        persist();
        notify(jobId);
        resumeAfterReviewByJob.set(jobId, () => { stageIdx += 1; step(); });
      } else if (stageKey === JOB_STATUS.AWAITING_PAYMENT) {
        // Giả lập webhook ngân hàng xác nhận PAID sau khi đã "chờ" đủ
        // DEMO_STAGE_DURATION_MS — Backend thật chờ webhook thật, ở đây
        // không có giao dịch tiền thật nào nên tự đánh dấu PAID.
        const paymentId = jobsStore[jobId].paymentId;
        const payment = paymentId ? paymentsStore.get(paymentId) : null;
        if (payment) paymentsStore.set(paymentId, { ...payment, status: PAYMENT_STATUS.PAID });
        jobsStore[jobId] = { ...jobsStore[jobId], paymentStatus: PAYMENT_STATUS.PAID };
        persist();
        stageIdx += 1;
        step();
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

export async function mockGetJobPreview(jobId) {
  await new Promise((r) => setTimeout(r, 200));
  return { images: jobsStore[jobId]?.previewImages ?? [] };
}

/** Khách duyệt bản preview -> sinh QR MB Bank (mock), job chuyển sang
 * AWAITING_PAYMENT — khớp hành vi Backend thật (JobsService.approve()),
 * KHÔNG đóng gói/mở tải ngay. */
export async function mockApproveJob(jobId) {
  const job = jobsStore[jobId];
  if (!job || job.status !== JOB_STATUS.REVIEW_READY) {
    throw new Error(`Job ${jobId} chưa sẵn sàng để duyệt`);
  }

  const paymentId = `pay-${Date.now()}`;
  const paymentCode = Math.random().toString(36).slice(2, 10).toUpperCase();
  // Giả lập giá THẬT theo runtime (giống công thức PricingService thật:
  // (runtime + 10 phút khởi động) * 6.000đ/giờ * 2) — KHÔNG dùng lại
  // job.estimate.costVnd (chỉ là ước tính trước render), để hành vi mock
  // khớp đúng Backend thật (giá cuối luôn khác giá ước tính ban đầu).
  const workerRuntimeSeconds = Math.round((Date.now() - job.createdAt) / 1000) + 600;
  const amountVnd = Math.round((workerRuntimeSeconds / 3600) * 6000 * 2);
  const transferContent = `CWS ${job.storageCode} ${paymentCode}`;
  const payment = {
    paymentId,
    status: PAYMENT_STATUS.PROCESSING,
    paymentCode,
    transferContent,
    amountVnd,
    qrImageUrl: null, // mock không có tài khoản MB Bank thật để dựng QR — honest, không bịa
  };
  paymentsStore.set(paymentId, payment);

  jobsStore[jobId] = {
    ...jobsStore[jobId],
    paymentId,
    paymentStatus: PAYMENT_STATUS.PROCESSING,
    finalPriceVnd: amountVnd,
    workerRuntimeSeconds,
  };
  persist();

  const resume = resumeAfterReviewByJob.get(jobId);
  resumeAfterReviewByJob.delete(jobId);
  if (resume) {
    resume();
  } else {
    // Trang vừa refresh giữa lúc chờ duyệt — closure runSimulation() đã
    // mất (resumeAfterReviewByJob chỉ sống trong memory, không persist).
    // Đẩy status sang AWAITING_PAYMENT trước rồi mới chạy lại
    // runSimulation() — nếu không, nó sẽ đọc lại status cũ (REVIEW_READY)
    // và lặp lại y hệt bước chờ duyệt vừa xong.
    jobsStore[jobId] = { ...jobsStore[jobId], status: JOB_STATUS.AWAITING_PAYMENT, stageProgress: 0 };
    persist();
    notify(jobId);
    runSimulation(jobId, null);
  }

  return { id: jobId, status: jobsStore[jobId].status, payment };
}

/** Khách yêu cầu chỉnh sửa thay vì duyệt — CHỈ ghi log, KHÔNG đổi
 * status (job vẫn REVIEW_READY, khách vẫn có thể duyệt nếu đổi ý sau),
 * khớp hành vi Backend thật (jobs.service.ts#requestChanges). */
export async function mockRequestChanges(jobId, _note) {
  const job = jobsStore[jobId];
  if (!job || job.status !== JOB_STATUS.REVIEW_READY) {
    throw new Error(`Job ${jobId} chưa ở trạng thái chờ duyệt`);
  }
  await new Promise((r) => setTimeout(r, 200));
  return { ok: true };
}

export function mockListJobs() {
  return Object.values(jobsStore).sort((a, b) => b.createdAt - a.createdAt);
}
