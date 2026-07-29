# P2 CODEX 3 — Secure Original Output Report

## 1. Thời gian

- Ngày audit: 2026-07-30
- Múi giờ: Asia/Saigon

## 2. Roadmap đã đọc

Đã đọc toàn bộ `public/CWS_FULL_ROADMAP_OFFICIAL_V1_1.md` trên `main` (blob SHA `be8da384280328f4963ce81559801de73c620606`). Phạm vi trực tiếp là P2.7 Secure original-output unlock và các yêu cầu authorization, ownership, storage, audit và test liên quan. `AGENTS.md` không tồn tại ở repository root (GitHub trả 404).

## 3. Branch

`agent-3-secure-output-p2`, tạo từ `main`. Không tạo worktree/clone/thư mục Windows. Không sửa hoặc merge `main`.

## 4. Commit

Báo cáo này được tạo bằng commit `feat(p2): secure original output access`. Commit SHA được ghi nhận trong kết quả GitHub của phiên làm việc.

## 5. Agent chính

CODEX 3 — Secure Output Implementation Leader.

## 6. Agent con và trạng thái

- Output Authorization Analyst: COMPLETE (read-only audit).
- Output Security & QA Reviewer: COMPLETE (read-only adversarial review).

Cả hai chạy song song, không chỉnh code, push, merge hay tạo worktree.

## 7. Scope

Audit và thiết kế patch tối thiểu cho khóa/mở khóa original output, owner/admin authorization, signed URL, download audit và refund/revoke re-lock. Không thay đổi payment-provider internals của CODEX 2.

Implementation code bị chặn trước khi có thể chỉnh sửa và kiểm thử an toàn; chỉ báo cáo evidence/blocker được commit.

## 8. Evidence table

| Hạng mục | Evidence repository | Trạng thái | Test | Xung đột / bước tiếp theo |
|---|---|---|---|---|
| Authentication | `backend/src/common/guards/jwt-auth.guard.ts` chỉ verify token và ghi rõ chưa áp dụng jobs/payments/files | PARTIAL | Chưa chạy | Attach typed principal, validate issuer/audience |
| Server authorization | Jobs list/detail/status/cancel công khai trong `jobs.controller.ts` | MISSING | Chưa có | Áp guard và owner/admin policy |
| Ownership | Migration/domain render order không có owner/customer ID | MISSING | Chưa có | Mở rộng canonical render order, không tạo Order mới |
| Admin role | Không có role guard/decorator/server validation | MISSING | Chưa có | Thêm role validation server-side |
| Payment gate | `JobsService.createOrder()` hardcode `paymentStatus: 'paid'` | CONFLICTING/BLOCKED | Chưa có | Consume verified-payment port từ CODEX 2; deny closed |
| Storage adapter | B2 adapter tồn tại nhưng trả URL ổn định endpoint/bucket/key | PARTIAL/CONFLICTING | Chưa có | Giữ adapter; persist object key; presign on demand |
| Signed URL | Không có presigner/TTL thực thi | MISSING | Chưa có | Signed GET ngắn hạn, không persist URL |
| Output authorization | Presenter/list/detail expose `downloadUrl` | MISSING | Chưa có | Endpoint issue URL sau owner/admin + payment + readiness check |
| Download audit | Không có DownloadEvent/audit implementation | MISSING | Chưa có | Append-only event cho allowed/denied/redemption |
| Refund/revoke relock | Payment states hiện không cung cấp policy signal ổn định | BLOCKED | Chưa có | CODEX 2 expose effective state; deny issuance khi revoked/refunded |
| RLS | Service-role bypass RLS; render order thiếu policy | PARTIAL/CONFLICTING | Chưa có | Service checks bắt buộc + RLS defense in depth |
| Realtime | `/ws/jobs/:id` không auth/ownership | MISSING | Chưa có | Auth handshake và ownership authorization |
| Frontend DB mutation | Frontend đi qua RenderService, không direct Supabase mutation | COMPLETE | Chưa chạy | Giữ boundary; thêm auth credentials |

## 9. Authorization model

Mục tiêu tối thiểu: JWT tạo typed server principal; mọi route output yêu cầu authenticated principal; policy chỉ cho `order.ownerId === principal.userId` hoặc role admin được server xác thực. Không chấp nhận role/header/flag do frontend tự khai báo. Service-role database client không thay thế authorization ở controller/service.

## 10. Ownership model

Phải mở rộng canonical render order hiện hữu với owner/customer reference và liên kết output hiện hữu. Không tạo Order, Job, Payment hoặc Output model canonical thứ hai. Non-owner phải nhận 403 kể cả biết job/output ID.

## 11. Payment dependency

CODEX 3 không sửa `backend/src/payments/**`, payment migrations hoặc provider semantics. Secure output cần một `PaymentAuthorizationPort` nhỏ, backward-compatible, đọc trạng thái verified canonical từ CODEX 2. Chỉ `CONFIRMED` được unlock; `REFUNDED`, `REVOKED`, `REJECTED`, mismatch hoặc trạng thái không rõ phải deny closed. Không suy luận payment confirmed từ client-supplied `paymentId`.

## 12. Storage access model

Giữ `StorageAdapter` abstraction và private bucket. Database chỉ lưu object key/metadata, không lưu public permanent URL. Customer/worker không nhận credential storage rộng hoặc vĩnh viễn. Application phát hành signed GET URL ngắn hạn sau authorization.

## 13. Signed URL policy

URL phải tạo on demand, TTL cấu hình ngắn, không xuất hiện trong list/detail/history, không lưu sessionStorage/database/log/audit. API trả `url` và `expiresAt`; expired/tampered token bị từ chối. Signed query string phải được redaction khỏi log.

## 14. Unlock policy

Preview có thể truy cập trước payment theo policy riêng. Original chỉ mở khi output ready, principal là owner/admin và payment port trả confirmed. Transition/grant phải idempotent và an toàn khi gọi đồng thời; duplicate request không tạo duplicate grant/event/notification.

## 15. Re-lock policy

Refund/revoke phải chặn mọi URL issuance mới ngay lập tức. Outstanding token phải bị vô hiệu hoặc bị redemption gate từ chối khi kiến trúc storage/CDN hỗ trợ. Policy signal thuộc canonical payment interface của CODEX 2.

## 16. Download audit

Cần append-only event cho issue attempt và download/redemption outcome, gồm actor, order, output, action, outcome, timestamp và correlation ID. Không lưu signed URL, token, secret hoặc private storage path.

## 17. File tạo

- `CWS Reports/Task Reports/P2_CODEX_3_SECURE_OUTPUT_REPORT.md`

## 18. File sửa

Không có file code được sửa do blocker môi trường và dependency.

## 19. Migration

Không tạo migration. Migration dự kiến phải mở rộng canonical order/output ownership và thêm append-only `download_events`, có rollback phù hợp và RLS defense in depth.

## 20. API changes

Không đổi API trong commit này. Patch dự kiến: endpoint server-side như `POST /jobs/:id/output-access`, trả signed URL ngắn hạn sau đầy đủ authorization; loại `downloadUrl` bền vững khỏi list/detail.

## 21. Tests đã thực sự chạy

Không có. Local Windows execution backend từ chối mọi Git/filesystem command trước khi process chạy, kể cả read-only và escalation hợp lệ.

## 22. Kết quả test

- Build: NOT RUN (environment blocker)
- Lint: NOT RUN (environment blocker)
- Unit: NOT RUN (environment blocker)
- Integration: NOT RUN (environment blocker)
- Authorization/security: NOT RUN (environment blocker)

Không tuyên bố PASS.

## 23. Security findings

Release blockers:

1. Public job enumeration/detail/cancel không owner authorization.
2. Payment gate có thể bypass do hardcoded paid.
3. Permanent output URL bị expose trong API/UI.
4. Không signed URL expiry.
5. Không download audit hoặc re-lock.
6. WebSocket job realtime thiếu auth/ownership.
7. Upload/file reference thiếu owner binding.
8. JWT guard thiếu principal/role/issuer/audience validation.
9. Service-role bypass RLS khiến server-side checks bắt buộc.

## 24. Lỗi đã sửa

Không có lỗi code được sửa trong phiên này. Việc giả lập implementation hoặc ghi kết quả test không thực chạy đã được tránh.

## 25. Hạn chế

Không thể checkout/sync/status/diff/build/lint/test local branch vì Windows sandbox backend lỗi trước execution. GitHub connector chỉ được dùng để đọc evidence, tạo branch và ghi báo cáo.

## 26. Blocker

- Local repository execution/write unavailable do managed Windows sandbox backend.
- Stable verified-payment/refund/revoke interface của CODEX 2 chưa được xác nhận.
- Vì hai blocker trên, không thể implement và chứng minh secure-output Definition of Done an toàn.

## 27. Tiến độ P2

P2.7: MISSING/BLOCKED. Audit và patch boundary hoàn tất; implementation, migration và tests chưa hoàn tất. Không được coi P2 secure output là production-ready.

## 28. Rollback notes

Commit này chỉ thêm một Markdown report. Rollback bằng cách revert commit báo cáo trên branch; không có schema/API/runtime changes.

## 29. Recommended next task

1. Khôi phục local repository execution.
2. Đồng bộ branch với current `origin/main`.
3. Xác nhận CODEX 2 `PaymentAuthorizationPort`/effective states.
4. Implement deny-closed owner/admin output-access service, private presigning và audit migration.
5. Loại permanent URL khỏi presenters/frontend persistence.
6. Chạy build, lint, unit, integration và security matrix; chỉ sau đó mới nâng trạng thái P2.7.
