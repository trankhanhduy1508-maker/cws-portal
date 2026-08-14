from pathlib import Path


ROOT = Path(__file__).parents[2]
LAUNCHER = (ROOT / "cws_worker.bat").read_text(encoding="utf-8")
WORKER = (ROOT / "cws_worker_full.py").read_text(encoding="utf-8")


def test_bootstrap_only_is_available_from_normal_entrypoint():
    assert '"%~1"=="--bootstrap-only"' in LAUNCHER
    assert ":bootstrap_only" in LAUNCHER
    assert 'cws_worker_full.py" --bootstrap-only' in LAUNCHER
    assert "Khong chay Worker, Supabase, B2" in LAUNCHER


def test_worker_bootstrap_only_skips_production_configuration_gate():
    assert "sys.path.insert(0, _script_dir)" in WORKER
    assert 'BOOTSTRAP_ONLY = "--bootstrap-only" in sys.argv' in WORKER
    assert "if not BOOTSTRAP_ONLY and not all" in WORKER
    assert 'if BOOTSTRAP_ONLY:' in WORKER
    assert 'raise SystemExit(0)' in WORKER


def test_drive_download_fails_clearly_on_authenticated_signin_redirect():
    assert '"accounts.google.com" in response.url' in WORKER
    assert "authenticated download session" in WORKER
