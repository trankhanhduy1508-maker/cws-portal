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
- **Merge vào main (2026-07-30, theo yêu cầu người dùng)**: kiểm tra quan hệ ancestry bằng `git merge-base --is-ancestor` trước khi merge — phát hiện `codex/mvp-payment-qr-only` ĐÃ LÀ ancestor của `codex/storage-review-images` (không cần merge riêng), `main` cũng đã là ancestor của `codex/storage-review-images` (fast-forward an toàn, không có commit nào trên `main` bị mất). Thực hiện: `git merge --ff-only origin/codex/storage-review-images` rồi `git merge --no-ff origin/codex/ci-workflow` (chỉ thêm 1 file `.github/workflows/ci.yml`, không xung đột). Build/test/lint chạy lại thật trên `main` sau merge — PASS toàn bộ. Đã push `main` lên GitHub (`a7ffb80..21ac183`).

---

# Pending

- Dọn nhánh Git cũ — đã audit bằng `git merge-base --is-ancestor` với `main` mới (2026-07-30). 7 nhánh nằm trọn trong `main` đã ĐƯỢC NGƯỜI DÙNG XÁC NHẬN XOÁ và đã xoá xong (remote + local): `agent-3-operations-p2`, `agent-3-secure-output-p2`, `backend/nestjs-implementation`, `codex/3-business-workflow-cleanup`, `codex/ci-workflow`, `codex/mvp-payment-qr-only`, `codex/storage-review-images`.
  - **Còn lại — CÓ commit riêng chưa nằm trong `main`** — đã xem qua nội dung từng nhánh (2026-07-30), tóm tắt để bạn quyết định:
    - **Chỉ thêm 1 file report/docs, KHÔNG có code thật** — an toàn bỏ qua/xoá: `agent-1-planner` (report `CODEX_APPROVAL_CONFIGURATION_REPORT.md`), `agent-2-payment-p2` (report `P2_CODEX_2_PAYMENT_REPORT.md`), `agent-2-render-pipeline` (report), `agent-3-review` (report `implementation review`).
    - **Chuỗi nhánh lồng nhau, commit message lặp lại y hệt nhiều lần** ("fix(p2): secure payment authorization" x7, "feat(p2): implement minimum operations console" x17) — dấu hiệu của 1 phiên multi-agent tự động trước đây, chưa rõ chất lượng: `agent-1-payment-p2` (8 commit) ⊂ `agent-2-secure-output-p2` (10 commit) ⊂ `agent-3-operations-console-p2` (27 commit, diff **140 file, +4211/-7127** so với `main` — XOÁ RÒNG hơn 7000 dòng, rất có thể là 1 kiến trúc/prototype khác hẳn, RỦI RO CAO nếu merge mà không review kỹ). `agent-2-implementation` (5 commit, message "implement assigned task" lặp lại, độc lập với chuỗi trên) cùng dạng.
    - **`claude/cws-zero-manual-operation-wtzbrt` (1 commit, 2026-07-27, phiên Claude TRƯỚC)** — ĐÁNG CHÚ Ý NHẤT: độc lập đưa ra ĐÚNG kiến trúc "pay-after-render" giống hệt fix quan trọng nhất mà tôi vừa làm trong phiên này (xác nhận thêm rằng đây đúng là hướng đi đúng theo roadmap) — NHƯNG có 1 lỗ hổng bảo mật: `payAndUnlock()` gọi thẳng `paymentsService.confirm()` do chính request của khách kích hoạt, TRÁI với nguyên tắc "Frontend không được tự đặt Payment = PAID" (đúng lỗ hổng mà migration/fix trong nhánh chính đã chặn — `confirm()` giờ luôn throw, chỉ webhook mới set PAID). Nhánh này cũng có vài ý tưởng có giá trị CHƯA làm trong `main`: tính giá THẬT theo runtime Worker sau khi render xong (`PricingService`), tự động dựng video MP4 qua FFmpeg (`VideoAssemblyService`) thay vì chỉ nén .zip. KHÔNG nên merge thẳng nhánh này (dính lỗ hổng bảo mật), nhưng có thể tham khảo 2 ý tưởng trên cho việc sau nếu bạn muốn.
- Xác nhận cấu hình thật trên Vercel (env `VITE_CWS_API_BASE_URL`/`VITE_CWS_WS_BASE_URL`) và Render.com (toàn bộ biến trong `backend/.env.example`, đặc biệt `ADMIN_API_KEY`/`MB_BANK_ACCOUNT_NUMBER` không được để trống ở production) — CLOUD_VERIFICATION_REQUIRED, không có Dashboard access.

---

# Risks

- (ĐÃ XONG — xem Completed) 3 nhánh PR song song đã merge vào `main` an toàn: `codex/mvp-payment-qr-only` hoá ra đã là ancestor của `codex/storage-review-images` (fast-forward, không xung đột), `codex/ci-workflow` chỉ thêm 1 file `.github/workflows/ci.yml` (merge 3-way sạch, không đụng file nào khác).

---

# Blockers

- Không có quyền truy cập Dashboard Vercel/Render.com trong môi trường này để xác minh cấu hình deploy thật.

---

# Next Task

Đã merge cả 3 nhánh vào `main` theo yêu cầu người dùng (2026-07-30) —
xem Completed. Build/test/lint đã chạy lại thật trên `main` sau merge:
tất cả PASS (backend `nest build` + `jest` 20/20, frontend `oxlint` +
`vite build`). `main` hiện là bản MVP đầy đủ nhất, đã lên GitHub
(`a7ffb80..21ac183`).

Còn lại phụ thuộc người dùng:
1. Xác nhận Vercel/Render đã cấu hình đủ biến môi trường thật (Vercel
   sẽ tự deploy `main` mới nếu đã connect — kiểm tra deploy có build
   được không).
2. Xác nhận có cần dọn các nhánh cũ (agent-1/2/3-*, backend/nestjs-implementation,
   claude/cws-zero-manual-operation-wtzbrt, codex/3-business-workflow-cleanup)
   hay giữ nguyên — KHÔNG tự xoá.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

```
tiếp
```

→ tiếp tục mục Pending đầu tiên (nếu không cần thêm quyền truy cập); nếu cả 3 mục Pending đều cần người dùng thao tác, báo lại đúng như trên, không tự ý xoá nhánh/merge PR.
