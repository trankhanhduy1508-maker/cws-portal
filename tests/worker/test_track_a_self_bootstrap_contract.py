from pathlib import Path


ROOT = Path(__file__).parents[2]
LAUNCHER = (ROOT / "cws_worker.bat").read_text(encoding="utf-8")
WORKER = (ROOT / "cws_worker_full.py").read_text(encoding="utf-8")


def test_launcher_uses_pinned_official_python_bootstrap():
    assert "https://www.python.org/ftp/python/%PYTHON_VERSION%/" in LAUNCHER
    assert "PYTHON_ZIP_SHA256=" in LAUNCHER
    assert "GETPIP_SHA256=" in LAUNCHER
    assert "Get-FileHash" in LAUNCHER
    assert '"%PYTHON_EXE%" --version' in LAUNCHER
    assert '"%PYTHON_EXE%" "%PYTHON_DIR%\\get-pip.py"' in LAUNCHER
    assert "winget" not in LAUNCHER.lower()


def test_worker_package_bootstrap_is_bounded_and_reuses_present_packages():
    assert '"requests", "requests>=2.31,<3"' in WORKER
    assert '"boto3", "boto3>=1.35,<2"' in WORKER
    assert '"PIL", "Pillow>=10,<13"' in WORKER
    assert '"--only-binary=:all:"' in WORKER
    assert '"https://pypi.org/simple"' in WORKER
    assert "for _import_name, _pip_spec in REQUIRED_PYTHON_PACKAGES" in WORKER


def test_worker_blender_bootstrap_is_official_cached_and_archive_safe():
    assert "https://download.blender.org/release/" in WORKER
    assert "if BLENDER_EXE.exists():" in WORKER
    assert "zipfile.is_zipfile(zip_path)" in WORKER
    assert "extractall(staging_dir)" in WORKER
    assert "blender.exe" in WORKER
    assert "2 * 1024 * 1024 * 1024" in WORKER
    assert ".." in WORKER
