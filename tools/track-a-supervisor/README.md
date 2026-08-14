# Track A Supervisor V1

This is the local-only intake manifest slice. It does not call Supabase,
Backend, B2, Blender, or the Worker.

Double-click `CWS_TRACK_A_SUPERVISOR.bat` for the prompt menu. The machine-local
SQLite database is stored at:

`%LOCALAPPDATA%\CWS\track-a-supervisor\jobs.sqlite3`

Direct commands, when Python 3 is available:

```powershell
python track_a_supervisor.py add
python track_a_supervisor.py list
python track_a_supervisor.py show CUSTOMER-A-001
python track_a_supervisor.py edit CUSTOMER-A-001
python track_a_supervisor.py delete CUSTOMER-A-001
```

`READY_TO_SUBMIT` means only that the local manifest is structurally valid. It
does not mean `INPUT_SAFE`, submitted, rendered, uploaded, paid, or delivered.
