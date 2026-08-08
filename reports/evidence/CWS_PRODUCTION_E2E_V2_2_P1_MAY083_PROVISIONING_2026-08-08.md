# CWS Production E2E V2.2 — P1 MAY083 provisioning evidence

Date: 2026-08-08

## Verified production facts

- Host: `MAY083`; operator account used for this first physical test:
  `MAY083\Administrator`.
- Stable Worker ID: `CWS-BAE2782D20525D46`, derived from a one-way salted host
  identifier by the canonical provisioning helper; no hostname hard-code or
  random per-run ID is used.
- Production Supabase project: `ynhxlxetwuiyejcjypsi`; fleet 2.
- Registry metadata: NVIDIA GeForce RTX 2060 SUPER, 8192 MB VRAM.
- A unique 90-day credential was generated locally, stored at
  `%LOCALAPPDATA%\CWS\worker.dpapi` with only current account, SYSTEM and
  Administrators ACL entries. Production received only its SHA-256 verifier.
- Signed `worker_ping` through `https://cws-portal.onrender.com/worker/rpc`
  succeeded. Direct production query then showed status `idle` and
  `last_seen_at=2026-08-08 02:49:11.367046+00` for this Worker.
- Blender `5.2.0 LTS`, Python `3.12.7`, boto3 and the DPAPI decrypt path work on
  MAY083. The portable Python site-packages path was repaired locally.
- The temporary hash-only SQL file was deleted after the production insert;
  the DPAPI ciphertext remains on the host.

## Provisioning implementation

- `worker/provision_worker_identity.py` now derives a stable Worker ID when one
  is not supplied and emits idempotent, transactional Worker registry +
  identity SQL containing no plaintext credential.
- `worker/provision_worker_identity.ps1` detects GPU/VRAM, applies least-
  privilege ACLs, configures the non-secret runtime values and supports secure
  `SecureString` input for a scoped B2 pair without printing it.
- Worker unit suite: 74/74 PASS. PowerShell parser: PASS.

## Not verified / blocker

`CWS_B2_KEY_ID` and `CWS_B2_APP_KEY` do not exist in any inspected process,
User or Machine environment, CWS Worker package, local CWS store or available
connector. The canonical config therefore fails closed with:

`missing production configuration: CWS_B2_KEY_ID`

No Node Agent claim was started because that would advertise an ineligible
Worker without output storage. P1 remains PARTIAL; P2/P3 and Golden E2E remain
NOT VERIFIED until an existing bucket-scoped Read/Write key for `MTEB90` /
`renders/` is entered locally and the runtime is rerun.
