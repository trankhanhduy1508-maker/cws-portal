# CWS Upload Draft Persistence Evidence — 2026-08-04

## GAP

A real OAuth redirect reloads the page and destroys React state. Previously only a Google Drive link was retained; a selected local .blend File object was lost.

## FIX

- src/utils/pendingDraftStorage.js stores only the pending File in browser IndexedDB under a fixed draft key.
- App.jsx saves the file before starting Google OAuth and restores it after authentication returns.
- The draft is cleared after restoration or after the mock-login path continues.
- No password, access token, session, or credential is written to this storage.
- IndexedDB/quota errors are caught; no unverified file is uploaded silently.

## STATUS

Code scope: PASS by source inspection.

Real browser OAuth/quota verification: NOT RUN in this session. A browser test is still required before claiming full runtime PASS.
No reboot, shutdown, logoff, production data, or credentials involved.
