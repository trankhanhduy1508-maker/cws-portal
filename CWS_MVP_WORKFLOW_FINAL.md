# CWS_MVP_WORKFLOW_FINAL.md

# Computer Workspace (CWS)

## MVP Workflow (Final — corrected 2026-08-08)

> Nguồn sự thật nghiệp vụ cho MVP. Nếu tài liệu cũ mâu thuẫn với thứ tự dưới đây, file này thắng cho customer E2E workflow.

## Kiến trúc

- Frontend: Vercel
- Backend/API: Render.com
- Database & Auth: Supabase
- Storage: Backblaze B2
- Render: canonical Node Agent + generic Worker Engine + Blender CLI/background
- Payment detection: SePay webhook

---

# 1. Luồng tổng thể chính thức

```text
Google Login
    ↓
Customer Profile
    ↓
Tạo Job
    ↓
Upload trực tiếp hoặc Google Drive link
    ↓
Backend xác thực quyền sở hữu/input
    ↓
Materialize input vào Backblaze B2
    ↓
Scheduler / Worker claim Job
    ↓
Worker tải input bằng job-scoped capability
    ↓
Nếu .zip/.rar → giải nén an toàn trong sandbox
    ↓
Phát hiện file .blend chính + assets
    ↓
Phân tích scene / preflight
    ↓
Tạo WORKING COPY của .blend
    ↓
SAFE BLEND OPTIMIZATION trên working copy
    ↓
Render Blender thật bằng CLI/background
    ↓
Báo progress thật
    ↓
Validate output
    ↓
Upload FULL OUTPUT lên Backblaze B2
    ↓
FULL OUTPUT = LOCKED
    ↓
Tạo 3–5 preview frame/ảnh từ output thật + watermark CWS
    ↓
Tính FINAL PRICE từ runtime thực tế
    ↓
ĐỒNG THỜI tạo payment record + payment code + MB QR
    ↓
QR chứa sẵn STK + tên tài khoản + số tiền + nội dung giao dịch
    ↓
Customer thấy PREVIEW + FINAL PRICE + QR
    ↓
Customer chuyển khoản
    ↓
SePay webhook
    ↓
Backend kiểm đúng nội dung giao dịch + amount + idempotency
    ↓
Payment = PAID
    ↓
Mở khóa quyền tải FULL OUTPUT B2 bằng signed/job-scoped delivery
    ↓
Customer tải kết quả
    ↓
Cleanup / audit
    ↓
COMPLETED
```

**Business rule bắt buộc:**

`RENDER FIRST -> B2 FULL OUTPUT LOCKED -> WATERMARK PREVIEW -> FINAL PRICE + QR -> SEPAY VERIFY -> UNLOCK B2`

Không thu tiền trước render. Không public full output trước PAID. Không render/upload lại sau khi khách trả tiền chỉ để giao hàng.

---

# 2. Đăng nhập

- Chỉ dùng Google Login qua Supabase Auth cho customer MVP hiện tại.
- Không OTP.
- Không Facebook Login.
- Không Zalo Login.
- Không email/password cho customer.

Sau đăng nhập:

- tạo/cập nhật Customer Profile bằng UUID Supabase Auth;
- lưu dữ liệu hồ sơ được Google cung cấp;
- ownership của upload/job phải được backend xác minh server-side.

---

# 3. Input được hỗ trợ

Customer có thể:

- upload trực tiếp `.blend`;
- upload archive `.zip`;
- upload archive `.rar`;
- dán Google Drive file link hợp lệ.

Không suy đoán file chỉ từ extension. Worker/backend phải kiểm signature/content phù hợp trước khi xử lý.

Google Drive input phải được materialize về storage canonical trước khi Worker production xử lý nếu canonical JobSpec yêu cầu B2-first.

---

# 4. Archive extraction — ZIP + RAR

Archive luôn được giải nén trong job sandbox riêng.

Bắt buộc:

- chống path traversal / Zip Slip / archive entry thoát khỏi sandbox;
- reject absolute path, `..`, device path và path bất thường;
- giới hạn tổng dung lượng sau giải nén;
- giới hạn số lượng file;
- giới hạn nesting/decompression bomb;
- timeout;
- không thực thi file trong archive;
- không yêu cầu Founder giải nén tay;
- hỗ trợ archive có `.blend` cùng textures/HDRI/cache/assets liên quan;
- nếu có nhiều `.blend`, dùng deterministic selection rule hoặc fail rõ ràng, không đoán ngẫu nhiên.

RAR implementation phải dùng thư viện/tool được pin version và kiểm tra exit code. Không dùng shell command ghép từ tên file không trusted.

---

# 5. Preflight scene trước render

Worker phải kiểm tra tối thiểu:

- Blender version/compatibility;
- render engine;
- active scene;
- frame range;
- resolution/output format;
- camera;
- external/relative paths;
- missing textures;
- linked libraries;
- fonts;
- caches/simulations cần thiết;
- unsupported/missing add-ons;
- expected disk usage;
- GPU/VRAM feasibility;
- customer `.blend` autoexec policy.

Customer `.blend` là untrusted input: mặc định không bật arbitrary Python auto-execution. Blender documentation cảnh báo `.blend` có thể chứa registered scripts/drivers và `--enable-autoexec` chỉ được dùng khi nguồn trusted/contract cho phép.

---

# 6. SAFE BLEND OPTIMIZATION — BẮT BUỘC TRƯỚC RENDER

## 6.1 Nguyên tắc

**Không sửa file gốc của customer.**

Flow:

`ORIGINAL INPUT -> READ-ONLY ANALYSIS -> WORKING COPY -> SAFE OPTIMIZATION -> VALIDATE -> RENDER`

Original object trên B2 phải được giữ nguyên cho audit/retry.

Mục tiêu optimization là giảm lỗi, giảm I/O/overhead và chọn cấu hình render hợp lý **mà không tự ý thay đổi hình ảnh/animation**.

## 6.2 Safe automatic optimization được phép

Worker/analyzer có thể tự động:

1. chuẩn hóa/resolve path trong sandbox;
2. kiểm tra và remap external assets sang đường dẫn job-local khi mapping chắc chắn;
3. dùng Blender background/CLI thay UI để giảm overhead;
4. dùng `--factory-startup`/môi trường sạch khi tương thích để không phụ thuộc user startup config;
5. đặt output vào job sandbox riêng;
6. kiểm tra render device và chỉ chọn GPU khi engine + device + VRAM phù hợp;
7. thu thập scene complexity, texture footprint, geometry/modifier stats, samples, bounces, volumetrics và VRAM estimate;
8. phát hiện orphan/unused datablock nhưng **không tự xóa** nếu chưa chứng minh không ảnh hưởng dependency/render;
9. giữ procedural modifiers/instances thay vì tự apply geometry; community Blender lưu ý apply modifier/duplicate geometry có thể làm file nặng hơn, trong khi linked/collection instances tiết kiệm dữ liệu;
10. tạo optimization manifest ghi rõ mọi thay đổi trên working copy;
11. chạy validation sau optimize trước khi render chính.

## 6.3 Không được tự động làm nếu có thể đổi chất lượng/semantics

Không tự ý:

- giảm render resolution;
- giảm frame range;
- giảm samples;
- thay render engine;
- tắt denoise/volumetric/caustics;
- giảm subdivision/render level;
- bật Simplify với giá trị làm thay đổi geometry/texture;
- resize/compress texture source;
- xóa object/collection/material;
- apply modifier;
- bake hoặc xóa cache;
- đổi color management;
- đổi camera/light;
- bật script autoexec cho file customer không trusted.

Các tối ưu trade-off này chỉ được dùng khi có profile/policy được benchmark và được product contract cho phép.

## 6.4 Tại sao không chỉ “làm file .blend nhỏ lại”

Dung lượng `.blend` tự nó không quyết định render time. Blender community ghi nhận file size chủ yếu ảnh hưởng load/save; render cost đến từ scene/render settings, geometry, shaders, textures, volumetrics, samples và hardware fit. Vì vậy CWS phải **profile scene rồi tối ưu có kiểm soát**, không purge/compress mù quáng.

## 6.5 Optimization acceptance gate

Trước render chính:

- working copy mở được bằng Blender;
- dependency preflight vẫn pass;
- frame/camera/resolution/engine/output contract không bị đổi ngoài policy;
- optimization manifest được lưu;
- nếu optimizer lỗi hoặc không chứng minh an toàn → fallback về working copy chưa optimize, không làm hỏng job.

---

# 7. Render

Worker:

- claim task qua canonical backend contract;
- tải input;
- extract/preflight/optimize;
- chạy Blender thật bằng CLI/background;
- báo PID/exit code/progress/frame/log có kiểm soát;
- checkpoint/retry theo contract hiện tại;
- fail rõ ràng khi dependency/hardware không đáp ứng.

Không dùng fake timer/progress. Không gọi AI để tiến state runtime.

---

# 8. Output validation + B2

Sau render:

1. kiểm tra Blender exit/result;
2. kiểm output tồn tại và size hợp lệ;
3. kiểm expected frame set/manifest;
4. tính integrity/checksum khi contract yêu cầu;
5. upload full output lên Backblaze B2 bằng job-scoped capability;
6. xác minh remote object;
7. đánh dấu full output **LOCKED** đối với customer cho đến PAID.

Payment không làm render/upload lại. PAID chỉ mở delivery authorization cho artifact đã tồn tại.

---

# 9. Preview watermark

Sau khi full output đã ở B2:

- ảnh job: chọn 3–5 ảnh đại diện;
- animation/video: chỉ trích 3–5 frame đại diện, không gửi full video preview;
- preview phải lấy từ output thật;
- watermark lặp/chống crop đơn giản;
- nội dung watermark: `CWS` hoặc branding canonical hiện hành;
- preview không được đủ để thay thế full deliverable.

---

# 10. Final price + QR — tạo cùng giai đoạn

Sau render/output validation thành công, backend tính `final_price` từ runtime thực tế và pricing policy hiện hành.

**Ngay khi có final_price, backend đồng thời tạo payment record/payment code và MB Bank QR.**

QR phải lấy STK và tên tài khoản từ cấu hình canonical hiện có trong repository/deployment. Không hard-code hoặc tự tạo thông tin tài khoản mới nếu repo đã có source of truth.

QR phải chứa sẵn:

- ngân hàng/STK canonical;
- tên tài khoản canonical;
- `final_price` chính xác;
- nội dung giao dịch/payment reference duy nhất.

Customer page hiển thị cùng lúc:

- preview watermark;
- final price;
- QR;
- nội dung giao dịch để đối chiếu.

---

# 11. Payment reference

Payment reference phải:

- unique cho payment active;
- map server-side tới đúng một payment + job + customer;
- không dùng Worker ID;
- đủ ngắn và ổn định để ngân hàng/SePay parse;
- được nhúng trực tiếp vào QR;
- format lấy từ implementation/decision canonical hiện hành, không agent tự nghĩ format mới.

---

# 12. SePay verification

Webhook SePay phải fail closed và idempotent.

Trước khi PAID/unlock phải kiểm:

1. webhook authentication theo cấu hình SePay canonical;
2. replay/idempotency;
3. payment reference/nội dung giao dịch đúng;
4. map đúng payment/job/customer;
5. amount đúng policy;
6. payment chưa được xử lý trước đó.

Sai nội dung → không unlock.

Sai amount → không unlock theo payment policy.

Webhook duplicate → không unlock/deliver lặp ngoài intended idempotent behavior.

---

# 13. Delivery / unlock B2

Chỉ sau `PAID`:

- backend tạo quyền tải final artifact bằng signed/job-scoped URL/token theo B2 capability được hỗ trợ;
- không public permanent B2 object nếu không cần;
- không đưa broad B2 credential cho browser/customer;
- customer tải full output đã render trước đó;
- ghi audit/download log.

---

# 14. Cleanup

Sau khi output đã upload/verify và job runtime hoàn tất:

- cleanup sandbox/input temp/intermediate files theo retention policy;
- không xóa B2 final trước delivery/retention deadline;
- Worker trở lại idle;
- cleanup phải idempotent và auditable.

---

# 15. Admin

Admin theo dõi tối thiểu:

- Customer;
- Jobs/tasks;
- Worker/fleet;
- real progress;
- optimization/preflight failure;
- output/preview;
- payment/unmatched payment;
- delivery/download;
- audit/error.

---

# 16. Không thuộc MVP

- Facebook Login
- OTP customer
- Zalo Login
- Stripe
- PayPal
- MoMo
- Marketplace
- AI bắt buộc trong runtime
- Multi-region
- Full video preview
- tự động trade-off chất lượng render không có benchmark/policy

---

# 17. Production Golden E2E Definition of Done

Một E2E chỉ PASS khi cùng một job thật chứng minh:

`Customer -> Drive/upload (.blend/.zip/.rar) -> B2 input -> Worker claim -> safe extract -> scene preflight -> safe working-copy optimization -> Blender thật -> progress thật -> validated full output -> B2 full output LOCKED -> 3–5 watermark previews -> final price + QR -> SePay đúng nội dung/amount -> PAID -> B2 delivery unlock -> customer download -> cleanup/idle`

Không PASS nếu:

- frontend mock/demo;
- progress giả;
- Worker không chạy Blender thật;
- optimizer sửa original customer file;
- archive giải nén thủ công;
- `.rar` được quảng cáo nhưng chưa có runtime test;
- preview không xuất phát từ output thật;
- payment tạo trước render;
- SePay không verify đúng nội dung giao dịch;
- full B2 output có thể tải trước PAID;
- cần Founder/AI bấm chuyển state bình thường.

---

# 18. Nguồn kỹ thuật cho bước optimization

- Blender Manual: command-line/background rendering và thứ tự argument.
- Blender Manual: scripting/security; `.blend` có thể chứa Python/scripts, autoexec phải được kiểm soát.
- Blender Stack Exchange/community: file size không trực tiếp quyết định render time; procedural modifiers và instancing thường tránh phình geometry/file so với apply/duplicate; render farm cần chú ý relative paths/assets/cache chứ không chỉ Pack Resources.

CWS áp dụng các nguồn này theo nguyên tắc **an toàn trước, không giảm chất lượng mù quáng, benchmark trước khi bật optimization có trade-off**.
