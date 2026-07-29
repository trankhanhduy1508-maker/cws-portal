# P2 CODEX 1 — PAYMENT REPORT

## 1. Thông tin

- Ngày giờ: 2026-07-30, Asia/Saigon
- Repository: `trankhanhduy1508-maker/cws-portal`
- Branch: `agent-1-payment-p2`
- Commit Hash trước commit chuẩn hóa báo cáo: `5fa0e28b98572272443bdc0579567ce5eb2459e0`
- Commit cuối chứa code + tests + báo cáo: xem HEAD của Pull Request #3 và kết quả cuối phiên
- Pull Request: [#3 — fix(p2): secure payment authorization](https://github.com/trankhanhduy1508-maker/cws-portal/pull/3) — Draft
- Leader: CODEX 1 — Payment Leader
- Agent con:
  - Payment Repository Analyst — COMPLETE
  - Payment Security & QA Reviewer — COMPLETE

## 2. Mục tiêu

Hoàn thiện payment foundation thuộc Phase P2.4–P2.6 theo roadmap chính:

- Manual MB Bank và VietQR
- Manual MoMo
- Payment reference và expiry
- Expected/received amount
- Admin confirm, reject và refund
- Underpaid/overpaid
- Immutable audit history
- Idempotent confirmation và duplicate protection
- Server-side authorization và ownership
- Không cho customer tự xác nhận
- Không dispatch job bằng payment ID chưa được xác minh
- Không expose Stripe/PayPal trong Vietnam MVP

Acceptance Criteria hiện đạt một phần. Payment chưa đạt Definition of Done vì validation suite chưa chạy và expected amount chưa gắn durable canonical Quote/verified upload.

## 3. Kết quả Audit

| Hạng mục | Trạng thái | Evidence |
|---|---|---|
| Manual MB Bank/VietQR | COMPLETE về code | `payments.service.ts`, `configuration.ts`, payment UI |
| Manual MoMo | COMPLETE về code | `PaymentMethod.MOMO_MANUAL`, manual instructions |
| Customer auto-confirm | COMPLETE — đã loại bỏ | `PaymentsController`, `RenderService.confirmPayment()` fail-closed |
| Admin authorization | PARTIAL | `JwtAuthGuard`, `AdminRoleGuard`; issuer/audience/algorithm allowlist còn thiếu |
| Payment ownership | COMPLETE về HTTP payment/job scope | Payment/customer binding và job `customerId` checks |
| Reference/expiry | COMPLETE về code/schema | Migration 004 và payment response |
| Exact/under/over | COMPLETE về code | `PaymentsService.confirm()` |
| Reject/refund | COMPLETE về code | Admin routes và transition rules |
| Immutable audit | COMPLETE về schema/code | `payment_events`, append-only trigger |
| Idempotency/replay | PARTIAL | Row lock + request fingerprint; concurrency tests chưa chạy |
| Job payment bypass | PARTIAL | Confirmed owned payment required; orphan-order cleanup còn thiếu |
| Canonical Quote | MISSING | Amount vẫn tính từ profile/fileSize do request cung cấp |
| Automated validation | BLOCKED | Windows local runner unavailable; no Actions run |
| Credential example | COMPLETE | `.env.example` chỉ còn placeholder |
| Historical credential rotation | BLOCKED — external incident action | Cần revoke/rotate và quy trình purge riêng |

## 4. Những gì đã sửa

### Backend/API

- `POST /payments`: customer đã xác thực; server tạo reference, expiry và expected amount.
- `GET /payments/:id`: chỉ owner hoặc admin.
- `POST /payments/:id/evidence`: owner gửi bằng chứng manual payment.
- `POST /payments/:id/confirm`: admin-only, yêu cầu `Idempotency-Key`.
- `POST /payments/:id/reject`: admin-only.
- `POST /payments/:id/refund`: admin-only.
- Jobs create/list/detail/status/cancel yêu cầu JWT và kiểm tra owner/admin.
- Job không dispatch trước khi payment confirmed được consume.

### Service/domain

- Thay auto-confirm Wallet/QR mock bằng manual MB/VietQR và manual MoMo.
- Thêm lifecycle: awaiting transfer, under review, confirmed, original unlocked, expired, underpaid, overpaid, rejected, refund pending, refunded.
- Thêm server-side admin role, payment ownership, amount comparison, expiry, request fingerprint và fail-closed legacy behavior.
- Stripe/PayPal không còn trong production-facing enum/UI.

### UI

- Chỉ hiển thị MB/VietQR và Manual MoMo.
- Hiển thị reference, expected amount, recipient, account label, VietQR và expiry.
- Customer chỉ gửi bằng chứng đã chuyển tiền; không thể tự confirm.

### Database/Migration

- Thêm `004_secure_manual_payments.sql`.
- Thêm ownership, order binding, reference, received amount, expiry và operator metadata.
- Thêm append-only `payment_events`.
- Thêm atomic transition/consume RPC, row locking và idempotency fingerprint.
- Backfill legacy data fail-closed trước khi áp constraints.
- Thêm `customer_id` vào render orders.

### Tests

- Thêm `payment-quote.spec.ts`.
- Thêm `payment-methods.spec.ts` để khóa allowlist Vietnam MVP và ngăn Stripe/PayPal quay lại.
- Chưa chạy được các test này.

## 5. Kiểm tra

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Build | BLOCKED / NOT RUN | Windows execution backend unavailable |
| Lint | BLOCKED / NOT RUN | Windows execution backend unavailable |
| Unit Tests | BLOCKED / NOT RUN | Không có local runner |
| Integration Tests | BLOCKED / NOT RUN | Không có local runner |
| Security Tests | BLOCKED / NOT RUN | Không có local runner |
| GitHub Actions | NOT RUN | Không có workflow run cho branch HEAD |

Không có mục nào được ghi PASS khi chưa có bằng chứng thực thi.

## 6. File thay đổi

- `CWS Reports/Task Reports/P2_CODEX_1_PAYMENT_REPORT.md`
- `backend/.env.example`
- `backend/migrations/004_secure_manual_payments.sql`
- `backend/src/common/auth-principal.ts`
- `backend/src/common/guards/admin-role.guard.ts`
- `backend/src/common/guards/jwt-auth.guard.ts`
- `backend/src/config/configuration.ts`
- `backend/src/jobs/domain/render-order.ts`
- `backend/src/jobs/jobs.controller.ts`
- `backend/src/jobs/jobs.module.ts`
- `backend/src/jobs/jobs.service.ts`
- `backend/src/jobs/repositories/render-orders.repository.supabase.ts`
- `backend/src/payments/dto/create-payment.dto.ts`
- `backend/src/payments/payment-methods.spec.ts`
- `backend/src/payments/payment-quote.spec.ts`
- `backend/src/payments/payment-quote.ts`
- `backend/src/payments/payment.types.ts`
- `backend/src/payments/payments.controller.ts`
- `backend/src/payments/payments.module.ts`
- `backend/src/payments/payments.repository.ts`
- `backend/src/payments/payments.service.ts`
- `backend/src/payments/providers/payment-provider.interface.ts`
- `backend/src/payments/providers/qr-bank.provider.ts`
- `backend/src/payments/providers/wallet.provider.ts`
- `src/App.jsx`
- `src/constants/renderConstants.js`
- `src/hooks/usePayment.js`
- `src/pages/PaymentScreen.jsx`
- `src/services/RenderService.js`

Commit chuẩn hóa này chứa code (`payment.types.ts`, DTO allowlist), tests (`payment-methods.spec.ts`) và Markdown report; không phải report-only commit.

## 7. Rủi ro còn lại

- Expected amount chưa gắn durable canonical Quote hoặc verified upload; client vẫn có thể khai thấp file size nhất quán.
- Nếu consume race/fail sau khi order được tạo, có thể còn orphan order chưa dispatch; cần cleanup/retry state.
- JWT chưa enforce issuer, audience và algorithm allowlist.
- Full customer authentication/session UI và admin payment-review console chưa hoàn tất.
- RPC concurrency, migration fixture, auth/ownership, mismatch/refund và job-bypass tests chưa chạy.
- WebSocket/upload ownership là dependency bảo mật liên quan nhưng ngoài patch payment trực tiếp.
- Credential Supabase/B2 từng xuất hiện trong Git history cần revoke/rotate ngay; history purge cần phê duyệt riêng.

## 8. Công việc tiếp theo

Theo đúng Phase P2:

1. Tạo durable canonical Quote từ verified upload/order intake.
2. Bind Payment vào Quote/Order đó thay vì request profile/fileSize.
3. Chạy migration trên staging fixture có legacy rows.
4. Chạy build, lint, unit, integration, concurrency và security test matrix.
5. Thêm admin manual-payment review UI.
6. Hoàn thiện orphan-order cleanup/idempotent job creation.
7. Chỉ sau khi các gate trên đạt mới tiếp tục secure output unlock integration.

## 9. Kết luận

Đã đạt về code:

- Manual MB/VietQR và Manual MoMo
- Customer không tự confirm
- Admin confirm/reject/refund
- Ownership và authorization cơ bản
- Payment reference, expiry, mismatch states
- Append-only audit và duplicate protection
- Stripe/PayPal isolation
- Payment gate trước worker dispatch
- Placeholder-only credential example

Chưa đạt:

- Durable canonical Quote/verified-upload amount authority
- Full executable build/lint/test/security evidence
- Complete job-create recovery
- Hardened JWT issuer/audience/algorithm policy
- Operational admin review UI

**Kết luận cuối: PARTIAL — Pull Request #3 chưa sẵn sàng Merge.** PR phải giữ trạng thái Draft cho đến khi migration và toàn bộ validation gates có bằng chứng PASS.
