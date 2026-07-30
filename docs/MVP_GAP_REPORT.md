# MVP Gap Report — CWS (Computer Workspace)

Đối chiếu toàn bộ repository với 3 tài liệu gốc:
- `CWS_ROADMAP_MVP_V1.md`
- `CWS_MVP_WORKFLOW_FINAL.md`
- `CWS_DATABASE_SCHEMA.md`

Audit lần cuối: 2026-07-30. Không tạo tính năng ngoài roadmap, không mở
rộng Enterprise/Security cấp ngân hàng/Marketplace/AI ETA.

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
- Dán link Google Drive/OneDrive/Dropbox (`SHARED_LINK_PATTERNS`); Upload
  File trực tiếp lên Backblaze B2 (`B2StorageService`).
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
  đặt PAID.

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
- Bảo vệ bằng `AdminKeyGuard` (header `x-admin-key`) trên `GET /jobs`
  (ẩn danh), `GET /jobs/by-storage-code/:code`, `GET /payments/by-code/:code`,
  `GET /customers`.

### Database & RLS
- Đủ 8 bảng theo `CWS_DATABASE_SCHEMA.md`: customer_profiles,
  render_orders (= "jobs" theo domain Portal), storage_objects,
  review_images, payments (đã bổ sung job_id/storage_code/bank_name/
  account_number/qr_image_url — migration 008), downloads, worker_logs,
  notifications.
- RLS owner-scoped bật cho toàn bộ bảng liên quan tới khách hàng
  (`auth.uid() = customer_id`/`= id`) — `get_advisors(security)` xác
  nhận không còn ERROR nào trên các bảng MVP.

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

### 2 mismatch nhỏ hơn phát hiện cùng đợt audit

- **"Tạo Job" thiếu Phần mềm/Phiên bản/Ghi chú** (migration 009 +
  `CreateJobDto` + `UploadScreen.jsx`) — xem chi tiết ở mục DONE và
  `backend/CHANGELOG.md`.
- **Admin thiếu "Danh sách khách hàng" + "Tìm kiếm theo Customer"**
  (`GET /customers` mới + `AdminScreen.jsx`) — xem chi tiết ở mục DONE
  và `backend/CHANGELOG.md`.

Build/test/lint đã chạy lại lần nữa sau 2 fix này, vẫn PASS toàn bộ;
đã verify boot thật xác nhận route `GET /customers` đăng ký đúng.

---

## PARTIAL

Các mục CODE đã có nhưng CHƯA kiểm thử được bằng mắt/end-to-end thật vì
thiếu công cụ trình duyệt hoặc thiếu credential thật trong môi trường
làm việc này:

- **Toàn bộ luồng end-to-end thật** (Facebook Login → ... → COMPLETED)
  — code đã đúng theo audit tĩnh (đọc code + build/test PASS), nhưng
  CHƯA từng chạy thật với Facebook Provider bật + Backend deploy thật +
  trình duyệt thật. Không có gì mâu thuẫn phát hiện được qua audit tĩnh,
  nhưng "chạy thật OK" chỉ xác nhận được khi có đủ 3 điều kiện đó.
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
- **Index/Foreign Key đầy đủ trên toàn bộ 8 bảng** — đã audit Foreign
  Key chính (customer_profiles→auth.users, payments→render_orders qua
  job_id mới thêm), nhưng chưa chạy `get_advisors(performance)` đầy đủ
  (gặp lỗi 502 tạm thời từ Cloudflare lúc thử, chưa retry).

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
   gọi vào `POST /payments/webhook`.
5. **Backblaze B2 thật** — xác nhận đã rotate Application Key đã lộ
   (`00483fb516ab3b10000000003`), và audit lại cấu trúc bucket thật
   (source/review/final/logs — hiện Backend dùng `uploads/...` +
   Worker Fleet dùng `renders/{jobId}/task_{id}/frame_N.png`, KHÔNG
   đúng cấu trúc `jobs/{storage_code}/source|review|final|logs` mô tả
   trong CWS_MVP_WORKFLOW_FINAL.md — đây là mismatch ĐÃ BIẾT, chấp nhận
   được vì gắn chặt với `cws_worker_full.py`, không phải lỗi mới).
6. **Render.com** — deploy Backend thật (`backend/BACKEND_SETUP.md` có
   hướng dẫn đầy đủ), điền toàn bộ biến môi trường trong
   `backend/.env.example` (đặc biệt `ADMIN_API_KEY` — KHÔNG được để
   trống ở production, route Admin fail-closed nếu thiếu).
7. **Vercel** — điền `VITE_CWS_API_BASE_URL`/`VITE_CWS_WS_BASE_URL` trỏ
   về Backend thật sau khi deploy xong bước 6.
8. **Browser test** — không có công cụ trình duyệt trong môi trường làm
   việc này (đã thử cài Claude in Chrome extension đầu phiên, người
   dùng chọn dừng cài) — cần 1 phiên có browser tool, hoặc người dùng
   tự kiểm tra bằng mắt, đặc biệt `AdminScreen.jsx`/`ReviewScreen.jsx`/
   `PaymentScreen.jsx`.
9. **Merge Pull Request** — nhánh `codex/storage-review-images` (chứa
   toàn bộ sửa lỗi trong báo cáo này), `codex/ci-workflow`,
   `codex/mvp-payment-qr-only` đều đang chờ người dùng duyệt merge vào
   `main` (không tự merge — đây là hành động ảnh hưởng dùng chung).

---

## Kết luận

Sau khi sửa mismatch thanh toán (mục quan trọng nhất), toàn bộ luồng
code từ Facebook Login đến COMPLETED đã khớp đúng thứ tự 3 tài liệu
gốc. Không còn mismatch nào phát hiện được qua audit tĩnh (đọc code +
đối chiếu từng dòng trong 3 doc). Toàn bộ phần còn lại (mục BLOCKED ở
trên) đều là credential/dashboard/thao tác bên ngoài mà Agent không có
quyền tự thực hiện trong môi trường này.
