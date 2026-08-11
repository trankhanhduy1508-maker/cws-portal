# CWS MVP Workflow — Canonical Customer Flow

> Updated 2026-08-11. This is the **customer business-workflow source of truth**. Admin/Host workflow is explicitly out of scope for this phase. `CWS_ROADMAP.md` remains the canonical roadmap.

## 1. Product Principle

The customer flow must be simple enough to explain in one line:

`Google Login -> Submit file -> Validate -> Choose render speed -> Render -> Preview + final price + QR -> SePay -> Download`

The UI may show more operational detail, but it must not invent extra business gates or reorder the real backend lifecycle.

## 2. Canonical Customer UI Journey

### Step 0 — Customer Login Gate

Customer opens `cws-portal.vercel.app`.

- Show CWS identity/value proposition and **one primary action: Continue with Google**.
- Customer Google OAuth is required **before Upload/Drive controls become operational**.
- After successful Supabase session restore, show customer identity in the portal shell.
- Do not mix Admin/Host login into the customer application.
- If a valid customer session already exists, skip the login gate and continue to Step 1.

**Important:** the previous behavior where customers could choose/upload/paste a Drive link first and only be forced to login when pressing Render is no longer canonical.

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

### Step 2 — Input Ready + Render Mode

Only after canonical input is ready, show the render-mode choice.

Customer chooses a **service/speed preference**, not GPU/CPU hardware.

Current product direction:
- Economy
- Balanced/Standard
- Priority

Do not expose Worker/GPU/CPU selection to the customer. Do not add extra modes without an active product decision.

The screen may show an **estimated completion time/range** based on current evidence. It must clearly distinguish estimates from the final charge.

**Final price is not charged or finalized here.**

Primary CTA: **Start render**.

### Step 3 — Create Job

When the authenticated customer presses Start render:

1. Backend re-validates customer session and input ownership.
2. Backend creates exactly one customer-owned Job for the canonical input.
3. Backend creates durable Task/scheduler state.
4. UI transitions to the live job/progress screen using the returned real Job ID.

Never create the production Job before canonical input materialization/validation.

### Step 4 — Prepare + Optimize

Backend/Worker lifecycle:

`claim -> download scoped input -> safe archive extraction if needed -> discover .blend/assets -> Blender preflight -> immutable original -> working copy -> safe optimization -> post-opt validation`

Rules:
- customer original remains immutable;
- no untrusted Blender Python autoexec;
- optimization must be deterministic and semantics-safe;
- if an optimization cannot be proven safe, fall back to the unoptimized working copy;
- archive extraction is bounded and sandboxed.

Customer UI should summarize these states in understandable language such as:

`Preparing project -> Checking scene -> Optimizing safely -> Ready to render`

Do not expose unnecessary internal secrets or infrastructure identifiers.

### Step 5 — Real Render

Worker runs real Blender in background/CLI mode.

UI receives real Backend state/progress only:

`Queued -> Finding machine -> Preparing -> Rendering -> Validating output`

Requirements:
- no fake timers;
- no client-generated progress pretending to be Worker progress;
- progress survives page refresh/reopen by reattaching to real Job ID;
- History/Dashboard can reopen a running job without creating a duplicate.

### Step 6 — Output Lock + Preview + Final Price

After successful render:

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

### Step 7 — Payment Pending

Customer transfers the displayed exact amount with the displayed exact transfer content/reference.

The portal waits for real payment verification. It may show:

`Waiting for payment -> Checking transaction`

Do not unlock from a frontend button, local state, screenshot, or manual client confirmation.

### Step 8 — SePay Verification

SePay webhook reaches Backend.

Before `PAID`, Backend must:
- authenticate/validate the webhook according to the active SePay contract;
- parse unique payment reference/content;
- map it server-side to exactly one payment/job/customer;
- verify exact expected amount;
- process duplicate/replayed events idempotently;
- fail closed on mismatch.

Only the Backend transition to `PAID` authorizes delivery.

### Step 9 — Unlock + Download

After `PAID`:

1. full output already exists in B2 — do not rerender/repackage/reupload merely to deliver it;
2. Backend issues a narrow authorized/job-scoped download capability;
3. customer sees **Download result**;
4. portal records delivery/audit state;
5. retention/cleanup follows active policy;
6. Worker returns/remains idle after its render-side cleanup.

### Step 10 — Customer History

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
Customer selects Economy / Balanced(Standard) / Priority
    ↓
START RENDER
    ↓
CREATE CUSTOMER-OWNED JOB + durable Task
    ↓
Authenticated eligible Worker claims atomically
    ↓
Scoped input download
    ↓
Safe extraction/discovery/preflight
    ↓
Immutable original -> working copy -> safe optimization -> validation
    ↓
REAL Blender render + REAL progress/logs
    ↓
Validate output
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
- Customer chooses service/speed preference, never GPU/CPU hardware.
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

Do not expand the public workflow to OneDrive/Dropbox/direct arbitrary links unless a new active product decision explicitly approves them and the Backend implements real validation/materialization.

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
MODE_SELECT
JOB_CREATING
QUEUED
PREPARING
RENDERING
VALIDATING_OUTPUT
AWAITING_PAYMENT
PAID
COMPLETED
ERROR / CANCELLED
```

Stale labels such as **“Chờ bạn duyệt bản xem trước”** must not remain if no approval action exists.

`PACKAGING` must not imply that CWS waits until after payment to create/upload the full output. If the Backend retains an internal packaging status, UI wording and transition order must remain consistent with the rule that the full deliverable is already uploaded and locked before payment.

## 9. Acceptance / Definition of Done

Customer workflow is not DONE until production evidence proves all of the following in order:

1. customer opens portal and authenticates with Google;
2. unauthenticated user cannot proceed into operational Upload/Drive flow;
3. authenticated customer submits real `.blend/.zip/.rar` or supported Drive input;
4. Backend materializes and validates customer-owned canonical input;
5. customer selects an approved render mode;
6. exactly one real Job is created after input readiness;
7. real Worker claims and runs real Blender;
8. portal shows real progress and can recover/reattach after refresh;
9. real output is validated and locked in B2;
10. real watermarked previews are generated;
11. final price + unique payment content + MB QR appear only after render/output lock;
12. SePay verifies exact reference/content and amount idempotently;
13. Backend marks `PAID`;
14. customer receives an authorized download for the existing full output;
15. customer History reflects the same real Job and payment/result state.

Builds, unit tests, simulations, Vercel READY state, database edits, historical jobs, or Worker heartbeat alone are not Golden Production E2E proof.
