# CWS Customer Requirements Completeness Audit — 2026-08-03

## Phạm vi và source of truth

Đã đọc trực tiếp toàn bộ `reports/customer/`, trong đó report chính là
`CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md` (300 insight: A/B pain points,
C requirements, Kano labels), cùng `CURRENT_STATUS.md`, `DECISIONS.md`,
`PROJECT_CONTEXT.md`, `LOOP.md`, `CWS_ROADMAP_MVP_V1.md`,
`CWS_MVP_WORKFLOW_FINAL.md`, `CWS_WORKER_ROADMAP.md` và các evidence mới nhất
về Worker, payment, Admin MFA, core-flow và build/test.

`CWS_MVP_WORKFLOW_FINAL.md` là workflow chính thức. Vì tài liệu này ghi rõ
“Không gửi video preview”, C4.1 dù được Customer Research gắn MUST HAVE được
phân loại `POST_MVP`, không đưa vào mẫu số MVP.

Trạng thái được đánh theo evidence hiện tại, không coi unit/mock/build là
Full E2E. `CODED_NOT_VERIFIED` có code/test hoặc evidence cô lập nhưng thiếu
runtime/full-flow evidence. `HUMAN_BLOCKER` là phần cần Owner/account/credential/
hardware/live operation.

## Customer MVP completion

Có **29 MUST HAVE còn hiệu lực trong MVP** (30 MUST HAVE trong research trừ
C4.1 video preview đã bị official workflow loại khỏi MVP). Bảng tổng hợp
toàn bộ 100 requirement C1–C10 sau vòng implementation được ghi trong report
implementation ngày 2026-08-04; các dòng dưới đây vẫn giữ phân loại chi tiết
theo từng requirement và evidence.

| PASS | PARTIAL | CODED_NOT_VERIFIED | MISSING | HUMAN_BLOCKER | POST_MVP |
|---:|---:|---:|---:|---:|---:|
| 6 | 2 | 4 | 14 | 3 | 0 |

Kết luận: **CWS chưa Customer MVP Requirements Complete**; còn gap cần policy,
support channel, resumable upload/link verification và runtime Fleet thật.

## Official workflow matrix

| Workflow requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| Google Login | `CWS_MVP_WORKFLOW_FINAL.md` Login | Supabase Google OAuth | Auth tests + real DB verification 2026-08-01 | PASS | Full customer flow chưa nối tiếp | P0 |
| Customer Profile | official workflow | Auth trigger/profile repository | Real account/DB evidence in status | PASS | Full flow chưa nối tiếp | P0 |
| Create Job | official workflow | `POST /jobs`, unit/mock E2E | `MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md` | CODED_NOT_VERIFIED | Chưa tạo qua UI bằng customer thật | P0 |
| Drive/link access check | official workflow | Google Drive API thật; nguồn khác chỉ syntax | `google-drive.service.spec.ts`, HTTP evidence | PARTIAL | OneDrive/Dropbox/Direct Link chưa verify file thật | P1 |
| B2 source upload | official workflow | `POST /files/upload`, signed storage wiring | HTTP evidence 2026-08-02 | CODED_NOT_VERIFIED | Chưa gắn trong full customer flow; key Fleet mới chưa verify | P0 |
| Generic Worker claim | official workflow | RPC 014 + Worker generic path | DB isolated claim/revert evidence | CODED_NOT_VERIFIED | Chưa chạy chính `cws_worker_full.py` qua HTTP trên job customer | P0 |
| Render | official workflow | Blender render functions + autoexec gate | Windows test machine render/offline tests | CODED_NOT_VERIFIED | Chưa chạy trên Fleet thật với job customer | P0 |
| Real progress/error | official workflow | state/stage progress + incidents | code/tests; no full-flow evidence | CODED_NOT_VERIFIED | Chưa nối tiếp trong customer E2E | P1 |
| 3–5 watermarked preview frames | official workflow | preview service selects/watermarks/uploads | code/unit; roadmap still NEEDS_VERIFICATION | CODED_NOT_VERIFIED | Chưa có preview data từ job customer thật | P0 |
| Customer review/edit request | official workflow | approve + requestChanges; copy says free/unlimited | backend tests + ReviewScreen evidence | PASS | Timeline/support channel chưa có | P1 |
| MB Bank QR | official workflow | QR provider/SePay wiring | sandbox evidence | PASS | Live bank account not verified | HUMAN |
| Webhook → PAID | official workflow | SePay Webhook/HMAC/API-key guards | Sandbox E2E/DB evidence | CODED_NOT_VERIFIED | Live webhook not verified | HUMAN |
| Final unlock/download | official workflow | PAID gate + signed URL + download log | real HTTP evidence 2026-08-02 | CODED_NOT_VERIFIED | Chưa nối tiếp từ customer job | P0 |
| COMPLETED | Definition of Done | Scheduler/finalize code | unit/mock evidence | CODED_NOT_VERIFIED | Chưa có full chain thật | P0 |

## Full Customer requirement matrix (C1–C10)

### C1 — Minh bạch và tin tưởng

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C1.1 Bảng giá/công thức công khai | Research C1.1 | PaymentScreen công khai công thức runtime Worker × 6.000đ/giờ × hệ số 2 | `PaymentScreen.jsx`; frontend build/lint/test | PARTIAL | Chưa có bảng giá public trước khi tạo job | P1 |
| C1.2 About/pháp nhân/ToS/privacy | C1.2, A1/A10 | Không có page/policy tương ứng | grep `src/`, official docs | MISSING | Thiếu trust/legal surface | P1 |
| C1.3 Số Worker/uptime thật | C1.3 | Có Admin/Worker data, không public landing | `worker-fleet.gateway.ts`, Landing | MISSING | Chưa public metric | P2 |
| C1.4 Case study/review thật | C1.4 | Chưa có customer hoàn tất | core-flow report | POST_MVP | Cần khách thật trước | P2 |
| C1.5 Chính sách xoá file sau X ngày | C1.5, A2.2/B5.9 | Không có retention/delete policy | B2/storage audit | MISSING | Cần Owner chốt policy rồi code/schedule | P1 |
| C1.6 Cam kết encryption/auto-delete | C1.6 | Chưa có public commitment | grep/docs | POST_MVP | Phụ thuộc policy/legal | P2 |
| C1.7 Không dùng số liệu giả | C1.7 | Không tạo số liệu giả | code audit | POST_MVP | BAD IDEA, không implement | — |
| C1.8 Giải thích Worker là máy đối tác | C1.8 | FAQ Landing nêu Worker là máy thật do đối tác vận hành | Landing + build/test | PASS | Không có SLA/metric giả | P2 |
| C1.9 Minh bạch giới hạn `.blend`/2GB/có thể chờ | C1.9 | FAQ/Upload copy nêu `.blend`, 2GB, Worker online và thời gian chờ | Landing/Upload + build/test | PASS | Không có queue threshold cụ thể, nhưng giới hạn thật đã rõ | P1 |
| C1.10 Chứng chỉ/audit bên thứ ba | C1.10 | Không có | docs | POST_MVP | Không cần MVP | — |

### C2 — Giá và thanh toán

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C2.1 Price cap | C2.1/B2.8 | Không có cap | pricing tests/code | MISSING | Cần Owner chốt X% trước khi code | P1 |
| C2.2 Breakdown Worker/giờ/đơn giá | C2.2/B2.5 | UI nêu rate, multiplier và runtime đã chốt; amount backend vẫn là tổng | `pricing.service.ts`, `PaymentScreen.jsx`; targeted tests | PARTIAL | Chưa trả từng dòng breakdown/worker từ API | P1 |
| C2.3 Countdown thanh toán | C2.3/B3.2 | Không có countdown | PaymentScreen | MISSING | Chưa có expiry contract cho payment | P2 |
| C2.4 Payment tolerance | C2.4 | Exact match theo decision | SePay research/decision | POST_MVP | Decision active yêu cầu khớp tuyệt đối | — |
| C2.5 MoMo/ZaloPay | C2.5 | QR bank only | DECISIONS.md | POST_MVP | Explicitly out of MVP | — |
| C2.6 Test credit | C2.6/A9 | Không có | official MVP scope | POST_MVP | Chưa chốt trong MVP | — |
| C2.7 Không hiện nút Huỷ giả | C2.7 | PaymentScreen bỏ nút, giải thích static | commit `27a10f4`, tests/build | PASS | Không còn gap MVP | P0 |
| C2.8 Tự chọn Worker | C2.8 | Không có | Research marks BAD IDEA | POST_MVP | Không implement | — |
| C2.9 Email payment confirmation | C2.9/B3.9 | Không có email channel | code audit | POST_MVP | Không thuộc official MVP | — |
| C2.10 Subscription | C2.10 | Không có | research | POST_MVP | Không thuộc MVP | — |

### C3 — Upload và định dạng

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C3.1 Resume upload | C3.1/A5.3 | Upload một lần, không resume | `useFileUploadResolver`, RenderService | MISSING | Mất mạng phải upload lại | P1 |
| C3.2 Verify OneDrive/Dropbox/Direct | C3.2/A3.4 | URL syntax only ngoài Google Drive | `google-drive.service.ts` + specs | PARTIAL | Chưa xác minh file/permission thật | P1 |
| C3.3 Cảnh báo size trước upload | C3.3/A5.9 | `validateFile` trước submit, 2GB | `fileUtils.js`, frontend build/test | PASS | Không còn gap code | P1 |
| C3.4 Client compression | C3.4 | Không có | official scope | POST_MVP | Không cần MVP | — |
| C3.5 Multi-software | C3.5 | Chỉ Blender | roadmap/UploadScreen | POST_MVP | MVP chỉ `.blend` | — |
| C3.6 Unlimited upload | C3.6 | Hard limit 2GB | files controller | POST_MVP | BAD IDEA | — |
| C3.7 Detailed upload progress | C3.7 | Không thấy byte/speed/ETA upload | frontend audit | MISSING | UX thiếu với file lớn | P2 |
| C3.8 Early `.blend` open check | C3.8 | Chỉ extension/size; Blender check ở Worker | `validateFile`, Worker render | MISSING | Lỗi chỉ phát hiện sau queue | P1 |
| C3.9 Desktop uploader | C3.9 | Không có | research | POST_MVP | Không cần MVP | — |
| C3.10 Linked asset inspection | C3.10 | Không có | research | POST_MVP | Không cần MVP | — |

### C4 — Preview và duyệt

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C4.1 Video preview | C4.1/B1.2 | Official workflow explicitly excludes video preview | `CWS_MVP_WORKFLOW_FINAL.md` | POST_MVP | Không implement trong MVP | — |
| C4.2 Customer chooses frames | C4.2 | Auto-select representative frames | `preview.service.ts` | POST_MVP | Không thuộc MVP | — |
| C4.3 Lighter watermark | C4.3 | Required diagonal watermark | official workflow | POST_MVP | Policy chưa đổi | — |
| C4.4 Edit request timeline | C4.4/B1.6 | Static notification/admin contact only | ReviewScreen/jobs.service | MISSING | Chưa có status/timeline/SLA | P1 |
| C4.5 Zoom preview | C4.5 | Không có zoom | ReviewScreen | POST_MVP | DELIGHTER | — |
| C4.6 Frame annotations | C4.6 | Note text only | requestChanges DTO | POST_MVP | DELIGHTER | — |
| C4.7 No-watermark preview | C4.7 | Watermark required | official workflow | POST_MVP | BAD IDEA | — |
| C4.8 Clarify edit free/unlimited | C4.8 | UI/backend confirm free/unlimited | commit `55e2867`, evidence | PASS | Không còn gap MVP | P1 |
| C4.9 Side-by-side original | C4.9 | Không có | research | POST_MVP | Explicitly defer after MVP | — |
| C4.10 Clarify representative/final difference | C4.10 | “Xem trước”/watermark, chưa nói rõ final may differ | ReviewScreen/PreviewScreen | PARTIAL | Cần copy chính xác hơn | P2 |

### C5 — Bảo mật và riêng tư

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C5.1 Least-privilege B2 key | C5.1/A2.9 | Env-only code, new scoped key prepared by Owner | P0 fix + least-privilege audit; old key 401 | HUMAN_BLOCKER | Fleet key switch/runtime verify còn thiếu | P0 |
| C5.2 Disable autoexec for customer input | C5.2 | `enable_autoexec=False` generic path | code + offline test; claim DB isolated | CODED_NOT_VERIFIED | Full Worker customer runtime chưa verify | P0 |
| C5.3 Public statement Worker cannot view file | C5.3/A2.1 | Không có enforceable/public statement | code/docs audit | MISSING | Cần wording/policy, không được hứa quá mức | P1 |
| C5.4 Isolated Worker | C5.4 | Không có | research | POST_MVP | DELIGHTER | — |
| C5.5 Automatic deletion policy | C5.5/B5.9 | Không có delete/retention flow | storage audit | MISSING | Owner phải chốt retention trước | P1 |
| C5.6 Expose detailed Worker logs | C5.6 | Admin logs only | research marks BAD IDEA | POST_MVP | Không implement | — |
| C5.7 Liability/compensation ToS | C5.7 | Không có legal policy | docs audit | POST_MVP | Owner/legal decision | — |
| C5.8 Local Worker temp cleanup | C5.8 | Guarded cleanup helper + calls | commit `5c951be`; Python runtime unavailable | CODED_NOT_VERIFIED | Chạy offline test trên Python runtime | P1 |
| C5.9 Independent security certification | C5.9 | Không có | research | POST_MVP | Không cần MVP | — |
| C5.10 Explain Google auth scope | C5.10/A4 | UI copy now says auth-only/no Drive read requested | `AuthService.js` has no Drive scope; frontend build/test PASS | PASS | Cần browser verify wording visually | P2 |

### C6 — Support và giao tiếp

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C6.1 Fast human support | C6.1/B6 | Không có channel | grep frontend + research | HUMAN_BLOCKER | Owner phải chọn/vận hành channel | P1 |
| C6.2 Contact channel for edits | C6.2/B6.2 | Text says contact Admin, no channel | ReviewScreen | HUMAN_BLOCKER | Cần URL/email/Zalo/hotline thật | P1 |
| C6.3 Zalo/hotline | C6.3 | Không có | code audit | HUMAN_BLOCKER | Cần Owner cung cấp channel | P2 |
| C6.4 Public FAQ | C6.4/A8.5 | Landing `<details>` trả lời mô hình Worker, preview/payment và giới hạn MVP | Landing + build/test | PASS | Cần mở rộng chỉ khi có câu hỏi thật | P2 |
| C6.5 No unsupported 24/7 promise | C6.5 | Không thấy promise | grep | POST_MVP | Không cần build feature | — |
| C6.6 Ticket tracking | C6.6/B6.10 | Không có ticket model/UI | code audit | MISSING | Feature/support operation chưa định nghĩa | P2 |
| C6.7 AI chatbot | C6.7 | Không có | research | POST_MVP | DELIGHTER | — |
| C6.8 Proactive email/push | C6.8 | Scheduler notifications internal only | scheduler audit | POST_MVP | Không thuộc official MVP | — |
| C6.9 Public community | C6.9 | Không có | research | POST_MVP | Không phải product MVP | — |
| C6.10 Response commitment | C6.10 | Không có published capacity | code audit | HUMAN_BLOCKER | Owner phải cam kết mức thực tế | P1 |

### C7 — Tài khoản và đăng nhập

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C7.1 Alternative login | C7.1/A4 | Google-only by active decision | DECISIONS.md | POST_MVP | Explicitly no email/OTP/Zalo for customers | — |
| C7.2 Demo/flow before login | C7.2/A4.5 | Landing/upload visible; auth at start render | App.jsx flow + Auth tests | PASS | Không cần login để xem/chọn | P1 |
| C7.3 Popup OAuth | C7.3 | Full-page redirect | Auth migration + active decision | POST_MVP | UX alternative not MVP | — |
| C7.4 Business multi-member account | C7.4 | Không có | official MVP scope | POST_MVP | Enterprise module | — |
| C7.5 Fully anonymous | C7.5 | Không có | research marks BAD IDEA | POST_MVP | Không implement | — |
| C7.6 Explain login reason | C7.6 | Upload copy now explains ownership/history | frontend build/test | PASS | Browser visual check pending | P1 |
| C7.7 Account job history/cost/status | C7.7 | `useJobHistory` + HistoryScreen | code; no full customer runtime | CODED_NOT_VERIFIED | Runtime auth/history not E2E | P1 |
| C7.8 Save profile/preset | C7.8 | Không có preset | research | POST_MVP | DELIGHTER | — |
| C7.9 Explain no Drive access | C7.9 | Auth copy says no Drive scope requested | AuthService + copy | PASS | Browser verify pending | P2 |
| C7.10 Pre-login job ownership safety | C7.10 | Job creation occurs after auth/start flow | App.jsx + JobsService ownership tests | PASS | Full browser flow pending | P0 |

### C8 — Giao/nhận file

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C8.1 Longer TTL or clear reissue | C8.1/B5.1 | Backend TTL 300s; route generates fresh signed URL | jobs.service + signed URL evidence; copy fixed | PARTIAL | TTL remains short, reissue UX not separately tested | P1 |
| C8.2 Email ready notification | C8.2/B5.6 | Không có | code audit | POST_MVP | Not official MVP | — |
| C8.3 Direct Google Drive delivery | C8.3 | Không có | research | POST_MVP | DELIGHTER | — |
| C8.4 Show reissue count/expiry | C8.4 | UI hiển thị TTL 5 phút, mỗi click gọi lại route cấp signed URL và đếm request trong phiên | `PreviewDownloadScreen.jsx`; build/lint/test | PASS | Count là session UI, chưa phải audit count server | P1 |
| C8.5 Browser final preview | C8.5 | Static placeholder/metadata, no final preview | PreviewDownloadScreen | POST_MVP | Not required MVP | — |
| C8.6 Unlimited public share | C8.6 | Not implemented | research marks BAD IDEA | POST_MVP | Do not implement | — |
| C8.7 Output format/compression choice | C8.7 | Backend chooses MP4/ZIP | packaging service | POST_MVP | Want, not MVP | — |
| C8.8 Sync watermark final | C8.8 | Preview watermark only | storage/packaging audit | POST_MVP | DELIGHTER | — |
| C8.9 Explicit successful download confirmation | C8.9 | UI xác nhận trạng thái đã thanh toán và ghi nhận số lần yêu cầu cấp link; backend log mỗi route download | `PreviewDownloadScreen.jsx`, downloads repository; build/lint/test | PARTIAL | Chưa thể xác nhận browser đã ghi file thành công | P1 |
| C8.10 Public retention policy | C8.10 | No policy | storage audit | MISSING | Owner policy + implementation needed | P1 |

### C9 — Tốc độ và độ tin cậy render

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C9.1 Per-frame timeout | C9.1/B4.2 | `render_single_frame` có timeout 3600s và trả persistent để vòng ngoài xử lý | `cws_worker_full.py`; code inspection (Python runtime unavailable) | CODED_NOT_VERIFIED | Chưa chạy trên Fleet thật | P1 |
| C9.2 Detailed render progress | C9.2/B4.7 | State/stage progress + UI | roadmap + code/tests | PASS | Full customer runtime pending | P1 |
| C9.3 Generic MVP claim | C9.3 | Migration 014/RPC + code path | production DB isolated claim/revert | CODED_NOT_VERIFIED | Worker HTTP claim/customer render pending | P0 |
| C9.4 SLA by profile | C9.4 | Không có | research | POST_MVP | No SLA promise without operations evidence | — |
| C9.5 Stage notifications | C9.5 | Internal state only | scheduler/realtime code | POST_MVP | Not official MVP | — |
| C9.6 Hardware selection | C9.6 | Không có | research marks BAD IDEA | POST_MVP | Do not implement | — |
| C9.7 Queue threshold warning/free cancel | C9.7 | Profile screen cảnh báo khi queue ≥30 phút và cho quay lại đổi profile/hủy trước render | `RenderProfileScreen.jsx`; frontend build/lint/test | PARTIAL | Chưa có runtime customer và policy cancel end-to-end | P1 |
| C9.8 Cross-worker consistency | C9.8 | No formal guarantee | research | POST_MVP | Needs operations/benchmark | — |
| C9.9 Scheduled render window | C9.9 | Không có | research | POST_MVP | DELIGHTER | — |
| C9.10 Automatic transient retry | C9.10 | `fail_task`/requeue path exists | worker code/RPC tests; no full runtime | CODED_NOT_VERIFIED | Runtime Fleet retry pending | P1 |

### C10 — Nâng cao/hợp tác nhóm

| Customer requirement | Source | Current implementation | Evidence | Status | Gap | Priority |
|---|---|---|---|---|---|---|
| C10.1 API/CLI pipeline | C10.1 | Không có public API/CLI | official “not MVP” scope | POST_MVP | Defer until point A | — |
| C10.2 Multi-software | C10.2 | Blender only | roadmap | POST_MVP | Defer | — |
| C10.3 Team members | C10.3 | Không có | official scope | POST_MVP | Enterprise | — |
| C10.4 Web scene editor | C10.4 | Không có | research marks BAD IDEA | POST_MVP | Do not implement | — |
| C10.5 Auto render optimization suggestions | C10.5 | Worker has internal analysis | worker code | POST_MVP | DELIGHTER, not customer MVP contract | — |
| C10.6 Monthly cost reports | C10.6 | Không có customer report | research | POST_MVP | Post-MVP business feature | — |
| C10.7 Slack/Discord notifications | C10.7 | Không có | official scope | POST_MVP | Post-MVP | — |
| C10.8 Render auction | C10.8 | Không có | research marks BAD IDEA | POST_MVP | Do not implement | — |
| C10.9 Saved render presets | C10.9 | Không có | research | POST_MVP | Post-MVP | — |
| C10.10 Referral | C10.10 | Không có | research | POST_MVP | Post-MVP | — |

## Critical A/B objections not represented as separate C MUST HAVE

These are important customer objections but are either covered above or are
not implementable without an Owner decision/real operations:

| Objection cluster | Covered by | Current result |
|---|---|---|
| No real customer proof/trust | C1.2/C1.4/C6.10 | No completed customer job; HUMAN/operations |
| File/IP exposure and indefinite retention | C1.5/C5.1/C5.3/C5.5 | Key code fixed, retention/policy/public promise missing |
| Google-only login friction | C7.1/C7.2/C7.6/C7.9 | Active decision preserved; explanation improved |
| Heavy upload/network failure | C3.1/C3.3/C3.7/C3.8 | Size guard PASS; resume/early Blender validation missing |
| Price shock | C1.1/C2.1/C2.2 | Total price exists; cap/breakdown missing |
| QR trust/payment failure/refund | C2/C5/payment evidence | Sandbox/reconciliation PASS at code level; live/refund HUMAN |
| Preview insufficient for motion output | C4.1/C4.4/C4.10 | Video explicitly POST_MVP; edit timeline/copy incomplete |
| Download expiry/confirmation | C8.1/C8.4/C8.9 | 5-minute behavior now disclosed; confirmation/count missing |
| No real-time support | C6.1/C6.2/C6.6 | HUMAN/operation and missing ticket model |

## Safe changes made during this audit

- Corrected the false “3 days” download expiry copy to the real 5-minute
  signed URL TTL and explained that the download route can issue a fresh link.
- Added customer-facing explanation that Google is used for CWS account
  authentication and no Google Drive scope is requested.
- Added explicit `.blend`/2GB and Worker-availability wait disclosure.
- Added why login is required: ownership and job history.
- Added a source-of-truth FAQ disclosure for the partner-Worker model,
  preview-before-payment order, and supported MVP inputs.

Verification: frontend `npm run build` PASS, `npm run lint` PASS, `npm test`
PASS (5/5). The intentionally invalid `npm test -- --runInBand` invocation
failed because Vitest does not support the Jest-only flag; it was rerun with
the correct command and passed.

## HUMAN blockers / Owner actions

1. Configure and independently test the new least-privilege B2 key on the
   actual Fleet; do not revoke the old key until the new path is verified.
2. Run `cws_worker_full.py` against one explicitly chosen customer job through
   the real HTTP claim path, render, and B2 upload on a physical Windows/
   Blender Fleet machine.
3. Create one staff user, insert its `staff_roles` row, enroll Supabase TOTP,
   and verify Admin MFA in a real browser.
4. Configure a real support channel and publish the exact channel/response
   commitment before inviting customers.
5. Decide retention/deletion policy, price cap percentage, and whether the
   business can promise any SLA; only then implement the corresponding policy
   surfaces.
6. Verify SePay/MB Bank LIVE with a real test transaction; no agent payment
   transaction was performed in this audit.

## Conclusion

The repository is substantially aligned with the official MVP workflow, but
customer research requirements are not fully complete. The main blockers are
not hidden code gaps alone: full customer E2E, live payment, Fleet/B2, MFA,
support operations, retention policy, and price policy remain unverified or
Owner-dependent.
