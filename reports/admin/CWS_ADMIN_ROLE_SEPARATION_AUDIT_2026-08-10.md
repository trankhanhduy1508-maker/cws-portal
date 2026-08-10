# CWS Admin role separation audit â€” 2026-08-10

## Reality and root cause

The production route was correctly recognized by `src/App.jsx`: `/admin` and
`#admin` mount `src/pages/AdminScreen.jsx`, outside `CustomerPortalApp`.
The failure was inside the Admin page, not the route guard. The page was only
an inline Worker Fleet + Customer CRM view, with no Admin shell, navigation,
Jobs/Payments/Enrollment/Logs/System Health surfaces, or capability-aware
empty states. It therefore looked like a customer-facing portal rather than an
operations console.

## Capability matrix

| Admin feature | Backend/API | Frontend before fix | After fix | Status |
| --- | --- | --- | --- | --- |
| Overview metrics | Jobs, CRM, fleet, incidents, payment anomalies | Missing | Derived from real responses | REAL/PARTIAL |
| Jobs | `GET /jobs` with Admin RoleGuard | API helper only | Jobs table | REAL |
| Customers | `GET /customers/crm` | Inline table | Customers page/table | REAL |
| Workers/Nodes | `GET /fleet/workers` | Inline section | Dedicated fleet page/health table | REAL |
| Payments | reconciliation anomalies only; no general list endpoint | Missing | Anomaly view + explicit API boundary | PARTIAL |
| Enrollment | `POST /worker/enrollment/tickets` | API absent | AAL2-protected ticket form | REAL |
| Logs | `GET /fleet/incidents`, `GET /jobs/:id/logs` | API helpers only | Operational incident view | PARTIAL |
| System Health | Fleet state API | Missing | Worker health view | PARTIAL |
| Settings | No backend capability found | Missing | Explicit unavailable state | MISSING |

## Implementation and verification

- Added a dedicated Admin shell and responsive sidebar in `src/pages/AdminScreen.css`.
- Replaced the inline mixed page with capability-based Admin sections in `src/pages/AdminScreen.jsx`.
- Added `adminIssueEnrollmentTickets()` using the existing protected backend route.
- No customer render/upload/payment workflow was reused as the Admin home.
- No mock metrics or fake payment/worker state were added; missing capabilities are shown explicitly.
- `npm run test -- --run`: 6 files, 12 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.

## Remaining limitations

The backend does not currently expose a general Admin payment list, dedicated
system-health aggregate, or settings API. The UI intentionally does not invent
those values. Enrollment still requires the existing Google + MFA/AAL2 session.
