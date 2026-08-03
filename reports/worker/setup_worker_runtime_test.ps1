# CWS Worker - Chuan bi + Verify runtime TEST (Python + Blender) (2026-08-03)
#
# MUC DICH: dung tren may DEV/TEST (khong phai may Fleet vat ly) de chuan
# bi mot moi truong Python + Blender portable Y HET cach cws_worker.bat /
# cws_worker_full.py tu bootstrap tren may Worker that, roi verify cac
# thanh phan runtime co hoat dong khong - PHUC VU kiem thu code, KHONG
# thay the may Fleet that.
#
# NGUYEN TAC AN TOAN (yeu cau ro rang khi tao script nay):
#   - Version Python/Blender KHONG hardcode o day - doc TRUC TIEP tu Source
#     of Truth duy nhat trong repo (cws_worker.bat dong PYTHON_VERSION,
#     cws_worker_full.py dong BLENDER_VERSION) de khong bao gio lech nhau.
#   - Dung thu muc rieng ($TestDir, mac dinh C:\CWS_Worker_Test), KHONG
#     dung G:\CWS_Render - do la duong dan CUA FLEET THAT (doi tac anh
#     Thong), dung nham co the gay nham lan voi may Fleet dang hoat dong.
#   - Script CHI import cws_worker_full.py va goi cac ham AN TOAN (local-
#     only nhu get_worker_id(), hoac read-only nhu check_for_newer_version()
#     - GET khong RPC). TUYET DOI KHONG goi worker_loop()/claim_task()/
#     claim_next_generic_task() - cac ham nay se CLAIM TASK THAT tren
#     Supabase production, anh huong Fleet dang hoat dong (job that cua
#     khach/Owner). Neu can test render 1 frame that, PHAI la quyet dinh
#     rieng, co xac nhan truoc, KHONG nam trong script chuan bi runtime nay.
#   - Khong set CWS_B2_KEY_ID/CWS_B2_APP_KEY o day - KHONG hardcode/commit
#     secret. Worker se tu in canh bao B2 (hanh vi da thiet ke san, xem
#     cws_worker_full.py dong ~90-101) - dung nhu that tren may chua co B2.
#
# IDEMPOTENT: chay lai bao nhieu lan cung duoc - buoc nao da xong (Python/
# Blender da co san) se duoc bo qua, chi verify lai.
#
# Cach chay:  .\setup_worker_runtime_test.ps1  [-TestDir "C:\CWS_Worker_Test"]

param(
    [string]$TestDir = "C:\CWS_Worker_Test"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Invoke-WebRequest cham hang chuc lan neu ve thanh progress bar tren PS 5.1

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$batPath = Join-Path $RepoRoot "cws_worker.bat"
$pyPath = Join-Path $RepoRoot "cws_worker_full.py"

Write-Host "=== CWS Worker - Runtime test setup ===" -ForegroundColor Cyan
Write-Host "RepoRoot: $RepoRoot"
Write-Host "TestDir : $TestDir (KHONG phai duong dan Fleet that)"

if (!(Test-Path $batPath)) { throw "Khong tim thay $batPath - dang chay sai thu muc repo?" }
if (!(Test-Path $pyPath)) { throw "Khong tim thay $pyPath - dang chay sai thu muc repo?" }

# ---------------------------------------------------------------------
# Buoc 0: Doc version tu Source of Truth trong code - KHONG doan/hardcode
# ---------------------------------------------------------------------
$batContent = Get-Content $batPath -Raw
if ($batContent -notmatch 'set "PYTHON_VERSION=([\d\.]+)"') {
    throw "Khong doc duoc PYTHON_VERSION tu cws_worker.bat - kiem tra lai file co bi sua cau truc khong."
}
$pythonVersion = $Matches[1]

$pyContent = Get-Content $pyPath -Raw
if ($pyContent -notmatch 'BLENDER_VERSION = "([\d\.]+)"') {
    throw "Khong doc duoc BLENDER_VERSION tu cws_worker_full.py - kiem tra lai file co bi sua cau truc khong."
}
$blenderVersion = $Matches[1]
$blenderSeries = ($blenderVersion -split '\.')[0..1] -join '.'

$requiredPackages = [regex]::Matches($pyContent, 'ensure_package_installed\("([^"]+)"(?:,\s*pip_name="([^"]+)")?\)') |
    ForEach-Object { if ($_.Groups[2].Success) { $_.Groups[2].Value } else { $_.Groups[1].Value } }

Write-Host "`n[source-of-truth]" -ForegroundColor Cyan
Write-Host "  Python version  : $pythonVersion   (tu cws_worker.bat, dong PYTHON_VERSION)"
Write-Host "  Blender version : $blenderVersion  (tu cws_worker_full.py, dong BLENDER_VERSION)"
Write-Host "  pip packages    : $($requiredPackages -join ', ')  (tu ensure_package_installed(...) trong cws_worker_full.py)"

# ---------------------------------------------------------------------
# Buoc 1: Thu muc test
# ---------------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $TestDir | Out-Null
$pythonDir = Join-Path $TestDir "PythonEmbed"
$pythonExe = Join-Path $pythonDir "python.exe"
$blenderRootDir = Join-Path $TestDir "Blender"
$blenderExe = Join-Path $blenderRootDir "blender-$blenderVersion-windows-x64\blender.exe"

# ---------------------------------------------------------------------
# Buoc 2: Python embeddable (idempotent) - dung DUNG quy trinh cws_worker.bat
# ---------------------------------------------------------------------
if (Test-Path $pythonExe) {
    Write-Host "`n[OK] Python portable co san: $pythonExe" -ForegroundColor Green
} else {
    Write-Host "`n[setup] Dang tai Python $pythonVersion embeddable tu python.org..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $pythonDir | Out-Null
    $zipUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
    $zipPath = Join-Path $pythonDir "python_embed.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $pythonDir -Force
    Remove-Item $zipPath

    # Ban Embeddable mac dinh TAT tim module ngoai qua file ._pth - phai
    # sua thi "pip install" moi hoat dong duoc (dung y het cws_worker.bat).
    Get-ChildItem $pythonDir -Filter "python*._pth" | ForEach-Object {
        (Get-Content $_.FullName) -replace '^#import site', 'import site' | Set-Content $_.FullName
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $pythonDir "DLLs") | Out-Null

    $getPipPath = Join-Path $pythonDir "get-pip.py"
    Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPipPath -UseBasicParsing
    & $pythonExe $getPipPath --quiet
    Remove-Item $getPipPath
    Write-Host "[OK] Da cai Python portable + pip tai: $pythonDir" -ForegroundColor Green
}

# ---------------------------------------------------------------------
# Buoc 3: pip packages ma worker can (danh sach lay dong tu code o Buoc 0)
# ---------------------------------------------------------------------
Write-Host "`n[setup] Cai/kiem tra pip packages: $($requiredPackages -join ', ')..." -ForegroundColor Yellow
foreach ($pkg in $requiredPackages) {
    & $pythonExe -m pip install $pkg --quiet
    if ($LASTEXITCODE -ne 0) { throw "pip install $pkg that bai (exit $LASTEXITCODE)" }
}
Write-Host "[OK] Du pip packages worker can." -ForegroundColor Green

# ---------------------------------------------------------------------
# Buoc 4: Blender portable (idempotent) - dung DUNG URL cws_worker_full.py dung
# ---------------------------------------------------------------------
if (Test-Path $blenderExe) {
    Write-Host "`n[OK] Blender portable co san: $blenderExe" -ForegroundColor Green
} else {
    Write-Host "`n[setup] Dang tai Blender $blenderVersion tu download.blender.org (~380MB, co the mat vai phut)..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $blenderRootDir | Out-Null
    $blenderZipUrl = "https://download.blender.org/release/Blender$blenderSeries/blender-$blenderVersion-windows-x64.zip"
    $blenderZipPath = Join-Path $blenderRootDir "blender.zip"
    Invoke-WebRequest -Uri $blenderZipUrl -OutFile $blenderZipPath -UseBasicParsing
    Expand-Archive -Path $blenderZipPath -DestinationPath $blenderRootDir -Force
    Remove-Item $blenderZipPath
    if (!(Test-Path $blenderExe)) { throw "Giai nen xong nhung khong thay $blenderExe - cau truc zip Blender co the da doi." }
    Write-Host "[OK] Da cai Blender portable tai: $blenderExe" -ForegroundColor Green
}

# ---------------------------------------------------------------------
# Buoc 5: VERIFY (Test -> evidence)
# ---------------------------------------------------------------------
Write-Host "`n=== VERIFY ===" -ForegroundColor Cyan
$evidence = [ordered]@{
    timestamp_utc      = (Get-Date).ToUniversalTime().ToString("o")
    test_dir            = $TestDir
    python_version_pin  = $pythonVersion
    blender_version_pin = $blenderVersion
    pip_packages        = $requiredPackages -join ", "
}
$allPass = $true

$pyVersionOut = (& $pythonExe --version) 2>&1 | Out-String
$pyVersionOut = $pyVersionOut.Trim()
Write-Host "[python --version] $pyVersionOut"
$evidence.python_version_actual = $pyVersionOut
if ($pyVersionOut -notmatch [regex]::Escape($pythonVersion)) { $allPass = $false }

$blenderVersionOut = (& $blenderExe -b --version) 2>&1 | Select-String "^Blender" | Select-Object -First 1
Write-Host "[blender -b --version] $blenderVersionOut"
$evidence.blender_version_actual = "$blenderVersionOut"
if ("$blenderVersionOut" -notmatch [regex]::Escape($blenderVersion)) { $allPass = $false }

# Render smoke test: dung CANH default startup scene cua chinh Blender
# (KHONG dung file .blend that cua khach/Owner, KHONG dung B2/Supabase) -
# chi de xac nhan Blender CLI headless render hoat dong dung cach truyen
# tham so giong het render_single_frame() trong cws_worker_full.py
# (-b, -o ..., -F PNG, -s/-e/-a hoac -f).
$renderOutPrefix = Join-Path $TestDir "smoke_render_"
Remove-Item "$($renderOutPrefix)*.png" -ErrorAction SilentlyContinue
$renderLog = (& $blenderExe -b -noaudio -o $renderOutPrefix -F PNG -f 1) 2>&1 | Out-String
$renderedFile = Get-ChildItem "$($renderOutPrefix)*.png" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($renderedFile -and $renderedFile.Length -gt 0) {
    Write-Host "[OK] Blender headless render: $($renderedFile.Name) ($($renderedFile.Length) bytes)" -ForegroundColor Green
    $evidence.blender_headless_render = "PASS: $($renderedFile.Name), $($renderedFile.Length) bytes"
} else {
    Write-Host "[FAIL] Blender khong tao duoc PNG headless." -ForegroundColor Red
    Write-Host $renderLog
    $evidence.blender_headless_render = "FAIL"
    $allPass = $false
}

# Import cws_worker_full.py trong moi truong TEST rieng (CWS_DIR tro vao
# $TestDir) - CHI goi ham an toan, xem canh bao dau file.
$probeScriptPath = Join-Path $TestDir "_probe_import.py"
@"
import sys, os
sys.path.insert(0, r'$RepoRoot')
os.environ['CWS_DIR'] = r'$TestDir'
import cws_worker_full as w
wid = w.get_worker_id()
has_newer = w.check_for_newer_version()
print('PROBE_OK worker_id=' + wid + ' blender_exe=' + str(w.BLENDER_EXE) + ' blender_exe_exists=' + str(w.BLENDER_EXE.exists()) + ' check_for_newer_version_ran=' + str(has_newer))
"@ | Set-Content -Path $probeScriptPath -Encoding utf8

$probeOut = (& $pythonExe $probeScriptPath) 2>&1 | Out-String
Write-Host $probeOut
Remove-Item $probeScriptPath -ErrorAction SilentlyContinue
if ($probeOut -match "PROBE_OK") {
    Write-Host "[OK] Import cws_worker_full.py + dependency (requests/boto3/Pillow) thanh cong; get_worker_id()/check_for_newer_version() (local/read-only) chay duoc. worker_loop()/claim_task() KHONG duoc goi (co chu dich, tranh anh huong Fleet that)." -ForegroundColor Green
    $evidence.worker_import_and_safe_calls = "PASS"
} else {
    Write-Host "[FAIL] Import/gia ham an toan that bai." -ForegroundColor Red
    $evidence.worker_import_and_safe_calls = "FAIL: $probeOut"
    $allPass = $false
}

# Goi THANG ham render_frame_range() THAT cua cws_worker_full.py (chinh ham
# worker dung de render task san xuat) tren 1 scene .blend TU TAO qua chinh
# Blender (scene mac dinh cua Blender - KHONG phai file .blend cua khach/
# Owner) - kiem tra CA duong ong: goi Blender dung tham so that, kiem tra
# PNG that ton tai, chay validate_rendered_image() that (kiem tra corrupt/
# den trang). KHONG goi upload_single_frame()/B2/Supabase - ham
# render_frame_range() tu than KHONG dung toi 2 thu do.
$e2eProbeScriptPath = Join-Path $TestDir "_probe_render_e2e.py"
$e2eOutDir = Join-Path $TestDir "probe_render_out"
@"
import sys, os, subprocess
sys.path.insert(0, r'$RepoRoot')
os.environ['CWS_DIR'] = r'$TestDir'
import cws_worker_full as w
from pathlib import Path

test_blend = Path(r'$TestDir') / 'probe_scene.blend'
r = subprocess.run([str(w.BLENDER_EXE), '-b', '--python-expr',
    "import bpy; bpy.ops.wm.save_as_mainfile(filepath=r'" + str(test_blend) + "')"],
    capture_output=True, text=True)
if r.returncode != 0:
    print('E2E_FAIL could not create probe .blend: ' + r.stdout[-500:] + r.stderr[-500:])
    sys.exit(1)

out_dir = Path(r'$e2eOutDir')
valid_files, err, sec_per_frame = w.render_frame_range(test_blend, 1, 1, out_dir, enable_autoexec=True)
print('RENDER_FRAME_RANGE_RESULT valid_count=' + str(len(valid_files)) + ' error=' + str(err) + ' sec_per_frame=' + str(sec_per_frame))
if valid_files and err is None:
    print('E2E_OK')
else:
    print('E2E_FAIL')
"@ | Set-Content -Path $e2eProbeScriptPath -Encoding utf8

$e2eOut = (& $pythonExe $e2eProbeScriptPath) 2>&1 | Out-String
Write-Host $e2eOut
Remove-Item $e2eProbeScriptPath -ErrorAction SilentlyContinue
if ($e2eOut -match "E2E_OK") {
    Write-Host "[OK] E2E that: render_frame_range() (ham san xuat that cua worker) render + validate_rendered_image() PASS tren scene local." -ForegroundColor Green
    $evidence.render_frame_range_e2e = "PASS"
} else {
    Write-Host "[FAIL] E2E render_frame_range() that bai." -ForegroundColor Red
    $evidence.render_frame_range_e2e = "FAIL: $e2eOut"
    $allPass = $false
}

# Bo test OFFLINE mo rong (worker_offline_function_tests.py) - da tach
# rieng file cho de doc: multi-frame, enable_autoexec=False (duong dan
# job khach upload), render_single_frame(), ma GPU fix that chay trong
# Blender that, duong dan LOI (.blend khong ton tai), validate_rendered_image()
# tren anh corrupt/qua nho, extract_drive_file_id(). Van CHI dung ham
# local/thuan tuy, khong dung Supabase/B2 that.
Write-Host "`n[setup] Chay bo test offline mo rong (worker_offline_function_tests.py)..." -ForegroundColor Yellow
$offlineTestsPath = Join-Path $PSScriptRoot "worker_offline_function_tests.py"
$offlineOut = (& $pythonExe $offlineTestsPath $RepoRoot $TestDir) 2>&1 | Out-String
Write-Host $offlineOut
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Bo test offline mo rong: TAT CA PASS." -ForegroundColor Green
    $evidence.offline_function_tests = "PASS"
} else {
    Write-Host "[FAIL] Bo test offline mo rong: co truong hop FAIL, xem chi tiet o tren." -ForegroundColor Red
    $evidence.offline_function_tests = "FAIL"
    $allPass = $false
}

# ---------------------------------------------------------------------
# Buoc 6: Ghi evidence
# ---------------------------------------------------------------------
$evidence.overall = if ($allPass) { "PASS" } else { "FAIL" }
$evidenceDir = Join-Path $RepoRoot "reports\worker"
$evidencePath = Join-Path $evidenceDir ("WORKER_RUNTIME_TEST_EVIDENCE_" + (Get-Date -Format "yyyy-MM-dd") + ".json")
$evidence | ConvertTo-Json | Set-Content -Path $evidencePath -Encoding utf8
Write-Host "`n[evidence] Da ghi: $evidencePath" -ForegroundColor Cyan

Write-Host "`n=== KET QUA: $($evidence.overall) ===" -ForegroundColor $(if ($allPass) { "Green" } else { "Red" })
if (-not $allPass) { exit 1 }
