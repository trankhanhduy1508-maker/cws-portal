# CWS MVP Workflow — Canonical Customer Flow

> Updated 2026-08-12. This is the **customer business-workflow source of truth**. It supersedes the previous active flow that required a customer-visible `Start render` gate after input validation and the previous B2-first input-quarantine order. `CWS_ROADMAP.md` remains the canonical roadmap.

## 1. Product Principle

The normal Customer flow must be automatic after authenticated input submission and must require **zero Founder/Admin approval**.

Canonical one-line flow:

`Google Login -> Upload/Google Drive -> temporary quarantine/staging -> anti-malware + security + structural validation -> CLEAN/SAFE -> upload canonical input to B2 -> INPUT_SAFE -> auto-create exactly one customer-owned Job -> analyze/tasks/scheduler/render -> B2 locked output -> preview + final price + QR -> SePay -> authorized download`

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

`selected -> uploading/resolving -> temporary quarantine -> checking file -> security scanning -> preparing render`

Do not expose internal security details that help an attacker bypass controls.

## 4. Temporary Quarantine Before Canonical B2

**No customer input may enter canonical B2 input storage before the mandatory pre-B2 security gate succeeds.**

All accepted inputs first land in a bounded, non-Worker-accessible **temporary quarantine/staging area outside canonical B2 input storage** using existing approved infrastructure.

### Direct upload

`authenticated upload -> temporary quarantine/staging -> security pipeline -> CLEAN/SAFE -> canonical B2 input upload`

### Google Drive

`validated Google Drive URL -> bounded server-side download to temporary quarantine/staging -> security pipeline -> CLEAN/SAFE -> canonical B2 input upload`

Rules:

- Google Drive is an ingestion source only; Worker does not depend on the external Drive URL.
- Temporary quarantine must be bounded by size/time/resource policy and must not be exposed to Workers or customers as canonical input.
- Do not create another B2 bucket, storage service or infrastructure resource without Founder approval.
- Infected/rejected/unknown-scan input must **not** be promoted/uploaded into canonical B2 input storage.
- Temporary quarantined files must be deleted or retained only according to an explicit bounded security/audit policy; do not keep malicious files indefinitely by default.
- Customer original remains immutable while under validation; CWS does not silently rewrite or “clean” the customer project and continue.

## 5. Mandatory Pre-B2 Input Security Gate

No canonical B2 input object and no production Job may be created until the Backend completes the required pre-B2 security checks.

Required layers are cumulative; one layer does not replace another:

1. authenticated customer identity;
2. server-side input ownership binding;
3. allowed input source/provider semantics;
4. SSRF-aware Google Drive URL/redirect handling;
5. bounded redirects, timeout and download/upload size;
6. extension allowlist;
7. content/file-signature validation;
8. anti-malware scan using an approved self-hosted/local scanning path;
9. ZIP/RAR structural safety when applicable;
10. Blender safety rules, including untrusted Python autoexec disabled;
11. deterministic final security verdict.

Verdicts:

- `CLEAN + all required structural checks PASS -> promote/upload to canonical B2 -> INPUT_SAFE`
- `INFECTED -> INPUT_REJECTED -> no canonical B2 upload -> no Job`
- `SCAN_ERROR / SCAN_TIMEOUT / signature database unavailable / UNKNOWN -> fail closed -> no canonical B2 upload -> no Job`
- signature mismatch / unsupported format / oversize / unsafe archive -> no canonical B2 upload -> no Job

A frontend flag or client request can never assert `CLEAN` or `INPUT_SAFE` authoritatively.

## 6. Anti-Malware Rule

Customer project files are potentially hostile.

Canonical direction:

- evaluate/use an approved local/self-hosted malware scanner such as ClamAV inside existing approved infrastructure when production constraints permit;
- scan the temporary quarantined file **before** canonical B2 input upload;
- do not upload customer project files to public VirusTotal-style services without a separate Founder decision because customer files may contain private/commercial work;
- malware scanning is an additional layer, not a replacement for signature validation, archive safety, sandboxing or Blender execution controls;
- scanner failure is never interpreted as CLEAN;
- if malware is detected, reject/isolate the submission rather than automatically modifying the customer's `.blend/.zip/.rar` and continuing.

CWS must not claim to “disinfect” and render a modified customer project automatically. Automatic repair may corrupt project data or change customer content and requires a separate Founder-approved design.

Security audit metadata may include submission/input hash/reference, scan time, scanner/version, signature database version/date, verdict and bounded error code. Do not log file contents or customer secrets.

## 7. Google Drive Security

Google Drive inputs must retain current protections and converge on the same pre-B2 security gate as direct uploads.

Required behavior:

- accept only approved Google Drive semantics;
- validate file/folder resolution rules;
- bound redirects to approved Google download hosts;
- enforce timeout and size/resource limits;
- download first into temporary quarantine/staging, not directly into canonical B2 input;
- validate actual content/signature rather than filename alone;
- run anti-malware and structural validation on the quarantined copy;
- only after CLEAN/SAFE verdict, upload/promote the input into canonical B2 storage;
- Drive availability/shareability is not equivalent to malware safety.

## 8. ZIP / RAR Security

Archives remain hostile even after a malware CLEAN result.

Before canonical B2 promotion, bounded sandbox inspection/extraction must enforce, as applicable:

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

Before canonical B2 promotion, validation must establish the required Blender safety properties without executing untrusted embedded scripts.

Canonical post-acceptance preparation remains:

`immutable canonical B2 original -> read-only/safe analysis -> working copy -> deterministic safe optimization -> post-opt validation -> render`

Rules:

- untrusted Blender Python autoexec stays OFF;
- do not execute embedded customer scripts during security validation;
- optimization may not silently change customer visual/animation semantics;
- if optimization cannot be proven safe, use the unoptimized working copy.

## 10. CLEAN/SAFE -> Canonical B2 -> INPUT_SAFE -> Automatic Job Creation

After the temporary quarantined submission passes all mandatory security/structural checks:

1. Backend uploads/promotes the clean immutable input into canonical B2 input storage;
2. Backend verifies canonical B2 object integrity/ownership;
3. Backend records authoritative `INPUT_SAFE`;
4. system automatically creates **exactly one customer-owned Job** for that New Render submission intent.

There is no mandatory `Start render` button after this point.

Job creation must be:

- server-side;
- bound to authenticated customer ownership;
- allowed only for authoritative `INPUT_SAFE` canonical B2 input;
- idempotent under retries/reconnects/callback duplication;
- unable to create duplicate Jobs for the same accepted submission intent;
- unable to use another customer's input;
- impossible for quarantined/rejected/unknown-scan input.

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

`atomic claim -> scoped canonical B2 input capability -> bounded preparation/extraction -> Blender preflight -> safe working copy -> real render -> output upload/verify -> task completion -> cleanup`

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
TEMPORARY QUARANTINE / STAGING OUTSIDE CANONICAL B2 INPUT
    ↓
OWNERSHIP + URL/SSRF + SIZE + SIGNATURE VALIDATION
    ↓
ANTI-MALWARE SCAN
    ↓
ARCHIVE / BLENDER STRUCTURAL SAFETY
    ↓
CLEAN / SAFE VERDICT
    ↓
UPLOAD / PROMOTE IMMUTABLE INPUT TO CANONICAL B2
    ↓
VERIFY B2 OBJECT + RECORD INPUT_SAFE
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
- **No customer input enters canonical B2 input storage before the mandatory pre-B2 security scan/validation passes.**
- **No Job before authoritative INPUT_SAFE.**
- Infected/rejected/unknown-scan input cannot be promoted to canonical B2 and cannot reach a Worker Job.
- Scanner unavailable/error/timeout fails closed.
- Malware CLEAN alone does not prove archive/Blender safety.
- CWS does not automatically disinfect/modify infected customer projects and continue rendering.
- Customer cannot choose tier/Worker count/GPU/CPU.
- Customer original remains immutable after clean canonicalization.
- Full output exists and is locked before payment.
- Exact SePay verification is required before download unlock.
- Normal runtime does not depend on ChatGPT/Codex/Founder/Admin.

## 18. Acceptance / Definition of Done

Customer workflow is production-verified only when a real authenticated customer can complete, in order:

1. Google login;
2. direct upload or approved Drive input;
3. temporary quarantine/staging outside canonical B2 input;
4. ownership/provider/size/signature checks;
5. real anti-malware verdict before canonical B2 upload;
6. archive/Blender safety checks as applicable;
7. CLEAN/SAFE input is uploaded/promoted to canonical B2;
8. canonical B2 integrity/ownership is verified and authoritative `INPUT_SAFE` recorded;
9. automatic exactly-one Job creation with no Founder/Admin and no mandatory Start Render click;
10. real project analysis + exact durable Task Graph;
11. real Worker rendering with fenced ownership;
12. adaptive runtime evidence/capacity behavior;
13. real final output validation + B2 lock;
14. real watermarked previews + final price + MB QR;
15. exact/idempotent SePay verification;
16. `PAID`;
17. authorized download;
18. same Job reflected in History.

Builds, unit tests, scanner installation, Vercel/Render READY state, database rows or historical evidence alone do not establish Golden Production E2E.
