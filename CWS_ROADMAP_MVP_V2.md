# CWS — ROADMAP MVP V2

**Ngày rà soát:** 2026-08-04  
**Nhánh nguồn:** `main` tại commit `88521817a3d86da2498c09395b4ff6a58ffc6bef`  
**Mục đích:** Giữ nguyên toàn bộ `CWS_ROADMAP_MVP_V1.md`, bổ sung các yêu cầu MUST HAVE/WANT/BAD IDEA từ nghiên cứu 300 và biến trạng thái thành backlog có evidence/acceptance criteria.

> V2 không thay thế V1. V1 vẫn là tài liệu workflow/roadmap lịch sử và nguồn đối chiếu. Không làm lại hạng mục đã có evidence PASS thật.

## 0. Quy tắc trạng thái

- **PASS — evidence thật:** Có bằng chứng runtime/HTTP/DB/production hoặc test thực tế phù hợp với phạm vi.
- **PASS — code/test:** Code và test pass nhưng chưa chứng minh luồng thật; không được gọi là Full E2E.
- **PARTIAL:** Có một phần chạy được nhưng còn gap bắt buộc.
- **MISSING:** Chưa có cơ chế hoặc chưa có evidence.
- **BLOCKED — OWNER:** Cần credential, tài khoản, quyết định hoặc thao tác của Owner.
- **DEFERRED:** Không làm trong MVP theo DECISIONS hiện hành.

Nghiên cứu 300 chủ yếu là **INFERENCE/HYPOTHESIS**, không phải feedback từ khách CWS thật. Vì vậy mọi mục chỉ được chuyển thành PASS sau khi có evidence phù hợp.

## 1. Baseline đã giữ từ V1

Không viết lại các mục dưới đây:

- Frontend Vercel, landing page, Google Login, customer dashboard.
- Backend Render, API, Job Manager, Worker Manager.
- Supabase, Auth, Customer Profile, Jobs, Payments.
- Backblaze B2 và các vùng source/review/final/logs.
- Admin customer/job/payment/preview/final/search.
- Google OAuth-only cho khách; email/password + MFA chỉ cho staff/admin.
- MB Bank QR + SePay Webhook-only; không MoMo, PayPal, Stripe.
- Worker Python; claim job MVP generic; `--enable-autoexec` tắt cho file khách.
- Preview gate: render → preview watermark → customer approval → payment → final download.
- Security rule: không hardcode secret, không bypass admin, không expose output trước payment.

Evidence baseline: `CWS_ROADMAP_MVP_V1.md`, `DECISIONS.md`, `CWS_MVP_WORKFLOW_FINAL.md`, `CURRENT_STATUS.md` và các report được liệt kê ở cuối tài liệu.

## 2. Giai đoạn 1 — Nền tảng

### Trạng thái

- **PASS — code/production evidence:** Vercel, Render, Supabase/Auth, B2, schema, API và admin foundations.
- **PASS — build/test:** Backend 117/117 Jest, build; frontend build/lint theo evidence 2026-08-03.
- **PARTIAL:** Production runtime chưa được chứng minh bằng Full E2E khách thật.

### Không làm lại

Không viết lại frontend/backend/database/storage/admin đã có evidence PASS. Chỉ sửa khi một gap V2 bên dưới yêu cầu thay đổi có acceptance test cụ thể.

## 3. Giai đoạn 2 — Khách hàng tạo Job và upload

### Đã có

- Google Login thật và Customer Profile.
- Job schema/API, lịch sử Job hook/UI đã có trong code.
- Upload trực tiếp `.blend` tối đa 2GB đã có kiểm tra `MAX_FILE_SIZE_BYTES`/validation trước upload.
- Google Drive resolve/quyền truy cập và hướng dẫn sửa chia sẻ.
- B2 upload route và Storage Code.
- OneDrive/Dropbox/Direct Link chưa được xác minh như Google Drive.

### Bắt buộc còn lại

1. **Upload resume — MISSING/P1.** Thiết kế upload theo chunk/session hoặc cơ chế tương đương; mất mạng không phải upload lại từ đầu. Acceptance: ngắt mạng giữa upload, nối lại và file B2 hash/size đúng.
2. **Cảnh báo giới hạn ngay khi chọn file — VERIFY.** Giữ validation hiện có; test bằng UI rằng file >2GB bị chặn trước network request.
3. **Kiểm tra `.blend` sớm — PARTIAL.** Validate container/header/size và kiểm tra tối thiểu an toàn trước khi vào queue; không chạy arbitrary Blender script. Lỗi phải hiển thị trước khi khách chờ render.
4. **Nguồn file trung thực — PASS (code-level, 2026-08-04).** UI và validation hiện chỉ nhận upload trực tiếp `.blend` hoặc Google Drive; Backend Google Drive resolver là nguồn link duy nhất có integration thật. OneDrive/Dropbox/Direct Link được giữ ngoài MVP cho tới khi có resolver/upload integration và evidence thật.
5. **Không mất draft khi login — P1.** Giữ file/link/metadata qua OAuth redirect và khôi phục draft theo user sau login.
6. **Job history — VERIFY.** Có danh sách Job, trạng thái, giá/payment/download history; kiểm tra ownership bằng tài khoản thật.
7. **Giới hạn MVP công khai — P1.** Hiển thị Blender version/engine/plugin support, `.blend` only, 2GB, queue/render limits và nguồn upload thực tế. Không tự bịa version/engine nếu Worker chưa xác nhận.

## 4. Giai đoạn 3 — Worker và Render

### Đã có evidence

- RPC generic claim đã test cô lập trên production và rollback an toàn.
- Render pipeline thật đã chạy trên Windows + Python 3.12.7 + Blender 5.2.0 với scene local; function-level offline tests 11/11 PASS.
- `--enable-autoexec` đã tắt cho job khách.
- B2 key không còn hardcode; code đọc env và audit scope tối thiểu đã có.
- Worker runtime thật của Fleet chưa được chứng minh end-to-end.

### Bắt buộc còn lại

1. **Claim từ `cws_worker_full.py` — BLOCKED/OWNER.** Claim 1 job Portal thật qua HTTP/RPC bằng Worker production path, không dùng SQL trực tiếp.
2. **B2 upload thật — BLOCKED/OWNER.** Cần key đang chạy thật được nhập vào máy Worker qua cơ chế an toàn; không dán secret vào chat/repo.
3. **Windows + Blender + GPU runtime — PARTIAL.** Local render evidence chưa thay thế Fleet physical evidence; cần 1 job MVP thật từ claim → download → render → upload → verify.
4. **Frame timeout — P1.** Có timeout rõ cho từng frame/job; Worker phải fail/retry an toàn, không treo vô hạn.
5. **Retry/recovery — P1.** Retry lỗi tạm thời có giới hạn và backoff; không retry file lỗi vô hạn; stale generation/lease phải bị fencing.
6. **Progress — P1.** UI hiển thị stage và progress thật; không dùng ETA giả. Queue delay phải có cảnh báo khi vượt threshold Owner chọn.
7. **Cleanup — P1.** Xoá file tạm sau success/fail/retry; evidence disk trước/sau job.
8. **Untrusted `.blend` — P0.** Không bật autoexec cho customer uploads; xác minh addons/plugin và file path không thoát sandbox/work directory.
9. **Worker credential — P0.** Chỉ key tối thiểu bucket/prefix cần thiết; không delete bucket/quản trị; không log secret.

## 5. Giai đoạn 4 — Preview và duyệt

### Đã có

- REVIEW_READY gate.
- 3–5 preview images watermark “CWS RENDER” trong code.
- Approve gate trước payment.
- “Yêu cầu chỉnh sửa” đã được làm rõ là miễn phí/không giới hạn theo hành vi backend hiện tại.

### Bắt buộc còn lại

1. **Preview runtime — PARTIAL.** Verify bằng một render thật; khách chỉ thấy preview, không thấy file gốc trước payment.
2. **Edit request state — P1.** Có trạng thái `REQUESTED → ACKNOWLEDGED → IN_PROGRESS → READY/RESOLVED`, người xử lý và thời gian phản hồi dự kiến.
3. **Kênh liên hệ — BLOCKED/OWNER.** Không để “yêu cầu chỉnh sửa” chỉ là toast; phải có kênh thật hoặc ghi rõ chưa vận hành.
4. **Chính sách sửa — BLOCKED/OWNER.** Hành vi hiện tại là free/unlimited; Owner phải quyết định có giữ nguyên hay chuyển sang số lần/SLA/tính phí.
5. **Video preview — DEFERRED theo DECISIONS.** Nghiên cứu 300 đánh giá video ngắn là MUST HAVE, nhưng workflow/DECISIONS hiện loại video preview đầy đủ khỏi MVP. Không tự mở rộng phạm vi; chỉ làm khi Owner cập nhật DECISIONS.

## 6. Giai đoạn 5 — Giá và minh bạch chi phí

### Hiện trạng

- Có pricing service và final price breakdown code trên các nhánh/commit liên quan.
- V1 ghi rõ ước tính hiện tại chưa phải công thức cuối; main chưa đủ evidence để gọi price cap production.
- Không được tự bịa giá, SLA hoặc trần giá.

### Bắt buộc

1. Pre-render estimate phải giải thích yếu tố ảnh hưởng: frame count, render profile, Worker time/queue, startup/grace nếu áp dụng.
2. Final breakdown phải khớp payment order và audit record.
3. Hiển thị chênh lệch estimate/final.
4. Có price cap hoặc approval gate khi vượt ngưỡng.
5. Có trạng thái “giá ước tính, chưa phải giá cuối” nếu chưa chốt.
6. **OWNER CẦN QUYẾT ĐỊNH:** đơn giá, minimum charge, price cap, tolerance, SLA/queue threshold, startup-grace tính cho khách, refund khi vượt cap.

Acceptance: test unit + HTTP/DB thật trên một order; không tuyên bố minh bạch giá PASS nếu chưa có quyết định và giao dịch thật.

## 7. Giai đoạn 6 — Thanh toán

### Đã có

- MB Bank QR, Payment Code/Storage Code.
- SePay Webhook-only, HMAC ưu tiên, idempotency.
- Sandbox evidence thật: matching và PAID.
- Payment reconciliation view và Admin Dashboard wiring.
- Payment không được yêu cầu trước render/preview.

### Bắt buộc còn lại

1. **Live payment — BLOCKED/OWNER.** Owner liên kết MB Bank thật, cấu hình SePay Live webhook và secret trên Render; không tự giao dịch thật.
2. Hiển thị payment deadline và trạng thái rõ ràng.
3. Webhook duplicate/late/out-of-order phải idempotent và recoverable.
4. Có reconciliation alert cho paid orphan/processing stuck/missing output.
5. Có runbook payment đã chuyển tiền nhưng chưa PAID.
6. **Refund/compensation — BLOCKED/OWNER.** Cần policy và thao tác Admin an toàn; không tự động hoàn tiền khi chưa có quyết định.
7. Không hiển thị Cancel nếu backend không hỗ trợ cancel thực tế.

Acceptance: Sandbox duplicate/late tests PASS; Live chỉ PASS sau giao dịch Owner xác minh.

## 8. Giai đoạn 7 — File cuối và Download

### Đã có

- Final output chỉ mở sau PAID.
- B2 signed URL và ownership check.
- Download audit event.
- TTL hiện tại được xác nhận là 5 phút; retry có thể cấp link mới.

### Bắt buộc còn lại

1. Hiển thị chính xác TTL và cách cấp lại link.
2. Download success/failure phải audit được; không coi “click” là download thành công nếu chưa có evidence phù hợp.
3. Lưu số lần download và thời điểm.
4. **OWNER CẦN QUYẾT ĐỊNH:** thời gian giữ final/source/preview, số lần cấp lại, xử lý link hết hạn và policy xoá.
5. Acceptance: paid owner tải thật, non-owner bị 403, link hết hạn được cấp lại an toàn.

## 9. Giai đoạn 8 — Lưu trữ và quyền riêng tư

### Trạng thái: MISSING/P0-P1

Bắt buộc trước khách thật:

- Chính sách retention cho source, preview, final, logs/temp.
- Job/UX hiển thị thời gian giữ file và cảnh báo trước xoá.
- Scheduled cleanup/idempotency, không xoá nhầm object khác owner.
- Worker cleanup sau job.
- Privacy Policy và Terms of Use thật, không copy claim chưa được vận hành.
- Giải thích Google OAuth chỉ dùng cho identity/profile; không tuyên bố quyền Drive nếu không xin quyền.
- Giải thích Worker model, quyền truy cập file, encryption/retention trong phạm vi thực tế.

**OWNER CẦN QUYẾT ĐỊNH:** số ngày retention, grace period, legal entity, contact pháp lý, xử lý khi khách yêu cầu xoá sớm.

## 10. Giai đoạn 9 — Hỗ trợ khách hàng

### Trạng thái: MISSING/P1

MVP tối thiểu:

- Một kênh thật có người phụ trách.
- Ticket/request code.
- Trạng thái `OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED`.
- Admin xem được ticket gắn với customer/job/payment.
- UI ghi thời gian phản hồi thực tế, không quảng cáo 24/7 nếu chưa vận hành.
- Request changes và payment issue phải trỏ tới cùng kênh support.

**OWNER CẦN QUYẾT ĐỊNH:** email/Zalo/chat/hotline nào, giờ làm việc, SLA phản hồi, ai trực.

## 11. Giai đoạn 10 — Niềm tin và nội dung công khai

### Trạng thái: PARTIAL/MISSING

Landing/FAQ phải nói đúng:

- CWS là gì và workflow.
- Blender/file/size/source limits.
- Giá estimate/final và các yếu tố ảnh hưởng.
- Queue/render expectation.
- Preview watermark và payment gate.
- Security/retention/privacy.
- Payment/failed payment/refund process.
- Support channel.
- Terms/Privacy.

Không được tạo số khách, review, testimonial, uptime, job count hoặc SLA giả. Nếu chưa có khách thật, phải nói “chưa có evidence khách thật” thay vì marketing số liệu.

## 12. Giai đoạn 11 — Admin

### Đã có

- Customer, Job, progress, payment, preview, final, search.
- Admin-only RoleGuard và MFA code/test.
- Payment reconciliation visibility.

### Bắt buộc còn lại

1. Owner tạo staff account thật và enroll/challenge MFA thật.
2. Admin nhìn thấy Job lỗi/treo/stuck queue.
3. Admin nhìn thấy edit requests/support tickets.
4. Payment stuck/orphan có runbook và audit action.
5. Xem retention/deletion status nếu cleanup được triển khai.
6. Retry/requeue/quarantine chỉ bật khi backend có fencing/authorization; không tạo nút chỉ có UI.

## 13. Giai đoạn 12 — Full E2E gate

Không dùng unit/mock/build thay cho gate này. Phải có evidence cho:

`Google Login thật → profile → file thật → Job → B2 → Worker claim → Blender thật → progress → preview → approve → estimate/final price → MB QR → SePay Live → PAID → final B2 → download → COMPLETED`.

Negative/recovery matrix:

- file > limit / file lỗi;
- mất mạng giữa upload và resume;
- Worker crash/timeout/retry;
- claim duplicate/stale attempt;
- B2 download/upload lỗi;
- payment late/duplicate/underpaid/overpaid;
- webhook replay;
- link expired/regenerate;
- cleanup/retention;
- non-owner access;
- edit request/support;
- admin MFA.

Full E2E chỉ PASS khi có khách/tài khoản/file/Worker/payment thật phù hợp và report ghi timestamp, IDs đã redacted, không chứa secret.

## 14. Giai đoạn 13 — Khách hàng thật đầu tiên

Chỉ sau Full E2E:

- Pilot cực nhỏ với khách Blender thật.
- Ghi feedback có consent.
- Đo hiểu workflow, upload friction, estimate trust, preview sufficiency, payment clarity, download, support và ý định quay lại.
- Không tạo testimonial/review trước khi có feedback thật.
- Cập nhật roadmap dựa trên evidence thật, phân biệt với 300 insight giả thuyết.

## 15. Việc không làm trước/sau MVP

Giữ nguyên phạm vi sau MVP:

- Cinema 4D, Maya, After Effects, 3ds Max.
- API/CLI studio, subscription, team collaboration.
- Dedicated Worker, Google Drive delivery trực tiếp.
- AI optimization, referral, marketplace, multi-region, enterprise SLA.
- Scene editor, customer GPU/CPU choice.
- Full video preview trừ khi DECISIONS được Owner cập nhật.

## 16. Thứ tự thực thi V2

1. Worker claim/upload/real runtime và P0 security.
2. Upload resume + early `.blend` validation + draft preservation.
3. Price estimate/breakdown/cap quyết định rõ ràng.
4. Retention/privacy/terms và support channel.
5. Payment live/recovery/refund policy.
6. Preview/edit-request state + customer-facing SLA.
7. Admin MFA thật và stuck/payment/support operations.
8. Full E2E thật.
9. Pilot khách thật và feedback loop.

Mỗi task phải có: code → test → evidence report → cập nhật `CURRENT_STATUS.md`. Không mở lại hạng mục PASS nếu không có regression evidence.

## 17. OWNER CẦN QUYẾT ĐỊNH

- Đơn giá, minimum charge, price cap, SLA và queue-warning threshold.
- Refund/compensation khi render lỗi, timeout hoặc paid nhưng không có output.
- Giữ chính sách edit free/unlimited hay giới hạn/số lần/tính phí.
- Retention source/preview/final/log/temp và grace period.
- Legal entity, Privacy Policy, Terms và contact pháp lý.
- Kênh support, người trực, giờ làm việc và response SLA.
- Live MB Bank/SePay account và thời điểm cho phép giao dịch thật.
- Blender/engine/version/plugin support matrix.
- Có đổi quyết định Google-only hay không (mặc định vẫn Google-only).
- Có đưa video preview ngắn vào MVP hay giữ DEFERRED.

## 18. Evidence sources

- `CWS_ROADMAP_MVP_V1.md`
- `CURRENT_STATUS.md`
- `DECISIONS.md`
- `PROJECT_CONTEXT.md`
- `CWS_WORKER_ROADMAP.md`
- `CWS_MVP_WORKFLOW_FINAL.md`
- `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
- `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`
- `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`
- `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`
- `reports/worker/CWS_CLAIM_TASK_RPC_ISOLATED_TEST_2026-08-03.md`
- `reports/worker/CWS_WORKER_RUNTIME_TEST_2026-08-03.md`
- `reports/worker/CWS_B2_LEAST_PRIVILEGE_AUDIT_2026-08-03.md`
- `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`
- `reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`
- `reports/payments/CWS_PAYMENT_RECONCILIATION_DASHBOARD_WIRING_2026-08-03.md`
- `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md`
- open PR evidence in GitHub, especially PRs #9–#12; open/draft PRs are not counted as merged `main` evidence.

## 19. Definition of Done V2

MVP V2 is complete only when:

- V1 baseline remains intact.
- Customer creation/upload/resume/draft preservation is verified.
- Worker claim + Blender render + B2 upload is verified on the real path.
- P0 security is verified.
- Preview/review/edit request is verified.
- Price is understandable and capped/approved by policy.
- Live payment/recovery is verified.
- Download/ownership/retention is verified.
- Support exists and is traceable.
- Admin/MFA/operations are verified.
- Full E2E real flow passes.
- First small real-customer pilot produces recorded feedback.

Until then, status is **MVP V2 NOT COMPLETE**.
