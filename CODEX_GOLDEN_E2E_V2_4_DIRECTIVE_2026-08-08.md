# CWS Golden Production E2E V2.4 Directive — 2026-08-08

This is the repository execution contract for the Golden Production E2E. It
supersedes older approval-before-payment wording in historical MVP documents.
The exact production input is:

- Portal: `https://cws-portal.vercel.app/`
- Drive input: `https://drive.google.com/file/d/1evCyfEKjwFv-4ty-v4xAU_J29vOK3Yh0/view?usp=drivesdk`

## Required source order

Before implementation or deployment, read in this order:

1. `CWS_MVP_WORKFLOW_FINAL.md`
2. `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`
3. `CURRENT_STATUS.md`
4. `DECISIONS.md`
5. `AGENTS.md`
6. `CWS_SCALABILITY_RULES.md`

The original directive and V2.4 roadmap were absent when this run started; this
file and the roadmap are now the explicit repository source for subsequent runs.

## Golden chain

`Customer Vercel → exact Drive input → Backend → B2 input → durable task →
automatic Worker claim → safe archive extraction → Blender preflight →
immutable-original/analyzer/working-copy/safe-optimizer/validation → real
Blender CLI background render → real progress → real output validation → FULL
OUTPUT B2 LOCKED → 3–5 real CWS-watermarked previews → FINAL PRICE → payment
record + payment code + canonical MB QR → SePay exact reference/content + exact
amount + idempotency → PAID → authorized B2 download unlock → customer download
→ cleanup → Worker idle`.

## Non-negotiable safety rules

- Accepted inputs are `.blend`, `.zip`, and `.rar`; archives must contain exactly
  one `.blend` and remain within the per-attempt sandbox.
- ZIP/RAR extraction rejects traversal, absolute/drive paths, links/reparse
  points, duplicate paths, nested archives, and bounded archive bombs. RAR uses
  managed 7-Zip with an argument vector and no shell.
- Customer originals are immutable and hash-checked. Optimization is limited to
  an approved safe policy and may not reduce samples, resolution, subdivision,
  textures, volumetrics, or change the render engine without approved
  benchmark/policy evidence.
- Customer `.blend` execution uses Blender CLI/background with arbitrary
  autoexec disabled. No mock progress, result, payment, or fake PAID is allowed.
- The full result is uploaded before payment but is not exposed through the
  customer API until `PAID`. After `PAID`, delivery only signs/unlocks the
  existing object; it must not rerender or upload again.
- QR uses only the canonical deployed MB account number/name. Missing canonical
  account configuration fails closed; no account details may be invented.

## Completion rule

Only a production trace using the exact Portal and Drive input may be marked
`GOLDEN E2E PASS`. Local tests, health checks, unit tests, fixtures, mocks,
database edits, or a READY deployment are not sufficient. If the exact chain
cannot run, record the concrete external blocker and evidence under `reports/`.
