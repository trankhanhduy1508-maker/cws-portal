# CODEX 1 CHECKLIST

## Vai trò

GitHub • Repository • Vercel • Render.com • CI/CD • Build • Documentation

---

# Phase 1 - Audit

- [x] Kiểm tra Repository — 1 repo duy nhất `trankhanhduy1508-maker/cws-portal`, root chứa Portal (Vite+React), `backend/` chứa NestJS. Nhiều nhánh cũ từ các phiên agent trước (`agent-1-*`, `agent-2-*`, `agent-3-*`, `codex/3-business-workflow-cleanup`, `backend/nestjs-implementation`, `claude/cws-zero-manual-operation-wtzbrt`) — CHƯA dọn, chưa rõ cái nào còn giá trị/đã merge hay bỏ dở (xem Pending).
- [x] Kiểm tra CI/CD — `.github/workflows/ci.yml` (build+test backend, build+lint frontend) đã viết và commit trên nhánh `codex/ci-workflow`, nhưng nhánh này CHƯA merge vào `main` — nghĩa là CI chưa thực sự chạy trên PR/push vào main cho tới khi merge.
- [x] Kiểm tra Build — xác minh thật (không chỉ tin log cũ): `cd backend && npm run build` (nest build) PASS; `npm run lint` (oxlint) + `npm run build` (vite build) ở root PASS; `cd backend && npm test` (jest) — ban đầu 9/9, sau khi thêm test cho fix thanh toán (audit 2026-07-30) lên 20/20, sau khi thêm `WebhookSecretGuard` (bug bảo mật webhook, cùng ngày) hiện là 23/23 PASS. Chạy lại nhiều lần trong suốt phiên để xác nhận sau mỗi thay đổi, không dùng kết quả cũ. **Phát hiện thêm:** `cd backend && npm run lint` (eslint, KHÁC oxlint của frontend) CHƯA TỪNG được chạy/verify trong suốt phiên trước đó, và CI (`.github/workflows/ci.yml`) cũng chưa từng chạy nó cho backend — khi chạy tay lộ ra 1 lỗi eslint có sẵn từ trước (`_providerRef` không dùng). Đã sửa lỗi đó + thêm bước `npm run lint` vào CI job backend để không lặp lại lỗ hổng kiểm tra này.
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
- **Dọn toàn bộ 16 nhánh Git cũ (2026-07-30, theo yêu cầu người dùng, xác nhận 2 lần riêng biệt trước khi xoá):**
  - Đợt 1 (7 nhánh, xác nhận an toàn tuyệt đối vì đã nằm TRỌN trong `main` — `git merge-base --is-ancestor` xác nhận lại ngay trước khi xoá): `agent-3-operations-p2`, `agent-3-secure-output-p2`, `backend/nestjs-implementation`, `codex/3-business-workflow-cleanup`, `codex/ci-workflow`, `codex/mvp-payment-qr-only`, `codex/storage-review-images`.
  - Đợt 2 (9 nhánh còn lại, có commit riêng — đã ĐỌC KỸ NỘI DUNG THẬT từng nhánh trước khi đề xuất xoá, không chỉ diff --stat):
    - 4 nhánh chỉ thêm 1 file report/docs, không có code thật: `agent-1-planner`, `agent-2-payment-p2`, `agent-2-render-pipeline`, `agent-3-review`.
    - `agent-2-implementation` (5 commit): chỉ thêm docs quy trình multi-agent (`docs/FRAMEWORK.md`), mô hình "3 Codex" đã bị thay bằng 1 Agent duy nhất từ đầu phiên — không còn phù hợp.
    - `agent-3-operations-console-p2` (27 commit, ⊃ `agent-2-secure-output-p2` ⊃ `agent-1-payment-p2`): kiến trúc auth JWT tự ký + role — ĐÃ BỊ THAY THẾ bởi Supabase Auth, code sẽ không compile được trên `main`; schema khác hẳn (bảng `outputs`/`download_events`/`payment_events` không tồn tại); phần "secure output" (locked/unlocked/revoked, audit log bất biến) là **Enterprise Security** — nằm ngoài phạm vi MVP theo đúng chữ của cả 2 tài liệu roadmap. Phần "operations console" (dashboard KPI) có ý tưởng hay nhưng vượt yêu cầu Admin của roadmap, đã ghi nhận để tham khảo sau nếu cần, không lấy trực tiếp được.
    - `claude/cws-zero-manual-operation-wtzbrt` (1 commit, phiên Claude trước): có lỗ hổng bảo mật (frontend tự xác nhận thanh toán) — KHÔNG merge trực tiếp, nhưng đã trích 2 ý tưởng giá trị (giá thật theo runtime Worker, xuất video MP4) viết lại an toàn vào `main` trước khi xoá nhánh — xem `backend/CHANGELOG.md` mục `[1.4.0]`.
  - Kết quả: repo chỉ còn duy nhất nhánh `main` (remote + local), xác nhận qua `git branch -r`/`git branch` sau khi xoá.
- **Lỗ hổng bảo mật webhook + gap CI lint (2026-07-30, tự phát hiện qua self-review sau khi tưởng audit đã xong):** `POST /payments/webhook` không có xác thực nào — sửa bằng `WebhookSecretGuard` mới (header `x-webhook-secret`/`PAYMENT_WEBHOOK_SECRET`, fail-closed). Đồng thời phát hiện CI chưa từng lint backend — đã thêm bước lint vào `.github/workflows/ci.yml` job backend, tự sửa 1 lỗi eslint có sẵn từ trước lộ ra ngay khi chạy lần đầu. Build/test/lint + boot thật PASS (23/23 test). Chi tiết đầy đủ: `docs/MVP_GAP_REPORT.md`, `backend/CHANGELOG.md` mục `[1.5.0]`.

---

# Pending

- Xác nhận cấu hình thật trên Vercel (env `VITE_CWS_API_BASE_URL`/`VITE_CWS_WS_BASE_URL`) và Render.com (toàn bộ biến trong `backend/.env.example`, đặc biệt `ADMIN_API_KEY`/`MB_BANK_ACCOUNT_NUMBER` không được để trống ở production) — CLOUD_VERIFICATION_REQUIRED, không có Dashboard access.

---

# Risks

- (ĐÃ XONG — xem Completed) 3 nhánh PR song song đã merge vào `main` an toàn: `codex/mvp-payment-qr-only` hoá ra đã là ancestor của `codex/storage-review-images` (fast-forward, không xung đột), `codex/ci-workflow` chỉ thêm 1 file `.github/workflows/ci.yml` (merge 3-way sạch, không đụng file nào khác).

---

# Blockers

- Không có quyền truy cập Dashboard Vercel/Render.com trong môi trường này để xác minh cấu hình deploy thật.

---

# Next Task

Repository đã dọn xong hoàn toàn (2026-07-30): merge 3 nhánh PR vào
`main`, xoá toàn bộ 16 nhánh cũ (2 đợt, đều có xác nhận rõ ràng của
người dùng trước khi xoá — xem Completed). Repo giờ chỉ còn duy nhất
`main`, đã verify qua `git branch -r`/`git branch`. `main` hiện là bản
MVP đầy đủ nhất, build/test/lint PASS + GitHub Actions CI thật PASS
10/10 lần gần nhất (xem `docs/MVP_GAP_REPORT.md`) — LƯU Ý: 10 lần đó
chỉ phủ build+test backend (CI chưa lint backend lúc đó), đã thêm bước
lint vào CI sau khi phát hiện qua self-review (xem Completed), lần
chạy CI kế tiếp trên `main` mới là lần đầu CI thật sự lint backend.

Còn lại DUY NHẤT phụ thuộc người dùng: xác nhận Vercel/Render đã cấu
hình đủ biến môi trường thật (Vercel sẽ tự deploy `main` mới nếu đã
connect — kiểm tra deploy có build được không).

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

```
tiếp
```

→ mục Pending duy nhất còn lại cần người dùng thao tác (Vercel/Render Dashboard) — báo lại đúng như trên, không tự ý xoá nhánh/merge PR nếu chưa có xác nhận rõ ràng.
