# CWS ZIP input support — 2026-08-07

## Implemented

- Frontend accepts `.blend` and `.zip`, with matching file picker and
  validation messages.
- Backend upload accepts only those two extensions and returns `inputFormat`
  (`blend` or `zip`). Job creation rejects a supplied file name with an
  unsupported extension; existing `render_orders.project_name` remains the
  durable input-name metadata, so no duplicate schema was added.
- B2 object naming preserves the safe `.zip` suffix.
- Generic Worker keeps direct `.blend` behavior unchanged. For `.zip`, it
  extracts inside the attempt workspace, preserves relative asset folders, and
  renders only when exactly one `.blend` is found.
- Nested archives are not recursively extracted.

## ZIP safety boundary

- Rejects absolute paths, drive paths, `..`, empty path components, duplicate
  normalized paths, archive symlinks, invalid ZIPs, more than 10,000 entries,
  members over 2 GiB, expansion over 4 GiB, and suspicious compression ratios.
- Extraction is streamed and the existing per-job cleanup removes the entire
  temporary workspace after completion or failure.
- Zero or multiple `.blend` files fail clearly; the Worker does not guess.

## Evidence

- Worker: 53/53 tests and Python compile pass.
- Backend: 33 suites/174 tests, build and lint pass.
- Frontend: 5 test files/11 tests, lint and production build pass.
- Physical Worker, production B2 ZIP upload, Blender render from ZIP and full
  production E2E remain **NEEDS_VERIFICATION**.
