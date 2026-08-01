# SePay Payment Architecture Research — CWS

Date: 2026-08-01
Status: **RESEARCH + AUDIT ONLY — no code changed, no commit to implementation, no config changed.** This file itself is the only artifact of this task, per explicit Owner instruction to publish the report.
Model: Sonnet 5 Medium (per `MODEL_POLICY.md` — Payment + Architecture are both explicitly Sonnet-5-Medium categories).

Trigger: Owner requested a full architecture research (not implementation) comparing SePay Webhook vs IPN vs both, plus Bank Hub, Mobile App, and Android fallback, before deciding how to implement automatic MB Bank payment detection.

**Important note on scope**: the Owner's original prompt described up to 20 numbered sections. Due to message truncation (a recurring issue this session), sections **9, 10, 11, and 15–20 were never received** — their content did not arrive in any message. This report covers everything that **was** received (sections 1–8, 12–14) as thoroughly as possible, and explicitly marks the missing sections rather than guessing their content.

---

## 1. CWS Current State (code audit, not assumed)

| | Current state |
|---|---|
| Payment model | `PaymentRecord` (`backend/src/payments/payment.types.ts`): `paymentId, amountVnd, method, status, paymentCode, transferContent, jobId, storageCode, bankName, accountNumber, qrImageUrl` |
| Payment status enum | `unpaid \| processing \| paid \| failed` |
| payment_code / storage_code | `payment_code` = 8 random hex chars (`randomBytes(4)`), generated in `QrBankProvider.createIntent()`. `storage_code` copied from the job at payment-creation time. Transfer content format enforced: `"CWS {storage_code} {payment_code}"` — **both** must match, not just payment_code |
| QR generation | `QrBankProvider.createIntent()` builds a URL via the public `img.vietqr.io` service (no API key needed), only when `MB_BANK_ACCOUNT_NUMBER` is configured |
| Payment endpoints | `POST /payments` (create intent), `GET /payments/:id`, `POST /payments/:id/confirm` (always throws — not valid for qr_bank) |
| Webhook endpoints today | `POST /payments/webhook` (generic, `WebhookSecretGuard`, header `x-webhook-secret`) and `POST /payments/webhook/sepay` (`SepayWebhookGuard`, header `Authorization: Apikey <key>`) — **the current DTO (`SepayWebhookDto`) is camelCase, matching SePay's "Webhook" payload shape, NOT the "IPN" (snake_case) shape** — flagged, not yet fixed, per explicit "no code changes" instruction this round |
| Raw notification stored? | Yes — `payment_notifications.raw_notification jsonb` (migration 014); `confirmViaSepayWebhook()` stores the full DTO |
| `matchAndConfirm()` logic | Regex `CWS\s+(\S+)\s+([A-Za-z0-9]+)` extracts storage_code + payment_code from transfer content → look up payment by payment_code → if already PAID, return the existing result immediately (idempotent) → require storage_code to match exactly → require amount to match exactly (`!==`, no tolerance) → set PAID |
| How PAID is set | Only one path: `matchAndConfirm()`, called from `confirmViaWebhook` / `confirmViaMbbankNotification` / `confirmViaSepayWebhook` — no other endpoint can set PAID |
| Unlock after PAID | Fully decoupled from the webhook — `SchedulerService.processOrder()` polls every tick, sees `status=AWAITING_PAYMENT`, calls `JobsService.finalizeDelivery()` (checks `payments.status=PAID` internally); on success, packages the result, opens the B2 download link, and writes a row to `notifications` |

## 2. Workflow Order Confirmation

Cross-checked `DECISIONS.md`, `CWS_ROADMAP_MVP_V1.md`, `CWS_MVP_WORKFLOW_FINAL.md`, and code (`CreateJobDto` has no `paymentId` field; `JobsService.createOrder()` explicitly sets `paymentId: null`; payment is only created inside `JobsService.approve()`, called after the customer approves the watermarked Preview). **No contradiction found** — Job → Render → Preview → Payment is already the enforced order in both docs and code. Already formalized as an explicit decision in `DECISIONS.md` in an earlier session.

## 3. SePay Research From Official Docs

### A. SePay Webhooks

| | Value | Source |
|---|---|---|
| Trigger | Every transaction on the linked bank account ("Mỗi khi có giao dịch") | [tich-hop-webhook](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook) |
| Payload (camelCase) | `id, gateway, transactionDate, accountNumber, subAccount, code, content, transferType, description, transferAmount, accumulated, referenceCode` | [same page] |
| Authentication | 4 choices, configurable at webhook-creation time: **None** (test only, "never for production"), **API Key** (`Authorization: Apikey <key>`), **HMAC-SHA256** (recommended — `X-SePay-Signature: sha256={hex}`, `X-SePay-Timestamp: {unix}`, signed as `hash_hmac('sha256', timestamp.raw_body, secret)`, ±300s replay window), **OAuth 2.0** (`Authorization: Bearer {access_token}`, standard or custom client-credentials flow) | [xac-thuc](https://developer.sepay.vn/en/sepay-webhooks/xac-thuc) |
| Retry policy | Max 7 attempts, Fibonacci backoff **1, 1, 2, 3, 5, 8, 13 minutes**, total retry window ~33 minutes, stops entirely after 5 hours. Connect timeout 5s, max response wait 8s. **Retries only on network failure, not on 4xx application errors.** (This number was found under the general "sepay-webhooks/xu-ly-loi" error-handling search result and matches the IPN number exactly — see note below) | Search result citing developer.sepay.vn/vi/sepay-webhooks/xu-ly-loi |
| Success contract | Endpoint must return HTTP 200/201 with body `{"success": true}` (if "Strict mode" enabled) within 30 seconds | [tich-hop-webhook] |
| MB Bank support | Yes — MB Bank is one of the ~11 supported banks | [pricing table](https://api.casso.vn/pricing-table) cross-check + [sepay.vn/bang-gia.html](https://sepay.vn/bang-gia.html) |
| Endpoint offline handling | Covered by the retry schedule above; beyond ~33 min / 5h, the notification is lost — no documented dead-letter queue or manual replay mechanism from SePay's side |

**Note on retry policy overlap**: my first research pass found this exact Fibonacci schedule specifically attributed to **IPN**. A later search attributed what reads as the identical schedule to **Webhooks**. I could not get a clean, unambiguous fetch of a Webhook-specific error-handling page (attempts to fetch `sepay-webhooks/loi-va-xu-ly-loi` returned 404 — the URL guess was wrong, and I could not find the correct one before this report was due). **Treat the retry schedule as CONFIRMED for IPN, and PROBABLE-BUT-NOT-INDEPENDENTLY-CONFIRMED for Webhooks** (search-engine-summarized, not a direct fetch of a working Webhook-specific page).

### B. SePay IPN

| | Value | Source |
|---|---|---|
| Product/feature | Part of the "Bank Hub" documentation namespace, but confirmed usable directly by an ordinary individual merchant with one linked bank account — Bank Hub itself (the multi-tenant B2B2C platform) is NOT required to use IPN | [bankhub/tong-quan](https://developer.sepay.vn/vi/bankhub/tong-quan) |
| Trigger | Every transaction on a linked account meeting activation conditions (company status "Active", `transaction_amount` config > 0 or "Unlimited") | [thong-bao-bien-dong-so-du](https://developer.sepay.vn/vi/bankhub/thong-bao-bien-dong-so-du) |
| Payload (snake_case) | `gateway, transaction_date, account_number, bank_account_xid, va, payment_code, content, transfer_type, amount, reference_code, accumulated, transaction_id` | [same page] |
| Authentication | Only **`Authorization: Apikey {API_KEY}`** by default — no HMAC/OAuth2 alternative documented for IPN specifically. Can be combined with IP allowlisting. | [same page] |
| Retry policy | Max 7 attempts, Fibonacci 1,1,2,3,5,8,13 min, ~33 min window, stops after 5h. Connect timeout 5s, response wait 8s. Only retries network failures. | [same page] |
| Unique transaction ID | `transaction_id` — docs explicitly recommend deduplicating on it | [same page] |
| Gateway dependency | **No** — only requires a linked bank account, no separate "Payment Gateway" product | [same page] |

**Key structural difference confirmed**: Webhook and IPN are genuinely different features with different payload shapes and (partly) different auth mechanisms — not the same thing renamed. CWS's current `SepayWebhookDto` matches the **Webhook** shape; it does **not** match the **IPN** shape that appears on the Owner's "cấu hình IPN" screen.

## 4. Can Webhook + IPN Run Simultaneously?

**Not directly confirmed from official docs** whether both can be enabled for the same linked account and whether both fire for the same transaction. What **is** confirmed:
- The published SePay IP allowlist (8 IPs: 6 IPv4 + 2 IPv6, [developer.sepay.vn/en/dia-chi-ip](https://developer.sepay.vn/en/dia-chi-ip)) explicitly covers **both** "Webhooks — Real-time transaction notifications" and "IPN (Instant Payment Notification) — Payment notifications from Payment Gateway and Bank Hub" from the *same* IP range, meaning they are sent from the same underlying SePay infrastructure, not physically separate systems.
- Both are described as reacting to the same underlying event (a bank transaction on the linked account).

**Distinguishing delivery redundancy from data-source redundancy (explicit ask)**:
- **Delivery redundancy** (a transient network/endpoint failure drops one push but not the other): plausible if they are two independent delivery queues, which the shared-IP-range evidence doesn't rule out.
- **Data-source redundancy** (SePay itself fails to observe the underlying MB Bank transaction): **does not exist between Webhook and IPN** — both depend on SePay successfully reading the bank's balance-change event first. If that step fails, both are silent, simultaneously.
- **Conclusion**: calling "Webhook + IPN" a redundancy solution for CWS is only partially true — it protects against SePay-side delivery hiccups, not against SePay-side detection failure. It is **not** two independent data sources.

## 5. Bank Hub — deeper research

- **Purpose**: a B2B2C platform for third parties (fintech, e-commerce/marketplace platforms, corporate cash management, accounting platforms) to connect **many end-customers'** bank accounts through one standardized API (Hosted Link, Link Token). **Not what a single merchant like CWS needs.**
- **Reconciliation / polling capability found (new, important)**: SePay has a **separate REST API** (not Bank Hub, not Webhook, not IPN) for transaction history query — `sepay-api/v2`:
  - `GET https://userapi.sepay.vn/v2/transactions`
  - Auth: `Authorization: Bearer {api_key}` (64-char alphanumeric token from Company Settings > API Keys)
  - Filters: `transaction_date_from/to`, `bank_account_id`, `bank_brand_name`, `va_id`, `amount_in_min/max`, `amount_out_min/max`, free-text `q` (matches reference_number/transaction_content/code), pagination `page`/`per_page` (max 100)
  - Response includes **`webhook_success`** per transaction — SePay itself tracks whether webhook delivery succeeded for each transaction, meaning CWS could specifically poll for `webhook_success=false` rows.
  - Rate limit: **3 requests/second per IP**, checked before authentication; HTTP 429 with `Retry-After`/`X-RateLimit-Remaining` headers on violation. Not differentiated by paid/free tier in the docs.
  - Explicitly positioned by SePay's own docs for **"periodic reconciliation"** — this is the closest thing to a genuine pull-based fallback SePay offers.
- **Fallback suitability**: this Transaction Query API is a better fit for a fallback/reconciliation role than a second push channel (IPN alongside Webhook), because it's **pull-based** — CWS's own already-existing `SchedulerService` (ticks periodically) could poll it, independent of whether SePay successfully *delivered* anything. It still shares the same data-source dependency (SePay must have detected the bank transaction).
- **Bank Hub pricing/limits**: confirmed no limit on number of linked bank accounts, no feature restriction between paid packages, unlimited users/employees on all plans. Standard FREE plan (0đ/month, 50 transactions/month) includes Webhook/API support and MB Bank — confirmed twice independently ([api.casso.vn/pricing-table cross-check] and [sepay.vn/bang-gia.html]). A separate, **time-limited, bank-specific promotion** exists (500 free transactions/month for 12 months, but only for new **VPBank** accounts) — **does not apply to CWS's MB Bank account**, noted here only to avoid the confusion I initially had when two different numbers appeared in search results.
- **CWS MVP verdict**: does not need Bank Hub itself. The Transaction Query API (`sepay-api/v2`) is worth considering later as a reconciliation job, not urgent for MVP.

## 6. SePay Mobile App

Confirmed this is a **human-facing app**, not a backend integration mechanism:
- Android (`com.sepay.trans` on Google Play) and iOS (App Store, `id6523435118`) app that pushes a notification to a phone screen when a QR payment succeeds — intended for shop staff to see "money arrived" alerts, conceptually similar to Casso's Telegram integration.
- No API/webhook is documented as originating *from* this app for backend consumption.
- **Explicit 3-way distinction, as requested**:
  1. **SePay Mobile App** — SePay's own app, for a human to glance at, unrelated to CWS code.
  2. **Future CWS Android APK** — does not exist yet, a possible future CWS product.
  3. **CWS's existing Android Notification Listener** (already implemented, code audited) — reads notifications from the **MBBank app itself** on a phone (not SePay's app), via `NotificationListenerService`, feeding `MbbankNotificationDto` → `confirmViaMbbankNotification()`. Already live in the codebase, independent of SePay entirely.

## 7. Android Fallback Comparison — Failure Domain Analysis

| Failure scenario | SePay Webhook | SePay IPN | CWS Android MBBank Listener |
|---|---|---|---|
| SePay-side outage (can't read the bank transaction at all) | ❌ Dead | ❌ Dead (same root cause as Webhook) | ✅ **Still works** — reads the MBBank app's own notification directly on the phone, no SePay involved |
| Phone offline / no signal | N/A | N/A | ❌ Dead |
| CWS backend offline | Retry per schedule (§3A, ~33min window) | Retry per schedule (§3B, confirmed ~33min window) | Dead until backend is back (app-side retry behavior for the Android listener itself is outside backend code, not audited here) |
| Android OS kills the notification-listener service | N/A | N/AA | ❌ Dead |

**Conclusion**: (Webhook + Android Listener) has **one genuinely independent failure domain** (SePay-side detection failure) that (Webhook + IPN) does **not** have, since Webhook and IPN share the exact same root dependency on SePay reading the bank transaction. If the goal is real risk reduction (not just "two notifications instead of one"), the Android Listener — already built — contributes more than adding IPN alongside Webhook. The Android Listener's own weakness (phone must be online, OS must not kill the service) is a different, orthogonal risk that a periodic reconciliation API poll (§5) would not share.

## 8. Edge Cases — Audited Against Current Code (not speculated)

| Scenario | Current behavior (read from `PaymentsService.matchAndConfirm` and related code) |
|---|---|
| Underpayment | `record.amountVnd !== amountVnd` → `BadRequestException`, not PAID |
| Overpayment | Same exact-match comparison — even 1đ over is rejected. **No tolerance window configured.** |
| Wrong transfer content | Regex fails to match → `BadRequestException` immediately, no payment lookup attempted |
| Same amount across multiple jobs | Not a real collision risk — matching is keyed on `payment_code` (random 8 hex chars) first, not amount |
| Double payment (same payment_code paid twice) | Second confirmation sees `status === PAID`, returns the cached result, no re-processing, no error — **but the money itself has already arrived twice in the bank account; the code does not auto-refund. This is a manual/business-process gap, out of code scope.** |
| Webhook redelivery (network retry) | Guarded by `payment_notifications.transaction_id UNIQUE` (migration 014) — a second insert with the same `transaction_id` fails at the DB constraint level (race-safe, not a check-then-insert pattern) |
| Webhook + IPN both reporting the same transaction (hypothetical, not yet implemented) | Because both would call the same `matchAndConfirm()`, whichever arrives second sees `status=PAID` and is a no-op — safe. If the two sources use *different* transaction IDs for the same real transaction, both `payment_notifications` rows would independently show `processed` — harmless but slightly redundant audit data |
| Transaction notification arrives before the payment record exists | `findByPaymentCode()` returns `null` → `NotFoundException`. **No wait/retry on the CWS side for this race** — relies entirely on the sender's own retry schedule (IPN: 7 attempts/~33min, likely enough to cover this race; generic `/payments/webhook` route: retry schedule of the caller is unknown to CWS) |
| Backend restart mid-processing | `insertNotificationProcessing` writes `status='processing'` **before** calling `matchAndConfirm()`. If the process crashes between that insert and writing the final outcome, the row is stuck at `processing` forever — **no timeout/reaper job exists** to clean these up |
| DB transaction rollback | No explicit BEGIN/COMMIT wraps the insert (`payment_notifications`) and the later `payments.status` update — they are two separate calls. If the `payments` update fails after the notification row is already marked `processed`, the two tables could disagree (audit log says processed, but the actual payment is still unpaid) — small risk, acceptable for MVP, would need a real DB transaction to close fully |
| Spoofed webhook attempt | Blocked by the relevant guard (`WebhookSecretGuard` / `SepayWebhookGuard`) before the request ever reaches the service layer — missing/wrong key returns 401 immediately |

## 9–11. NOT RECEIVED

The Owner's original prompt numbering jumps from section 8 directly to what appears to be section 12 in the surviving text ("MVP VÀ KIẾN TRÚC TƯƠNG LAI"). **Sections 9, 10, and 11 were never received in any message this session** (truncated in transit, consistent with several earlier messages in this conversation). Not guessed or fabricated here.

## 12. MVP vs Future Architecture

**MVP right now — minimum needed**:
- One push channel is sufficient — either Webhook **or** IPN, not both — plus a correctly-shaped DTO for whichever one is actually chosen (current code matches Webhook's shape; if IPN is chosen, the DTO needs snake_case fields instead — not done yet, per "no code changes" this round).
- Keep the existing Android MBBank Listener as-is — it already provides a real, independent failure domain.
- Nothing else is required for MVP.

**After the APK exists / when tighter guarantees are wanted** (not needed now):
- Add a periodic job (reusing the existing `SchedulerService` tick) that calls the SePay Transaction Query API (`GET /v2/transactions`, filtering `webhook_success=false`) as a true pull-based reconciliation fallback — this is genuine delivery-layer redundancy that doesn't depend on SePay successfully pushing anything.
- Add a timeout/reaper for `payment_notifications` rows stuck at `processing` due to a backend crash mid-request.
- Consider a real DB transaction wrapping the notification-insert + payment-status-update pair if stronger consistency guarantees become necessary.

## 13. Security — Confirmed / Not Supported

| Mechanism | Supported by SePay? |
|---|---|
| API Key (fixed header) | ✅ Yes — both IPN (mandatory) and Webhook (one of 4 choices) |
| HMAC-SHA256 | ✅ Yes, **Webhook only** — IPN does not offer this |
| Bearer token / OAuth2 | ✅ Yes for Webhook (OAuth2 client-credentials) and for the Transaction Query API (Bearer token) |
| IP allowlist | ✅ Yes — 8 published IPs (6 IPv4, 2 IPv6), covers both Webhook and IPN |
| Replay protection | ✅ Confirmed only for HMAC-SHA256 (±300s timestamp window). API Key / IPN have no documented replay protection beyond the static key value itself |
| Idempotency on SePay's side | **CHƯA XÁC MINH** — not documented; CWS's own idempotency (`transaction_id UNIQUE`) is independent of whatever SePay does internally |

No secrets logged anywhere in the audited code; no hardcoded secrets found (all payment-related secrets are read via `ConfigService`/env vars).

## 14. Free Tier / Pricing (confirmed, cross-checked twice)

| | SePay | Casso |
|---|---|---|
| Free plan price | 0đ/month | 0đ/month |
| Free plan transaction limit | **50/month** (confirmed independently via `api.casso.vn/pricing-table` cross-reference and `sepay.vn/bang-gia.html` directly) | 30/month |
| MB Bank on free plan | ✅ Yes | ✅ Yes |
| Webhook/API on free plan | ✅ Yes, from the start | ❌ No — Casso free tier only has Telegram/email reports; custom webhook requires the Starter plan (99k VND/month) |
| Bank account count limit | Unlimited (Bank Hub docs confirm no limit) | Not verified this round |

A bank-specific, time-limited promotion (500 free transactions/month for 12 months) exists for **new VPBank accounts only** — irrelevant to CWS (MB Bank).

Transaction Query API (`sepay-api/v2`) pricing/rate-limit-by-tier: **CHƯA XÁC MINH** whether the 3 req/s limit differs by paid tier — docs only state a single limit with no free/paid distinction.

## 15–20. NOT RECEIVED

**Sections 15 through 20 of the Owner's original prompt were never received** — the message was truncated before this content arrived (the visible tail of the original message ended mid-word: "...y ku:RESEAR HO TẤT — CHƯA THAY ĐHỜ QUYẾT ĐỊNH CỦA BẠN."). Not guessed or fabricated. If these sections covered anything not already addressed in 1–14 above, please resend that portion specifically.

---

## Final Recommendation (research-based opinion, not a decision — Owner decides)

1. **Reject "IPN alongside Webhook" as a redundancy strategy** — confirmed both share the same SePay-side detection dependency; it adds real implementation complexity (normalizing two different payload shapes, deciding a `source` column, handling potential differing transaction IDs) for redundancy that is narrower than it sounds (delivery-layer only, not data-source).
2. **Pick exactly one push channel for MVP**: leaning toward **IPN**, because its retry/timeout policy is independently confirmed with concrete numbers, and its payload/auth is simpler (one fixed mechanism) — but if stronger request-forgery protection matters more than that, **Webhook + HMAC-SHA256** is the stronger security choice (replay-protected, IPN has no equivalent). This is a genuine trade-off, not a clear winner — the current code already leans toward Webhook shape, so switching to IPN means DTO rework; staying on Webhook means no DTO rework but weaker-than-HMAC security if API Key auth is kept instead of switching to HMAC.
3. **Keep the existing Android MBBank Listener** — it is the only mechanism here with a genuinely independent failure domain (SePay-side outage), more valuable than a second SePay push channel.
4. **Defer the Transaction Query API reconciliation job** to a later phase (post-APK or when incident history justifies it) — not MVP-critical, but architecturally the best fallback candidate found in this research, better than IPN-as-backup-for-Webhook.

**No implementation performed.** Waiting for Owner's decision.
