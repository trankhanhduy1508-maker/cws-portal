# Spec 008 — Standard Customer Workflow

> Status: FOUNDER APPROVED — ACTIVE
> Updated: 2026-08-12

## Goal

Make the Customer Portal follow one deterministic production workflow from Google authentication to authorized result download, with zero Founder/Admin approval in normal runtime and a mandatory pre-B2 input-security gate before Job creation.

## Founder Decision — 2026-08-12

The previous active rule:

`INPUT_READY -> customer presses Start render -> create Job`

is superseded.

The previous B2-first quarantine direction is also superseded.

Canonical New Render initiation is now:

`Google Login -> authenticated input submission -> temporary quarantine/staging -> anti-malware + security + structural validation -> CLEAN/SAFE -> canonical B2 upload -> INPUT_SAFE -> automatically create exactly one customer-owned Job`

Submitting a supported file/Drive input while authenticated is the customer's render intent. There is no mandatory second `Start render` confirmation and no Founder/Admin approval between safe input acceptance and Job creation.

Customer still does not choose render tier, Worker count, GPU or CPU.

## Canonical Customer Journey

`Google Login -> Upload .blend/.zip/.rar OR approved Google Drive -> temporary quarantine/staging outside canonical B2 -> ownership/provider/SSRF/size/signature checks -> anti-malware scan -> archive/Blender structural safety -> CLEAN/SAFE -> upload/promote immutable canonical input to B2 -> verify B2 object -> INPUT_SAFE -> auto-create exactly one customer-owned Job -> analyze work -> durable non-overlapping Tasks -> adaptive scheduling -> real Worker render -> collect/finalize -> B2 locked output -> watermarked previews -> final price + MB QR -> SePay exact verification -> PAID -> authorized download -> History`

## Scope

This spec requires:

- Google OAuth as the first operational Customer gate;
- Upload/Drive available only to an authenticated customer session;
- bounded temporary quarantine/staging before canonical B2 input storage;
- anti-malware scan before canonical B2 input upload;
- structural validation before canonical B2 input upload where applicable;
- authoritative server-side `INPUT_SAFE` only after clean canonical B2 object verification;
- automatic idempotent exactly-one Job creation after `INPUT_SAFE`;
- zero Founder/Admin approval in the normal Customer flow;
- no mandatory post-validation `Start render` button;
- Customer cannot choose tier/Worker count/GPU/CPU;
- PostgreSQL task claim/lease/generation fencing remains authoritative;
- output-before-payment and exact SePay verification remain unchanged.

## Non-goals

This spec does not authorize:

- removing Google login;
- uploading infected/unknown-scan input into canonical B2 input storage;
- creating Jobs before `INPUT_SAFE`;
- trusting a frontend-provided CLEAN/SAFE flag;
- automatically modifying/disinfecting an infected customer project and continuing render;
- sending private customer files to public malware scanning services without separate Founder approval;
- replacing signature/archive/Blender safety with antivirus alone;
- creating a new B2 bucket, Render service, Supabase project or other infrastructure without approval;
- changing Scheduler ownership/fencing;
- changing payment method/order;
- changing Worker provisioning architecture;
- changing Admin security requirements for privileged Admin actions.

## Input Trust Model

All Customer inputs are hostile until validated.

States should converge on an equivalent of:

`UPLOADING/RESOLVING -> TEMP_QUARANTINED -> SECURITY_SCANNING -> CLEAN_SAFE -> B2_CANONICALIZED -> INPUT_SAFE | INPUT_REJECTED`

A temporary quarantined/rejected/unknown-scan object must not receive Worker access, must not enter canonical B2 input storage, and must not trigger Job creation.

## Required Security Layers

### Authentication and ownership

- Customer must have a valid Google/Supabase session.
- Backend binds the temporary submission to that authenticated customer.
- Customer A cannot use Customer B's input.

### Google Drive / outbound request safety

- accept approved Google Drive semantics only;
- validate file/folder identifiers and shareability as required;
- enforce approved download hosts/redirects;
- use bounded redirects/timeouts/size;
- prevent arbitrary user-controlled SSRF destinations;
- download into temporary quarantine/staging first;
- do not stream an unscanned Drive project directly into canonical B2 input storage.

### File validation

- extension allowlist: `.blend`, `.zip`, `.rar`;
- validate actual signature/content, not extension alone;
- enforce configured upload/download/resource limits;
- reject malformed/unsupported input.

### Anti-malware

CWS must use an approved deterministic malware-scanning layer before canonical B2 input upload and before `INPUT_SAFE`.

Canonical direction is a local/self-hosted scanner compatible with existing approved infrastructure, with ClamAV as the first implementation candidate to evaluate.

Verdict contract:

- `CLEAN` -> continue remaining structural checks;
- `INFECTED` -> `INPUT_REJECTED`, no canonical B2 upload, no Job;
- scanner unavailable/error/timeout/unknown -> fail closed, no canonical B2 upload, no Job.

A CLEAN malware verdict does not imply archive or Blender semantic safety.

Do not upload customer project content to public VirusTotal-style services without a separate Founder decision.

CWS must not automatically disinfect or modify an infected `.blend/.zip/.rar` and then continue rendering. Reject/isolate the submission instead; automatic repair requires a separate approved design because it can corrupt or alter customer content.

### ZIP/RAR

Archives require bounded structural handling before canonical B2 promotion, including as applicable:

- path traversal prevention;
- absolute/device path rejection;
- sandbox escape prevention;
- symlink/special-file policy;
- bounded file count;
- bounded nesting;
- bounded extracted size/compression ratio;
- decompression-bomb protection;
- time/resource limits;
- deterministic `.blend` selection;
- no execution during validation.

### Blender

Before canonical B2 promotion:

- untrusted Python autoexec remains disabled;
- validation must not execute embedded customer scripts;
- required Blender structural safety must be established without privileged arbitrary execution.

After clean canonicalization:

- canonical B2 original remains immutable;
- use a working copy for safe preparation/optimization;
- semantic/visual changes require deterministic safety; otherwise fall back to the unoptimized working copy.

## Canonical B2 Promotion Contract

Canonical B2 input storage is **trusted-by-validation**, not the first landing zone for customer content.

After all mandatory pre-B2 checks pass:

1. upload/promote the clean immutable file to canonical B2 input storage;
2. verify object integrity and ownership/reference binding;
3. record authoritative `INPUT_SAFE`;
4. only then allow Job creation and Worker-scoped access.

No infected/rejected/unknown-scan submission may be promoted to canonical B2 input storage.

Temporary quarantine uses existing approved infrastructure only. Do not create a new bucket/service merely to implement the state machine without Founder approval.

## Automatic Job Creation Contract

Only authoritative `INPUT_SAFE` may trigger Job creation.

Requirements:

- server-side trigger/path;
- customer ownership revalidated;
- canonical B2 input exists and has passed security verification;
- exactly one Job for one accepted New Render submission intent;
- idempotent under retries, refreshes, reconnects and duplicated completion callbacks;
- quarantined/rejected/unknown input cannot create a Job;
- frontend cannot forge `INPUT_SAFE`;
- no Founder/Admin approval;
- no mandatory customer `Start render` action after validation.

The UI should transition automatically from file checking/security scanning into Job preparation/progress.

## Scheduler / Task Invariants

After automatic Job creation:

- determine authoritative frame/work range;
- create durable non-overlapping Tasks covering exactly the real interval;
- preserve atomic claim + lease + generation fencing;
- one Task/frame has one active authoritative Worker;
- start useful production work without a blocking benchmark-only phase;
- initial desired capacity remains 10 eligible Workers when real capacity permits;
- completed real Tasks/frames supply runtime evidence;
- project final completion against internal <=45-minute final-output target;
- increase desired capacity if at risk;
- use configurable 20–30% safety margin and integer round-up;
- include required collection/validation/assembly/encode in deadline planning.

## Output / Payment Invariants

Canonical order remains:

`real render/finalize -> validate -> full B2 output LOCKED -> 3–5 real watermarked previews -> final price using approved 2.5x multiplier -> unique payment reference/content + MB QR -> SePay exact/idempotent verification -> PAID -> narrow authorized download`

There is no customer preview-approval gate before payment.

## Required Verification

### Input security

Test at minimum:

- unauthenticated input cannot progress;
- valid direct `.blend` clean path scans before B2 and reaches `INPUT_SAFE`;
- valid ZIP clean path scans/validates before B2 and reaches `INPUT_SAFE`;
- valid RAR clean path scans/validates before B2 and reaches `INPUT_SAFE`;
- valid Google Drive clean path downloads to temporary quarantine, scans before B2, then reaches `INPUT_SAFE`;
- signature mismatch -> no canonical B2 upload -> no Job;
- unsupported/oversized input -> no canonical B2 upload -> no Job;
- malware INFECTED -> no canonical B2 upload -> no Job;
- malware scanner error/timeout/unavailable -> no canonical B2 upload -> no Job;
- fake frontend CLEAN/INPUT_SAFE -> rejected;
- ZIP/RAR traversal -> no canonical B2 upload -> no Job;
- archive bomb/resource limit -> no canonical B2 upload -> no Job;
- unsafe Drive redirect -> rejected;
- untrusted Blender autoexec remains disabled;
- infected project is rejected/isolation-handled, not silently modified and rendered.

### Job idempotency / ownership

Test:

- one clean canonical B2 `INPUT_SAFE` acceptance -> exactly one Job;
- repeated safe-completion callback -> same one Job;
- customer refresh/retry -> no duplicate Job;
- Customer A cannot create a Job from Customer B input;
- rejected/quarantined input never creates Job.

### Production evidence

Do not claim Golden E2E from unit tests alone.

Production verification eventually requires a real customer to complete:

1. Google login;
2. real upload/Drive submission;
3. temporary quarantine/staging outside canonical B2 input;
4. real anti-malware + security/structural verdict before B2;
5. clean input upload/promote to canonical B2;
6. canonical object verification + `INPUT_SAFE`;
7. automatic exactly-one Job creation without Founder/Admin or Start Render click;
8. real Task/Worker render;
9. final output lock/previews/price/QR;
10. real SePay verification;
11. authorized download and History.

## Evidence Language

- docs/spec only = DECISION/SPEC SYNCED;
- implementation + tests = CODE VERIFIED;
- scanner + temporary quarantine + B2 promotion + Job integration in deployed environment = INTEGRATION VERIFIED;
- real production Customer flow through download = GOLDEN PRODUCTION E2E VERIFIED.

Do not promote evidence beyond what was actually observed.
