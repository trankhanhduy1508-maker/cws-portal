# CWS production real-path audit — 2026-08-07

## Kết luận

Production hiện chưa được phép coi là E2E thật. Bundle đang phục vụ trên
`https://cws-portal.vercel.app/` là deployment cũ và vẫn chứa nhánh mock của
frontend. Source đã được sửa để production fail-closed và gọi backend thật;
deployment mới chưa thể xác minh vì Vercel free deployment quota.

## Bằng chứng runtime đọc-only

- `GET https://cws-portal.vercel.app/` → HTTP 200.
- `GET https://cws-portal.onrender.com/health` → HTTP 200, backend status
  `ok`.
- `GET /jobs` không có Bearer customer session → HTTP 401.
- `GET /fleet/workers` không có staff AAL2 session → HTTP 401.
- Vercel project/domain/repository/production branch đã được đối chiếu trong
  deployment evidence hiện có: project `cws-portal`, GitHub `main`.
- Vercel deployment API trước đó trả `402 payment_required`, code
  `api-deployments-free-per-day`, remaining `0`, reset
  `2026-08-08T03:23:10.675Z`.

## Root cause trong source

- `.env.production` không có `VITE_CWS_API_BASE_URL` hoặc
  `VITE_CWS_WS_BASE_URL`, khiến `IS_BACKEND_CONFIGURED` false trong bundle.
- `src/services/RenderService.js` khi đó dùng `mockBackend.js` cho upload,
  estimate, create job, progress, preview, payment và completion.
- Worker production runtime chưa có evidence: các adapter/runner hiện có
  trong `worker/` là staging hoặc side-effect-free test components; không tạo
  job production giả để bù vào khoảng trống này.

## Thay đổi đã thực hiện

- Thêm backend production URL và WebSocket URL vào `.env.production`.
- Xóa mọi fallback mock khỏi các hàm production của `RenderService`:
  upload, Drive, estimate, payment lookup, create, realtime, cancel, get/list,
  preview, approve, request-changes và download.
- Khi backend chưa cấu hình, service fail rõ ràng thay vì tạo dữ liệu giả.
- Auth mock chỉ còn dynamic import dưới điều kiện dev-only explicit
  `VITE_ENABLE_MOCK_AUTH=true`; không được gọi trong production execution path.
- Preview/download không còn dùng input file làm output fallback; nếu backend
  trả placeholder thì chỉ hiển thị trạng thái chưa sẵn sàng.

## Verification

- Frontend: `npm test` → 5 files, 11 tests PASS.
- Frontend: `npm run lint` PASS.
- Frontend: `npm run build` PASS; mock chỉ được tách thành lazy chunk cho dev
  flag, không còn static import trong production service path.
- Backend: `npm test -- --runInBand` → 33 suites, 174 tests PASS.
- Backend: `npm run build` PASS.
- Worker Python compileall PASS; RPC auth test chạy với module path đúng → 4
  tests PASS.

## Chưa được xác minh

- Vercel đã phục vụ bundle mới: NEEDS_VERIFICATION vì quota.
- Authenticated customer upload/job thật.
- Supabase queue claim, physical Windows Worker/Blender, B2 input/output,
  progress, preview, payment webhook và final download.

## Blocker chính xác

Không có quyền bypass quota Vercel. Deployment mới chỉ nên thực hiện sau
`2026-08-08T03:23:10.675Z`; không retry liên tục. Sau khi deployment READY,
phải kiểm tra bundle mới và mới chạy một job production thật với customer
session + physical Worker.
