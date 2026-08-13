# CWS Production Google Drive UX Verification — 2026-08-13

## Result

`PRODUCTION_DRIVE_UX = BLOCKED`

This report records the production verification attempt for the merged Google Drive UX slice. It does not claim production Customer E2E success.

## Scope

Verify the real Customer flow:

`Google Login -> paste Google Drive URL -> submit`

The verification was read-only with respect to repository code and production infrastructure. No Worker testing, Scheduler testing, payment testing, migration, deployment, or production data mutation was performed.

## 1. Grounding

### Local checkout

- Repository: `trankhanhduy1508-maker/cws-portal`
- Local branch: `agent/google-drive-ux-direct-submit`
- Local HEAD: `2402c639756aab2c12d0137ce3e5c91f51668f7b`
- Local worktree: clean
- Local `origin/main` ref observed in this checkout: `5c900d4d9b0dbd9abaa6c57506e43f6809d8080b`

The local checkout was not treated as proof of current canonical `main` because its `origin/main` ref was stale relative to the requested production evidence.

### Canonical merged main

GitHub independently verified:

- Merge commit: `9263ae4c493d4936979c50024e0e6b98a08b6b48`
- Message: `Merge pull request #43 ... Simplify Google Drive submission UX`
- Repository: `trankhanhduy1508-maker/cws-portal`

## 2. Production deployment

Vercel project `cws-portal` reported:

- Target: `production`
- State: `READY`
- Commit SHA: `9263ae4c493d4936979c50024e0e6b98a08b6b48`
- Production domain: `https://cws-portal.vercel.app`
- Homepage response: HTTP 200
- Served frontend bundle: `index-CICzwT8w.js`

This proves deployment/commit correspondence, not authenticated Customer runtime success.

## 3. Static production bundle evidence

The served production bundle contains evidence for the merged slice:

- direct submit strings: `Gửi link Google Drive`, `Gửi link Drive`, `Đang gửi link...`;
- direct `onSubmit(value)` behavior;
- no customer-facing Drive `Xác nhận link` action;
- no Drive `Đang kiểm tra...` action;
- structured error normalization;
- non-empty backend `jobId` requirement before accepting success;
- no frontend Job creation fallback in the Customer submission path.

This is static bundle evidence only.

## 4. First failing production verification boundary

The first failing boundary was:

`Production site -> interactive authenticated browser verification`

The required `agent-browser` executable was unavailable in the verification environment. No authenticated Google customer session or real supported Google Drive URL was available. Therefore the verification stopped before Google Login and before Drive submission, as required by the stop condition.

## 5. Runtime/API evidence

The deployed frontend configuration points to:

`https://cws-portal.onrender.com`

An unauthenticated direct probe of `POST /drive/resolve` could not receive an HTTP response because outbound TLS/network access from the verification environment failed before an application response. No authenticated request was attempted.

Not verified:

- Google OAuth browser interaction;
- authenticated `POST /drive/resolve`;
- backend Drive provider/URL validation trace;
- SSRF, acquisition, quarantine/staging, structural validation, and CLEAN/SAFE runtime trace;
- canonical B2 and `INPUT_SAFE` runtime response;
- production `jobId` response;
- duplicate Job behavior;
- customer-visible structured error rendering.

## 6. Security and workflow conclusion

No security bypass was attempted. No production input was submitted. No production Job was created by this verification attempt. Worker, Scheduler, and payment testing did not start.

The merged code and deployment evidence support the intended frontend contract, but production runtime behavior remains `NEEDS_VERIFICATION`.

## 7. Next smallest safe action

Provide an authenticated browser-verification environment/session and one real supported Google Drive URL. Repeat only:

`Google Login -> paste Google Drive URL -> submit`

Capture browser, network, backend, `INPUT_SAFE`, and Job evidence. Do not start Worker testing until the production input boundary passes.

## 8. Changes and verification commands

- Product files changed during this verification: none.
- Production state changed: none.
- Tests/build/lint run during this verification: none.
- Prior local CODE VERIFIED evidence: 46 tests PASS, lint PASS, build PASS.
