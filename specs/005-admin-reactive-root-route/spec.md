# Spec 005 — Reactive Admin Root Route

## Goal
Ensure the existing production CWS Admin UI mounts reliably at `/#/admin` and `#admin`, survives OAuth/MFA return and refresh, and never falls through to the customer portal merely because the URL hash changed after the initial React render.

## Grounding / Reality
- FACT: `cws-portal.vercel.app` currently aliases deployment `dpl_6SYVHLBjVdpJDKKRkLJQjnTBCTxG`, production commit `8e12185866c90b9d8973497ae7c24db46f002eba`, READY.
- FACT: `src/pages/AdminScreen.jsx` contains the new `CWS ADMIN` operations UI.
- FACT: `src/App.jsx` routes by reading `window.location.pathname/hash` during render and has no root-level `hashchange` subscription.
- FACT: current source itself documents that changing `window.location.hash` does not automatically re-render `App()`.
- Owner observation: production still showed the old/customer UI for the Admin route.

Claim status: PARTIALLY VERIFIED at production runtime because deployment identity is verified, but browser DOM after JavaScript execution is not directly inspectable with the currently available connector.

## Expected vs Actual
Expected: visiting or navigating to `/#/admin` renders the Admin authentication/dashboard shell and customer UI is not mounted.
Actual: Owner observed old/customer UI despite the production deployment containing the Admin implementation.

## Proximate Cause
Root route selection depends on an imperative read of `window.location` without a reactive subscription. URL hash changes can therefore leave the already-mounted customer tree in place.

## Root Cause
The application lacks a single reactive root-routing boundary. Routing responsibility is embedded inside `App.jsx`, while OAuth/staff flows mutate `window.location.hash` and sometimes force reloads as compensation. The missing invariant is: **root shell selection must be derived from current URL state and must re-render on URL navigation events.**

## Five Whys
1. Why can Admin show customer UI? Root shell selection can remain stale after hash navigation.
2. Why can it remain stale? React is not subscribed to `hashchange`/`popstate` at the root.
3. Why is there no subscription? Routing is implemented as direct `window.location` conditionals inside `App.jsx`, not as reactive state.
4. Why did the previous fix fail? It added another accepted hash string (`#/admin`) but did not change the routing mechanism.
5. What durable correction removes the failure class? Add one small reactive root router above `App` that owns shell selection and subscribes to URL navigation.

## One Current Bottleneck
Admin production shell selection at `/#/admin`.

## Scope
- Add a deterministic root-route resolver for Admin aliases.
- Add a reactive root router at the React entry point.
- Keep existing Admin authentication/authorization and existing infrastructure unchanged.
- Add regression tests for route resolution.
- Deploy through the existing GitHub/Vercel project only.

## Non-goals
- No new Vercel project/service/dependency.
- No redesign of Admin UI.
- No change to staff RBAC, Supabase MFA, customer authentication, backend APIs, Worker architecture, scheduler, storage, or payment.
- No claim of Golden E2E completion.

## Risks
- Duplicated route checks remain temporarily in `App.jsx`; they are harmless because the root router intercepts Admin before `App` mounts. A later cleanup may consolidate Staff/Host routing once independently verified.
- Direct `/admin` path behavior still depends on the existing Vercel SPA fallback; canonical Admin link remains hash-based.

## Success Evidence
- Code/test evidence: route resolver recognizes `/admin`, `#admin`, `#/admin`, and Admin sub-hashes; non-Admin URLs resolve to customer app.
- Build/deploy evidence: Vercel production deployment from the merged commit is READY and aliased to `cws-portal.vercel.app`.
- Production runtime evidence required before DONE: a real browser DOM at `https://cws-portal.vercel.app/#/admin` contains `CWS ADMIN` (or the Admin login shell before authentication) and does not mount the customer shell, including after refresh/OAuth return.
