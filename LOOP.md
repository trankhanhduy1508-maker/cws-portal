# CWS PRODUCTION E2E EXECUTION LOOP

> Mục đích: buộc AI Agent/Codex liên tục đưa CWS đến Golden Production E2E thật, có bằng chứng runtime, không dừng ở code/test giả lập.

## 1. GOAL

Mục tiêu hiện tại là hoàn thành Golden Production E2E V2.4 trên production thật.

Source of truth ưu tiên:

1. `CWS_MVP_WORKFLOW_FINAL.md`
2. `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`
3. `CURRENT_STATUS.md`
4. `DECISIONS.md`
5. `AGENTS.md`
6. `CWS_SCALABILITY_RULES.md`
7. current code/config/runtime evidence

Roadmap cũ chỉ dùng làm historical context khi không mâu thuẫn với V2.4.

## 2. CANONICAL GOLDEN FIXTURE

Production site:

`https://cws-portal.vercel.app/`

Owner-provided Google Drive input:

`https://drive.google.com/file/d/1evCyfEKjwFv-4ty-v4xAU_J29vOK3Yh0/view?usp=drivesdk`

Không thay bằng file demo nhỏ hơn để tuyên bố Golden PASS. Fixture phụ chỉ được dùng để debug riêng từng tầng.

## 3. TRIGGER

Chạy loop khi Project Owner yêu cầu một trong các lệnh như:

- `tiếp`
- `tiếp tục`
- `chạy loop`
- `hoàn thiện E2E`
- `hoàn thiện MVP`
- `chạy xuyên đêm`

Khi đã được trigger, Agent phải tự lặp cho đến STOP CONDITION; không chờ Owner nhắc `tiếp` sau mỗi task độc lập.

## 4. REQUIRED READING

Trước vòng đầu tiên:

1. đọc đầy đủ các source of truth ở mục 1;
2. kiểm tra branch và `git status`;
3. đọc evidence/report mới nhất liên quan Golden E2E;
4. kiểm tra code và runtime hiện tại trước khi tin status cũ.

Code + runtime evidence mới hơn luôn thắng nhãn DONE cũ.

## 5. CANONICAL CUSTOMER CHAIN

Agent phải đưa cùng một traceable job qua đầy đủ chuỗi:

`Customer Drive input -> backend materialization/B2 -> durable task -> authenticated Worker claim -> safe archive extraction nếu cần -> Blender preflight -> SAFE working-copy optimization -> real Blender render -> validate output -> upload full output to B2 LOCKED -> 3–5 watermarked previews -> final runtime price + payment record + QR -> SePay exact reference/amount verification -> PAID -> authorized final B2 download -> cleanup -> Worker idle`

Quy tắc cứng:

- không fake progress;
- không mock render;
- không thay Blender process bằng fixture giả;
- không fake B2 success;
- không force `PAID` để vượt payment gate;
- không expose full artifact trước PAID;
- không rerender/reupload sau PAID chỉ để giao file;
- QR phải chứa exact amount + unique transaction reference;
- SePay sai reference/content hoặc sai amount => không unlock;
- normal flow phải tự chạy không cần AI/Founder can thiệp giữa các state.

## 6. EXECUTION LOOP

Lặp các bước sau.

### Bước 1 — Reality check

- kiểm tra production deployment hiện tại;
- kiểm tra Backend health;
- kiểm tra customer input path;
- kiểm tra Worker heartbeat/state/capability;
- kiểm tra queue/task/job hiện tại;
- kiểm tra B2/payment runtime readiness;
- không đoán.

### Bước 2 — Chọn blocker cao nhất

Ưu tiên:

1. P0 làm Golden chain không thể tiến tiếp;
2. production/runtime defect;
3. build/test failure gây cản runtime;
4. security/data-integrity defect;
5. P1 cần thiết cho E2E;
6. documentation/evidence sync.

Không làm feature ngoài Golden E2E, refactor thẩm mỹ hoặc over-engineering.

### Bước 3 — Fix nhỏ nhất có thể

Mỗi vòng chọn một thay đổi độc lập, kiểm thử được, rollback được.

Không:

- tạo repository mới;
- tạo Vercel/Supabase/B2/Render project mới nếu canonical resource đang tồn tại;
- tạo parallel infrastructure để né blocker;
- commit secret;
- phá thay đổi chưa commit của Owner/Agent khác;
- thay đổi production mù quáng.

Thiết kế phải giữ khả năng scale fleet mà không cần thao tác thủ công theo từng máy/job.

### Bước 4 — Verify code

Chạy test phù hợp: build, lint, typecheck, unit, integration, security, migration, worker tests.

Không gọi DONE chỉ vì test local pass.

### Bước 5 — Verify runtime thật

Ngay khi có thể, tiếp tục cùng Golden fixture trên production.

Thu bằng chứng tối thiểu theo cùng job/trace:

- customer submission/job id;
- Drive materialization/input object;
- durable task id;
- Worker id + claim/lease;
- Blender executable/PID + real progress/log;
- optimizer manifest;
- validated render artifact;
- B2 final object + integrity verification + locked state;
- 3–5 watermarked previews;
- measured runtime/final price;
- payment reference + QR amount/content;
- SePay exact-match event;
- PAID state transition;
- authorized final B2 delivery/download;
- cleanup + Worker back to idle.

### Bước 6 — Nếu runtime fail

- xác định tầng đầu tiên fail;
- ghi evidence;
- sửa nguyên nhân gốc nhỏ nhất;
- test regression;
- redeploy canonical resource nếu cần;
- chạy lại từ điểm hợp lệ hoặc chạy lại toàn trace nếu integrity yêu cầu;
- tiếp tục loop.

Không chuyển sang task phụ để né Golden chain khi blocker hiện tại có thể tự xử lý.

### Bước 7 — Nếu gặp external blocker thật

Chỉ được dừng sau khi:

1. đã hoàn thành mọi việc độc lập có thể làm an toàn;
2. chứng minh blocker bằng evidence thực tế;
3. ghi chính xác Owner cần cung cấp/thực hiện duy nhất điều gì;
4. không có workaround an toàn nào còn chưa thử.

Không gọi credential/session thiếu là blocker nếu Agent có connector/runtime/tool hợp lệ để tự lấy hoặc kiểm tra nó.

## 7. ACCEPTED INPUT / ARCHIVE RULE

Canonical customer inputs hiện tại:

- `.blend`
- `.zip`
- `.rar`
- Google Drive input theo backend canonical path

Archive extraction phải sandboxed, bounded, chống traversal/bomb/link/device path, xác minh extractor exit status và tìm `.blend` deterministically.

RAR chỉ được gọi runtime DONE khi có real RAR fixture pass; tuy nhiên Golden Drive fixture ở mục 2 vẫn là fixture bắt buộc để Golden Production E2E PASS.

## 8. DOCUMENTS BEFORE / AFTER CODE

Trước code: đọc source of truth.

Sau mỗi milestone có bằng chứng mới:

- cập nhật `CURRENT_STATUS.md`;
- cập nhật roadmap/workflow/decision nếu contract thay đổi;
- ghi evidence vào `reports/evidence/`;
- tránh nhãn DONE mơ hồ: phân biệt `CODE VERIFIED`, `RUNTIME VERIFIED`, `GOLDEN E2E PASS`.

## 9. GOLDEN PASS CONDITION

Chỉ được ghi `GOLDEN PRODUCTION E2E V2.4 PASS` khi exact Drive URL ở mục 2 đã đi qua production canonical chain và có bằng chứng runtime thật cho toàn bộ chuỗi đến customer download + cleanup.

`CODE VERIFIED` hoặc `RUNTIME PARTIAL` không phải PASS.

## 10. STOP CONDITION

Loop chỉ dừng khi một trong hai điều xảy ra:

### A. SUCCESS

`GOLDEN PRODUCTION E2E V2.4 PASS`

với exact Owner Drive fixture và evidence đầy đủ.

### B. TRUE EXTERNAL BLOCKER

Blocker nằm ngoài quyền/tool/runtime hiện có, không thể xử lý an toàn; mọi công việc độc lập còn lại đã hoàn thành và evidence + hành động Owner cần làm đã được ghi rõ.

Nếu chưa đạt A hoặc B: tiếp tục vòng kế tiếp.