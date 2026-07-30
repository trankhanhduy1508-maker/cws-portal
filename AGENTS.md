# CWS AGENTS

## Source of Truth

Mọi Codex phải đọc theo thứ tự:

1. CWS_ROADMAP_MVP_V1.md
2. CWS_MVP_WORKFLOW_FINAL.md
3. CWS_DATABASE_SCHEMA.md
4. CODEX_CONSTITUTION.md
5. CODEX_GLOBAL_RULES.md
6. AGENTS.md
7. reports/CODEX_X_CHECKLIST.md

---

## CODEX 1

Phạm vi:

- GitHub
- Repository
- Vercel
- Render.com
- CI/CD
- Build
- Documentation

Không sửa:

- Database
- Payment
- Worker
- Customer Workflow

---

## CODEX 2

Phạm vi:

- Supabase
- Database
- Storage
- Backblaze B2
- Migration
- Auth
- RLS

Không sửa:

- UI
- Deployment
- Payment Workflow

---

## CODEX 3

Phạm vi:

- Customer Workflow
- Facebook Login
- Worker
- Progress
- Preview
- MB QR
- Webhook
- Dashboard

Không sửa:

- Database
- Deployment

---

## Quy tắc chung

- Chỉ làm đúng phạm vi được giao.
- Không sửa code của Codex khác.
- Không thêm tính năng ngoài MVP.
- Mọi quyết định phải dựa trên:
  - CWS_ROADMAP_MVP_V1.md
  - CWS_MVP_WORKFLOW_FINAL.md
  - CWS_DATABASE_SCHEMA.md

---

## Quy tắc "tiếp"

Khi người dùng chỉ nhắn:

```
tiếp
```

Codex phải:

1. Đọc checklist của mình trong `reports/`.
2. Chọn mục chưa hoàn thành đầu tiên.
3. Thực hiện.
4. Test.
5. Commit.
6. Cập nhật checklist.
7. Ghi `Next Task`.
8. Dừng khi hoàn thành nhiệm vụ tiếp theo hoặc gặp blocker thật sự.

Không hỏi lại nhiệm vụ nếu không cần thêm thông tin hoặc quyền truy cập.
