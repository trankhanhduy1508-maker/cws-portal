# Engineering Learning Log — Separate Admin Frontend — 2026-08-11

## Symptom
The Founder repeatedly reached Customer upload UI while attempting to use Admin, even after several shared-portal routing fixes.

## Root cause
Customer and Admin were coupled inside one browser application. Shared root-shell selection, hash routing and staff OAuth callback state created a recurring class of failures where Admin could fall through to Customer UI.

## Previous attempts that were insufficient
1. Accept `#/admin` in addition to `#admin`.
2. Make root routing reactive with `hashchange`/`popstate`.
3. Move staff OAuth callback identity from fragment to pathname `/admin`.

Each removed one concrete bug, but none removed the shared frontend coupling itself.

## Founder decision
Split Admin into a separate production frontend hostname. Target: `cws-admin.vercel.app`. Customer remains `cws-portal.vercel.app`.

## Durable fix
- Keep one canonical GitHub repository.
- Add an independent Admin Vite build under `apps/admin`.
- Admin entry mounts `AdminScreen` directly and does not import Customer `App.jsx` or Customer pages.
- Build both artifacts independently in CI.
- Create one explicitly approved additional Vercel frontend project for Admin only.
- Continue sharing the existing Render backend, Supabase, B2, Worker fleet and SePay.

## Security invariant
Frontend separation is not authorization. Admin still requires Google staff login, Supabase TOTP/AAL2 and server-side staff role checks. No service-role secret or Admin bypass is added to the browser.

## Verification
- Customer production build: required PASS.
- Admin independent build: required PASS.
- Frontend tests/lint: required PASS.
- Backend build/tests/lint: required PASS.
- Production completion additionally requires `cws-admin.vercel.app` READY plus Founder browser evidence of `CWS ADMIN`.

## Rule learned
When two user roles have different trust boundaries and materially different product shells, do not make one shell a routing fallback of the other. Prefer independent frontend entry points/deployments while keeping shared business data and authorization centralized behind the backend.
