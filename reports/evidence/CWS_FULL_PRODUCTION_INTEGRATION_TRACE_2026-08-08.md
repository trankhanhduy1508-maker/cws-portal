# CWS Full Production Integration Trace — 2026-08-08

## Result

**GOLDEN E2E: FAIL — TRUE EXTERNAL BLOCKER at customer authentication.**

This is one new trace. The exact Drive input was materialized once by the
canonical Render backend into B2. The trace then stopped at the first
downstream boundary that requires a real customer Supabase session. No job,
task, payment, PAID state, or historical task was invented or reused.

## Correlation and IDs

- `correlation_id`: `660d1f04-4971-4b61-a3db-7e5ac90c3757`
- `job_id`: `NOT_CREATED`
- `task_id`: `NOT_CREATED`
- `worker_id`: `CWS-BAE2782D20525D46` (not assigned to this trace)
- Exact input:
  `https://drive.google.com/file/d/1evCyfEKjwFv-4ty-v4xAU_J29vOK3Yh0/view?usp=drivesdk`
- Production code commit: `e4ca558041658ceec67f34642aae27b535a8129b`
- Trace window: `2026-08-08T10:16:55Z`–`2026-08-08T10:19:56Z`

## Single-chain evidence

| Link | Upstream → downstream | Config / URL | Runtime evidence, IDs, timestamp | Status |
|---|---|---|---|---|
| GitHub main | source → deploy | `origin/main`, commit `e4ca558041658ceec67f34642aae27b535a8129b` | `fix: materialize public Drive links without API key`, pushed `2026-08-08T17:16:02+07:00` | PASS |
| Vercel canonical | GitHub/Vercel → customer portal | `https://cws-portal.vercel.app/` | HTTP `200`, `2026-08-08T10:20:12Z`; served current production bundle `index-DiNmMe21.js` | PASS |
| Vercel → Render | portal → API/WS | Bundle endpoint is `https://cws-portal.onrender.com`; WS endpoint is `wss://cws-portal.onrender.com` | Current bundle fetched from canonical site; no alternate backend used | PASS |
| Render canonical | portal → backend | `https://cws-portal.onrender.com/health` | HTTP `200`, `rndr-id=2aa64f7a-3ffd-4428`, body `{"status":"ok","service":"cws-backend"}`, `2026-08-08T10:20:13.341Z` | PASS |
| Supabase production | portal/backend → auth/database | `https://ynhxlxetwuiyejcjypsi.supabase.co` | Current portal bundle uses this project; exact Worker read returned `status=idle`, `observed_state=ACTIVE_IDLE`, `current_task_id=null`, `last_seen_at=2026-08-08T10:19:42.535463Z` | PASS (connectivity/config; no trace row) |
| Drive input | customer link → Google Drive | exact URL above | Public Drive source was reachable. Local direct downloader probe observed warning page with `uuid`; final response was `125259706` bytes, `PhongNguRender5.blend`, `2026-08-08T10:15Z` | PASS |
| Drive materialization | Drive → backend → B2 input | `POST https://cws-portal.onrender.com/drive/resolve` with `{"driveLink":"<exact URL>"}` | HTTP `201`, Render `rndr-id=4ea66d12-bc34-455f`, response `fileName=PhongNguRender5.blend`, `fileSizeBytes=125259706`, `fileRef=uploads/efdc5d88-f611-4f2f-8057-b696fa863ea2-PhongNguRender5.blend`, `2026-08-08T10:18:07Z`. This endpoint returns only after the canonical B2 upload call succeeds. | PASS |
| B2 input ownership | B2 ref → `input_uploads` | B2 key above; ownership is recorded during authenticated job creation | No `input_uploads` row was created because the next request was rejected before ownership/job creation | NOT VERIFIED |
| render_order | B2 input → Supabase `render_orders` | `POST https://cws-portal.onrender.com/jobs` | Exact request used the returned `fileRef`, `fileName`, `fileSizeBytes`, `profileId=standard`, and trace idempotency key. Response HTTP `401`, `Thiếu Bearer token`, `2026-08-08T10:18:39.980Z`; `job_id=NOT_CREATED` | BROKEN — first downstream blocker |
| durable task | render_order → task | canonical backend scheduler/RPC | No render order, therefore no correlated task | NOT VERIFIED |
| Worker claim | task → `CWS-BAE2782D20525D46` | canonical Worker RPC/B2-only capability | Worker was `ACTIVE_IDLE` with no current task, but had no correlated task to claim | NOT VERIFIED |
| production_node_agent | claim → node agent | canonical Worker contract | No claim/lease/generation for this correlation | NOT VERIFIED |
| worker_engine | node agent → engine | canonical worker engine | No correlated engine stage/progress | NOT VERIFIED |
| Blender PID | engine → Blender CLI/background | customer autoexec remains off | No correlated Blender process | NOT VERIFIED |
| optimized working copy | immutable original → analyzer → optimizer → validation | safe Blender optimization contract | No correlated original/working-copy hashes or optimizer manifest | NOT VERIFIED |
| real render | Blender → output | canonical render path | No correlated real render/progress/output | NOT VERIFIED |
| locked final | validated output → B2 final | canonical locked output path | No correlated final artifact, remote verification, or lock evidence | NOT VERIFIED |
| previews | output → 3–5 CWS-watermarked previews | canonical preview path | No correlated preview keys or signed URLs | NOT VERIFIED |
| price/QR/payment | runtime → price + payment record + MB QR | canonical MB account config | No job/payment, therefore no runtime price, payment code, QR, or reference | NOT VERIFIED |
| SePay | reference + amount → webhook matcher | canonical SePay test/live route | No payment reference existed; no webhook was sent | NOT VERIFIED |
| PAID/unlock | SePay → PAID → authorized B2 download | canonical payment/unlock path | No PAID transition or download URL | NOT VERIFIED |
| cleanup/idle | delivery → Worker idle | `CWS-BAE2782D20525D46` | Worker is idle, but not as cleanup for this trace | NOT VERIFIED |

## True external blocker

1. **Blocked link:** customer authentication → `POST /jobs`.
2. **Real request:**

   ```http
   POST https://cws-portal.onrender.com/jobs
   Content-Type: application/json
   Idempotency-Key: golden-660d1f04-4971-4b61-a3db-7e5ac90c3757

   {"fileRef":"uploads/efdc5d88-f611-4f2f-8057-b696fa863ea2-PhongNguRender5.blend","fileName":"PhongNguRender5.blend","fileSizeBytes":125259706,"profileId":"standard"}
   ```

   Real response: HTTP `401`, `{"message":"Thiếu Bearer token"}` at
   `2026-08-08T10:18:39.980Z`.
3. **Missing config/input:** a real Supabase customer OAuth session/access
   token. The endpoint intentionally requires `JwtAuthGuard` and a customer
   ID before creating a job; the public publishable key is not a customer
   identity and cannot be substituted.
4. **Why Codex cannot resolve it:** obtaining a real customer Google OAuth
   session requires the customer to authenticate in the existing browser
   session/account. No customer credential or reusable Bearer token is in the
   workspace, and fabricating a JWT, using the publishable key as a user, or
   altering production auth would invalidate the Golden E2E and violate the
   no-fake-auth rule.

The earlier missing `GOOGLE_DRIVE_API_KEY` blocker is fixed: public file links
now use direct streaming Drive download (`uc` → warning-page `uuid` →
`drive.usercontent.google.com`) and one B2 materialization. The exact file is
Zstandard-compressed native `.blend` (`28 b5 2f fd`); backend and production
node-agent signature validation now accept that Blender-supported form. The
legacy `cws_worker_full.py` was not changed.

## Verification notes

- Backend Google Drive unit tests: `9/9`; backend build: PASS.
- Frontend build and lint: PASS.
- Worker production-node-agent tests: `16/16`.
- Local exact-file direct materialization probe downloaded and validated all
  `125259706` bytes with a fake B2 sink only; this is not production Golden
  evidence and did not mutate production.
- No historical job/task was reused, no database row was edited to `PAID`, no
  payment was faked, and no second production Drive materialization was
  requested after the successful `fileRef` response.
- Browser automation CLI was unavailable in this workspace; canonical HTTPS
  probes were used. No secret values were printed.
