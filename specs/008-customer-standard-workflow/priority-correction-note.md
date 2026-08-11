# Priority Correction — 2026-08-11

Founder clarification: Admin is **not** being dropped and is **not** considered unimportant. Admin/Host remains a core CWS product and operations surface. The current sequencing decision is only that Customer Golden E2E is the highest-priority bottleneck, so further Admin UX/MFA refinement is queued behind the Customer workflow convergence.

Operational interpretation:
- Customer workflow = current implementation priority.
- Admin/Host = important active roadmap component, continue after the Customer workflow reaches its next production gate.
- Do not delete, de-scope, or treat Admin as optional/abandoned.
- Avoid spending the current implementation cycle on non-blocking Admin polish unless it is required to keep shared code/security/builds healthy.
