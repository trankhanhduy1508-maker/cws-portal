# CWS B2-only production input path — 2026-08-07

- **FIXED/CODE VERIFIED**: `CWS_GOOGLE_DRIVE_API_KEY` is optional in the
  canonical production Node Agent configuration.
- A `b2://<bucket>/<key>.blend` or `.zip` JobSpec uses the authenticated B2
  adapter and does not require Drive API configuration.
- Google Drive input remains supported, but fails closed with an explicit
  error when its API key is absent.
- Regression tests cover both B2-only configuration and missing-key Drive
  rejection.
- Physical B2 upload/download and Blender E2E remain **NOT VERIFIED** until a
  real Worker identity and scoped B2 credentials are provisioned.
