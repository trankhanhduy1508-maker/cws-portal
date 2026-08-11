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

## Reviewed specialist references

### UI/UX Pro Max + Founder liquid/floating navigation preference

Reviewed source/security/pattern note:

`knowledge/github-patterns/11-ui-design/UI_UX_PRO_MAX_REVIEW.md`

Use it only as a specialist reference when UI/design work is active. It records:
- reviewed lessons from `nextlevelbuilder/ui-ux-pro-max-skill` pinned to a specific upstream commit;
- the static security/supply-chain review and the decision **SAFE FOR REVIEWED REFERENCE / NOT APPROVED FOR DIRECT EXECUTION IN CWS**;
- the Founder-provided visual preference for dark liquid/floating navigation with an elevated center action;
- rules for adapting those ideas without changing the canonical CWS workflow.

Do not run the upstream installer merely to obtain design knowledge. Re-ground the upstream source before any future code/dependency adoption.

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
