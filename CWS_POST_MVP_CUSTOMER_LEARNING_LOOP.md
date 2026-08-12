# CWS Post-MVP Customer Learning Loop

> Status: POST-MVP PRODUCT BACKLOG — NOT ACTIVE MVP BEHAVIOR
> Recorded: 2026-08-12
> Founder intent: CWS should improve faster by learning systematically from real customer usage and feedback.

## Purpose

CWS cannot prevent competitors from competing. A durable advantage is to learn faster from real customers and continuously convert that learning into product improvements.

This document records a post-MVP concept only. It does **not** authorize implementation, pricing changes, wallet/credit schema, payment-flow changes, or customer-facing promises during the current MVP cycle.

## Core learning loop

`Customer uses CWS -> real Job outcome -> customer feedback -> structured triage -> product/operations improvement -> measure result -> repeat`

The goal is to make useful customer feedback a first-class product signal rather than relying only on Founder/AI assumptions.

## Proposed loyalty reward for completed Jobs

Founder proposal as of 2026-08-12:

- a customer may earn reward value equal to **2% of the eligible Job value**;
- example: a 500,000 VND eligible Job would earn reward value equivalent to 10,000 VND;
- final representation is undecided: points, credits, wallet balance, discount credit, or another bounded loyalty unit;
- this 2% proposal is **not active MVP pricing/payment behavior** until a later Founder decision specifies accounting, eligibility, expiry, redemption, refund/cancellation behavior, tax/accounting implications, and abuse controls.

## Reward for useful feedback

CWS should also be able to reward customers for useful feedback after MVP.

The reward amount/percentage is **TBD**.

Do not invent a percentage automatically. A future decision should consider:

- value/severity of the feedback;
- reproducibility and evidence quality;
- whether the report reveals a real defect, UX problem, workflow friction, or product opportunity;
- duplicate reports;
- abuse/spam/farming risk;
- financial cost of the reward;
- whether rewards are fixed, tiered, manual-review, or rules-based.

## Product principle

Feedback rewards should optimize for **useful learning**, not raw feedback volume.

The system should prefer a smaller number of high-signal reports over large volumes of low-quality submissions.

Potential future feedback categories:

- render failure / technical bug;
- wrong or confusing progress/state;
- upload/input friction;
- pricing/payment confusion;
- output quality or missing artifact;
- performance/deadline experience;
- UX difficulty;
- feature request;
- support/operations issue;
- other structured feedback.

## Future feedback record — suggested fields

When this feature is specified later, consider recording:

- customer_id;
- job_id when applicable;
- feedback category;
- message;
- evidence/attachments references;
- severity/impact;
- duplicate/canonical issue link;
- triage state;
- resolution/action;
- reward decision;
- reward amount/unit;
- created/resolved timestamps;
- audit trail.

These are design candidates, not an approved production schema.

## Anti-abuse requirements before implementation

A future implementation must address at least:

- duplicate feedback farming;
- fake/low-effort submissions;
- repeated self-reporting of the same issue;
- account abuse/multiple-account farming;
- reward reversal when a Job is refunded/cancelled if applicable;
- reward caps/expiry if approved;
- clear auditability;
- no client-side self-awarding of points/credit.

Any valuable reward must be granted server-side under an authenticated, auditable rule.

## Metrics for the learning loop

The future system should measure whether feedback actually improves CWS, for example:

- number of actionable feedback items;
- time from report -> triage -> fix;
- repeat incidence of the same issue;
- Job success/failure rate before vs after fixes;
- customer repeat usage;
- reward cost vs retained/recovered revenue;
- percentage of feedback resulting in a verified improvement.

The purpose is not to maximize points issued. The purpose is to shorten the CWS learning cycle.

## Activation gate

Do **not** implement during the current MVP bottleneck.

Revisit after Golden Production MVP/E2E is proven and the core customer runtime is stable enough to observe real customer behavior.

Before implementation, Founder must separately approve:

1. whether the 2% Job reward becomes final;
2. reward unit: points / credit / wallet / discount or other;
3. eligible Job value basis;
4. redemption rules;
5. expiry/caps;
6. refund/cancellation handling;
7. feedback reward model and amount;
8. abuse prevention and audit rules;
9. exact customer UX;
10. accounting/payment implications.

## Current boundary

This backlog item must not change or delay the active Customer Golden E2E / Scheduler / Worker provisioning work.
