# CWS Admin Portal — MFA/TOTP Implementation (2026-08-02)

Owner yêu cầu: Admin Portal bắt buộc authentication → admin role
authorization → MFA/TOTP (app chuẩn Google/Microsoft Authenticator) mới
truy cập được, enforce ở BACKEND (không chỉ khoá frontend route),
KHÔNG hardcode credential/TOTP secret, KHÔNG tạo bypass. Ưu tiên MFA
chính thức của auth provider hiện tại (Supabase).

---

## 1. Audit trước khi implement (không viết lại cái đã có)

Xác nhận qua code thật (không giả định):
- **RBAC thật đã tồn tại từ trước** (migration 013 `staff_roles`,
  `backend/src/common/guards/role.guard.ts`) — kiểm tra role ở tầng
  Backend, KHÔNG chỉ ẩn nút Frontend. Đây đúng là điều Owner yêu cầu,
  chỉ thiếu MFA.
- **Frontend (`AdminScreen.jsx`) lại đang dùng CƠ CHẾ CŨ HƠN** —
  `x-admin-key` (shared secret tĩnh), KHÔNG dùng RBAC thật đã có sẵn ở
  Backend. Đây là gap thật cần đóng.
- Nội dung Dashboard (danh sách khách hàng/Job/preview/file cuối/tìm
  kiếm) đã đầy đủ — không cần viết lại, chỉ cần sửa lớp xác thực.

## 2. Thiết kế — ưu tiên MFA chính thức của provider

`[VERIFIED]` (developer.supabase.com, tra cứu trực tiếp 2026-08-02):
"TOTP MFA API is free to use and is enabled on all Supabase projects by
default." Không cần bật thêm gì trên Dashboard, không cần thư viện TOTP
riêng, không tự lưu secret nào.

**Vì sao KHÔNG tự viết TOTP** (đã cân nhắc rồi loại bỏ): ban đầu đã cài
`otplib` + định thiết kế tự lưu `totp_secret` trong `staff_roles` — sau
khi đọc kỹ hướng dẫn Owner ("Ưu tiên MFA chính thức của auth provider
hiện tại"), đã HUỶ hướng đó (gỡ dependency, xoá migration nháp), chuyển
hẳn sang dùng `supabase.auth.mfa.*` — Supabase tự quản lý secret ở
phía họ, CWS không bao giờ cầm/lưu secret nào cả, giảm rủi ro rò rỉ so
với tự triển khai.

**Enforce phía Backend**: đọc claim `aal` (Authenticator Assurance
Level) trực tiếp từ access token — pattern CHÍNH THỨC của Supabase
("Checking AAL Server-Side": parse JWT, đọc `aal`, so sánh giá trị).
`aal2` = đã hoàn tất MFA trong phiên đăng nhập; thiếu claim hoặc `aal1`
= chưa MFA.

## 3. Thay đổi code

### Backend
- `backend/src/common/guards/jwt-claims.util.ts` (mới) — decode claim
  `aal` từ payload JWT (an toàn vì gọi SAU KHI `client.auth.getUser()`
  đã xác thực chữ ký token).
- `backend/src/common/guards/role.guard.ts` — **bỏ hoàn toàn nhánh
  `x-admin-key`** (đúng yêu cầu "Không tạo bypass"), thêm bắt buộc
  `aal === 'aal2'` sau khi xác nhận role.
- `backend/src/common/guards/staff-auth.util.ts` (mới) — hàm dùng
  chung `isAuthenticatedMfaAdmin()`, cho phép `JobsController` (3 route
  legacy preview/logs/download, VỐN ĐÃ chấp nhận `x-admin-key` từ
  trước khi có yêu cầu MFA — KHÔNG phải bypass mới) chấp nhận THÊM
  Bearer token thật đã MFA, ngoài `x-admin-key` cũ (giữ tương thích
  ngược ở đúng phạm vi route KHÔNG thuộc "Admin Portal chính").
- `backend/src/jobs/jobs.controller.ts` — `isAdminRequest()` chuyển
  `async`, gọi thêm `isAuthenticatedMfaAdmin()`.

### Frontend
- `src/services/staffAuth.js` (mới) — wrapper mỏng quanh
  `supabase.auth.signInWithPassword`/`mfa.enroll`/`mfa.challenge`/
  `mfa.verify`/`mfa.listFactors`/`mfa.getAuthenticatorAssuranceLevel`.
- `src/components/StaffMfaLogin.jsx` (mới) — màn hình đăng nhập: nhập
  email/password → tự động ENROLL (hiện QR Supabase tự sinh, không cần
  thư viện QR riêng) nếu tài khoản CHƯA có factor, hoặc CHALLENGE (nhập
  mã 6 số) nếu đã có — không có đường nào bỏ qua bước MFA.
- `src/pages/AdminScreen.jsx` — thay gate "nhập Admin API Key" bằng
  `<StaffMfaLogin>`, thêm nút Đăng xuất.
- `src/services/adminApi.js` — mọi request đổi từ header `x-admin-key`
  sang `Authorization: Bearer <access token>`; link tải trực tiếp
  (`<a href>`, không set được header) dùng query `?staffToken=`.

## 4. Test — 6 kịch bản bắt buộc, TẤT CẢ PASS

`backend/src/common/guards/role.guard.spec.ts` (rewrite hoàn toàn):

| # | Kịch bản | Kết quả |
|---|---|---|
| 1 | anonymous (không Bearer) | DENY — PASS |
| — | x-admin-key (bất kỳ giá trị) trên RoleGuard | DENY — PASS (xác nhận đã bỏ bypass) |
| 2 | customer authenticated (Bearer hợp lệ, không có `staff_roles`) | DENY — PASS |
| 3 | admin CHƯA hoàn tất MFA (aal1) | DENY — PASS |
| 3b | token không có claim `aal` | DENY — PASS |
| 4 | admin + MFA hợp lệ (aal2) | PASS — PASS |
| 5 | gọi trực tiếp Admin API, Bearer hợp lệ nhưng thiếu MFA assurance | DENY — PASS |
| 6 | cross-role: host gọi route yêu cầu admin (dù đã MFA) | DENY — PASS |

Cộng `jwt-claims.util.spec.ts` (5 test) + `staff-auth.util.spec.ts` (6
test, riêng cho 3 route legacy preview/logs/download).

**Tổng: 114/114 backend test PASS, build sạch.** Frontend: `vite build`
sạch (513KB bundle, cảnh báo chunk-size không liên quan), `vitest run`
5/5 PASS (không có test riêng cho `StaffMfaLogin`/`staffAuth.js` —
JS thuần không type-check, đã build thành công, KHÔNG unit test được
sâu hơn vì phụ thuộc `supabase.auth.mfa.*` thật — xem mục 5).

## 5. HUMAN_VERIFICATION_PENDING — điều duy nhất còn thiếu

Chưa có tài khoản Admin/Host THẬT nào tồn tại (`staff_roles` production
hiện rỗng — Owner chưa tạo qua Supabase Dashboard theo hướng dẫn có sẵn
trong migration 013). Do đó **chưa thể tự verify bằng 1 lần đăng nhập
thật + quét QR thật bằng Google/Microsoft Authenticator** — đây là bước
DUY NHẤT cần Owner, mọi phần độc lập khác (code, test, build, docs) đã
hoàn tất.

**Checklist Owner cần làm (đúng 1 lần, không lặp lại mỗi task):**
1. Supabase Dashboard → Authentication → Users → Add user → tạo 1 tài
   khoản email/password cho chính Owner (hoặc nhân sự Admin).
2. Supabase SQL Editor → chạy:
   `insert into public.staff_roles (user_id, role) values ('<uuid-vừa-tạo>', 'admin');`
3. Mở `/#admin` trên Portal → đăng nhập email/password vừa tạo →
   màn hình sẽ tự hiện QR code → quét bằng Google/Microsoft
   Authenticator → nhập mã 6 số → xác nhận vào được Dashboard.
4. Lần đăng nhập SAU sẽ chỉ hỏi mã 6 số (không hiện lại QR).

Không cần gửi lại bất kỳ thông tin nào cho AI — toàn bộ secret nằm
trong Supabase (phía Owner tự quản lý), CWS không lưu/biết secret này.
