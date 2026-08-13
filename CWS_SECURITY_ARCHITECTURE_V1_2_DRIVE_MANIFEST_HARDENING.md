# CWS Security Architecture V1.2 — Drive Manifest Hardening

> Status: Founder-approved security architecture extension.  
> Date: 2026-08-13.  
> Scope: Google Drive submissions containing multiple `.blend` files and related project assets.  
> Parent documents: `CWS_SECURITY_ARCHITECTURE_V1.md`, `CWS_SECURITY_ARCHITECTURE_V1_1_RENDER_FARM_HARDENED.md`.  
> Authority: latest Founder decisions, current runtime evidence, `DECISIONS.md`, canonical workflow, Spec Kit and CWS AI Engineering Harness remain authoritative.

## 1. Founder decision

CWS keeps both customer ingestion methods:

1. Google Drive link.
2. Direct upload.

Google Drive is a primary practical ingestion path and may contain multiple Blender project files and supporting assets. A shared Drive folder/link is **not** trusted merely because Google provides the transport or because one `.blend` file appears clean.

V1.2 adds a mandatory **Drive Manifest + Per-File Security Verdict** layer.

## 2. Canonical Drive security sequence

```text
Google Login
  -> approved Drive URL/provider validation
  -> server-side ownership binding
  -> enumerate Drive manifest
  -> classify every candidate/required file
  -> bounded quarantine download per file
  -> cryptographic hash + size + provenance
  -> signature/content/type validation
  -> malware verdict per file
  -> archive/resource checks where applicable
  -> Blender safety checks where applicable
  -> aggregate submission verdict
  -> CLEAN/SAFE only if every required file passes
  -> canonical B2 promotion
  -> ownership/integrity verification
  -> INPUT_SAFE
  -> exactly one customer-owned Job
```

The Worker must never depend on the original Google Drive link or Google credentials after canonicalization.

## 3. Drive manifest model

Before canonical B2 promotion, Backend should build an authoritative server-side manifest for the submission.

Each discovered file record should capture, where available and safe to retain:

- provider (`google_drive`);
- provider file/folder identifier;
- server-side customer/submission ownership reference;
- normalized relative path/name;
- claimed MIME/type;
- detected content type/signature;
- byte size;
- cryptographic digest after acquisition;
- role classification (`blend_candidate`, `archive`, `asset`, `unexpected`, etc.);
- required/optional policy status;
- quarantine location/reference;
- malware verdict;
- structural verdict;
- aggregate eligibility contribution;
- terminal reason when rejected/quarantined.

Manifest metadata is server-authoritative. Frontend cannot mark a file CLEAN, SAFE, required, irrelevant or `INPUT_SAFE`.

## 4. Per-file security verdict

Every required file receives its own security verdict.

Conceptual verdict states:

- `PENDING`
- `CLEAN`
- `SUSPICIOUS`
- `INFECTED`
- `SCAN_ERROR`
- `TIMEOUT`
- `TYPE_MISMATCH`
- `RESOURCE_LIMIT`
- `UNSUPPORTED`
- `REJECTED`

A folder-level or submission-level CLEAN state must never be inferred from a single CLEAN `.blend`.

Scanner unavailable/error/timeout/unknown remains fail-closed.

## 5. Aggregate submission verdict

V1.2 default policy:

> **Every required file must be CLEAN/SAFE before the submission can be promoted to canonical B2 and reach `INPUT_SAFE`.**

If any required file is infected, suspicious, malformed, unavailable, unsupported, ambiguous, scanner-error, timeout or resource-limit violating:

`submission -> fail closed -> no canonical B2 promotion -> no INPUT_SAFE -> no Job`.

CWS does not silently delete, repair, skip or replace suspicious customer files in order to keep rendering.

## 6. Multiple `.blend` files

A Drive submission may contain multiple `.blend` files.

V1.2 requirements:

- enumerate every `.blend` candidate;
- quarantine and scan every required `.blend`;
- do not assume the first filename alphabetically is the render entrypoint;
- require one deterministic render entrypoint before Job creation;
- entrypoint ambiguity fails closed;
- selected entrypoint remains tied to the verified manifest/hash, not a later mutable Drive lookup.

How the deterministic entrypoint is resolved may use current CWS product metadata/workflow if already defined. Any new customer-facing selection step changes workflow and requires Founder approval.

## 7. Dependency policy

V1.2 deliberately does **not** implement optimistic partial continuation.

Default:

`no proven dependency analysis -> one required-file failure -> whole submission fails closed`.

CWS must not decide that a suspicious file is "probably unused" and continue rendering without authoritative dependency evidence.

A future dependency-aware partial continuation system is a separate high-risk feature because Blender projects can reference linked libraries, textures, caches, scripts, archives and other assets indirectly. It requires its own spec/security review and Founder approval.

## 8. Unexpected executable/script/binary content

Drive folders can contain content unrelated to rendering.

Unexpected executable/script/binary types must be quarantined/rejected according to policy unless CWS explicitly supports and safely handles that type.

Examples requiring special caution include executable installers, command/shell scripts, DLL/native libraries, Python scripts/add-ons, shortcut/link artifacts or other active content.

This does not mean file extension alone is authoritative. Actual content/signature/type checks remain required.

Customer Python/add-on execution is not authorized by V1.2.

## 9. Archives inside Drive

`.zip` and `.rar` remain hostile containers.

For each archive:

1. acquire into quarantine with bounded transfer;
2. hash + malware scan raw archive;
3. inspect archive structure under strict bounds;
4. reject traversal/absolute/device/path-escape behavior;
5. enforce entry-count, nesting, declared/extracted-size, compression-ratio, timeout and temporary-disk limits;
6. extract only in bounded temporary workspace when policy permits;
7. treat extracted members as untrusted and apply required per-file checks;
8. do not promote the archive/project until required members pass.

RAR remains fail-closed where the chosen parser/tool cannot prove equivalent bounded structural protections.

## 10. Large Drive folders

Drive manifest enumeration must itself be bounded.

Controls should include configurable internal limits for:

- number of enumerated files;
- recursion depth;
- total declared bytes;
- per-file bytes;
- enumeration/download time;
- redirect/request count;
- temporary disk budget;
- concurrent downloads/scans.

These are internal safety controls. They must not silently become permanent public customer limits without Founder approval.

Prefer streaming acquisition into quarantine over whole-file application RAM buffering.

## 11. Google Drive trust boundary

Google Drive provides identity/storage/transport properties, not a malware trust verdict.

Backend must retain provider-specific protections:

- approved Google Drive URL forms only;
- provider/file ID parsing rather than arbitrary fetch URLs;
- SSRF-aware redirect/host validation;
- HTTPS only;
- bounded redirects/timeouts/bytes;
- private/link-local/loopback/metadata/control-plane destination denial;
- redirect target revalidation;
- server-side ownership/submission binding.

The system must not become a generic URL downloader.

## 12. Canonical B2 promotion contract

Canonical B2 is trusted-by-validation, not the first landing zone.

Promotion requires:

- complete authoritative manifest for all required files;
- per-file security verdicts complete;
- aggregate verdict CLEAN/SAFE;
- deterministic render entrypoint;
- integrity/hash evidence;
- server-side customer ownership.

Only after canonical object verification may Backend transition the submission to `INPUT_SAFE` and auto-create exactly one Job.

## 13. Direct-upload parity

Direct upload remains supported.

V1.2 must not make direct upload weaker than Drive ingestion. Where the same file types/security conditions apply, direct-upload files receive equivalent quarantine, hash, malware, structural and fail-closed treatment.

Drive-specific manifest enumeration does not require direct upload to imitate a folder provider, but both paths converge before canonical B2/`INPUT_SAFE`.

## 14. Audit evidence

For Drive submissions, sanitized audit evidence should support reconstruction of:

- submitted Drive provider/file/folder reference;
- authenticated customer owner;
- manifest enumeration result/count;
- every required file's hash/type/size;
- per-file malware/structural verdict;
- aggregate verdict;
- selected deterministic `.blend` entrypoint;
- reason for any fail-closed decision;
- canonical B2 verification;
- `INPUT_SAFE` transition;
- exactly-one Job result.

Do not store access tokens, customer secrets or unnecessary private content in logs.

## 15. Security tool roles

V1.2 does not change the V1.1 tool separation:

- pre-B2 malware: mature scanner such as ClamAV after runtime/capacity verification;
- Windows Worker endpoint: Microsoft Defender/approved endpoint protection;
- dependency/code scanning: existing Trivy/Semgrep direction;
- archive safety: bounded proven parser/tool;
- Blender active-content risk: untrusted Python autoexec OFF;
- storage access: Backend-issued narrow task/object-scoped capability.

No single tool replaces the other layers.

## 16. Implementation boundaries

V1.2 does not itself authorize:

- a new B2 bucket;
- a new Render service;
- a new database/project;
- Redis/NATS/Kafka/RabbitMQ;
- a public VirusTotal-style service;
- customer Python/add-on execution;
- dependency-aware partial continuation;
- a new customer confirmation step after validation;
- a public upload-size reduction.

If additive schema support is required for manifest/per-file verdict persistence, it must follow Spec Kit, production-schema preflight, migration review and separate Founder approval before production application.

## 17. Minimum implementation slice

The smallest safe implementation should provide:

1. server-side Drive manifest persistence/model;
2. immutable per-file identity/hash evidence;
3. per-file security verdict persistence;
4. deterministic `.blend` entrypoint handling;
5. aggregate CLEAN/SAFE gate;
6. canonical B2 promotion blocked until aggregate CLEAN/SAFE;
7. `INPUT_SAFE` blocked until canonical verification;
8. exactly-one Job unchanged/idempotent;
9. negative tests for infected/suspicious/unknown/scanner-failure/type-mismatch/multi-blend ambiguity/unexpected executable/archive resource violations;
10. no new infrastructure.

## 18. V1.2 success criterion

V1.2 is implemented only when a real authenticated Drive submission containing multiple project files can be enumerated into an authoritative manifest, every required file receives a validated security verdict, any unsafe/unknown required file blocks the whole submission, one deterministic `.blend` entrypoint is established, only aggregate CLEAN/SAFE content reaches canonical B2/`INPUT_SAFE`, and exactly one Job is created — without manual Founder/Admin approval and without the Worker accessing Google Drive directly.
