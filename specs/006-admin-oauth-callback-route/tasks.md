# Tasks 006 — Admin OAuth callback route

- [x] Ground production screenshot showing Customer UI after expected Admin flow.
- [x] Verify current Supabase client uses default browser auth options.
- [x] Verify staff OAuth redirect currently uses `/#admin`.
- [x] Verify Vercel path fallback supports `/admin`.
- [x] Diagnose fragment collision with Supabase implicit OAuth callback.
- [ ] Change staff OAuth return to `/admin`.
- [ ] Update staffAuth regression test.
- [ ] Add `/admin#access_token=...` root-route regression test.
- [ ] Run frontend build/test/lint.
- [ ] Run full CI.
- [ ] Review diff for auth/security scope creep.
- [ ] Merge to main.
- [ ] Verify existing production Vercel project deploys merged commit.
- [ ] Verify `cws-portal.vercel.app` points to the new production deployment.
- [ ] Update engineering learning log.
- [ ] Obtain fresh production browser evidence from Founder.
