# 04 — Large File Ingestion / Resumable Upload Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: `.blend/.zip/.rar`, 100GB–TB-class upload goals, interruption recovery, Google Drive materialization.

## Primary top-tier sources

### 1. `transloadit/uppy` — ~30.8k stars
https://github.com/transloadit/uppy

A mature modular browser file uploader with resumable-upload ecosystem support and a security policy.

CWS lessons:
- upload UX must model pause/resume/retry/error/progress explicitly;
- large files should survive browser/network interruption rather than force restart from byte zero;
- provider ingestion and local file upload are different source adapters that should converge into one canonical stored input;
- upload state belongs to a durable resumable protocol/session, not only React component memory;
- accessibility and error recovery are part of the uploader contract.

Do not adopt Uppy automatically. CWS currently has an existing upload flow; adoption requires grounding actual bottleneck and compatibility.

### 2. `tus/tusd` — ~3.8k stars
https://github.com/tus/tusd

Reference server implementation of the tus resumable-upload protocol.

CWS lessons:
- resumability is a protocol property;
- arbitrary-size uploads need durable offset/state;
- backend/object-storage adapter can be separated from the resumable protocol;
- retry must continue from confirmed offset, not infer progress from UI;
- server must validate upload metadata/size/auth independently of browser claims.

### 3. `tus/tus-js-client` — ~2.6k stars
https://github.com/tus/tus-js-client

Pure JavaScript tus client for browser/Node/React Native.

CWS lessons:
- discover and resume previous uploads;
- explicit retry delays/backoff;
- interruption should not invalidate already-confirmed bytes;
- chunk sizing is a tradeoff: too small increases request overhead; too large can worsen memory/proxy/retry behavior;
- do not invent one universal chunk size without measuring the actual Vercel/backend/B2 path.

## CWS canonical ingestion principle

Regardless of source:

`Customer source -> authenticated ingestion -> canonical B2 materialization -> content/signature/resource validation -> ownership -> INPUT_READY`

Google Drive is an **ingestion source**, not the canonical long-term Worker source. Workers should not need customer Drive credentials.

## Security rules for large uploads

- extension is not sufficient validation;
- enforce allowed type `.blend/.zip/.rar` plus signature/content checks;
- size/resource limits are server-side;
- archive extraction occurs only in bounded job sandbox;
- reject path traversal and sandbox escape;
- enforce decompression/resource limits against archive bombs;
- select the target `.blend` deterministically when archives contain multiple candidates;
- original input is immutable;
- auth/ownership are verified by Backend, not trusted from frontend metadata;
- failed partial uploads must not become runnable Jobs.

## Resumability state machine concept

Useful states:

`CREATED -> UPLOADING -> PAUSED/INTERRUPTED -> RESUMING -> MATERIALIZED -> VALIDATING -> INPUT_READY`

Failure must distinguish:
- customer input invalid;
- network interruption/retryable;
- provider access denied;
- storage/backend failure;
- quota/size limit;
- integrity mismatch.

## Metrics worth collecting before optimization

- bytes total;
- bytes confirmed;
- average upload throughput;
- retry count;
- interrupted/resumed sessions;
- time-to-materialize;
- validation duration;
- Drive resolve/materialize duration;
- failure reason distribution.

Without these measurements, tuning chunk size is guesswork.

## What CWS should not import blindly

- a second storage system;
- direct browser access to long-lived B2 master credentials;
- provider-specific credentials copied to Workers;
- giant in-memory buffers for large files;
- trusting client-reported offset/size without server confirmation;
- “resume” implemented only by retrying the entire file.

## Activation

Load this note when the current bottleneck is upload, resumability, Drive ingestion, B2 materialization or archive validation. Do not let upload-library research change the current Customer workflow without Founder approval.
