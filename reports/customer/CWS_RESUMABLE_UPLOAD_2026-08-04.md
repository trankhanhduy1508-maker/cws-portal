# Resumable Upload Evidence — 2026-08-04

## Implemented

- Browser upload switched from one memory-buffered PUT to B2 multipart upload.
- Chunk size is 8 MiB; maximum file size remains 2 GiB; non-final chunks must be full-sized.
- Upload session and per-part ETag/size are persisted in Supabase migrations 018.
- Each session is bound to the authenticated customer; all status/part/complete/abort operations re-check customer ownership.
- First chunk must contain the native Blender BLENDER header before it is sent to B2.
- Browser stores only a resumable session id keyed by file name/size/lastModified in sessionStorage; no credential/token is stored.
- Retry after a network interruption resumes already persisted parts instead of restarting the whole file.
- Incomplete active sessions expire after 24 hours and a scheduled cleanup aborts only the B2 multipart upload and marks the session ABORTED.
- RLS is enabled for the session tables; customer SELECT policy is owner-scoped.

## Validation

- GitHub Actions run #215 PASS on head 8afe466.
- Backend build and Jest/contract tests PASS; frontend build/lint PASS.
- Runtime interruption/resume against production B2 and browser quota behavior remain unverified until a real customer upload is run.
- No production object, credential, secret, reboot, shutdown, or logoff was used.