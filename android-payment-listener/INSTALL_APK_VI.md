# Hướng dẫn cài đặt APK — CWS Payment Listener (bản debug, CAPTURE_ONLY)

APK bản debug **mặc định chạy chế độ CAPTURE_ONLY** — chỉ đọc/ghi nhận thông báo
MBBank cục bộ để hiệu chỉnh parser, **KHÔNG gửi bất kỳ yêu cầu thanh toán nào** lên
Backend (`PAYMENT_ENABLED=false`). An toàn để cài thử ngay cả trước khi hoàn tất
cấu hình Backend thật.

## Bước 1 — Lấy file APK

**Cách A — Build local đã có sẵn (nếu bạn tự build):**
`android-payment-listener/app/build/outputs/apk/debug/app-debug.apk`

**Cách B — Tải từ GitHub Actions:**
1. Vào repo GitHub → tab **Actions**.
2. Chọn workflow **"Build Android Payment Listener"**.
3. Mở lần chạy mới nhất (nhánh `main`) → phần **Artifacts** ở cuối trang.
4. Tải file `cws-mbbank-listener-debug-apk` (file `.zip`).
5. Giải nén — bên trong có `app-debug.apk`.

## Bước 2 — Cài APK lên điện thoại

1. Chuyển file `app-debug.apk` vào điện thoại (cáp USB, Google Drive, Zalo tự gửi...).
2. Mở file trên điện thoại — nếu hiện cảnh báo "Cài đặt từ nguồn không xác định",
   bấm **Cho phép** (chỉ áp dụng cho lần cài này).
3. Bấm **Cài đặt**.

## Bước 3 — Cấp quyền cần thiết

1. Mở app **CWS Payment Listener**.
2. Màn hình trạng thái hiện đầy đủ thông tin máy + Device ID.
3. Bấm **"Mở cài đặt cấp Notification Access"** → tìm "CWS Payment Listener" trong
   danh sách → bật.
4. Quay lại app, bấm **"Mở cài đặt tối ưu pin"** → làm theo hướng dẫn app hiện
   (khác nhau theo hãng máy: Xiaomi/Samsung/OPPO/Realme/Vivo/Huawei/Honor).
5. (Android 13+) Nếu hệ thống hỏi quyền hiện thông báo, bấm **Cho phép**.

## Bước 4 — Kiểm tra kết nối Backend

Bấm **"Kiểm tra kết nối backend"**. Với bản debug tải trực tiếp (chưa cấu hình
`local.properties` thật), kết quả sẽ báo lỗi kết nối — **bình thường**, vì URL
Backend trong bản debug CI chỉ là placeholder. Muốn kết nối Backend thật, phải tự
build lại theo `README.md` (điền `cws.backend.base.url` + `cws.device.secret` thật).

## Bước 5 — Test chế độ Capture Only (KHÔNG cần Backend thật)

1. Đảm bảo có 1 thông báo bất kỳ từ app MBBank xuất hiện trên điện thoại (thật ra
   chỉ cần MỞ app MBBank và để hệ thống MBBank tự đẩy 1 thông báo bất kỳ — hoặc
   chờ đến khi có giao dịch thật).
2. Mở lại CWS Payment Listener — mục **"Thông báo MBBank gần nhất"** phải cập
   nhật thời gian vừa nhận.
3. Mục **"Sự kiện đang chờ gửi"** tăng lên — vì `CAPTURE_ONLY` nên sự kiện
   KHÔNG được gửi đi, chỉ nằm trong hàng đợi cục bộ để bạn xem lại.

## Bước 6 — Sao chép raw notification để hiệu chỉnh parser

1. Bấm **"Sao chép raw notification để debug"**.
2. Dán (paste) vào ghi chú/Zalo/email để gửi lại cho người phát triển — đây CHÍNH
   LÀ dữ liệu cần thiết để sửa `NotificationParser.kt` cho đúng định dạng MBBank
   thật (xem PHẦN 3 trong README.md).

## Gỡ app nếu có lỗi

Cài đặt (Settings) → Ứng dụng → CWS Payment Listener → Gỡ cài đặt. Hoặc giữ icon
app trên màn hình chính → Gỡ cài đặt. Gỡ app KHÔNG ảnh hưởng gì tới Backend/dữ
liệu khác của CWS (app này chỉ lưu dữ liệu cục bộ trên chính điện thoại).

## Lưu ý an toàn

- Bản debug tải qua GitHub Actions **KHÔNG** có secret thật, **KHÔNG** kết nối
  được Backend thật, **KHÔNG** gửi thanh toán — an toàn để cài thử ở bất kỳ máy
  nào, kể cả không phải điện thoại chính thức của chủ CWS.
- CHỈ bật `cws.payment.enabled=true` (build lại APK) sau khi đã hiệu chỉnh xong
  parser bằng mẫu thật VÀ đăng ký đúng device_id/secret vào Backend.
