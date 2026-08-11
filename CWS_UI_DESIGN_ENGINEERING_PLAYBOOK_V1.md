# CWS UI DESIGN ENGINEERING PLAYBOOK V1

> **Status:** DORMANT SPECIALIST REFERENCE — approved knowledge base for the future UI phase; **not the current CWS priority**.
> **Version:** 1.0
> **Date:** 2026-08-11
> **Owner:** Founder / Project Owner
> **Activation rule:** Read and apply this playbook only when the active CWS bottleneck materially moves to Customer/Admin UI design, design-system work, or frontend visual consistency. Until then, render reliability, Task Graph, Scheduler, Worker runtime, output, payment and Golden E2E remain higher priority according to the active roadmap/status.

---

## 1. Purpose

This document is the single combined CWS knowledge base for future UI work.

It intentionally does **not** install or adopt a UI framework today. It studies mature open-source UI systems, extracts reusable engineering principles, adapts them to CWS, and records a bounded process for AI-assisted design later.

The core rule is:

> **Learn patterns first; copy dependencies only when evidence shows they fit CWS.**

For CWS, UI quality is important, but UI must never distract from the current render-system bottleneck or silently change product workflow.

---

# PART I — SOURCE SELECTION

## 2. Selection method

The Founder asked for the three highest-starred GitHub UI repositories most useful for CWS.

“UI repository” is ambiguous, so this playbook uses a practical category:

> **General-purpose web UI toolkit / component system / design-system repository from which CWS can directly learn reusable interface rules.**

Excluded from this ranking:

- frontend runtimes/frameworks such as React or Svelte;
- complete applications such as Open WebUI;
- design applications such as Penpot;
- component-development tooling such as Storybook;
- narrow platform-specific/mobile-only libraries;
- repositories whose primary value is not reusable web-interface design.

GitHub stars are a popularity signal, **not a quality guarantee**. Counts change continuously. The snapshot below was researched on 2026-08-11.

### Top three selected sources

1. **Bootstrap — `twbs/bootstrap`** — approximately **175k stars** in the 2026-08-11 snapshot.
   - Repository: https://github.com/twbs/bootstrap
   - Main value for CWS: responsive/mobile-first structure, mature state behavior, accessibility hardening, predictable utilities, backward-compatible design engineering.

2. **shadcn/ui — `shadcn-ui/ui`** — approximately **117k–120k stars** in the current snapshot range.
   - Repository: https://github.com/shadcn-ui/ui
   - Main value for CWS: open-code component ownership, semantic design tokens, accessible composable primitives, customization without black-box dependency lock-in.

3. **Material UI — `mui/material-ui`** — approximately **98.4k stars** in the researched snapshot, narrowly ahead of Ant Design in the same general category at that snapshot.
   - Repository: https://github.com/mui/material-ui
   - Main value for CWS: centralized theme system, mature React component contracts, CSS-variable/token architecture, color-scheme consistency, long-lived component engineering.

### Additional Google source intentionally included

The Founder separately asked to preserve the Google UI/agent-design lessons just studied. These are **not part of the top-three-by-stars ranking**, but they are incorporated into the same playbook:

- **Google Stitch Skills — `google-labs-code/stitch-skills`**
  - https://github.com/google-labs-code/stitch-skills
- **Google DESIGN.md — `google-labs-code/design.md`**
  - https://github.com/google-labs-code/design.md

They add an AI-design operating model: persistent design context, agent skills, code-to-design/design-to-code workflows, deterministic linting, reusable resources/examples and controlled AI design generation.

---

# PART II — WHAT CWS SHOULD LEARN FROM EACH SOURCE

## 3. Bootstrap: reliability before visual novelty

Bootstrap is valuable to CWS because it demonstrates what happens when a UI toolkit is forced to work across many browsers, devices, screen sizes, accessibility cases and years of compatibility pressure.

### 3.1 Mobile-first is a system rule, not a last-minute patch

Bootstrap describes itself as responsive and mobile-first. The lesson for CWS is not “use Bootstrap classes.” The lesson is:

- start from the smallest practical viewport;
- make the core task understandable and operable there;
- progressively add space and density for larger screens;
- do not design desktop first and then compress until it barely fits mobile.

CWS should therefore treat mobile layouts as a first-class acceptance condition because Customers may upload/check jobs from phones even if rendering itself happens elsewhere.

### 3.2 Layout must be predictable

A mature UI should use a small set of repeatable layout primitives:

- container widths;
- spacing scale;
- grid/flex rules;
- breakpoints;
- alignment rules;
- consistent section rhythm.

A screen should not invent a new spacing language every time.

### 3.3 States are part of the component

Bootstrap’s long maintenance history repeatedly addresses focus, disabled, validation, responsive, dark-mode and keyboard behavior.

CWS must define components as **state machines**, not screenshots.

Every interactive component should consider where applicable:

- default;
- hover;
- focus-visible;
- pressed/active;
- disabled;
- loading;
- success;
- warning;
- error;
- empty;
- unavailable/offline.

If a design only specifies the pretty default state, it is incomplete.

### 3.4 Accessibility belongs inside the primitive

Accessibility should not be a cleanup pass after visual work.

CWS should inherit these principles:

- semantic HTML before custom ARIA;
- keyboard operability;
- visible focus state;
- sufficient contrast;
- correct labels and error associations;
- reduced reliance on color alone;
- touch targets sized for real phones;
- motion that does not block comprehension.

### 3.5 Compatibility is part of UI engineering

A mature interface system must survive change without forcing complete redesigns.

CWS should prefer incremental evolution:

- stable component contracts;
- tokenized visual changes;
- bounded refactors;
- migration instead of page-by-page reinvention.

**CWS takeaway from Bootstrap:**

> **Responsive, accessible, predictable and backward-compatible beats visually clever but fragile.**

---

## 4. shadcn/ui: own the code, centralize the language

shadcn/ui’s most useful idea for CWS is not any specific component. It is the philosophy that component source should be understandable, editable and owned by the application team.

### 4.1 Open code over black-box dependency behavior

shadcn/ui explicitly encourages using the components as a starting point and making them your own.

For CWS this means:

- do not create an opaque UI layer that Codex cannot reason about;
- prefer components whose behavior and styles are visible in the repository;
- keep critical Customer states easy to inspect and test;
- avoid framework magic that makes simple changes depend on hidden internals.

### 4.2 Semantic tokens instead of raw values everywhere

shadcn/ui’s theming model uses semantic CSS variables such as background/foreground/primary and component utilities derived from those values.

CWS should follow the same **semantic-token concept**, regardless of whether Tailwind or shadcn is ever installed.

Bad:

```css
color: #8b5cf6;
background: #111827;
border-radius: 11px;
```

repeated independently across screens.

Better:

```css
color: var(--cws-action-primary);
background: var(--cws-surface-primary);
border-radius: var(--cws-radius-md);
```

The purpose is not variable syntax. The purpose is that **meaning stays stable while visual values can evolve centrally**.

### 4.3 Component composition over giant page components

CWS should build reusable primitives and domain components, for example later:

- Button
- Input
- FileDropZone
- StatusBadge
- ProgressStep
- JobSummary
- PaymentCard
- PreviewGallery
- ErrorNotice
- EmptyState

Pages compose these units. They should not duplicate visual rules manually.

### 4.4 Accessibility baseline should come with the component

A reusable component must carry its accessibility behavior with it. Fixing a Button once should fix every Button instance.

### 4.5 Variants must be finite and intentional

CWS should resist endless one-off variants.

Good variant families might be:

- `primary`
- `secondary`
- `destructive`
- `ghost`

not arbitrary per-page styles such as:

- `uploadBlueButton`
- `historyDarkButton`
- `paymentSpecialButton`

### 4.6 Registry thinking is useful even without shadcn

shadcn’s distribution model reinforces an important idea: components can be standardized assets with known contracts.

CWS can eventually maintain its own small internal component catalog, even if it never uses the shadcn CLI.

**CWS takeaway from shadcn/ui:**

> **Own the component source, use semantic tokens, compose small accessible primitives, and customize centrally instead of accumulating page-specific CSS.**

---

## 5. Material UI: theme architecture and long-lived component contracts

Material UI is useful because it represents a large, long-lived React component system with extensive theming and real-world compatibility pressure.

### 5.1 One theme, many components

CWS should have one visual source of truth that defines at minimum:

- colors;
- typography;
- spacing;
- radii;
- elevation/shadows;
- motion durations/easing;
- responsive breakpoints;
- state colors;
- z-index/layering rules.

Components consume those values. Components should not independently define the brand.

### 5.2 CSS variables/design tokens make theme changes cheaper

MUI’s CSS-variable work demonstrates the value of globally available theme variables and multiple color schemes.

CWS should design tokens so future changes such as:

- dark mode;
- partner branding;
- accessibility contrast tuning;
- compact/comfortable density;

can be achieved without editing dozens of component files.

This does **not** mean CWS needs multiple themes now. It means the architecture should not make one future theme change a rewrite.

### 5.3 Component API consistency matters

When similar components expose similar props and state behavior, developers and coding agents make fewer mistakes.

CWS later should standardize conventions for:

- `disabled`;
- `loading`;
- `error`;
- `size`;
- `variant`;
- event names;
- class/slot overrides where needed.

### 5.4 Mature systems separate foundation from advanced components

CWS should not start with a huge component library.

Build layers:

1. tokens/foundations;
2. basic primitives;
3. CWS domain components;
4. page compositions;
5. advanced data-heavy components only when actually needed.

### 5.5 Theme systems should improve debugging, not hide it

A theme is useful when a developer can trace:

`token -> component -> rendered state`

If the styling abstraction becomes impossible to inspect, it works against the AI Engineering Harness.

**CWS takeaway from Material UI:**

> **Centralize foundations, give components consistent contracts, and make the theme inspectable enough to survive years of change.**

---

# PART III — GOOGLE STITCH + DESIGN.MD LESSONS

## 6. Persistent design context for AI

Google Labs Code’s DESIGN.md project proposes a plain-text source of truth containing machine-readable tokens plus human-readable design rationale.

This pattern is highly compatible with CWS because coding agents need both:

- exact values;
- the reason and intended feeling behind those values.

A token alone cannot explain why a screen should feel calm, dense, technical or premium. Prose alone cannot guarantee that every radius remains 8px.

The future CWS design system should therefore combine both.

### 6.1 Future CWS `DESIGN.md` concept

When the UI phase becomes active, CWS should create one canonical `DESIGN.md` containing sections such as:

1. Overview / brand & style
2. Colors
3. Typography
4. Layout & spacing
5. Elevation & depth
6. Shapes / radii
7. Components
8. Do / Don’t rules
9. State semantics
10. Responsive behavior
11. Accessibility rules
12. CWS domain patterns

The final visual values are **TBD until the Founder approves the UI direction**. This playbook must not invent those values today.

### 6.2 Deterministic linting is stronger than AI taste claims

Google’s DESIGN.md tooling supports lint/diff/export concepts.

CWS should copy the pattern:

> **AI proposes or edits design; deterministic checks verify structure/tokens.**

Eventually useful checks may include:

- unresolved token references;
- duplicate token definitions;
- raw colors introduced outside tokens;
- unsupported spacing values;
- forbidden page-specific button colors;
- missing focus state;
- contrast violations;
- inconsistent component variants.

---

## 7. Stitch Skills: specialist AI instead of one giant prompt

Stitch Skills organizes design/build/utility capabilities into bounded skills. The repository documents workflows such as:

- code-to-design;
- generate-design;
- manage-design-system;
- extract-design-md;
- React component conversion;
- prompt enhancement;
- design-quality/taste guidance.

The strongest CWS lesson is the skill structure itself.

A future UI skill can conceptually contain:

```text
ui-design/
├── SKILL.md
├── scripts/
├── resources/
└── examples/
```

Where:

- `SKILL.md` = workflow / mission control;
- `scripts/` = deterministic validation;
- `resources/` = CWS design knowledge/checklists;
- `examples/` = approved gold-standard examples.

### 7.1 Progressive disclosure

Scheduler work should not load UI design context.

UI work should load this playbook and future DESIGN.md only when relevant.

This protects context quality and keeps UI from becoming the active bottleneck prematurely.

### 7.2 AI needs explicit operating mode

Before a design agent acts, specify whether it is doing:

- `INSPECT`
- `EXTRACT`
- `CREATE`
- `EDIT`
- `GENERATE_VARIANTS`
- `IMPLEMENT_APPROVED_DESIGN`

“Make it better” is not an acceptable production instruction because it gives the agent permission to redefine too much.

### 7.3 Code-to-design is valuable for CWS because CWS already has a portal

When UI work starts, do not automatically recreate the portal from zero.

Preferred future flow:

`existing CWS frontend -> inspect/extract current design language -> identify inconsistencies -> draft DESIGN.md -> Founder review -> improve one workflow slice -> componentize -> verify`

### 7.4 Do not let autonomous design loops rewrite the product

Tools that can generate many screens quickly are useful for exploration but dangerous as automatic production editors.

Any multi-screen redesign must remain behind Founder approval and the normal CWS Harness gates.

**CWS takeaway from Google Stitch/DESIGN.md:**

> **Give AI persistent design context, bounded skills, deterministic validators and approved examples; do not give it vague permission to redesign the product.**

---

# PART IV — CWS SYNTHESIZED UI RULES

## 8. The CWS UI Constitution — future activation rules

These rules combine the strongest compatible lessons from Bootstrap, shadcn/ui, Material UI and Google Stitch/DESIGN.md.

### Rule 1 — Product workflow outranks visual design

UI may clarify an approved workflow.

UI may **not silently change**:

- login order;
- upload/materialization rules;
- render semantics;
- payment order;
- download authorization;
- Scheduler behavior;
- Customer/Admin separation.

If visual design implies a workflow change, stop for Founder approval.

### Rule 2 — Function before polish

A visually polished screen over a fake or broken backend is not progress.

For CWS, UI is considered ready only after the underlying state/action is real enough for the current evidence level.

### Rule 3 — One canonical design language

When activated, create one CWS design source of truth. Do not let every screen define its own color, spacing, typography or radius system.

### Rule 4 — Semantic tokens are mandatory

Visual values should express meaning:

- surface;
- text;
- border;
- primary action;
- success;
- warning;
- danger;
- muted;
- focus;
- progress.

Avoid raw values scattered through components.

### Rule 5 — Mobile-first, responsive by construction

Every Customer workflow must be usable on a narrow phone viewport before wider desktop enhancements are considered complete.

### Rule 6 — Accessibility is a component invariant

Keyboard access, focus, semantic labels, contrast and screen-reader meaning are part of component correctness.

### Rule 7 — Every important component defines all operational states

For applicable components:

`default -> loading -> success -> error -> disabled -> empty/offline`

A screenshot of the happy path is insufficient.

### Rule 8 — Reuse primitives; do not clone CSS per page

Create a small vocabulary of primitives/domain components and compose screens from them.

### Rule 9 — Keep component source inspectable

CWS should prefer UI code that ChatGPT/Codex/human developers can understand and modify directly.

### Rule 10 — Consistency beats novelty

A new screen should look like CWS before it looks “creative.”

Unique visual treatment requires a reason, not merely AI preference.

### Rule 11 — Information hierarchy follows customer decisions

The most visually prominent object should usually correspond to the user’s current required decision/action.

For example, when upload is the only current action, secondary diagnostics should not visually compete with it.

### Rule 12 — Status must be unmistakable

Render products depend heavily on trust. Job state, progress, failure, retry, payment and download availability must have unambiguous language and visual state.

Do not communicate critical state using color alone.

### Rule 13 — Motion supports state change, not decoration

Animation should explain transitions/progress or provide feedback.

Avoid decorative motion that slows task completion or makes operational data harder to read.

### Rule 14 — Dense technical detail is progressive

Customer UI shows what the Customer needs.

Technical logs/details should be progressively disclosed rather than permanently occupying primary screen space.

### Rule 15 — AI-generated UI is a proposal until verified

AI output must pass:

- design-system consistency;
- responsive checks;
- accessibility checks;
- visual/state review;
- product workflow review.

### Rule 16 — Do not install a framework merely because it was studied

This document **does not approve installing Bootstrap, shadcn/ui, MUI, Tailwind, Stitch plugins or another design framework into CWS**.

Any dependency adoption later requires grounding against the actual frontend, bundle/performance cost, migration impact and maintenance fit.

---

# PART V — CWS-SPECIFIC DESIGN REQUIREMENTS

## 9. What the CWS Customer UI must optimize for

CWS is not a social network or content-browsing product. Its primary interface jobs are operational.

The UI should eventually optimize for:

1. **Clarity** — Customer immediately knows the next required action.
2. **Trust** — real status and errors are distinguishable from decoration.
3. **Speed perception grounded in reality** — show actual progress/state without fake animation or fabricated ETA.
4. **Low cognitive load** — Customer should not need render-farm expertise.
5. **Mobile operability** — login, upload/Drive, status, payment and download must remain understandable on phone.
6. **Recovery clarity** — failures explain what can happen next.
7. **Consistency** — the same job state must look/mean the same everywhere.

These are functional requirements, not final visual branding.

### Not yet decided

This playbook intentionally does **not** decide today:

- final brand palette;
- final typefaces;
- light vs dark default;
- exact radii;
- exact spacing scale;
- illustration style;
- “premium” visual direction;
- whether CWS later uses Bootstrap/shadcn/MUI directly.

Those belong to the future active UI phase and Founder approval.

---

# PART VI — FUTURE UI WORKFLOW

## 10. Activation workflow when UI finally becomes the bottleneck

When CURRENT_STATUS says UI is the active verified bottleneck, follow this sequence.

### Phase A — Ground

Inspect:

- current Customer frontend;
- Admin frontend only if that phase is active;
- current CSS/components;
- responsive behavior;
- screenshots at real breakpoints;
- accessibility issues;
- actual backend states represented in UI.

Do not redesign yet.

### Phase B — Extract current design reality

Inventory:

- colors;
- font sizes/weights;
- spacing;
- radii;
- components;
- repeated patterns;
- inconsistencies;
- dead CSS;
- accessibility gaps.

Google Stitch `extract-design-md` / code-to-design patterns may be evaluated here if the tooling is available and useful.

### Phase C — Draft CWS DESIGN.md

Create a canonical draft containing machine-readable tokens plus human rationale.

Founder reviews the direction before broad implementation.

### Phase D — Prototype one workflow slice

Choose one active Customer slice, not the entire product.

Example:

`Login -> Upload`

or later:

`Render status -> Output preview -> Payment`

Generate/edit variants only within that slice.

### Phase E — Convert approval into reusable components

Do not copy a generated page as one giant component.

Extract reusable primitives/domain components and keep token usage centralized.

### Phase F — Verify

Minimum future verification should include where applicable:

- responsive phone/tablet/desktop screenshots;
- keyboard navigation;
- focus-visible;
- form/error states;
- contrast;
- loading/empty/failure states;
- no workflow regression;
- no fake runtime/progress/payment state;
- frontend tests/build/lint;
- visual regression if tooling is later adopted.

### Phase G — Converge one slice, then continue

Do not redesign every page simultaneously.

Finish one slice, sync canonical design rules, then proceed.

---

# PART VII — FUTURE AI SKILL MODEL

## 11. Recommended future CWS UI skill structure

Do not implement this directory merely because it appears below. It is a future pattern when UI work becomes active.

```text
.agent/skills/ui-design/
├── SKILL.md
├── scripts/
│   ├── validate-design-tokens.*
│   ├── detect-raw-colors.*
│   └── responsive-check.*
├── resources/
│   ├── CWS_UI_DESIGN_ENGINEERING_PLAYBOOK_V1.md
│   ├── DESIGN.md
│   └── accessibility-checklist.md
└── examples/
    ├── approved-customer-screen.md
    ├── good-error-state.md
    └── good-job-status.md
```

Potential operating modes:

```text
INSPECT
EXTRACT
CREATE_VARIANT
EDIT_APPROVED_SLICE
IMPLEMENT_APPROVED_DESIGN
VERIFY
```

The agent should not receive a generic “make CWS beautiful” permission.

---

# PART VIII — ANTI-PATTERNS

## 12. What future CWS UI work must avoid

### Anti-pattern A — Framework collection

Installing Bootstrap + shadcn + MUI + Tailwind together because all are popular.

**Rejected.** Learn from all; adopt the smallest compatible implementation later.

### Anti-pattern B — AI screen inconsistency

Every generated screen has different spacing, colors, shadows and buttons.

**Rejected.** DESIGN.md/tokens/components must constrain generation.

### Anti-pattern C — Screenshot-driven development only

The design looks correct in one screenshot but loading/error/keyboard/mobile behavior is broken.

**Rejected.** States and interaction are part of UI correctness.

### Anti-pattern D — Redesigning business workflow

A design tool inserts approval steps, tiers, hardware selection or navigation not approved by Founder.

**Rejected.** Product workflow outranks design convenience.

### Anti-pattern E — Fake progress

Animated percentages or ETA not backed by real runtime data.

**Rejected.** CWS must preserve evidence-over-claims even in UI.

### Anti-pattern F — Premature UI priority

Stopping Scheduler/Worker/render reliability work today to rebuild visual design.

**Rejected.** This document is intentionally dormant until the active bottleneck changes.

---

# PART IX — SOURCE-TO-RULE MAP

## 13. Where the combined rules came from

### Bootstrap contributes primarily

- mobile-first/responsive thinking;
- predictable layout primitives;
- state completeness;
- accessibility hardening;
- compatibility and incremental evolution.

### shadcn/ui contributes primarily

- open-code ownership;
- composable accessible components;
- semantic CSS-variable tokens;
- finite variants;
- build-your-own component-library mindset.

### Material UI contributes primarily

- centralized theme architecture;
- consistent React component contracts;
- design tokens/CSS-variable color schemes;
- mature long-lived component engineering;
- layered foundation -> primitive -> advanced component model.

### Google Stitch Skills + DESIGN.md contribute primarily

- persistent machine + human design context;
- `DESIGN.md` as an AI-readable visual source of truth;
- code-to-design and design-to-code loops;
- bounded specialist skills rather than giant prompts;
- deterministic validation/scripts;
- approved examples/gold standards;
- explicit design-agent operating modes.

---

# PART X — FINAL CWS STANDARD

## 14. The future CWS UI formula

The combined approach is:

```text
PRODUCT TRUTH
    ↓
CURRENT UI GROUNDING
    ↓
CWS DESIGN.md
(tokens + rationale)
    ↓
SMALL ACCESSIBLE COMPONENTS
    ↓
MOBILE-FIRST COMPOSITION
    ↓
AI DESIGN/VARIANTS INSIDE APPROVED SCOPE
    ↓
DETERMINISTIC + HUMAN VERIFICATION
    ↓
ONE WORKFLOW SLICE CONVERGED
```

The CWS UI goal is not “look like Bootstrap,” “look like shadcn,” “look like Material Design,” or “look like Google Stitch.”

The goal is to combine their strongest engineering lessons into a CWS-specific interface that is:

> **clear, consistent, responsive, accessible, inspectable, trustworthy and difficult for AI to accidentally fragment.**

---

## 15. Priority lock

As of 2026-08-11:

> **THIS PLAYBOOK IS STORED FOR LATER. IT DOES NOT MOVE UI AHEAD OF THE ACTIVE CUSTOMER RENDER E2E BOTTLENECK.**

Current engineering effort should continue to prioritize the render core according to `CURRENT_STATUS.md`, `DECISIONS.md`, `CWS_MVP_WORKFLOW_FINAL.md`, `CWS_ROADMAP.md` and the active task spec.

When UI becomes the verified bottleneck, coding/design agents should read this playbook before proposing or implementing material visual changes.

---

## 16. Research references

Primary GitHub sources studied for this synthesis:

- https://github.com/twbs/bootstrap
- https://github.com/shadcn-ui/ui
- https://github.com/mui/material-ui
- https://github.com/google-labs-code/stitch-skills
- https://github.com/google-labs-code/design.md

Additional source notes:

- GitHub star counts are a point-in-time popularity signal and must not be treated as architectural authority.
- Google Labs Code `DESIGN.md` is currently described by its repository as an **alpha** format and should be adopted cautiously if/when CWS activates it.
- Google Stitch tooling/skills are useful patterns; their presence in this playbook is **not approval to install them now**.

---

## 17. One-sentence rule

> **CWS UI should learn Bootstrap’s reliability, shadcn/ui’s ownership and composability, Material UI’s theme discipline, and Google Stitch/DESIGN.md’s agent-readable design system — while staying subordinate to real product workflow and the active render bottleneck.**
