# CWS FULL PRODUCT & ENGINEERING ROADMAP — VERSION 1.1

**Project:** Computer Workspace (CWS)  
**Document type:** Official roadmap and execution source of truth  
**Primary market:** Vietnam  
**Primary payment methods:** Vietnamese bank transfer and MoMo  
**Version:** 1.1  
**Last updated:** 2026-07-29  

---

## 1. Document Authority

This document is the official roadmap for CWS.

Codex, Claude Code, and any other AI agent must:

1. Read this file completely before implementing new work.
2. Treat this file as the primary source of truth.
3. Inspect the actual repository before trusting any completion report.
4. Follow the roadmap order unless a dependency requires a small, documented adjustment.
5. Never create a new product phase or change owner priorities without explicit approval.
6. Technical subtasks may be added inside the current phase when they are required to satisfy an acceptance criterion.
7. Report conflicts between this roadmap, the repository, and prior implementation reports before changing code.
8. Preserve completed work unless it is unsafe, incorrect, incomplete, or conflicts with this roadmap.
9. Never claim a mock, placeholder, local stub, or unverified integration is production-ready.
10. Never commit, push, merge, deploy, rewrite history, or modify production without explicit owner approval.

If another document conflicts with this roadmap, this roadmap has priority unless the owner explicitly states otherwise.

---

## 2. Product Mission

CWS is a platform that connects customers who need heavy creative-computing work with available high-performance computers and operators.

Initial customer groups include:

- Blender and 3D artists
- Architectural visualization users
- Video editors
- Motion designers
- Animation and VFX freelancers
- Small studios
- Users of Blender, After Effects, Premiere Pro, 3ds Max, V-Ray, Corona, Maya, and related tools

The core customer experience must remain simple:

1. Customer creates an order.
2. Customer uploads or submits a project.
3. CWS validates and packages the project.
4. CWS schedules and processes the work.
5. Customer follows progress and previews results.
6. Customer pays through a supported Vietnamese payment method.
7. CWS unlocks the original output.
8. Customer downloads the final result.

The system must hide infrastructure complexity from customers.

Customers should not need to choose a GPU, worker, machine owner, region, scheduler policy, or internal infrastructure component.

---

## 3. Product Principles

### 3.1 Working MVP first

The immediate objective is a real end-to-end working version.

Prefer:

- working software
- verifiable execution
- real repository evidence
- small safe steps
- real tests
- operational visibility

Avoid premature work on:

- large admin systems
- full host portals
- affiliate portals
- advanced analytics
- multi-region architecture
- autonomous AI operations
- complex enterprise UI
- cosmetic redesign
- speculative marketplace features

### 3.2 External blockers must not freeze the roadmap

If a task depends on an external service such as:

- merchant approval
- payOS credentials
- MoMo merchant credentials
- webhook registration
- sandbox access
- legal approval
- production API access

then the agent must:

1. Complete all local and internal work.
2. Isolate the external dependency behind a clean interface.
3. Implement a safe manual or disabled mode where appropriate.
4. Document the exact blocker.
5. Continue to the next independent roadmap item.

The whole project must not stop because one external service is unavailable.

### 3.3 One canonical source of truth

Do not create disconnected data models for separate interfaces.

The following systems must read from shared canonical entities:

- customer workflow
- orders
- uploads
- payments
- queue
- scheduler
- workers
- rendering execution
- previews
- outputs
- notifications
- operations monitoring

### 3.4 Security by default

Never:

- create public customer-file buckets
- disable ownership checks
- disable RLS
- expose service-role keys to clients
- generate permanent public download links
- log credentials or sensitive payment details
- unlock original files before authorized payment confirmation
- trust frontend role values
- create a hidden super-admin backdoor
- commit secrets or production credentials

Always:

- apply least privilege
- use expiring signed URLs
- validate ownership
- enforce authorization server-side
- record audit events
- make payment confirmation idempotent
- protect webhook endpoints
- validate file type, size, metadata, and checksums
- redact secrets from logs
- use safe migration and rollback procedures

---

## 4. Vietnam Payment Policy

### 4.1 Supported methods for the Vietnam MVP

Production-facing payment methods:

1. Vietnamese bank transfer
2. MoMo

Primary bank:

- Bank code: `MB`
- Account number: configure only through secure environment or protected deployment settings
- Account name: configure only through secure environment or protected deployment settings

Recommended configuration:

```env
PAYMENT_BANK_CODE=MB
PAYMENT_BANK_ACCOUNT_NUMBER=<CONFIGURE_IN_SECRET_ENVIRONMENT>
PAYMENT_BANK_ACCOUNT_NAME=<CONFIGURE_IN_SECRET_ENVIRONMENT>

PAYMENT_MOMO_RECEIVER=<CONFIGURE_IN_SECRET_ENVIRONMENT>

PAYMENT_BANK_TRANSFER_ENABLED=true
PAYMENT_MOMO_ENABLED=false
PAYMENT_MANUAL_CONFIRMATION_ENABLED=true
PAYMENT_AUTOMATIC_RECONCILIATION_ENABLED=false
```

Never commit:

- real account-owner names
- credentials
- OTPs
- API secrets
- access tokens
- webhook secrets
- private keys

### 4.2 Unsupported methods for the Vietnam MVP

Do not expose or prioritize:

- Stripe
- PayPal
- Apple Pay
- Google Pay
- international card payment
- cryptocurrency

Experimental code may remain isolated only if it does not affect production-facing Vietnam flows.

---

# 5. Current Reported Status

All reported statuses must be verified against the repository.

## Phase P0 — Core Platform Foundation

Reported complete:

- Backend audit
- NestJS upgrade
- Supabase foundation
- Storage adapter and Backblaze B2 support
- Chunk upload
- Resume upload
- Worker foundation
- Worker and asset discovery
- Scheduler
- Representative preview and watermark
- Payment domain foundation
- Customer dashboard foundation
- Monitoring foundation
- Affiliate foundation

Reported validation:

- Build clean
- Lint clean
- 137/137 tests passing after P0

## Phase P1 — Additional Backend Features

Reported complete:

- Experimental Stripe provider
- Commission payout foundation
- Affiliate dashboard endpoints
- Dashboard order pagination
- Direct upload verification

Reported validation:

- Build clean
- Lint clean
- 164/164 tests passing after P1

Required correction:

- Stripe is not part of the official Vietnam launch.
- Production-facing Stripe paths must be disabled, isolated, or removed.
- No completion report may override repository evidence.

---

# 6. Official Execution Order From Current State

1. Verify P0 and P1 against the repository.
2. Isolate unapproved Stripe production-facing flows.
3. Complete Phase P2 — Core MVP Control Layer.
4. Complete Phase P3 — Real Render Execution.
5. Pass Phase P4 — Combined MVP Pilot and Staging Gate.
6. Complete Phase P5 — Payment Automation and Reconciliation.
7. Complete Phase P6 — Host Network and Marketplace.
8. Complete Phase P7 — Customer Experience and Commercial Growth.
9. Complete Phase P8 — Automation and AI.
10. Complete Phase P9 — Scale and Reliability.
11. Implement Smart Revision Render only after the real render pipeline is stable.

---

# 7. Phase P2 — Core MVP Control Layer

## Goal

Build the commercial and control layer required for a real first customer workflow.

P2 must not depend on automatic payment reconciliation.

## P2.1 Repository verification

Create an evidence table containing:

- roadmap item
- repository evidence
- status
- tests
- conflicts
- required next action

Statuses:

- COMPLETE
- PARTIAL
- MISSING
- CONFLICTING
- BLOCKED
- EXTERNAL_DEPENDENCY

## P2.2 Canonical order and project model

Implement or verify:

- Customer
- Order
- Project
- ProjectAsset
- Quote
- Job
- JobEvent
- Output
- DownloadEvent

Required relationships:

- order belongs to customer
- project belongs to order
- files belong to project
- job belongs to project/order
- payment belongs to order
- output belongs to job/order
- events are traceable to canonical entities

## P2.3 Customer project intake

Implement:

- create order
- create project
- upload project files
- resumable upload
- upload integrity verification
- file metadata
- safe display name
- asset intake status
- validation status
- failure feedback

Customer-facing complexity must remain minimal.

## P2.4 Provider-neutral payment foundation

Implement a payment interface that supports:

- manual bank transfer
- future automatic bank reconciliation
- manual MoMo
- future official MoMo integration

Required capabilities:

- payment reference
- expected amount
- expiry
- payment state
- audit history
- confirmation actor
- duplicate-confirmation prevention
- underpayment review
- overpayment review
- refund state
- idempotent unlock trigger

## P2.5 MB Bank manual transfer MVP

Implement:

- order-specific payment reference
- transfer instructions
- VietQR-compatible QR when technically appropriate
- expected amount
- recipient bank and account display
- payment expiry
- admin manual confirmation
- rejection
- operator notes
- immutable audit record
- duplicate confirmation protection

Suggested lifecycle:

```text
PENDING
→ AWAITING_TRANSFER
→ UNDER_REVIEW
→ CONFIRMED
→ ORIGINAL_UNLOCKED
```

Exceptional states:

```text
EXPIRED
UNDERPAID
OVERPAID
REJECTED
REFUND_PENDING
REFUNDED
```

Do not mark payment confirmed because the customer claims to have paid.

## P2.6 Manual MoMo mode

Until official merchant integration is available:

- display recipient information
- generate payment reference
- allow customer to submit transaction evidence where needed
- allow authorized admin review
- record audit history
- unlock original only after confirmation

Do not simulate official automatic MoMo confirmation.

## P2.7 Secure original-output unlock

Required behavior:

- preview may be available before final payment
- original remains locked until confirmed payment
- unlock is idempotent
- only order owner or authorized admin may access original
- download URLs expire
- download events are audited
- revoked or refunded orders can be re-locked according to policy

## P2.8 Minimum Operations Console

This is required for the MVP.

It is not a full admin dashboard.

The owner must be able to determine:

- who created an order
- when it was created
- upload status
- payment status
- job status
- assigned worker
- progress
- last update
- failure condition
- output readiness
- customer download status

Minimum views:

1. Overview counts
2. Searchable/filterable order and job table
3. Job detail
4. Event timeline
5. Attention alerts
6. Secure output access
7. Safe operational actions already supported by backend

Minimum overview:

- awaiting payment
- queued
- running
- failed
- completed today
- online workers
- stale workers
- unresolved alerts

Do not add:

- advanced revenue analytics
- host earnings
- affiliate management
- complex charts
- customizable widgets
- enterprise administration

## P2.9 Essential notifications

Initial channels:

- in-app
- email where configured
- optional Telegram owner adapter

Important events:

- new order
- upload completed
- upload failed
- payment verified
- payment mismatch
- job queued
- job started
- job failed
- job stuck
- worker stale
- preview ready
- output ready
- order completed

Telegram must be an optional notification adapter, not a source of truth.

Telegram failures must never fail the payment or render workflow.

## P2.10 P2 acceptance gate

P2 is complete when:

- customer can create an order
- customer can upload a project
- canonical order/project/payment entities work
- MB Bank QR/manual transfer flow works
- manual payment confirmation works
- original-output authorization works
- owner can see real order and job state
- build passes
- lint passes
- relevant unit and integration tests pass
- security review exists
- no external payment credential is required for the manual MVP

---

# 8. Phase P3 — Real Render Execution

## Goal

Connect the control layer to real worker computers and produce verified output.

## P3.1 Worker enrollment

Implement:

- worker registration
- device identity
- capability report
- CPU/GPU/RAM/storage details
- installed-software inventory
- supported render engines
- worker approval
- worker revoke
- heartbeat
- version tracking
- last activity
- safe worker display identifier

## P3.2 Benchmarking

Implement reproducible benchmarks.

Record:

- hardware
- software version
- renderer
- scene
- resolution
- samples
- render duration
- failure information
- benchmark timestamp

Do not compare workers only by hardware name.

## P3.3 Job packaging

Implement:

- project manifest
- asset inventory
- missing-asset detection
- relative path normalization
- texture checks
- font checks where possible
- archive integrity verification
- input checksum
- output requirements
- renderer configuration
- supported version validation

## P3.4 Secure worker execution

Implement:

- secure job claim
- authorized input download
- controlled working directory
- execution command
- heartbeat
- progress reporting
- cancellation
- timeout
- bounded retry
- output collection
- safe log collection
- cleanup
- duplicate execution protection

## P3.5 Scheduler hardening

Implement:

- capability matching
- software/version compatibility
- priority
- capacity reservation
- dead-worker recovery
- retry policy
- fairness
- duplicate execution protection
- cost-aware scheduling
- manual override where safe
- future region-awareness hooks without implementing multi-region complexity

## P3.6 Preview pipeline

Implement:

- representative output selection
- watermark policy
- preview conversion
- preview access control
- preview expiry
- regeneration
- failure handling

## P3.7 Output verification

Before delivery:

- confirm output exists
- validate expected format
- validate non-zero size
- validate frame count where applicable
- detect obvious incomplete output
- generate checksum
- record verification result
- mark output ready only after verification

## P3.8 Event and progress model

Use durable server-side events.

Examples:

```text
PROJECT_CREATED
UPLOAD_STARTED
UPLOAD_COMPLETED
VALIDATION_STARTED
VALIDATION_FAILED
JOB_QUEUED
JOB_ASSIGNED
JOB_STARTED
JOB_PROGRESS_UPDATED
JOB_RETRYING
JOB_FAILED
OUTPUT_VERIFICATION_STARTED
OUTPUT_READY
JOB_COMPLETED
CUSTOMER_DOWNLOADED
```

Events must be:

- timestamped
- idempotent where needed
- traceable
- safe to retry
- redacted
- append-only where practical

## P3.9 Cleanup and retention

Define and implement:

- input retention
- working-directory retention
- preview retention
- original-output retention
- failed-job retention
- audit-log retention
- recovery window
- safe deletion checks

## P3.10 P3 acceptance gate

P3 is complete when:

- a real worker enrolls
- a real project is packaged
- a real render process runs
- progress is reported
- preview is generated
- output is verified
- failure and retry paths work
- cleanup works
- build, lint, and relevant tests pass

---

# 9. Phase P4 — Combined MVP Pilot and Staging Gate

## Goal

Prove the complete customer journey with real operational evidence.

## P4.1 Internal pilot

Run:

- small internal Blender project
- upload
- validation
- queue
- worker execution
- preview
- manual payment confirmation
- unlock
- download
- audit verification

## P4.2 Trusted-customer pilot

Run at least one controlled real customer job.

Record:

- project type
- input size
- worker used
- render duration
- failures
- retries
- payment handling
- preview
- output
- download
- customer feedback

## P4.3 Failure recovery tests

Test:

- worker disconnect
- worker heartbeat stale
- job timeout
- retry
- output verification failure
- duplicate event
- duplicate payment confirmation
- revoked download
- notification failure

## P4.4 Staging environment

Prepare:

- staging application
- staging database
- staging storage
- migration runbook
- seed data
- test users
- test worker
- test payment mode
- rollback instructions
- health checklist

Do not use real production secrets in public or shared staging.

## P4.5 Combined MVP acceptance gate

The MVP is accepted only when:

1. Customer creates an order.
2. Customer uploads a project.
3. System validates it.
4. Job enters queue.
5. Real worker receives the job.
6. Progress is visible.
7. Preview is available.
8. Payment instructions are generated.
9. Payment is manually confirmed.
10. Original output is unlocked.
11. Customer downloads it.
12. Owner sees the lifecycle in Operations Console.
13. Audit history is complete.
14. At least one staging smoke test passes.
15. Deployment and rollback instructions exist.

---

# 10. Phase P5 — Payment Automation and Reconciliation

## Goal

Automate payment confirmation after the manual MVP works.

## P5.1 External integration research

Compare available routes for:

- VietQR
- payOS
- bank reconciliation providers
- official MB-compatible integrations
- MoMo merchant integration

Do not invent APIs.

Document:

- credentials required
- webhook support
- fees
- signature verification
- settlement behavior
- sandbox availability
- production approval requirements
- legal and operational constraints

## P5.2 Automatic bank reconciliation

When a legitimate provider is available:

- receive transaction event
- verify signature
- verify amount
- verify payment reference
- ensure idempotency
- prevent replay
- create reconciliation record
- update payment state
- trigger unlock
- record audit
- handle retries safely

## P5.3 Payment review console enhancement

Add:

- unmatched transaction
- incorrect amount
- duplicate transaction
- suspicious transaction
- manual match
- review note
- refund tracking
- reconciliation history

## P5.4 Official MoMo integration

Implement only with official credentials and documentation.

Requirements:

- signature verification
- amount verification
- order-reference verification
- idempotency
- replay protection
- safe retries
- audit logging
- webhook isolation

## P5.5 P5 acceptance gate

P5 completes when:

- at least one automatic reconciliation route works in staging
- webhook security is verified
- duplicate events are safe
- manual fallback remains available
- operational reconciliation is documented

---

# 11. Phase P6 — Host Network and Marketplace

## Goal

Allow external machine owners and partner computer shops to contribute capacity safely.

## P6.1 Host onboarding

- host application
- identity/contact verification
- terms acceptance
- machine ownership confirmation
- device enrollment
- machine approval
- software/license declaration
- availability schedule

## P6.2 Minimum host controls

Before a full host portal, support:

- machine availability
- pause/resume acceptance
- maintenance mode
- worker health
- anonymous active job
- estimated remaining time
- incident reporting

## P6.3 Host dashboard

Later add:

- machines
- availability
- assigned jobs
- completed jobs
- failed jobs
- earnings estimate
- settlement history
- performance
- reputation
- support

## P6.4 Earnings and settlement

Implement:

- host earning ledger
- platform fee
- adjustments
- disputes
- settlement batch
- settlement status
- admin approval
- bank-transfer settlement record

Do not automate mass payouts until legal, accounting, and security controls are reviewed.

## P6.5 Reputation

Measure:

- completion rate
- failure rate
- average execution time
- output verification success
- availability reliability
- support incidents
- dispute rate

Do not penalize hosts for platform-caused failures.

## P6.6 Marketplace controls

- capacity limits
- host suspension
- machine quarantine
- fraud indicators
- job-value limits
- manual approval for high-risk jobs
- incident response

---

# 12. Phase P7 — Customer Experience and Commercial Growth

## Goal

Improve conversion, repeat usage, support quality, and operational efficiency.

## P7.1 Pricing

Use measurable factors:

- estimated compute time
- hardware class
- priority
- storage
- transfer
- operator work
- risk buffer
- platform margin

Do not present uncertain estimates as guarantees.

## P7.2 ETA

Implement:

- initial estimate
- confidence interval
- re-estimation after assignment
- progress-based updates
- delay reason
- admin override
- historical calibration

## P7.3 Order revisions

Support:

- revision request
- small-change classification
- partial rerender where technically possible
- new estimate
- additional payment
- version history

## P7.4 Customer support

- tickets
- job-linked conversation
- internal notes
- response templates
- escalation
- resolution status
- customer history

## P7.5 Affiliate commercial rollout

Build only after payment and job completion events are trustworthy.

Implement:

- referral attribution
- valid conversion rules
- commission approval
- reversal rules
- fraud checks
- affiliate dashboard
- settlement review
- accounting fields

## P7.6 Analytics

Track:

- visitor-to-order conversion
- upload completion
- payment conversion
- job completion
- failure causes
- repeat purchase
- average order value
- gross margin
- worker utilization
- customer acquisition source

---

# 13. Phase P8 — Automation and AI

## Goal

Use AI and workflow automation only after the commercial and render workflows are stable.

## P8.1 AI project inspection

Potential capabilities:

- project-type detection
- missing texture detection
- missing font detection
- unsupported plugin detection
- render-engine detection
- complexity summary
- risk indicators
- suggested worker class

AI findings must be labeled as estimates.

AI must not silently modify customer projects.

## P8.2 AI ETA and pricing assistance

Requirements:

- historical job data
- explanation
- confidence score
- fallback rules
- prediction-error monitoring
- policy controls
- human override

## P8.3 AI support assistant

Use for:

- response drafting
- customer-history summaries
- upload-error explanations
- ticket classification
- suggested next actions

High-impact decisions require human approval.

## P8.4 Workflow automation

n8n, Make, Zapier, or similar tools may be used for:

- notifications
- daily reports
- CRM synchronization
- support-ticket creation
- internal alerts
- spreadsheet export
- approved marketing workflows

Do not use them as:

- core scheduler
- payment authority
- ownership authority
- large-file transfer engine

## P8.5 Engineering agents

AI agents may assist with:

- implementation
- review
- security analysis
- testing
- documentation
- repository audit

Require:

- structured plan
- real tests
- code review
- security checks
- human approval before push, merge, or deployment

---

# 14. Phase P9 — Scale and Reliability

## Goal

Prepare CWS for larger volume only after measured demand justifies it.

Implement progressively:

- multi-region storage
- multi-region compute
- region-aware scheduling
- high availability
- backup and disaster recovery
- database tuning
- queue partitioning
- rate limiting
- observability
- incident management
- cost controls
- capacity forecasting
- storage lifecycle optimization
- data residency controls
- load testing
- chaos and recovery testing

Do not add scale complexity prematurely.

---

# 15. Smart Revision Render

## Status

Deferred strategic feature.

## Placement

- architectural preparation: after P3
- research: after P4 pilot
- production implementation: under P7.3 or later

## Objective

Allow small customer revisions without rerendering the entire project when technically possible.

## Business value

- reduce GPU cost
- reduce customer wait time
- reduce worker workload
- improve gross margin
- improve revision experience

## Research topics

- Blender View Layers
- Render Passes
- Multi-Layer OpenEXR
- Cryptomatte
- Render Border / Render Region
- Image Sequence
- Simulation Cache / Bake
- Persistent Data
- Incremental rendering
- Distributed-render recovery
- Compositing workflows

## Change-impact levels

- Level A: post-processing only
- Level B: render region
- Level C: view layer
- Level D: frame range
- Level E: full rerender

## Future render recovery package

Store where appropriate:

- source project
- render settings
- manifest
- checksums
- simulation cache
- Multi-Layer EXR
- Cryptomatte
- frame sequence
- previews
- outputs
- job version
- dependency map

## Future pipeline

```text
Old Job
→ Detect Changes
→ Dependency Analysis
→ Impact Classification
→ Partial Re-render
→ Composite
→ Validation
→ Deliver
```

## Current architectural requirement

The MVP should preserve:

- job manifests
- input checksums
- output checksums
- frame/task identity
- job events
- version history
- safe retention metadata

Do not implement the full Smart Revision Render system before the real pipeline is stable.

---

# 16. Security Requirements by Area

## Authentication and authorization

- server-side authorization
- resource ownership
- role checks
- MFA for privileged accounts where available
- session expiration
- secure cookies
- brute-force protection
- rate limiting
- step-up authentication for high-risk actions

## Files and storage

- private buckets
- signed URLs
- expiration
- ownership validation
- input validation
- checksum verification
- upload size limits
- metadata validation
- malware scanning architecture
- safe cleanup

## Payments

- idempotency
- replay protection
- amount validation
- payment-reference validation
- webhook signature validation
- immutable audit history
- duplicate-confirmation protection
- manual fallback
- secret redaction

## Workers

- device identity
- short-lived credentials
- least privilege
- signed/versioned agent releases
- controlled working directory
- revocation
- heartbeat
- safe logs
- cleanup
- no permanent broad storage access

## Admin and operations

- no hidden bypass
- safe actions only
- audit all state changes
- no direct browser database mutation
- sensitive values redacted
- high-risk actions require confirmation
- emergency access separated where practical

---

# 17. Reporting Policy

To reduce duplicated documentation during MVP development, use one report per roadmap task or compact phase slice.

Recommended format:

```text
CWS Reports/
├── Audit/
│   └── <NUMBER>_<TASK>_AUDIT.md
└── Task Reports/
    └── <NUMBER>_<TASK>_REPORT.md
```

Each implementation report must include:

1. Scope
2. Roadmap position
3. Repository evidence
4. Files created
5. Files modified
6. Migrations
7. API changes
8. Configuration changes
9. Tests and actual result summary
10. Security considerations
11. Known limitations
12. External dependencies
13. Deferred work
14. Rollback notes
15. Recommended next task

Separate security, test, and deployment files are required only when:

- phase is large
- deployment is imminent
- risk is high
- owner explicitly requests them

---

# 18. Definition of Done

A roadmap item is complete only when:

- code is implemented
- repository evidence exists
- build succeeds
- lint succeeds
- relevant tests pass
- existing tests do not regress
- authorization exists
- ownership checks exist
- configuration is documented
- migration is reversible where practical
- API behavior is documented
- implementation report exists
- no placeholder is described as production-ready
- external blockers are clearly documented
- next independent roadmap work continues when safe

A phase is complete only when its acceptance gate passes.

---

# 19. Mandatory Codex Execution Protocol

```text
Read CWS_FULL_ROADMAP_OFFICIAL_V1_1.md completely before modifying code.

Treat it as the official source of truth.

First inspect:
- repository structure
- roadmap files
- implementation reports
- database schema
- migrations
- authentication
- authorization
- order models
- upload models
- payment models
- worker models
- scheduler
- preview/output pipeline
- existing tests

Create an evidence table containing:
- roadmap item
- repository evidence
- status
- tests
- conflict
- required next action

Do not trust prior completion reports without repository evidence.

Do not create a new product phase.
You may create a necessary technical subtask only when it directly satisfies
the current phase acceptance criteria.

For the Vietnam MVP:
- use Vietnamese bank transfer
- use manual MB Bank confirmation first
- use manual MoMo mode until official credentials exist
- do not expose unsupported payment providers

Do not let external credentials freeze the entire roadmap.

If an external dependency is missing:
1. complete internal work
2. isolate the integration
3. implement safe manual or disabled mode
4. document the blocker
5. continue to the next independent task

Follow the official order:
1. verify P0/P1
2. isolate unsupported Stripe production paths
3. complete P2
4. complete P3
5. pass P4
6. continue sequentially

For each task:
1. inspect
2. plan
3. implement
4. run build
5. run lint
6. run unit tests
7. run integration tests
8. fix failures
9. review security
10. write one implementation report
11. continue to the next independent item

Stop only for:
- genuine architecture blocker
- unsafe ambiguity
- repository corruption
- missing external credential that blocks the exact current integration
- context exhaustion

Do not commit.
Do not push.
Do not merge.
Do not deploy.
Do not rewrite history.
Do not expose secrets.
```

---

# 20. Immediate Next Action

The next Codex session must:

1. Read this roadmap.
2. Audit the actual repository.
3. Verify P0 and P1.
4. Identify conflicts.
5. Isolate unsupported Stripe production-facing paths.
6. Determine the exact current unfinished item.
7. Continue Phase P2.
8. Implement manual MB Bank flow before waiting for automatic reconciliation.
9. Include the Minimum Operations Console in the MVP.
10. Continue toward a real end-to-end render pilot.

The immediate success target is:

```text
Customer creates order
→ uploads project
→ real worker processes it
→ preview becomes available
→ payment is manually confirmed
→ original output is unlocked
→ customer downloads result
→ owner sees the complete lifecycle
```
