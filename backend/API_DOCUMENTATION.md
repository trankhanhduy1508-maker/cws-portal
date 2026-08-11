# CWS Backend — API Documentation

Base URL: `{VITE_CWS_API_BASE_URL}`.

> Current contract note — 2026-08-11: customer render speed/tier selection is removed. There is no customer tier field and no tier-specific pre-render estimate endpoint. Scheduler owns render capacity automatically.

## Authentication

Customer authentication uses Google OAuth through Supabase Auth. Customer-owned routes use `Authorization: Bearer <supabase-access-token>` and Backend verifies ownership server-side.

Privileged Admin/staff operations remain protected by the active staff role + MFA/AAL2 contract. Worker operations use the authenticated Worker gateway. Do not infer authorization from client state.

## Customer Jobs

### POST /jobs
Create exactly one customer-owned render Job after canonical input is materialized/validated.

Headers:
- `Authorization: Bearer <customer token>`
- `Idempotency-Key: <16-128 safe chars>`

Request body:
```json
{
  "fileRef": "uploads/uuid-file.blend",
  "driveLink": null,
  "fileName": "scene.blend",
  "fileSizeBytes": 52428800,
  "software": "Blender",
  "softwareVersion": "4.2",
  "notes": "Optional note"
}
```

Customer does not provide scheduling capacity, hardware, Worker count or a render tier identifier.

Response:
```json
{ "jobId": "uuid" }
```

### GET /jobs
Returns jobs authorized for the caller. Customer requests are owner-scoped; Admin access follows the active staff authorization contract.

### GET /jobs/by-storage-code/:storageCode
Privileged lookup by storage code.

### GET /jobs/:id
Returns one authorized Job snapshot.

### GET /jobs/:id/status
Returns:
```json
{ "status": "rendering", "stageProgress": 0.5 }
```

### GET /jobs/:id/preview
Returns real watermarked preview images for an authorized Job after output preparation.

### POST /jobs/:id/approve
Legacy-compatible payment-details route. It is **not** a customer approval prerequisite. Production Scheduler creates payment only after real render/finalization, locked full output and real previews. Final price comes from verified runtime/cost evidence.

### POST /jobs/:id/request-changes
Current compatibility/support route for a Job at its allowed state. This route does not authorize payment or download.

### POST /jobs/:id/cancel
Cancel an authorized Job while cancellation is still allowed by its server-side lifecycle state.

### DELETE /jobs/:id
Alias for the same cancellation behavior.

### GET /jobs/:id/download
After Backend has authoritative `PAID` and an existing locked final object, records download audit and redirects to a short-lived authorized B2 URL.

### GET /jobs/:id/logs
Returns authorized Worker/job logs.

### GET /jobs/:id/notifications
Returns authorized Job notifications.

## Input

### POST /files/upload
Authenticated upload of supported `.blend`, `.zip` or `.rar` input. Backend validates supported content/signature and ownership, materializes the object to canonical B2 storage, and returns a canonical `fileRef`.

Typical response:
```json
{
  "fileRef": "uploads/uuid-name.blend",
  "fileName": "name.blend",
  "fileSizeBytes": 123456
}
```

### POST /drive/resolve
Authenticated approved Google Drive ingestion. Backend materializes the accepted file into canonical B2 storage before Job creation; Worker execution must not depend on the external Drive URL after materialization.

Request:
```json
{ "driveLink": "https://drive.google.com/file/d/..." }
```

## Payments

MVP payment path uses Vietnam bank QR + SePay.

### GET /payments/:id
Returns authorized payment details/status for the owning customer or authorized staff.

### GET /payments/by-code/:paymentCode
Privileged payment lookup.

### POST /payments/webhook
Authenticated payment-event boundary for the generic bank webhook contract. Matching is server-side, exact and fail-closed.

### POST /payments/webhook/sepay
Live SePay webhook. Backend validates the active SePay authentication contract and matches exact transfer reference/content + exact amount idempotently before setting `PAID`.

### POST /payments/webhook/sepay/test
Separate test/sandbox route using separate test credentials while preserving the same matching rules.

PAID is never accepted from browser local state or natural-language AI judgment.

## Worker / Scheduler

Customer frontend never calls Worker/Scheduler directly. Scheduler determines capacity automatically over the existing durable Postgres task ownership, atomic claim, lease and generation fencing model.

Worker RPC/storage-capability routes are protected by the authenticated Worker identity boundary and task/generation ownership checks.

## Realtime

### WS /ws/jobs/:jobId
Authorized realtime Job updates. The server checks Job ownership before sending snapshots/updates.

## Health

### GET /health
```json
{ "status": "ok", "service": "cws-backend", "timestamp": "..." }
```

## Evidence rule
This document describes intended/current API contracts. Deployment, unit tests or documentation alone do not prove production E2E. Production claims require current runtime evidence.
