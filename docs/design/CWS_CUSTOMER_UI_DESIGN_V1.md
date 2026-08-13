# CWS Customer UI Design V1

> Status: Founder-approved visual direction for the Customer portal.
> Scope: customer-facing presentation and interaction quality only.
> Priority: fast facelift after current functional behavior is preserved.
> This document does **not** override `CURRENT_STATUS.md`, `DECISIONS.md`, `CWS_MVP_WORKFLOW_FINAL.md`, active specs, security rules, or backend contracts.

## 1. Goal

Make `cws-portal.vercel.app` look and feel like a professional render workspace instead of a demo UI, without changing the approved Customer business workflow.

Visual direction:

**Professional Render Workspace** — dark, clean, restrained, high-trust, tool-like rather than marketing-heavy.

Reference qualities:

- Vercel/Geist: typography, spacing, hierarchy, restraint;
- Linear-style workspace clarity: dense enough to be useful, never cluttered;
- Frame/render-tool feel: obvious project state, progress and next action.

Avoid:

- excessive gradients;
- decorative glass effects everywhere;
- multiple competing accent colors;
- oversized marketing sections inside the working app;
- visual effects that slow the interface;
- UI changes that invent new product steps.

## 2. Non-negotiable product workflow

The UI must preserve the current canonical Customer flow:

`Google Login -> authenticated Upload/Google Drive -> temporary quarantine/security validation -> CLEAN/SAFE -> canonical B2 -> INPUT_SAFE -> exactly one automatic Job -> progress/render -> payment -> download`

Do not add or restore:

- mandatory `Start Render` after a valid submission;
- Founder/Admin approval in normal Customer runtime;
- customer GPU/CPU/Worker-count/tier selection;
- legacy frontend `POST /jobs` creation;
- any UI control that bypasses backend security authority.

## 3. Design principles

### 3.1 One screen, one primary goal

Each main screen should have one obvious primary action.

For New Render:

- primary: Upload project;
- secondary input path: Google Drive URL;
- no separate check/confirm/render chain after a supported authenticated submission.

### 3.2 Typography first

Use a modern neutral sans-serif system compatible with the current frontend stack. Prefer Geist when practical.

Requirements:

- strong hierarchy between page title, section title, body, metadata and status;
- avoid tiny grey text;
- mobile input text should remain readable and should not trigger unnecessary browser zoom;
- numerical progress/status values must be easy to scan.

### 3.3 Deliberate grid and spacing

Use a consistent spacing system instead of ad-hoc margins.

Recommended base scale:

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

Main content should have a restrained max-width on desktop and comfortable edge padding on mobile.

### 3.4 Restrained color system

Default workspace: dark neutral surfaces.

Use one primary accent for primary actions and selected states.

Status colors may differentiate success/warning/error/in-progress but must always include text and/or icon; never communicate state through color alone.

### 3.5 State quality is product quality

Design first-class states for:

- signed out;
- empty/new render;
- uploading/resolving;
- security checking;
- preparing;
- rendering with progress;
- finalizing;
- waiting for payment;
- completed;
- failed/rejected;
- network/backend error;
- empty history.

Customer-visible errors must be human-readable. Never render raw objects such as `[object Object]`.

## 4. Customer portal information architecture

Keep the MVP navigation small.

Recommended primary areas:

- New Render
- My Renders / History
- Account / Sign out

Do not expose Admin/Host/Worker operational controls in the Customer portal.

## 5. New Render screen

Target composition:

```text
CWS
Render without stopping your work.

[ Continue with Google ]                     (signed-out state)

------------------------------------------

New Render                                  (authenticated state)

[ Upload project ]
Supports .blend, .zip, .rar

                 OR

[ Google Drive URL                         ]
[ Send Drive link ]

Recent renders
Project             Status             Progress
PhongNgu             Rendering          62%
Example              Completed          Done
```

The real implementation must follow existing product copy and functional contracts where they already exist; this wireframe defines hierarchy, not new backend behavior.

## 6. Upload / Drive interaction

Upload and Drive must feel like two clean input methods for the same New Render intent.

Upload area:

- clear drag/drop target;
- visible supported formats;
- clear selected-file state;
- progress when uploading;
- accessible keyboard/click path.

Drive area:

- one URL input;
- one direct submit action: `Gửi link Drive` or equivalent approved copy;
- no legacy `Kiểm tra link` / `Xác nhận link` phase;
- loading state must show that the system is working without implying success before backend authority confirms it.

## 7. Render status and progress

Status is a core visual component, not an afterthought.

Canonical UI labels may include:

- Preparing
- Security check
- Ready
- Rendering
- Finalizing
- Waiting for payment
- Completed
- Failed

Render progress should provide:

- clear percentage when authoritative data exists;
- current status text;
- compact timeline/details only when useful;
- no invented ETA if backend cannot support it reliably.

## 8. Cards, borders and surfaces

Prefer:

- subtle surface hierarchy;
- thin borders;
- moderate radius;
- low/no shadow in normal workspace views;
- clear hover/focus states;
- visually quiet containers.

Do not make every element a floating card.

## 9. Buttons and controls

- one clear primary button per interaction area;
- secondary actions visually quieter;
- destructive actions visually distinct and rare;
- minimum comfortable touch target on mobile;
- visible keyboard focus;
- disabled/loading states must be obvious;
- loading actions must resist accidental duplicate submission.

## 10. Responsive behavior

The Customer portal must be intentionally designed for both desktop and mobile.

Desktop:

- efficient centered workspace;
- readable line lengths;
- status/history may use compact table/list layouts.

Mobile:

- single-column priority;
- large touch targets;
- no horizontal overflow for core workflow;
- status information stacks cleanly;
- primary action remains visible and obvious.

Test at minimum:

- common Android phone width;
- narrow desktop/laptop;
- standard desktop.

## 11. Motion

Use motion sparingly and only to explain state.

Appropriate:

- progress/loading feedback;
- subtle state transition;
- success confirmation.

Avoid:

- decorative constant movement;
- heavy page-entry animation;
- `transition: all` style behavior where unnecessary;
- animation that blocks interaction or slows the render workflow.

## 12. Accessibility and interface quality

Implementation review should check:

- semantic controls;
- keyboard access;
- visible focus;
- readable contrast;
- labels for form fields;
- error association with inputs;
- status not encoded by color only;
- duplicate-submit protection;
- loading and disabled states;
- mobile touch targets;
- no avoidable layout shift.

Use current Vercel/Web Interface Guidelines and established framework guidance as implementation-review references where compatible with the existing stack.

## 13. Implementation priority

### P0 — Preserve function while improving obvious usability

- Google Login state;
- Upload;
- Google Drive direct submit;
- customer-readable errors;
- loading/disabled states;
- status/progress;
- responsive layout.

### P1 — Visual facelift

- typography;
- spacing/grid;
- dark neutral palette;
- buttons/inputs/cards;
- render status component;
- history list/table;
- consistent iconography.

### P2 — Polish later

- subtle motion;
- marketing refinements;
- illustration;
- nonessential visual effects.

P2 must never delay Worker/runtime/Golden E2E work.

## 14. Verification requirements

A UI facelift is not done because screenshots look better.

Required before merge:

1. existing relevant frontend tests PASS;
2. lint/build PASS or only previously documented baseline warnings remain;
3. VS Code Problems review;
4. Browser QA on production-like/preview environment;
5. desktop + mobile screenshot evidence;
6. Google Login behavior preserved;
7. Upload behavior preserved;
8. direct Drive submission behavior preserved;
9. no `[object Object]` customer error;
10. no legacy frontend `POST /jobs` fallback;
11. no backend/security/workflow contract changes;
12. Playwright regression for affected Customer flow remains PASS where available.

## 15. Explicitly out of scope

This UI slice does not authorize changes to:

- Worker Engine / Node Agent;
- Scheduler;
- render engine/runtime;
- security trust boundaries;
- quarantine/scan ordering;
- canonical B2 rules;
- Job creation semantics;
- payment semantics;
- database schema;
- infrastructure topology;
- Admin workflow;
- pricing;
- Golden E2E sequencing.

If implementation discovers a product/workflow conflict, stop and report it instead of redesigning the business flow.

## 16. Definition of success

V1 succeeds when the Customer portal:

- looks like a credible professional render product rather than a demo;
- makes Login/New Render/Drive/Upload/status/history easy to understand;
- is materially cleaner on both desktop and mobile;
- preserves all current functional/security contracts;
- introduces no new mandatory Customer steps;
- remains fast and operationally simple.
