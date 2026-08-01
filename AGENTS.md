# CWS AGENTS

> Version: 2.0
> Purpose: Shared operating rules for all AI agents working on Computer Workspace (CWS).

---## Model Policy

Before selecting or delegating any model, read and follow `MODEL_POLICY.md`.

`MODEL_POLICY.md` is the source of truth for model selection and escalation rules.

# SOURCE OF TRUTH

Mọi AI Agent phải đọc theo đúng thứ tự sau trước khi thực hiện bất kỳ nhiệm vụ nào.

| Thứ tự | Tài liệu | Mục đích |
|---------|----------|----------|
| 1 | CWS_ROADMAP_MVP_V1.md | Roadmap chính thức |
| 2 | CWS_MVP_WORKFLOW_FINAL.md | Workflow MVP |
| 3 | CWS_DATABASE_SCHEMA.md | Database Schema |
| 4 | CODEX_CONSTITUTION.md | Kiến trúc & nguyên tắc |
| 5 | CODEX_GLOBAL_RULES.md | Quy tắc chung |
| 6 | AGENTS.md | Quy định vận hành AI |
| 7 | CURRENT_STATUS.md | Tiến độ mới nhất |
| 8 | DECISIONS.md | Các quyết định đã chốt |
| 9 | reports/CODEX_X_CHECKLIST.md | Checklist của Agent |

Nếu có xung đột:

ROADMAP
>
WORKFLOW
>
DATABASE
>
DECISIONS
>
CURRENT_STATUS
>
REPORT

---

# GENERAL PRINCIPLES

| Quy tắc | Nội dung |
|----------|----------|
| MVP First | Luôn ưu tiên hoàn thành MVP trước |
| Simplicity | Chọn giải pháp đơn giản nhất đáp ứng yêu cầu |
| Root Cause | Ưu tiên sửa nguyên nhân gốc |
| No Over-engineering | Không xây hệ thống vượt quá nhu cầu MVP |
| Scope | Chỉ sửa đúng phạm vi được giao |
| Security | Không commit secret |
| Small Commits | Commit nhỏ, rõ ràng |
| Test First | Test trước khi commit |
| Documentation | Luôn cập nhật tài liệu khi hoàn thành |

---

# AGENT RESPONSIBILITIES

## Agent 1 — Infrastructure

### Phạm vi

- GitHub
- Repository
- CI/CD
- Build
- Vercel
- Render.com
- Documentation

### Không sửa

- Database
- Worker
- Payment
- Customer Workflow

---

## Agent 2 — Backend

### Phạm vi

- Supabase
- Database
- Migration
- Storage
- Backblaze B2
- Authentication
- RLS

### Không sửa

- UI
- Deployment
- Customer Workflow

---

## Agent 3 — Application

### Phạm vi

- Customer Workflow
- Facebook Login
- Worker
- Dashboard
- Progress
- Preview
- Payment UI
- MB QR
- Webhook

### Không sửa

- Database
- Infrastructure

---

# DEFINITION OF DONE

Một task chỉ được xem là hoàn thành khi:

- Code chạy.
- Không lỗi build.
- Không lỗi lint (nếu có).
- Test pass (nếu có).
- Không sinh regression.
- Checklist được cập nhật.
- CURRENT_STATUS.md được cập nhật.
- Report được cập nhật.
- Next Task được ghi rõ.

---

# BLOCKER POLICY

Chỉ được phép dừng khi gặp:

- Thiếu quyền.
- Thiếu Secret.
- Thiếu API.
- Thiếu tài khoản.
- Thiếu xác nhận của Project Owner.

Không được dừng chỉ vì:

- Có nhiều cách triển khai.
- Chưa chắc giải pháp tối ưu.
- Muốn refactor toàn bộ.
- Muốn cải tiến kiến trúc.

Nếu có nhiều lựa chọn:

=> Chọn giải pháp đơn giản nhất phù hợp MVP.

---

# FILE MODIFICATION RULES

Được phép:

- Sửa file liên quan task.
- Thêm test.
- Cập nhật report.
- Cập nhật CURRENT_STATUS.

Không được:

- Xóa file không liên quan.
- Đổi cấu trúc repository.
- Tạo worktree Windows.
- Thay đổi production ngoài phạm vi task.

---

# COMMIT RULES

Commit message:

type(scope): summary

Ví dụ:

feat(worker): add auto update

fix(auth): facebook oauth redirect

docs(report): update progress

Không commit:

- Secret
- API Key
- Service Role Key
- Password
- Token

---

# WHEN USER SAYS "TIẾP"

Nếu người dùng chỉ nhắn:

```
tiếp
```

AI phải tự động:

1. Đọc CURRENT_STATUS.md.
2. Đọc checklist của mình.
3. Chọn task chưa hoàn thành đầu tiên.
4. Thực hiện.
5. Test.
6. Commit.
7. Push.
8. Cập nhật CURRENT_STATUS.md.
9. Cập nhật Report.
10. Ghi Next Task.

Không hỏi lại nếu không thật sự cần.

---

# FINAL OUTPUT FORMAT

Cuối mỗi nhiệm vụ chỉ trả về:

## Completed

- ...

## Remaining

- ...

## Next Task

- ...

## Commit

hash — message

---

# GOLDEN RULE

Luôn ưu tiên:

MVP
>
Đơn giản
>
Ổn định
>
Có thể bảo trì

Không over-engineering.
Không tự ý mở rộng phạm vi.
Không làm chậm tiến độ dự án.
