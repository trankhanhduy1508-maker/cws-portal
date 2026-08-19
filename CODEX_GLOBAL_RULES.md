# CWS CODEX GLOBAL RULES

> Purpose: Global mandatory operating rules for Codex/AI agents working on CWS.
> Scope: Applies to every task unless the Project Owner explicitly overrides a rule.

## Hybrid AI / Model Routing Policy

### CHEAPEST CAPABLE MODEL FIRST

Codex/AI agents working on CWS must not use one heavy model for every task. Every task must first be classified by complexity, risk, context size, reasoning requirement, and cost of failure, then routed to the lightest model that can complete it reliably.

Default escalation order:

1. **GPT-5 nano** — first choice for lightweight work: reading logs, grep/search results, simple PDF/MD/document reading, classification, extraction, summarization, repetitive checks, and low-risk routine work.
2. **GPT-5.4 nano** — use when GPT-5 nano is not reliable enough, context is more complex, or the lightweight task requires better reasoning.
3. **Luna** — use only when both nano tiers are insufficient for the non-coding task.
4. **Terra Medium** — default for coding and normal engineering work: implementation, ordinary bug fixing, tests, refactors, technical review, spec/plan/tasks, and routine architecture analysis.
5. **Terra High** — use for difficult engineering work: hard root-cause analysis, E2E failures, scheduler/worker issues, concurrency/race conditions, security-sensitive work, complex architecture, or when Terra Medium has failed to converge.

Mandatory restrictions:

- **Do not use Sol.**
- **Do not default to Sonnet or another heavy model.** A heavy external model may only be used when there is a specific justified reason and the lighter approved route is insufficient.
- Do not escalate just because a task is long. Escalate only when complexity/risk/reasoning actually requires it.
- A failed lower-tier attempt is a valid escalation signal, but the failure/reason must be recorded when practical.

### Large Document / Log Handling

For large PDFs, MD files, logs, traces, or repository output:

1. Filter, search, or chunk the source before model inference.
2. Send only the relevant sections to the model whenever possible.
3. Use the lightest approved model for first-pass triage.
4. Escalate only the suspicious/complex subset rather than resending the full context to a stronger model.
5. Avoid repeatedly sending unchanged large context.

Target flow:

`Task classification -> cheapest capable model -> execute -> validate -> escalate only if needed`

### Routing Architecture Rule

- Keep model-selection policy separate from CWS business logic.
- Do not hard-code the system so tightly to one model/provider that future model changes require rewriting core product logic.
- Prefer configurable routing/policy tables or adapters when routing is implemented in code.
- Model routing must optimize both quality and cost; token/context reduction should happen before model escalation where practical.

## Lightweight Codex launcher — Founder decision 2026-08-20

Canonical repository launcher:

`CWS_CODEX_LIGHT.cmd`

Typical Founder convenience copy on a local Windows host:

`%USERPROFILE%\Desktop\CWS_CODEX_LIGHT.cmd`

Purpose:

- start Codex CLI without opening VS Code;
- enter the canonical local CWS repository first;
- reduce IDE/UI overhead when the task does not need IDE-only context;
- avoid repeated manual PowerShell/terminal friction where the existing Codex approval reviewer can safely auto-review routine low-risk actions;
- keep long-running render/UE5/diagnostic work on the physical host without making VS Code a production or runtime dependency.

Mandatory AI behavior:

1. At the start of Founder-controlled local Windows work, explicitly choose the appropriate surface:
   - `CWS_CODEX_LIGHT / CODEX CLI`, or
   - `VS CODE + CODEX EXTENSION`.
2. For long-running Blender/UE5/render/runtime diagnostics, resource-sensitive work, or when the Founder complains about repeated Yes/Yes-to-All approval friction, **remind the Founder that `CWS_CODEX_LIGHT.cmd` exists before proposing another editor, auto-clicker, or new wrapper**.
3. Prefer `CWS_CODEX_LIGHT.cmd` when IDE-only capabilities are not needed. Use VS Code when open-editor state, Problems, Testing UI, inline diffs, Integrated Browser, or other IDE-only context materially improves the task.
4. This rule supersedes any older blanket assumption that VS Code must always be the primary local surface. The correct surface is task-dependent.
5. The repository copy is a sanitized launcher/template. Machine-local Codex configuration, approval reviewer, sandbox policy, credentials, tokens, and private settings remain outside GitHub.
6. Safe auto-review is allowed only with sandbox/approval protections preserved. Do not use blind keyboard automation, auto-clickers, universal approval, or `--dangerously-bypass-approvals-and-sandbox` merely to remove prompts.
7. Never commit secrets or machine-private values into the launcher.
8. If the Desktop copy is missing, stale, or broken, compare it with the canonical repository launcher and repair/copy it using the smallest safe change. Do not silently overwrite a working machine-local launcher without checking its differences first.
9. Do not claim the CLI uses less RAM than VS Code unless measured on the relevant machine/workload. The primary verified value of this launcher is simpler low-overhead operation and reduced IDE dependence, not an assumed RAM number.
10. `CWS_CODEX_LIGHT.cmd` is development/operator tooling only. CWS production Worker behavior must remain functional with Codex/AI/VS Code offline.

Founder reminder pattern for a new AI session when relevant:

`LOCAL CWS REMINDER — CWS_CODEX_LIGHT.cmd exists. For this task, use it instead of VS Code if IDE-only context is unnecessary.`

## Codex Telegram Completion Notification

For local Founder/Codex work, Telegram is an operator convenience only. It is not part of CWS production runtime and must never become a Customer/Worker/Scheduler/payment/storage/auth dependency.

Canonical rule:

`Founder prompt -> Codex work -> required verification -> diff/self-review when applicable -> final Codex report -> exactly one Telegram completion notification`

The notification must be sent only after the current prompt's required work and final report are complete. A generic Stop event by itself is not proof that the full Founder prompt is complete.

Allowed completion results:

- `PASS` — all requested work and required verification completed;
- `BLOCKED` — work cannot continue without missing evidence/access/external action or Founder approval;
- `NEEDS REVIEW` — requested implementation/verification reached its gate but review or protected merge/deploy approval remains.

Recommended message format:

```text
CWS Codex: DONE
Task: <short summary>
Result: PASS | BLOCKED | NEEDS REVIEW
```

Hard rules:

- exactly one notification per completed prompt/task;
- no premature completion notification;
- do not report PASS while required prompt items remain incomplete;
- never include secrets, credentials, customer data, private project content, or sensitive logs in Telegram;
- read `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` only from local Windows User environment variables;
- never hard-code or commit Telegram credentials;
- machine-local Codex config/script remain outside the repository under `%USERPROFILE%\.codex\` unless a separately sanitized template is explicitly approved;
- Telegram failure must not change CWS task correctness or production state;
- Telegram notification never authorizes automatic merge, deploy, migration, reboot, shutdown, or movement across Founder approval boundaries.

Detailed setup/recovery and verification guidance: `CWS_CODEX_TELEGRAM_COMPLETION_HOOK.md`.

## Vercel / Deployment Rules

### NO NEW VERCEL PROJECTS WITHOUT OWNER APPROVAL

- **TUYỆT ĐỐI KHÔNG tự ý tạo Vercel project mới.**
- Project production canonical của CWS là **`cws-portal`**.
- Mọi thay đổi frontend/deployment phải ưu tiên sử dụng project **`cws-portal`** hiện có.
- Không tạo project tạm, project test, project preview riêng, project có hậu tố ngẫu nhiên, project `*-fix`, `*-project`, hoặc bản sao của `cws-portal` chỉ để thử nghiệm.
- Không import lại cùng GitHub repository thành một Vercel project mới nếu `cws-portal` đã kết nối repository đó.
- Preview/testing phải dùng deployment/branch/preview của project hiện có nếu Vercel hỗ trợ, không nhân bản project.
- Chỉ được tạo Vercel project mới khi **Project Owner yêu cầu hoặc phê duyệt rõ ràng**.
- Trước mọi thao tác có khả năng tạo project mới, Codex phải kiểm tra project hiện có và dừng thao tác tạo mới nếu chưa có xác nhận của Owner.
- Nếu phát hiện project Vercel dư/trùng lặp: không tạo thêm; báo cáo tên project, Git connection, domain và deployment liên quan; chỉ xóa khi đã xác minh an toàn hoặc Owner yêu cầu.

## General Guardrails

- Không tự ý mở rộng phạm vi task.
- Không tự ý thay đổi production ngoài phạm vi được giao.
- Không commit secret, token, password hoặc API key.
- Ưu tiên sửa project/config hiện có thay vì tạo tài nguyên mới.
- Nếu có nhiều cách làm, chọn cách đơn giản nhất phù hợp MVP và ít tạo tài nguyên phụ nhất.

## Violation Handling

Nếu một thao tác sắp thực hiện xung đột với các quy tắc trên:

1. Không thực hiện thao tác đó.
2. Dùng tài nguyên/project hiện có nếu có thể.
3. Nếu thật sự cần tài nguyên mới, đánh dấu BLOCKED và xin Owner phê duyệt.
