# CWS Portal - Node.js build + test THẬT (backend + frontend) - 2026-08-03

## Bối cảnh

`CURRENT_STATUS.md` (mục "Current Task", nhiều phiên trước) ghi rõ:
môi trường agent "không có Node.js/npm/Python" nên không thể
`build`/`test`/`lint` bất kỳ thay đổi TypeScript (backend NestJS/
frontend Vite) nào - đây là lý do các thay đổi TypeScript mới bị hoãn
lại nhiều lần dù code đã sẵn sàng về logic.

Phiên này đã tự động hoá được Python/Blender cho Worker
(`reports/worker/`); áp dụng đúng phương pháp đó cho Node.js.

## Version dùng - lấy từ Source of Truth, KHÔNG đoán

Node major version **22** lấy từ `.github/workflows/ci.yml`
(`node-version: 22`, dùng cho cả 2 job `backend` và `frontend`) - đây
là nơi DUY NHẤT trong repo khai báo version Node. Bản PATCH cụ thể
(**22.23.2**, LTS "Jod", phát hành 2026-07-28) lấy trực tiếp từ chỉ
mục chính thức `nodejs.org/dist/index.json` tại thời điểm chạy - tương
đương chính xác cách GitHub Actions `setup-node@v4` resolve
`node-version: 22` thành bản patch mới nhất.

## Script tự động (idempotent)

`reports/dev/setup_node_runtime_test.ps1` - tự đọc major version từ
CI, tự tra bản patch mới nhất thật từ nodejs.org, tải bản portable
(zip chính thức, không chạy installer) vào `C:\CWS_Node_Test` (không
đụng PATH hệ thống, không cài Node global), rồi chạy đúng 4 bước CI
cho backend (`npm ci` → `build` → `test` → `lint`) và 3 bước tương ứng
cho frontend (`npm ci` → `build` → `lint`, bỏ qua `npm test` vì repo
**chưa có file test frontend nào**).

Lưu ý kỹ thuật: dùng `curl.exe` để tải (không dùng
`Invoke-WebRequest`) vì một số URL của nodejs.org phản hồi rất chậm/
treo qua cmdlet đó trong môi trường này dù `curl.exe` tải bình thường
- giống cách `cws_worker.bat` vốn đã dùng `curl` thay vì cmdlet
PowerShell cho mọi lượt tải.

## Xác nhận an toàn: backend test không đụng production

Đã đọc trước `backend/src/**/*.spec.ts` - toàn bộ dùng
`jest.fn()`/mock cho repository, gateway, service (vd
`jobs.service.spec.ts` dòng 23-25: `mockRepository`, `mockGateway`,
`mockPaymentsService` đều là mock). Không có test nào gọi Supabase/B2/
mạng thật - an toàn tuyệt đối để chạy như CI.

## Kết quả - PASS toàn bộ

Evidence: `reports/dev/NODE_BUILD_TEST_EVIDENCE_2026-08-03.json`

| Bước | Kết quả |
|---|---|
| `node --version` | `v22.23.2` ✅ |
| `npm --version` | `10.9.8` |
| Backend `npm ci` | PASS |
| Backend `npm run build` (nest build) | PASS |
| Backend `npm test` (Jest) | **PASS - 16/16 test suite, 117/117 test** |
| Backend `npm run lint` (eslint --fix) | PASS |
| Frontend `npm ci` | PASS |
| Frontend `npm run build` (vite build) | PASS (1 cảnh báo benign: chunk >500kB, không phải lỗi) |
| Frontend `npm run lint` (oxlint) | PASS |
| Frontend `npm test` | SKIPPED - chưa có file test nào trong repo (không phải lỗi) |

## Lưu ý quan trọng: `npm run lint` = `eslint --fix` (backend)

Script `lint` của backend trong `package.json` là
`eslint "..." --fix` - **tự ghi đè file khi có auto-fixable issue**
(giống hệt lệnh CI chạy, chỉ khác là CI chạy trên checkout tạm rồi bỏ
đi, còn máy này là working directory thật nên thay đổi bị giữ lại).
Lần chạy này, `--fix` đã tự format lại (Prettier-style line-wrap, dấu
phẩy cuối, KHÔNG đổi logic) **52 file** trong `backend/src/`. Đã kiểm
tra kỹ (so `git hash-object` từng file với `git rev-parse HEAD:<file>`
- không phải false-positive từ CRLF autocrlf warning) rồi **revert
toàn bộ bằng `git checkout -- backend/`** - không commit, vì việc
reformat hàng loạt không nằm trong phạm vi được yêu cầu (chỉ verify
build/test/lint chạy được). Nếu Owner muốn áp dụng format mới cho cả
repo, đây là việc riêng cần quyết định/review rõ ràng, không nên lẫn
vào 1 lần verify runtime.

## Kết luận

Môi trường agent giờ **CÓ THỂ** tự build/test/lint TypeScript
(backend + frontend) bằng 1 lệnh
(`reports/dev/setup_node_runtime_test.ps1`), gỡ đúng blocker đã ghi
trong `CURRENT_STATUS.md` mục "Current Task". Việc này KHÔNG cài Node
vào máy thật (chỉ portable, thư mục riêng) và KHÔNG sửa
package-lock.json/dependency nào - chỉ chạy đúng 4+3 bước y hệt CI.
