// ============================================================
// adminApi â€” Dashboard Admin (CWS_ROADMAP_MVP_V1.md, Giai Ä‘oáº¡n 7).
// Gá»i tháº³ng Backend NestJS, KHÃ”NG qua mockBackend.js (Admin khÃ´ng cÃ³
// khÃ¡i niá»‡m demo â€” chá»‰ dÃ¹ng Ä‘Æ°á»£c khi Ä‘Ã£ cáº¥u hÃ¬nh Backend tháº­t).
//
// 2026-08-02 (Owner yÃªu cáº§u MFA báº¯t buá»™c, "KhÃ´ng táº¡o bypass"): má»i
// request giá» Ä‘Ã­nh kÃ¨m `Authorization: Bearer <access token Supabase>`
// (thay cho x-admin-key cÅ©) â€” token nÃ y láº¥y Ä‘Æ°á»£c CHá»ˆ SAU KHI hoÃ n táº¥t
// Ä‘Äƒng nháº­p + MFA (TOTP) tháº­t, xem services/staffAuth.js +
// components/StaffMfaLogin.jsx. Backend (RoleGuard) tá»± kiá»ƒm tra láº¡i
// claim `aal` tá»« chÃ­nh token, khÃ´ng tin tÆ°á»Ÿng Frontend.
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';

async function adminFetch(path, staffToken) {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('ChÆ°a cáº¥u hÃ¬nh Backend tháº­t â€” Admin Dashboard khÃ´ng dÃ¹ng Ä‘Æ°á»£c á»Ÿ cháº¿ Ä‘á»™ demo.');
  }
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (res.status === 401 || res.status === 403) throw new Error('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n hoáº·c chÆ°a Ä‘á»§ quyá»n/MFA â€” Ä‘Äƒng nháº­p láº¡i.');
  if (!res.ok) throw new Error(`YÃªu cáº§u tháº¥t báº¡i (${res.status})`);
  return res.json();
}

/** HÃ nh Ä‘á»™ng Admin THáº¬T lÃªn Worker Fleet (retry/requeue/quarantine/drain,
 * ngoÃ i CWS_WORKER_ROADMAP.md â€” Ä‘Ã³ng lá»— há»•ng Phase 6), khÃ¡c `adminFetch`
 * á»Ÿ trÃªn vÃ¬ lÃ  POST + cÃ³ body tuá»³ chá»n. */
async function adminPost(path, staffToken, body) {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('ChÆ°a cáº¥u hÃ¬nh Backend tháº­t â€” Admin Dashboard khÃ´ng dÃ¹ng Ä‘Æ°á»£c á»Ÿ cháº¿ Ä‘á»™ demo.');
  }
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (res.status === 401 || res.status === 403) throw new Error('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n hoáº·c chÆ°a Ä‘á»§ quyá»n/MFA â€” Ä‘Äƒng nháº­p láº¡i.');
  if (!res.ok) throw new Error(`YÃªu cáº§u tháº¥t báº¡i (${res.status})`);
  return res.json();
}

export function adminListAffiliates(adminKey) { return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_AFFILIATES, adminKey); }
export function adminSetAffiliateStatus(id, status, adminKey) { return adminPost(API_CONFIG.ENDPOINTS.ADMIN_AFFILIATE_STATUS(id), adminKey, { status }); }
export function adminListAffiliateWithdrawals(adminKey) { return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_AFFILIATE_WITHDRAWALS, adminKey); }
export function adminListAffiliateCommissions(adminKey) { return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_AFFILIATE_COMMISSIONS, adminKey); }
export function adminSetAffiliateWithdrawalStatus(id, status, adminKey, providerTransactionId, reason) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_AFFILIATE_WITHDRAWAL_STATUS(id), adminKey, { status, providerTransactionId, reason });
}
export function adminMakeAffiliateCommissionAvailable(id, adminKey) { return adminPost(API_CONFIG.ENDPOINTS.ADMIN_AFFILIATE_COMMISSION_AVAILABLE(id), adminKey); }

/** Danh sÃ¡ch toÃ n bá»™ khÃ¡ch hÃ ng (CWS_ROADMAP_MVP_V1.md, Giai Ä‘oáº¡n 7). */
export function adminListCustomers(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_CUSTOMERS, adminKey);
}

/** Danh sÃ¡ch toÃ n bá»™ job cá»§a má»i khÃ¡ch hÃ ng. */
export function adminListJobs(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_JOBS, adminKey);
}

/** Tráº¡ng thÃ¡i Worker Fleet (CWS_MVP_WORKFLOW_FINAL.md, má»¥c Admin â€”
 * "Worker") â€” chá»‰ Ä‘á»c, khÃ´ng can thiá»‡p. */
export function adminListWorkers(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_WORKERS, adminKey);
}

/** Sá»± cá»‘ Worker Fleet (Phase 6 CWS_WORKER_ROADMAP.md) â€” chá»‰ Ä‘á»c. HÃ nh
 * Ä‘á»™ng retry/requeue/quarantine/drain xem 4 hÃ m `adminRetryTask`/
 * `adminRequeueTask`/`adminSetWorkerQuarantine`/`adminSetWorkerDrain` bÃªn dÆ°á»›i. */
export function adminListIncidents(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_INCIDENTS, adminKey);
}

/** ÄÆ°a 1 task Ä‘ang status=failed (permanent) vá» láº¡i queued Ä‘á»ƒ thá»­ láº¡i. */
export function adminRetryTask(taskId, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_RETRY_TASK(taskId), adminKey);
}

/** Ã‰p 1 task Ä‘ang active vá» queued ngay (khÃ´ng Ä‘á»£i requeue_stale_tasks() tá»± Ä‘á»™ng sau 240s). */
export function adminRequeueTask(taskId, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_REQUEUE_TASK(taskId), adminKey);
}

/** Báº­t/táº¯t quarantine 1 worker â€” worker bá»‹ quarantine sáº½ KHÃ”NG claim Ä‘Æ°á»£c task má»›i (thá»±c thi tháº­t qua claim_task(), khÃ´ng chá»‰ lÃ  nhÃ£n). */
export function adminSetWorkerQuarantine(workerId, quarantined, reason, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_QUARANTINE_WORKER(workerId), adminKey, { quarantined, reason });
}

/** Báº­t/táº¯t drain 1 worker â€” worker Ä‘ang drain sáº½ hoÃ n táº¥t task hiá»‡n táº¡i nhÆ°ng KHÃ”NG claim task má»›i. */
export function adminSetWorkerDrain(workerId, draining, reason, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_DRAIN_WORKER(workerId), adminKey, { draining, reason });
}

/** XÃ¡c nháº­n final_amount cho 1 phiÃªn host_usage_sessions (Phase 8) â€” hÃ nh
 * Ä‘á»™ng DUY NHáº¤T ghi sá»‘ tiá»n cuá»‘i cÃ¹ng, Worker/há»‡ thá»‘ng tá»± Ä‘á»™ng khÃ´ng tá»± quyáº¿t Ä‘á»‹nh. */
export function adminConfirmHostUsageFinalAmount(sessionId, finalAmount, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_CONFIRM_FINAL_AMOUNT(sessionId), adminKey, { finalAmount });
}

/** Thá»‘ng kÃª thá»i gian/tiá»n thuÃª host (Phase 8 CWS_WORKER_ROADMAP.md) â€”
 * chá»‰ Ä‘á»c, tÃ­nh bá»Ÿi RPC compute_host_usage_sessions() (cron), khÃ´ng pháº£i
 * Backend/Frontend tá»± tÃ­nh. */
export function adminListHostUsageSessions(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_HOST_USAGE, adminKey);
}

/** Danh sÃ¡ch thiáº¿t bá»‹ Android gá»­i payment notification (MBBank Notification
 * Listener MVP) â€” chá»‰ Ä‘á»c, xem payment-devices.repository.ts. */
export function adminListPaymentDevices(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_PAYMENT_DEVICES, adminKey);
}

/** Payment/refund safety net (2026-08-03, DECISIONS.md "Payment
 * reconciliation") â€” 3 loáº¡i báº¥t thÆ°á»ng thanh toÃ¡n (payment_status lá»‡ch
 * khá»i báº£ng payments tháº­t, webhook káº¹t 'processing', Ä‘Ã£ thanh toÃ¡n tháº­t
 * nhÆ°ng chÆ°a nháº­n file) â€” chá»‰ Ä‘á»c, xem
 * worker_migrations/015_payment_reconciliation_view.sql. */
export function adminListPaymentAnomalies(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_PAYMENT_ANOMALIES, adminKey);
}

/** áº¢nh preview cá»§a 1 job (CWS_MVP_WORKFLOW_FINAL.md, má»¥c Admin â€”
 * "Preview") â€” cáº§n x-admin-key náº¿u job Ä‘Ã£ cÃ³ chá»§ (khÃ¡ch Ä‘Äƒng nháº­p),
 * xem JobsService.assertOwnership() trong Backend (trÆ°á»›c Ä‘Ã¢y route nÃ y
 * má»Ÿ cÃ´ng khai theo jobId, khÃ´ng kiá»ƒm tra chá»§ sá»Ÿ há»¯u â€” Ä‘Ã£ sá»­a lá»— há»•ng
 * IDOR, xem docs/MVP_GAP_REPORT.md). */
export async function adminGetJobPreview(jobId, staffToken) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_PREVIEW(jobId)}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (!res.ok) throw new Error(`KhÃ´ng láº¥y Ä‘Æ°á»£c áº£nh preview (${res.status})`);
  return res.json();
}

/** Tra cá»©u 1 job theo Storage Code. */
export function adminGetJobByStorageCode(storageCode, staffToken) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_JOB_BY_STORAGE_CODE(storageCode), staffToken);
}

/** Tra cá»©u payment theo Payment Code. */
export function adminGetPaymentByCode(paymentCode, staffToken) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_PAYMENT_BY_CODE(paymentCode), staffToken);
}

/** Log Worker (bÃ¡o lá»—i render) cá»§a 1 job. */
export async function adminGetJobLogs(jobId, staffToken) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_JOB_LOGS(jobId)}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (!res.ok) throw new Error(`KhÃ´ng láº¥y Ä‘Æ°á»£c log (${res.status})`);
  return res.json();
}

/** URL táº£i file káº¿t quáº£ cho link `<a href>` trong báº£ng Job â€” dÃ¹ng tháº³ng
 * lÃ m href. HÃ m nÃ y dÃ¹ng Authorization header, nháº­n response thÃ nh blob
 * vÃ  táº¡o object URL táº¡m; token khÃ´ng bao giá» Ä‘i vÃ o URL/history/log. */
export async function adminGetDownloadUrl(jobId, staffToken) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD_URL(jobId)}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (res.status === 401 || res.status === 403) throw new Error('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n hoáº·c chÆ°a Ä‘á»§ quyá»n/MFA â€” Ä‘Äƒng nháº­p láº¡i.');
  if (!res.ok) throw new Error(`KhÃ´ng láº¥y Ä‘Æ°á»£c signed URL (${res.status})`);
  const data = await res.json();
  return data.url ?? null;
}

/** Danh sÃ¡ch yÃªu cáº§u chá»‰nh sá»­a cá»§a khÃ¡ch â€” chá»‰ Admin MFA, backend RoleGuard enforce. */
export function adminListEditRequests(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.STAFF_EDIT_REQUESTS, adminKey);
}

/** Cáº­p nháº­t tráº¡ng thÃ¡i yÃªu cáº§u chá»‰nh sá»­a â€” chá»‰ Admin MFA. */
export function adminUpdateEditRequest(id, status, adminKey, expectedResponseAt = null) {
  return fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STAFF_UPDATE_EDIT_REQUEST(id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, expectedResponseAt }),
  }).then(async (res) => {
    if (res.status === 401 || res.status === 403) throw new Error('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n hoáº·c chÆ°a Ä‘á»§ quyá»n/MFA â€” Ä‘Äƒng nháº­p láº¡i.');
    if (!res.ok) throw new Error(`YÃªu cáº§u tháº¥t báº¡i (${res.status})`);
    return res.json();
  });
}


/** Support ticket queue â€” Admin MFA/RBAC only at backend. */
export function adminListSupportTickets(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKETS, adminKey);
}

export function adminUpdateSupportTicket(id, status, adminKey, expectedResponseAt = null) {
  return fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_SUPPORT_TICKET(id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, expectedResponseAt }),
  }).then(async (res) => {
    if (res.status === 401 || res.status === 403) throw new Error('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n hoáº·c chÆ°a Ä‘á»§ quyá»n/MFA â€” Ä‘Äƒng nháº­p láº¡i.');
    if (!res.ok) throw new Error(`YÃªu cáº§u tháº¥t báº¡i (${res.status})`);
    return res.json();
  });
}
