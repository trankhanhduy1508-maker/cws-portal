# CWS job-scoped B2 capability evidence — 2026-08-08

## Outcome

V2.3 P1 is **CODE/UNIT VERIFIED** and **RUNTIME NEEDS_VERIFICATION**. The old
per-Worker B2 application-key design is superseded.

Canonical boundary:

`Worker HMAC identity -> authenticated Backend -> current fenced claim -> 120s exact-object B2 capability -> Worker streams download/upload -> capability expires`

## B2 capability research

- Backblaze documents that its S3-compatible API supports presigned URLs for
  both downloads and uploads, using AWS Signature V4 over HTTPS:
  https://www.backblaze.com/docs/cloud-storage-s3-compatible-api
- Supported operations include `GetObject`, `HeadObject`, `PutObject` and
  multipart operations:
  https://www.backblaze.com/docs/en/cloud-storage-call-the-s3-compatible-api
- Native `b2_get_upload_url` returns an upload authorization token reusable for
  a bucket and potentially valid for 24 hours. It was not selected because it
  is broader than one job object:
  https://www.backblaze.com/apidocs/b2-get-upload-url

## Implemented

- `POST /worker/storage-capability` is protected by the existing per-Worker
  HMAC/replay guard.
- Backend calls `get_claimed_task_spec(worker_id, task_id, generation)` before
  every capability and derives every object key from that server-side result.
- Input GET is limited to the claimed B2 `.blend`/`.zip` object.
- Frame PUT/GET is limited to the task's assigned frame range. PUT binds content
  length/type plus job, task, attempt, generation, frame, bytes and SHA-256
  metadata. Resume GET is returned only when metadata matches the current
  attempt/generation.
- Worker validates HTTPS `*.backblazeb2.com`, method, expiry (maximum 300s),
  signed-header allowlist and content length, then streams with bounded size and
  partial-file cleanup.
- Provisioning removes stale `CWS_B2_*` User environment values and never
  installs a B2 secret.

## Scale and compromise review

- Manual action per Worker: existing bounded identity enrollment only; no B2
  action.
- Manual action per Job: none.
- Secret on Worker: only its DPAPI-protected per-Worker HMAC credential.
- Compromised Worker: access is limited to its current task and exact
  input/output objects during a 120-second URL lifetime. It cannot recover the
  server B2 key or ask Backend for an unrelated arbitrary object key.
- Worker 101/1001: identical enrollment/runtime contract.
- Likely scale bottleneck: Backend claim-validation/signature request rate and
  B2 `HeadObject` calls for checkpoints. These are stateless/horizontally
  scalable later without changing the Worker contract. No broker was added
  without measured need.
- Residual bounded risk: a URL issued before reassignment remains usable until
  its 120-second expiry. Attempt/generation metadata prevents stale output from
  being accepted as a current checkpoint; fencing rejects stale progress and
  finalization.

## Verification

- Worker tests: 76/76 PASS.
- Backend tests: 35 suites / 182 tests PASS.
- New capability tests cover exact input GET, bounded frame PUT,
  stale/unclaimed and out-of-range rejection, and current-attempt checkpoint
  GET.
- Backend build PASS; targeted ESLint PASS.
- Full Backend lint remains blocked by pre-existing repository-wide
  CRLF/Prettier noise outside this scoped change; no broad formatting rewrite
  was made.
- Production B2 transfer and Blender E2E are **NOT VERIFIED** by these tests.

## Production deployment probe

- Render `/health`: HTTP 200.
- Anonymous `POST /worker/storage-capability`: HTTP 401.
- MAY083 HMAC/DPAPI-authenticated request to the same endpoint: HTTP 400 because
  task/generation 1 is not currently claimed by MAY083. This proves the route
  and authentication boundary are deployed and fail closed; it does not prove
  a real B2 transfer.
- Authenticated `worker_ping`: PASS; production `workers.last_seen_at` advanced
  to `2026-08-08 03:57:49.917489+00`, `status=idle`.
- P2 exposed a separate real defect: the gateway rejected taskless
  `report_worker_state_transition(ACTIVE_IDLE)` with HTTP 400. The fix adds a
  strict state allowlist and optional positive task ID for this operation;
  targeted regression tests pass. After deployment, the same authenticated
  request passed and production recorded MAY083 as `status=idle`,
  `observed_state=ACTIVE_IDLE`, `current_task_id=null`, with transition time
  `2026-08-08 04:03:10.083518+00`.
- The existing job dispatch convention produces
  `b2://uploads/<uuid>-<filename>`. Input capability parsing now supports that
  exact convention (and bucket-qualified legacy form), remains restricted to
  the `uploads/` prefix, and rejects `final/` or other prefixes. Unit coverage
  proves both acceptance and rejection. No production B2 object exists yet, so
  real transfer remains **NOT VERIFIED**.

## Supabase boundary

No schema/migration change is required. Supabase documentation confirms secret
or service-role keys bypass RLS and belong only on trusted server-side code;
Workers continue through the authenticated Backend gateway rather than holding
such a key:
https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
