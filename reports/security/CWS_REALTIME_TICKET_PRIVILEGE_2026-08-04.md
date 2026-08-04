# Realtime Ticket Privilege Follow-up — 2026-08-04

Supabase Advisor phát hiện consume_realtime_access_ticket vẫn có explicit EXECUTE grant cho anon/authenticated; revoke PUBLIC không loại bỏ explicit grants. Đã thêm migration 022 và apply thành công.

Xác minh trực tiếp:
- anon execute: false
- authenticated execute: false
- service_role execute: true

Đã cập nhật migration 020 trong source để explicit revoke luôn được giữ trong lần triển khai mới. CI cần chạy trên head mới.
