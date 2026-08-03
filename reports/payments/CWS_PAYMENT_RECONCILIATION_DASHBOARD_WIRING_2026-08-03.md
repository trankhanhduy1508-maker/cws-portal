# Payment Reconciliation — wire vào Admin Dashboard (2026-08-03)

## Bối cảnh

`DECISIONS.md` ("Payment reconciliation", 2026-08-03) đã chốt: view
CHỈ ĐỌC `payment_reconciliation_anomalies` (migration
`worker_migrations/015_payment_reconciliation_view.sql`) là nguồn sự
thật duy nhất cho 3 loại bất thường thanh toán/refund, tạm dùng qua
Supabase SQL Editor vì lúc đó chưa có môi trường Node/npm để build an
toàn. Quyết định ghi rõ: "Khi có môi trường build, nên wire thẳng view
này vào Admin Dashboard thay vì viết lại logic."

Sau khi tự động hoá Node.js portable (`reports/dev/setup_node_runtime_test.ps1`,
cùng ngày), thực hiện đúng bước tiếp theo đã chốt sẵn.

## Thay đổi

**Backend** (NestJS, đúng pattern các endpoint Admin read-only khác
như `GET /payments/devices`):
- `PaymentsRepository.listReconciliationAnomalies()` — `select * from
  payment_reconciliation_anomalies order by reference_time desc`,
  KHÔNG viết lại logic phát hiện bất thường (view làm hết).
- `PaymentsService.listReconciliationAnomalies()` — passthrough, đúng
  pattern `getByPaymentCode()`.
- `GET /payments/reconciliation-anomalies` (`PaymentsController`) —
  `@UseGuards(RoleGuard)` không kèm `@Roles(...)` = mặc định
  `['admin']` (xem `role.guard.ts` dòng 71) + bắt buộc MFA (aal2),
  đúng NHƯ MỌI route Admin khác. Khai báo TRƯỚC route `:id` (giống
  `devices`) để không bị route `:id` nuốt mất.
- `PaymentReconciliationAnomaly` type mới trong `payment.types.ts`.

**Frontend** (`AdminScreen.jsx`): 1 bảng mới "Bất thường thanh toán /
refund" — đặt NGAY SAU bảng Job, TRƯỚC "Worker Fleet" (ưu tiên hiển
thị cao hơn vì đây là rủi ro tiền/khách trực tiếp, không phải hạ tầng
Worker). 3 loại bất thường có nhãn tiếng Việt rõ ràng
(`ANOMALY_TYPE_LABEL`). `adminApi.js`/`apiConfig.js` thêm hàm/endpoint
tương ứng, đúng pattern các hàm `adminList*` khác.

## Verify

1. **Read-only trên production thật** (Supabase MCP, an toàn tuyệt đối
   — chỉ SELECT, không sửa gì): `select * from
   payment_reconciliation_anomalies order by reference_time desc limit
   20;` → đúng 1 dòng, khớp finding đã biết trước đó (order
   `00189232-...`, loại `PAID_WITHOUT_PAYMENT_RECORD`, xem
   `CWS_PAID_ORPHAN_ORDER_FINDING_2026-08-03.md`) — xác nhận query
   thật của endpoint mới trả đúng dữ liệu thật, tương thích với type
   mapping ở Backend (`storage_code` có thể `null`, Frontend đã có
   fallback `a.storageCode ?? a.orderId`).
2. **Build + test + lint thật** (Node portable, `setup_node_runtime_test.ps1`)
   — chạy TRƯỚC khi dọn lại diff (xem mục dưới): backend `npm ci` →
   `build` → **117/117 Jest test PASS** → `lint` PASS; frontend `npm
   ci` → `build` → `lint` PASS. Toàn bộ code payment reconciliation đã
   nằm trong lần chạy PASS này.

## Lưu ý quan trọng: dọn lại diff sau khi lint --fix chạy

Backend `npm run lint` = `eslint --fix`, và (như đã ghi nhận ở
`reports/dev/CWS_NODE_BUILD_TEST_2026-08-03.md`) codebase hiện tại có
"drift" định dạng tiềm ẩn so với chính config eslint/prettier của nó —
mỗi lần `--fix` chạy sẽ reformat lại RẤT NHIỀU file (kể cả file không
liên quan gì tới thay đổi đang làm). Đã xác nhận lại lần 2: sau khi
chạy full test ở trên, đối chiếu `git hash-object` với
`git rev-parse HEAD:<file>` cho từng file — chỉ giữ lại đúng 8 file
thuộc phạm vi feature này (4 backend + 3 frontend + 1 file evidence
JSON tự sinh), **revert toàn bộ các file khác** (`git checkout --`),
rồi với 4 file backend đã bị lint reformat toàn bộ nội dung xung quanh
(không chỉ phần mới thêm), **revert về HEAD rồi áp lại CHÍNH XÁC đoạn
code mới thêm** (không phải toàn file) để không lẫn việc reformat
hàng loạt code cũ vào 1 commit feature nhỏ. Đã đối chiếu diff cuối
cùng (`git diff --stat`) chỉ còn đúng phần thêm mới (80 dòng thêm/1
dòng xoá cho 4 file backend, 65 dòng thêm cho 3 file frontend) —
không có dòng code cũ nào bị đổi định dạng.

## Giới hạn của lần verify này (minh bạch)

Sau khi dọn diff (chỉ đổi whitespace/định dạng của code KHÔNG PHẢI của
tôi viết, phần code tôi viết giữ nguyên y hệt, đã copy lại chính xác
từ lần chạy PASS ở mục Verify #2), máy gặp sự cố môi trường: mọi lệnh
gọi `node.exe`/`npm.cmd` mới (kể cả `node --version` đơn giản) bị treo
vô thời hạn — trong khi `cmd.exe`/PowerShell thường vẫn phản hồi tức
thì. Không phải lỗi code (không có process node.exe nào xuất hiện
trong process list dù đã gọi nhiều lần) — nghi ngờ phần mềm bảo mật/
quản lý máy trên máy này (phát hiện tiến trình nền dạng quản lý máy
tiệm net: `BarClientView`, `KzoneWksHelper`, `KzoneGameMenu`) đang
chặn/quét tiến trình `node.exe` mới. Do đó **KHÔNG re-run được
build/test/lint sau bước dọn diff** — độ tin cậy dựa trên: (a) lần
chạy PASS ở mục Verify #2 đã bao gồm đúng logic này (chỉ khác định
dạng whitespace của code không liên quan), (b) đối chiếu diff xác nhận
phần code tôi viết là copy chính xác byte-for-byte giữa 2 lần, TypeScript/
JS không có ngữ nghĩa nào phụ thuộc whitespace theo cách ảnh hưởng
compile/test ở đây. Owner/lần chạy sau nên re-run
`setup_node_runtime_test.ps1` khi máy hết nghẽn để có bằng chứng build
PASS mới nhất, dù rủi ro thực tế được đánh giá rất thấp.
