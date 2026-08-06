# CWS UI premium dark refresh — 2026-08-07

## Scope

Presentation-only refresh for the customer portal shell and MVP screens. The
customer state machine, API calls, upload/Drive flow, render-before-payment
gate and Admin route were not changed.

## Implemented

- Dark responsive compute aesthetic for the shell, cards and controls.
- Lightweight CSS 3D CWS mark with restrained floating motion.
- Reduced-motion fallback and dark-theme focus/selection contrast.
- No Three.js or new dependency was added to the MVP.

## Verification

- Frontend tests: 9/9 PASS.
- Frontend lint: PASS.
- Vite production build: PASS.
- Local browser visual verification: NOT RUN (`agent-browser` is not installed).
- Production visual/runtime verification: NOT VERIFIED; production is older
  than canonical `main` and deployment quota was previously exhausted.

## Remaining

Physical Worker, B2 production, authenticated Admin AAL2 and payment remain
external runtime gates documented in `CURRENT_STATUS.md`.
