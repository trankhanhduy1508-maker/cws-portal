# CWS PRODUCTION E2E ROADMAP V2.4

> Date: 2026-08-08
> Status: ACTIVE — supersedes V2.3 only where this document explicitly changes the customer Golden E2E order, archive support, Blender optimization, payment timing, preview and delivery gates.
> Companion source of truth: `CWS_MVP_WORKFLOW_FINAL.md`, `CWS_SCALABILITY_RULES.md`, current code/config/runtime evidence.

# 0. OWNER CORRECTION — NON-NEGOTIABLE BUSINESS ORDER

Canonical customer path is now:

`Customer input -> B2 materialization -> Worker claim -> safe archive extraction -> Blender preflight -> SAFE working-copy optimization -> real Blender render -> validate output -> upload FULL output to B2 LOCKED -> generate 3–5 watermarked previews -> calculate final runtime price + create QR/payment record together -> SePay verifies exact transaction reference/amount -> PAID -> unlock final B2 delivery -> customer download -> cleanup`

This supersedes any older wording that requires customer approval as a mandatory gate before payment creation.

Hard rules:

- Never require payment before render.
- Never expose full output before PAID.
- Final B2 artifact is uploaded before payment and remains locked.
- After PAID, do not rerender or reupload merely to deliver; issue authorized delivery for the existing verified artifact.
- QR uses canonical bank account number/name already configured by repository/deployment source of truth.
- QR embeds exact amount and unique transaction/payment reference.
- SePay must match the correct payment reference/content and amount before unlock.

# P3A — INPUT FORMAT: .BLEND + .ZIP + .RAR

Add `.rar` to the canonical accepted customer archive formats alongside `.blend` and `.zip`.

Requirements:

1. Content/signature validation; do not trust extension alone.
2. Extraction only inside a per-job sandbox.
3. Prevent path traversal, absolute/device paths and extraction outside sandbox.
4. Bound extracted bytes, file count, nesting, execution time and resource use.
5. Pin/version the RAR extractor/library and verify exit status.
6. Never build an unsafe shell command from untrusted archive/file names.
7. Detect `.blend` and assets after extraction deterministically.
8. If multiple candidate `.blend` files cannot be resolved by a deterministic policy, fail clearly rather than guessing.
9. Add unit/security tests for malicious archive paths and oversized/bomb-like cases.
10. Add one real `.rar` runtime fixture before declaring RAR support DONE.

# P3B — SAFE BLEND OPTIMIZATION BEFORE RENDER

## Goal

Every production Blender job passes a deterministic optimization stage before the main render, but the system must not silently trade away customer quality or mutate the original customer asset.

Canonical flow:

`original immutable input -> read-only analyzer -> working copy -> safe optimizer -> post-opt validation -> render`

## Automatically allowed safe operations

- normalize and safely remap job-local asset paths when mapping is certain;
- run Blender via CLI/background to avoid UI overhead;
- use a clean/factory startup environment where compatible;
- force job-scoped output/temp paths;
- select render device only after engine/device/VRAM compatibility checks;
- inventory geometry, modifiers, texture footprint, samples, bounces, volumetrics, assets, cache and estimated VRAM;
- preserve procedural modifiers and instances rather than automatically applying/duplicating geometry;
- record every change in an optimization manifest;
- validate the working copy after optimization;
- fallback to the unoptimized working copy if the optimizer fails or cannot prove a transformation safe.

## Forbidden automatic trade-offs without an approved benchmarked policy

Do not automatically:

- reduce resolution;
- reduce samples;
- change frame range;
- change render engine;
- disable volumetrics/caustics/denoise;
- lower subdivision/render levels;
- enable lossy Simplify values;
- resize source textures;
- delete objects/materials/collections;
- apply modifiers;
- delete/bake caches;
- alter camera, lights, color management;
- enable arbitrary `.blend` Python auto-execution for untrusted customer input.

## Security

Blender documents that `.blend` files can contain executable Python/driver behavior. Customer input is untrusted. Preserve the existing policy that arbitrary autoexec is disabled unless a separate trusted/approved contract explicitly requires it.

## Research basis

Community/official Blender guidance used for this policy:

- background/CLI rendering avoids UI overhead and is suitable for automated render systems;
- `.blend` file size by itself is not a useful render-time optimization target;
- applying geometry-producing modifiers/duplicating meshes can increase data footprint, while linked/collection instances can be more efficient;
- render-farm reliability depends on paths/assets/cache/output handling, not merely packing everything into one `.blend`;
- scene-level quality trade-offs such as samples, Simplify and texture changes are content dependent and must not be applied blindly.

# P4 — REAL CUSTOMER UI INPUT

Production UI must accept approved `.blend`, `.zip` and `.rar` inputs and Google Drive input where supported by the current canonical backend/materialization path.

No frontend-only acceptance: unsupported backend/Worker formats must fail closed.

# P5 — OUTPUT -> PREVIEW -> FINAL PRICE + QR

After real render completion:

1. validate output;
2. upload full output to B2;
3. verify remote artifact/integrity;
4. keep final artifact locked from customer delivery;
5. derive 3–5 representative preview images/frames from the real output;
6. apply canonical CWS watermark;
7. calculate final runtime price;
8. in the same business stage create payment record/reference and MB QR;
9. show customer preview + final price + QR together.

Do not require a manual Founder action or AI call between these transitions.

# P5B — SEPAY EXACT-MATCH UNLOCK

SePay webhook processing must be authenticated, idempotent and fail closed.

Before PAID/final unlock, verify:

- unique payment/transaction reference parsed from transaction content;
- reference maps server-side to exactly one payment/job/customer;
- received amount satisfies the payment policy;
- payment is not already finalized;
- duplicate/replayed webhook cannot duplicate delivery transitions.

Wrong content/reference => no unlock.

Wrong amount => no unlock under current policy.

Only confirmed PAID may authorize final B2 delivery.

# P6 — GOLDEN PRODUCTION E2E V2.4

Use the Owner-provided Google Drive test input:

`https://drive.google.com/file/d/1evCyfEKjwFv-4ty-v4xAU_J29vOK3Yh0/view?usp=drivesdk`

Observed by this documentation pass: connector download attempt reported the file is approximately 125,259,706 bytes and exceeded the connector's 100 MiB direct-download limit. This is NOT a product failure and is NOT evidence that the CWS production backend cannot download the Drive file. Codex must test it through the actual CWS production path.

Golden chain required:

1. open canonical production site `https://cws-portal.vercel.app/`;
2. submit the exact Drive URL above through the real customer flow;
3. backend materializes input to canonical storage;
4. task is durable and claimable;
5. authenticated Worker claims it autonomously;
6. archive handling runs if applicable, including RAR support when a RAR fixture is tested;
7. Blender preflight runs;
8. safe working-copy optimizer runs and writes manifest;
9. Blender real process renders;
10. progress is real;
11. output validates;
12. full output uploads to B2 and remains locked;
13. 3–5 watermarked previews are generated from real output;
14. final runtime price and QR/payment record are created together;
15. QR uses canonical bank account name/account number and embeds exact amount + payment reference;
16. SePay sandbox/test webhook uses the same matching/idempotency rules as live;
17. exact transaction content/reference and amount are verified;
18. PAID unlocks an authorized final B2 download;
19. customer downloads the real output;
20. Worker/runtime cleanup finishes and Worker returns idle.

# AI-OFF ACCEPTANCE

Normal transitions from claim through render, B2 upload, preview, pricing, QR generation, SePay state change, delivery unlock and cleanup must not require Codex/ChatGPT/Founder intervention.

If any normal state transition requires intervention, record it as a defect, fix it and rerun the same traceable E2E.

# DOCUMENTS BEFORE CODE

Before implementation Codex must read, in order:

1. `CWS_MVP_WORKFLOW_FINAL.md`
2. `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`
3. `CURRENT_STATUS.md`
4. `DECISIONS.md`
5. `AGENTS.md`
6. `CWS_SCALABILITY_RULES.md`
7. `CWS_PRODUCTION_E2E_ROADMAP_V2_3.md` as historical context
8. current Worker/backend/storage/payment/frontend code and tests

Where older decision text says payment creation must wait for a separate customer approval action, V2.4 + corrected `CWS_MVP_WORKFLOW_FINAL.md` supersede that specific business-order rule.

After implementation/runtime verification update `CURRENT_STATUS.md`, `DECISIONS.md`, `CWS_WORKER_ROADMAP.md`, this roadmap and evidence under `reports/` so no stale instruction can send a later agent down the old flow.

# STOP CONDITION

Codex may stop only for a real external blocker it cannot safely resolve. It must complete all independent code, tests, deployment checks and documentation first. It must not create duplicate Vercel/Supabase/B2/Render projects or parallel infrastructure.
