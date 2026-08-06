# CWS Blender unoptimized Eevee stress test — 2026-08-06

## Scope

Added a bounded, intentionally unoptimized architectural interior/exterior
scene generator and local render runner:

- `tests/blender/create_unoptimized_eevee_stress_scene.py`
- `tests/blender/run_eevee_stress_render.py`
- `tests/blender/run_eevee_stress_render.ps1`
- `tests/blender/test_stress_scene_contract.py`

The scene uses Eevee/Eevee Next first, generated 1024x1024 textures, complex
procedural materials, dense separate meshes, bevel/subdivision stacks, 24
lights, volumetric world fog, depth of field, motion blur and bounded camera,
object and light animation. Limits are 1280x720, one frame for heavy-single or
48 frames for heavy-animation, max 240 objects and max 32 lights.

## Safety boundary

- Blender runs headless with `--disable-autoexec`.
- The runner has a 900-second default timeout and records logs/artifacts locally.
- It never contacts Supabase, B2, CWS backend or production.
- It does not change drivers, power state, overclocking, reboot or shutdown.
- Worker claim/failover is explicitly not reported by this local runner.

## Verification

| Check | Result |
|---|---|
| Python syntax/static contract | PASS: compile + 2/2 unittest |
| Blender scene generation | PASS: Blender 5.2.0 LTS |
| Heavy single-frame render | PASS: Eevee, 1280x720, 1 frame, 8.5 s, 1,177,237 bytes |
| Heavy animation render | PASS: Eevee, 1280x720, 48 frames, 153.281 s, 52,545,462 bytes |
| Physical Worker flow | NOT RUN |
| Failover with Worker A/B | NOT RUN; requires staging credentials and hosts |

The runner was first invoked with a missing executable and correctly returned
the explicit `BLOCKED` result. It was then run with Blender 5.2.0 LTS.

## Local benchmark evidence

| Field | Evidence |
|---|---|
| Hardware | Intel i3-12100F, NVIDIA GeForce RTX 2060 SUPER (8,192 MiB), 16 GiB RAM |
| Engine | `BLENDER_EEVEE` reported by Blender 5.2.0 |
| Scene | 572,308 bytes; SHA-256 `8AE22D0AA2A4131789C6D3E618266BD0ECFC4688D8363E4FA2C868CCD0F14CA0` |
| Heavy single | 1 frame, 1280x720, 8.5 s, PNG 1,177,237 bytes |
| Heavy animation | 48 frames, 1280x720, 153.281 s, PNG total 52,545,462 bytes |
| Peak CPU | Not captured; runner has no `psutil` in this environment |
| Peak GPU/VRAM | Not captured; `nvidia-smi` was available after the run but was not sampled by this benchmark |
| Visible output | Frame 1 and frame 24 inspected; both contain valid non-empty architecture output |

The first cold single-frame run took 23.37 s and emitted repeated Eevee
shadow-buffer-full warnings; the warmed rerun above is the benchmark value.
Warnings are intentionally retained as a useful stress signal, not treated as
a Worker failure.

No Worker flow or failover PASS is claimed. The local render runner writes
`benchmark.json` and render logs; those generated artifacts are kept out of Git.

## Commands

```powershell
python -m pytest tests/blender/test_stress_scene_contract.py
python tests/blender/run_eevee_stress_render.py `
  --blender C:\path\to\blender.exe `
  --profile heavy-single --generate --timeout-seconds 900
python tests/blender/run_eevee_stress_render.py `
  --blender C:\path\to\blender.exe `
  --profile heavy-animation --generate --timeout-seconds 900
```

Output is written below `tests/artifacts/eevee-stress/`, which is intentionally
ignored from source control. The generated `.blend` is reproducible from the
scene script and is not committed as a large binary.
