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
| 4 | .specify/memory/constitution.md | CWS Constitution và execution gates |
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

# MANDATORY GITHUB SPEC KIT WORKFLOW

GitHub Spec Kit is the required execution framework for every CWS change. It
is layered above the CWS source-of-truth documents and does not replace them.
The repository constitution is `.specify/memory/constitution.md`.

No agent may accept a CWS idea, feature, workflow-affecting bug fix,
architecture/database/Worker/payment/storage/security/UI/deployment/
automation/roadmap change and jump directly to code. The required sequence is:

`Constitution -> Specify -> Clarify (only when the repository cannot answer) -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

Before Specify, the agent must state the goal, assumptions, risks, system
impact, contradictions, and alternatives. Specify/Plan/Tasks must reference
the applicable CWS documents above. Analyze is read-only and must check missing
requirements, contradiction, task coverage, architecture/security/scale
conflicts, fake/demo paths, and regression risk. Implement is allowed only
after those artifacts exist. Converge/Verify must run the relevant tests,
production E2E when applicable, and source-of-truth synchronization.

`.agents/skills/speckit-*` contains the Codex-facing Spec Kit skills and
`.specify/` contains the templates, scripts, workflow metadata, and
constitution. The legacy paths `CODEX_CONSTITUTION.md` and
`reports/CODEX_X_CHECKLIST.md` are not present in this checkout; agents must
not invent or silently rely on them. Use the checked-in Spec Kit constitution
and the actual evidence under `reports/` instead.

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
- Google Login
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

# SOURCE-OF-TRUTH SYNC (bắt buộc, thêm 2026-08-02)

Một task chỉ được coi là **DONE** khi đủ CẢ 5 điều kiện:

```
Implementation + Tests + Evidence + Source-of-Truth Sync + Commit
```

- **Implementation** — code thật đã viết/sửa đúng phạm vi.
- **Tests** — test pass (unit/integration tùy phạm vi).
- **Evidence** — bằng chứng thật (log/DB/HTTP response thật), không suy
  đoán, không tự nhận PASS mà không có gì kiểm chứng được.
- **Source-of-Truth Sync** — Roadmap (`CWS_ROADMAP_MVP_V1.md`) +
  `CURRENT_STATUS.md` + `DECISIONS.md` (nếu liên quan) đã được cập nhật
  đúng trạng thái mới **TRƯỚC KHI** LOOP chuyển sang task tiếp theo —
  không được để lại task đã xong nhưng docs còn ghi trạng thái cũ.
- **Commit** — đã commit (và push nếu có quyền) đúng phạm vi thay đổi.

Nếu tài liệu (Roadmap/CURRENT_STATUS/DECISIONS) mâu thuẫn với
code/tests/evidence mới hơn → phải **reconcile tài liệu trước**, không
được để mâu thuẫn tồn đọng sang LOOP sau.

## Roadmap status — nhãn chuẩn hoá

Mỗi hạng mục trong `CWS_ROADMAP_MVP_V1.md` mang đúng 1 trong các nhãn
sau (không tự đặt nhãn khác):

| Nhãn | Ý nghĩa |
|---|---|
| `TODO` | Chưa bắt đầu |
| `IN_PROGRESS` | Đang làm dở, chưa đủ evidence để DONE |
| `NEEDS_VERIFICATION` | Code/implementation tồn tại nhưng chưa có evidence runtime thật (vd unit test mock PASS nhưng chưa chạy thật với dữ liệu/thiết bị thật) |
| `DONE` | Đủ cả 5 điều kiện Source-of-Truth Sync ở trên |
| `BLOCKED` | Không tự làm tiếp được — thiếu quyền/secret/API/tài khoản/thiết bị/xác nhận Owner (xem BLOCKER POLICY) |
| `SUPERSEDED` | Task/thiết kế cũ đã bị 1 quyết định/thiết kế mới thay thế — không implement lại thiết kế cũ, ghi rõ cái gì thay thế nó |

Roadmap chỉ ghi **trạng thái hiện tại** của từng hạng mục, KHÔNG biến
thành changelog dài (không liệt kê lịch sử từng lần sửa — lịch sử đó
thuộc về `reports/` và git log).

## CURRENT_STATUS.md — entry point đầu tiên của LOOP

`CURRENT_STATUS.md` phải NGẮN, chỉ gồm:

```
Current Phase
Last Verified
Current Task
Next
Last Updated (ngày + link tới report/evidence chi tiết nếu có)
```

Chi tiết bằng chứng (log, HTTP response, DB query, phân tích code) thuộc
về `reports/`, không nhét vào `CURRENT_STATUS.md` — file này chỉ trỏ tới
report liên quan, không lặp lại nội dung report.

## DECISIONS.md — ACTIVE / SUPERSEDED

Mỗi quyết định trong `DECISIONS.md` mang nhãn `ACTIVE` hoặc
`SUPERSEDED`. Khi 1 quyết định mới thay thế quyết định cũ:

- Quyết định mới → `ACTIVE`.
- Quyết định cũ → `SUPERSEDED`, ghi rõ **bị thay thế bởi quyết định
  nào** (ngày + tên ngắn gọn).
- KHÔNG BAO GIỜ để 2 quyết định mâu thuẫn cùng ở trạng thái `ACTIVE`.

## Thứ tự bắt buộc khi bắt đầu mỗi LOOP

```
CURRENT_STATUS.md
  -> Roadmap (CWS_ROADMAP_MVP_V1.md)
  -> DECISIONS.md
  -> code/tests/evidence liên quan tới Current Task
  -> xác định NEXT TASK
```

Next Task luôn phải dựa vào Roadmap (không tự bịa task ngoài Roadmap
trừ khi Owner yêu cầu rõ ràng).

## Reconciliation (chạy định kỳ hoặc khi Owner yêu cầu)

Đối chiếu Roadmap ↔ CURRENT_STATUS ↔ DECISIONS ↔ code ↔ tests/evidence
thật, tìm:

- `TODO` nhưng thực tế đã làm.
- `DONE` nhưng không còn/chưa có evidence đủ.
- Blocker đã được giải quyết nhưng docs chưa cập nhật.
- Task/thiết kế cũ đã bị thay thế nhưng chưa đánh dấu `SUPERSEDED`.
- Docs mâu thuẫn nhau (vd 2 quyết định cùng ACTIVE nhưng xung đột).
- Task trùng lặp giữa các file.

**Trong reconciliation CHỈ đồng bộ trạng thái/docs — không tự mở
feature mới, không code lại phần đã có evidence DONE.** Nếu Roadmap ghi
`DONE` nhưng không còn evidence đủ → đổi về `NEEDS_VERIFICATION`, không
tự động code lại. Nếu thiết kế cũ đã bị thay thế → `SUPERSEDED`, không
implement lại thiết kế cũ.

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

fix(auth): google oauth redirect

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
