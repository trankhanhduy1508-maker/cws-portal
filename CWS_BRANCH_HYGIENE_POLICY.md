# CWS Branch Hygiene Policy

> Status: ACTIVE governance for Git branch/PR hygiene.
> Canonical branch: `main`.

## Purpose

Prevent branch proliferation, duplicated knowledge, stale parallel implementations, and repository-routing noise.

A branch is a temporary execution workspace, not a permanent knowledge store.

Canonical knowledge belongs on `main` after review/merge. Historical knowledge belongs in Git/PR history or explicit reports/archive material.

## Before creating any new branch

The AI/agent MUST first determine:

1. Whether an existing active branch or open PR already covers the same task/domain.
2. Whether the work can safely continue on that existing branch.
3. Whether the intended change or knowledge is already present on `main`.
4. Whether the proposed branch is materially distinct, rather than another attempt/name for the same work.
5. Whether branch isolation provides a concrete safety/review benefit.

Default preference:

`REUSE EXISTING ACTIVE BRANCH > UPDATE EXISTING PR > CREATE NEW BRANCH`

Do not create a new branch merely because a new AI session started, a different agent is executing, a prompt changed, or another attempt is being made.

## When a new branch is justified

Create a new branch only when there is a concrete reason, such as:

- materially different bounded work;
- necessary isolation for a risky change;
- an existing branch cannot absorb the work without mixing unrelated scope;
- a reconciliation branch is needed for a proven divergence/conflict;
- explicit Founder direction.

For the same domain/bottleneck, prefer one active implementation branch.

## Branch lifecycle

Use:

`CREATE ONLY IF NEEDED -> WORK -> VERIFY -> PR/REVIEW -> MERGE OR CLOSE -> CLASSIFY AS HISTORY`

After a PR is merged, `main` becomes the canonical owner of the merged code/knowledge. The source branch is historical and must not be treated as an active authority by future AI sessions.

## Knowledge consolidation

When branches overlap:

`COMPARE -> SELECT CURRENT AUTHORITY -> PRESERVE UNIQUE VALID KNOWLEDGE -> CONSOLIDATE INTO MAIN/CANONICAL OWNER -> SUPERSEDE DUPLICATES`

Never merge a stale branch wholesale merely to preserve knowledge. Extract only still-valid unique information and do not reintroduce superseded workflow, architecture, security, payment, schema, or product behavior.

`ONE FACT -> ONE CANONICAL OWNER -> BRANCHES ARE NOT PARALLEL KNOWLEDGE BASES`

## Cleanup classification

For branch hygiene work, classify branches as:

- `KEEP_ACTIVE` — current aligned work that is still needed;
- `SAFE_TO_CLEAN` — merged, fully superseded, temporary, or duplicate with no unique active value;
- `REVIEW_REQUIRED` — contains unmerged unique commits/evidence or uncertain value.

Never treat `REVIEW_REQUIRED` as disposable by assumption.

## New-session behavior

A new AI session MUST NOT infer that every remote branch is current work.

For normal grounding:

- `main` is canonical;
- open PRs/current active branches are task-relevant execution state;
- merged/closed/superseded branches are cold history;
- branch contents are read only when the current task requires them.

Do not inventory or read every branch during normal grounding unless the task is specifically branch cleanup, reconciliation, regression archaeology, or unmerged-work recovery.

## Success condition

Branch hygiene is successful when `main` owns current knowledge, only a small number of genuinely active branches remain, open PRs map to real work, and old branches remain history rather than polluting AI grounding.
