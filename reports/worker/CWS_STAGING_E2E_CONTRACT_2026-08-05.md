# CWS staging E2E contract â 2026-08-05

## Má»¥c tiÃªu

Staging-only:

`Supabase staging lease/assignment â Node Agent â Generic Worker â Blender â B2 staging checkpoint â verify â completion â cleanup â ACTIVE_IDLE`

KhÃ´ng cÃ³ fallback sang production.

## Code ÄÃ£ chuáº©n bá»

- `worker/staging_adapters.py`: Äá»c duy nháº¥t `CWS_STAGING_*`; Supabase RPC client; B2 S3-compatible checkpoint store vá»i frame-level idempotency, SHA-256 metadata vÃ  verify.
- KhÃ´ng cÃ³ delete object, delete bucket, key-admin hoáº·c lifecycle capability.
- `worker/test_staging_adapters.py`: thiáº¿u credential bá» cháº·n; endpoint B2 ÄÆ°á»£c chuáº©n hÃ³a; khÃ´ng in secret.

## Environment contract

Báº¯t buá»c trÃªn Windows staging Worker/Node Agent:

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

KhÃ´ng dÃ¹ng `SUPABASE_SERVICE_ROLE_KEY`, B2 master key hoáº·c biáº¿n production.

## Quyá»n tá»i thiá»u

### Supabase staging

- project riÃªng, khÃ´ng dÃ¹ng project production;
- chá» RPC/REST cáº§n cho Worker Fleet: register, ping, claim, heartbeat, state, complete, fail;
- náº¿u cáº§n Äá»c `jobs/tasks` Äá» dá»±ng JobSpec Äáº§y Äá»§, chá» cáº¥p SELECT staging qua RLS hoáº·c dÃ¹ng assignment RPC riÃªng;
- khÃ´ng cáº¥p quyá»n Admin, payment, customer profile hoáº·c service-role cho Worker.

### B2 staging

- bucket riÃªng hoáº·c prefix riÃªng, vÃ­ dá»¥ `cws-staging/worker-e2e/`;
- read/write chá» trong prefix staging;
- khÃ´ng cáº¥p delete bucket, key management, lifecycle hoáº·c production prefix;
- object metadata giá»¯ `job_id`, `task_id`, `frame`, `sha256`.

## Assignment contract cÃ²n cáº§n chá»t

RPC hiá»n cÃ³ `claim_next_generic_task` tráº£ task ID, job ID, frame range vÃ  generation. Äá» Worker dá»±ng JobSpec Äáº§y Äá»§ mÃ  khÃ´ng Äá»c rá»ng dá»¯ liá»u, staging cáº§n má»t trong hai phÆ°Æ¡ng Ã¡n:

1. RPC assignment staging tráº£ thÃªm `project_uri`, `output_prefix`, `output_format`, capability requirements; hoáº·c
2. quyá»n SELECT RLS staging tá»i thiá»u trÃªn ÄÃºng `jobs/tasks` Äá» adapter Äá»c input URI sau claim.

KhÃ´ng tá»± ÄoÃ¡n hoáº·c má» rá»ng quyá»n trÃªn production.

## Tráº¡ng thÃ¡i hiá»n táº¡i

- Local Node Agent â Generic Worker â Blender â local checkpoint â cleanup â ACTIVE_IDLE: REAL RUNTIME VERIFIED.
- Crash recovery vÃ  timeout cleanup: REAL RUNTIME VERIFIED.
- Staging adapter contract: CODE/UNIT VERIFIED, 26/26 Worker suite PASS.
- Supabase staging lease/assignment: BLOCKED vÃ¬ chÆ°a cÃ³ staging project/credential vÃ  assignment contract Äáº§y Äá»§.
- B2 staging upload/resume/verify: BLOCKED vÃ¬ chÆ°a cÃ³ bucket/key staging.

## OWNER ACTION â chá» 2 viá»c

### 1. Supabase staging

Táº¡o/cáº¥p má»t Supabase project staging riÃªng, apply Worker Fleet migrations cáº§n thiáº¿t, táº¡o worker identity `CWS_STAGING_WORKER_ID`, rá»i Äáº·t `CWS_STAGING_SUPABASE_URL`, `CWS_STAGING_SUPABASE_KEY`, `CWS_STAGING_FLEET_ID` trÃªn mÃ¡y staging. Cáº¥p assignment RPC Äáº§y Äá»§ JobSpec hoáº·c SELECT RLS tá»i thiá»u cho `jobs/tasks`.

### 2. B2 staging

Táº¡o bucket/prefix staging riÃªng vÃ  application key chá» cÃ³ read/write trong prefix ÄÃ³; Äáº·t `CWS_STAGING_B2_ENDPOINT`, `CWS_STAGING_B2_KEY_ID`, `CWS_STAGING_B2_APP_KEY`, `CWS_STAGING_B2_BUCKET` trÃªn mÃ¡y staging. KhÃ´ng gá»­i secret qua chat/GitHub.
