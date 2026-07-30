# CODEX 2 CHECKLIST

## Vai trò

Supabase • Database • Backblaze B2

---

# Phase 1 - Audit

- [ ] Kiểm tra Supabase hiện tại
- [ ] So sánh Database với CWS_DATABASE_SCHEMA.md
- [ ] Kiểm tra Facebook Auth
- [ ] Kiểm tra RLS
- [ ] Kiểm tra Trigger
- [ ] Kiểm tra Migration
- [ ] Kiểm tra Enum
- [ ] Kiểm tra Index
- [ ] Kiểm tra Foreign Key

---

# Phase 2 - Storage

- [ ] Kiểm tra Bucket B2
- [ ] Kiểm tra cấu trúc source/
- [ ] Kiểm tra review/
- [ ] Kiểm tra final/
- [ ] Kiểm tra logs/
- [ ] Kiểm tra Signed URL
- [ ] Kiểm tra Lifecycle
- [ ] Kiểm tra quyền truy cập

---

# Phase 3 - Cleanup

- [ ] Xóa bảng không thuộc MVP
- [ ] Xóa Trigger cũ
- [ ] Xóa Function cũ
- [ ] Xóa Policy cũ
- [ ] Chuẩn hóa Database Schema

---

# Phase 4 - Test

- [ ] Test Customer Ownership
- [ ] Test Job Ownership
- [ ] Test Review Ownership
- [ ] Test Download Ownership
- [ ] Test Payment Protection

---

# Completed

- Backend module storage_objects/review_images (StorageService: recordPaths/getPaths/publishReviewImages, enforce 3-5 ảnh preview theo MVP). Xem PR #7. Bảng đã được tạo qua migration 005 (PR #6, đã apply lên Supabase thật).

---

# In Progress

-

---

# Pending

- Wire StorageService vào Worker render pipeline thật (hiện chưa có nơi nào gọi publishReviewImages() với path ảnh thật).
- Kiểm tra Bucket B2 thật (cấu trúc source/review/final/logs, signed URL, lifecycle) — CLOUD_VERIFICATION_REQUIRED, chưa có credential B2 để tự kiểm tra trực tiếp bucket.

---

# Risks

-

---

# Blockers

Không có

---

# Next Task

Đọc mục chưa hoàn thành đầu tiên và tiếp tục.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
