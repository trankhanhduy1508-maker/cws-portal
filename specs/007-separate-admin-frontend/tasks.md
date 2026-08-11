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
- [x] Merge isolated Admin frontend to main.
- [x] Create new Vercel project `cws-admin` from the same GitHub repo.
- [x] Configure Admin production build against the existing Render backend and Supabase browser-auth project only; no duplicate backend/Supabase/B2/Workers/SePay.
- [x] Verify `https://cws-admin.vercel.app/` production READY and HTTP 200 serving the real `CWS Admin` artifact.
- [x] Verify deployed JS contains the Admin navigation/shell and dedicated-origin OAuth redirect logic.
- [ ] Verify Supabase Auth Additional Redirect URLs includes exact production Admin callback `https://cws-admin.vercel.app/` (current connector can read project/docs but cannot read/write hosted Auth URL Configuration).
- [ ] Obtain Founder browser evidence showing Google -> MFA/AAL2 -> Admin dashboard on the separate hostname.
- [ ] Only after browser OAuth/MFA verification, retire/redirect legacy Admin route from Customer Portal.
