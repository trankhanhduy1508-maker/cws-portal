# Spec 007 — Separate Admin Frontend

## Goal
Create a physically separate Admin frontend for CWS so Founder/Admin uses a different production hostname from the Customer Portal, while preserving the same backend, Supabase, B2, Worker fleet, and SePay source of truth.

## Founder decision
APPROVED 2026-08-11: split Admin into its own link/site. Target hostname: `cws-admin.vercel.app`. Customer remains `cws-portal.vercel.app`.

## Grounding
- Current Customer and Admin shells share one Vite app and root router.
- The Founder has repeatedly observed Customer UI while trying to reach Admin.
- Previous fixes addressed hash syntax, route reactivity, and OAuth-fragment collisions, but the shared frontend remains an unnecessary coupling boundary.
- Existing backend already enforces staff role + Supabase MFA/AAL2, so frontend separation must not weaken authorization.
- Vercel supports multiple projects from one Git repository with independent build settings.

## Root cause
A single browser application owns both Customer and Admin shell selection. That couples customer routing, staff OAuth callback state, and Admin shell mounting. Even when individual routing bugs are fixed, the shared shell creates a recurring failure class and makes role separation harder to verify.

## Current bottleneck
Founder cannot reliably reach an unmistakably separate Admin application in production.

## Scope
- Keep one canonical GitHub repository.
- Add a dedicated Admin Vite entry/build under `apps/admin`.
- Admin build must mount only the Admin tree; it must not import `App.jsx` or Customer pages.
- Preserve current Admin Google OAuth + TOTP/AAL2 + backend staff-role enforcement.
- Add CI coverage that builds the Admin artifact independently.
- Update active architecture/docs and FigJam to show two frontend applications.
- Create/deploy a new Vercel project named `cws-admin` when platform tooling permits.

## Non-goals
- No duplicate backend, Supabase, B2 bucket, Worker fleet, SePay integration, or GitHub repository.
- No new authorization bypass or client-side-only staff trust.
- Do not remove the legacy `/admin` route from Customer Portal until the separate Admin production deployment is verified.

## Success evidence
1. `npm run build:admin` passes independently.
2. Admin entry imports `AdminScreen` directly and never imports Customer `App.jsx`.
3. Existing frontend/backend CI remains green.
4. New Vercel project `cws-admin` is production READY and serves the Admin shell on its own hostname.
5. Founder browser evidence shows `CWS ADMIN` on the separate hostname.
6. Only after #4–5, legacy Customer Portal Admin routing can be redirected/deprecated in a follow-up.
