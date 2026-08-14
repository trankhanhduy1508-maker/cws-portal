from pathlib import Path


ROOT = Path(__file__).parents[2]
WORKER = (ROOT / "cws_worker_full.py").read_text(encoding="utf-8")
GUARD = (ROOT / "worker" / "rented_machine_guard.py").read_text(encoding="utf-8")
POLICY = (ROOT / "worker" / "rented_machine_guard_policy.json").read_text(encoding="utf-8")


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
