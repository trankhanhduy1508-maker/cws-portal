# CWS Payment Listener (Android MVP)

App Android chạy trên điện thoại của chủ CWS, đọc thông báo biến động số dư từ
app MBBank (`com.mbmobile`) qua `NotificationListenerService` (KHÔNG Root, KHÔNG
Accessibility Service, KHÔNG OCR/tự động click), gửi HTTPS về Backend CWS —
Backend là nơi DUY NHẤT quyết định thanh toán thành công (xem
`reports/payments/MBBANK_NOTIFICATION_LISTENER_RESEARCH.md`).

**Môi trường phát triển repo này KHÔNG có Android SDK/Gradle** — code đã viết đầy
đủ nhưng **chưa từng build/chạy thử**. Phải mở bằng Android Studio (có SDK) trên
máy khác để build/cài lên điện thoại thật.

## Yêu cầu

- Android Studio (Koala trở lên khuyến nghị) — tự tải Gradle 8.7 + JDK 17 nếu
  chưa có.
- 1 điện thoại Android thật đã cài app MBBank, dùng để test.

## Bước 1 — Cấu hình secret TRƯỚC khi build (bắt buộc, PHẦN 5)

1. Copy `local.properties.example` → `local.properties` (cùng thư mục
   `android-payment-listener/`).
2. Điền `cws.backend.base.url` = URL Backend CWS thật (không có `/` cuối).
3. Tạo 1 chuỗi ngẫu nhiên làm secret, vd:
   ```
   openssl rand -hex 32
   ```
   Điền vào `cws.device.secret`.
4. **KHÔNG BAO GIỜ commit `local.properties`** (đã có trong `.gitignore`).

## Bước 2 — Build + cài lên điện thoại thật

Mở thư mục `android-payment-listener/` bằng Android Studio > Sync Gradle > Run
(hoặc Build > Build Bundle(s)/APK(s) > Build APK(s), rồi cài file `.apk` thủ công
lên điện thoại nếu không cắm dây debug).

## Bước 3 — Cấp quyền + đăng ký thiết bị với Backend

1. Mở app lần đầu — màn hình trạng thái hiện **Device ID** (do app tự sinh ngẫu
   nhiên, KHÔNG hardcode — PHẦN 2.3).
2. Bấm "Mở cài đặt cấp Notification Access" → bật cho CWS Payment Listener.
3. Bấm "Mở cài đặt tối ưu pin" → làm theo hướng dẫn app hiện (khác nhau tuỳ hãng
   máy — Xiaomi/Samsung/OPPO/Realme/Vivo/Huawei/Honor, xem `OemGuideProvider.kt`).
4. Copy Device ID từ màn hình app, đăng ký vào Backend qua Supabase SQL Editor
   (chạy tay, xem ví dụ trong `backend/migrations/015_payment_devices.sql`):
   ```sql
   insert into public.payment_devices (device_id, label, secret)
   values ('<device-id-vua-copy>', 'Điện thoại chủ CWS', '<ĐÚNG secret đã điền ở local.properties bước 1>');
   ```
5. Bấm "Kiểm tra kết nối backend" trong app — phải báo "✅ Kết nối Backend OK".

## PHẦN 3 — Việc CẦN LÀM NGAY sau khi cài (quan trọng nhất)

`NotificationParser.kt` hiện dùng regex **ước lượng ban đầu** (chưa xác nhận từ
mẫu MBBank thật — xem comment đầu file). Sau khi cài app:

1. Thực hiện 1 giao dịch chuyển khoản nhỏ vào tài khoản MBBank đã bật thông báo.
2. Mở app CWS Payment Listener → xem "Nội dung raw gần nhất" hoặc bấm "Sao chép
   raw notification để debug".
3. Đối chiếu `title/text/subText/bigText/extras` THẬT với regex trong
   `NotificationParser.kt` — sửa lại các hằng số `AMOUNT_REGEX`/`CWS_CONTENT_REGEX`/
   `BANK_TXN_ID_REGEX`/`FT_CODE_REGEX` cho khớp định dạng thật, build lại.

Trước khi làm bước này, mọi thông báo có `amount`/`transfer_content` không tách
được sẽ ở trạng thái `needs_review` (không tự gửi lên Backend, không mất dữ
liệu — xem `EventStatus.NEEDS_REVIEW`), ĐÚNG nguyên tắc "Khi chưa chắc chắn hoặc
parse lỗi: không đánh dấu PAID, không mở khoá file, lưu raw để kiểm tra thủ công".

## Cấu trúc

```
android-payment-listener/
  app/src/main/kotlin/com/cws/paymentlistener/
    App.kt                        # Lịch WorkManager (sync + heartbeat định kỳ)
    notification/
      MbBankNotificationListenerService.kt   # PHẦN 2.1
      NotificationParser.kt                  # PHẦN 3/4 — best-effort, cần hiệu chỉnh
      NotificationExtrasReader.kt            # Bundle -> JSON an toàn
    data/local/                    # Room — hàng đợi cục bộ (PHẦN 2.4)
    data/remote/                   # HttpURLConnection + ký HMAC (PHẦN 5)
    device/                        # Device ID, OEM guide, permission status (PHẦN 2.3)
    work/                          # SyncWorker + HeartbeatWorker (PHẦN 2.4/2.5)
    ui/MainActivity.kt             # Màn hình trạng thái (PHẦN 2.2)
```

## Giới hạn đã biết (không giả vờ hoàn thiện)

- Chưa build/chạy thử thật (không có Android SDK trong môi trường viết code này).
- `NotificationParser` cần hiệu chỉnh bằng mẫu thật (xem PHẦN 3 ở trên).
- Secret nằm trong `BuildConfig` của APK vẫn có thể bị trích xuất qua decompile —
  bảo mật mức MVP, không chống được kẻ tấn công đã kiểm soát chính điện thoại.
- Danh sách hướng dẫn OEM (`OemGuideProvider.kt`) dựa trên Intent action phổ biến
  công khai — có thể không đúng trên MỌI phiên bản ROM, đã có fallback về màn
  hình cài đặt app chuẩn khi Intent không tồn tại.
