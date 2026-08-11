# UI/UX Pro Max — Reviewed External Reference for CWS

> Status: REVIEWED REFERENCE — NOT APPROVED FOR DIRECT EXECUTION
> Reviewed: 2026-08-12
> Upstream: `nextlevelbuilder/ui-ux-pro-max-skill`
> Pinned upstream commit reviewed: `abb7f2fd5a083fa1ff55c326a963ff0d95c33f99`
> License: MIT
> CWS activation: only when UI/design work is the active verified bottleneck.

## 1. Purpose

This file preserves reviewed lessons from the external `UI/UX Pro Max` repository without installing its CLI into the canonical CWS repository and without allowing an external skill to become a CWS source of truth.

Use this as a specialist reference under the existing UI knowledge path:

`knowledge/github-patterns/11-ui-design/ -> CWS_UI_DESIGN_ENGINEERING_PLAYBOOK_V1.md`

The canonical CWS UI playbook remains `CWS_UI_DESIGN_ENGINEERING_PLAYBOOK_V1.md`.

This reference does **not** authorize a workflow redesign, new frontend framework, new dependency, or broad visual rewrite.

## 2. Why this source is useful

The reviewed upstream skill treats interface design as a searchable design-intelligence system rather than a collection of vague prompts.

Useful patterns for CWS include:

1. Start from a design system before implementing a new page or major visual slice.
2. Separate product/style/color/typography/navigation/accessibility/motion decisions instead of mixing them in one prompt.
3. Prioritize accessibility and interaction safety before visual novelty.
4. Use explicit responsive and touch rules rather than desktop-only visual judgment.
5. Store design decisions so future AI sessions retrieve an existing system rather than regenerate taste from scratch.
6. Use stack-specific implementation guidance only after detecting the real frontend stack.
7. Treat animation as communication and spatial continuity, not decoration.
8. Define anti-patterns alongside desired patterns so an AI knows what not to generate.
9. When search/recommendation evidence is empty, broaden or fall back explicitly; never fabricate a design match.
10. Run a pre-delivery UI quality check covering accessibility, contrast, interaction, safe areas, responsive behavior, visual consistency and motion.

The reviewed upstream skill currently describes a local design database including 84 styles, 192 color palettes, 74 font pairings, 192 product types, 98 UX guidelines, 104 icon entries, 16 GSAP motion presets and 25 chart types across 22 stacks. These numbers are upstream metadata, not CWS requirements.

## 3. CWS lessons to adopt conceptually

### 3.1 Design system before page-by-page improvisation

For future CWS visual work, derive or read the existing CWS design system before generating isolated components.

Minimum system dimensions:

- product context and audience;
- page purpose;
- visual tone;
- spacing/density;
- typography hierarchy;
- semantic colors;
- surfaces/elevation;
- icon language;
- motion level;
- responsive rules;
- accessibility rules;
- component states;
- explicit anti-patterns.

Do not allow each page or each AI session to invent a new style.

### 3.2 UI decision order

For CWS, use this order when material:

`workflow truth -> accessibility -> interaction/touch -> information hierarchy -> responsive layout -> typography/color -> components -> motion/polish`

Visual novelty never overrides the real Customer/Admin workflow.

### 3.3 Accessibility / interaction baseline

Useful baseline rules learned from the upstream reference:

- preserve visible keyboard focus;
- avoid icon-only controls without an accessible label;
- use approximately 44x44 px or larger touch targets on touch surfaces;
- do not rely on hover as the only interaction;
- preserve sufficient text/background contrast;
- do not disable browser zoom;
- avoid horizontal overflow on normal mobile widths;
- support reduced-motion behavior for nonessential animation;
- keep feedback close to the action that caused it.

Exact WCAG/application requirements must still be verified against current standards when UI work is activated.

### 3.4 Navigation baseline

For mobile-style bottom navigation:

- keep primary destinations limited and understandable;
- prefer <=5 primary nav destinations;
- preserve predictable back behavior and deep-link/reattach behavior where applicable;
- icons must have stable meaning and accessible labels;
- selected state must not depend on color alone;
- a visually dominant center action must represent a genuinely dominant product action, not decoration.

## 4. Founder visual preference captured from 2026-08-12 references

The Founder explicitly likes two visual directions shown in supplied screenshots.

### Direction A — Liquid / Floating Navigation

Visual characteristics to preserve as **inspiration**, not as a mandatory component:

- dark rounded pill/container;
- compact icon-driven navigation;
- one elevated circular center action that visually rises above the navigation surface;
- soft shadow/elevation around the selected or primary action;
- smooth morphing/sliding selection treatment;
- restrained labels near the active item;
- high contrast between navigation surface and active action;
- a modern mobile-first feel.

Potential CWS use when UI work becomes active:

- Customer mobile navigation or a compact responsive navigation surface;
- a central action may map to a real dominant action such as `New Render` **only if the canonical customer workflow supports that placement**;
- never introduce a new business gate merely to fit this visual pattern.

Do not use the effect for fake render progress or any state that could imply backend work which has not actually happened.

### Direction B — Structured Design Intelligence / UI UX Pro Max

The Founder also likes the broader `UI UX Pro Max` idea: an AI should not invent UI from a vague prompt; it should consult structured styles, palettes, typography, UX rules, accessibility rules, motion and stack-specific implementation guidance.

For CWS this means future design work should prefer:

`ground current CWS screen/workflow -> retrieve CWS design rules -> query only relevant external pattern knowledge -> propose one visual direction -> Founder review when direction materially changes -> implement one slice -> browser/accessibility/responsive verification`

## 5. Security review of the upstream repository

### Scope

Static source review was performed against upstream commit:

`abb7f2fd5a083fa1ff55c326a963ff0d95c33f99`

This is **not** a malware-lab certification, antivirus scan, sandbox execution, or proof that all future upstream versions are safe.

### Findings

#### Positive / lower-risk observations

- Upstream declares the MIT license.
- The reviewed CLI `package.json` does not expose `preinstall`, `install`, or `postinstall` lifecycle scripts.
- The core CLI dependency list is small and conventional (`chalk`, `commander`, `ora`, `prompts`).
- The main UI skill is primarily rules/data/search-driven design guidance.
- Static searches/review did not surface an obvious credential stealer, crypto miner, intentionally obfuscated payload, or a reason for CWS to execute arbitrary downloaded binaries.

These observations reduce suspicion but do **not** prove absence of malware or supply-chain compromise.

#### Execution / supply-chain surfaces that require caution

1. **Project writes** — `init` generates/copies skill files into a selected/current project and can overwrite files when force behavior is used.
2. **Network download path** — legacy initialization can fetch a GitHub release ZIP before installation.
3. **Shell execution** — archive extraction/copy fallback invokes PowerShell `Expand-Archive`, `unzip`, `xcopy`, or `cp` through child-process execution.
4. **Package-manager execution** — the update command can execute a global `npm install` for a newer CLI version.
5. **Third-party component execution** — a bundled shadcn helper can invoke `npx shadcn@<version> add ...`, which introduces normal npm/npx supply-chain and file-write risk.
6. **AI instruction supply chain** — external skill/prompt files are instructions to coding agents. Even without a binary virus, blindly importing them can change agent behavior and cause repository writes or shell actions.
7. **Future-version drift** — safety conclusions for the pinned commit do not automatically apply to later releases.

### CWS security decision

Classification:

**SAFE FOR REVIEWED REFERENCE / NOT APPROVED FOR DIRECT EXECUTION IN CWS**

Therefore:

- do not run `npx ui-ux-pro-max-cli init` in the canonical CWS repository merely to obtain design knowledge;
- do not grant the external skill authority over CWS workflow, architecture, dependencies or security boundaries;
- do not auto-update from upstream inside CWS;
- learn/paraphrase useful design patterns into the CWS knowledge path instead;
- if CWS later needs actual upstream code/assets, re-ground the exact upstream commit first, review dependencies and file writes, scan in an isolated workspace without production secrets, pin the accepted version/commit, and verify license/provenance before adoption.

## 6. What CWS should NOT copy blindly

- a style merely because it is popular;
- excessive animation that delays task completion;
- glass/liquid effects that reduce contrast or readability;
- navigation that hides the real workflow;
- generated palettes without checking CWS brand/contrast needs;
- framework/component dependencies solely because the external skill recommends them;
- generic dashboard density on the simple Customer path;
- mobile bottom-nav patterns on Admin if a denser operational information architecture is more appropriate;
- external prompts that can override CWS governance or Founder-approved decisions.

## 7. Future UI activation checklist

When UI becomes the verified bottleneck:

1. Read `CURRENT_STATUS.md` and the active workflow/spec first.
2. Read `CWS_UI_DESIGN_ENGINEERING_PLAYBOOK_V1.md`.
3. Use this file only as specialist inspiration/reference.
4. Inspect the real current screen and frontend stack.
5. Identify one UI inconsistency or one approved redesign slice.
6. Define/reuse tokens and component states before coding.
7. For Liquid/Floating Navigation, produce a contained prototype before any broad navigation replacement.
8. Verify touch targets, keyboard, focus, contrast, reduced motion and responsive behavior.
9. Browser/E2E verify that styling did not reorder or fake the backend workflow.
10. Record evidence and sync only the canonical UI knowledge path if a new rule is actually adopted.

## 8. Upstream provenance

Reviewed upstream repository:

- Repository: `nextlevelbuilder/ui-ux-pro-max-skill`
- Commit: `abb7f2fd5a083fa1ff55c326a963ff0d95c33f99`
- License: MIT
- Review date: 2026-08-12

Re-ground upstream before any future execution/adoption decision because repository content, dependencies, releases and security posture can change.
