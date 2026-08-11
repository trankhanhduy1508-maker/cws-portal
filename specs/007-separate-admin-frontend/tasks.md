# Tasks 007 — Separate Admin Frontend

- [x] Record Founder approval for separate Admin hostname.
- [x] Ground current shared-app routing failure class.
- [x] Update CWS architecture FigJam with separate Customer/Admin frontends.
- [x] Specify minimal same-repo / separate-build architecture.
- [x] Add dedicated Admin Vite entry under `apps/admin`.
- [x] Add independent Admin build command.
- [x] Add CI Admin build gate.
- [x] Update DECISIONS / PROJECT_CONTEXT / CWS_ROADMAP / CURRENT_STATUS.
- [x] Update engineering learning log/report.
- [x] Run CI and verify Customer build + Admin build + frontend tests/lint + backend build/tests/lint.
- [ ] Merge to main.
- [ ] Create new Vercel project `cws-admin` from the same GitHub repo.
- [ ] Configure Admin project build/output/environment only; do not duplicate backend/Supabase/B2/Workers/SePay.
- [ ] Verify `cws-admin.vercel.app` production READY.
- [ ] Obtain Founder browser evidence showing Admin login/dashboard on the separate hostname.
- [ ] Only after production verification, retire/redirect legacy Admin route from Customer Portal.
