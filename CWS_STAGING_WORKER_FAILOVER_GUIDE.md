# CWS Staging Worker Failover Guide

Tài liệu này chỉ dành cho **staging**. Không chạy các bước dưới đây trên
production.

## 1. Staging DB

Tạo một Supabase project riêng cho staging. Không dùng project production.

Trên Worker staging, cấu hình các biến sau bằng secret storage hoặc Windows
environment; không commit giá trị thật:

```text
CWS_STAGING_SUPABASE_URL=https://<staging-project-ref>.supabase.co
CWS_STAGING_SUPABASE_KEY=<staging-publishable-or-anon-key>
CWS_STAGING_FLEET_ID=<positive-integer>
```

Nếu smoke test có upload output lên B2, dùng bucket/prefix staging riêng:

```text
CWS_STAGING_B2_ENDPOINT=s3.<region>.backblazeb2.com
CWS_STAGING_B2_KEY_ID=<staging-scoped-key-id>
CWS_STAGING_B2_APP_KEY=<staging-scoped-key>
CWS_STAGING_B2_BUCKET=<staging-bucket>
CWS_STAGING_B2_PREFIX=cws-staging/worker-e2e
```

Không dùng `SUPABASE_SERVICE_ROLE_KEY`, B2 master key hoặc biến production trên
Worker.

## 2. Migration order

Trên staging Supabase SQL Editor, dùng tài khoản Owner/Database Admin. Với DB
staging mới, apply Worker Fleet migrations theo thứ tự số:

```text
worker_migrations/000_worker_fleet_base_schema.sql
...
worker_migrations/019_rpc_privilege_hardening.sql
```

Chạy preflight read-only trước:

```text
worker_migrations/020_021_preflight_check.sql
```

Chỉ khi preflight không có `BLOCKED`, chạy lần lượt:

```text
worker_migrations/020_worker_identity_rpc_auth_contract.sql
worker_migrations/021_production_failover_reassign_contract.sql
```

Không chạy bất kỳ file nào trên production.

## 3. Provision Worker A/B

Trên mỗi máy Windows staging, tạo account riêng:

```text
.\CWSNodeAgent
```

Node Agent/Worker phải chạy bằng account này; không chạy bằng `SYSTEM` hoặc
Administrator. DPAPI credential phải được tạo dưới đúng account chạy Node Agent.

Worker A:

```powershell
.\worker\provision_worker_identity.ps1 `
  -WorkerId worker-stg-a `
  -ServiceAccount .\CWSNodeAgent `
  -StorePath C:\CWS\secrets\worker-stg-a.dpapi `
  -SqlOut C:\CWS\provisioned\worker-stg-a.sql
```

Worker B:

```powershell
.\worker\provision_worker_identity.ps1 `
  -WorkerId worker-stg-b `
  -ServiceAccount .\CWSNodeAgent `
  -StorePath C:\CWS\secrets\worker-stg-b.dpapi `
  -SqlOut C:\CWS\provisioned\worker-stg-b.sql
```

Apply hai file SQL hash-only vào staging DB. Không mở, in hoặc gửi plaintext
token. Xác nhận mỗi máy có DPAPI file và ACL giới hạn cho `CWSNodeAgent`,
SYSTEM và Administrators.

Worker A dùng:

```text
CWS_STAGING_WORKER_ID=worker-stg-a
```

Worker B dùng:

```text
CWS_STAGING_WORKER_ID=worker-stg-b
```

## 4. Identity smoke

Chạy trên từng Worker, với HTTPS staging backend:

```powershell
python worker\staging_identity_smoke.py `
  --base-url https://<staging-backend-host> `
  --worker-id worker-stg-a `
  --credential-store C:\CWS\secrets\worker-stg-a.dpapi `
  --claim
```

Đổi `worker-stg-a` thành `worker-stg-b` cho Worker B. Không dùng
`https://cws-portal.vercel.app` hoặc backend production.

## 5. Failover smoke order

Thực hiện đúng thứ tự:

```text
A heartbeat
→ A claim/render
→ A mất heartbeat
→ backend phát hiện stale lease
→ B claim/reassign
→ A reconnect
→ stale completion của A bị reject
→ B complete đúng một lần
→ revoke A và xác nhận A bị từ chối
→ expiry credential và xác nhận bị từ chối
→ rotate credential B và xác nhận credential cũ bị từ chối
```

Runner staging:

```powershell
python worker\staging_e2e.py --blender <path-to-staging-blender.exe>
```

## 6. Expected result

- A và B authenticate bằng identity riêng.
- A mất heartbeat không làm Job thành `FAILED` ngay khi còn khả năng recovery.
- B chỉ được nhận Job nếu online, healthy và đủ capability.
- Progress/completion cũ của A bị generation fencing reject.
- B complete đúng một lần; không double-finalize và không double-payment.
- Payment chỉ xuất hiện sau render completion.
- Không có plaintext secret trong log hoặc SQL.
- Admin fleet phản ánh A `Offline/Unhealthy` và B `Rendering/Online`.

Chỉ ghi nhận **STAGING RUNTIME PASS** khi có log/DB evidence thật cho toàn bộ
chuỗi trên.

## Repository references

- `worker_migrations/020_021_preflight_check.sql`
- `worker_migrations/020_worker_identity_rpc_auth_contract.sql`
- `worker_migrations/021_production_failover_reassign_contract.sql`
- `worker/provision_worker_identity.ps1`
- `worker/provision_worker_identity.py`
- `worker/staging_identity_smoke.py`
- `worker/staging_e2e.py`
- `reports/worker/CWS_STAGING_E2E_CONTRACT_2026-08-05.md`
- `reports/worker/CWS_STAGING_IDENTITY_FAILOVER_PREFLIGHT_BLOCKER_2026-08-06.md`
