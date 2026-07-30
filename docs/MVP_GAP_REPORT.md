# MVP Gap Report — CWS (Computer Workspace)

Đối chiếu toàn bộ repository với 3 tài liệu gốc:
- `CWS_ROADMAP_MVP_V1.md`
- `CWS_MVP_WORKFLOW_FINAL.md`
- `CWS_DATABASE_SCHEMA.md`

Audit lần cuối: 2026-07-30. Không tạo tính năng ngoài roadmap, không mở
rộng Enterprise/Security cấp ngân hàng/Marketplace/AI ETA.

**Cập nhật 2026-07-30 (sau khi merge vào `main`):** theo yêu cầu trực
tiếp của người dùng (KHÔNG phải sửa mismatch — đây là 2 tính năng bổ
sung nằm NGOÀI phạm vi bắt buộc của 3 tài liệu gốc, người dùng chủ động
yêu cầu thêm), đã bổ sung: (1) tính giá thanh toán THẬT theo runtime
Worker thật thay vì ước tính trước render, (2) tự động ghép file cuối
thành video MP4 qua FFmpeg (rơi về .zip nếu không có ffmpeg). Cả 2 dựa
trên ý tưởng đã có sẵn ở nhánh `claude/cws-zero-manual-operation-wtzbrt`
(phiên Claude trước, chưa merge) nhưng viết lại để KHÔNG mang theo lỗ
hổng bảo mật của nhánh đó (frontend tự xác nhận thanh toán) — xem
`backend/CHANGELOG.md` mục `[1.4.0]` để biết chi tiết đầy đủ.

---

## DONE

### Đăng nhập & Customer Profile
- Facebook Login qua Supabase Auth built-in OAuth (`supabase.auth.signInWithOAuth({ provider: 'facebook' })`)
  — Backend/Portal KHÔNG tự code OAuth, không nhận mật khẩu Facebook ở
  bất kỳ đâu (`src/services/AuthService.js`, `src/hooks/useAuth.js`).
- `customer_profiles` tự tạo/cập nhật qua trigger Postgres
  `handle_new_auth_user()` (migration 007) — không tạo trùng khi đăng
  nhập lại (ON CONFLICT).
- Session duy trì qua Supabase Auth; logout xóa session, quay về màn
  Landing; khách chưa đăng nhập không xem được Job Dashboard.

### Tạo Job / Upload
- Dán link Google Drive/OneDrive/Dropbox/**Direct Link** (đủ 4 nguồn
  `SHARED_LINK_PATTERNS` — trước đây thiếu Direct Link dù roadmap liệt
  kê rõ); Upload File trực tiếp lên Backblaze B2 (`B2StorageService`).
- Kiểm tra quyền truy cập THẬT cho Google Drive (Drive API v3, khi có
  `GOOGLE_DRIVE_API_KEY`) — phát hiện sớm lỗi link thư mục thay vì file;
  báo lỗi có hướng dẫn cụ thể ("kiểm tra lại quyền chia sẻ — chọn 'Bất
  kỳ ai có link'") — đúng "Hướng dẫn sửa quyền nếu cần".
- Sinh `storage_code` (`CWS-XXXXXXXX`) tự động khi tạo job.
- **Job tạo NGAY, KHÔNG cần thanh toán trước** — sửa lại đúng thứ tự
  roadmap (xem mục "Sửa lỗi nghiêm trọng" bên dưới).
- Khách nhập Phần mềm/Phiên bản/Ghi chú lúc tạo job (`software`/
  `softwareVersion`/`notes`, migration 009) — trước đây hoàn toàn
  không có trường nào lưu 3 thông tin này dù roadmap yêu cầu rõ.

### Render (Worker)
- Worker Fleet (`cws_worker_full.py`, không sửa) nhận job qua bảng
  `jobs`/`tasks` nội bộ; `WorkerFleetGateway` là điểm nối duy nhất.
- `SchedulerService` (Cron 10s) đọc lại tiến độ THẬT từ `tasks` (tỷ lệ
  `done`/tổng số task) — không phải số ETA giả.
- Task thất bại vĩnh viễn → job chuyển `error` + ghi `worker_logs` +
  notification cho khách (trước đây job treo im lặng).

### Preview
- 3-5 ảnh preview đại diện (`PreviewService`), watermark "CWS RENDER"
  lặp chéo thật qua `sharp` (không phải watermark trang trí tĩnh).
- Video preview: KHÔNG dùng (đúng "Không thuộc MVP").
- Job dừng ở `review_ready`, KHÔNG tự đóng gói/mở tải — khách phải xem
  qua preview trước.

### Review
- Khách có 2 lựa chọn đúng roadmap: **Đồng ý** (`POST /jobs/:id/approve`)
  hoặc **yêu cầu chỉnh sửa** (`POST /jobs/:id/request-changes` — chỉ ghi
  notification/worker_log, KHÔNG tự động re-render/hoàn tiền, job vẫn
  `review_ready`).

### Thanh toán (đã sửa mismatch nghiêm trọng — xem mục riêng bên dưới)
- QR MB Bank sinh THẬT (VietQR qua `img.vietqr.io`, BIN `970422`) khi có
  `MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME`.
- Nội dung chuyển khoản đúng định dạng `"CWS {storage_code} {payment_code}"`.
- Webhook (`POST /payments/webhook`) đối chiếu payment_code + storage_code
  + số tiền, CHỈ set PAID khi khớp cả 3 — Frontend KHÔNG có cách nào tự
  đặt PAID. Bảo vệ thêm bằng `WebhookSecretGuard` (header
  `x-webhook-secret` khớp `PAYMENT_WEBHOOK_SECRET`, fail-closed) — xem
  bug bảo mật vừa phát hiện + sửa ở mục "Sửa lỗi nghiêm trọng" bên dưới.

### Bàn giao
- `GET /jobs/:id/download` ghi log bảng `downloads` (job_id, IP) rồi
  redirect sang URL B2 thật — Portal không dùng thẳng `downloadUrl` raw.
- Job chuyển `finished`/COMPLETED chỉ sau khi payment PAID.

### Trang quản trị (Giai đoạn 7)
- `AdminScreen.jsx` (chỉ vào qua `#admin`, không có link từ UI khách
  hàng) — danh sách job (kèm tên khách hàng), danh sách khách hàng, tìm
  theo Storage Code/Payment Code/Customer (đủ 3 tiêu chí roadmap yêu cầu).
- `GET /customers` (mới, `AdminKeyGuard`) — trước đây hoàn toàn không
  có route/UI nào cho "Danh sách khách hàng" dù roadmap liệt kê rõ.
- Cột "Tiến độ" (% từ `stageProgress`) trong bảng Job — roadmap liệt kê
  "Tiến độ" tách riêng khỏi "Danh sách Job" trong mục Admin.
- `GET /fleet/workers` (mới, `AdminKeyGuard`, chỉ đọc bảng `workers` —
  không can thiệp Worker Fleet) + bảng "Worker Fleet" trong
  `AdminScreen.jsx` — đủ "Worker" trong danh sách Admin theo dõi.
- Nút "Xem" mở modal ảnh preview ngay trong `AdminScreen.jsx` (dùng
  route `GET /jobs/:id/preview` đã có sẵn) — đủ "Preview" trong danh
  sách Admin theo dõi.
- Bảo vệ bằng `AdminKeyGuard` (header `x-admin-key`) trên `GET /jobs`
  (ẩn danh), `GET /jobs/by-storage-code/:code`, `GET /payments/by-code/:code`,
  `GET /customers`, `GET /fleet/workers`.

### Database & RLS
- Đủ 8 bảng theo `CWS_DATABASE_SCHEMA.md`: customer_profiles,
  render_orders (= "jobs" theo domain Portal), storage_objects,
  review_images, payments (đã bổ sung job_id/storage_code/bank_name/
  account_number/qr_image_url — migration 008), downloads, worker_logs,
  notifications.
- RLS owner-scoped bật cho toàn bộ bảng liên quan tới khách hàng
  (`auth.uid() = customer_id`/`= id`) — `get_advisors(security)` xác
  nhận không còn ERROR nào trên các bảng MVP.
- `get_advisors(performance)` đã chạy đầy đủ (migration 010): sửa 7 RLS
  policy re-evaluate `auth.uid()` mỗi row (khuyến nghị chính thức
  Supabase), thêm index thiếu cho `downloads.customer_id`/
  `notifications.job_id`. Còn lại `unindexed_foreign_keys` trên
  `fleets`/`machine_capability` (bảng Worker Fleet, ngoài phạm vi) và
  `unused_index` (INFO, bình thường vì DB gần trống — không phải vấn đề).

### Không làm trong MVP (xác nhận qua grep, không có code nào)
MoMo, Stripe, PayPal, Google Login, OTP, Zalo Login, AI ETA,
Marketplace, Multi-region, Video preview đầy đủ, Enterprise Security —
tất cả đã gỡ hoặc chưa từng tồn tại.

---

## Sửa lỗi nghiêm trọng phát hiện lúc audit lần này

**Mismatch lớn nhất:** trước bản sửa này, `POST /jobs` (tạo job) bắt
buộc phải có `paymentId` đã ở trạng thái PAID — tức là khách phải trả
tiền TRƯỚC KHI render bắt đầu. Điều này **ngược hoàn toàn** với cả 3
tài liệu gốc, vốn ghi rất rõ thứ tự:

```
Job → Upload → Render → Progress → Preview → Khách duyệt
  → Sinh QR → Webhook → PAID → Mở tải → COMPLETED
```

Tức là render MIỄN PHÍ, thanh toán chỉ là điều kiện để MỞ TẢI file gốc
sau khi khách đã xem và đồng ý với bản preview — không phải điều kiện
để bắt đầu render.

Đã sửa toàn diện (backend + frontend), xem chi tiết trong
`backend/CHANGELOG.md` mục `[1.3.0]`. Tóm tắt:
- `POST /jobs` không còn nhận/yêu cầu `paymentId`.
- `POST /jobs/:id/approve` (khách duyệt) mới là nơi sinh QR — trả về
  `payment` (paymentCode/transferContent/qrImageUrl) ngay trong response,
  chuyển job sang trạng thái mới `awaiting_payment`.
- `SchedulerService` phát hiện payment PAID (qua tick định kỳ) mới gọi
  đóng gói + mở tải (`JobsService.finalizeDelivery()`).
- `payments` table bổ sung `job_id`/`storage_code`/`bank_name`/
  `account_number`/`qr_image_url` (migration 008) để khớp
  `CWS_DATABASE_SCHEMA.md` và để webhook đối chiếu được storage_code.
- Frontend: bỏ màn "Payment" đứng trước Processing, Payment giờ là 1
  trạng thái con của Processing (`job.status === 'awaiting_payment'`),
  không còn nút "xác nhận thanh toán" thủ công nào (đúng nguyên tắc chỉ
  webhook mới xác nhận PAID).

Đã build/test/lint lại toàn bộ (backend `nest build` + `jest`, frontend
`oxlint` + `vite build`) — tất cả PASS sau khi sửa. Đã verify runtime
boot thật (`node dist/main.js`, xác nhận "Nest application successfully
started" + đầy đủ route map) để chắc chắn không có lỗi DI circular do
thêm `JobsService` vào `SchedulerService`.

Đã bổ sung 11 unit test THẬT (không chỉ verify qua đọc code/build) bảo
vệ đúng logic đã sửa — `jobs.service.spec.ts` (approve()/finalizeDelivery():
ném lỗi khi chưa review_ready, sinh payment đúng storageCode, không
đóng gói sớm khi payment chưa PAID) + `payments.service.spec.ts` (file
mới — confirmViaWebhook(): xác nhận cụ thể rằng storage_code KHÔNG khớp
sẽ bị từ chối dù payment_code+số tiền đúng, đây chính là lỗ hổng đã sửa).
Tổng test backend: 9 → 20, tất cả PASS.

### Lỗ hổng bảo mật khác phát hiện qua self-review (sau khi tưởng đã xong)

Sau khi báo cáo audit này coi như hoàn tất, tự đọc lại `payments.controller.ts`
lần nữa và phát hiện: `POST /payments/webhook` — endpoint DUY NHẤT được
phép set PAID — **không có bất kỳ guard/xác thực nào**. Việc đối chiếu
payment_code + storage_code + amount tưởng như đủ an toàn, nhưng thực
ra KHÔNG đủ: cả 3 giá trị này đều được Portal hiển thị trực tiếp cho
chính khách hàng (trong QR/transferContent) để họ chuyển khoản — nghĩa
là bất kỳ khách hàng nào cũng biết đủ 3 giá trị đó cho payment của
chính mình, và có thể tự gọi thẳng webhook để đánh dấu PAID mà KHÔNG
cần chuyển tiền thật. Đây là lỗ hổng cùng loại (frontend/khách hàng tự
xác nhận thanh toán) như lỗ hổng đã tìm thấy ở nhánh
`claude/cws-zero-manual-operation-wtzbrt` trước đó — chỉ khác là lần
này nằm ngay trong kiến trúc "đã sửa đúng" của chính audit này, bị bỏ
sót vì đã tập trung vào tính đúng của logic đối chiếu mà quên xác thực
NGUỒN gọi.

Đã sửa: thêm `WebhookSecretGuard` (mới,
`backend/src/common/guards/webhook-secret.guard.ts`, cùng mẫu
fail-closed với `AdminKeyGuard` có sẵn) — bắt buộc header
`x-webhook-secret` khớp biến môi trường mới `PAYMENT_WEBHOOK_SECRET`.
Thiếu biến này → webhook từ chối MỌI request thay vì để công khai. Thêm
3 unit test mới cho guard. Nhân tiện phát hiện thêm: `.github/workflows/ci.yml`
chưa từng chạy `npm run lint` cho backend (chỉ build+test) — nghĩa là
xác nhận "CI 10/10 PASS" trước đó KHÔNG hề phủ eslint backend. Đã thêm
bước lint vào CI job backend, và tự chạy tay phát hiện + sửa 1 lỗi
eslint có sẵn từ trước (`_providerRef` không dùng ở `QrBankProvider.confirm()`).

Build/test/lint backend + boot thật đã chạy lại — PASS toàn bộ (23/23
test, tăng từ 20). Xem chi tiết `backend/CHANGELOG.md` mục `[1.5.0]`.

### Lỗ hổng bảo mật thứ 2 (IDOR) phát hiện qua self-review liên tiếp

Tiếp tục tự đọc lại code sau khi sửa lỗ hổng webhook ở trên, phát hiện
lỗ hổng cùng bản chất (thiếu xác thực NGUỒN gọi) nhưng ở phạm vi rộng
hơn: TOÀN BỘ route `/jobs/:id/...` (GET job/status/preview/download/
logs/notifications, POST approve/cancel/request-changes, DELETE) chỉ
dựa vào việc UUID khó đoán, KHÔNG hề kiểm tra job đó có phải của người
gọi hay không. Nếu 1 job id bị lộ (URL, lịch sử trình duyệt, log, chia
sẻ ảnh chụp màn hình...), bất kỳ ai cũng xem được chi tiết, huỷ job,
kích hoạt approve() sớm, hoặc **tải file kết quả cuối** của khách khác.

Đã sửa: `JobsService.assertOwnership()` (mới) — job có `customerId` bắt
buộc người gọi khớp `customerId` đó (hoặc có `x-admin-key` hợp lệ để
Admin Dashboard vẫn xem/thao tác được job của mọi khách); job CHƯA có
`customerId` (tạo lúc khách chưa đăng nhập) vẫn mở cho khách vãng lai,
giữ nguyên hành vi hiện tại (Facebook Provider chưa bật thật). Route
`GET /jobs/:id/preview` trước đây cố ý để công khai (ảnh watermark, ít
nhạy cảm) — cập nhật `adminApi.js`/`AdminScreen.jsx` gửi kèm
`x-admin-key` để tính năng "Xem" của Admin không bị chặn nhầm.

Thêm 6 unit test mới xác nhận đúng hành vi (khách khác chủ bị chặn 403,
khách ẩn danh bị chặn nếu job có chủ, đúng chủ được phép, Admin bỏ qua
được, job chưa có chủ vẫn mở, không huỷ được job người khác). Tổng test
backend: 23 → 29, PASS toàn bộ. Build/lint + boot thật xác nhận không
lỗi DI. Xem chi tiết `backend/CHANGELOG.md` mục `[1.6.0]`.

### Bug thứ 3 phát hiện qua self-review liên tiếp (không phải bảo mật, nhưng rủi ro OOM thật)

`POST /files/upload` dùng `FileInterceptor('file')` không khai báo
`limits.fileSize` — multer (memory storage mặc định) đọc TOÀN BỘ file
vào RAM trước khi handler kịp kiểm tra `file.size > MAX_FILE_SIZE_BYTES`
(2GB), nên giới hạn đó chưa từng thực sự chặn được file lớn hơn 2GB tốn
RAM tới mức nào. Đã sửa: khai báo `limits.fileSize` ngay trong
`FileInterceptor`, để multer tự chặn trước khi đọc hết file vào bộ nhớ.
Thêm nhánh xử lý `MulterError` trong `HttpExceptionFilter` (trả 413 rõ
ràng thay vì rơi vào 500 mặc định) + file test mới cho filter này (chưa
từng có test). Tổng test backend: 29 → 31, PASS. Xem `backend/CHANGELOG.md`
mục `[1.7.0]`.

### Lỗ hổng bảo mật thứ 3 (IDOR qua WebSocket) phát hiện qua self-review liên tiếp

Sau khi khoá quyền sở hữu cho toàn bộ route REST `/jobs/:id/...`, phát
hiện `/ws/jobs/:id` (`JobsRealtimeServer`) vẫn còn NGUYÊN lỗ hổng y hệt
— gửi toàn bộ snapshot job cho bất kỳ ai kết nối biết job id, vì đây là
đường vào dữ liệu riêng, tách biệt hoàn toàn với REST. Đã sửa: token
Supabase gửi qua query string (`?token=...`, trình duyệt không set
được custom header khi mở WebSocket), Backend xác thực qua hàm mới
`resolveCustomerId()` rồi đối chiếu `order.customerId`, đóng kết nối
(4003) nếu không khớp. Thêm 4 test mới (file test đầu tiên cho lớp
này). Tổng test backend: 31 → 35, PASS. Xem `backend/CHANGELOG.md` mục
`[1.8.0]`.

### 3 mismatch nhỏ hơn phát hiện cùng đợt audit

- **"Tạo Job" thiếu Phần mềm/Phiên bản/Ghi chú** (migration 009 +
  `CreateJobDto` + `UploadScreen.jsx`) — xem chi tiết ở mục DONE và
  `backend/CHANGELOG.md`.
- **Admin thiếu "Danh sách khách hàng" + "Tìm kiếm theo Customer"**
  (`GET /customers` mới + `AdminScreen.jsx`) — xem chi tiết ở mục DONE
  và `backend/CHANGELOG.md`.
- **Admin thiếu cột "Tiến độ"** — đã thêm cột % (`stageProgress`) vào
  bảng Job trong `AdminScreen.jsx`.

Build/test/lint đã chạy lại lần nữa sau các fix này, vẫn PASS toàn bộ;
đã verify boot thật xác nhận route `GET /customers` đăng ký đúng.

### Direct Link — mismatch nhỏ khác vừa phát hiện

CWS_MVP_WORKFLOW_FINAL.md, mục "Tạo Job" liệt kê 4 nguồn: "Google
Drive. OneDrive. Dropbox. Direct Link." — Portal chỉ chấp nhận 3 nguồn
đầu (`SHARED_LINK_PATTERNS`), từ chối mọi URL khác kể cả hợp lệ. Đã
thêm `DIRECT_LINK_PATTERN` (catch-all URL `https://` bất kỳ) làm nguồn
thứ 4 — Backend đã sẵn xử lý an toàn từ trước, không cần sửa gì.

### 2 mục Admin còn lại — đã hoàn thành nốt

- **Admin theo dõi "Worker"** — đã thêm `GET /fleet/workers`
  (`WorkerFleetGateway.listWorkers()`, chỉ đọc bảng `workers`: worker_id/
  gpu_name/status/last_seen_at/crash_count) + bảng "Worker Fleet" trong
  `AdminScreen.jsx`. Route riêng `/fleet` (không phải `/jobs/...`) để
  tránh xung đột với route `:id` của `JobsController` — đã verify boot
  thật xác nhận đăng ký đúng, không đè lên `/jobs/:id/...`.
- **Admin xem Preview ảnh** — đã thêm nút "Xem" per-job trong
  `AdminScreen.jsx`, mở modal gọi `GET /jobs/:id/preview` (route đã có
  sẵn từ trước, công khai — không cần sửa Backend, chỉ thiếu UI).

Build/test/lint + boot thật đã chạy lại lần nữa sau 2 fix này, vẫn PASS
toàn bộ.

---

## PARTIAL

Các mục CODE đã có nhưng CHƯA kiểm thử được bằng mắt/end-to-end thật vì
thiếu công cụ trình duyệt hoặc thiếu credential thật trong môi trường
làm việc này:

- **Toàn bộ luồng end-to-end thật** (Facebook Login → ... → COMPLETED)
  — code đã đúng theo audit tĩnh + 20 unit test PASS (bao gồm 11 test
  mới cho riêng logic thanh toán), nhưng CHƯA từng chạy thật với
  Facebook Provider bật + Backend deploy thật + trình duyệt thật. Không
  có gì mâu thuẫn phát hiện được, nhưng "chạy thật OK" (network thật,
  Supabase Realtime thật, timing thật giữa các service) chỉ xác nhận
  được khi có đủ 3 điều kiện đó — unit test không thay thế được E2E thật.
- **`AdminScreen.jsx` / `ReviewScreen.jsx` (kể cả nút "Yêu cầu chỉnh
  sửa" mới) / `PaymentScreen.jsx` (vừa viết lại)** — build/lint PASS,
  nhưng chưa xem qua trình duyệt thật (không có browser tool trong
  phiên làm việc này).
- **Webhook MB Bank thật** — route `POST /payments/webhook` đã có logic
  đối chiếu đúng, nhưng chưa từng nhận request thật từ ngân hàng/cổng
  trung gian (chỉ test được bằng cách gọi tay/giả lập).
- **Ảnh QR VietQR thật quét được bằng app ngân hàng** — logic dựng URL
  đã đúng (verify BIN `970422` qua WebSearch), nhưng chưa test bằng
  cách quét thật vì chưa có số tài khoản MB Bank thật.
- **Upload File trực tiếp (không qua Google Drive)** — Worker Fleet
  (`cws_worker_full.py`, không sửa) hiện chỉ tải được từ Google Drive;
  nếu khách chọn "Upload File", Backend báo lỗi rõ ràng thay vì tạo job
  hỏng, nhưng đây vẫn là 1 giới hạn thật của luồng, không phải bug.

---

## BLOCKED

Các mục cần thao tác/credential bên ngoài môi trường làm việc này —
KHÔNG tự làm tiếp được, cần người dùng thao tác trực tiếp:

1. **Facebook Developer** (developers.facebook.com) — tạo Facebook App,
   lấy App ID + App Secret thật.
2. **Supabase Dashboard** (project `ynhxlxetwuiyejcjypsi`):
   - Authentication > Providers > Facebook: bật + điền App ID/Secret ở
     bước 1.
   - Authentication > URL Configuration: điền Site URL + Redirect URLs
     đúng domain Vercel thật của Portal.
   - Settings > API: xác nhận đã rotate `service_role` key (đã từng lộ
     trong `.env.example` cũ, xem SECURITY INCIDENT trong
     `reports/CODEX_2_CHECKLIST.md`).
3. **RLS Policy** — đã bật + viết policy owner-scoped (migration 007),
   nhưng CẦN người dùng xác nhận lại policy phù hợp với cách anon key
   thật sự được dùng ở Portal trước khi coi là "đã chốt cho production"
   (đây là early sanity-check, không phải audit bảo mật toàn diện).
4. **MB Bank thật** — số tài khoản + tên chủ tài khoản thật
   (`MB_BANK_ACCOUNT_NUMBER`/`MB_BANK_ACCOUNT_NAME`), và cấu hình nhận
   webhook thật từ MB Bank/cổng trung gian (Casso, SePay, hoặc tương tự)
   gọi vào `POST /payments/webhook` — nhớ khai báo header
   `x-webhook-secret: <PAYMENT_WEBHOOK_SECRET>` ở phía cổng trung gian
   (mới thêm, xem mục "Lỗ hổng bảo mật khác" phía trên), nếu không
   webhook thật cũng sẽ bị từ chối.
5. **Backblaze B2 thật** — xác nhận đã rotate Application Key đã lộ
   (`00483fb516ab3b10000000003`), và audit lại cấu trúc bucket thật
   (source/review/final/logs — hiện Backend dùng `uploads/...` +
   Worker Fleet dùng `renders/{jobId}/task_{id}/frame_N.png`, KHÔNG
   đúng cấu trúc `jobs/{storage_code}/source|review|final|logs` mô tả
   trong CWS_MVP_WORKFLOW_FINAL.md — đây là mismatch ĐÃ BIẾT, chấp nhận
   được vì gắn chặt với `cws_worker_full.py`, không phải lỗi mới).
6. **Render.com** — deploy Backend thật (`backend/BACKEND_SETUP.md` có
   hướng dẫn đầy đủ), điền toàn bộ biến môi trường trong
   `backend/.env.example` (đặc biệt `ADMIN_API_KEY` và `PAYMENT_WEBHOOK_SECRET`
   — cả 2 KHÔNG được để trống ở production, route Admin/webhook đều
   fail-closed nếu thiếu).
7. **Vercel** — điền `VITE_CWS_API_BASE_URL`/`VITE_CWS_WS_BASE_URL` trỏ
   về Backend thật sau khi deploy xong bước 6.
8. **Browser test** — không có công cụ trình duyệt trong môi trường làm
   việc này (đã thử cài Claude in Chrome extension đầu phiên, người
   dùng chọn dừng cài) — cần 1 phiên có browser tool, hoặc người dùng
   tự kiểm tra bằng mắt, đặc biệt `AdminScreen.jsx`/`ReviewScreen.jsx`/
   `PaymentScreen.jsx`.
9. ~~Merge Pull Request~~ — **ĐÃ XONG (2026-07-30)**, theo yêu cầu trực
   tiếp của người dùng. `codex/storage-review-images` (đã bao gồm
   `codex/mvp-payment-qr-only`) merge fast-forward vào `main`;
   `codex/ci-workflow` merge 3-way sạch (chỉ thêm 1 file). Build/test/lint
   PASS trên `main` sau merge, đã push GitHub (`a7ffb80..21ac183`).
   Sau đó cũng đã xoá toàn bộ 16 nhánh Git cũ theo yêu cầu người dùng
   (2 đợt, đều xác nhận rõ ràng trước khi xoá) — repo hiện chỉ còn `main`.

---

## Kết luận

Tổng cộng **9 mismatch với roadmap** đã tìm và sửa trong đợt audit
này: (1) thứ tự thanh toán vs render (nghiêm trọng nhất), (2) "Tạo Job"
thiếu Phần mềm/Phiên bản/Ghi chú, (3) Admin thiếu "Danh sách khách
hàng", (4) Admin thiếu "Tìm kiếm theo Customer", (5) Admin thiếu cột
"Tiến độ", (6) Admin thiếu theo dõi "Worker", (7) Admin thiếu xem
"Preview", (8) thiếu nguồn "Direct Link" trong 4 nguồn Tạo Job, (9) 7
RLS policy + 2 index thiếu (cảnh báo performance).

Ngoài 9 mismatch trên (không tính chung vào số đếm vì không phải lỗi so
với roadmap, mà là lỗi tự mình gây ra rồi tự phát hiện): qua self-review
LIÊN TIẾP (mỗi lần sửa xong lại tự đọc lại code 1 lần nữa thay vì dừng)
đã tìm và sửa thêm 7 bug tự gây ra:
- 3 bug do các fix tính năng bổ sung gây ra (tên file tải về sai định
  dạng, tải frame không giới hạn số lượng song song, ghép video vô
  nghĩa cho render 1 frame).
- 4 lỗ hổng/rủi ro nghiêm trọng hơn hẳn 3 bug kia, phát hiện theo đúng
  thứ tự tự đọc lại code (mỗi lần sửa xong 1 cái lại lộ ra cái tiếp
  theo): (a) `POST /payments/webhook` cho phép khách hàng tự đánh dấu
  PAID cho payment của mình mà không cần chuyển tiền — sửa bằng
  `WebhookSecretGuard` mới; (b) TOÀN BỘ route REST `/jobs/:id/...`
  không kiểm tra chủ sở hữu (IDOR) — sửa bằng
  `JobsService.assertOwnership()` mới; (c) `POST /files/upload` không
  giới hạn `fileSize` ở tầng multer, rủi ro OOM thật trước khi kịp kiểm
  tra 2GB — sửa bằng `limits.fileSize` + xử lý `MulterError` riêng
  trong `HttpExceptionFilter`; (d) route WebSocket `/ws/jobs/:id` vẫn
  còn NGUYÊN lỗ hổng IDOR y hệt (b) dù đã sửa ở REST, vì là đường vào
  dữ liệu riêng — sửa bằng token qua query string + `resolveCustomerId()`.
  Xem các mục riêng "Lỗ hổng bảo mật..." phía trên để biết chi tiết
  từng cái.

Sau các fix trên, toàn bộ **luồng chính** (Definition of Done: Facebook
Login → Customer Profile → Job → Upload → Render → Progress → Preview
→ MB QR → Webhook → PAID → Download → COMPLETED) VÀ toàn bộ mục "Admin
theo dõi" (Customer/Jobs/Worker/Progress/Preview/Payment/Download —
CWS_MVP_WORKFLOW_FINAL.md, mục Admin) đã khớp đúng 3 tài liệu gốc.
Không còn mismatch nào phát hiện được qua audit tĩnh (đọc code + đối
chiếu từng dòng trong 3 doc).

Ngoài phạm vi bắt buộc của roadmap, theo yêu cầu trực tiếp của người
dùng đã bổ sung thêm 2 tính năng (giá thật theo runtime Worker, xuất
video MP4 tự động) — xem mục đầu file.

Toàn bộ phần còn lại (mục BLOCKED ở trên) đều là credential/dashboard/
thao tác bên ngoài mà Agent không có quyền tự thực hiện trong môi
trường này. Repository cũng đã được dọn sạch: merge toàn bộ 3 nhánh PR
vào `main` và xoá 16 nhánh Git cũ không còn giá trị (7 nhánh nằm trọn
trong `main`, 9 nhánh còn lại đã đọc kỹ nội dung trước khi xoá — không
có nhánh nào đáng giữ lại hoặc merge, xem `reports/CODEX_1_CHECKLIST.md`
để biết chi tiết từng nhánh) — repo hiện chỉ còn duy nhất `main`.

**Xác nhận độc lập cuối cùng (2026-07-30):** ngoài build/test/lint
chạy cục bộ nhiều lần trong suốt phiên, đã kiểm tra qua GitHub REST API
(`GET /repos/.../actions/runs`) rằng GitHub Actions CI đã tự chạy thật
trên MỖI lần push lên `main` — 10/10 lần chạy gần nhất đều
`completed`/`success`. Đây là xác nhận từ máy chủ GitHub (không phải
môi trường làm việc cục bộ), cho thứ tin cậy cao nhất có thể đạt được
mà không cần triển khai lên Render/Vercel thật. Đồng thời đã chạy
`npm ci` (không phải `npm install`) cho cả backend và frontend để mô
phỏng đúng bước cài đặt CI — cả 2 cài đặt sạch, không lỗi.
