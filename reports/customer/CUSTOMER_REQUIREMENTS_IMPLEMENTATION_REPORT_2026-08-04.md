# CWS Customer Requirements Implementation Report — 2026-08-04

## Scope

Đã đọc trực tiếp toàn bộ `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`, sau đó đối chiếu với `DECISIONS.md`, `CURRENT_STATUS.md`, roadmap chính/Worker, workflow chính thức và evidence hiện có. Các thay đổi dưới đây chỉ nằm trong MVP và không chạm production data, credential, B2 object, payment LIVE hoặc secret.

## Implemented this round

- Payment UI công khai công thức giá cuối: runtime Worker thực tế (gồm startup) × 6.000đ/giờ × hệ số 2; không dùng estimate heuristic làm số tiền thanh toán.
- Profile UI cảnh báo queue từ 30 phút và cho khách quay lại đổi profile/hủy trước khi bắt đầu render.
- Download UI chủ động gọi lại route signed-download mỗi lần bấm, hiển thị TTL 5 phút và đếm số lần yêu cầu link trong phiên; backend tiếp tục log từng request.
- Worker `render_single_frame()` có timeout 3.600 giây/frame và trả lỗi `persistent` để vòng xử lý phân loại/retry/requeue.
- File upload được preflight header `BLENDER` ngay khi chọn, chặn submit trong lúc kiểm tra và báo lỗi đổi đuôi/hỏng header trước khi upload.

## Verification evidence

- `npm run build` PASS.
- `npm run lint` PASS.
- `npm test` PASS: 1 file, 5 tests.
- Preflight `.blend` chạy bằng browser `File.slice()`/`TextDecoder`; chưa coi đây là kiểm tra mở scene đầy đủ.
- Python/Fleet runtime chưa có trên máy audit; Worker timeout/cleanup vẫn là `CODED_NOT_VERIFIED`, không tuyên bố Full E2E.

## Final classification

Requirement matrix đầy đủ C1–C10 nằm tại [CWS_CUSTOMER_REQUIREMENTS_COMPLETENESS_AUDIT_2026-08-03.md](./CWS_CUSTOMER_REQUIREMENTS_COMPLETENESS_AUDIT_2026-08-03.md). Những mục còn `MISSING`/`PARTIAL` nhưng cần quyết định hoặc vận hành thật không bị giả lập: price cap, retention/deletion, resumable upload protocol, link verification ngoài Google, edit timeline/SLA, support/ticket channel, browser download-success signal và Fleet/B2/payment live verification.

Checklist không bỏ sót: 100 dòng `C1.1`–`C10.10` trong matrix; mỗi dòng có source, implementation, evidence, status, gap và priority. Các `PASS` không làm lại; `POST_MVP` theo workflow/roadmap không triển khai; `HUMAN_BLOCKER` chuyển Owner TODO.

CUSTOMER REQUIREMENTS TOTAL: 100  
PASS: 13  
CODED_NOT_VERIFIED: 6  
PARTIAL: 7  
MISSING: 13  
HUMAN_BLOCKER: 5  
POST_MVP: 56

### MORNING OWNER TODO

1. Chốt và phê duyệt price cap, retention/deletion policy, legal/ToS/privacy, edit SLA và support channel thật.
2. Trên Fleet: cấu hình/test credential B2 scoped mới theo nguyên tắc CREATE/TEST NEW → VERIFY → HUMAN APPROVAL → SWITCH/REVOKE OLD; không revoke key cũ trong phiên này.
3. Chạy customer E2E thật: Google login → upload/link → Worker claim/render → preview → QR → SePay webhook → PAID → signed download.
4. Xác nhận runtime Worker per-frame timeout/cleanup và retry trên máy thật.
