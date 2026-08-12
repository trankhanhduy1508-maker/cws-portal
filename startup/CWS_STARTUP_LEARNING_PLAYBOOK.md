# CWS Startup Learning Playbook

> Status: ACTIVE LEARNING PLAYBOOK
> Date: 2026-08-12
> Canonical scope: Lean Startup + Dropbox lessons adapted for CWS.
> Governance: This document guides product learning, experimentation, customer feedback, and growth. It does not override `DECISIONS.md`, active specs, security boundaries, workflow approvals, or production evidence requirements.
> Current priority protection: this playbook must not displace the current one-Worker provisioning / Golden Production E2E bottleneck unless Founder explicitly changes priority.

---

# 1. Why this playbook exists

CWS is being built under extreme uncertainty: technical reliability, render economics, customer willingness to pay, partner-PC availability, support burden, payment behavior, and real-world Blender project diversity are all hypotheses until proven by current evidence.

The purpose of this playbook is therefore not to make CWS build faster at any cost. It is to make CWS **learn faster with less waste**.

Canonical learning principle:

`Idea -> smallest safe experiment -> real evidence -> validated learning -> decision -> next experiment`

CWS must distinguish:

- shipping code;
- completing a test;
- observing real runtime behavior;
- proving a business/customer assumption.

Only the last two create strong startup learning.

---

# 2. The combined lesson from The Lean Startup and Dropbox

The Lean Startup gives CWS the operating discipline:

`Build -> Measure -> Learn`

Dropbox demonstrates what this can look like in practice:

`show something real -> observe real users -> collect friction/feedback -> improve -> repeat -> later build growth loops around a product people already value`

Combined CWS rule:

> Build the smallest real thing that can falsify an important assumption, measure reality, learn, and only then expand scope.

Do not optimize for the amount of code written, number of features, number of documents, or number of AI tasks completed.

Optimize for **validated learning per unit of time and money**.

---

# 3. Validated learning is the startup unit of progress

For CWS, a feature is not progress merely because:

- code exists;
- CI passes;
- Vercel/Render says READY;
- a database row exists;
- a demo is visually convincing;
- an AI says the implementation is complete.

Progress requires evidence that an important assumption is now better understood.

Examples:

- `CODE VERIFIED`: Worker provisioning code exists and security tests pass.
- `INTEGRATION VERIFIED`: Backend + Worker enrollment path works in a controlled environment.
- `PRODUCTION RUNTIME VERIFIED`: one real authorized physical PC automatically provisions, authenticates, heartbeats, and reaches ACTIVE_IDLE.
- `CUSTOMER VALIDATED`: a real target customer successfully completes the intended workflow and demonstrates real value/willingness to return/pay.

CWS should always state which evidence level has actually been reached.

---

# 4. Current CWS Build–Measure–Learn loop

The current one-Worker strategy is itself a Lean Startup experiment.

## Build

Implement the smallest approved Spec 009 provisioning slice needed for exactly one physical PC:

`authorized bootstrap -> Backend-generated PCID/Worker ID -> credential -> DPAPI -> Node Agent -> heartbeat -> ACTIVE_IDLE`

## Measure

Observe real evidence:

- Was identity generated automatically?
- Did database uniqueness hold?
- Was credential stored safely?
- Did Node Agent authenticate without manual identity entry?
- Did production receive heartbeat?
- Did the Worker reach ACTIVE_IDLE?
- Did reboot/reconnect reuse the same identity?
- How much manual operator work was required?

## Learn

Decide from evidence:

- PASS -> continue to one-Worker real Job/Task runtime.
- FAIL -> identify root cause and repair the smallest blocking layer.
- architecture assumption disproven -> stop and bring the decision back to Founder.

Do not jump from one unverified Worker directly to 10 Workers.

---

# 5. MVP means minimum experiment that tests value, not minimum code quality

CWS MVP must not mean sloppy or fake.

For CWS, "minimum" means:

- minimum scope;
- minimum number of moving parts;
- minimum manual operations;
- minimum infrastructure additions;
- minimum feature surface needed to test the next critical assumption.

It does **not** mean:

- fake render;
- weak authentication;
- destructive shortcuts;
- bypassing payment ownership;
- hard-coded Worker identity;
- manually advancing the normal workflow;
- ignoring data integrity;
- declaring production success from mocks.

CWS MVP must remain safe enough that the evidence produced is trustworthy.

---

# 6. Leap-of-faith assumptions CWS must test explicitly

CWS should maintain a short list of assumptions that could invalidate the business if false.

Current/high-value examples:

1. Customers have enough render pain to use remote rendering repeatedly.
2. CWS can render real customer Blender projects reliably enough to earn trust.
3. Distributed partner PCs can be provisioned and operated without per-machine Founder/Admin work.
4. Render output can move through B2, preview, pricing, payment and download automatically.
5. Customers will pay a price that covers compute/host/infra/support costs with acceptable margin.
6. Partner net-cafes/PC owners will participate for an economically attractive payout.
7. Job latency and final-output time are competitive enough for the target customer segment.
8. Security/isolation is strong enough for customers to trust private project files.
9. Real support burden does not overwhelm a solo Founder.
10. Customer feedback can be converted into faster product learning rather than feature chaos.

Each major development slice should map to at least one important assumption.

If it tests none, ask why it is being built now.

---

# 7. Innovation accounting for CWS

CWS needs metrics that show whether the business/system is becoming more viable, not vanity metrics.

## Current technical learning metrics

- one-Worker automatic provisioning success rate;
- time from first bootstrap to ACTIVE_IDLE;
- manual actions required per new Worker;
- authenticated heartbeat reliability;
- task claim success/failure rate;
- duplicate/overlap task incidents;
- render success rate by project type;
- retry/failover frequency;
- time spent in each Golden E2E stage;
- B2 upload/verification success rate;
- payment match/unlock success rate.

## Early customer metrics

- percentage of valid submissions reaching successful output;
- time to first useful result;
- repeat Job rate;
- percentage of customers willing to use CWS again;
- willingness to pay at real pricing;
- support contacts per Job;
- refund/failure rate;
- top reasons for abandonment;
- customer-reported time saved;
- customer-reported ability to keep working while rendering.

## Learning metrics

- median time from real issue -> root cause;
- median time from verified defect -> verified fix;
- percentage of feedback linked to real Job evidence;
- percentage of accepted feedback resulting in measurable improvement;
- duplicate/spam feedback rate;
- repeat usage after a customer-reported issue is fixed.

Do not optimize signups, page views, GitHub commits, AI task count, or raw feedback count as primary success measures.

---

# 8. Small batches: the default execution model

The Lean Startup favors reducing batch size because smaller batches surface mistakes earlier.

CWS translation:

`1 Worker -> verify -> 2–3 Workers -> verify concurrency -> 10 Workers -> verify adaptive behavior`

not:

`design 100-Worker system -> implement everything -> discover the first identity bug at the end`

For product workflow:

`Google login -> verify`
`input materialization -> verify`
`one Job -> verify`
`Task Graph -> verify`
`one Worker render -> verify`
`output -> verify`
`payment -> verify`
`download -> verify`

Small batches do not mean losing architecture discipline. They mean validating architecture one bounded slice at a time.

---

# 9. Five Whys for CWS incidents

When a meaningful failure occurs, do not stop at the first visible error.

Example pattern:

`Why did the Job not render?`
-> Worker did not claim Task.

`Why did Worker not claim Task?`
-> Node Agent was offline.

`Why was Node Agent offline?`
-> Worker had no valid identity credential.

`Why was there no identity credential?`
-> normal enrollment still required manual per-machine ticket/ID state.

`Why did the architecture require that?`
-> legacy provisioning assumptions were not compatible with unattended fleet growth.

Result:

Root fix belongs in automatic provisioning, not in adding a retry button to the customer portal.

CWS Five Whys rule:

- use evidence at every step;
- stop when a controllable root/system cause is reached;
- do not force exactly five questions if the root cause is found earlier/later;
- do not use Five Whys to assign blame to a person;
- update `ENGINEERING_LEARNING_LOG.md` with the discovered rule.

---

# 10. Pivot or persevere

CWS should not pivot because of one bad day, and should not persevere indefinitely because of emotional attachment.

A pivot decision requires evidence that a core assumption is repeatedly failing.

Possible CWS pivots could concern:

- customer segment;
- supply/host acquisition model;
- pricing model;
- workflow boundary;
- supported render software/project type;
- partner deployment model.

Examples that are **not automatically pivots**:

- one Worker bug;
- one failed migration;
- one difficult Blender file;
- one customer asking for an unusual feature.

Pivot/persevere question:

> Is the underlying hypothesis wrong, or is the implementation of a still-valid hypothesis broken?

Do not rewrite CWS strategy to solve an implementation defect.

---

# 11. Dropbox lesson: demonstrate the magic

Dropbox faced a product whose underlying technical value was easier to understand by seeing it work than by hearing architecture explanations.

CWS has the same property.

After Golden Production E2E is genuinely repeatable, CWS should show a short real workflow:

`customer project -> CWS submission -> remote render starts -> customer keeps working -> progress/previews -> payment -> final output`

Marketing should emphasize:

- customer outcome;
- time saved;
- machine freed for other work;
- predictable workflow;
- simplicity.

Do not lead with scheduler internals, leases, generations, B2 capabilities, Node Agent architecture, or distributed-compute jargon.

Never present a mock render as production proof.

---

# 12. Dropbox lesson: feedback is a product system, not a suggestion box

Dropbox historically organized feature requests with Votebox, and later Community Ideas let users submit, vote, comment, and provide workflow context. Dropbox product teams used community feedback to understand not only requested features but how users currently worked around problems.

CWS adaptation:

`real Job -> outcome -> feedback -> runtime evidence -> classify -> reproduce -> prioritize -> fix -> verify -> close loop`

Future CWS feedback should ask:

- What were you trying to do?
- What happened?
- What did you expect?
- What workaround did you use?
- How much time/work did this cost?
- Can the issue be reproduced?

Where safe, automatically attach bounded evidence:

- Job ID;
- Job state timeline;
- Worker/Task IDs;
- Blender/runtime version;
- retry/failure count;
- render/finalization timing;
- payment/delivery state;
- bounded error codes.

The customer should not need to understand CWS internals to provide actionable evidence.

---

# 13. Customer feedback must not become feature voting by popularity alone

Votes and repeated requests are signals, not commands.

CWS must combine:

`customer pain + frequency + severity + target-segment relevance + runtime evidence + implementation cost + strategic fit`

A highly voted feature can still be rejected if it conflicts with CWS strategy/security/economics.

A low-frequency issue can be urgent if it causes:

- data loss;
- wrong render output;
- payment error;
- security exposure;
- repeated expensive compute waste.

Customer feedback informs product decisions; it does not replace Founder product judgment.

---

# 14. Reward useful learning, not comment volume

Dropbox used product-native value such as storage to encourage behaviors including referrals and engagement.

CWS equivalent should be considered as **CWS Credit**, not generic meaningless points.

Potential loyalty experiment already proposed by Founder:

`eligible Job value -> approximately 2% CWS Credit`

Example only:

`500,000 VND Job -> 10,000 VND equivalent CWS Credit`

This remains a post-MVP proposal until separately specified and approved for accounting/payment implementation.

Feedback reward should be separate from loyalty reward.

Do **not** pay feedback as a fixed percentage of Job value.

Possible future learning-reward hierarchy:

- spam/duplicate -> 0;
- useful usability observation -> small credit;
- verified reproducible defect -> larger credit;
- high-severity workflow defect -> higher credit;
- accepted high-value product insight -> policy-based credit;
- security vulnerability -> separate responsible-disclosure policy.

Core rule:

> Reward validated information value, not the number of comments submitted.

---

# 15. Anti-abuse for CWS Credit and feedback rewards

Any future reward system must include:

- authenticated customer identity;
- server-side eligibility;
- auditable credit ledger;
- duplicate report detection;
- one underlying issue not rewarded repeatedly;
- rate/velocity controls;
- validation/reproduction before material reward;
- no user-selected severity automatically determining payout;
- no incentive to intentionally fail Jobs;
- manual override audit trail;
- separation of product feedback, support, abuse and security reports.

Do not implement a deterministic public formula that makes feedback farming economically attractive.

---

# 16. Dropbox lesson: native currency can reinforce retention

Dropbox rewarded users with something directly useful inside Dropbox: storage.

CWS's natural equivalent is render value.

Future product shape:

`CWS Credit balance -> apply to later eligible Job`

Example:

`Job price 250,000 VND`
`CWS Credit 37,500 VND equivalent`
`remaining payable 212,500 VND`

Why this is potentially better than cash:

- directly connected to the product;
- understandable value;
- encourages another real Job;
- easier to test retention impact;
- avoids turning every product action into cash payout.

Accounting, expiry, transferability, tax/legal treatment, refunds and payment reconciliation require a separate approved spec before implementation.

---

# 17. Dropbox lesson: growth loops come after core value

Referral is an amplifier, not a substitute for product-market fit.

CWS order:

`one Worker proof`
-> `Golden Production E2E`
-> `repeated real successful Jobs`
-> `customer value/retention evidence`
-> `learning/credit experiments`
-> `referral/product-led growth experiments`

Do not spend meaningful engineering time on referrals while customers cannot yet reliably receive real output.

---

# 18. Product-led distribution for CWS

Dropbox naturally exposed the product through sharing.

CWS should search for similarly natural, privacy-safe distribution mechanisms later.

Possible future experiments:

- customer-controlled render review link;
- customer-controlled watermarked preview sharing;
- studio/client collaboration around completed output;
- referral after a successful Job;
- creator/host invitation flows where naturally relevant.

Never automatically publish private project/output data.

Sharing must be explicit, customer-controlled, narrowly authorized and revocable where appropriate.

---

# 19. Early customers are learning partners

The first CWS customers should not be selected only for revenue.

Strong early users are people who:

- have real render workloads;
- experience the pain CWS solves;
- can describe what failed/what helped;
- are willing to retry after fixes;
- represent target workflows;
- provide evidence from real Jobs.

Do not optimize the entire product around one loud customer.

Look for repeated patterns across real Jobs and users.

---

# 20. Experiment design template for CWS

Before a meaningful startup/product experiment, write:

## Hypothesis
What do we believe?

## Why it matters
What major risk/assumption does this test?

## Smallest safe experiment
What is the minimum real implementation/test that can disprove the hypothesis?

## Success evidence
What observable result counts as support?

## Failure evidence
What observable result disproves or weakens the hypothesis?

## Guardrails
What must not change/be bypassed?

## Time/cost budget
How much engineering/compute/support effort is acceptable before reevaluation?

## Decision after evidence
`PERSEVERE / FIX IMPLEMENTATION / PIVOT HYPOTHESIS / STOP`

Example:

### Hypothesis
A new partner PC can become a secure CWS Worker without per-machine Founder/Admin identity work.

### Smallest experiment
Provision exactly one physical PC through Spec 009.

### Success
Backend-generated canonical PCID/Worker ID + DPAPI credential + authenticated production heartbeat + ACTIVE_IDLE without manual ID/ticket input.

### Failure
Any unavoidable human per-machine identity/ticket step or unsafe shared secret remains necessary.

### Next action
Do not scale until the result is understood.

---

# 21. CWS learning backlog priority

A task should move upward when it answers a high-risk question.

Suggested priority logic:

1. safety/security/data integrity blocker;
2. blocker preventing real Golden E2E evidence;
3. assumption that could invalidate business economics/value;
4. repeated real-customer pain;
5. reliability/performance issue affecting successful Jobs;
6. retention/learning improvement;
7. growth/referral optimization;
8. polish with no measured bottleneck impact.

This prevents interesting but non-critical work from displacing the current constraint.

---

# 22. CWS must minimize waste, not thinking

Lean does not mean rushing into code.

CWS already requires grounding, diagnosis, Spec Kit and engineering harness gates because writing the wrong code quickly is waste.

Canonical combined process:

`UNDERSTAND`
-> `GROUND`
-> `identify assumption/bottleneck`
-> `DIAGNOSE`
-> `SPECIFY smallest experiment`
-> `BUILD`
-> `MEASURE real evidence`
-> `LEARN`
-> `SYNC learning`
-> `DECIDE next batch`

Documents, architecture review and tests are useful when they reduce uncertainty or prevent costly mistakes.

They become waste when they do not change a decision, reduce a risk, or produce usable evidence.

---

# 23. AI usage under Lean Startup

AI can make CWS produce code extremely quickly, which increases the risk of producing the wrong thing extremely quickly.

Therefore AI agents should optimize for learning throughput, not code throughput.

Before implementation, Codex/AI should answer:

1. What current assumption or bottleneck does this task test?
2. What is the smallest safe change?
3. What evidence will prove or disprove it?
4. Can we test one Worker/one Job/one path before scaling?
5. What Founder-controlled boundary must not be changed?
6. What result will cause us to stop rather than continue coding?

AI must not convert uncertain product hypotheses into silent architecture decisions.

---

# 24. Immediate CWS application

These Lean Startup + Dropbox principles are active immediately as operating guidance without adding new product scope:

- keep the one-Worker pilot as the current smallest real experiment;
- do not scale Worker count before one-Worker evidence passes;
- treat every failure as learning evidence and trace root cause;
- preserve `CODE VERIFIED` vs `PRODUCTION RUNTIME VERIFIED` distinctions;
- measure manual actions required per Worker and per Job;
- keep Customer workflow simple while infrastructure remains internal;
- capture timing/failure evidence during Golden E2E;
- use real target-user feedback once real Jobs exist;
- ask about customer problem/workaround rather than only requested feature;
- prioritize repeated real friction over speculative feature work;
- keep growth/reward/referral implementation behind product reliability gates.

---

# 25. Post-MVP application

After Golden Production E2E and initial real-customer usage are proven, create separate specs/experiments for:

- post-Job outcome feedback;
- Customer Learning Loop;
- customer-visible feedback status;
- CWS Credit ledger;
- loyalty reward experiment, including the Founder-proposed 2% model;
- validated-feedback reward policy;
- anti-abuse controls;
- retention measurement;
- customer-controlled sharing;
- referral experiments;
- product-led growth loops.

Do not implement them as one giant feature batch.

Each should have a hypothesis, success metric, guardrail and stop condition.

---

# 26. What CWS must not copy blindly

From Lean Startup, do not misinterpret:

- MVP = low quality;
- experiment = bypass security;
- speed = skip diagnosis;
- pivot = change direction whenever something breaks;
- metrics = collect everything;
- customer feedback = customers run the roadmap.

From Dropbox, do not assume:

- referral economics transfer directly to GPU rendering;
- freemium storage economics transfer to expensive compute;
- public/social sharing is appropriate for private render assets;
- a fixed reward percentage is automatically sustainable;
- every feature vote should be implemented;
- growth loops should precede reliability.

Canonical rule:

> Copy principles and learning mechanisms; validate CWS-specific economics and behavior independently.

---

# 27. Founder decision boundaries

This playbook does NOT by itself approve:

- CWS Credit production accounting;
- 2% loyalty reward activation;
- feedback bounty amounts;
- referral payouts;
- customer-output sharing defaults;
- pricing changes;
- payment/accounting changes;
- new infrastructure;
- new Worker/Scheduler architecture;
- changes to security/storage boundaries;
- replacing the current roadmap priority.

Those require the normal Founder approval + Spec Kit/Harness process.

---

# 28. Canonical CWS startup operating loop

CWS should operate as:

`Founder hypothesis`
-> `ground reality`
-> `choose one critical assumption`
-> `smallest safe MVP experiment`
-> `real user/runtime evidence`
-> `validated learning`
-> `Five Whys/root cause when needed`
-> `pivot or persevere`
-> `small next batch`
-> `repeat`

And once real customers exist:

`real Job`
-> `telemetry + outcome`
-> `customer feedback`
-> `validated learning`
-> `product improvement`
-> `measure before/after`
-> `close feedback loop`
-> `reward useful learning when policy allows`
-> `repeat faster`

This is the desired startup-learning engine for CWS.

---

# 29. Source trail

## The Lean Startup / Eric Ries

Primary/reference sources used for this adaptation:

- The Lean Startup official book overview: https://theleanstartup.com/book
- The Lean Startup methodology/principles: https://theleanstartup.com/principles
- The Lean Startup official site: https://theleanstartup.com/
- Eric Ries / Startup Lessons Learned body of work for Build–Measure–Learn, MVP, validated learning, innovation accounting, Five Whys, small batches and pivot/persevere concepts.

Key concepts intentionally paraphrased for CWS rather than reproduced from the copyrighted book.

## Dropbox

Representative sources used in the Dropbox study:

- Original Dropbox launch discussion: https://news.ycombinator.com/item?id=8863
- Y Combinator — Dropbox retrospectives: https://www.ycombinator.com/blog/congratsdropbox/
- Y Combinator — Employee #1 Dropbox: https://www.ycombinator.com/blog/employee-1-dropbox
- Dropbox Votebox announcement: https://blog.dropbox.com/topics/product/212
- Dropbox Community ideas/feedback: https://blog.dropbox.com/topics/our-community/share-an-idea-on-dropbox-community
- Dropbox Community feedback restoring a product behavior: https://blog.dropbox.com/topics/our-community/dropbox-community-user-feedback-revives-a-feature
- Dropbox referral material and public filings describing product-led/self-serve growth.

Dropbox is also listed by the official Lean Startup site as a Lean Startup case study.

---

# 30. One-sentence rule

> **CWS wins by learning faster from real Workers, real Jobs and real customers—not by writing the most code or launching the most features.**
