# Blender EEVEE Rendering Patterns for CWS

> Status: TASK-RELEVANT SPECIALIST REFERENCE
> Snapshot: 2026-08-12
> Scope: Blender EEVEE/EEVEE Next rendering, materials, animation, headless Worker execution, capability matching and runtime evidence.
> Activation: load only when the current CWS task involves EEVEE rendering, Blender engine detection, render-engine eligibility, EEVEE animation, or EEVEE-specific failure/performance behavior.

## 1. Why this note exists

CWS already has a general Blender/render-farm reference. EEVEE needs a narrower note because it is not simply “Cycles but faster.” It has different renderer semantics, GPU/runtime constraints, material/shader behavior and version compatibility concerns.

This is **reference knowledge, not permission to change the CWS workflow or install external code**.

Precedence remains:

`Founder decision -> DECISIONS.md -> active spec/workflow -> current CWS code/schema/runtime evidence -> tests -> this note`

## 2. Top GitHub references selected

“Top” here means the strongest high-signal GitHub repositories found in the current snapshot that are directly useful to the CWS EEVEE problem. Stars are a popularity signal, not a security guarantee, and counts change.

### 1. `blender/blender` — official Blender mirror — ~18.7k stars

Repository: https://github.com/blender/blender

Why it is primary:
- official Blender organization mirror;
- authoritative implementation of EEVEE, scene/render engine contracts and Blender command-line behavior;
- current source contains the EEVEE engine implementation under Blender's draw/render code;
- Blender's build configuration includes GPU render tests covering EEVEE-class rendering.

What CWS should learn:
- EEVEE behavior must be grounded in the exact supported Blender version, not remembered from old tutorials;
- render-engine identifiers and compatibility evolve across Blender versions;
- frame range, FPS, output settings, compositor state, color management and render engine are project facts that must be preserved;
- EEVEE is a GPU renderer with its own device/backend/driver failure modes;
- headless/background behavior must be tested on the exact Windows + Blender + GPU-driver production matrix CWS supports.

CWS rule:

> For EEVEE, Blender itself is the authoritative source. Community repositories may teach patterns, but they do not override current Blender behavior.

### 2. `ucupumar/ucupaint` — ~2.2k stars

Repository: https://github.com/ucupumar/ucupaint

Why relevant:
- mature Blender add-on specifically supporting materials/texturing used by both EEVEE and Cycles;
- useful evidence that real customer scenes can contain non-trivial node/material workflows intended to render across multiple Blender engines;
- active Blender extension ecosystem project rather than a toy sample.

What CWS should learn:
- do not “optimize” customer scenes by rewriting materials unless an approved, reversible compatibility rule exists;
- EEVEE/Cycles material similarity does not imply every engine effect is equivalent;
- missing textures, unsupported nodes, version migration and material compilation can be real render-failure causes;
- Worker preflight should observe and report compatibility problems instead of silently changing artistic output.

CWS rule:

> Preserve the customer's artistic scene. Optimization may reduce execution overhead, but must not silently change material/shader meaning.

### 3. `DeepMotionEditing/deep-motion-editing` — ~1.7k stars

Repository: https://github.com/DeepMotionEditing/deep-motion-editing

Why relevant:
- SIGGRAPH-related 3D character animation repository;
- includes Blender animation/rendering pipeline code;
- explicitly supports both EEVEE and Cycles in its rendering workflow;
- useful for understanding animation as a frame-producing pipeline rather than only still-image rendering.

What CWS should learn:
- EEVEE is especially relevant to animation because per-frame speed can change the optimal task/chunk strategy substantially;
- animation rendering still requires deterministic frame coverage, camera/material/light setup and output collection;
- engine choice is a project property and must not be changed by CWS merely to hit a deadline;
- old Blender-version examples are historical patterns only; current API/engine behavior must be re-grounded before implementation.

### Specialized studio supplement: `dillongoostudios/goo-engine` — ~1.3k stars

Repository: https://github.com/dillongoostudios/goo-engine

This is a custom Blender build from DillonGoo Studios with additional NPR-oriented features. It is below the three sources above by stars in this snapshot but is highly relevant as evidence that production studios can extend Blender/EEVEE behavior for stylized pipelines.

CWS should learn only the architectural lesson:
- real customer files may depend on renderer/version-specific behavior;
- custom Blender forks or unsupported engine modifications are a compatibility risk;
- CWS should **not** adopt or maintain a Blender fork unless a future Founder decision explicitly justifies that large operational cost.

## 3. EEVEE-specific CWS rules

### A. Detect engine; never silently switch engine

For every Blender Job, preflight should determine the actual render engine configured by the project.

CWS must not silently do:

`EEVEE -> Cycles`

or:

`Cycles -> EEVEE`

just to improve speed, compatibility or pricing.

A renderer switch changes artistic output and is a product decision, not a scheduler optimization.

### B. Treat EEVEE as a separate Worker capability class

Worker eligibility should eventually consider at least:
- supported Blender version;
- configured render engine;
- GPU/driver/backend compatibility;
- required scene features;
- available VRAM/resource headroom;
- whether the Worker has passed the relevant EEVEE smoke/render verification for that production image/version.

Do not model eligibility as only:

`GPU exists = renderable`

### C. Version-pin engine behavior

Do not hardcode old engine names or old tutorial assumptions across Blender versions.

Before implementing engine-specific code:
1. ground the exact production Blender version;
2. inspect the current Blender API/source for render-engine identifiers;
3. test the engine in background mode on the supported Worker image;
4. record the verified engine identifier/behavior in tests or compatibility code.

Historical repositories that say EEVEE cannot/should not run headless are not enough to prove current Blender behavior. Likewise, a current desktop render does not prove the production background Worker path.

### D. EEVEE speed does not remove Task Graph requirements

Even if EEVEE renders frames very quickly:
- every frame still belongs to exactly one authoritative Task coverage range;
- ranges must remain disjoint;
- retries/reassignment must preserve coverage;
- stale Worker completion must remain fenced;
- Worker count must never exceed useful runnable work.

Fast rendering makes duplicate/overlap bugs **more expensive at scale**, not less important.

### E. Adaptive scheduling should use real EEVEE runtime evidence

Do not assume a universal EEVEE speed multiplier.

Actual runtime can change with:
- resolution;
- samples/quality settings;
- geometry complexity;
- shadows/lights;
- transparency;
- volumetrics;
- compositor work;
- shader compilation;
- GPU/driver;
- scene caches/simulation dependencies.

Once real task durations exist for the actual customer project, those observations should dominate ETA/capacity projection.

### F. Chunk size may need different tuning than Cycles

If EEVEE frames are very fast, scheduling overhead can become a larger fraction of total time.

Therefore the future Adaptive Scheduler may need engine-aware chunk sizing, but only after evidence.

Do not prematurely hardcode:
- one frame per Task forever;
- ten frames per Task forever;
- identical chunk policy for EEVEE and Cycles.

Task coverage invariants stay fixed; chunk-size policy may evolve independently.

### G. Shader/material compilation is part of useful runtime evidence

First-task latency may include setup such as material/shader compilation or cache warm-up.

Do not blindly extrapolate one unusually slow first frame to every remaining frame.

Future runtime projection should distinguish, when evidence allows:
- one-time preparation/setup cost;
- recurring per-frame render cost;
- finalization/encode cost.

Do not add this complexity until measurement shows it is needed.

### H. EEVEE output still requires finalization correctness

Fast frame rendering does not mean the Job is complete.

For animation:

`render -> collect -> verify frame coverage -> assemble/encode if required -> verify final artifact`

The CWS internal 45-minute target still refers to the final deliverable, not merely the last EEVEE frame render.

## 4. Security and supply-chain boundaries

Do not clone/run/install these repositories merely because they are popular.

For CWS:
- `blender/blender` is an authoritative source/reference, not code to vendor into the portal;
- do not install Ucupaint on production Workers unless a real compatibility requirement is approved;
- do not import DeepMotionEditing code into Worker runtime;
- do not adopt Goo Engine/custom Blender forks automatically;
- customer `.blend` remains untrusted input;
- Python autoexec remains disabled for untrusted projects unless an explicitly approved sandboxed design replaces that boundary.

## 5. Tests CWS should eventually have for EEVEE

When EEVEE becomes part of an active implementation gate, useful deterministic/runtime tests include:

1. detect EEVEE project correctly;
2. preserve project render engine;
3. preserve non-1 frame ranges;
4. background render one known EEVEE fixture on the supported Blender version;
5. output expected frame number/path;
6. material/texture missing error is surfaced clearly;
7. unsupported GPU/driver/backend fails closed as Worker-ineligible or Task failure;
8. same Task fencing rules apply to EEVEE and Cycles;
9. EEVEE Task ranges remain gap-free and non-overlapping;
10. animation finalization waits for complete verified frame coverage;
11. engine-specific runtime telemetry is recorded without confusing setup time with heartbeat time;
12. no Worker reboot is used as a test requirement — reboot-dependent behavior stays `NOT VERIFIED / DEFERRED`.

## 6. What to reuse now vs later

### Useful now
- engine must be detected and preserved;
- frame/task ownership rules remain engine-independent;
- exact Blender version matters;
- EEVEE needs its own capability/compatibility evidence;
- real project runtime beats theoretical GPU estimates.

### Later, only when measured need appears
- engine-aware task chunk sizing;
- EEVEE-specific Worker eligibility matrix;
- shader/setup warm-up modeling;
- engine-specific performance baselines;
- more detailed EEVEE smoke fixtures.

### Not approved
- auto-convert Cycles jobs to EEVEE;
- custom Blender fork deployment;
- external EEVEE add-ons on Golden Image by default;
- speculative duplicate frames;
- UI controls that let customers select Worker hardware/count;
- replacing CWS PostgreSQL scheduler ownership with an external render manager.

## 7. AI/Codex activation rule

When working on EEVEE, read in this order:

1. `AGENTS.md`
2. `CWS_AI_ENGINEERING_HARNESS_V1.md`
3. `CURRENT_STATUS.md`
4. active CWS spec/decisions
5. `knowledge/github-patterns/01-blender-render-farm/README.md`
6. this file
7. current Worker/Blender code and tests

Then separate:

`CWS FACT` vs `EXTERNAL PATTERN` vs `HYPOTHESIS`

Do not code from this note alone.