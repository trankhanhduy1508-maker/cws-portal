# CWS .blend Early Validation Evidence — 2026-08-04

## GAP

Roadmap V2 required early .blend validation. Before this change, direct upload checked extension and size but a renamed non-Blender file could pass those checks.

## CODE

- backend/src/files/blend-validation.ts checks the native ASCII BLENDER signature only.
- backend/src/files/files.controller.ts rejects the file before B2StorageService.uploadFile() when the header is absent.
- The validator never opens, parses, or executes customer content.
- backend/src/files/blend-validation.spec.ts covers valid signature, empty/truncated input, and a renamed executable-like payload.

## LIMIT

This is an early structural check, not a complete Blender sandbox. Worker runtime must still keep autoexec disabled and verify addons, paths, render timeout, cleanup, and physical Fleet behavior.

## STATUS

Code/test scope: PASS by source/test inspection.
Runtime/B2/real Windows Blender verification: NOT YET VERIFIED.
No production data, credentials, or secrets changed.
