# CWS MVP Workflow — Canonical Customer Flow

> Updated 2026-08-11. This is the **customer business-workflow source of truth**. Admin/Host workflow is explicitly out of scope for this phase. `CWS_ROADMAP.md` remains the canonical roadmap.

## 1. Product Principle

The customer flow must be simple enough to explain in one line:

`Google Login -> Submit file -> Validate -> Start render -> CWS automatically allocates Workers -> Render/finalize -> Preview + final price + QR -> SePay -> Download`

The UI may show more operational detail, but it must not invent extra business gates or reorder the real backend lifecycle.

The customer render speed/tier feature is removed from the active product. Customer does not choose a render tier, Worker count, GPU or CPU.

## 2. Canonical Customer UI Journey

### Step 0 — Customer Login Gate

Customer opens `cws-portal.vercel.app`.

- Show CWS identity/value proposition and **one primary action: Continue with Google**.
- Customer Google OAuth is required **before Upload/Drive controls become operational**.
- After successful Supabase session restore, show customer identity in the portal shell.
- Do not mix Admin/Host login into the customer application.
- If a valid customer session already exists, skip the login gate and continue to Step 1.

### Step 1 — New Render Job / Input

Authenticated customer chooses exactly one input source:

1. Upload `.blend`, `.zip`, or `.rar`; or
2. Paste an approved Google Drive file link.

The screen must show real input state:

`selected -> uploading/resolving -> materializing -> validating -> ready`

Do not advance until Backend returns a canonical, customer-owned input reference.

For local upload:
- upload/resume according to the active upload contract;
- materialize canonical input in B2;
- validate signature/content, supported format, size/resource limits and ownership.

For Google Drive:
- verify the link is supported/shareable;
- Backend downloads/materializes it into canonical B2 storage;
- customer/Worker must not depend on the external Drive URL after materialization.

### Step 2 — Input Ready + Start Render

Only after canonical input is ready, show the primary CTA: **Start render**.

There is no customer render speed/tier selection.

Customer does not choose:
- a render service/speed tier;
- Worker count;
- GPU/CPU;
- benchmark strategy.

CWS owns capacity planning automatically. Active frontend/API/domain/persistence must not require a customer tier identifier.

### Step 3 — Create Job + Analyze Work

When the authenticated customer presses Start render:

1. Backend re-validates customer session and input ownership.
2. Backend creates exactly one customer-owned Job for the canonical input.
3. Backend analyzes the project enough to determine frame/work range and runnable dependencies.
4. Backend creates durable non-overlapping Tasks.
5. UI transitions to the live job/progress screen using the returned real Job ID.

Never create the production Job before canonical input materialization/validation.

### Step 4 — Adaptive Deadline Scheduling

CWS uses a work-conserving deadline scheduler. It must not wait for a separate benchmark-only render phase before useful work begins.

Canonical behavior:

1. As soon as runnable Tasks exist, Scheduler targets an initial wave of **10 eligible Workers**, subject to real fleet capacity.
2. Each Worker atomically claims a distinct Task/frame. Two active Workers must not own/render the same Task/frame concurrently.
3. Workers immediately perform real production work.
4. The first completed real Tasks/frames become runtime evidence for the same Job.
5. Backend calculates projected final completion from observed runtime, remaining work and reserved finalization overhead.
6. If projected final completion is at risk of exceeding the internal **45-minute target**, desired Worker count increases as eligible capacity permits.
7. Capacity planning adds a configurable safety margin initially in the **20–30%** range and rounds the required Worker count **up** to a whole integer.
8. Failed/expired Tasks may be reassigned only after the previous lease is no longer authoritative and generation fencing is advanced according to the canonical scheduler contract.

Do not dedicate one Worker solely to a synthetic benchmark while all other work waits. Useful production work itself supplies the measurements.

### Step 5 — Prepare + Optimize + Real Render

Backend/Worker lifecycle for each assigned Task:

`claim -> scoped input download -> safe archive extraction if needed -> discover .blend/assets -> Blender preflight -> immutable original -> working copy -> safe optimization -> post-opt validation -> real Blender task/frame render`

Rules:
- customer original remains immutable;
- no untrusted Blender Python autoexec;
- optimization must be deterministic and semantics-safe;
- if an optimization cannot be proven safe, fall back to the unoptimized working copy;
- archive extraction is bounded and sandboxed;
- no fake timers or client-generated progress;
- progress survives page refresh/reopen by reattaching to the same real Job ID.

Customer UI may summarize states such as:

`Preparing project -> Distributing work -> Rendering -> Finalizing`

### Step 6 — Collect + Finalize Within the Deadline Budget

The 45-minute scheduling target is **not frame-render-only**.

Internal planning must reserve time for required downstream work, including as applicable:
- project analysis/preparation and dispatch overhead;
- remaining frame/task rendering;
- retry/straggler reserve;
- output collection and validation;
- animation frame assembly/encode/finalization.

If all frames finish but required animation assembly/encode is still running, the Job is not yet final output.

For MVP, CWS parallelizes independent frames/tasks. Distributed tile/sample rendering of one single slow frame is not part of the current canonical scope.

### Step 7 — Output Lock + Preview + Final Price

After successful render/finalization:

1. validate expected output;
2. upload full output to B2;
3. verify remote artifact/integrity as required;
4. set full output **LOCKED**;
5. generate 3–5 representative preview images/frames from the real output;
6. apply CWS watermark;
7. calculate **FINAL PRICE** from verified runtime/cost evidence using the approved **2.5x multiplier**;
8. create payment record + unique payment reference/content + MB Bank QR.

Then customer sees one consolidated result/payment screen:

**Watermarked preview + final price + payment QR + exact transfer content.**

There is **no customer preview-approval gate before payment**.

### Step 8 — Payment Pending

Customer transfers the displayed exact amount with the displayed exact transfer content/reference.

The portal waits for real payment verification. It may show:

`Waiting for payment -> Checking transaction`

Do not unlock from a frontend button, local state, screenshot, or manual client confirmation.

### Step 9 — SePay Verification

SePay webhook reaches Backend.

Before `PAID`, Backend must:
- authenticate/validate the webhook according to the active SePay contract;
- parse unique payment reference/content;
- map it server-side to exactly one payment/job/customer;
- verify exact expected amount;
- process duplicate/replayed events idempotently;
- fail closed on mismatch.

Only the Backend transition to `PAID` authorizes delivery.

### Step 10 — Unlock + Download

After `PAID`:

1. full output already exists in B2 — do not rerender/repackage/reupload merely to deliver it;
2. Backend issues a narrow authorized/job-scoped download capability;
3. customer sees **Download result**;
4. portal records delivery/audit state;
5. retention/cleanup follows active policy;
6. Workers return/remain idle after render-side cleanup.

### Step 11 — Customer History

Authenticated customer can see their own jobs only:

- current status;
- file/project name;
- created time;
- payment state;
- completed result/download when authorized.

Opening a running historical job reattaches to it. It must not create a new Job.

## 3. Canonical End-to-End Backend Order

```text
AUTHENTICATED CUSTOMER SESSION
    ↓
Upload .blend/.zip/.rar OR approved Google Drive link
    ↓
Backend materializes canonical input into B2
    ↓
Validate content/signature + ownership + supported contract
    ↓
INPUT_READY
    ↓
START RENDER
    ↓
CREATE CUSTOMER-OWNED JOB
    ↓
Analyze frame/work range
    ↓
Create durable non-overlapping Tasks
    ↓
Initial desired capacity = 10 eligible Workers
    ↓
Atomic distinct Task claims + real Blender work starts immediately
    ↓
First real completed Tasks/frames provide observed runtime
    ↓
Project final completion time
    ↓
If 45-minute target at risk: increase desired Worker count + safety margin
    ↓
Continue real parallel render with no concurrent duplicate Task/frame ownership
    ↓
Collect + validate outputs
    ↓
Animation assembly/encode/finalization if required
    ↓
Upload FULL OUTPUT to B2 + verify artifact
    ↓
FULL OUTPUT LOCKED
    ↓
3–5 real watermarked previews
    ↓
FINAL PRICE = verified cost/runtime basis × approved 2.5 multiplier
    ↓
Payment record + unique reference/content + MB QR
    ↓
Customer sees preview + final price + QR
    ↓
SePay exact reference/content + exact amount + idempotency verification
    ↓
PAID
    ↓
Authorized B2 download
    ↓
Customer history / audit / cleanup
```

## 4. Binding Business Rules

- Customer Google Login is the first operational gate.
- Upload/Drive controls belong to the authenticated customer workflow.
- **Materialize/validate input before Job creation.**
- A client-supplied file reference or Drive URL alone is never authorization proof.
- Customer render speed/tier selection is removed; customer also does not choose Worker count or hardware.
- Initial scheduling target is 10 eligible Workers for runnable render Tasks when fleet capacity permits.
- Use completed real work as runtime evidence; do not block on a benchmark-only phase.
- Scale capacity upward when projected final completion threatens the 45-minute target.
- Apply configurable 20–30% safety capacity and round required Worker count up to an integer.
- One Task/frame has only one active authoritative Worker at a time.
- The 45-minute target includes required finalization/assembly/encode, not only frame rendering.
- Do not charge before real render/output/previews.
- There is **no customer approval gate** between preview and payment.
- Full output is uploaded once, locked before payment, then authorized after `PAID`.
- Do not rerender/repackage/reupload after `PAID` merely to deliver an existing output.
- Normal runtime state transitions must not require Codex, ChatGPT, Founder or Admin intervention.
- Production fails closed: no mock/fake render, fake progress, fake payment, fake output, or browser-only authorization.

## 5. Input Contract

Supported MVP input:
- `.blend`
- `.zip`
- `.rar`
- approved Google Drive file link

Requirements:
- validate content/signature, not extension alone;
- enforce bounded size/time/resource rules;
- materialize Drive input into canonical storage before Worker processing;
- reject unsupported/malformed input clearly;
- preserve original uploaded object for audit/retry.

Do not expand the public workflow to unapproved external-link sources unless a new active product decision explicitly approves them and the Backend implements real validation/materialization.

## 6. Archive Safety

ZIP/RAR extraction runs only inside a per-job sandbox.

- reject path traversal, absolute/device paths and sandbox escape;
- bound extracted bytes, file count, nesting, time and resource use;
- reject dangerous links/special files as applicable;
- pin/version extraction tooling and check exit status;
- never build unsafe shell commands from untrusted names;
- deterministic `.blend` selection; ambiguous multiple candidates fail clearly.

## 7. Safe Blender Preparation

Customer `.blend` is untrusted. Arbitrary Python auto-execution remains disabled unless an explicit trusted contract permits it.

Canonical preparation:

`immutable original -> read-only analyzer -> working copy -> safe optimizer -> post-opt validation -> render`

Do not automatically alter customer semantics/quality by reducing resolution/samples/frame range, changing engine, disabling visual features, lowering subdivision, resizing source textures, deleting objects/materials, applying modifiers, changing cameras/lights/color management, or enabling untrusted autoexec.

## 8. Customer-Facing State Model

The customer UI should converge on these product states even if the Backend has more granular internal states:

```text
LOGIN_REQUIRED
INPUT_SELECT
INPUT_PROCESSING
INPUT_READY
JOB_CREATING
ANALYZING_PROJECT
DISTRIBUTING_WORK
RENDERING
FINALIZING
VALIDATING_OUTPUT
AWAITING_PAYMENT
PAID
COMPLETED
ERROR / CANCELLED
```

No customer render-tier selection state may remain as a required gate.

Stale labels such as **“Chờ bạn duyệt bản xem trước”** must not remain if no approval action exists.

`PACKAGING` must not imply that CWS waits until after payment to create/upload the full output. If the Backend retains an internal packaging status, UI wording and transition order must remain consistent with the rule that the full deliverable is already uploaded and locked before payment.

## 9. Acceptance / Definition of Done

Customer workflow is not DONE until production evidence proves all of the following in order:

1. customer opens portal and authenticates with Google;
2. unauthenticated user cannot proceed into operational Upload/Drive flow;
3. authenticated customer submits real `.blend/.zip/.rar` or supported Drive input;
4. Backend materializes and validates customer-owned canonical input;
5. customer starts render with no render speed/tier choice;
6. exactly one real Job is created after input readiness;
7. Backend analyzes frame/work range and creates non-overlapping durable Tasks;
8. initial real Worker wave begins useful rendering without a blocking benchmark-only phase;
9. distinct Worker ownership prevents concurrent duplicate Task/frame rendering;
10. observed real task/frame runtimes drive projected completion and adaptive capacity decisions;
11. CWS can increase Worker target when the 45-minute final-output target is threatened;
12. real output collection/validation and required animation assembly/encode complete;
13. real output is validated and locked in B2;
14. real watermarked previews are generated;
15. final price + unique payment content + MB QR appear only after render/output lock;
16. SePay verifies exact reference/content and amount idempotently;
17. Backend marks `PAID`;
18. customer receives an authorized download for the existing full output;
19. customer History reflects the same real Job and payment/result state.

Builds, unit tests, simulations, Vercel READY state, database edits, historical jobs, or Worker heartbeat alone are not Golden Production E2E proof.
