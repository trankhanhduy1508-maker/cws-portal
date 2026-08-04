# Edit Request State Evidence — 2026-08-04

## Scope

Đối chiếu yêu cầu V2 về review/edit request với code trên branch
`agent/roadmap-mvp-v2`.

## Implemented

- Migration `017_create_edit_requests.sql` tạo bảng trạng thái với các trạng thái:
  `REQUESTED`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `DECLINED`.
- Mỗi request gắn `job_id` và `requested_by`; ghi `assigned_to`,
  `expected_response_at`, `created_at`, `updated_at`.
- RLS bật trên bảng và policy customer chỉ cho SELECT khi
  `auth.uid() = requested_by`.
- `JobsService.requestChanges()` kiểm tra ownership trước, yêu cầu
  customer identity và lưu request; không tự ý đổi status/render/payment.
- Customer đọc request qua `GET /jobs/:id/edit-requests`, đi qua
  ownership check.
- Admin cập nhật qua `PATCH /staff/edit-requests/:id` và xem queue qua
  `GET /staff/edit-requests`; cả hai route đều `RoleGuard` +
  `@Roles('admin')`, RoleGuard bắt buộc MFA `aal2`.
- ReviewScreen hiển thị trạng thái mới nhất; mock mode không bịa trạng thái
  backend.

## Tests/contracts

`backend/src/security/p0-boundary.contract.spec.ts` kiểm tra source contract
cho ownership, RLS, Admin MFA/RBAC và worker-log boundary. Existing
`jobs.service.spec.ts` tiếp tục bao phủ Customer A → A allow và A → B deny.

## Limits

Chưa chạy Jest/build/runtime trong agent session vì không có checkout/toolchain
local. Chưa xác minh bằng hai tài khoản Supabase thật hoặc Admin MFA thật.
Không thay đổi production data/secret.
