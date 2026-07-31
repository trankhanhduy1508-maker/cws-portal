# Nghiên cứu: Thanh toán tự động qua thông báo MBBank (Android Notification Listener)

Ngày: 2026-07-31. Phạm vi: trả lời trực tiếp câu hỏi "hệ thống CWS có thể xác định
khách đã chuyển khoản thành công chỉ bằng thông báo của app MBBank trên Android
hay không", dựa trên tài liệu Android chính thức + các dự án mã nguồn mở/sản phẩm
thật đã triển khai đúng mô hình này. Phần nào **không thể xác nhận** mà chỉ có thể
kiểm tra bằng thiết bị thật được ghi rõ, không đoán.

## 1. Kết luận ngắn gọn

**Có, về mặt kỹ thuật khả thi và đã được nhiều sản phẩm thật triển khai** (không
phải ý tưởng chưa ai làm). Nhưng: **không cần Root, không cần Accessibility
Service**; **có thể cần** cấu hình thêm ở 1 số hãng máy (Xiaomi/Huawei/OPPO/Vivo)
để service không bị hệ điều hành tự kill nền — đây là rủi ro thật, có tài liệu
tham khảo cụ thể ở mục 3.

## 2. Android NotificationListenerService — xác nhận qua tài liệu chính thức

- Có từ Android 4.3 (API 18), là 1 `Service` hệ thống ràng buộc (bound service),
  **không phải Foreground Service** và **không phải Accessibility Service** — 2 khái
  niệm khác nhau, không cần dùng chung.
- Quyền cấp: người dùng phải vào **Settings > Apps > Special access > Notification
  access** và bật thủ công cho app (không tự động, không xin qua runtime permission
  dialog thông thường) — **không cần Root**.
- Mỗi thông báo đến, callback `onNotificationPosted(StatusBarNotification sbn)` nhận
  được:
  - `sbn.getPackageName()` — package của app tạo thông báo (vd `com.mbmobile`).
  - `sbn.getNotification().extras` — Bundle chứa `android.title`, `android.text`,
    `android.subText`, `android.bigText` (nội dung mở rộng khi kéo thông báo ra) và
    các key khác tuỳ app.
  - Đọc được **toàn bộ** nội dung text app hiển thị trong thông báo — không có giới
    hạn kỹ thuật nào ngăn đọc từ 1 app cụ thể (mọi thông báo hệ thống post đều đi
    qua listener nếu người dùng đã cấp quyền).

**Nguồn**: [Stackademic — Exploring the Notification Listener Service in Android](https://blog.stackademic.com/exploring-the-notification-listener-service-in-android-7db54d65eca7),
[NotificationListenerService-Example (GitHub)](https://github.com/TaQuangKhoi/NotificationListenerService-Example),
[B4X Forum — Reading StatusBarNotification's extras](https://www.b4x.com/android/forum/threads/solved-reading-statusbarnotifications-extras.64416/).

## 3. Package name MBBank + rủi ro bị kill nền

- Package Google Play xác nhận: **`com.mbmobile`** ([MB Bank — Google Play](https://play.google.com/store/apps/details?id=com.mbmobile&hl=en_US)).
- **Rủi ro thật, có tài liệu**: các hãng Xiaomi (MIUI/HyperOS), Huawei, OPPO
  (ColorOS), Vivo (Funtouch OS) có lớp quản lý pin RIÊNG ngoài Android chuẩn — có
  thể tự kill service nền dù app đã xin "bỏ qua tối ưu hoá pin" chuẩn Android. MIUI
  reset quyền "Autostart" sau mỗi lần cập nhật OTA; Huawei có `PowerGenie` kill
  app giữ wakelock >60 phút không nằm whitelist. Đây là vấn đề đã được cộng đồng hệ
  thống hoá tại **[dontkillmyapp.com](https://dontkillmyapp.com/xiaomi)** — trang
  tham chiếu chuẩn cho từng hãng máy, khuyến nghị dùng ngay (mục 6).

**Kết luận cho câu hỏi "cần gì khi khởi động lần đầu"**: app Android nên đọc
`Build.MANUFACTURER` + `Build.BRAND` lúc khởi động lần đầu, tra bảng ánh xạ hãng →
hướng dẫn cụ thể (link tới đúng trang dontkillmyapp.com hoặc mở thẳng màn hình cài
đặt autostart/pin của hãng đó qua Intent), **không đoán chung chung "vào cài đặt
pin"** — mỗi hãng có tên menu khác nhau.

## 4. Riêng nội dung thông báo MBBank — PHẦN KHÔNG THỂ XÁC NHẬN TỪ XA

Đã tìm nhiều nguồn (bài hướng dẫn bật thông báo MBBank, trang chủ MB Bank) nhưng
**không tìm được** ảnh chụp/text mẫu chính xác của 1 thông báo push biến động số dư
thật từ app MBBank (title/text/bigText cụ thể chứa gì, số tiền nằm ở field nào, có
tách sẵn "số dư" khỏi "nội dung chuyển khoản" hay dồn chung 1 đoạn text).

**Không đoán field này.** Việc cần làm trước khi code app Android thật: cài
MBBank thật trên 1 máy Android, bật thông báo biến động số dư, thực hiện 1 giao
dịch nhỏ, dump `extras` bằng chính `NotificationListenerService` demo (vd repo
`TaQuangKhoi/NotificationListenerService-Example` ở mục 2) để lấy chính xác format,
sau đó mới viết logic parse (regex) cho `sender_name/amount/transfer_content`. Do
đó yêu cầu "chưa cần hoàn thiện app Android" trong nhiệm vụ lần này — thiết kế
Backend đã sẵn sàng nhận payload đã được app Android **tự chuẩn hoá** (xem mục 7),
tách biệt hoàn toàn khỏi việc parse thô từ notification (đó là việc CỦA app
Android, không phải Backend).

**Bằng chứng gián tiếp mô hình này khả thi trong thực tế** (không phải đoán mò):
- SePay (fintech Việt Nam, chuyên bán dịch vụ webhook ngân hàng) tự phát hành app
  Android riêng (`com.sepay.trans`), ngoài kênh SMS Banking + API ngân hàng chính
  thức — cho thấy đọc thông báo/SMS bằng app trên điện thoại là 1 kênh thu thập dữ
  liệu giao dịch đã được triển khai thương mại tại Việt Nam.
- Dự án mã nguồn mở `atick-faisal/Expense-Tracker-Android` ("reads your bank
  notifications") và nhiều app "đọc lệnh chuyển khoản"/loa báo tiền bán trên
  Shopee dùng đúng cơ chế `NotificationListenerService` + regex parse text, đã
  chạy thật với nhiều ngân hàng.

## 5. So sánh 5 phương án

| Tiêu chí | A. Notification Listener | B. Webhook SePay | C. Webhook Casso | D. Open Banking API | E. API ngân hàng chính thức |
|---|---|---|---|---|---|
| Chi phí | Miễn phí (chỉ tốn 1 điện thoại Android cũ + SIM/wifi) | Trả phí theo gói (SePay) | Trả phí theo gói (Casso) | Thường miễn phí/thu phí giao dịch tuỳ ngân hàng | Miễn phí nhưng cần hợp đồng doanh nghiệp |
| Độ chính xác | Trung bình — phụ thuộc app ngân hàng có gửi thông báo đầy đủ, đúng lúc không | Cao (ngân hàng đẩy trực tiếp) | Cao | Rất cao (chuẩn hoá, ký số) | Rất cao |
| Độ ổn định | Thấp-Trung bình — phụ thuộc điện thoại luôn online, không bị hãng máy kill nền, app MBBank không đổi format thông báo | Cao | Cao | Rất cao | Rất cao |
| Độ khó triển khai | Trung bình (code Android + xử lý OEM battery) | Thấp (chỉ tích hợp API) | Thấp | Cao (thủ tục pháp lý/kỹ thuật ngân hàng) | Rất cao (đàm phán, hợp đồng) |
| Độ bảo trì | Trung bình-Cao (MBBank đổi UI/format thông báo là hỏng ngay, phải sửa app) | Thấp (SePay tự bảo trì kết nối ngân hàng) | Thấp | Thấp | Thấp |
| Phù hợp MVP | **Có** — 0đ chi phí vận hành, đủ nhanh để launch | Có, nếu chấp nhận chi phí | Có, nếu chấp nhận chi phí | Không (thủ tục quá lâu cho MVP) | Không |
| Phù hợp Production | Không nên là kênh DUY NHẤT (rủi ro downtime điện thoại) | Có | Có | Có (khi đã đủ volume/pháp lý) | Có (doanh nghiệp lớn) |

### Chấm điểm (thang 10, ưu tiên MVP giai đoạn hiện tại của CWS)

| Phương án | Chi phí | Chính xác | Ổn định | Dễ triển khai | Bảo trì | **Tổng (trung bình)** |
|---|---|---|---|---|---|---|
| A. Notification Listener | 10 | 6 | 5 | 6 | 5 | **6.4** |
| B. Webhook SePay | 6 | 9 | 9 | 9 | 9 | **8.4** |
| C. Webhook Casso | 6 | 9 | 9 | 9 | 9 | **8.4** |
| D. Open Banking API | 7 | 10 | 10 | 3 | 9 | **7.8** |
| E. API ngân hàng chính thức | 4 | 10 | 10 | 2 | 9 | **7.0** |

*(B/C điểm cao nhất tổng thể vì đã là hạ tầng trưởng thành — nhưng đề bài đã loại
2 phương án này khỏi MVP vì lý do chi phí, không phải vì chúng kém hơn.)*

## 6. Khuyến nghị

- **MVP (giai đoạn hiện tại)**: Notification Listener (A) — đúng lựa chọn đề bài
  đưa ra, chi phí 0đ vận hành, đủ nhanh. Bắt buộc kèm: (1) tự phát hiện hãng máy lúc
  khởi động + hướng dẫn tắt tối ưu pin theo đúng hãng (mục 3), (2) Backend luôn là
  nơi quyết định cuối (đã triển khai, mục 7), điện thoại chỉ là 1 nguồn tin không
  tin cậy tuyệt đối, (3) có kế hoạch B thủ công (Admin Dashboard đã có nút tra cứu
  payment theo mã — AdminScreen.jsx — dùng khi điện thoại rớt mạng/bị kill).
- **Production (khi có doanh thu ổn định)**: chuyển sang B hoặc C (SePay/Casso) làm
  kênh chính, giữ Notification Listener làm kênh dự phòng — vì webhook có SLA, không
  phụ thuộc 1 điện thoại vật lý duy nhất là điểm lỗi (single point of failure).
  D/E chỉ hợp lý khi CWS đã đủ volume giao dịch để đàm phán trực tiếp ngân hàng.

## 7. Đã triển khai ở Backend (sẵn sàng nhận notification)

Kiến trúc: `Khách → Chuyển khoản QR MB → App MBBank → Thông báo → Android
Notification Listener (chuẩn hoá payload) → HTTPS → Backend CWS → Đối chiếu Job →
PAID → SchedulerService tick tự đóng gói file thật từ B2 (KHÔNG watermark, xem
`JobsService.finalizeDelivery()` + `PackagingService.packageRenderResult()` —
pipeline này đã tồn tại sẵn từ trước, không cần sửa) → trả link tải chính thức.

**Endpoint mới**: `POST /payment/notification`
- Guard: `NotificationSecretGuard` (`backend/src/common/guards/notification-secret.guard.ts`)
  — header `x-notification-secret`, secret RIÊNG với `PAYMENT_WEBHOOK_SECRET` (biến
  `MBBANK_NOTIFICATION_SECRET`, fail-closed nếu chưa cấu hình).
- DTO: `backend/src/payments/dto/mbbank-notification.dto.ts` — đúng 7 field đề bài
  yêu cầu (`transaction_id, amount, transaction_time, sender_name, sender_account,
  transfer_content, balance_after`) + `raw_notification` (lưu nguyên vẹn để điều
  tra sau).
- Logic: `PaymentsService.confirmViaMbbankNotification()` (`backend/src/payments/payments.service.ts`)
  — tái dùng NGUYÊN logic đối chiếu `storage_code + payment_code + amount` đã có ở
  `confirmViaWebhook()` (tách chung thành `matchAndConfirm()`), **không tạo đường
  tắt PAID riêng**.
- Chống trùng/replay: migration `backend/migrations/014_payment_notifications.sql`
  — bảng `payment_notifications` với `transaction_id UNIQUE` là cơ chế chống trùng
  THẬT (constraint DB, không chỉ check-rồi-insert dễ dính race condition). Request
  trùng `transaction_id` → trả lại đúng kết quả cũ (idempotent, không lỗi — vì điện
  thoại có thể gửi lại do mất mạng).
- Audit log: mọi notification (hợp lệ hay không) đều có 1 dòng trong
  `payment_notifications` với `status = processed | rejected` + `reject_reason` —
  đúng yêu cầu "notification không hợp lệ → không mở khoá, ghi audit log".
- Test: `backend/src/payments/payments.service.spec.ts` (4 test case mới) +
  `backend/src/common/guards/notification-secret.guard.spec.ts` (3 test case) —
  toàn bộ 65/65 test backend pass.

## 8. Việc CHƯA làm (ngoài phạm vi lần này, theo đúng yêu cầu "không cần hoàn thiện app Android")

- App Android thật (NotificationListenerService + chuẩn hoá payload + gửi HTTPS)
  — cần thiết bị MBBank thật để dump format thông báo chính xác trước khi code
  (mục 4), không thể làm mù trong sandbox này.
- Bảng ánh xạ hãng máy → hướng dẫn tắt tối ưu pin cụ thể (mục 3) — cần liệt kê đầy
  đủ text menu từng hãng, nên làm cùng lúc code app Android.
- `.env` thật cần điền `MBBANK_NOTIFICATION_SECRET` (đã có trong `.env.example`) và
  cấu hình secret y hệt trong app Android khi build.
