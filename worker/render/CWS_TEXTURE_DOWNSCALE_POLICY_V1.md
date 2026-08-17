# CWS Texture Downscale Policy V1

> **Status:** ACTIVE — Founder approved
> **Date:** 2026-08-17
> **Scope:** Track A and future CWS Blender render preparation for both Cycles and EEVEE
> **Canonical owner:** This file is the single source of truth for the automatic texture downscale policy.

## 1. Purpose

Reduce Blender render memory pressure and improve render reliability by limiting oversized customer textures on the derived render working copy while preserving the immutable customer original.

## 2. Binding Founder Rule

For CWS render preparation:

- Any texture whose width or height exceeds `2048` pixels must be reduced proportionally so its longest dimension becomes `2048` pixels.
- Textures already at or below `2048` pixels remain unchanged.
- Textures at `1024` pixels or below must never be upscaled.
- Aspect ratio must be preserved.
- The customer original `.blend` and source texture files are immutable and must never be overwritten by this optimization.

Canonical shorthand:

`>2K -> MAX 2K`

`<=2K -> KEEP`

`NO UPSCALING`

`CUSTOMER ORIGINAL IMMUTABLE`

## 3. Examples

- `8192 x 8192 -> 2048 x 2048`
- `4096 x 4096 -> 2048 x 2048`
- `4096 x 2048 -> 2048 x 1024`
- `8192 x 4096 -> 2048 x 1024`
- `2048 x 2048 -> unchanged`
- `1024 x 1024 -> unchanged`
- `512 x 512 -> unchanged`

## 4. Working-Copy Requirement

Texture optimization must happen only in CWS-controlled derived/cache assets used by a derived Blender working copy.

Required flow:

`immutable customer original -> derived working copy -> texture analysis -> derived <=2K textures -> relink working copy -> validate -> render`

Do not modify or overwrite canonical customer source assets.

## 5. Semantic Preservation

Downscaling must preserve, where supported:

- aspect ratio;
- color space intent;
- alpha;
- texture role;
- UV mapping;
- material/image links;
- channel/data meaning.

Special care is required for:

- normal maps;
- displacement/height maps;
- roughness/metallic/AO/masks;
- alpha maps;
- HDR/EXR;
- UDIM/tiled images;
- packed images.

Do not blindly apply color transforms to non-color/data textures.

If a format or texture layout cannot be reduced safely while preserving semantics, classify it as `SKIP_UNSAFE_OR_UNKNOWN` and report it rather than corrupting the asset.

## 6. Engine Scope

This policy applies to both:

- Cycles;
- EEVEE / Blender EEVEE Next.

Engine-specific optimizer logic remains governed by the existing Cycles and EEVEE knowledge files. This texture policy does not authorize unrelated render-setting changes.

## 7. Optimization Receipt

Every application should produce a compact receipt containing at least:

- total textures;
- textures `<=1K`;
- textures `>1K and <=2K`;
- textures `>2K`;
- textures reduced;
- textures unchanged;
- textures skipped because safe conversion was not proven;
- estimated texture memory before;
- estimated texture memory after;
- estimated savings;
- top changed texture dimensions before/after.

Do not dump hundreds of per-texture lines unless needed for diagnosis.

## 8. Validation Gates

Before render, verify:

1. customer original SHA remains unchanged;
2. source texture files remain unchanged;
3. derived working copy opens successfully;
4. materials resolve;
5. no missing texture links were introduced;
6. UDIM/material mappings remain valid where applicable;
7. Blender autoexec remains disabled;
8. no texture was upscaled.

## 9. Candidate-First Integration

Do not experiment directly in canonical `cws_worker_full.py`.

Use the approved rule:

`EXPERIMENT OFF CANONICAL -> PROVE -> PROMOTE MINIMAL DIFF`

New texture-processing implementation must first be proven through the candidate/shadow Worker path and reusable optimizer modules. Only the minimal verified implementation may later be promoted into the canonical Worker.

## 10. Non-Goals

This policy does **not** authorize automatic:

- geometry decimation;
- subdivision reduction;
- object deletion;
- render-resolution reduction;
- sample/bounce changes;
- denoising changes;
- lighting/material redesign;
- camera/color-management changes.

Those remain separate evidence-driven or Founder-controlled decisions.

## 11. Evidence Rule

A lower estimated memory footprint is useful evidence but is not render success.

Promotion still requires real runtime verification on representative customer work.
