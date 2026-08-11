# 10 — Object Storage / B2 Delivery Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: Backblaze B2 canonical input/output, transfer reliability, locked output, narrow download/upload capabilities.

## Primary top-tier references

This category needs an authority exception: the most relevant official Backblaze SDK has far fewer stars than generic cloud-storage projects. CWS should prefer vendor correctness over raw popularity for B2-specific behavior.

### 1. `rclone/rclone` — ~57.4k stars
https://github.com/rclone/rclone

Highly mature cloud-transfer tool supporting Backblaze B2 and many providers.

CWS lessons:
- transfer systems need checks/retries/resume semantics and explicit provider behavior;
- object naming/path rules should be deterministic;
- transfer verification matters after network success;
- concurrency must be bounded by provider/network/memory limits rather than “more parallel is always faster.”

Do not adopt rclone as Worker architecture automatically; learn transfer/retry/integrity patterns.

### 2. `Backblaze/b2-sdk-python` — official Backblaze SDK
https://github.com/Backblaze/b2-sdk-python

Why it belongs despite low stars:
- vendor-owned source for the exact B2 platform CWS uses;
- active releases;
- security/advisory surface available on GitHub.

CWS should ground B2-specific semantics here before copying behavior from S3-like storage projects.

Lessons:
- understand authorization/application-key scope;
- multipart/large-file semantics must follow current B2 API/SDK contract;
- retries and upload/download integrity must be provider-aware;
- pin compatible SDK versions if/when CWS uses the SDK directly.

### 3. `supabase/storage` — ~1.3k stars
https://github.com/supabase/storage

Not a B2 replacement. Useful because it combines object storage, Postgres metadata, authorization and TUS/S3 concepts.

CWS lessons:
- object bytes and authorization metadata are separate layers;
- signed/narrow delivery capability is preferable to exposing master credentials;
- resumable upload and object authorization should converge on one canonical object identity;
- server-side policy remains the trust boundary.

## Historical high-star warning: `minio/minio`

`minio/minio` has ~61.2k stars but the repository was archived on 2026-04-25 and is explicitly no longer maintained.

CWS may study historical S3/object-store architecture concepts, but **must not treat MinIO's star count as an adoption recommendation**. Maintenance status outranks popularity.

## CWS storage security model

### Long-lived credentials

Remain server-side.

Never put B2 master/application credentials into:
- browser bundle;
- Worker Golden Image;
- general Worker config;
- prompts/logs;
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
- output collision across attempts;
- deleting/replacing immutable original input during optimization.

## Upload/output verification

A successful HTTP/SDK call is not full proof of correct object.

Where appropriate verify:
- expected object exists;
- expected size/content/hash/checksum semantics available;
- metadata/content type contract;
- ownership/Job association;
- final output is from authoritative attempt/generation;
- old/stale attempts cannot become canonical final object.

## Cleanup

Cleanup should be state-aware:
- never delete paid/unlocked final output by a generic temp cleanup;
- temp/intermediate data can expire only under approved retention policy;
- failed attempts must not delete authoritative output from a newer generation;
- cleanup is idempotent.

## What CWS should not import blindly

- a new object-storage service;
- S3 assumptions that differ from current B2 semantics;
- generic public buckets;
- permanent pre-signed URLs;
- shared fleet upload key;
- storage transfer concurrency without measurements;
- archived MinIO as new infrastructure.

## Activation

Load for B2 transfer, output locking, capabilities, large-object upload/download, integrity or cleanup work. Re-ground current Backblaze documentation/SDK before implementing provider-specific behavior because external APIs evolve.
