# QUY TẮC PHÂN CÔNG MODEL CỐ ĐỊNH CHO CWS

Từ thời điểm này, hãy ghi nhớ và áp dụng quy tắc lựa chọn model này cho TOÀN BỘ công việc của dự án CWS.

Mục tiêu:
- Tiết kiệm token/chi phí.
- Không dùng model mạnh quá mức cần thiết.
- Nhưng không hy sinh độ chính xác ở các tác vụ code, production, bảo mật hoặc tài chính.
- Tự động chọn model phù hợp trước khi giao việc cho agent/subagent.

==================================================
1. MODEL ĐƯỢC PHÉP
==================================================

Chỉ ưu tiên hai mức sau:

### A. HAIKU MEDIUM
Dùng cho tác vụ nhẹ, rõ ràng, ít reasoning và rủi ro thấp.

### B. SONNET 5 MEDIUM
Dùng cho tác vụ nặng, cần reasoning, code phức tạp, debug, kiến trúc hoặc có rủi ro cao.

KHÔNG sử dụng:
- Opus
- Fable

Không tự ý chuyển sang Opus/Fable kể cả khi task khó.

Nếu Sonnet 5 Medium không giải quyết được:
→ báo cáo blocker và bằng chứng.
→ KHÔNG tự nâng lên Opus/Fable.

==================================================
2. HAIKU MEDIUM — TÁC VỤ NHẸ
==================================================

Ưu tiên Haiku Medium cho:

### Git / repository cơ bản
- git status
- git log
- git diff
- git branch
- git remote
- kiểm tra commit
- kiểm tra branch
- kiểm tra working tree
- kiểm tra file thay đổi
- xác minh commit đã tồn tại
- commit khi thay đổi đã được kiểm chứng
- push khi authentication/quyền đã được xác minh hoạt động

### Tìm kiếm / đọc repository
- tìm file
- tìm folder
- tìm function
- tìm component
- tìm biến
- tìm environment variable
- grep/search code
- đọc package.json
- đọc config
- đọc .env.example
- đọc documentation
- xác định file chứa một đoạn code cụ thể

### Build / test cơ bản
- chạy build đã có
- chạy lint
- chạy unit test
- chạy typecheck
- chạy test lại sau khi Sonnet sửa
- thu thập output lỗi
- xác minh build PASS/FAIL

Nếu test FAIL nhưng nguyên nhân không hiển nhiên:
→ chuyển Sonnet 5 Medium điều tra.

### Documentation
- cập nhật CURRENT_STATUS.md
- cập nhật changelog
- ghi kết quả task
- tạo báo cáo sau khi công việc đã hoàn thành
- cập nhật checklist
- ghi lại commit/deployment status
- chỉnh lỗi chính tả tài liệu

### Frontend đơn giản
- đổi text
- đổi label
- đổi button text
- sửa typo
- chỉnh spacing đơn giản
- chỉnh kích thước đơn giản
- thêm icon đã xác định
- chỉnh wording
- thay đổi UI nhỏ khi yêu cầu hoàn toàn rõ ràng

### Deployment kiểm tra cơ bản
- kiểm tra Vercel deployment
- kiểm tra deployment status
- kiểm tra production URL
- kiểm tra commit nào đang deploy
- đọc build log đơn giản

### Thu thập thông tin
- thu thập log
- thu thập config
- thu thập trạng thái hệ thống
- chuẩn bị bằng chứng cho Sonnet
- kiểm tra output của command

Nguyên tắc:

Nếu task chủ yếu là:

READ → CHECK → RUN → REPORT

và không cần reasoning đáng kể:
→ HAIKU MEDIUM.

==================================================
3. SONNET 5 MEDIUM — CODE / REASONING NẶNG
==================================================

Dùng Sonnet 5 Medium cho:

### Debug
- lỗi chưa biết nguyên nhân
- lỗi production
- HTTP 4xx/5xx khó xác định
- Git authentication failure
- credential conflict
- OAuth failure
- callback failure
- redirect failure
- session failure
- deployment failure không rõ nguyên nhân
- build failure phức tạp
- race condition
- concurrency bug
- regression

### Authentication
- Google OAuth
- Supabase Auth
- session management
- callback flow
- redirect flow
- token handling
- authorization
- authentication architecture

### Backend
- thiết kế API
- API nhiều bước
- business logic
- queue
- scheduler
- worker
- retry
- recovery
- job orchestration
- distributed processing

### CWS Render Pipeline
- nhận job render
- phân phối job
- worker selection
- render orchestration
- nhiều máy cùng render
- frame splitting
- retry frame
- worker failure recovery
- output validation
- job state machine
- ETA logic

### Upload / Storage
- upload file lớn
- chunk upload
- resumable upload
- multipart upload
- Google Drive integration
- Backblaze B2 integration
- signed URL
- download authorization
- storage lifecycle
- cleanup logic

### Payment
- payment verification
- MBBank notification processing
- xác nhận khách đã chuyển tiền
- chống false-positive payment
- unlock output sau thanh toán
- payment state machine
- idempotency
- reconciliation

### Database
- database schema quan trọng
- migration
- transaction
- consistency
- RLS
- Supabase security policy
- thay đổi production database

### Security
- credential
- PAT
- secret
- OAuth secret
- access token
- permission
- authentication
- authorization
- security review
- vulnerability
- privilege
- customer data
- destructive operation

### Architecture
- thay đổi kiến trúc
- thiết kế module mới
- refactor nhiều file
- dependency architecture
- quyết định kỹ thuật có nhiều trade-off
- thiết kế hệ thống phân tán
- thiết kế worker/scheduler

### Testing phức tạp
- integration test
- E2E
- authentication test
- payment test
- concurrency test
- production-like test
- phân tích test failure khó

### Code review
- review PR lớn
- review security-sensitive code
- review payment code
- review authentication code
- review architecture
- tìm regression
- đánh giá implementation so với roadmap

==================================================
4. QUY TẮC RỦI RO CAO
==================================================

ĐỘ KHÓ KHÔNG PHẢI TIÊU CHÍ DUY NHẤT.

Một task dù ngắn/đơn giản nhưng có khả năng gây hậu quả lớn thì bắt buộc dùng:

SONNET 5 MEDIUM.

Ví dụ:

- sửa Git credential
- thay PAT
- OAuth configuration
- Google Client Secret
- Supabase secrets
- Vercel production environment
- database production
- migration
- payment
- MBBank
- xóa dữ liệu
- xóa B2 object
- thay permission
- thay authentication
- thay authorization
- force push
- reset
- rebase có nguy cơ mất code
- security configuration

Công thức:

LOW COMPLEXITY + LOW RISK
→ HAIKU MEDIUM

HIGH COMPLEXITY
→ SONNET 5 MEDIUM

HIGH RISK, bất kể complexity
→ SONNET 5 MEDIUM

==================================================
5. QUY TẮC ESCALATION
==================================================

Haiku không được cố xử lý một vấn đề vượt quá khả năng.

Nếu Haiku phát hiện:

- nguyên nhân chưa rõ
- nhiều giả thuyết
- cần thay đổi architecture
- liên quan authentication
- liên quan payment
- liên quan security
- liên quan production data
- có nguy cơ mất code/data
- cần sửa nhiều module
- lỗi tiếp tục sau kiểm tra cơ bản

→ DỪNG reasoning sâu.

→ Thu thập bằng chứng cần thiết.

→ Chuyển task sang SONNET 5 MEDIUM.

Không để Haiku thử hàng loạt thay đổi ngẫu nhiên.

==================================================
6. PHÂN CHIA TASK ĐỂ TIẾT KIỆM TOKEN
==================================================

Với task lớn, không mặc định cho Sonnet làm tất cả.

Ưu tiên mô hình:

HAIKU
→ thu thập trạng thái/log/file/config

SONNET
→ phân tích + thiết kế + sửa code

HAIKU
→ chạy build/test/lint

Nếu FAIL phức tạp:
→ SONNET

Nếu PASS:
→ HAIKU cập nhật documentation + commit + verification.

Ví dụ:

Haiku:
- git status
- tìm file liên quan
- đọc log
- chạy test

Sonnet:
- xác định root cause
- sửa implementation

Haiku:
- chạy test lại
- kiểm tra diff
- cập nhật CURRENT_STATUS
- commit

Như vậy không tiêu token Sonnet cho công việc cơ học.

==================================================
7. KHÔNG SUY ĐOÁN
==================================================

Đây là quy tắc bắt buộc của dự án.

Không được biến giả thuyết thành sự thật.

Trước khi thay đổi hệ thống:

OBSERVE
→ VERIFY
→ IDENTIFY ROOT CAUSE
→ FIX
→ TEST
→ VERIFY AGAIN.

Nếu chưa có bằng chứng:
→ ghi rõ UNKNOWN / NOT VERIFIED.

Không:
- tự bịa URL
- tự đoán path
- tự đoán credential
- tự đoán config
- tự đoán trạng thái production
- tự khẳng định nguyên nhân khi chưa kiểm chứng.

==================================================
8. QUYỀN TỰ ĐỘNG THỰC HIỆN
==================================================

Nếu task có thể tự giải quyết an toàn:
→ tự thực hiện.

Không bắt Owner thao tác thủ công nếu agent có thể làm.

Chỉ yêu cầu Owner khi thực sự bắt buộc, ví dụ:

- đăng nhập tài khoản
- MFA/2FA
- OAuth consent cần người dùng
- CAPTCHA
- cấp quyền ngoài môi trường agent
- secret mà agent không có
- thao tác tài khoản yêu cầu con người xác nhận.

Nếu cần Owner:
→ nói CHÍNH XÁC một bước cần làm.
→ không đẩy phần việc kỹ thuật có thể tự làm sang Owner.

==================================================
9. MEMORY / PROJECT INSTRUCTIONS
==================================================

Hãy ghi quy tắc này vào nơi lưu instructions/memory phù hợp và bền vững của dự án CWS để các phiên Claude Code và agent sau tiếp tục áp dụng.

Không tạo hệ thống documentation phức tạp mới chỉ để lưu quy tắc này.

Nếu repository đã có AGENTS.md / CLAUDE.md / project instructions hoặc file tương đương:
→ ưu tiên cập nhật đúng nơi hiện có.

Trước khi sửa:
→ tìm và xác minh file instruction hiện tại.

==================================================
10. QUY TẮC CUỐI CÙNG
==================================================

Mặc định:

Tác vụ nhẹ
→ HAIKU MEDIUM.

Tác vụ nặng
→ SONNET 5 MEDIUM.

Tác vụ rủi ro cao
→ SONNET 5 MEDIUM.

OPUS
→ CẤM.

FABLE
→ CẤM.

Nếu không chắc Haiku hay Sonnet:
→ đánh giá Complexity + Risk trước khi chọn.

Sau khi lưu quy tắc, báo cáo:
1. File/memory nào đã được cập nhật.
2. Nội dung quy tắc chính đã lưu.
3. Xác nhận Opus/Fable bị cấm.
4. Không thực hiện thay đổi nào ngoài phạm vi yêu cầu này.

==================================================
11. FOUNDER ROLE ASSIGNMENT — GPT IMPLEMENTS, CODEX REVIEWS
==================================================

Founder decision effective 2026-08-13:

### GPT / ChatGPT
GPT is the PRIMARY implementation owner for CWS engineering work.

GPT responsibilities:
- ground canonical `main` before material work;
- diagnose the current first failing boundary;
- specify/plan according to the CWS Harness and Spec Kit;
- implement code changes directly when the approved scope allows;
- run or coordinate relevant tests and verification;
- prepare focused commits/PRs;
- maintain engineering learning evidence and source-of-truth sync;
- stop at Founder-controlled architecture/security/infrastructure/payment boundaries.

GPT must not use Codex as the default coder merely to offload implementation.

### Codex
Codex becomes the PRIMARY independent final reviewer after GPT has completed an implementation slice.

Codex responsibilities:
- independently ground current canonical repo and the exact GPT PR/head SHA;
- review the complete diff, tests, migrations, runtime assumptions and evidence;
- look specifically for correctness, regressions, security issues, workflow drift, schema/runtime mismatch, concurrency/idempotency issues and missing tests;
- verify the implementation against the active spec, Founder decisions, Harness, workflow and current production evidence;
- return PASS / REQUEST_CHANGES / BLOCKED with exact evidence;
- when changes are needed, describe the smallest required correction instead of silently redesigning the system.

Codex must NOT:
- become the default implementation owner;
- silently rewrite GPT's implementation;
- merge automatically unless Founder explicitly authorizes merge;
- change workflow, architecture, security, payment, storage or infrastructure boundaries during review;
- treat review suggestions as production truth without evidence.

### Default delivery sequence

For implementation work, use:

`Founder intent -> GPT ground/diagnose/spec/plan -> GPT implement -> GPT verify -> focused PR/head SHA -> Codex independent full review -> GPT addresses proven findings -> Codex re-review if material -> Founder merge/production gate`

For urgent low-risk L1 fixes, GPT may use the shortened Harness path, but Codex remains the preferred final reviewer before merge when the change affects production behavior.

For non-code research/design work, GPT may complete the work without involving Codex unless an independent review materially improves confidence.

This role assignment changes agent responsibility, NOT the canonical CWS workflow, production architecture, or Founder approval boundaries.
