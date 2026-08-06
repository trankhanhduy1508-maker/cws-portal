# Hướng dẫn mở khóa Staging Worker Failover

Tài liệu này chỉ dùng cho **staging**. Không dùng project, key, bucket hoặc
Worker production.

## 1. STAGING SUPABASE

Tạo một Supabase project riêng cho staging.

Nếu project mới, apply base Worker migrations cần thiết trước. Sau đó chạy
đúng thứ tự:

```text
worker_migrations/016_staging_job_assignment_contract.sql
worker_migrations/020_021_preflight_check.sql
worker_migrations/020_worker_identity_rpc_auth_contract.sql
worker_migrations/021_production_failover_reassign_contract.sql
```

PASS khi:

- Preflight không có `BLOCKED`.
- Có bảng `worker_identities`, `worker_auth_nonces`.
- Có RPC `claim_next_staging_job`, `report_heartbeat`,
  `claim_next_resilient_task`, `requeue_stale_tasks`.
- Không migration nào chạy trên production.

## 2. CWS_STAGING_*

Cấu hình trên từng Worker staging. Không gửi secret thật vào chat hoặc GitHub:

```text
CWS_STAGING_SUPABASE_URL
CWS_STAGING_SUPABASE_KEY
CWS_STAGING_B2_ENDPOINT
CWS_STAGING_B2_KEY_ID
CWS_STAGING_B2_APP_KEY
CWS_STAGING_B2_BUCKET
CWS_STAGING_B2_PREFIX
CWS_STAGING_WORKER_ID
CWS_STAGING_FLEET_ID
```

- `SUPABASE_URL/KEY`: kết nối Supabase staging.
- `B2_ENDPOINT/KEY_ID/APP_KEY`: kết nối B2 staging.
- `B2_BUCKET/PREFIX`: vùng lưu output staging.
- `WORKER_ID`: identity riêng của Worker A hoặc B.
- `FLEET_ID`: fleet staging.

## 3. WORKER A/B

Tạo account Windows riêng `.\CWSNodeAgent`. Node Agent phải chạy bằng
account này, không chạy bằng `SYSTEM` hoặc Administrator.

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

Apply hai file SQL vào staging DB. DPAPI phải được tạo dưới đúng account chạy
Worker. ACL chỉ gồm `CWSNodeAgent`, `SYSTEM`, `Administrators`.

Ready check Worker A:

```powershell
python worker\staging_identity_smoke.py `
  --base-url https://<staging-backend-host> `
  --worker-id worker-stg-a `
  --credential-store C:\CWS\secrets\worker-stg-a.dpapi `
  --claim
```

Lặp lại cho `worker-stg-b`. Cả hai phải trả `PASS`.

## 4. B2 STAGING

Tạo bucket/prefix riêng:

```text
Bucket: <staging-bucket>
Prefix: cws-staging/eevee-stress/
```

Application key chỉ được phép `HeadObject`, `PutObject` và multipart upload
cần thiết. Không cấp delete, bucket-admin, key-admin, lifecycle-admin hoặc
quyền production.

## Authenticated staging smoke

Dùng đúng workload:

```text
tests/assets/cws_blender_unoptimized_eevee_stress.blend
frames: 1..48
autoexec: false
output: png
```

Trên Worker A và B chạy:

```powershell
python worker\staging_e2e.py `
  --blender C:\path\to\blender.exe `
  --root C:\CWS\staging-eevee `
  --max-seconds 3600
```

Thực hiện đúng thứ tự:

```text
A heartbeat
→ A render frame 1–24
→ dừng Node Agent A để mất heartbeat
→ backend requeue stale lease
→ B reassign generation mới
→ A reconnect, stale completion bị reject
→ B render frame 25–48
→ B complete đúng một lần
→ verify B2 checksum/output
→ verify Admin A Offline, B Rendering rồi Idle Saver
→ verify Customer recovery rồi Render Complete
→ Amount/Payment chỉ xuất hiện sau Render Complete
```

Chỉ ghi nhận staging PASS khi có log/DB evidence thật cho toàn bộ chuỗi trên.
