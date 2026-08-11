# Spec 006 — Admin OAuth callback route

## Goal
Keep the Admin shell mounted throughout Google OAuth + Supabase session recovery so staff never fall back into the Customer portal after authentication.

## Observation
A fresh production screenshot after the previous reactive-router deployment still shows the Customer upload UI when the Founder expects Admin.

## Grounding
- Current browser Supabase client is created with default auth options (`src/services/supabaseClient.js`).
- Current Admin Google OAuth uses `redirectTo: <origin>/#admin` (`src/services/staffAuth.js`).
- Supabase JavaScript client uses the implicit flow by default for client-only apps; successful implicit OAuth returns access/refresh tokens in the URL fragment (`#access_token=...`).
- Therefore the same fragment is being used for two incompatible responsibilities: auth callback data and app routing.
- Vercel already rewrites all paths to `/index.html`, so `/admin` is a valid SPA entry path.

## Claim status
FACT: current code routes Admin return through a hash fragment.
FACT: Supabase implicit flow returns auth tokens in the hash fragment.
FACT: Vercel path fallback supports `/admin`.
ROOT CAUSE: Admin routing and implicit OAuth both compete for `window.location.hash`; the auth callback can replace `#admin`, making the top-level router resolve the Customer app.

## Expected
After Google OAuth callback, pathname remains `/admin` regardless of the auth fragment. RootRouter therefore keeps Admin mounted while Supabase consumes the auth fragment and restores the session/MFA flow.

## Actual
Using `/#admin` makes Admin identity dependent on a fragment that implicit OAuth also owns.

## Minimum fix
Change staff OAuth return URL from `/#admin` to `/admin` and add regression tests for `/admin#access_token=...`.

## Non-goals
- No auth provider change.
- No new router dependency.
- No backend/RBAC/MFA policy change.
- No new Vercel project or infrastructure.

## Success evidence
1. Frontend tests/build/lint pass.
2. `signInStaffWithGoogle()` requests `<origin>/admin`.
3. Root route test proves `/admin` remains Admin even with an OAuth token fragment.
4. Main is deployed to the existing `cws-portal` Vercel project.
5. Founder production screenshot confirms Admin login/dashboard rather than Customer upload UI.
