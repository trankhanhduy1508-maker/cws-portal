# CODEX GOLDEN E2E V2.4 DIRECTIVE — 2026-08-08

Read and execute. Do not merely report.

## Required reading

1. `CURRENT_STATUS.md`
2. `DECISIONS.md`
3. `AGENTS.md`
4. `CWS_SCALABILITY_RULES.md`
5. `CWS_MVP_WORKFLOW_FINAL.md`
6. `CWS_PRODUCTION_E2E_ROADMAP_V2_3.md`
7. `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`
8. current frontend/backend/Worker/storage/payment code and latest evidence

Current code/config/runtime evidence wins over stale docs, except the Owner business-order correction explicitly recorded in V2.4 is authoritative for this task.

## Owner business order

`input -> Worker -> safe extract -> Blender preflight -> safe working-copy optimize -> real render -> validate -> full output B2 LOCKED -> 3–5 CWS-watermarked previews -> calculate final runtime price + create QR/payment record together -> customer pays -> SePay verifies exact transaction content/reference + amount -> PAID -> unlock final B2 delivery -> download -> cleanup`

No payment before render. No full output before PAID.

## Implement/fix

### A. RAR

Add `.rar` end-to-end alongside existing `.blend`/`.zip` support:

- UI validation;
- backend validation/materialization where relevant;
- Worker archive detection/extraction;
- content/signature checks rather than extension-only trust;
- sandbox-only extraction;
- path traversal/absolute/device path rejection;
- extracted size/file-count/nesting/time/resource bounds;
- pinned extractor/library and checked exit code;
- no unsafe shell interpolation;
- deterministic `.blend` selection;
- tests including malicious traversal and oversized/bomb-like archive cases;
- one real RAR runtime fixture before marking support DONE.

Choose the smallest reliable implementation compatible with the current Windows Worker. Do not add an unnecessary service or parallel Worker architecture.

### B. SAFE BLEND OPTIMIZER BEFORE RENDER

Implement on a working copy only. Never mutate original customer B2 input.

Required flow:

`immutable original -> analyzer -> working copy -> safe optimizer -> post-opt validation -> render`

Safe automatic scope:

- path normalization/remap only when certain;
- job-local output/temp paths;
- Blender CLI/background;
- clean/factory startup where compatible;
- render device selection only after compatibility/VRAM check;
- collect scene stats and optimization manifest;
- preserve instances/procedural modifiers instead of automatically applying geometry;
- fallback to unoptimized working copy when optimizer cannot prove safety.

Do NOT automatically reduce resolution/samples/frame range, change engine, disable volumetrics/denoise/caustics, lower subdivision, resize textures, delete scene data, apply modifiers, alter camera/light/color management, or enable arbitrary autoexec for untrusted customer `.blend`.

Research basis to respect:

- Blender official CLI/background rendering guidance;
- Blender official scripting-security/autoexec warning;
- Blender community evidence that `.blend` file size alone is not the main render-time target;
- community guidance favoring instancing/procedural geometry over unnecessary applied/duplicated geometry;
- render-farm dependency/path/cache correctness.

Benchmark any quality-changing optimization before product use; do not guess.

### C. Post-render business flow

After real render completes:

1. validate output;
2. upload full artifact to B2;
3. verify it remotely;
4. keep customer full-output access LOCKED;
5. generate 3–5 real preview images/frames with CWS watermark;
6. calculate final runtime price;
7. create payment record/reference and QR in the same stage;
8. QR must use canonical STK/account name already configured by repository/deployment source of truth and embed exact amount + payment reference;
9. show preview + final price + QR;
10. SePay verifies exact transaction reference/content + amount + idempotency;
11. only PAID unlocks authorized B2 delivery;
12. do not rerender/reupload after payment just to deliver.

## Golden production test

Canonical customer site:

`https://cws-portal.vercel.app/`

Use this exact Google Drive input:

`https://drive.google.com/file/d/1evCyfEKjwFv-4ty-v4xAU_J29vOK3Yh0/view?usp=drivesdk`

A previous connector read observed the file at about 125,259,706 bytes; a 100 MiB connector download limit prevented local inspection. This is not a CWS product failure. Test it through the actual production customer/backend materialization path.

Run one traceable real Golden E2E through:

`Vercel customer UI -> backend -> B2 input -> durable task -> authenticated Worker claim -> extract if needed -> preflight -> safe optimization -> Blender real process -> real progress -> validated output -> B2 locked full output -> watermarked previews -> final price + QR -> SePay sandbox/test exact-match webhook -> PAID -> authorized final B2 download -> cleanup/idle`

Use SePay sandbox/test for payment verification unless Owner explicitly requests live payment. Do not fake PAID in database.

## Evidence required

Record at minimum:

- production URL/deployment commit;
- job/task/payment IDs;
- Worker ID and claim generation;
- input storage evidence;
- optimizer manifest and original-vs-working-copy proof;
- Blender executable/version/PID/exit status;
- progress evidence;
- output object/integrity evidence;
- preview watermark evidence;
- final pricing/payment reference/QR evidence with secrets redacted;
- SePay sandbox webhook verification and idempotency;
- proof full output was inaccessible before PAID;
- proof authorized download works after PAID;
- cleanup + Worker idle recovery.

Do not expose secrets in logs/reports.

## Rules

- AI-independent runtime: AI may build/debug/test, never advance normal production state.
- No duplicate Vercel/Supabase/B2/Render projects or buckets/services.
- Do not restore legacy Worker as canonical runtime.
- Do not put service-role or broad B2 credentials on Worker.
- Keep fleet architecture viable without per-machine manual setup.
- Perform everything you can yourself; do not delegate routine deploy/test steps to Founder if Codex can do them.
- Do not mark runtime PASS from unit tests.

## Documentation after work

Update after verified milestones:

- `CURRENT_STATUS.md`
- `DECISIONS.md` — remove/supersede stale mandatory customer-approval-before-payment wording
- `CWS_WORKER_ROADMAP.md`
- `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`
- relevant setup/API docs
- evidence under `reports/`

Commit/push scoped changes.

## Stop condition

Continue until Golden E2E passes or a real external blocker remains after all independent work is completed. If blocked, provide exact evidence, smallest Founder action required, and whether that action scales without per-Worker manual work.
