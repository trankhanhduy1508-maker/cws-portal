# CWS Generic Worker Fencing and Memory Hardening - 2026-08-06

## Scope

The generic Worker Engine and its checkpoint side-effect boundary were reviewed for the MVP render attempt path. No production endpoint, credential, migration, or physical Worker was used.

## Fixed

1. `FilesystemCheckpointStore.put()` no longer calls `Path.read_bytes()` for a render output. It copies to a temporary file in bounded 1 MiB chunks, flushes/fsyncs, then atomically replaces the destination.
2. Temporary output and metadata files are removed if an interrupted write fails.
3. `WorkerEngine.run()` calls the attempt guard immediately before checkpoint storage. A stale/fenced attempt can therefore be rejected before it performs the output side effect; the existing post-write verification guard remains in place.

## Evidence

- Worker offline suite: **49/49 PASS**.
- Regression test: `test_lease_guard_is_checked_before_checkpoint_upload` proves a fenced attempt cannot reach checkpoint storage.
- This does not prove staging or production capacity, B2 credentials, or physical Worker failover. Those remain runtime gates.
