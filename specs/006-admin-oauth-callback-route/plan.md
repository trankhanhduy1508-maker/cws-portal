# Plan 006 — Admin OAuth callback route

## Design
Use pathname `/admin` as the durable Admin shell identity and reserve the URL fragment for Supabase implicit-auth callback data.

## Why this is the minimum durable correction
- RootRouter already recognizes `/admin` by pathname.
- Existing `vercel.json` rewrites every path to `/index.html`.
- No new dependency/router/service is required.
- Supabase can continue consuming its implicit OAuth fragment without colliding with app routing.

## Changes
1. Update `signInStaffWithGoogle()` redirect from `/#admin` to `/admin`.
2. Update the existing staffAuth regression test.
3. Extend root-route regression coverage with `/admin` plus an OAuth token fragment.
4. Run frontend build/test/lint and full CI.
5. Merge only after green verification.
6. Confirm the existing production Vercel project deploys the merged main commit.

## Security
RBAC, AAL2/MFA, bearer handling, backend checks, and customer auth remain unchanged. This modifies only the browser return location.

## Rollback
Revert the isolated redirect/test commit if production authentication regresses.
