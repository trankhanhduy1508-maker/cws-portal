# CWS MVP V2 — Source Reconciliation Evidence

**Ngày:** 2026-08-04  
**Branch:** `agent/roadmap-mvp-v2`  
**Base:** `main` commit `88521817a3d86da2498c09395b4ff6a58ffc6bef`

## Phạm vi

Rà soát để tạo `CWS_ROADMAP_MVP_V2.md`, không thay thế `CWS_ROADMAP_MVP_V1.md` và không tính các PR chưa merge vào trạng thái PASS của `main`.

Đã đối chiếu:

- `CWS_ROADMAP_MVP_V1.md`
- `CURRENT_STATUS.md`
- `DECISIONS.md`
- `PROJECT_CONTEXT.md`
- `CWS_WORKER_ROADMAP.md`
- `CWS_MVP_WORKFLOW_FINAL.md`
- toàn bộ file `reports/customer/` — hiện có `CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
- các report worker/payment/admin/dev liên quan
- commit mới nhất và các PR mở trên repository

## Kết luận trạng thái

V1 có nhiều phần PASS thật ở infrastructure, build/test, HTTP/DB sandbox và security code. Tuy nhiên chưa có Full E2E khách thật từ upload → Worker production claim → Blender/B2 → preview → live payment → download.

Các bằng chứng mạnh nhất trên main:

- Google OAuth/Profile và hạ tầng production đã được xác nhận.
- B2 signed URL/ownership/download audit đã có HTTP evidence.
- SePay Sandbox đã có evidence thật; Live payment chưa xác minh.
- Backend Jest 117/117, build/lint và frontend build/lint đã PASS theo report dev.
- Worker render pipeline đã chạy thật trên Windows + Python + Blender local test; đây không phải Fleet customer E2E.
- Generic claim RPC đã test cô lập production và rollback; Worker production path claim/upload thật vẫn còn thiếu.
- B2 credential đã chuyển khỏi hardcode và audit scope tối thiểu đã có; key runtime thật chưa có trong environment test.
- Admin MFA/RoleGuard có code/unit evidence; staff account + authenticator enrollment thật chưa được Owner xác nhận.
- Customer research 300 xác nhận nhiều gap về resume upload, giới hạn công khai, preview/review, giá, payment recovery, retention/privacy, support và trust. Phần lớn là inference/hypothesis vì chưa có khách CWS thật.

## Quyết định phạm vi được giữ nguyên

Theo `DECISIONS.md` và `CWS_MVP_WORKFLOW_FINAL.md`:

- Google-only cho khách; không tự thêm email/password, Zalo, OTP hay Facebook.
- QR ngân hàng Việt Nam + SePay Webhook-only.
- Preview hiện là 3–5 ảnh watermark; video preview giữ DEFERRED.
- Worker Python, generic claim additive, customer `.blend` không được autoexec.
- B2 là storage chính.
- Không mở các tính năng sau MVP để né các gap MVP thực tế.

## Gap P0/P1 được đưa vào V2

1. Worker claim/upload/runtime thật.
2. Giữ P0 security: B2 least privilege và không autoexec file khách.
3. Resume upload, early `.blend` validation, draft preservation và ẩn nguồn upload chưa hoạt động.
4. Price estimate/breakdown/cap và policy do Owner chốt.
5. Retention/privacy/terms.
6. Support thật và ticket state.
7. Payment Live/recovery/refund policy.
8. Preview runtime/edit request state.
9. Admin MFA thật và operations cho stuck/error/payment/support.
10. Full E2E và pilot khách thật.

## Evidence không được phóng đại

- Unit/mock/build không được tính là Full E2E.
- PR mở/draft #9–#12 không được tính là đã merge vào main.
- Research 300 không được gọi là feedback khách CWS thật.
- Không tự bịa giá, SLA, retention, refund, support channel, Blender matrix hoặc customer metrics.

## Files changed by this roadmap branch

- `CWS_ROADMAP_MVP_V2.md`
- `reports/CWS_MVP_V2_SOURCE_RECONCILIATION_2026-08-04.md`

