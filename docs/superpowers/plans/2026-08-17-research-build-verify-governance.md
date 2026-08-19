# Research-Build-Verify Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make research-first, specialist ownership, independent verification, and durable learning part of the default Codex behavior for CWS.

**Architecture:** Add a root `AGENTS.override.md` that Codex automatically loads alongside project instructions and that supplements, rather than replaces, existing CWS governance. Keep the policy compact and route deep details to the approved design document and existing AGENTS/AGENTS02/Harness sources.

**Tech Stack:** Markdown governance, Codex project instruction hierarchy, existing CWS AGENTS/AGENTS02/Harness/Superpowers workflow.

## Global Constraints

- Existing CWS governance remains higher authority.
- No product workflow, runtime architecture, security boundary, payment, database, or infrastructure behavior changes.
- Do not duplicate or replace AGENTS.md or AGENTS02.md.
- Custom implementation remains last after native/existing/official/mature alternatives.
- Production CWS remains operable with AI offline.

---

### Task 1: Add Codex research-first override

**Files:**
- Create: `AGENTS.override.md`
- Reference: `AGENTS.md`
- Reference: `AGENTS02.md`
- Reference: `docs/superpowers/specs/2026-08-17-research-build-verify-governance-design.md`

**Interfaces:**
- Consumes: existing CWS governance and Codex project-instruction loading.
- Produces: durable mandatory research/build/verify/learn rules for Codex sessions.

- [ ] **Step 1: Create the compact override**

Include the exact execution loop:

`RESEARCH -> DECIDE -> BUILD -> VERIFY -> LEARN`

Include the mandatory solution scan:

`NATIVE/INSTALLED -> EXISTING CWS -> EXISTING SKILL -> OFFICIAL CLI/API/SDK -> MATURE OPEN SOURCE -> CUSTOM LAST`

Include specialist ownership for WORKER, GUARD, VERIFIER, RESEARCH.

- [ ] **Step 2: Encode escalation behavior**

Require Builders to return:

`BLOCKED: SOLUTION FAMILY UNCLEAR -> ROUTE TO RESEARCH`

rather than inventing broad custom architecture when the solution family is unresolved.

- [ ] **Step 3: Encode independent verification**

Require a separate Verifier for material/high-risk changes when practical and forbid evidence promotion from the producing agent's confidence alone.

- [ ] **Step 4: Encode durable learning**

Require reusable lessons to be recorded with:

`PROBLEM / BAD DEFAULT / BETTER PATTERN / WHEN TO USE / EVIDENCE`

and prefer the existing Engineering Learning Log over new duplicate files.

- [ ] **Step 5: Verify scope**

Confirm the new file explicitly states that it supplements and does not override Founder authority, AGENTS.md, AGENTS02.md, the Harness, grounding, Stable Change Discipline, security boundaries, or source-of-truth rules.

- [ ] **Step 6: Commit**

Commit only the governance override and supporting design/plan files.
