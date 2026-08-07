# CWS production real-path audit — 2026-08-07

## Kết luận

Production hiện đã phục vụ bundle mới cho real frontend path, nhưng chưa được
coi là E2E thật: physical Worker, B2 và payment chưa chạy. Source đã được sửa
để production fail-closed và gọi backend thật.

## Bằng chứng runtime đọc-only

- `GET https://cws-portal.vercel.app/` → HTTP 200.
- `GET https://cws-portal.onrender.com/health` → HTTP 200, backend status
  `ok`.
- `GET /jobs` không có Bearer customer session → HTTP 401.
- `GET /fleet/workers` không có staff AAL2 session → HTTP 401.
- Vercel project/domain/repository/production branch đã được đối chiếu trong
  deployment evidence hiện có: project `cws-portal`, GitHub `main`.
- Git-integrated deployment `dpl_4mCukKvsmUjE8miN899UNcvRjtVZ` → `READY`,
  target `production`, alias `cws-portal.vercel.app`, commit
  `ebc7e017d7c3250b3a0680d8e8e15bb5fe56d818`.
- Vercel HTML serves `assets/index-bm49gBRE.js`; bundle includes the canonical
  Render URL and does not contain the old fake job/progress functions. The only
  `mockBackend` reference is a lazy dev-only import guarded by the explicit
  development mock flag.

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

- Vercel production bundle mới: runtime read-only VERIFIED as above.
- Authenticated customer upload/job thật.
- Supabase queue claim, physical Windows Worker/Blender, B2 input/output,
  progress, preview, payment webhook và final download.

## Blocker chính xác

Không còn blocker deployment. Bước tiếp theo cần một customer session đã
đăng nhập và physical Worker production có credential hợp lệ để chạy một job
thật; không dùng mock để thay thế.
