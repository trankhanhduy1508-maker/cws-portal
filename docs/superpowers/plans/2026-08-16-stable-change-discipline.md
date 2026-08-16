# Stable Change Discipline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Founder-approved Stable Change Discipline to `AGENTS.md` without changing product workflow or architecture.

**Architecture:** This is a governance-only change. Add one mandatory section near the existing engineering rules so every AI/Codex session that loads `AGENTS.md` receives the rule. Do not alter runtime code, workflow, infrastructure, payment, authentication, storage, or security boundaries.

**Tech Stack:** Markdown governance in GitHub.

## Global Constraints

- Preserve all existing `AGENTS.md` rules unless the approved design explicitly adds to them.
- Do not change CWS product workflow or runtime architecture.
- Do not weaken security, tests, grounding, Founder approval boundaries, or Spec Kit requirements.
- Keep the change focused and reviewable.

---

### Task 1: Add Stable Change Discipline to AGENTS.md

**Files:**
- Modify: `AGENTS.md`
- Reference: `docs/superpowers/specs/2026-08-16-stable-change-discipline-design.md`

**Interfaces:**
- Consumes: existing CWS governance and Founder-approved design.
- Produces: mandatory AI/Codex engineering rule in `AGENTS.md`.

- [ ] **Step 1: Preserve current AGENTS.md content**

Read the current file and make no unrelated edits.

- [ ] **Step 2: Add the mandatory Stable Change Discipline section**

Insert the approved core rule, required behaviors, compact heuristic, and CWS-specific job-data example near `Core engineering rules`.

- [ ] **Step 3: Verify scope**

Confirm the diff changes only governance prose in `AGENTS.md` and does not alter product/runtime behavior.

- [ ] **Step 4: Verify required phrases are present**

Confirm the resulting file includes:

`If current behavior is verified and the current task does not require changing it, do not change it.`

`STABLE FIRST -> CHANGE MINIMUM -> VERIFY REALITY -> ROLLOUT GRADUALLY -> OBSERVE -> EXPAND ONLY WHEN PROVEN`

`EXISTING TOOL FIRST -> STABLE CODE FIRST -> MINIMUM CHANGE -> VERIFY REGRESSION -> CUSTOM/REWRITE LAST`

- [ ] **Step 5: Commit**

Commit only the focused governance update.