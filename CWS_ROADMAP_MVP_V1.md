# CWS_ROADMAP_MVP_V1.md

## Worker resilience production runtime verification â€” 2026-08-08

- **PARTIAL PRODUCTION RUNTIME VERIFIED**: migration 027 and its RPC grants
  are read-back verified in canonical Supabase; MAY083 performs authenticated
  probe/heartbeat and the real B2-only atomic claim request.
- **BLOCKED BEFORE LEASE**: no production `b2://` task exists. Existing queued
  Drive tasks are correctly ineligible for the B2-only Worker. The exact
  materialized input still needs a real customer-authenticated `POST /jobs`.
- Lease/generation fencing, Blender/output and stale completion remain
  **NEEDS_VERIFICATION** until that real task exists.
- Evidence: `reports/evidence/CWS_WORKER_RESILIENCE_PRODUCTION_RUNTIME_2026-08-08.md`.

## Worker resilience hardening â€” 2026-08-08

- **CODE VERIFIED**: existing PostgreSQL claim/lease/generation architecture
  now has additive taxonomy-aware failure reporting, bounded operation retry,
  deterministic reconnect jitter and authenticated lightweight Worker probing.
- **SIMULATION VERIFIED**: 10/25/50/100 Worker control-plane scenarios pass
  unique claims, stale-generation rejection and bounded recovery checks.
- **NOT PRODUCTION RUNTIME VERIFIED**: canonical Supabase migration 027 and a
  physical authenticated Worker probe/failure run remain outstanding; this
  milestone does not claim fleet production readiness.
- Evidence: `reports/evidence/CWS_WORKER_RESILIENCE_HARDENING_2026-08-08.md`.

## P0 production real-path correction â€” 2026-08-08

- **NOT DONE / NEEDS_REAL_RUNTIME**: the canonical frontend and backend are
  deployed and MAY083 heartbeats, but no authenticated customer B2 upload or
  `render_orders` row exists from the current production test window. Therefore
  `Customer upload -> Worker claim -> Blender -> B2 -> Review -> Payment ->
  Download` is **not** production verified.
- **CODE/UNIT VERIFIED**: production bundles no longer contain a browser mock
  auth/demo module; missing configuration fails closed. Customer-facing
  pre-render copy no longer calls an estimate a price. This is a truthfulness
  correction, not a Golden E2E claim.
- **NEXT GATE**: one real customer-owned `.blend` or `.zip` upload through
  `https://cws-portal.vercel.app`, then capture the durable job/task/attempt,
  Worker Blender/B2 evidence and only then evaluate review/payment/download.
- Evidence: `reports/evidence/CWS_PRODUCTION_DEMO_PATH_REALITY_AUDIT_2026-08-08.md`.

## Architecture V1 bounded enrollment â€” 2026-08-08

- **P1A CODE/UNIT + PRODUCTION SCHEMA VERIFIED**: migration 026, Admin AAL2
  batch ticket issuance and Windows DPAPI redemption remove per-Worker SQL
  edits without introducing a shared enrollment/B2/database secret.
- **100-WORKER PREPARATION VERIFIED IN CODE**: one batch supports 100 stable
  IDs and deterministic startup jitter reduces synchronized heartbeat/claim.
- **LOCAL SIMULATED LOAD VERIFIED**: auth/ownership-aware Nest scenarios at
  10/25/50/100 customers PASS; this is not a staging/production capacity claim.
- **P2/P3 READY RUNTIME VERIFIED**: MAY083 runs canonical autonomous claim loop
  as PID 6164, heartbeat advanced across cycles, no incompatible task was
  claimed, and a duplicate launcher was rejected by the workspace instance
  lock. Real task/Blender/B2 completion remains NEEDS_VERIFICATION.
- **NEEDS PHYSICAL VERIFICATION**: enroll a second real host through the new
  path and run P3 with a customer-owned B2 task. This is not Golden E2E PASS.
- Evidence: `reports/security/CWS_BOUNDED_WORKER_ENROLLMENT_2026-08-08.md`.

## Architecture V1 P0/P1 reconciliation â€” 2026-08-08

- **DONE / PRODUCTION SCHEMA VERIFIED**: authenticated upload ownership table,
  service-role-only ACL and cross-customer `fileRef` rejection are applied.
- **DONE / PRODUCTION SECURITY VERIFIED**: direct `anon/authenticated`
  execution of internal Worker/fleet `SECURITY DEFINER` RPCs is zero.
- **DONE / CODE + SCHEMA VERIFIED**: resilient claim filters tasks by the
  Worker's declared `b2`/`google_drive` capability while preserving atomic
  lease/generation ownership.
- **NEEDS_VERIFICATION**: application deployment and one real P3 customer B2
  upload â†’ Worker â†’ Blender â†’ output completion. No runtime PASS is claimed.
- Evidence:
  `reports/security/CWS_ARCHITECTURE_V1_P0_P1_RECONCILIATION_2026-08-08.md`.

## Production E2E V2.3 scalable storage boundary â€” 2026-08-08

- **CODE/UNIT VERIFIED**: authenticated Workers obtain 120-second exact-object
  B2 S3-compatible GET/PUT capabilities from Backend only for their currently
  claimed fenced assignment. Server-side B2 credentials never leave Backend.
- **SUPERSEDES** the per-Worker B2 key gate: Worker provisioning now keeps only
  its DPAPI-protected HMAC identity and needs no `CWS_B2_*` secret/configuration.
- **NEEDS_VERIFICATION**: deploy Backend and prove real capability download,
  Blender output upload, completion and P2-P6 production runtime.
- **P2 FIXED/CODE VERIFIED**: Backend now permits authenticated taskless
  `ACTIVE_IDLE` reporting while allowlisting Worker states; this removes the
  production 400 that left MAY083's observed state stale after a valid ping.
- **P2 RUNTIME VERIFIED**: MAY083 reached `ACTIVE_IDLE` in production;
  canonical PID 3208 then maintained fresh authenticated heartbeats across
  multiple cycles without Codex issuing pings. P2 heartbeat is runtime PASS;
  P3 normal claim/render remains separate.
- **P3 CODE VERIFIED**: job-scoped input authorization understands canonical
  `b2://uploads/<key>` upload references and rejects non-input prefixes.
- Evidence: `reports/security/CWS_JOB_SCOPED_B2_CAPABILITY_2026-08-08.md`.

## Production E2E Roadmap V2.2 P0 â€” 2026-08-08 [DONE]

- Production schema and migration history directly confirm 020/021/022 and
  the canonical authenticated Worker RPC contract.
- Direct `anon`/`authenticated` execution of current and historical Worker
  RPCs is revoked; Backend `service_role` access remains available.
- Production has 0 identities, 0 leases and 0 fresh Workers, so P1 physical
  provisioning is the next gate.
- Evidence: `reports/evidence/CWS_PRODUCTION_E2E_V2_2_P0_REALITY_CHECK_2026-08-08.md`.

## Worker parity gate â€” 2026-08-07

- **CODE/UNIT VERIFIED**: legacy capability inventory is reconciled against
  Node Agent â†’ dynamic JobSpec â†’ generic Worker Engine. Pinned Blender
  bootstrap, scene preflight, safe archive handling and host telemetry are
  included without changing Render â†’ Preview â†’ Payment ordering.
- **NEEDS_VERIFICATION**: physical Worker claim, Blender PID, B2 output,
  backend completion and customer download.
- Evidence: `FEATURE_PARITY_LEGACY_VS_PRODUCTION.md`.

## Official Blender fixture gate â€” 2026-08-07

- **CODE/TEST VERIFIED**: production input validation rejects HTML/error
  payloads before Blender execution.
- **INPUT VERIFIED**: official Blender `color_vortex.blend` fixture has a
  verified Blender signature and SHA-256.
- **NEEDS_VERIFICATION**: real production Worker/B2/backend/customer E2E.

## Windows host readiness â€” 2026-08-07

- **REAL LOCAL RUNTIME VERIFIED**: official Blender fixture rendered with
  Blender 5.2.0 LTS on the Windows host.
- **NEEDS_VERIFICATION/BLOCKED**: production claim, B2 upload, completion and
  customer download require the missing authenticated Worker configuration.

## Production Node Agent adapter preparation - 2026-08-07

- **CODE/UNIT VERIFIED**: credential-gated Node Agent loop now connects the
  authenticated RPC gateway to dynamic JobSpec, Drive/B2, generic Worker
  Engine, Blender process containment, progress, checkpoint and finalization.
- **CODE/UNIT VERIFIED**: Worker input host and output-prefix validation reject
  arbitrary HTTPS/SSRF and path-injection inputs.
- **NEEDS_VERIFICATION**: apply migration 022, provision a physical Worker,
  and run authenticated B2/Blender production E2E.
- Evidence: `reports/worker/CWS_PRODUCTION_NODE_AGENT_ADAPTER_2026-08-07.md`.

## Production provisioning gate progress â€” 2026-08-07

- **RUNTIME VERIFIED**: production migrations 020/021/022 and dynamic Worker
  RPC bridge are applied and schema-verified.
- **LOCAL PACKAGE VERIFIED**: canonical Node Agent package is present and
  compiles on the Windows host.
- **NEEDS_VERIFICATION/BLOCKED**: per-worker identity mapping, B2 config,
  authenticated claim and physical render/output remain outstanding.

## Production pricing gate audit - 2026-08-07

- **CODE/UNIT VERIFIED**: final amount uses actual recorded Worker runtime,
  6,000 VND per worker-hour, and the approved 2.5 customer multiplier.
- **CODE/UNIT VERIFIED**: missing runtime evidence is fail-closed and cannot
  produce a payable amount.
- **NEEDS_VERIFICATION**: authenticated production Worker/B2/payment runtime.
- Evidence: `reports/evidence/CWS_PRODUCTION_E2E_PRICING_GATE_2026-08-07.md`.

## Production Node Agent / generic Worker audit â€” 2026-08-07

- **CODE VERIFIED**: canonical dynamic Worker direction is preserved; legacy
  `cws_worker_full.py` is not used. Generic package manifest/entrypoint mismatch
  was fixed, and folder input now resolves exactly one supported project.
- **NEEDS_VERIFICATION/BLOCKED**: production Node Agent claim/download/B2/
  Blender/status bridge and physical Worker runtime still lack real evidence.
- Evidence: `reports/worker/CWS_PRODUCTION_NODE_AGENT_GENERIC_WORKER_AUDIT_2026-08-07.md`.

## Production real-path audit â€” 2026-08-07

- **CODE VERIFIED**: frontend production configuration now targets the real
  Render backend; all RenderService lifecycle methods fail closed instead of
  using browser mock state. The last verified deployment is recorded below;
  the latest worker/Drive commit still awaits hosting integration verification.
- **RUNTIME VERIFIED**: Git-integrated production deployment is `READY` on
  commit `ebc7e017d7c3250b3a0680d8e8e15bb5fe56d818`; served bundle points to
  the canonical Render backend and no longer has fake job/progress functions.
  Authenticated customer + physical Worker + Supabase/B2 + payment runtime
  remain **NEEDS_VERIFICATION**.
- Evidence: `reports/evidence/CWS_PRODUCTION_REAL_PATH_AUDIT_2026-08-07.md`.

## Production ZIP E2E execution gate â€” 2026-08-07

- **NEEDS_VERIFICATION/BLOCKED**: read-only production health/CORS/auth probes
  pass, but authenticated ZIP upload, physical Worker render, B2 output and
  payment remain unverified. No production mutation was performed.
- Evidence: `reports/evidence/CWS_PRODUCTION_ZIP_E2E_EXECUTION_2026-08-07.md`.

## Scaling P0 verification â€” 2026-08-07

- **CODE/UNIT VERIFIED**: P0 queue/idempotency and overload guardrails remain
  active; no new broker or Redis layer is introduced without measured staging
  evidence.
- **SIMULATED LOAD VERIFIED**: real Nest harness passes 10/25/50/100 customer
  submissions with independent test proxy IPs, no duplicate claims, and
  bounded failover/stale fencing. This is not infrastructure capacity PASS.
- **NEEDS_VERIFICATION**: Supabase/RLS, B2 bandwidth, physical Worker and
  payment capacity in isolated staging.
- Evidence: `reports/scaling/CWS_P0_SCALING_AND_ZIP_E2E_READINESS_2026-08-07.md`.

## ZIP project input â€” 2026-08-07

- **CODE/UNIT VERIFIED**: frontend, upload API, B2 object naming, Job metadata
  and generic Worker now support `.blend` and `.zip`.
- ZIP extraction is bounded and rejects traversal, symlink, duplicate and
  ambiguous/missing `.blend` content; nested archives are not auto-extracted.
- **NEEDS_VERIFICATION**: production B2 ZIP upload and physical Worker Blender
  render from a ZIP containing exactly one `.blend`.
- Evidence: `reports/worker/CWS_ZIP_INPUT_SUPPORT_2026-08-07.md`.

## One-job production E2E readiness â€” 2026-08-07

- **CODE/UNIT VERIFIED**: upload/Drive â†’ job/task dispatch â†’ Worker
  heartbeat/progress â†’ `REVIEW_READY` â†’ approve/runtime pricing â†’ payment
  verification â†’ packaging/`FINISHED` â†’ authorized B2 download path.
- **REAL RUNTIME VERIFIED (read-only only)**: production web HTTP 200, Render
  `/health` HTTP 200, and anonymous protected jobs/fleet/CRM routes HTTP 401.
- **NEEDS_VERIFICATION**: one authenticated customer job on a physical Windows
  Worker with Blender, B2 output, live payment/webhook, and final download.
- Evidence/checklist: `CWS_PHYSICAL_WORKER_ONE_JOB_READINESS.md`.

## Staging identity/failover gate â€” 2026-08-06

- **BLOCKED**: staging preflight cannot run in the current session because no
  staging DB tool, endpoint or credential is available.
- Migrations 020/021 remain unapplied; production is untouched.
- Offline rehearsal remains **CODE/UNIT VERIFIED**, not staging runtime PASS.

## Worker failover readiness â€” 2026-08-06

- **IN_PROGRESS**: production identity/failover implementation and offline
  rehearsal are complete at code/unit level.
- **NEEDS_VERIFICATION**: apply migrations 020/021 in isolated staging,
  provision two physical Workers, run authenticated heartbeat/claim/reassign/
  revoke/expiry/rotation smoke, then verify production rollout.
- Payment remains downstream of final render/preview; failover recovery must
  not create or expose payment before `REVIEW_READY`.

# Computer Workspace (CWS)

## MVP Roadmap V1

> Má»¥c tiÃªu: xÃ¢y dá»±ng má»™t MVP cháº¡y hoÃ n chá»‰nh tá»« lÃºc khÃ¡ch Ä‘Äƒng nháº­p Ä‘áº¿n
> lÃºc nháº­n file sau thanh toÃ¡n.

------------------------------------------------------------------------

# Giai Ä‘oáº¡n 1 -- Ná»n táº£ng [DONE]

## 1. Frontend [DONE]

-   Vercel â€” DONE (production https://cws-portal.vercel.app/ xÃ¡c nháº­n sá»‘ng)
-   Trang chá»§ â€” DONE
-   Google Login â€” DONE (Ä‘Äƒng nháº­p tháº­t Ä‘Ã£ verify qua database, 2026-08-01)
-   Dashboard khÃ¡ch hÃ ng â€” DONE (Progress/Job Status)

## 2. Backend [DONE]

-   Render.com â€” DONE (production https://cws-portal.onrender.com xÃ¡c nháº­n sá»‘ng)
-   API â€” DONE
-   Job Manager â€” DONE (code + unit test; xem ghi chÃº NEEDS_VERIFICATION runtime á»Ÿ Giai Ä‘oáº¡n 3)
-   Worker Manager â€” DONE (code: heartbeat/register/claim/scheduler); runtime vá»›i Worker váº­t lÃ½ tháº­t xem Giai Ä‘oáº¡n 3

## 3. Database [DONE]

-   Supabase â€” DONE
-   Auth â€” DONE (Google OAuth qua Supabase, xem DECISIONS.md)
-   Customer Profile â€” DONE (trigger `handle_new_auth_user()` verify vá»›i tÃ i khoáº£n tháº­t)
-   Jobs â€” DONE (schema + RLS xÃ¡c nháº­n)
-   Payments â€” DONE (schema Ä‘Ã£ sá»­a xong lá»—i kiá»ƒu dá»¯ liá»‡u `payment_id`, xem `reports/payments/SEPAY_WEBHOOK_PRODUCTION_VERIFICATION_2026-08-01.md`)

## 4. Storage [DONE]

-   Backblaze B2 â€” DONE (upload/signed URL xÃ¡c nháº­n báº±ng HTTP tháº­t, 2026-08-02)
-   source/ â€” DONE (route `POST /files/upload`)
-   review/ â€” NEEDS_VERIFICATION (cÆ¡ cháº¿ tá»“n táº¡i trong schema `storage_objects.review_path`/`review_images`, chÆ°a xÃ¡c nháº­n cÃ³ dá»¯ liá»‡u tháº­t Ä‘i qua)
-   final/ â€” DONE (Ä‘Ã³ng gÃ³i + signed URL xÃ¡c nháº­n báº±ng HTTP tháº­t)
/m»ç[h‘éì¶»§q«^u•¹ĞÑ…Í¬°±…ÍĞÍ••¸…¹¡•…±Ñ ¸4(´AÉ½‘ÕÑ¥½¸É½ÕÑ”€½…‘µ¥¹€¹½Ü¡…ÌMAÉ•İÉ¥Ñ”…¹Á…Ñ¡¹…µ”•¹ÑÉäìÉÕ¹Ñ¥µ”‘•Á±½ä½5Ù•É¥™¥…Ñ¥½¸É•µ…¥¹ÌU9YI%%¸4(´Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}9=}9Q}5%9}1Q}Y%M%	%1%Qe|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(4(4(Œ€ÈÁ¸9½‘”•¹Ğ±¥™•å±”¡…É‘•¹¥¹œƒŠP€ÈÀÈØ´Àà´ÀÔ4(4(´İ½É­•È½¹½‘•}…•¹Ğ¹Áå€¹½Ü¡…Ì•áÁ±¥¥ĞÑÉ…¹Í¥Ñ¥½¸É•…Í½¹Ì°¥¹©•Ñ•ÉÕ¹Ñ¥µ”Á½±¥ä°‰½Õ¹‘•¹½¸µ‰±½­¥¹œ•áÁ½¹•¹Ñ¥…°É•ÑÉä‰…­½™˜…¹É•ÑÉäÉ•Í•Ğ…™Ñ•È±•…¹ÕÀ¸4(´İ½É­•È½¹½‘•}…•¹Ñ}ÉÕ¹Ñ¥µ•}Á½±¥ä¹Áå€•µ¥ÑÌµ½¹¥Ñ½Èµ½™˜½½¸‰½Õ¹‘…Éä¡½½­Ì½¹”ì¥Ğ‘½•Ì¹½Ğ…±°Á½İ•ÈA%Ì½ÈÍ±••ÀÑ¡”A¸4(´Y•É¥™¥…Ñ¥½¸èÁå}½µÁ¥±”AMLì½™™±¥¹”ÍÕ¥Ñ”€¨¨ÄÄ¼ÄÄAML¨¨¸4(´Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}9=}9Q}1%e1}!I9%9|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(´IÕ¹Ñ¥µ”ÁÉ½•ÍÌÍÕÁ•ÉÙ¥Í¥½¸°	±•¹‘•È½ÈÍÑ…¥¹œ°É•…°¡•…ÉÑ‰•…Ğ½±•…Í”°]¥¹‘½İÌ¥Í½±…Ñ¥½¸°™…¥±½Ù•È…¹ÁÉ½‘ÕÑ¥½¸‘•Á±½åµ•¹ĞÉ•µ…¥¸U9YI%%½	1=-¸4(4(Œ€ÈÁ¸]¥¹‘½İÌÍÑ…¥¹œÙ•É¥™¥…Ñ¥½¸ƒŠP€ÈÀÈØ´Àà´ÀÔ4(4(´AåÑ¡½¸€Ì¸ÄÈ¸Ü…¹	±•¹‘•È€Ô¸È¸À1QLÍ…™”1$É•¹‘•Èİ¥Ñ ‘¥Í…‰±”µ…ÕÑ½•á•ŒèI0IU9Q%5YI%%¸4(´MÕÁ…‰…Í”½¹¹•Ñ¥Ù¥Ñä½¹±äèI0IU9Q%5YI%%…Ğ!QQ@É•…¡…‰¥±¥Ñäì…ÕÑ¡•¹Ñ¥…Ñ•ÍÑ…¥¹œ¡•…ÉÑ‰•…Ğ¹½Ğ…ÑÑ•µÁÑ•¸4(´…¹½¹¥…°]½É­•È€Ä¸Äà¸ÀÍÁ…İ¸è	1=-‰•…ÕÍ”ÕÉÉ•¹Ğ]¥¹‘½İÌ¡•­½ÕĞ±…­ÌİÍ}İ½É­•É}™Õ±°¹Áä…¹µ…¹¥™•ÍĞ¥Ì¹½Ğ…¹½¹¥…°¸4(´ÈÉ•…µ½¹±äè	1=-İ¥Ñ !QQ@€ĞÀÄì¹¼İÉ¥Ñ”½‘•±•Ñ”¸4(´9½‘”•¹ĞƒŠH¡•…ÉÑ‰•…ĞƒŠH]½É­•ÈƒŠHÈƒŠH±•…¹ÕÀÉ•µ…¥¹Ì	1=-½U9YI%%¸4(´Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}]%9=]M}MQ%9}YI%%Q%=9|ÈÀÈØ´Àà´ÀÔ¹µ¸4(4(4(Œ€ÈÁ¸•¹•É¥Œ]½É­•È¹¥¹”½ÉÉ•Ñ¥½¸ƒŠP€ÈÀÈØ´Àà´ÀÔ4(4(´1•…äİÍ}İ½É­•É}™Õ±°¹ÁäƒGŒƒGÃ†îŒƒG†î5ŒƒG†îÍ…±Ù…”­¹½İ±•‘”ì­£Ñ¹œÉ•ÍÑ½É”½½ÁäÛ€­£Ñ¹œÉ¸³€­§†êı¸ÑËéŒƒGµ ¸4(´‘‘•İ½É­•È½İ½É­•É}•¹¥¹”¹ÁäÛ€İ½É­•È½Ñ•ÍÑ}İ½É­•É}•¹¥¹”¹Áä¸4(´)½ˆ·†îm¤£†î$ÑÉÕç†î¸)½‰MÁ•Œ½Q…Í­MÁ•ŒƒG†îe¹œì­£Ñ¹œ¡…Éµ½‘”©½ˆ½ÕÍÑ½µ•È½™É…µ”½È½‰©•Ğ¸4(´9½‘”•¹Ğ½İ¹ÌA±¥™•å±”½ÍÕÁ•ÉÙ¥Í¥½¸ì	…­•¹½İ¹Ì…ÍÍ¥¹µ•¹Ğ½±•…Í”½ÁÉ¥½É¥Ñä½É•ÑÉä½‰¥±±¥¹œì]½É­•È½İ¹Ì½¹”•á•ÕÑ¥½¸…ÑÑ•µÁĞ¸4(´¹¥¹”Ñ•ÍĞè€Ğ¼ĞAMLì=½U9%PYI%%¸4(´1•…äÍ…±Ù…”µ…ÑÉ¥àèÉ•Á½ÉÑÌ½İ½É­•È½]M}]=I-I}1e}M1Y}5QI%a|ÈÀÈØ´Àà´ÀÔ¹µ¸4(4(4(ŒŒ@ÀÍÑ…ÑÕÌÕÁ‘…Ñ”ƒŠP€ÈÀÈØ´Àà´ÀÔ4(4)=ÕÑÁÕĞ¥¹Ñ•É¥Ñä¥Ì¥µÁ±•µ•¹Ñ•¥¸Ñ¡”•¹•É¥Œ]½É­•È¹¥¹”¸A9½ÕÑÁÕÑÌ…É”ÍÑÉÕÑÕÉ…±±ä¡•­•‰•™½É”¡•­Á½¥¹Ğ½ÕÁ±½…ìÑ•ÍÑÌ…É”€ÈÈ¼ÈÈAML¸Õ±°È½ÁÉ½‘ÕÑ¥½¸ÉÕ¹Ñ¥µ”Ù•É¥™¥…Ñ¥½¸É•µ…¥¹Ì‰±½­•‰äÍÑ…¥¹œ¥¹Ñ•É…Ñ¥½¸É•‘•¹Ñ¥…±Ì½•¹‘Á½¥¹ÑÌ¸4(4(4(ŒŒ@ÀÍÑ…ÑÕÌÕÁ‘…Ñ”ƒŠPÑ¥µ•½ÕĞ±•…¹ÕÀ€ ÈÀÈØ´Àà´ÀÔ¤4(4)	±•¹‘•ÈÍÕ‰ÁÉ½•ÍÌÑ¥µ•½ÕĞ¹½Ü±•…¹ÌÕÀÑ¡”½İ¹•ÁÉ½•ÍÌÑÉ•”½¸]¥¹‘½İÌ…¹ÁÉ•Í•ÉÙ•ÌÉ•ÑÉä±…ÍÍ¥™¥…Ñ¥½¸¸½µÁ¥±”€¬½µ‰¥¹•ÍÕ¥Ñ”€ÈÈ¼ÈÈAMLì±¥Ù”Ñ¥µ•µ½ÕĞ	±•¹‘•ÈÙ•É¥™¥…Ñ¥½¸É•µ…¥¹ÌÕ¹Ù•É¥™¥•¸4(4(4(ŒŒ@ÀÍÑ…ÑÕÌÕÁ‘…Ñ”ƒŠP…Á…‰¥±¥ÑäÁÉ•™±¥¡Ğ€ ÈÀÈØ´Àà´ÀÔ¤4(4)•¹•É¥Œ]½É­•ÈÁÉ•™±¥¡Ğ¹½Ü•¹™½É•Ì‘å¹…µ¥Œµ¥¹¥µÕ´YI4½I4É•ÅÕ¥É•µ•¹ÑÌ™É½´)½‰MÁ•Œ……¥¹ÍĞÑ¡”9½‘”µÁÉ½Ù¥‘•…Á…‰¥±¥ÑäÁÉ½™¥±”¸Q•ÍÑÌè€ÈĞ¼ÈĞAMLìÁ¡åÍ¥…°…Á…‰¥±¥Ñä‘¥Í½Ù•ÉäÉ•µ…¥¹ÌÕ¹Ù•É¥™¥•¸4(4(4(ŒŒIÕ¹Ñ¥µ”¥¹Ñ•É…Ñ¥½¸ÍÑ…ÑÕÌƒŠP€ÈÀÈØ´Àà´ÀÔ4(4)]¥¹‘½İÌÍ…™”ÍÑ…¥¹œ¡…ÌÙ•É¥™¥•Ñ¡”±½…°9½‘”•¹ĞƒŠH•¹•É¥Œ]½É­•ÈƒŠH	±•¹‘•ÈƒŠHÙ…±¥‘…Ñ¥½¸ƒŠH¡•­Á½¥¹ĞƒŠH±•…¹ÕÀƒŠHQ%Y}%1±½½À°¥¹±Õ‘¥¹œÉ…Í É•½Ù•Éä…¹Ñ¥µ•½ÕĞ±•…¹ÕÀ¸MÕÁ…‰…Í”½È¥¹Ñ•É…Ñ¥½¸É•µ…¥¹Ì‰±½­•‰ä…‰Í•¹ĞÍÑ…¥¹œµÍ…™”É•‘•¹Ñ¥…±Ì½•¹‘Á½¥¹ÑÌ¸Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}]=I-I}]%9=]M}IU9Q%5}%9QIQ%=9|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(4(4(ŒŒMÑ…¥¹œÉ¥¹Ñ•É…Ñ¥½¸ÕÁ‘…Ñ”ƒŠP€ÈÀÈØ´Àà´ÀÔ4(4)É•‘•¹Ñ¥…°µ…Ñ•MÕÁ…‰…Í”½È…‘…ÁÑ•ÉÌ…É”ÁÉ•Á…É•İ¥Ñ ¹¼ÁÉ½‘ÕÑ¥½¸™…±±‰…¬½È‘•ÍÑÉÕÑ¥Ù”…Á…‰¥±¥Ñä¸Õ±°ÉÉ•µ…¥¹Ì‰±½­•‰äµ¥ÍÍ¥¹œÍÑ…¥¹œÉ•‘•¹Ñ¥…±Ì…¹½µÁ±•Ñ”…ÍÍ¥¹µ•¹Ğ)½‰MÁ•Œ½¹ÑÉ…Ğ¸4(4(ŒŒMÑ…¥¹œ‰±½­•È…Õ‘¥ĞƒŠP€ÈÀÈØ´Àà´ÀÔ4(4)5…¡¥¹”µÍ…™”•¹Ø¥¹ÍÁ•Ñ¥½¸™½Õ¹¹¼ÍÑ…¥¹œÙ…±Õ•Ì¸MÕÁ…‰…Í”½¹¹•Ñ½È•áÁ½Í•Ì¹¼Í•Á…É…Ñ”ÍÑ…¥¹œÁÉ½©•ĞìÑ¡”•á¥ÍÑ¥¹œ±…¥´IA½¹ÑÉ…Ğ¥Ì¥¹½µÁ±•Ñ”™½È„‘å¹…µ¥Œ)½‰MÁ•Œ¸ÈÍÑ…¥¹œ•¹‘Á½¥¹Ğ½‰Õ­•Ğ½­•ä…É”…±Í¼…‰Í•¹Ğ¸=İ¹•È¥¹ÁÕÑÌ…¹•á…Ğ…ÍÍ¥¹µ•¹Ğ…±Ñ•É¹…Ñ¥Ù•ÌèÉ•Á½ÉÑÌ½İ½É­•È½]M}MQ%9}	1=-I}U%Q|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(4(ŒŒU10ÍÑ…¥¹œÉƒŠPI0IU9Q%5YI%%ƒŠP€ÈÀÈØ´Àà´ÀÔ4(4)Q¡”¥Í½±…Ñ•ÍÑ…¥¹œÁ…Ñ ¥Ì¹½ÜÙ•É¥™¥••¹µÑ¼µ•¹è…ÍÍ¥¹µ•¹Ğ½™•¹¥¹œ•¹•É…Ñ¥½¸ƒŠH9½‘”•¹Ğ¡¥±•¹•É¥Œ]½É­•ÈƒŠHÉ•…°	±•¹‘•ÈÉ•¹‘•ÈƒŠH¥¹Ñ•É¥Ñä½¡•­Á½¥¹ĞƒŠHÈÍÑ…¥¹œ!­M!´ÈÔØÙ•É¥™¥…Ñ¥½¸ƒŠHMÕÁ…‰…Í”½µÁ±•Ñ¥½¸ƒŠH±•…¹ÕÀƒŠHQ%Y}%1€¸Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}MQ%9}U11}É}I1}IU9Q%5}YI%%|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(ŒŒ@À™½±±½ÜµÕÀƒŠP€ÈÀÈØ´Àà´ÀÔ4(4(´5Õ±Ñ¤µ¹½‘”½™…¥±½Ù•Èè€¨©I0IU9Q%5YI%%¨¨¥¸ÍÑ…¥¹œ°¥¹±Õ‘¥¹œÍÑ…±”Ñ…­•½Ù•È…¹•¹•É…Ñ¥½¸™•¹¥¹œ¸Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}5U1Q%}9=}%1=YI}I1}IU9Q%5}YI%%|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(´‘µ¥¸±••ĞÉ•…°ÉÕ¹Ñ¥µ”è€¨©	1=-½U9YI%%¨¨Á•¹‘¥¹œÍÑ…¥¹œÍÑ…™˜µÉ½±”½0ÈÍ•ÑÕÀ…¹‘•Á±½å•É½ÕÑ”Ù•É¥™¥…Ñ¥½¸¸4(´!½ÍÑ¥±”€¹‰±•¹‘€¥Í½±…Ñ¥½¸è€¨©U9YI%%½	1=-¨¨Á•¹‘¥¹œ„‘¥ÍÁ½Í…‰±”]¥¹‘½İÌM…¹‘‰½àµ…Á…‰±”¡½ÍĞ¸Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}!=MQ%1}	19}%M=1Q%=9}A=|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(´AÉ½‘ÕÑ¥½¸É½±±½ÕĞÉ•…‘¥¹•ÍÌè€¨©9<µ<¨¨¸Ù¥‘•¹”½¡•­±¥ÍĞèÉ•Á½ÉÑÌ½İ½É­•È½]M}AI=UQ%=9}I=11=UQ}I%9MM|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(´‘µ¥¸I	ÍÑ…¥¹œÍ¡•µ„¥Ì…ÁÁ±¥•…¹Ù•É¥™¥•ìÉ•…°‘µ¥¸U$É•µ…¥¹Ì€¨©	1=-½U9YI%%¨¨Á•¹‘¥¹œ=İ¹•ÈÕÑ ½5Í•ÑÕÀ¸Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}5%9}1Q}MQ%9}UQ!}	1=-I|ÈÀÈØ´Àà´ÀÔ¹µ‘€¸4(´%Í½±…Ñ¥½¸A=¡…ÌÁ…ÉÑ¥…°)½ˆ=‰©•ĞÉÕ¹Ñ¥µ”•Ù¥‘•¹”°‰ÕĞ™¥±•ÍåÍÑ•´½¹•Ñİ½É¬‰½Õ¹‘…Éä¥Ì€¨©U9YI%%½	1=-¨¨ìÁÉ½‘ÕÑ¥½¸É•µ…¥¹Ì€¨©9<µ<¨¨¸4(4(ŒŒ@ÄÉ•±¥…‰¥±¥Ñä™½±±½ÜµÕÀƒŠP€ÈÀÈØ´Àà´ÀØ4(4(´9½‘”•¹ĞÉ•ÑÉä‰…­½™˜¹½ÜÍÕÁÁ½ÉÑÌ‰½Õ¹‘•½ÁĞµ¥¸©¥ÑÑ•Èİ¥Ñ ‘•Ñ•Éµ¥¹¥ÍÑ¥ŒÑ•ÍÑÌì‘•™…Õ±ĞÑ¥µ¥¹œ¥ÌÕ¹¡…¹•¸Ù¥‘•¹”èÉ•Á½ÉÑÌ½İ½É­•È½]M}9=}9Q})%QQI}!I9%9|ÈÀÈØ´Àà´ÀØ¹µ‘€¸4(´Må¹¡É½¹½ÕÌÉ•µ½Ñ”$½<°ÁÉ½‘ÕÑ¥½¸M4½)½ˆ=‰©•Ğ¥¹Ñ•É…Ñ¥½¸°¥Í½±…Ñ¥½¸°½‰Í•ÉÙ…‰¥±¥Ñä°É½±±‰…¬°…¹ÁÉ½‘ÕÑ¥½¸…ÕÑ¡•¹Ñ¥…Ñ¥½¸É•µ…¥¸½Á•¸…Ñ•Ì¸((ŒŒ…Á…¥Ñä½½¹ÕÉÉ•¹ä™½±±½ÜµÕÀƒŠP€ÈÀÈØ´Àà´ÀØ((´]½É­•ÈÁÕ±°µ±…¥´É•µ…¥¹Ì‘…Ñ…‰…Í”µÍ•É¥…±¥é•İ¥Ñ =HUAQM-%@1=-€°…Á…‰¥±¥Ñä¡•­Ì°‰½Õ¹‘•É•ÑÉä°…¹•¹•É…Ñ¥½¸™•¹¥¹œ¸(´1½…°Í…±”Í¥µÕ±…Ñ¥½¸½Ù•ÉÌ¡•…ÉÑ‰•…Ğ½™…¥±ÕÉ”‰ÕÉÍÑÌ½¹±äìMÕÁ…‰…Í”½È°Á¡åÍ¥…°]½É­•È°…¹ÁÉ½‘ÕÑ¥½¸…Á…¥ÑäÉ•µ…¥¸Õ¹Ù•É¥™¥•¸(´9•áĞ]½É­•ÈÍ…±”…Ñ”¥Ì¥Í½±…Ñ•ÍÑ…¥¹œ±½…İ¥Ñ €ÄÀÀ¼Ä°ÀÀÀÍå¹Ñ¡•Ñ¥Œ¥‘•¹Ñ¥Ñ¥•Ì‰•™½É”…¹ä€Ä°ÀÀÀ¼ÄÀ°ÀÀÀÉ•‘•Í¥¸¸(´Må¹Ñ¡•Ñ¥Œ¡•…ÉÑ‰•…Ğ©¥ÑÑ•È°É•½¹¹•ĞÍÑ½É´…¹‰½Õ¹‘•™…¥±½Ù•ÈÍ¥µÕ±…Ñ¥½¸…É”¥¹±Õ‘•¥¸Ñ•ÍÑÌ½Í…±¥¹œ½İÍ}…Á…¥Ñå}Í¥µÕ±…Ñ¥½¸¹Áå€ì¹¼MÕÁ…‰…Í”İÉ¥Ñ”…Á…¥Ñä¥Ì±…¥µ•¸((ŒŒ•¹•É¥Œ]½É­•È¡…É‘•¹¥¹œ™½±±½ÜµÕÀ€´€ÈÀÈØ´Àà´ÀØ((´İ½É­•É}•¹¥¹”¹Áå€ÍÑÉ•…µÌ™¥±•ÍåÍÑ•´¡•­Á½¥¹Ğ½Á¥•Ì¥¸‰½Õ¹‘•¡Õ¹­Ì…¹É•µ½Ù•ÌÑ•µÁ½É…Éä™¥±•Ì½¸¥¹Ñ•ÉÉÕÁÑ•İÉ¥Ñ•Ì¸(´ÑÑ•µÁĞ™•¹¥¹œ¥Ì¡•­•¥µµ•‘¥…Ñ•±ä‰•™½É”¡•­Á½¥¹ĞÍÑ½É…”İÉ¥Ñ•Ì°¥¸…‘‘¥Ñ¥½¸Ñ¼Ñ¡”Á½ÍĞµ¡•­Á½¥¹ĞÙ•É¥™¥…Ñ¥½¸Õ…É¸(´Y•É¥™¥…Ñ¥½¸èÁåÑ¡½¸€µ´Õ¹¥ÑÑ•ÍĞ‘¥Í½Ù•È€µÌİ½É­•È€µÀ€Ñ•ÍÑ|¨¹Áä€€´€¨¨Ğä¼ĞäAML¨¨¸(´I•µ…¥¹¥¹œ…Ñ”è…ÕÑ¡•¹Ñ¥…Ñ•ÍÑ…¥¹œ½Á¡åÍ¥…°]½É­•ÈÉÕ¹Ñ¥µ”İ¥Ñ É•…°±•…Í”É•Ù½…Ñ¥½¸…¹È‰•¡…Ù¥½È¸