# Tasks 008 — Standard Customer Workflow

## Documentation / contract
- [x] Replace canonical workflow with customer-login-first flow.
- [x] Record current code contradictions and Founder priority.
- [x] Produce implementation plan before code.

## Codex implementation
- [ ] Inspect current backend auth/input/job/payment status contracts before code changes.
- [ ] Make Google customer login the first operational gate.
- [ ] Remove unauthenticated Upload/Drive interaction.
- [ ] Remove OAuth-after-input pending Drive/sessionStorage workaround if no longer needed.
- [ ] Require canonical `fileRef` / materialized input before render-mode step.
- [ ] Ensure Google Drive is materialized server-side before Job creation.
- [ ] Converge public render modes to Economy / Balanced(Standard) / Priority; preserve machine-level compatibility where required.
- [ ] Remove stale public `turbo` option unless active product/backend evidence requires it.
- [ ] Remove stale OneDrive/Dropbox/direct-link public support claims unless explicitly approved and implemented.
- [ ] Remove preview-approval wording/action from public customer state.
- [ ] Reconcile `REVIEW_READY`, `AWAITING_PAYMENT`, `PACKAGING`, `FINISHED` UI mapping with actual backend lifecycle.
- [ ] Ensure full output is validated/uploaded/locked before payment UI.
- [ ] Consolidate preview + final price + MB QR + transfer content on payment/result stage.
- [ ] Ensure frontend cannot locally unlock/download.
- [ ] Preserve real Job reattach/history behavior across refresh.
- [ ] Add regression tests for screen/state ordering and duplicate-job prevention.
- [ ] Run frontend build/test/lint.
- [ ] Run backend build/test/lint.
- [ ] Update `CURRENT_STATUS.md`, `CWS_ROADMAP.md`, relevant decisions/context, and engineering learning log.
- [ ] Open PR with evidence and no unrelated Admin work.

## Production convergence
- [ ] Merge only after CI passes.
- [ ] Deploy the existing `cws-portal` Vercel project; do not create another project.
- [ ] Verify real Google customer login in production.
- [ ] Verify real authenticated input materialization.
- [ ] Verify exactly one real Job after input ready.
- [ ] Verify real Worker/Blender/progress.
- [ ] Verify B2 locked output + real watermarked previews.
- [ ] Verify final price + exact payment content + MB QR.
- [ ] Verify SePay exact/idempotent match -> PAID.
- [ ] Verify authorized download + same Job in History.

## Explicitly deferred
- Admin UI refinement.
- Admin MFA UX polish beyond already deployed separate Admin application.
