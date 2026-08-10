# PROJECT_CONTEXT — Computer Workspace (CWS)

## Product
CWS is a distributed Blender rendering platform. Customers submit projects; authenticated CWS Workers render them on partner PCs; CWS validates and stores outputs; customers review watermarked previews, pay by Vietnam bank QR, then download the authorized full result.

## Canonical Product Flow
`Google Login -> Upload/Google Drive -> materialize + validate canonical input -> create Job -> Worker claim -> safe prepare/optimize -> real Blender render -> validate -> B2 full output LOCKED -> 3–5 watermarked previews -> final price + MB QR -> SePay exact match -> PAID -> authorized download -> cleanup`

There is no customer-approval gate before payment. Payment is never required before render/previews. Normal runtime must operate without AI or Founder intervention.

## Current Stack
- Frontend: React on the existing Vercel production project.
- Backend/API: NestJS on the existing Render.com service.
- Database/Auth: existing Supabase project; Google OAuth for customers.
- Storage: existing Backblaze B2.
- Worker: canonical Windows Node Agent + generic Worker Engine + Blender CLI/background.
- Payment: Vietnam bank QR + SePay webhook.

## Input
Supported customer inputs are `.blend`, `.zip`, `.rar`, and approved Google Drive file links. Input must be materialized into canonical storage, validated, ownership-bound server-side, and only then used to create a Job. Archives are untrusted and extracted only in a bounded job sandbox.

## Worker / Security Direction
- Stable per-Worker identity; no hostname/GPU guess as identity.
- Authenticated Backend Worker gateway.
- PostgreSQL atomic claim/lease/generation fencing.
- Job/task-scoped storage capabilities; no long-lived B2/service-role secrets on Workers.
- Customer original input remains immutable.
- Blender autoexec for untrusted customer files remains disabled unless an explicit trusted contract permits it.
- Safe optimizer works only on a working copy and must not silently change customer visual semantics.

## Output / Pricing / Payment
- Real output is validated and uploaded to B2 before payment.
- Full output remains locked until PAID.
- Generate 3–5 real CWS-watermarked previews.
- Final price uses verified runtime/cost evidence and keeps the approved **2.5x customer multiplier**. The base cost/rate comes from current configuration/decision sources; do not invent a new rate here.
- QR embeds exact amount and payment reference.
- SePay must match exact reference/content and amount idempotently before unlock.

## Scale Direction
CWS must avoid manual per-Worker and per-job operations. Architecture should scale from the MVP toward 100/1,000/1,000,000 Workers without creating a scale dead-end, but no new broker/service is added without measured need.

## Governance
Canonical roadmap: `CWS_ROADMAP.md`.
Customer workflow: `CWS_MVP_WORKFLOW_FINAL.md`.
Current state: `CURRENT_STATUS.md`.
Decisions: `DECISIONS.md`.
Execution framework: `.specify/memory/constitution.md` + `CWS_EXECUTION_FUNNEL.md` + GitHub Spec Kit.
Runtime truth: current code/config plus evidence under `reports/`.

Never create duplicate Vercel/Render/Supabase/B2/GitHub resources without explicit Owner approval.
