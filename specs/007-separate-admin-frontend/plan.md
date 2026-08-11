# Plan 007 — Separate Admin Frontend

## Design
Use one canonical repository with two independently buildable Vite frontends:

- Customer: existing root app → `cws-portal.vercel.app`
- Admin: `apps/admin` entry → new Vercel project `cws-admin`

The Admin entry imports only the existing `AdminScreen` tree and shared staff/admin service modules. It does not import `App.jsx`, customer pages, upload flow, customer routing, or customer screen state.

## Build layout
- Add `apps/admin/index.html`.
- Add `apps/admin/src/main.jsx` that mounts `AdminScreen` directly.
- Add `apps/admin/vite.config.js` with `root` set to `apps/admin` and output to `apps/admin/dist`.
- Add root npm script `build:admin`.
- Keep root customer `npm run build` unchanged.
- CI runs both customer build and Admin build.

## Auth/security
- Continue using the same Supabase project for staff Google OAuth.
- Continue mandatory TOTP/AAL2.
- Continue backend `/staff/*`, Admin/Fleet/Jobs/Payments authorization with Bearer staff token and server-side role enforcement.
- Frontend separation is an isolation/reliability boundary, not an authorization boundary.

## Deployment
Create a second Vercel project connected to the same GitHub repository. Configure its build command as `npm run build:admin` and output directory as `apps/admin/dist`. Copy only the same public frontend environment values needed by Admin (`VITE_CWS_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`/legacy anon key).

Do not create any duplicate backend, database, storage, Worker or payment resource.

## Rollout
1. Merge code/docs after CI.
2. Create/deploy `cws-admin` project.
3. Verify `cws-admin.vercel.app` shows Staff Google/MFA then `CWS ADMIN`.
4. Keep old `/admin` temporarily as rollback path.
5. In a later verified cleanup, remove/redirect legacy Admin routing from Customer Portal.
