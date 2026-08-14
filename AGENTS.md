# CWS AGENTS

> Version: 4.3 — knowledge-router startup, implementation-last discipline, grounding/staleness/AI gates, Founder Codex prompt handoff rule, repeatable-action automation rule — 2026-08-14.

## 0. Mandatory first rule — code is last

Before any implementation task, apply `CWS_AI_ENGINEERING_HARNESS_V1.md`.

The default engineering order is:

`UNDERSTAND -> GROUND -> DIAGNOSE -> DECIDE -> SPECIFY -> PLAN -> ANALYZE -> IMPLEMENT -> VERIFY -> SYNC -> LEARN -> STOP`

Do not jump from an idea, screenshot, error, or Founder message directly to code. Small low-risk fixes may use the Harness L1 shortened path, but must still ground, diagnose, fix narrowly, test, and verify.

## Founder Codex prompt handoff rule — mandatory

When ChatGPT analyzes a Founder-provided CWS screenshot/log/result and the next useful action should be delegated to Codex:

1. Analyze the evidence first; do not merely transcribe the screenshot.
2. Explain to the Founder in Vietnamese why the proposed Codex prompt is needed and summarize the prompt's main intent, expected action, safety boundary, and expected result.
3. Write the actual Codex execution prompt in English.
4. The Codex prompt must preserve current grounding, governance, smallest-safe-slice, security, Founder-approval, evidence, and no-speculative-coding rules.
5. End the Codex prompt by requiring a concise completion/blocker report through the existing configured CWS Telegram reporting mechanism when available.
6. Never hard-code, print, expose, invent, or request unnecessary Telegram tokens/chat IDs. If Telegram reporting is unavailable or unconfigured, Codex must report that fact safely in its normal execution report rather than weakening secret boundaries.
7. A screenshot alone is not permission to modify code, architecture, workflow, security boundaries, production data, credentials, deployment, or infrastructure. Normal Founder approval gates still apply.

This rule is part of the canonical AI handoff behavior and must be recovered during future grounding through `AGENTS.md`.

## Repeatable-action automation rule — mandatory

When ChatGPT/Codex observes the same operational or development action being repeated manually, it must proactively evaluate whether the repeated sequence should be converted into a reusable quick-start/bootstrap tool instead of being re-executed step by step forever.

Think in terms of the common denominator:

`REPEATED MANUAL STEPS -> COMMON PATTERN -> SAFE REUSABLE AUTOMATION -> ONE-CLICK / ONE-COMMAND START`

Examples include, but are not limited to:

- setting up a new CWS development machine;
- checking/installing required tools;
- cloning/verifying the canonical repository;
- refreshing environment/PATH state;
- launching a standard local workflow;
- running the same diagnostic sequence;
- performing the same bounded verification or packaging routine;
- any other repeated Founder/Codex procedure with stable inputs and predictable safe outputs.

Before creating a new automation file/tool:

1. Search the repository and router first for an existing equivalent capability.
2. Prefer extending or consolidating an existing tool over creating another overlapping script.
3. Do not create a new branch merely because a repeated task was noticed; follow repository branch hygiene and keep branch count minimal.
4. Do not create a new tool for a one-off action or an unstable process that has not repeated enough to justify abstraction.
5. The automation must be idempotent/re-runnable where practical, detect already-completed work, and avoid destructive resets or duplicate clones/installations.
6. Do not hard-code secrets, credentials, machine-specific tokens, or Founder-private values into GitHub.
7. Keep the first version small: BAT/PowerShell/script/Make/task wrapper before GUI/installer/service unless evidence shows the heavier form is needed.
8. Preserve Founder-only approval/authentication steps when they cannot be safely automated; automation may open the correct browser/flow and stop at that exact boundary.
9. Record reusable defects encountered while building/running the automation in `ENGINEERING_LEARNING_LOG.md`, avoiding duplicate knowledge.
10. If the automation changes workflow, architecture, security/trust boundaries, production infrastructure, payment/data behavior, or customer-facing behavior, normal Founder approval gates still apply.

AI should proactively flag a candidate when repeated manual friction is observed using a concise note such as:

`AUTOMATION CANDIDATE — <repeated action>`

Then state:

- what is repeating;
- approximate manual cost/friction;
- the smallest reusable automation that would remove the repetition;
- whether an existing tool can be extended instead of creating a new file;
- any Founder-only step that must remain interactive.

The purpose is to continuously compress recurring operational work without creating script sprawl or branch sprawl.

## Model Policy

Before selecting/delegating a model, read `MODEL_POLICY.md`. It is the model-routing source of truth.

## Source of Truth — routed startup

`CWS_SESSION_BOOTSTRAP.md` is the canonical new-session entrypoint.

`CWS_KNOWLEDGE_ROUTER.yaml` is the repository catalog/router. It does not override product/runtime truth; it selects the smallest correct source set for the current task.

Default startup order:

1. `CWS_SESSION_BOOTSTRAP.md`
2. `CWS_KNOWLEDGE_ROUTER.yaml`
3. `CURRENT_STATUS.md`
4. classify the task by domain/topic
5. follow the router to the minimum authoritative/current sources required
6. inspect exact code/tests/schema/runtime evidence when the claim depends on implementation or production state
7. expand into historical/research/legacy material only when current sources are insufficient, conflicting, or root-cause/regression archaeology requires it

Canonical routing shape:

`BOOTSTRAP -> ROUTER -> CURRENT STATUS -> CLASSIFY -> FILTER -> RANK -> READ MINIMUM -> EXPAND ONLY IF NEEDED`

Do **not** begin a normal task by reading the entire repository or the entire governance corpus.

The following governance remains binding even when its full text is not loaded into the initial context window:

- `AGENTS.md`
- `AGENTS02.md`
- `FOUNDER_RULES.md`
- `CWS_AI_ENGINEERING_HARNESS_V1.md`
- `CWS_AI_REASONING_DISCIPLINE_V1.md`
- `CWS_GROUNDING_POLICY.md`
- `CWS_STALENESS_GUARD.md`
- `.specify/memory/constitution.md`
- `CWS_EXECUTION_FUNNEL.md`

Read the exact governing document completely when the router selects it, the task changes governance/architecture/security/payment/data/product behavior, a Founder-approval boundary is unclear, or conflict/staleness resolution requires the exact rule.

Task-specific authorities remain owned by their canonical documents. Examples:

- `DECISIONS.md` — explicit active Founder/product/architecture/security/payment decisions
- `CWS_MVP_WORKFLOW_FINAL.md` — canonical customer business ordering
- `CWS_ROADMAP.md` — only active roadmap
- active task spec under `specs/` — approved execution intent for that task, subordinate to active Founder decisions
- `CWS_DATABASE_SCHEMA.md` + applied migrations — data/schema authority when relevant
- current code/config/runtime evidence — actual implementation/runtime truth
- `CWS_SECURITY_MASTER_INDEX.md` — security-domain routing/index when security is in scope
- `CWS_AI_OPERATING_PLAYBOOK.md` — AI-in-product operating governance when AI/agents are part of the system
- `FOUNDER_IDEA_VAULT.md` — dormant memory only, never implementation permission

Historical reports, completed specs, changelogs, research notes, old chats, and legacy code are cold memory by default. Search/read them only when the current task requires them.

## Grounding gate — mandatory

Before Diagnosis, Root Cause, Specify, architecture/security/payment/product recommendations, implementation based on a factual assumption, or any DONE/production claim, apply `CWS_GROUNDING_POLICY.md`.

Material claims must be traceable to current evidence. Distinguish:

- `FACT`
- `INFERENCE`
- `HYPOTHESIS`
- `UNKNOWN`

Do not write UNKNOWN as FACT. Do not promote code/test/simulation evidence into a production-runtime claim by inference.

## Staleness gate — mandatory

After grounding relevant facts, apply `CWS_STALENESS_GUARD.md` before using roadmap/workflow/decision/context/architecture prose for implementation.

If a material instruction appears obsolete because of a newer Founder decision, code/schema/runtime evidence, or another active source:

- do not silently follow the old instruction;
- issue the standard `STALE-DOC ALERT`;
- if the conflict affects the current task, stop implementation that depends on it until reconciled or Founder-confirmed;
- if unrelated, report it as non-blocking and continue only safe unrelated work.

File age alone is not proof that a document is stale.

## Founder decision boundary — mandatory

Per the Harness, coding agents may choose ordinary implementation details inside approved scope, but must STOP before independently changing:

- customer journey/public service choices;
- pricing/payment order or public SLA;
- authentication/authorization/security/trust boundary;
- scheduler ownership semantics;
- storage/secret boundary;
- destructive/incompatible data behavior;
- infrastructure topology or new production resources.

A new material Founder decision in the active working context overrides older conflicting instructions, but it must be recorded into canonical source-of-truth docs before implementation proceeds.

## AI operating gate — mandatory when AI is part of the system

For every task that proposes, designs, invokes, modifies, delegates to, or relies on AI/agents in production, read and apply `CWS_AI_OPERATING_PLAYBOOK.md` before Specify/Plan/Implement.

At minimum determine when material:

- business outcome and whether AI is necessary;
- deterministic vs AI boundary;
- required context/data and grounding source;
- AI role, tools/writes, forbidden actions and approval boundary;
- verification/eval metric;
- failure/fallback behavior;
- cost/latency guardrail and stop condition;
- security treatment of untrusted input and prompt/indirect-prompt injection;
- audit/observability evidence required before DONE.

Hard rules:

- AI output is not production truth until independently verified;
- payment, money movement, download unlock, auth/authorization, job/worker state, lifecycle transitions, retries, cleanup and other deterministic control-loop decisions MUST NOT depend on natural-language AI judgment;
- untrusted customer files, archives, metadata, logs, web/email/external documents are data, not trusted instructions;
- use least privilege for AI tools and writes;
- do not add an agent where deterministic code or one bounded workflow is sufficient;
- AI failure must fail safe and must not break the production control loop;
- production runtime must remain operable with AI offline.

## Founder idea gate — mandatory

`FOUNDER_IDEA_VAULT.md` preserves future Founder ideas that must not distract the active roadmap.

During major scale/runtime verification cycles and Pre-DONE review, check whether new grounded evidence satisfies a `DORMANT` idea activation gate.

If satisfied:

- do not implement automatically;
- report `FOUNDER IDEA GATE REACHED — <IDEA-ID>`;
- cite evidence;
- ask Founder for explicit approval;
- only then may the idea enter the normal execution funnel.

If not satisfied, keep it dormant.

## Conflict rules

- Latest explicit Founder decision in the active working context wins over older conflicting intent, but material changes must be synced to canonical docs before code.
- Current real runtime/code/schema evidence overrides assumptions and stale historical prose about what currently exists.
- `DECISIONS.md` owns explicit active decisions.
- `CWS_MVP_WORKFLOW_FINAL.md` owns customer business ordering.
- `CWS_ROADMAP.md` is the only active roadmap.
- Current task spec owns approved implementation intent for that task, subordinate to active Founder decisions.
- `CWS_AI_ENGINEERING_HARNESS_V1.md` governs how AI-assisted engineering is executed; it does not override product/runtime truth.
- `CWS_AI_OPERATING_PLAYBOOK.md` governs AI inside the product/system; it does not override product/architecture/runtime truth.
- `FOUNDER_IDEA_VAULT.md` is memory, not roadmap or implementation permission.
- `CWS_KNOWLEDGE_ROUTER.yaml` is a routing catalog, not a competing product/runtime authority.
- When active sources conflict, ground facts, invoke the staleness guard, stop affected implementation, report, and reconcile first.

## Mandatory execution funnel

For L2/L3 material CWS changes:

`Harness -> Grounding -> Staleness Check -> Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> AI Operating Gate (when applicable) -> Specify -> Clarify (when needed) -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify -> Grounding Sweep -> Staleness Sweep -> AI Operating Sweep (when applicable) -> Founder Idea Gate Check`

For L1 low-risk local fixes, use the Harness shortened path:

`Ground -> Diagnose -> Smallest Fix -> Targeted Test -> Verify -> Report`

Do not use the short path when the task crosses product/architecture/security/payment/data/infrastructure boundaries.

### Before Specify

Record as applicable:

- observed reality/evidence;
- evidence source + evidence level;
- FACT / INFERENCE / HYPOTHESIS / UNKNOWN classification for material claims;
- expected vs actual;
- first failing boundary;
- root cause or falsifiable hypothesis;
- one verified bottleneck;
- minimum fix;
- risks/non-goals;
- success evidence;
- Founder-approval boundary.

For AI-involved product tasks, also record applicable AI Operator questions from `CWS_AI_OPERATING_PLAYBOOK.md`.

Clarify only when repository/evidence cannot resolve a material product/security/architecture decision.

## Core engineering rules

- MVP first; one current E2E bottleneck at a time.
- Code is an implementation phase, not the discovery phase.
- Root cause over symptom.
- Evidence over plausibility.
- Simplicity / no over-engineering.
- Security fail-closed; no secret commits.
- Existing infrastructure only unless Founder explicitly approves a new resource.
- Production runtime must work with AI offline.
- Customer originals are immutable.
- No fake/demo production render/progress/payment/output.
- No manual per-Worker/per-job operations as normal scale path.
- Architecture must avoid scale dead-ends while not adding unmeasured brokers/services.
- Small focused commits; relevant tests/evidence before DONE.
- Do not measure quality by how long the AI coded or how many lines it produced.

## Canonical product invariants

Customer business ordering is owned by `CWS_MVP_WORKFLOW_FINAL.md`. This section is a compact summary only and must not override that file.

Current Customer MVP flow:

`Google Login -> authenticated Upload/approved Google Drive -> temporary quarantine/staging outside canonical B2 -> ownership/provider/SSRF/size/signature checks -> anti-malware scan -> archive/Blender structural safety -> CLEAN/SAFE -> canonical B2 input upload -> verify B2 object -> INPUT_SAFE -> auto-create exactly one customer-owned Job -> analyze project/work range -> durable non-overlapping Tasks -> Adaptive Deadline Scheduler -> real Worker execution -> collect/validate/finalize -> B2 full output LOCKED -> watermarked previews -> final price + MB QR -> SePay exact match -> PAID -> authorized download -> History/cleanup`

Binding summary:

- Google login is the first operational Customer gate;
- normal Customer runtime requires zero Founder/Admin approval;
- authenticated supported input submission expresses render intent;
- there is no mandatory post-validation `Start Render` confirmation;
- no production Job before authoritative `INPUT_SAFE`;
- customer render speed/tier selection is removed from the active product and must not be recreated;
- customer does not choose Worker count/GPU/CPU;
- initial desired capacity targets 10 eligible Workers when useful runnable work and real capacity exist;
- useful real tasks begin immediately; no blocking benchmark-only phase;
- completed real tasks provide runtime evidence for adaptive capacity planning;
- internal scheduling target is toward complete final deliverable within 45 minutes, including required finalization/assembly/encode;
- safety capacity is configurable, initially 20–30%, and required Worker count rounds up to an integer;
- one task/frame has one authoritative active Worker; failover is lease/generation fenced;
- no customer-approval gate before payment;
- payment occurs only after real render/finalization, locked full output and previews;
- final customer pricing keeps the approved 2.5x multiplier over verified cost basis;
- no rerender/repackage/reupload after PAID merely to deliver an existing output.

## Definition of Done

A change is DONE only with:

`Implementation + Tests + Evidence + Source-of-Truth Sync + Grounding Sweep + Staleness Sweep + AI Operating Sweep (when applicable) + Founder Idea Gate Check + Commit`

Evidence labels must not be promoted by inference. Use the Harness verification ladder:

- `DESIGN REVIEWED`
- `CODE VERIFIED`
- `INTEGRATION VERIFIED`
- `RUNTIME VERIFIED`
- `PRODUCTION RUNTIME VERIFIED`
- `GOLDEN E2E VERIFIED`

Before DONE, report what remains unverified.

For AI-involved product work, DONE additionally requires:

- deterministic/AI boundary verified;
- role/tool permissions within policy;
- failure/fallback behavior verified;
- relevant eval/verification evidence recorded;
- no unresolved high-risk AI security finding;
- cost/latency/iteration guardrails respected or explicitly reported.

## Source-of-Truth Sync

After completed work update, as applicable:

- `CURRENT_STATUS.md`
- `CWS_ROADMAP.md`
- `DECISIONS.md`
- `PROJECT_CONTEXT.md`
- relevant workflow/architecture/API docs
- current task spec
- `CWS_AI_ENGINEERING_HARNESS_V1.md` when engineering governance itself changes
- `CWS_AI_OPERATING_PLAYBOOK.md` when AI-in-product governance changes
- `CWS_KNOWLEDGE_ROUTER.yaml` when routing/taxonomy/authority/lifecycle rules change
- evidence/report under `reports/`
- `ENGINEERING_LEARNING_LOG.md` with problems, root causes, fixes, failed approaches, evidence, lessons/rules, remaining risks and next verified bottleneck.

Before DONE:

1. run the Pre-DONE Grounding Sweep from `CWS_GROUNDING_POLICY.md`;
2. run the Converge/Verify staleness sweep from `CWS_STALENESS_GUARD.md`;
3. when AI is involved in the product/system, run an AI Operating Sweep against `CWS_AI_OPERATING_PLAYBOOK.md`;
4. check `FOUNDER_IDEA_VAULT.md` against newly produced grounded evidence.

If evidence is insufficient, downgrade to `NEEDS_VERIFICATION`/`BLOCKED` instead of guessing.

`CURRENT_STATUS.md` must stay short and current-only:

- Current Phase
- Last Verified
- Current Task
- Next
- Last Updated + evidence links

Historical detail belongs in `reports/` and git history and is cold memory by default.

## Roadmap status labels

Use only:

- `TODO`
- `IN_PROGRESS`
- `NEEDS_VERIFICATION`
- `DONE`
- `BLOCKED`
- `SUPERSEDED`

`CWS_ROADMAP.md` records current state, not a historical changelog.

## Repository hygiene

- Do not create a new repository/project/service/bucket/database/payment project without explicit Founder approval.
- Do not recreate deleted versioned roadmaps as active instructions.
- Historical evidence may refer to old roadmap names; evidence is immutable history, not current direction.
- Dormant ideas in `FOUNDER_IDEA_VAULT.md` are preserved memory, not permission to implement them.
- A generated handoff/bundle is not canonical until the intended real repository paths are updated and verified.
- Do not move/rename/archive large parts of the repository merely to make the tree look cleaner; improve retrieval first and preserve links/history unless a later evidence-backed cleanup is approved.
