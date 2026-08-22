# GOAL CONTRACT - BLENDER UE5 FAST FIDELITY

## Metadata

- `GOAL_ID: BLENDER_UE5_FAST_FIDELITY`
- `STATUS: ACTIVE`
- `GOAL_READY: YES`
- `FOUNDER_APPROVED: 2026-08-22`
- `LAST_INTENT_REVIEW: 2026-08-22`
- `DOMAIN: BLENDER_UE5_FIDELITY`
- `PROJECT_PRIORITY_CHANGE: NO`

This Goal Contract defines the currently approved experimental execution outcome. It does not replace Track A Blender/Cycles production rendering or silently reprioritize the project-level roadmap.

## 1. Founder Intent

Take the real Blender customer-style source scene and build an automatic direct Blender -> Unreal Engine 5 -> MP4 path that is dramatically faster than traditional Blender rendering while preserving the original visual intent closely enough to be commercially useful.

The Founder does not want a technical demonstration that merely imports assets or produces a video file. The result must look convincingly close to the Blender truth and must be produced through an automation path that could later become part of CWS.

## 2. Why This Matters

The business value is not "UE5 can render". The value is reducing customer waiting time from hours toward minutes without making the result visibly poor or requiring the customer/Founder to manually rebuild scenes in Unreal.

If this can be proven on a real Blender source with honest end-to-end timing and practical fidelity, it may become a useful CWS acceleration path. Until then it remains experimental secondary research.

## 3. Customer / Operator Story

Desired operator experience:

1. A real `.blend` project is supplied.
2. CWS analyzes/prepares/transfers what UE5 needs automatically.
3. The operator/customer is not required to manually click through Unreal import, material, camera, Sequencer or render setup when CMD/API automation can perform it.
4. UE5 renders the real animated scene.
5. The system produces a normal MP4 that can be opened and watched.
6. The result preserves the important visual identity of the original scene while completing within the time budget.

## 4. Desired End State

Current reference source:

`PhongNguRender6.blend`

Required production candidate:

- direct real `.blend` -> UE5 path;
- native 1920x1080 output path;
- H.264 MP4;
- 24 fps;
- 60 frames;
- approximately 2.5 seconds;
- correct temporal animation direction;
- correct camera/composition;
- character and scene visibly present;
- practical visual fidelity target approximately 90-95% versus Blender truth;
- one current machine;
- automated primarily through installed/native tools, UE command line, UE Python/commandlets/APIs or other evidence-backed automation rather than manual GUI operation.

## 5. Source of Truth

Visual truth is the original Blender source/render intent, not a previous UE5 approximation and not an interchange file merely importing successfully.

For current-runtime claims, current GitHub/runtime evidence wins over this document's historical progress context.

Relevant durable knowledge authority:

`knowledge/render/ue5/CWS_UE5_RENDER_KNOWLEDGE_V1.md`

Relevant evidence should be routed through the current `BLENDER_UE5_FIDELITY` route in `CWS_KNOWLEDGE_ROUTER.yaml`.

## 6. Success Conditions

All material conditions must pass:

- real source path is used;
- output is native/source-equivalent 1920x1080, not a 640x360 render enlarged to Full HD;
- 24 fps / 60 frames / ~2.5s are correct;
- H.264 MP4 opens and decodes correctly;
- animation is real and changes over time;
- camera and subject framing match intended Blender composition closely;
- important character geometry/proportions are correct enough for the practical fidelity target;
- hair/eyes/glasses/skin/clothing and other visually important elements are present/acceptable when they exist in the Blender truth;
- material/texture richness is acceptable;
- environment is present/acceptable;
- lighting/shadows/exposure/color mood are close enough to Blender truth for the practical fidelity target;
- true customer-scene-specific `.blend -> MP4` time is measured honestly;
- target true end-to-end time is approximately <=10 minutes;
- hard ceiling is <15 minutes for the approved experiment unless the Founder explicitly revises the budget.

## 7. Quality Bar

Target practical fidelity is approximately 90-95% versus the Blender truth, judged primarily by visible scene/subject fidelity rather than interchange completeness.

Representative visual gates should prioritize, when relevant:

- composition/camera;
- character proportions and silhouette;
- face/eyes;
- hair;
- glasses/transparency;
- clothing;
- geometry/modifiers;
- rig/animation;
- material/texture richness;
- environment;
- lighting/shadows;
- exposure/color mood;
- important fine detail.

Do not optimize AA/sharpness as a substitute for missing semantic content.

## 8. Speed / Cost / Resource Budget

- current machine only;
- target true end-to-end `.blend -> MP4`: <=10 minutes;
- hard ceiling: <15 minutes;
- customer-scene-specific analysis/export/preparation/import/build/setup/render/encode must be counted;
- reusable machine-level infrastructure such as DDC/shader caches may be prewarmed/reused when honest and operationally valid, but must be disclosed separately from customer-scene-specific work;
- MRQ speed is not the only metric. Do not hide slow preparation upstream.

## 9. Hard Boundaries

- no host shutdown/reboot/logoff/sleep/hibernate or indirect power-state transition;
- do not destroy or overwrite the customer/source original;
- do not expose secrets/customer files unnecessarily;
- do not silently replace canonical Track A Blender/Cycles production architecture;
- do not change material product/architecture/security/infrastructure boundaries without Founder approval;
- no fake PASS from code/test/import success when the visual/runtime goal has not passed.

## 10. Acceptable Trade-offs

The Founder prefers:

`FAST + CLEAR + PRACTICALLY CLOSE TO BLENDER`

over
`PERFECT CYCLES PARITY AT THE COST OF LOSING THE SPEED ADVANTAGE`.

Approximately 90-95% visual fidelity can be preferable to near-perfect parity if the latter pushes the workflow outside the time/value budget.

The AI may choose or pivot among evidence-backed interchange, baking, material reconstruction, camera/animation transfer, caching, LOD/Nanite policy and UE rendering strategies as ordinary technical implementation choices inside the approved boundary.

## 11. Unacceptable Shortcuts

The following do NOT satisfy this goal by themselves:

- importing the scene successfully;
- producing a UE project;
- creating a Sequencer;
- MRQ returning success;
- generating 60 black/transparent/frozen frames;
- producing any MP4 regardless of visual correctness;
- rendering 640x360 and upscaling it to claim native 1920x1080 fidelity;
- using a full high-quality Cycles beauty sequence as a hidden mandatory production dependency and then claiming UE5 produced the speed advantage;
- measuring only downstream UE render time while excluding expensive source-specific preparation;
- judging success from edge energy/file validity alone.

## 12. Non-goals

This goal does not require:

- 100% mathematical/pixel parity with Cycles;
- replacing Blender/Cycles Track A today;
- building a generalized production render farm around UE5 before this direct path is proven;
- adding Dify/Superpowers/another process framework merely to manage this task;
- solving unrelated CWS product/payment/scheduler/security roadmap work.

## 13. Known Good Evidence / Baselines

Preserve current evidence-backed fast baselines and successful direct-transfer discoveries when they remain valid under current runtime evidence.

Do not treat this Goal Contract as proof that any particular historical candidate remains current. Re-ground the latest evidence first.

Known durable lesson from current Founder session: the direct runtime must use the correct UE actor/camera lifecycle/binding model; an output-file count is not a visual fidelity gate.

## 14. Known Failed Solution Families

Do not repeat materially failed interchange/render approaches without a materially different implementation and a new falsifiable reason they should now work.

Historical families and exact evidence belong in the current UE5 knowledge/evidence reports, not duplicated here.

If 3 materially similar attempts fail:

`STOP -> RE-GROUND -> WIDEN RESEARCH -> RECLASSIFY -> PIVOT`

## 15. Current Unknowns

Current unknowns must be refreshed from latest evidence. Typical remaining research dimensions may include:

- best fidelity-preserving material/texture reconstruction path;
- hair/eyes/glass/skin handling;
- environment transfer/build cost;
- Blender AgX/OCIO -> UE exposure/color matching;
- best split between reusable cache/bootstrap work and source-specific processing;
- generalized robustness beyond the current source scene.

These remain `UNKNOWN` until current evidence proves otherwise.

## 16. Definition of Done

`GOAL_ACHIEVED` may be reported only when a final MP4 is produced from the real source through the approved direct UE5 path and is visually/runtime validated against this contract.

Minimum completion gate:

- 1920x1080 native path;
- H.264;
- 24 fps;
- 60 frames;
- ~2.5s;
- start/middle/end decode and visual checks pass;
- animation/camera/subject/environment materially correct;
- practical fidelity is approximately within the approved 90-95% target or the Founder explicitly accepts a measured lower result;
- true end-to-end timing is measured and within the approved budget or explicitly Founder-overridden;
- relevant gstack QA/ship verification is completed;
- durable root cause/benchmark/knowledge is synchronized to GitHub.

## 17. Founder Assumptions AI Must Challenge

AI must issue a material `FOUNDER CHECK` rather than blindly optimizing when evidence suggests any of these:

- chasing near-perfect visual parity is destroying the minutes-scale value proposition;
- a familiar technical route is being continued mainly because much time has already been invested;
- a new framework/tool is being added without solving the current bottleneck;
- render speed is being celebrated while source-specific preparation dominates total time;
- a visually weak result is being called successful because the technical pipeline completed;
- repeated tweaking is occurring without a falsifiable hypothesis or representative visual gate.

## 18. Evidence Required Before Completion

Required evidence level is real local runtime + visual validation of the final candidate.

At minimum record:

- source identity/path evidence;
- stage timings;
- frame/output metadata;
- start/middle/end decoded frame validation;
- temporal change/animation evidence;
- visual comparison against Blender truth;
- final MP4 location;
- remaining known gaps.

`CODE/TEST/IMPORT SUCCESS != FINAL RUNTIME/VISUAL SUCCESS`.

## 19. Founder Overrides

No override may waive hard safety/governance boundaries.

Record future material trade-off overrides here only after the Founder has seen the relevant `FOUNDER CHECK` and explicitly chooses the trade-off.
