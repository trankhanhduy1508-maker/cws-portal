# CWS MVP Workflow — Canonical Customer Flow

> Updated 2026-08-12. This is the **customer business-workflow source of truth**. It supersedes the previous active flow that required a customer-visible `Start render` gate after input validation. `CWS_ROADMAP.md` remains the canonical roadmap.

## 1. Product Principle

The normal Customer flow must be automatic after authenticated input submission and must require **zero Founder/Admin approval**.

Canonical one-line flow:

`Google Login -> Upload/Google Drive -> quarantine/materialize -> security + structural validation -> INPUT_SAFE -> auto-create exactly one customer-owned Job -> analyze/tasks/scheduler/render -> B2 locked output -> preview + final price + QR -> SePay -> authorized download`

For a New Render flow, successful authenticated submission of a supported input is the customer's render intent. There is no separate Founder/Admin approval and no mandatory customer `Start render` confirmation after `INPUT_SAFE`.

## 2. Customer Login Gate

Customer opens `cws-portal.vercel.app`.

- Google OAuth through Supabase is required before Upload/Drive controls become operational.
- If a valid customer session already exists, restore it and continue.
- Customer and Admin/Host authentication remain separate.
- A customer session authenticates the user; Backend still enforces object ownership server-side.

## 3. Submit Input

Authenticated customer chooses exactly one supported source:

1. direct upload: `.blend`, `.zip`, `.rar`; or
2. approved Google Drive file link.

The input is **untrusted** until the complete input-security gate succeeds.

Suggested customer-visible states:

`selected -> uploading/resolving -> materializing -> checking file -> security scanning -> preparing render`

Do not expose internal security details that help an attacker bypass controls.

## 4. Canonical Quarantine / Materialization

All accepted inputs converge into canonical CWS storage before Worker processing.

### Direct upload

`authenticated upload -> canonical B2 quarantine/untrusted object -> validation pipeline`

### Google Drive

`validated Google Drive URL -> bounded server-side download -> canonical B2 quarantine/untrusted object -> validation pipeline`

Rules:

- Google Drive is an ingestion source only; Worker does not depend on the external Drive URL.
- Prefer an existing-B2 quarantine prefix/state; do not create another B2 bucket without Founder approval.
- Quarantined/rejected input must not receive Worker download capability.
- Original customer input remains immutable for audit/retry according to retention policy.

## 5. Mandatory Input Security Gate Before Job Creation

No production Job may be created until Backend has established `INPUT_SAFE`.

Required layers are cumulative; one layer does not replace another:

1. authenticated customer identity;
2. server-side input ownership binding;
3. allowed input source/provider semantics;
4. SSRF-aware Google Drive URL/redirect handling;
5. bounded redirects, timeout and download size;
6. extension allowlist;
7. content/file-signature validation;
8. anti-malware scan using an approved self-hosted/local scanning path;
9. ZIP/RAR structural safety when applicable;
10. Blender safety rules, including untrusted Python autoexec disabled;
11. deterministic final verdict.

Verdicts:

- `CLEAN + all structural checks PASS -> INPUT_SAFE`
- `INFECTED -> INPUT_REJECTED -> no Job`
- `SCAN_ERROR / SCAN_TIMEOUT / signature database unavailable / UNKNOWN -> fail closed -> no Job`
- signature mismatch / unsupported format / oversize / unsafe archive -> no Job

A frontend flag or client request can never assert `INPUT_SAFE` authoritatively.

## 6. Anti-Malware Rule

Customer project files are potentially hostile.

Canonical direction:

- evaluate/use an approved local/self-hosted malware scanner such as ClamAV inside existing approved infrastructure when production constraints permit;
- do not upload customer project files to public VirusTotal-style services without a separate Founder decision because customer files may contain private/commercial work;
- malware scanning is an additional layer, not a replacement for signature validation, archive safety, sandboxing or Blender execution controls;
- scanner failure is never interpreted as CLEAN.

Security audit metadata may include object/hash/reference, scan time, scanner/version, signature database version/date, verdict and bounded error code. Do not log file contents or customer secrets.

## 7. Google Drive Security

Google Drive inputs must retain current protections and converge on the same security gate as direct uploads.

Required behavior:

- accept only approved Google Drive semantics;
- validate file/folder resolution rules;
- bound redirects to approved Google download hosts;
- enforce timeout and size/resource limits;
- validate actual content/signature rather than filename alone;
- materialize to canonical B2 before Worker processing;
- run anti-malware and structural validation after materialization;
- Drive availability/shareability is not equivalent to malware safety.

## 8. ZIP / RAR Security

Archives remain hostile even after a malware CLEAN result.

Before or during bounded sandbox extraction enforce, as applicable:

- path traversal prevention;
- absolute/device-path rejection;
- sandbox escape prevention;
- symlink/special-file handling;
- bounded extracted bytes;
- bounded file count;
- bounded nesting;
- decompression-bomb/compression-ratio limits;
- time/resource limits;
- deterministic `.blend` selection;
- no execution of extracted content during validation.

Where the approved scanner supports it safely, scan the raw archive and the bounded extracted contents as required by the implemented threat model.

## 9. Blender Safety

A `.blend` file is untrusted even when malware scan is CLEAN.

Canonical preparation:

`immutable original -> read-only/safe analysis -> working copy -> deterministic safe optimization -> post-opt validation -> render`

Rules:

- untrusted Blender Python autoexec stays OFF;
- do not execute embedded customer scripts during security validation;
- optimization may not silently change customer visual/animation semantics;
- if optimization cannot be proven safe, use the unoptimized working copy.

## 10. INPUT_SAFE -> Automatic Job Creation

Once Backend records authoritative `INPUT_SAFE`, the system automatically creates **exactly one customer-owned Job** for that new-render input intent.

There is no mandatory `Start render` button after this point.

Job creation must be:

- server-side;
- bound to authenticated customer ownership;
- allowed only for `INPUT_SAFE` input;
- idempotent under retries/reconnects/callback duplication;
- unable to create duplicate Jobs for the same accepted submission intent;
- unable to use another customer's input;
- impossible for quarantined/rejected input.

Customer UI progresses automatically from security/preparation into the real Job/progress screen.

## 11. Analyze Work + Durable Task Graph

After Job creation:

1. Backend analyzes the project enough to determine authoritative frame/work range and runnable dependencies.
2. Durable non-overlapping Tasks cover the exact work interval.
3. PostgreSQL atomic claim + lease + generation fencing remains authoritative.
4. One Task/frame has only one active authoritative Worker at a time.
5. Metadata/reporting must remain fenced to the current Worker/task/generation.

No Founder/Admin action is part of this flow.

## 12. Adaptive Deadline Scheduling

Customer does not select render tier, Worker count, GPU or CPU.

Canonical behavior:

- start useful production work immediately;
- desired initial capacity is 10 eligible Workers when runnable Tasks and real fleet capacity permit;
- completed real Tasks/frames provide runtime evidence;
- project final completion against the internal <=45-minute target, including finalization reserve;
- increase desired capacity when projected completion is at risk;
- use configurable 20–30% safety capacity and round required Worker count upward;
- never fabricate unavailable capacity;
- no concurrent duplicate frame ownership.

The 45-minute target is internal and includes required collection/validation/assembly/encode, not only frame rendering.

## 13. Worker Execution

Canonical Worker Task lifecycle:

`atomic claim -> scoped input capability -> bounded preparation/extraction -> Blender preflight -> safe working copy -> real render -> output upload/verify -> task completion -> cleanup`

Node Agent remains resident supervisor; Worker Engine remains task-scoped.

No Worker receives Supabase service-role or long-lived B2 master credentials.

## 14. Output / Preview / Pricing / Payment

After all required render/finalization work succeeds:

1. validate final output;
2. upload/verify full output in B2;
3. mark full output LOCKED;
4. create 3–5 representative real watermarked previews;
5. calculate final price from verified runtime/cost basis using approved 2.5x multiplier;
6. create payment record + unique reference/content + MB Bank QR;
7. show preview + final price + QR to customer.

There is no customer preview-approval gate before payment.

SePay must verify exact reference/content + exact amount idempotently before Backend sets `PAID`.

Only `PAID` authorizes the narrow download capability.

Do not rerender/repackage/reupload an already-completed full output merely because payment completed.

## 15. Download + History

After `PAID`:

- Backend issues a narrow job/customer-scoped download capability;
- customer downloads the existing full output;
- delivery/audit/retention/cleanup follows active policy;
- customer History shows only that customer's Jobs;
- reopening a running/completed Job reattaches to the same Job and does not create another Job.

## 16. Canonical End-to-End Order

```text
GOOGLE LOGIN
    ↓
AUTHENTICATED CUSTOMER
    ↓
UPLOAD .blend/.zip/.rar OR APPROVED GOOGLE DRIVE
    ↓
MATERIALIZE TO B2 QUARANTINE / UNTRUSTED STATE
    ↓
OWNERSHIP + URL/SSRF + SIZE + SIGNATURE VALIDATION
    ↓
ANTI-MALWARE SCAN
    ↓
ARCHIVE / BLENDER STRUCTURAL SAFETY
    ↓
INPUT_SAFE
    ↓
AUTO-CREATE EXACTLY ONE CUSTOMER-OWNED JOB
    ↓
ANALYZE PROJECT / AUTHORITATIVE FRAME-WORK RANGE
    ↓
DURABLE NON-OVERLAPPING TASK GRAPH
    ↓
ADAPTIVE DEADLINE SCHEDULER
    ↓
REAL WORKER / BLENDER EXECUTION
    ↓
COLLECT + VALIDATE + FINALIZE
    ↓
FULL B2 OUTPUT LOCKED
    ↓
3–5 WATERMARKED PREVIEWS
    ↓
FINAL PRICE + PAYMENT REFERENCE + MB QR
    ↓
SEPAY EXACT VERIFICATION
    ↓
PAID
    ↓
AUTHORIZED DOWNLOAD
    ↓
HISTORY / AUDIT / CLEANUP
```

## 17. Binding Rules

- Google Login is the first operational Customer gate.
- Normal Customer runtime requires zero Founder/Admin approval.
- A supported authenticated New Render submission expresses render intent; no later mandatory Start Render confirmation exists.
- **No Job before authoritative INPUT_SAFE.**
- Quarantined/rejected/unknown-scan input cannot create or reach a Worker Job.
- Scanner unavailable/error/timeout fails closed.
- Malware CLEAN alone does not prove archive/Blender safety.
- Customer cannot choose tier/Worker count/GPU/CPU.
- Customer original remains immutable.
- Full output exists and is locked before payment.
- Exact SePay verification is required before download unlock.
- Normal runtime does not depend on ChatGPT/Codex/Founder/Admin.

## 18. Acceptance / Definition of Done

Customer workflow is production-verified only when a real authenticated customer can complete, in order:

1. Google login;
2. direct upload or approved Drive input;
3. canonical quarantine/materialization;
4. ownership/provider/size/signature checks;
5. real anti-malware verdict;
6. archive/Blender safety checks as applicable;
7. authoritative `INPUT_SAFE`;
8. automatic exactly-one Job creation with no Founder/Admin and no mandatory Start Render click;
9. real project analysis + exact durable Task Graph;
10. real Worker rendering with fenced ownership;
11. adaptive runtime evidence/capacity behavior;
12. real final output validation + B2 lock;
13. real watermarked previews + final price + MB QR;
14. exact/idempotent SePay verification;
15. `PAID`;
16. authorized download;
17. same Job reflected in History.

Builds, unit tests, scanner installation, Vercel/Render READY state, database rows or historical evidence alone do not establish Golden Production E2E.
