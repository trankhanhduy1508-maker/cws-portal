# Plan 005 — Reactive Admin Root Route

## Constitution / Funnel Check
- Documents before code: satisfied for current status, grounding, staleness, canonical roadmap/workflow, decisions, project context and execution funnel.
- Root cause over symptom: fix reactivity boundary, not another hash-string special case.
- Existing infrastructure only: no new service/project/dependency.
- Minimum implementation: one pure route resolver + one root router + entry-point wiring + tests.

## Design
1. Create `src/routing/rootRoute.js` with a pure `resolveRootRoute(locationLike)` function.
2. Recognize Admin for canonical hash route `#/admin`, historical `#admin`, Admin hash subroutes, and `/admin` pathname.
3. Create `src/RootRouter.jsx` that:
   - initializes from current `window.location`;
   - subscribes to `hashchange` and `popstate`;
   - renders `AdminScreen` for Admin root route;
   - otherwise renders existing `App` unchanged.
4. Change `src/main.jsx` to mount `RootRouter` instead of `App` directly.
5. Add deterministic Vitest coverage for the route resolver.

## Why not add React Router
The repo currently has no router dependency. Adding a dependency and lockfile churn is unnecessary for this single verified bottleneck. The minimum durable fix is a tiny deterministic router boundary using browser navigation events.

## Security / Auth
No authorization is moved client-side. `AdminScreen` still requires the existing Staff Google OAuth + Supabase TOTP/AAL2 flow and backend role enforcement. Routing only chooses which UI tree to mount.

## Rollback
Revert `src/main.jsx`, remove `src/RootRouter.jsx` and `src/routing/rootRoute.js`. Existing `App.jsx` routing remains as fallback behavior.

## Verification
- Vitest route unit tests.
- Vercel preview/production build READY after merge.
- Verify production alias points to merged commit.
- Browser DOM verification remains mandatory for PRODUCTION RUNTIME VERIFIED status.
