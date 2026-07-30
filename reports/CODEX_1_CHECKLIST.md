# CODEX 1 CHECKLIST

## Vai trò

GitHub • Repository • Vercel • Render.com • CI/CD • Build • Documentation

---

# Phase 1 - Audit

- [x] Kiểm tra Repository — 1 repo duy nhất `trankhanhduy1508-maker/cws-portal`, root chứa Portal (Vite+React), `backend/` chứa NestJS. Nhiều nhánh cũ từ các phiên agent trước (`agent-1-*`, `agent-2-*`, `agent-3-*`, `codex/3-business-workflow-cleanup`, `backend/nestjs-implementation`, `claude/cws-zero-manual-operation-wtzbrt`) — CHƯA dọn, chưa rõ cái nào còn giá trị/đã merge hay bỏ dở (xem Pending).
- [x] Kiểm tra CI/CD — `.github/workflows/ci.yml` (build+test backend, build+lint frontend) đã viết và commit trên nhánh `codex/ci-workflow`, nhưng nhánh này CHƯA merge vào `main` — nghĩa là CI chưa thực sự chạy trên PR/push vào main cho tới khi merge.
- [x] Kiểm tra Build — xác minh thật (không chỉ tin log cũ): `cd backend && npm run build` (nest build) PASS; `npm run lint` (oxlint) + `npm run build` (vite build) ở root PASS; `cd backend && npm test` (jest) — ban đầu 9/9, sau khi thêm test cho fix thanh toán (audit 2026-07-30) hiện là 20/20 PASS. Chạy lại nhiều lần trong suốt phiên để xác nhận sau mỗi thay đổi, không dùng kết quả cũ.
- [x] Kiểm tra Documentation — `backend/API_DOCUMENTATION.md`, `backend/CHANGELOG.md`, `backend/BACKEND_SETUP.md` đều bị lỗi thời (mô tả trạng thái TRƯỚC pivot Supabase Auth/RLS/VietQR/AdminKeyGuard/request-changes) — đã cập nhật lại toàn bộ 3 file cho khớp code thật (xem Completed).
- [ ] Kiểm tra Vercel — KHÔNG có quyền truy cập Dashboard Vercel trong môi trường này, chỉ audit được qua doc (`BACKEND_SETUP.md` mục 5: Portal đọc `VITE_CWS_API_BASE_URL`/`VITE_CWS_WS_BASE_URL` từ env Vercel) — CLOUD_VERIFICATION_REQUIRED.
- [ ] Kiểm tra Render.com — KHÔNG có quyền truy cập Dashboard Render trong môi trường này — CLOUD_VERIFICATION_REQUIRED, cần người dùng xác nhận Backend đã deploy + env vars đã điền đủ theo `.env.example`.

---

# Completed

- Chạy lại thật `nest build`, `jest`, `oxlint`, `vite build` để xác nhận build/test còn PASS sau các thay đổi mới nhất của Codex 2/3 (request-changes, docs) — không tin log cũ.
- Cập nhật `backend/BACKEND_SETUP.md`: mục 3 (migration 001→007 + hướng dẫn bật Facebook Provider qua Supabase Dashboard thay vì code Backend riêng), mục 6 (Giới hạn thật) sửa lại các thông tin đã lỗi thời (VietQR đã có ảnh thật, Facebook Login dùng Supabase Auth, thêm route Admin cần `x-admin-key`, thêm `request-changes`).
- Cập nhật `backend/API_DOCUMENTATION.md` + `backend/CHANGELOG.md` (xem chi tiết ở CODEX_3_CHECKLIST.md — làm chung 1 lượt vì cùng phạm vi Documentation).
- Audit toàn diện lần cuối (2026-07-30): tạo `docs/MVP_GAP_REPORT.md` (DONE/PARTIAL/BLOCKED đối chiếu 3 tài liệu gốc). Phát hiện + sửa 1 mismatch nghiêm trọng (thứ tự thanh toán vs render — xem CODEX_3_CHECKLIST.md), cập nhật `backend/API_DOCUMENTATION.md`/`backend/BACKEND_SETUP.md`/`backend/CHANGELOG.md` theo đúng thay đổi đó (migration 008). Build/test/lint chạy lại thật (backend `nest build`+`jest`, frontend `oxlint`+`vite build`) đều PASS sau khi sửa; đã verify boot thật (`node dist/main.js`) để chắc chắn không có lỗi DI ẩn.

---

# Pending

- Dọn nhánh Git cũ: nhiều nhánh remote không rõ trạng thái (đã merge? bỏ dở? còn cần giữ?) — CẦN NGƯỜI DÙNG xác nhận trước khi xoá bất kỳ nhánh nào (xoá nhánh là hành động khó hoàn tác, không tự ý làm).
- Merge `codex/ci-workflow`, `codex/mvp-payment-qr-only`, `codex/storage-review-images` vào `main` — đang chờ người dùng duyệt (đã nêu ở CODEX_3_CHECKLIST.md).
- Xác nhận cấu hình thật trên Vercel (env `VITE_CWS_API_BASE_URL`/`VITE_CWS_WS_BASE_URL`) và Render.com (toàn bộ biến trong `backend/.env.example`, đặc biệt `ADMIN_API_KEY`/`MB_BANK_ACCOUNT_NUMBER` không được để trống ở production) — CLOUD_VERIFICATION_REQUIRED, không có Dashboard access.

---

# Risks

- Nhiều nhánh PR song song (`codex/ci-workflow`, `codex/mvp-payment-qr-only`, `codex/storage-review-images`) đều dựa trên `main` cũ — khi merge cần kiểm tra kỹ xung đột thứ tự (migration số, CHANGELOG) vì cả 3 Codex đều từng sửa các file chung (`CHANGELOG.md`, `API_DOCUMENTATION.md`).

---

# Blockers

- Không có quyền truy cập Dashboard Vercel/Render.com trong môi trường này để xác minh cấu hình deploy thật.

---

# Next Task

Toàn bộ phần Documentation/Build tự làm được không cần Dashboard access đã xong. Còn lại phụ thuộc người dùng:
1. Xác nhận Vercel/Render đã cấu hình đủ biến môi trường thật.
2. Quyết định merge 3 nhánh PR đang chờ vào `main`.
3. Xác nhận có cần dọn các nhánh cũ (agent-1/2/3-*, backend/nestjs-implementation, claude/cws-zero-manual-operation-wtzbrt) hay giữ nguyên.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

```
tiếp
```

→ tiếp tục mục Pending đầu tiên (nếu không cần thêm quyền truy cập); nếu cả 3 mục Pending đều cần người dùng thao tác, báo lại đúng như trên, không tự ý xoá nhánh/merge PR.
