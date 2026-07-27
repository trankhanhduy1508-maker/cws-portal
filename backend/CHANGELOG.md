# Changelog

## [1.0.0] - CWS Backend - Phase 1 (Initial Implementation)

### Thêm mới
- NestJS Backend hoàn chỉnh thay thế mockBackend.js phía Portal —
  khớp chính xác API Contract Portal đã tự định nghĩa sẵn
  (RenderService.js, apiConfig.js).
- Jobs Module: tạo/đọc/hủy render order, tự động dispatch sang Worker
  Fleet qua bảng jobs/tasks có sẵn (KHÔNG sửa cws_worker_full.py).
- Payments Module: Strategy Pattern cho Wallet/QR Bank (placeholder,
  ghi rõ giới hạn - chưa nối cổng thanh toán thật).
- Files Module: upload thật lên Backblaze B2, resolve metadata Google
  Drive thật (qua Drive API v3, tùy chọn), phát hiện sớm lỗi link
  folder (bài học từ sự cố CWS-JOB5 thật trong quá trình phát triển).
- Realtime Module: bridge WebSocket sang Supabase Realtime - Portal
  nhận cập nhật trạng thái job theo thời gian thực.
- Scheduler Module:
  - Model 1 (ưu tiên Worker Online): tận dụng cơ chế claim_task() sẵn
    có của Worker Fleet, Backend chỉ đọc lại trạng thái để cập nhật
    status tường thuật cho khách.
  - Model 2 (Wake mở rộng): tìm máy Sleep có Wake Capability khi thiếu
    Worker online - hiện luôn thất bại có kiểm soát (NoopWakeProvider)
    vì cws_worker_full.py chưa có cơ chế relay Magic Packet, job tự
    rơi vào Queue đúng thiết kế, không retry vô hạn.
  - Tự động tạo các task còn lại sau khi biết total_frames từ Scene
    Analyzer (tự động hoá việc Dy từng làm tay cho job CWS-JOB5).
  - Tự động đóng gói kết quả (frame PNG) thành file .zip khi mọi task
    hoàn thành.
- 4 bảng Supabase mới: render_orders, payments, sites,
  machine_capability - KHÔNG sửa bảng jobs/tasks/workers hiện có.
- Repository Pattern (interface + Supabase implementation) cho toàn bộ
  data access, Dependency Injection nhất quán, TypeScript Strict Mode.
- Unit test cho logic quan trọng nhất: phát hiện link folder Google
  Drive, tính ETA/giá theo Render Profile.

### Giới hạn đã biết (ghi rõ, không che giấu)
- Upload File trực tiếp: Worker Fleet chưa tải được từ B2, chỉ nhánh
  Google Drive hoạt động end-to-end.
- Đóng gói kết quả: chỉ tạo file .zip chứa frame PNG, chưa tự động
  dựng video MP4.
- Thanh toán: Wallet/QR Bank là placeholder, chưa nối cổng thật.
- Wake System: chưa có cơ chế Wake thật (cần mở rộng Worker, thay đổi
  Foundation cần quyết định riêng).
- GET /jobs chưa phân quyền theo khách hàng (Portal chưa có đăng nhập).
