# 11 — UI / Design Knowledge Router

> Status: DORMANT REFERENCE
> Current priority: NOT UI

The consolidated CWS UI knowledge base already exists at repository root:

`CWS_UI_DESIGN_ENGINEERING_PLAYBOOK_V1.md`

It combines lessons from:
- Bootstrap;
- shadcn/ui;
- Material UI;
- Google Stitch Skills;
- Google DESIGN.md.

Do not duplicate that content here.

## Activation rule

Only load the UI playbook when `CURRENT_STATUS.md` identifies Customer/Admin UI, design-system work or visual consistency as the active verified bottleneck.

Until then, CWS priority remains render-system correctness and Golden E2E progression.

## Mandatory UI boundary

External UI knowledge does not permit an agent to:
- redesign multiple screens autonomously;
- change Customer workflow;
- add a UI framework/dependency without grounding and approval;
- replace working frontend architecture merely for aesthetics.

When UI becomes active, use:

`existing frontend -> inspect/extract -> identify inconsistency -> approved design direction -> DESIGN.md/tokens -> one workflow slice -> components -> accessibility/responsive verification -> browser E2E`

See `CWS_UI_DESIGN_ENGINEERING_PLAYBOOK_V1.md` for the full rules.
