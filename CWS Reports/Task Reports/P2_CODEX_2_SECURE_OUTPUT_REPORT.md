# P2 CODEX 2 — SECURE OUTPUT REPORT

## 0. Executive Summary

| Item | Result |
|---|---|
| Roadmap Phase | P2 — Core MVP Control Layer |
| Task | Secure original-output authorization |
| Status | PARTIAL |
| Branch | `agent-2-secure-output-p2` |
| Commit Hash | Filled by final session output |
| Pull Request | Draft PR created after push |
| Files Changed | Code, migration, tests, frontend and this report |
| Backend | Canonical output access, server-signed expiring download, owner/admin authorization |
| Frontend | Just-in-time authenticated output access |
| Database/Migration | Migration 005 outputs + append-only download events + refund/reject re-lock |
| Tests | Added; NOT RUN |
| Build | BLOCKED / NOT RUN |
| GitHub Actions | NOT RUN |
| Ready to Merge | NO |

## Acceptance Checklist

| Acceptance | Status |
|---|---|
| Preview before payment | ⚠ Existing preview preserved; NOT RUN |
| Original output locked | ✅ Code/schema |
| Unlock after confirmed payment | ✅ Canonical Payment RPC check |
| Idempotent unlock | ✅ Unique output/order and audit key |
| Signed URL | ✅ Backend HMAC capability URL |
| URL expiry | ✅ 300 seconds |
| Download audit | ✅ Issuance and redemption events |
| Ownership/server authorization | ✅ Current order owner/admin checked in DB |
| Admin override | ✅ Server-verified admin role at issuance |
| Re-lock on refund/reject | ✅ Database trigger |
| No permanent/public original URL | ✅ Object key private; presenter URL removed |
| No frontend role trust | ✅ JWT principal only |
| Storage adapter | ✅ Interface/token |
| Build/lint/tests pass | ❌ NOT RUN |
| Ready to merge | ❌ |

## 1. Thông tin

- Date: 2026-07-30 Asia/Saigon
- Repository: `trankhanhduy1508-maker/cws-portal`
- Branch: `agent-2-secure-output-p2`
- Base dependency: Payment PR #3, branch `agent-1-payment-p2`, HEAD `aa0ac9aab2d3f1d86bd22115f24689c4b801645c`
- Leader: CODEX 2 Secure Output Leader
- Agents: Output Authorization Analyst — COMPLETE; Output Security & QA Reviewer — COMPLETE.

## 2. Mục tiêu

Implement roadmap P2.7: preview may remain available, original locked until confirmed payment, idempotent unlock, owner/admin access, expiring URL, audited download, refund/reject re-lock.

## 3. Kết quả Audit

Permanent B2 URLs were stored in `render_orders.download_url` and returned by presenter/UI. No Output, DownloadEvent, signed expiry, current-payment access check or re-lock existed. Payment branch provides the reused eligibility statuses and order binding.

## 4. Những gì đã sửa

- Added canonical outputs/download event migration and fail-closed RPCs.
- Added storage adapter boundary.
- Changed packaging to persist private object key only.
- Added output access API with server-signed five-minute token.
- Rechecks current canonical Payment at issuance and redemption.
- Added automatic re-lock trigger for rejected/refund-pending/refunded/expired.
- Removed permanent URL from public job presenter.
- Updated frontend to request access just in time.
- Added output service tests.

## 5. Kiểm tra

Build, lint, unit, integration and security tests: BLOCKED / NOT RUN because Windows local execution backend failed before command execution. GitHub Actions: NOT RUN. No PASS claim is made.

## 6. File thay đổi

See final session output and branch compare. Includes migration 005, backend outputs module, storage adapter/B2/packaging/scheduler/presenter wiring, frontend download flow, tests and this report.

## 7. Authorization / Ownership / Storage / Signed URL / Audit / Unlock

Authorization uses server-verified JWT principal. Ownership/admin and current Payment state are checked in the database RPC. Original object keys are never returned publicly. URLs are HMAC-signed, expire after 300 seconds, and are redeemed through the backend. Audit records issuance/redemption and is append-only. Unlock is idempotent; refund/reject/expiry revokes future and redemption access.

## 8. Rủi ro còn lại

- Validation suite and migration were NOT RUN.
- Payment PR #3 is an unmerged dependency and itself PARTIAL.
- Actual B2 bucket privacy must be verified operationally.
- Proxy currently buffers ZIP in memory; streaming is recommended before large production outputs.
- JWT issuer/audience/algorithm hardening remains.
- WebSocket authorization remains a separate Critical follow-up; presenter no longer leaks the output URL.
- Upload ownership is not completed in this slice.

## 9. Công việc tiếp theo

Run migration fixture, build, lint, unit/integration/security tests and GitHub Actions; harden JWT; authenticate WebSocket; bind uploads to owner; stream proxy downloads; verify private B2 bucket.

## 10. Kết luận

Code-level P2 Secure Output controls are implemented, but Definition of Done is not met without executable validation and Payment PR readiness. Status PARTIAL; Ready to Merge: NO.

## Next Owner / Dependency

Next Owner: CODEX 2 Secure Output validation follow-up.
Dependencies: Payment PR #3, migration 004, canonical Payment current-state contract, private B2 configuration, executable CI/test runner.
