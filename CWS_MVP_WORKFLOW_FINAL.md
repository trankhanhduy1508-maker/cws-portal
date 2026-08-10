# CWS MVP Workflow — Canonical

> Corrected 2026-08-10. This is the customer business-workflow source of truth. `CWS_ROADMAP.md` is the canonical roadmap.

## 1. Canonical End-to-End Order

```text
Google Login
    ↓
Customer Profile / authenticated Supabase session
    ↓
Upload .blend/.zip/.rar OR provide approved Google Drive file link
    ↓
Backend ingests/materializes input into canonical Backblaze B2 storage
    ↓
Validate content/signature, ownership, size and supported input contract
    ↓
CREATE CUSTOMER-OWNED JOB
    ↓
Create durable Task / scheduler state
    ↓
Authenticated eligible Worker claims atomically
    ↓
Worker receives narrow job-scoped input capability
    ↓
If archive: bounded safe extraction in per-job sandbox
    ↓
Discover deterministic primary .blend + required assets
    ↓
Blender preflight / compatibility / dependency / hardware checks
    ↓
Preserve ORIGINAL immutable input
    ↓
Create WORKING COPY
    ↓
Safe deterministic optimization on working copy
    ↓
Validate optimized working copy; fallback safely if optimizer cannot prove safety
    ↓
Run REAL Blender via CLI/background
    ↓
Report REAL progress/logs
    ↓
Validate render output
    ↓
Upload FULL OUTPUT to B2
    ↓
FULL OUTPUT = LOCKED
    ↓
Generate 3–5 representative preview images/frames from REAL output
    ↓
Apply CWS watermark
    ↓
Calculate FINAL PRICE from verified runtime/cost basis × approved 2.5 multiplier
    ↓
Create payment record + unique payment reference + MB QR
    ↓
Customer sees previews + final price + QR
    ↓
Customer transfers payment
    ↓
SePay webhook
    ↓
Backend authenticates webhook and verifies exact payment reference/content + amount + idempotency
    ↓
Payment = PAID
    ↓
Issue authorized/job-scoped download for the already-uploaded FULL OUTPUT
    ↓
Customer downloads result
    ↓
Cleanup / audit / Worker returns idle
```

## 2. Binding Business Rules

- Customer Google Login is required for the MVP.
- **Upload/Drive ingestion and materialize/validation happen before Job creation.**
- A client-supplied file reference alone is never authorization proof; backend must bind input ownership server-side.
- Do not charge before render/previews.
- **There is no customer-approval gate before payment.**
- Do not render/package/upload again after PAID merely to deliver the result.
- Full output is uploaded once, locked before payment, then authorized after PAID.
- Normal runtime state transitions must not require Codex, ChatGPT, or Founder action.
- Production must fail closed; no mock/fake render, progress, payment, output, or local browser state.

## 3. Input Contract

Supported customer inputs:
- `.blend`
- `.zip`
- `.rar`
- approved Google Drive file link

Requirements:
- validate content/signature, not extension alone;
- enforce bounded size/time/resource rules;
- materialize Drive input into canonical storage before production Worker processing;
- reject unsupported/malformed input clearly;
- preserve original uploaded object for audit/retry.

## 4. Archive Safety

ZIP/RAR extraction runs only inside a per-job sandbox.
- reject path traversal, absolute/device paths and sandbox escape;
- bound extracted bytes, file count, nesting, time and resource use;
- reject dangerous links/special files as applicable;
- pin/version extraction tooling and check exit status;
- never build an unsafe shell command from untrusted names;
- deterministic `.blend` selection; ambiguous multiple candidates fail clearly.

## 5. Blender Preflight and Safe Optimization

Customer `.blend` is untrusted. Arbitrary Python auto-execution is disabled unless an explicit trusted contract permits it.

Canonical preparation:

`immutable original -> read-only analyzer -> working copy -> safe optimizer -> post-opt validation -> render`

Safe automatic operations may include path normalization/remapping when certain, job-scoped output/temp paths, clean background startup, device/VRAM compatibility checks, and scene inventory.

Do not automatically change customer semantics/quality by reducing resolution/samples/frame range, changing engine, disabling visual features, lowering subdivision, resizing source textures, deleting objects/materials, applying modifiers, changing cameras/lights/color management, or enabling untrusted autoexec.

If optimization fails or safety cannot be proven, use the unoptimized working copy rather than corrupting the job.

## 6. Worker Execution

- authenticated Backend gateway only;
- stable Worker identity;
- atomic capability-aware claim;
- lease/generation fencing;
- narrow task/object-scoped storage capabilities;
- real Blender PID/exit/progress evidence;
- bounded retry/failure handling;
- cleanup and return to idle.

## 7. Output / Preview / Pricing

After successful render:
1. validate expected output;
2. upload full output to B2;
3. verify remote artifact/integrity as required;
4. keep full output locked;
5. generate 3–5 real watermarked previews;
6. calculate final customer price from verified cost/runtime evidence using the approved **2.5x multiplier**;
7. create payment record/reference + MB QR in the same business stage.

This document does not establish a new hard-coded base cost/rate. Use the current configured/approved cost source.

## 8. SePay / Delivery

Before PAID/unlock:
- authenticate webhook;
- parse unique payment reference/content;
- map it server-side to exactly one payment/job/customer;
- verify expected amount;
- handle duplicates/replays idempotently;
- fail closed on mismatch.

Only PAID authorizes the final B2 delivery capability.

## 9. Acceptance

Golden Production E2E requires a real current trace from authenticated customer input through authorized download. Builds, unit tests, simulations, deployment READY state, historical jobs, database edits, or Worker heartbeat alone are not sufficient.
