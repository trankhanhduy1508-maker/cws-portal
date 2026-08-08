# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

## Pre-Spec Diagnostic Gate *(mandatory)*

> Do not continue to requirements or implementation until this section is grounded in repository/runtime evidence. Follow `CWS_EXECUTION_FUNNEL.md`.

- **GOAL**: [What real customer/system outcome must exist?]
- **OBSERVATION**: [What is actually happening?]
- **EVIDENCE**: [Logs, code path, DB/runtime evidence, report, screenshot, or test proving the observation]
- **EXPECTED**: [Expected behavior]
- **ACTUAL**: [Observed behavior]
- **PROXIMATE CAUSE**: [Immediate mechanism of failure]
- **ROOT CAUSE / HYPOTHESIS**: [Deeper condition that allowed the failure]
- **FALSIFYING EVIDENCE**: [What evidence would prove this diagnosis wrong?]
- **ONE CURRENT BOTTLENECK**: [First verified FAIL/BLOCKED stage in the real E2E path]
- **MINIMUM FIX**: [Smallest durable correction intended to remove this bottleneck]
- **NON-GOALS**: [Related work explicitly excluded]
- **SUCCESS EVIDENCE**: [What must be observed to verify the fix, including production runtime when applicable]

If root cause is not yet confirmed, keep it explicitly as a falsifiable hypothesis and remain in investigation until enough evidence exists to justify the minimum fix.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-003**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-004**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-005**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable outcome tied to the diagnosed bottleneck]
- **SC-002**: [Regression/safety outcome]
- **SC-003**: [Production/runtime outcome when applicable]

## Assumptions

<!--
  ACTION REQUIRED: Keep assumptions explicit. Do not convert unknown technical state into a fact.
-->

- [Assumption about scope]
- [Assumption about data/environment]
- [Dependency on existing system/service]
