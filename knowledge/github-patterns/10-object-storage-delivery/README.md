# 10 — Object Storage / B2 Delivery Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: Backblaze B2 canonical input/output, transfer reliability, locked output, narrow download/upload capabilities.

## Source-selection note

This category needs an authority exception: B2's official repositories have far fewer stars than generic cloud-storage projects. For provider-specific behavior, **Backblaze authority outranks raw star count**.

CWS currently uses the AWS S3 SDK in the NestJS backend for the B2/S3-compatible path. The repositories below are therefore references for provider semantics, transfer reliability and security; they are **not permission to replace the current SDK**.

## Primary top-tier references

### 1. `rclone/rclone` — ~57.4k stars
https://github.com/rclone/rclone

Highly mature cloud-transfer tool supporting Backblaze B2 and many providers.

CWS lessons:
- transfer systems need explicit retries, integrity checks and provider-aware behavior;
- object naming/path rules should be deterministic;
- verification matters after a network/API call succeeds;
- concurrency must be bounded by provider/network/memory limits rather than “more parallel is always faster”;
- resumability/retry should preserve object identity instead of creating ambiguous duplicate outputs.

Do not adopt rclone as Worker architecture automatically; learn transfer/retry/integrity patterns.

### 2. `Backblaze/B2_Command_Line_Tool` — official Backblaze CLI — ~620+ stars
https://github.com/Backblaze/B2_Command_Line_Tool

Official CLI exposing B2 capabilities.

Why it is useful to CWS even though the backend does not use this CLI:
- provider-owned examples of B2 operations and failure handling;
- active release/security surface;
- release artifacts publish SHA-256 hashes;
- recent releases explicitly hardened unsafe remote filename handling;
- CLI release notes expose compatibility and SDK changes that can reveal provider/runtime behavior worth re-grounding.

CWS lessons:
- remote object names are untrusted input and need path/filename validation;
- downloadable binaries/tools should be provenance/hash verified before any adoption;
- provider behavior changes over time, so B2-specific code must be grounded against current official sources.

### 3. `Backblaze/b2-sdk-python` — official Backblaze SDK — ~210 stars
https://github.com/Backblaze/b2-sdk-python

Vendor-owned Python library for B2.

CWS should ground B2-specific semantics here before copying assumptions from generic S3 projects.

Lessons:
- application-key scope and authorization semantics matter;
- multipart/large-file behavior and retry rules are provider-specific;
- timeout/429/retry behavior needs explicit handling and tests;
- path/filename safety is part of storage security;
- SDK/runtime support changes, so versions must be pinned/verified if ever adopted directly.

## Supplemental architecture reference

### `supabase/storage` — ~1.3k stars
https://github.com/supabase/storage

Not a B2 replacement. Useful because it combines object storage, Postgres metadata, authorization and TUS/S3 concepts.

CWS lessons:
- object bytes and authorization metadata are separate layers;
- signed/narrow delivery capability is preferable to exposing master credentials;
- resumable upload and object authorization should converge on one canonical object identity;
- server-side policy remains the trust boundary.

## Historical high-star warning: `minio/minio`

`minio/minio` has a very high historical star count but the repository was archived in 2026 and is no longer maintained.

CWS may study historical S3/object-store architecture concepts, but **must not treat MinIO's popularity as an adoption recommendation**. Maintenance status outranks popularity.

## CWS storage security model

### Long-lived credentials

Remain server-side.

Never put B2 master/application credentials into:
- browser bundle;
- Worker Golden Image;
- general Worker config;
- prompts/logs/screenshots;
- public repo.

### Worker capabilities

Worker should receive only bounded capability for the current fenced assignment, such as exact object GET/PUT authority with limited lifetime/scope where current architecture supports it.

A stale Worker must not retain authority to publish arbitrary output after reassignment.

### Customer delivery

Canonical product order remains:

`render/finalize -> validate -> full output stored LOCKED -> preview/price/payment -> exact SePay verification -> PAID -> authorized download`

The existence of a B2 object is not itself permission for public download.

## Object naming/ownership rules

Prefer deterministic namespacing tied to durable identifiers, conceptually:

`customer/job/input/...`
`customer/job/task-or-attempt/output/...`
`customer/job/final/...`

Exact current CWS paths must be grounded before changes.

Avoid:
- trusting customer filename as storage authority;
- path traversal-like user-controlled object prefixes;
- unsafe remote filenames;
- output collision across attempts;
- deleting/replacing immutable original input during optimization.

## Transfer/retry rule

A transfer retry must preserve the authority model.

Conceptually:

`authoritative Job/Task/generation -> deterministic object target -> bounded transfer attempt -> provider-aware retry -> integrity verification -> canonical commit`

Never allow a retry from a stale generation to overwrite a newer authoritative output.

Provider throttling, timeout and transient-network errors should be classified separately from permanent authorization/not-found/invalid-object errors where current B2/S3 API semantics allow it.

## Upload/output verification

A successful HTTP/SDK call is not full proof of correct object.

Where appropriate verify:
- expected object exists;
- expected size/content/hash/checksum semantics available;
- metadata/content type contract;
- ownership/Job association;
- final output is from authoritative attempt/generation;
- old/stale attempts cannot become canonical final object.

## Supply-chain rule for storage tooling

If CWS ever adopts an external B2 binary/CLI/SDK:

`official source -> current release/advisory -> exact version -> checksum/signature/provenance where available -> dependency review -> bounded test -> CWS integration tests`

Do not execute installer snippets simply because the repository is official or popular.

## Cleanup

Cleanup should be state-aware:
- never delete paid/unlocked final output by a generic temp cleanup;
- temp/intermediate data can expire only under approved retention policy;
- failed attempts must not delete authoritative output from a newer generation;
- cleanup is idempotent.

## Codex / GPT reading path

For B2 work:
1. ground current CWS backend/Worker storage code and object paths;
2. remember current CWS uses AWS S3 SDK/B2-compatible integration unless current code proves otherwise;
3. read official Backblaze CLI/SDK sources for provider-specific semantics;
4. use rclone for mature transfer/retry/integrity patterns;
5. use Supabase Storage only for authorization/object-metadata architecture comparison;
6. verify against current B2 behavior and CWS tests before changing production code.

## What CWS should not import blindly

- a new object-storage service;
- replacing the current AWS S3 SDK path without a verified reason and approved change;
- S3 assumptions that differ from current B2 semantics;
- generic public buckets;
- permanent pre-signed URLs;
- shared fleet upload key;
- storage transfer concurrency without measurements;
- rclone/Backblaze CLI as an automatic Worker dependency;
- archived MinIO as new infrastructure.

## Activation

Load for B2 transfer, output locking, capabilities, large-object upload/download, integrity or cleanup work. Re-ground current Backblaze source/docs before implementing provider-specific behavior because APIs, SDKs and runtime support evolve.
