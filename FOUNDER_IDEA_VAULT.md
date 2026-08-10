# Founder Idea Vault

> Persistent registry for future CWS-adjacent ideas that must be remembered but **must not distract the current MVP before their activation gates are proven**.

## Operating rule
Each idea has four states:
- `DORMANT` — preserve only; do not implement.
- `ELIGIBLE_FOR_REVIEW` — evidence says its trigger is met; notify Founder.
- `APPROVED` — Founder explicitly authorizes planning/implementation.
- `ACTIVE` — initiative is being executed under the normal CWS grounding/spec/architecture process.

AI/Codex must never promote an idea from `DORMANT` directly to `ACTIVE`.

Trigger conditions require grounded evidence. A simulation, unit test, local harness, or optimistic estimate does not satisfy a real-world trigger unless the trigger explicitly says simulation is enough.

---

## IDEA-001 — Code Factory / Upwork Software Factory

**State:** `DORMANT`

### Intent
Build a reusable AI-assisted software factory from lessons learned through CWS, then use it to create software/websites/SaaS/internal tools for external clients, including possible work on Upwork or other international freelance marketplaces.

The intended value is not merely "AI writes code fast". The factory should convert an idea into a grounded, specified, architected, tested, deployed and maintainable product using reusable engineering gates and lessons extracted from real projects.

### Activation gate
Do **not** launch or implement this initiative until CWS has demonstrated that it can serve approximately **100 real concurrent customers/users** under a real production or production-like workload with traceable runtime evidence.

The following do **not** unlock the gate by themselves:
- 100 mocked users;
- a local load-test harness;
- unit/integration tests;
- simulated Worker/customer scenarios;
- architecture claims without runtime evidence.

### When the gate appears satisfied
AI/Codex must:
1. ground the claim in runtime evidence;
2. report: `FOUNDER IDEA GATE REACHED — IDEA-001`;
3. summarize the evidence proving the ~100-real-concurrent-customer threshold;
4. remind Founder of the Code Factory / Upwork idea;
5. ask Founder whether to promote it to `APPROVED`;
6. only after explicit approval, run the normal grounding -> staleness -> diagnosis -> Spec Kit -> architecture -> implementation workflow.

### Before activation
Allowed:
- preserve notes and lessons from CWS;
- tag reusable engineering patterns in learning reports;
- record new Founder thoughts here.

Not allowed:
- build a separate Code Factory product;
- create a separate repo/project/service for it;
- publish an Upwork service offering;
- divert CWS engineering time to implement it;
- claim the activation gate based only on simulation.

### Reusable assets expected from CWS
Potential inputs when the gate is eventually reached:
- Grounding Policy;
- Staleness Guard;
- root-cause / one-bottleneck execution funnel;
- GitHub Spec Kit workflow;
- architecture/security/scale gates;
- E2E/evidence discipline;
- engineering learning log;
- model routing;
- reusable auth/storage/payment/deployment patterns where truly generic.

These are candidates, not automatically reusable products. They must be validated across more than one project before becoming a generalized factory framework.

---

## Adding future Founder ideas
Add another `IDEA-###` entry with:
- intent;
- `DORMANT` state;
- measurable activation gate;
- what evidence proves the gate;
- what is allowed before activation;
- what requires Founder approval.

This file is a memory/gating registry, **not an active roadmap**. `CWS_ROADMAP.md` remains the only active CWS roadmap.
