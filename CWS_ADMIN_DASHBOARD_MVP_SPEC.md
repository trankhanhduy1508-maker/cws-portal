# CWS ADMIN DASHBOARD MVP SPEC

## Mục đích

Tài liệu này định nghĩa **giao diện Admin dành cho Owner/Operator của CWS trong MVP**.

Đây là tài liệu bổ sung cho `CWS_ROADMAP_MVP_V1.md` và `CWS_CUSTOMER_CRM_POLICY.md`.

**Không reset LOOP. Không làm lại task đã hoàn thành. Không mở rộng sang giao diện quán net/Worker trong MVP.**

---

# 1. Phạm vi MVP

Admin Dashboard phải giúp Owner theo dõi và vận hành toàn bộ luồng:

`Customer → Job → Render → Preview → Payment → Final File → Completed`

Ưu tiên giao diện đơn giản, rõ ràng, dùng tốt trên cả máy tính và điện thoại.

Dashboard quán net / Worker Portal là **POST-MVP** và không thuộc tài liệu này.

---

# 2. Trang Tổng quan — Overview

Hiển thị nhanh:

- Tổng số khách hàng
- Khách hàng mới
- Tổng số Job
- Job đang chờ
- Job đang render
- Job chờ review
- Job chờ thanh toán
- Job đã hoàn thành
- Job lỗi
- Tổng thanh toán đã xác nhận
- Các Job cần Admin chú ý

Có danh sách hoạt động gần đây để Owner nhìn nhanh tình trạng hệ thống.

---

# 3. Customers — Quản lý khách hàng

Danh sách khách hàng với các dữ liệu hợp lệ đang có:

- Customer ID
- Tên / display name
- Email
- Avatar nếu có
- Số điện thoại nếu khách chủ động cung cấp
- Zalo/kênh liên hệ nếu khách chủ động cung cấp
- Ngày tạo tài khoản
- Lần hoạt động gần nhất
- Tổng số Job
- Tổng chi tiêu khi dữ liệu có sẵn
- Trạng thái khách hàng
- Ghi chú chăm sóc khách hàng

## Customer Detail

Khi mở một khách hàng:

- Thông tin cơ bản
- Lịch sử Job
- Lịch sử thanh toán
- Storage Code liên quan
- Payment Code liên quan
- Loại workload/phần mềm từ Job đã gửi
- Ngày sử dụng gần nhất
- Tổng số Job
- Tổng giá trị giao dịch
- Ghi chú Admin

## Search

Cho phép tìm theo dữ liệu đang có, tối thiểu:

- Tên
- Email
- Customer ID
- Storage Code
- Payment Code

Tuân thủ `CWS_CUSTOMER_CRM_POLICY.md`.

Không đọc Gmail hoặc nội dung hộp thư của khách để thu thập thêm dữ liệu.

---

# 4. Jobs — Quản lý Job

Danh sách Job cần hiển thị:

- Job ID
- Customer
- Storage Code
- Ngày tạo
- File/source
- Trạng thái
- % progress
- Worker nếu đã được gán
- Payment status
- Final file status

Các trạng thái quan trọng cần dễ phân biệt:

- CREATED
- QUEUED
- RENDERING
- REVIEW
- WAITING_PAYMENT
- PAID
- PACKAGING
- FINISHED
- COMPLETED
- FAILED

Tên trạng thái thực tế phải tái sử dụng enum/schema hiện có trong repository nếu khác tài liệu này; không tạo enum trùng lặp chỉ để khớp UI.

## Job Detail

Admin cần xem được:

- Customer
- Job metadata
- Source/link
- Storage Code
- Worker
- Progress
- Log/error phù hợp
- Preview
- Payment
- Final output
- Download/delivery status
- Timestamps quan trọng

---

# 5. Render / Progress

Admin có thể nhìn nhanh:

- Job nào đang render
- % tiến độ
- Worker đang xử lý
- Thời gian cập nhật gần nhất
- Job lỗi hoặc bị kẹt

Không xây hệ thống monitoring phức tạp ngoài nhu cầu MVP.

---

# 6. Preview / Review

Admin có thể:

- Xem preview đã tạo
- Xem trạng thái review
- Xác định Job chưa có preview
- Mở Job Detail để kiểm tra

Không mở rộng thành hệ thống review/collaboration phức tạp trong MVP.

---

# 7. Payments

Danh sách thanh toán:

- Customer
- Job
- Storage Code
- Payment Code
- Số tiền nếu có
- Trạng thái
- Thời gian tạo
- Thời gian xác nhận
- Phương thức thanh toán

MVP hiện ưu tiên MB Bank theo roadmap.

Admin phải dễ nhận biết:

- Chưa thanh toán
- Đang chờ xác nhận
- PAID
- Thanh toán có vấn đề cần kiểm tra

Không thêm MoMo/Stripe/PayPal nếu roadmap hiện tại chưa đưa chúng trở lại MVP.

---

# 8. Final Files / Delivery

Admin có thể kiểm tra:

- Job đã render xong chưa
- Final file có tồn tại không
- Trạng thái packaging
- Trạng thái unlock
- Trạng thái download/delivery
- Job đã COMPLETED chưa

Tái sử dụng Backblaze B2 flow hiện có.

---

# 9. Alerts / Needs Attention

Admin Overview nên có một khu vực **Needs Attention**.

Ưu tiên các trường hợp:

- Job FAILED
- Worker mất kết nối hoặc Job không cập nhật trong thời gian bất thường nếu hệ thống hiện có dữ liệu này
- Preview thiếu
- Payment bất thường
- Final file thiếu
- Job bị kẹt trạng thái

Chỉ hiển thị cảnh báo dựa trên dữ liệu thực tế hệ thống có; không xây AI monitoring mới cho MVP.

---

# 10. Responsive UI

Admin Dashboard phải:

- Dùng tốt trên desktop
- Dùng được trên điện thoại
- Không cần app APK
- Không tạo mobile app riêng
- Ưu tiên web responsive
- Thao tác quan trọng không bị ẩn hoặc quá khó dùng trên màn hình nhỏ

---

# 11. Security / Access

- Admin Dashboard không được public cho khách hàng bình thường.
- Tái sử dụng authentication/authorization hiện có nếu phù hợp.
- Không hard-code secret vào frontend.
- Không hiển thị secret/token/password.
- Không làm suy yếu security hiện có chỉ để Admin thao tác thuận tiện.

---

# 12. Không làm trong phần này

Không triển khai trong Admin Dashboard MVP:

- Net Cafe Dashboard
- Worker Portal dành cho chủ quán net
- Marketplace
- Multi-region management UI
- Enterprise analytics
- CRM marketing automation phức tạp
- Đọc Gmail của khách
- Mobile APK
- Hệ thống kế toán đầy đủ
- Các payment provider ngoài roadmap hiện hành

---

# 13. Quan hệ với LOOP

Claude phải:

1. Đọc tài liệu này như **spec bổ sung**.
2. Không reset LOOP hiện tại.
3. Không dừng blocker/verification real E2E đang có chỉ để xây Admin UI.
4. Không làm lại chức năng đã hoàn thành.
5. Trước khi code, kiểm tra schema/API/component hiện có và tái sử dụng tối đa.
6. Triển khai Admin Dashboard theo từng phần nhỏ khi LOOP đến đúng giai đoạn.
7. Test thay đổi.
8. Cập nhật `CURRENT_STATUS.md` sau khi có tiến triển thực tế.
9. Commit/push theo workflow hiện hành.
10. Không tự chuyển sang làm giao diện quán net.

---

# 14. Definition of Done — Admin Dashboard MVP

Admin Dashboard được xem là đạt MVP khi Owner có thể đăng nhập hợp lệ và từ một giao diện web:

- Xem tổng quan hệ thống
- Xem/tìm khách hàng
- Mở Customer Detail
- Xem/tìm Job
- Mở Job Detail
- Theo dõi progress
- Xem preview
- Xem payment status
- Kiểm tra final file/delivery
- Nhìn thấy các Job cần chú ý

Tất cả phải dựa trên backend/database hiện có hoặc API được bổ sung tối thiểu cần thiết, không tạo một hệ thống song song.

---

# 15. Quyết định về Net Cafe Dashboard

**Net Cafe / Worker Dashboard sẽ làm sau MVP.**

Không triển khai trong LOOP MVP hiện tại trừ khi Owner đưa ra quyết định mới rõ ràng.
