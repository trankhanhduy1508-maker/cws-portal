# Founder Decision — Google Drive UX 2026-08-13

> Status: ACTIVE — Founder approved.
> Scope: Customer-facing Google Drive submission UX only.
> This file refines Spec 008 and does not weaken backend validation/security.

## Problem observed in production

Founder observed on the production Customer portal that the Google Drive flow spends too long in a customer-facing link-check/confirmation step before proceeding.

The current UI language/behavior presents a separate "check link" phase even though the backend path performs materially heavier server-side Drive resolution/acquisition work.

This creates unnecessary perceived latency and a poor Customer experience.

## Founder decision

Remove the separate customer-facing Google Drive **check/confirm link** step.

Desired Customer UX:

`Google Login -> paste Google Drive URL -> submit`

The Customer must not be required to wait through a distinct modal/state whose purpose is to "check link" before the canonical backend ingestion flow continues.

## What is removed

Remove only the separate Customer-facing UX concept of:

- "Kiểm tra link" / "Check link";
- a separate confirm-link action after paste;
- a customer-visible preflight step that blocks submission merely to perform Drive resolution.

Do not replace it with another equivalent customer confirmation gate under a different label.

## What remains mandatory

This decision does **not** remove, bypass, defer past `INPUT_SAFE`, or weaken any backend requirement.

After submit, the backend must still perform the canonical deterministic flow, as applicable:

`authenticated submission -> approved Google Drive provider/URL validation -> bounded server-side acquisition -> temporary quarantine/staging -> ownership/SSRF/redirect/timeout/size controls -> content/signature validation -> anti-malware + archive/Blender structural safety -> CLEAN/SAFE -> canonical B2 upload -> object verification -> INPUT_SAFE -> automatic exactly-one customer-owned Job`

Binding invariants:

- Google login remains the first operational gate;
- backend validation/security remains fail-closed;
- frontend cannot assert CLEAN/SAFE or `INPUT_SAFE`;
- no canonical B2 input before mandatory pre-B2 validation/security passes;
- no Job before authoritative `INPUT_SAFE`;
- accepted safe submission automatically creates exactly one customer-owned Job;
- no Founder/Admin approval in normal runtime;
- no mandatory Customer Start Render button;
- no legacy frontend `POST /jobs` fallback;
- a successful accepted response must contain the backend-created `jobId`.

## Error UX requirement

All Google Drive submission errors shown to the Customer must be normalized to a human-readable string.

The UI must never render raw JavaScript objects or text such as:

`[object Object]`

Structured backend/API errors must be converted into bounded customer-safe messages while preserving detailed diagnostics in appropriate internal logs where allowed.

## Implementation direction

The implementation should inspect the existing `GoogleDriveModal.jsx`, `useDriveLink.js`, `RenderService.submitGoogleDrive()` / Drive resolve-acquisition path, and related tests before changing code.

Use the smallest safe implementation that:

1. removes the distinct check/confirm-link interaction;
2. submits the pasted Drive URL directly into the canonical backend flow;
3. keeps existing authentication/security/ownership behavior;
4. keeps the backend-created `jobId` contract;
5. removes any stale UI copy/state that implies a separate link-check gate;
6. normalizes all surfaced errors;
7. adds regression coverage.

## Required regression evidence

At minimum verify:

- no separate customer-facing Drive check/confirm step remains;
- valid pasted Drive URL submits into the existing backend path;
- structured backend errors render as readable strings;
- `[object Object]` cannot appear;
- missing/empty backend `jobId` fails closed;
- no legacy frontend `POST /jobs` fallback is introduced;
- retries do not create a second frontend-created Job;
- relevant frontend tests/build/lint pass.

## Non-goals / boundaries

This decision does not authorize:

- removing Google Drive support;
- removing direct upload support;
- weakening Drive SSRF/provider/security controls;
- changing quarantine/B2/security order;
- changing automatic Job creation semantics;
- changing Scheduler/Worker/payment architecture;
- creating new infrastructure;
- deploying/merging without the normal verification/Founder gate.

## Evidence language

Updating this document means `FOUNDER DECISION SYNCED` only.

The UX change is `CODE VERIFIED` only after implementation + regression tests/build/lint pass.

Production behavior is verified only after the merged/deployed Customer portal is exercised with a real Google-authenticated Drive submission.
