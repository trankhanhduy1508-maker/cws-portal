# CWS Full Production Integration Trace — 2026-08-08

## Audit result

**GOLDEN PASS: NO.** The single trace stops at the first broken functional
boundary: canonical Render backend → Google Drive materialization. No feature
was developed and no production state was faked or mutated.

## Correlation

- Correlation ID: `500cd7aa-dde9-44f3-80d3-ca9601b7fa5e`
- Trace job ID: `NOT_CREATED` (the exact Drive request failed before a job could
  be created; the audit correlation ID is not a fake production job ID)
- Exact input:
  `https://drive.google.com/file/d/1evCyfEKjwFv-4ty-v4xAU_J29vOK3Yh0/view?usp=drivesdk`
- Audit start: `2026-08-08T09:39:34Z`

## One-chain evidence

| Boundary | Upstream → downstream | Config/URL | Runtime evidence, ID, timestamp | Status |
|---|---|---|---|---|
| GitHub main | GitHub → deployment source | `origin/main` | `5d5b89ea8bd7a876e63f0dcce97dee812560ab95`, commit `fix loop: drive Golden E2E until production pass`, `2026-08-08 16:22:56 +0700`; fetched read-only | PASS |
| Vercel canonical | GitHub/Vercel → browser bundle | `https://cws-portal.vercel.app/` | HTTP `200`, `Server: Vercel`, Vercel ID `sin1::7q5fd-1786181469756-bfcbab004b82`, `2026-08-08T09:31:10Z`; title `cws-portal` | PASS |
| Vercel → Render | Browser bundle → API/WS | Bundle `index-c0GPGeO_.js` contains `https://cws-portal.onrender.com` and `wss://cws-portal.onrender.com`; no `mockBackend`/demo marker; `.rar` and payment markers present | Bundle fetched read-only, 596770 bytes, `2026-08-08T09:34Z` | PASS |
| Render canonical | Vercel → backend health | `https://cws-portal.onrender.com/health` | `200 {"status":"ok","service":"cws-backend"}`, `rndr-id=a216307f-bf6f-458e`, `2026-08-08T09:39:50.107Z` | PASS |
| Render auth boundary | Customer → `/jobs` | `GET https://cws-portal.onrender.com/jobs` | HTTP `401`, `Cần đăng nhập để xem danh sách job`, `2026-08-08T09:39:50.427Z` | PASS |
| Supabase production | Vercel public config → Supabase | `https://ynhxlxetwuiyejcjypsi.supabase.co` | Production bundle contains the expected project URL. REST with public publishable key reached project; `render_orders` and `payments` returned `[]`; `input_uploads` denied anon with `42501` (RLS/privilege boundary); `2026-08-08T09:41Z` | PASS (connectivity/config), no correlated job |
| Exact Drive input | Customer input → Drive | Exact URL above | Drive page HTTP `200`, HTML response 74070 bytes, `2026-08-08T09:31:22Z`; this does not prove backend materialization | PASS (link reachable) |
| Drive API capability | Backend → Google Drive API | `https://www.googleapis.com/drive/v3/files/1evCyfEKjwFv-4ty-v4xAU_J29vOK3Yh0?fields=name,size` | HTTP `403`: `Method doesn't allow unregistered callers ... Please use API Key or other form of API consumer identity`, `2026-08-08T09:38Z` | BROKEN |
| Production materialization | `POST /drive/resolve` → B2/input upload | `https://cws-portal.onrender.com/drive/resolve`, body `{"driveLink":"<exact URL>"}` | HTTP `503`: `Google Drive import chưa được cấu hình. Hãy tải file .blend/.zip/.rar trực tiếp hoặc liên hệ CWS.`, `2026-08-08T09:40:35.453Z` | BROKEN — first functional break |
| B2 input | Drive materialization → B2 input | Existing canonical B2 config, job-scoped Worker capability | No correlated `input_upload`/B2 object because materialization returned 503 | NOT VERIFIED |
| render_order | B2 input → Supabase `render_orders` | Canonical production Supabase | No job ID was created for this correlation; anonymous REST view returned `[]` | NOT VERIFIED |
| durable task | render_order → task | Canonical task/RPC path | No correlated task. Public `tasks` showed only historical `CWS-CHUNKLIVE` frame 101–103 done, not this trace | NOT VERIFIED |
| Worker identity | task → `CWS-BAE2782D20525D46` | Canonical Supabase `workers` row | Exact Worker query returned `status=idle`, `current_task_id=null`, `observed_state=ACTIVE_IDLE`, `last_seen_at=2026-08-08T09:42:07.323099+00:00`; not correlated to this trace | NOT VERIFIED |
| production_node_agent | Worker claim → Node Agent | Existing canonical Worker contract | No claim/lease/generation for correlation; no task existed to claim | NOT VERIFIED |
| worker_engine | Node Agent → engine | Existing canonical Worker Engine | No correlated engine log/stage/progress | NOT VERIFIED |
| Blender PID | worker_engine → Blender | Blender CLI/background with autoexec off | No correlated Blender PID, executable/version, exit code, or process log | NOT VERIFIED |
| working copy | Blender preflight → safe optimizer | Immutable original/analyzer/working-copy contract | No correlated optimizer manifest or original/working-copy hash pair | NOT VERIFIED |
| real render | Blender → frame output | Real production Blender | No correlated render or real progress | NOT VERIFIED |
| B2 locked final | validated output → B2 `final/` | Existing canonical B2 | No correlated final object, remote `HeadObject`, lock proof, or size/hash | NOT VERIFIED |
| previews | final/frame output → `review/` | Existing CWS watermark path | No correlated 3–5 preview keys or signed URLs | NOT VERIFIED |
| final price/QR | runtime → payment record | Canonical MB QR env/config | No correlated runtime seconds, final amount, payment ID, QR URL, or reference | NOT VERIFIED |
| SePay | payment reference/amount → webhook | Existing SePay live/test routes | No payment record/reference existed for this correlation; no webhook sent | NOT VERIFIED |
| PAID | SePay → payment/order state | Existing idempotent matcher | No correlated payment or PAID transition; no database mutation performed | NOT VERIFIED |
| authorized download | PAID → signed B2 delivery | Existing `/jobs/:id/download` | No correlated final URL or download request | NOT VERIFIED |
| cleanup/idle | delivery → Worker idle | `CWS-BAE2782D20525D46` | Worker was already `ACTIVE_IDLE` with no current task, but no correlated cleanup occurred | NOT VERIFIED |

## True external blocker

1. **Blocked link:** Render canonical backend → Google Drive materialization.
2. **Real request/response:** exact `POST /drive/resolve` returned HTTP `503`
   with `Google Drive import chưa được cấu hình`; direct Google Drive API call
   returned HTTP `403` requiring an API key/identity.
3. **Missing config:** backend source maps `GOOGLE_DRIVE_API_KEY` to
   `googleDriveApiKey` and fail-closes when absent (`backend/src/config/
   configuration.ts`, `backend/src/files/google-drive.service.ts`).
4. **Why Codex cannot resolve it:** the required Google API credential belongs
   to the existing Render production environment and Google Cloud project. It
   is not present in the workspace/session, cannot be invented, and must not be
   exposed or replaced with a weaker untrusted download path. No production
   environment mutation was attempted.

Because the break occurs before input materialization, continuing downstream
would require inventing a job/task or reusing an unrelated historical task,
which is forbidden by this audit.

## Audit method limits

The browser automation CLI named by the local verification skill is not
installed in this workspace. Canonical Vercel, Render, Drive, Google API and
Supabase probes were instead executed through read-only HTTPS requests with
TLS verification disabled only for this diagnostic environment; no secret
values were printed and no production rows were changed.
