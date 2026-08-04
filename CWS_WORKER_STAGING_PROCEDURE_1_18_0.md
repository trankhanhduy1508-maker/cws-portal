# CWS Worker 1.18.0 — Windows staging procedure

Run only on one isolated staging Windows host. Never use production task/B2 prefix.

1. Create PackageRoot `C:\CWS\WorkerPackage-1.18.0` and DataRoot `C:\CWS\WorkerData`.
2. Copy cws_worker.py, cws_worker_runtime.py, worker.bat and
   worker-artifact-manifest.json. Set CWS_DIR=DataRoot and optionally
   CWS_PYTHON_DIR=DataRoot\PythonEmbed.
3. Provision staging-only secrets outside the repo.
4. Run:
   `python cws_worker.py --verify-manifest`
   `python cws_worker.py --preflight --verify-manifest`
5. Run real Blender with a harmless Owner-created scene:
   `blender.exe --background safe_scene.blend --disable-autoexec --python-exit-code 1 --render-output C:\CWS\Staging\render\frame_#### --render-frame 1`
   Verify exit 0, frame_0001.png exists and opens.
6. Create a staging task with 1–2 frames. Verify explicit --disable-autoexec,
   B2 sandbox checkpoint/object checksum, complete after upload, and cleanup of
   work\output_task_<id>.
7. Set CWS_FRAME_TIMEOUT_SEC=60 on staging only; use a deliberately slow test
   scene and verify timeout -> fail/requeue without an orphan Blender process.
8. Stop staging Worker after one checkpoint; restart it and verify B2 recovery
   skips the existing frame.
9. Run isolation script plan-only. Apply ACL only after checking identity/path:
   CWS_WORKER_ISOLATION_SETUP.ps1 -PackageRoot ... -DataRoot ... -WorkerIdentity ...
   -Apply -ConfirmPhrase 'APPLY CWS WORKER ACL'
10. Verify service identity, ACL, Defender, outbound firewall policy and a
    two-worker same-task/failover test. Do not mark production PASS from static
    tests alone.

OWNER TEST STEP: return manifest, Blender, B2 checksum, cleanup, timeout/retry,
ACL/Defender and two-worker evidence.
