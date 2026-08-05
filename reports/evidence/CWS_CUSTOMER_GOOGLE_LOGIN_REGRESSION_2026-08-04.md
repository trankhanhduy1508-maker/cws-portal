# CWS Customer Google Login Regression Audit — 2026-08-04

## Production verification — 2026-08-05

- PR #17 đã merge thành commit `9d2d223`.
- Vercel production deployment `dpl_CLb4MZErFT3rbNUspiAEUQuNqvRa` READY.
- Alias `https://cws-portal.vercel.app` đang trỏ deployment này; Vercel metadata xác nhận ref `main`, commit `9d2d223`.
- Production bundle có Supabase project URL và `signInWithOAuth`; không phát hiện service-role/Google secret.
- HTTP OAuth test thật: Supabase `/auth/v1/authorize?provider=google&redirect_to=https://cws-portal.vercel.app/` trả `302 Found` tới `accounts.google.com`, giữ redirect production.
- Chưa xác minh callback/session restore bằng tài khoản Google tương tác trong môi trường Codex.

## Kết luận

Đây là regression triển khai/cấu hình production, không phải regression trong `signInWithOAuth` do Customer UI redesign.

- Customer UI redesign: commit [95b1382](https://github.com/trankhanhduy1508-maker/cws-portal/commit/95b138222660e2f0b82b8c08f5822870aef6f3d8).
- Commit này chỉ gộp Landing/Upload, giữ `useAuth`, `AuthService.startGoogleLogin()`, Supabase session restore và `signInWithOAuth({ provider: 'google' })`.
- Điều kiện tạo thông báo lỗi nằm ở `src/services/AuthService.js`, chỉ chạy khi `IS_SUPABASE_CONFIGURED` false.
- So sánh trước redesign tại commit `00d6fc7` cho thấy Supabase client và điều kiện cấu hình giống nhau; redesign không đổi tên env hoặc OAuth helper.
- Production domain đang phục vụ deployment cũ theo Vercel: commit `8852181`, trong khi auth build fix đã có ở commit [730e945](https://github.com/trankhanhduy1508-maker/cws-portal/commit/730e945c2460784ceb86a17ec6d4890ced6d3a8a).
- Bundle production thực tế `index-CYpS9669.js` có thông báo lỗi nhưng không chứa Supabase project URL; đó là bằng chứng build production không nhận public Supabase configuration.
- Local production build từ source hiện tại có Supabase URL và có `signInWithOAuth`; không chứa credential server-side. Chuỗi `sb_secret_` chỉ xuất hiện trong mã kiểm tra định dạng của thư viện Supabase, không phải secret CWS.

## Đã sửa

1. Giữ nguyên UI redesign và OAuth flow.
2. Thêm fallback tương thích cho biến public cũ `VITE_SUPABASE_ANON_KEY` sau `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Không chấp nhận hoặc expose service-role/secret key.
4. Thêm test xác nhận fallback public key hoạt động.

## Verification

- Frontend tests: 6/6 PASS.
- Lint: PASS.
- Vite production build: PASS.
- OAuth provider/redirect path đã được xác minh trước đó bằng endpoint Supabase trả HTTP 302 tới Google với production origin.
- Runtime production sau commit sửa chưa thể PASS cho tới khi một deployment chứa commit `730e945` và/hoặc patch này được phục vụ trên `cws-portal.vercel.app`.

## OWNER TODO / HUMAN BLOCKER

Vercel project `cws-portal` hiện còn production deployment cũ. Cần cho phép/retry deployment production sau khi Vercel build-rate-limit hết hoặc chạy redeploy từ commit mới nhất. Không cần gửi secret vào chat; chỉ cần bảo đảm production build có public `VITE_SUPABASE_URL` và một trong hai public key variable.

Sau deploy, test ngắn:

1. Mở `https://cws-portal.vercel.app/`.
2. Bấm `Đăng nhập với Google`.
3. Xác nhận chuyển sang Google, quay lại đúng Customer UI.
4. Refresh vẫn giữ session.

Chưa tuyên bố production OAuth E2E PASS khi chưa có runtime deployment mới và tài khoản Google thật.
