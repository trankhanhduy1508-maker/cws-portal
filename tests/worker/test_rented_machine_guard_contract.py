import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).parents[2]
WORKER = (ROOT / "cws_worker_full.py").read_text(encoding="utf-8")
GUARD = (ROOT / "worker" / "rented_machine_guard.py").read_text(encoding="utf-8")
POLICY = (ROOT / "worker" / "rented_machine_guard_policy.json").read_text(encoding="utf-8")
LAUNCHER = (ROOT / "cws_worker.bat").read_text(encoding="utf-8")


def _simulate_launcher_update(
    *,
    update_check_available=True,
    same_version=False,
    installed_bundle_valid=True,
    b2_auth_succeeds=True,
    bundle_download_succeeds=True,
    replacement_succeeds=True,
):
    """Model the BAT update decisions; this is not native Windows execution."""
    current_version = "1.0.0"
    latest_version = "1.0.0" if same_version else "2.0.0"
    installed_bundle_invalid = False

    if not update_check_available:
        return "launch", current_version
    if same_version and installed_bundle_valid:
        return "launch", current_version
    if same_version:
        installed_bundle_invalid = True
    if not b2_auth_succeeds or not bundle_download_succeeds:
        return ("retry" if installed_bundle_invalid else "launch"), current_version
    if replacement_succeeds:
        return "launch", latest_version
    return ("retry" if installed_bundle_invalid else "launch"), current_version


def test_guard_is_lease_scoped_and_releases_on_worker_exit():
    assert "RentedMachineGuard" in WORKER
    assert "machine_guard.acquire(" in WORKER
    assert 'machine_guard.set_state("RENDERING")' in WORKER
    assert 'machine_guard.set_state("FINALIZING")' in WORKER
    assert "machine_guard.release(" in WORKER
    assert "atexit.register(_release_active_machine_guard)" in WORKER
    assert "ACTIVE_MACHINE_GUARD = None" in WORKER


def test_guard_uses_supported_windows_controls_and_stale_recovery():
    assert "SetThreadExecutionState" in GUARD
    assert "ShutdownBlockReasonCreate" in GUARD
    assert "ShutdownBlockReasonDestroy" in GUARD
    assert "stale_lease_recovered" in GUARD
    assert "rented_machine_lease.json" in GUARD
    assert "taskkill" in GUARD
    assert "NEVER_TERMINATE" in GUARD
    assert "MÁY ĐANG ĐƯỢC CWS THUÊ" in GUARD


def test_guard_clears_existing_explicit_game_conflicts_before_monitoring():
    assert "_clear_configured_game_conflicts" in GUARD
    assert "_list_running_blocked_processes" in GUARD
    assert "game_conflict_detected" in GUARD
    assert "game_conflict_cleared" in GUARD
    assert "game_conflict_unresolved" in GUARD
    assert "render lease was released" in GUARD
    assert GUARD.index("_clear_configured_game_conflicts(timeout_seconds=12.0)") < GUARD.index(
        'threading.Thread(target=self._run, name="cws-rented-machine-guard"'
    )


def test_blocked_launch_shows_customer_rented_popup():
    assert "_show_customer_rented_notice" in GUARD
    assert "CUSTOMER_NOTICE_COOLDOWN_SEC" in GUARD
    assert "customer_rented_notice_shown" in GUARD
    assert "Máy đang được CWS thuê." in GUARD
    assert "Xin quý khách vui lòng chọn máy khác." in GUARD
    assert "Xin cảm ơn." in GUARD
    assert "CWS - Máy đang được thuê" in GUARD


def test_session_allowlist_blocks_new_interactive_apps_but_preserves_baseline():
    assert "session_allowlist" in POLICY
    assert "allowed_processes" in POLICY
    assert "_baseline_pids" in GUARD
    assert "_enforce_session_allowlist" in GUARD
    assert "_is_interactive_session" in GUARD
    assert "session_allowlist_blocked" in GUARD
    assert "session_process_terminated" in GUARD
    assert "pid in self._baseline_pids" in GUARD
    assert "name in allowed" in GUARD
    assert "explorer.exe" in POLICY
    assert "chrome.exe" in POLICY
    assert "powershell.exe" in POLICY
    assert "cmd.exe" in POLICY


def test_explicit_game_launchers_remain_fail_closed():
    assert "steam.exe" in POLICY
    assert "epicgameslauncher.exe" in POLICY
    assert "riotclientservices.exe" in POLICY
    assert "Explicit blacklist always wins" in GUARD


def test_policy_contains_no_credentials():
    assert "CWS_TELEGRAM" not in POLICY
    assert "SUPABASE" not in POLICY
    assert "B2" not in POLICY


def test_self_update_requires_one_versioned_hashed_worker_guard_bundle():
    assert "worker-releases/cws_worker_bundle.zip" in LAUNCHER
    assert "worker_bundle_manifest.json" in LAUNCHER
    assert "$manifest.version -ne '%LATEST_VERSION%'" in LAUNCHER
    assert "Get-FileHash -Algorithm SHA256" in LAUNCHER
    assert "$targets=$required+@('worker_bundle_manifest.json')" in LAUNCHER
    assert "thieu/sai Guard manifest; tai lai bundle dong bo" in LAUNCHER
    assert "cws_worker_full.py.new" not in LAUNCHER


def test_self_update_fails_closed_when_guard_companions_are_absent():
    assert 'if not exist "%~dp0worker\\rented_machine_guard.py"' in LAUNCHER
    assert 'if not exist "%~dp0worker\\rented_machine_guard_policy.json"' in LAUNCHER
    assert "khong khoi dong Worker khong day du Guard" in LAUNCHER


def test_launcher_tracks_known_invalid_bundle_separately_from_network_unknown():
    assert 'set "INSTALLED_BUNDLE_INVALID=0"' in LAUNCHER
    assert 'set "INSTALLED_BUNDLE_INVALID=1"' in LAUNCHER
    assert LAUNCHER.count(
        'if "%INSTALLED_BUNDLE_INVALID%"=="1" goto :update_retry'
    ) == 3


def test_update_check_unavailable_before_integrity_failure_may_launch_existing_worker():
    assert _simulate_launcher_update(update_check_available=False) == ("launch", "1.0.0")


def test_same_version_integrity_mismatch_and_b2_auth_failure_must_not_launch():
    assert _simulate_launcher_update(
        same_version=True, installed_bundle_valid=False, b2_auth_succeeds=False
    ) == ("retry", "1.0.0")


def test_same_version_integrity_mismatch_and_download_failure_must_not_launch():
    assert _simulate_launcher_update(
        same_version=True,
        installed_bundle_valid=False,
        bundle_download_succeeds=False,
    ) == ("retry", "1.0.0")


def test_same_version_integrity_mismatch_and_valid_repair_may_launch():
    assert _simulate_launcher_update(
        same_version=True, installed_bundle_valid=False
    ) == ("launch", "1.0.0")


def test_new_version_replacement_failure_does_not_advance_version():
    assert _simulate_launcher_update(replacement_succeeds=False) == ("launch", "1.0.0")


def test_synchronized_replacement_launches_and_advances_version_only_after_success():
    assert _simulate_launcher_update() == ("launch", "2.0.0")
    transaction_success = LAUNCHER.index("if not errorlevel 1 (")
    version_advance = LAUNCHER.index('echo %LATEST_VERSION% > "%VERSION_FILE%"')
    assert transaction_success < version_advance


def test_release_packager_emits_complete_integrity_manifest(tmp_path):
    output = tmp_path / "cws_worker_bundle.zip"
    result = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "package_track_a_worker.py"), "--output", str(output)],
        check=True,
        capture_output=True,
        text=True,
    )
    reported = json.loads(result.stdout)

    with zipfile.ZipFile(output) as archive:
        manifest = json.loads(archive.read("worker_bundle_manifest.json"))
        required = {
            "cws_worker_full.py",
            "worker/rented_machine_guard.py",
            "worker/rented_machine_guard_policy.json",
        }
        assert required <= set(archive.namelist())
        assert set(manifest["files"]) == required
        assert reported["version"] == manifest["version"]
        for relative in required:
            assert hashlib.sha256(archive.read(relative)).hexdigest() == manifest["files"][relative]
