# CWS Portal - Chuan bi + chay build/test THAT cho backend (NestJS) va
# frontend (Vite) bang Node.js portable (2026-08-03).
#
# MUC DICH: cac phien lam viec truoc day (xem CURRENT_STATUS.md muc
# "Current Task") bi chan o "khong co Node.js/npm" nen khong the tu
# build/test/lint code TypeScript truoc khi push. Script nay tu dong
# hoa dung cach da lam voi Python/Blender
# (reports/worker/setup_worker_runtime_test.ps1): tu xac dinh version
# tu Source of Truth trong code (KHONG doan), tu tai ban portable chinh
# thuc, roi chay build+test+lint THAT.
#
# NGUYEN TAC AN TOAN:
#   - Version Node lay TRUC TIEP tu .github/workflows/ci.yml (node-version)
#     - day la noi DUY NHAT trong repo khai bao version Node, dung cho ca
#     backend va frontend job. Ban PATCH cu the (vd 22.23.2) lay tu chinh
#     index chinh thuc cua nodejs.org ung voi major version do (tuong
#     duong cach GitHub Actions setup-node resolve "node-version: 22").
#   - Dung ban "portable" (giai nen zip chinh thuc tu nodejs.org, KHONG
#     chay installer .msi) - cai vao thu muc rieng ($NodeDir), KHONG dung
#     `npm install -g`/sua PATH he thong, KHONG anh huong Node nao khac
#     co the co san tren may.
#   - Backend test (Jest, `backend/src/**/*.spec.ts`) da xac nhan MOCK
#     HOAN TOAN (jest.fn() cho repository/gateway/service) - KHONG goi
#     Supabase/B2/mang that. An toan chay nhu binh thuong, giong het CI.
#   - KHONG chay `npm audit fix`/thay doi package-lock.json - CHI
#     `npm ci` (cai dung y het lockfile, khong sua gi).
#
# IDEMPOTENT: chay lai duoc, buoc nao da xong se bo qua (Node da giai
# nen san, node_modules da cai qua npm ci se duoc npm tu kiem tra lai).
#
# Cach chay:  .\setup_node_runtime_test.ps1  [-TestDir "C:\CWS_Node_Test"]

param(
    [string]$TestDir = "C:\CWS_Node_Test"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ciPath = Join-Path $RepoRoot ".github\workflows\ci.yml"

Write-Host "=== CWS Portal - Node.js runtime + build/test setup ===" -ForegroundColor Cyan
Write-Host "RepoRoot: $RepoRoot"
Write-Host "TestDir : $TestDir"

if (!(Test-Path $ciPath)) { throw "Khong tim thay $ciPath - dang chay sai thu muc repo?" }

# ---------------------------------------------------------------------
# Buoc 0: Doc major version tu Source of Truth (.github/workflows/ci.yml),
# roi tra ban PATCH moi nhat THAT tu chinh index nodejs.org (khong doan).
# ---------------------------------------------------------------------
$ciContent = Get-Content $ciPath -Raw
if ($ciContent -notmatch 'node-version:\s*(\d+)') {
    throw "Khong doc duoc node-version tu .github/workflows/ci.yml"
}
$nodeMajor = $Matches[1]
Write-Host "`n[source-of-truth] Node major version: $nodeMajor (tu .github/workflows/ci.yml, dung cho ca backend+frontend job)" -ForegroundColor Cyan

$indexJsonPath = Join-Path $env:TEMP "cws_node_dist_index.json"
& curl.exe -sSL --max-time 30 -o $indexJsonPath "https://nodejs.org/dist/index.json"
if ($LASTEXITCODE -ne 0 -or !(Test-Path $indexJsonPath)) { throw "Khong tai duoc nodejs.org/dist/index.json" }
$distIndex = Get-Content $indexJsonPath -Raw | ConvertFrom-Json
$candidate = $distIndex | Where-Object { $_.version -like "v$nodeMajor.*" -and $_.files -contains "win-x64-zip" } |
    Sort-Object { [version]($_.version.TrimStart('v')) } -Descending | Select-Object -First 1
if (-not $candidate) { throw "Khong tim thay ban Node v$nodeMajor.x nao co win-x64-zip tren nodejs.org" }
$nodeVersion = $candidate.version.TrimStart('v')
Write-Host "[source-of-truth] Ban Node v$nodeMajor.x moi nhat THAT tu nodejs.org: $nodeVersion (LTS=$($candidate.lts), ngay $($candidate.date))" -ForegroundColor Cyan

# ---------------------------------------------------------------------
# Buoc 1: Tai + giai nen Node portable (idempotent) - dung curl.exe
# (KHONG dung Invoke-WebRequest - da xac nhan mot so URL nodejs.org
# tra ve rat cham/treo qua Invoke-WebRequest trong moi truong nay, trong
# khi curl.exe tai binh thuong - giong cach cws_worker.bat da dung
# curl cho moi lan tai, khong dung PowerShell cmdlet).
# ---------------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $TestDir | Out-Null
$nodeExtractDir = Join-Path $TestDir "Node"
$nodeHome = Join-Path $nodeExtractDir "node-v$nodeVersion-win-x64"
$nodeExe = Join-Path $nodeHome "node.exe"
$npmCmd = Join-Path $nodeHome "npm.cmd"

if (Test-Path $nodeExe) {
    Write-Host "`n[OK] Node portable co san: $nodeExe" -ForegroundColor Green
} else {
    Write-Host "`n[setup] Dang tai Node v$nodeVersion (win-x64 zip) tu nodejs.org..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $nodeExtractDir | Out-Null
    $zipUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
    $zipPath = Join-Path $nodeExtractDir "node.zip"
    & curl.exe -sSL --max-time 300 -o $zipPath $zipUrl
    if ($LASTEXITCODE -ne 0 -or !(Test-Path $zipPath)) { throw "Tai Node that bai (curl exit $LASTEXITCODE)" }
    Expand-Archive -Path $zipPath -DestinationPath $nodeExtractDir -Force
    Remove-Item $zipPath
    if (!(Test-Path $nodeExe)) { throw "Giai nen xong nhung khong thay $nodeExe - cau truc zip Node co the da doi." }
    Write-Host "[OK] Da cai Node portable tai: $nodeHome" -ForegroundColor Green
}

# Them Node portable vao PATH CHI TRONG PHIEN NAY (khong sua PATH he
# thong/User - script khac vao lai la mat, dung y het tinh than "khong
# anh huong may that" cua setup_worker_runtime_test.ps1).
$env:PATH = "$nodeHome;$env:PATH"

# ---------------------------------------------------------------------
# Buoc 2: Verify runtime
# ---------------------------------------------------------------------
Write-Host "`n=== VERIFY ===" -ForegroundColor Cyan
$evidence = [ordered]@{
    timestamp_utc     = (Get-Date).ToUniversalTime().ToString("o")
    test_dir          = $TestDir
    node_major_pin    = $nodeMajor
    node_version_used = $nodeVersion
}
$allPass = $true

$nodeVersionOut = (& $nodeExe --version) | Out-String
$nodeVersionOut = $nodeVersionOut.Trim()
Write-Host "[node --version] $nodeVersionOut"
$evidence.node_version_actual = $nodeVersionOut
if ($nodeVersionOut -ne "v$nodeVersion") { $allPass = $false }

$npmVersionOut = (& $npmCmd --version) | Out-String
$npmVersionOut = $npmVersionOut.Trim()
Write-Host "[npm --version] $npmVersionOut"
$evidence.npm_version_actual = $npmVersionOut

# ---------------------------------------------------------------------
# Buoc 3: Backend (NestJS) - npm ci + build + test (Jest, MOCK hoan
# toan, khong dung Supabase/B2 that) + lint - dung y het 4 buoc CI.
# ---------------------------------------------------------------------
Write-Host "`n=== BACKEND ===" -ForegroundColor Cyan
Push-Location (Join-Path $RepoRoot "backend")
try {
    Write-Host "[backend] npm ci..." -ForegroundColor Yellow
    & $npmCmd ci --no-audit --no-fund | Tee-Object -Variable backendCiLog | Out-Null
    $backendCiOk = $LASTEXITCODE -eq 0
    Write-Host "[backend] npm ci: $(if($backendCiOk){'OK'}else{'FAIL'})" -ForegroundColor $(if($backendCiOk){'Green'}else{'Red'})

    $backendBuildOk = $false
    $backendTestOk = $false
    $backendLintOk = $false
    if ($backendCiOk) {
        Write-Host "[backend] npm run build..." -ForegroundColor Yellow
        & $npmCmd run build | Tee-Object -Variable backendBuildLog | Out-Null
        $backendBuildOk = $LASTEXITCODE -eq 0
        Write-Host "[backend] build: $(if($backendBuildOk){'OK'}else{'FAIL'})" -ForegroundColor $(if($backendBuildOk){'Green'}else{'Red'})

        Write-Host "[backend] npm test (Jest)..." -ForegroundColor Yellow
        & $npmCmd test | Tee-Object -Variable backendTestLog | Out-Null
        $backendTestOk = $LASTEXITCODE -eq 0
        Write-Host "[backend] test: $(if($backendTestOk){'OK'}else{'FAIL'})" -ForegroundColor $(if($backendTestOk){'Green'}else{'Red'})
        Write-Host ($backendTestLog | Select-String "Tests:|Test Suites:" | Out-String)

        Write-Host "[backend] npm run lint..." -ForegroundColor Yellow
        & $npmCmd run lint | Tee-Object -Variable backendLintLog | Out-Null
        $backendLintOk = $LASTEXITCODE -eq 0
        Write-Host "[backend] lint: $(if($backendLintOk){'OK'}else{'FAIL'})" -ForegroundColor $(if($backendLintOk){'Green'}else{'Red'})
    } else {
        Write-Host ($backendCiLog | Out-String)
    }
} finally {
    Pop-Location
}
$evidence.backend_npm_ci = if ($backendCiOk) { "PASS" } else { "FAIL" }
$evidence.backend_build = if ($backendBuildOk) { "PASS" } else { "FAIL" }
$evidence.backend_test = if ($backendTestOk) { "PASS" } else { "FAIL" }
$evidence.backend_lint = if ($backendLintOk) { "PASS" } else { "FAIL" }
if (-not ($backendCiOk -and $backendBuildOk -and $backendTestOk -and $backendLintOk)) { $allPass = $false }

# ---------------------------------------------------------------------
# Buoc 4: Frontend (Vite) - npm ci + build + lint. KHONG chay `npm test`
# - repo CHUA co file test frontend nao (`src/**/*.test.tsx` rong,
# vitest se bao "no test files" - KHONG PHAI loi code, chi la chua co
# test, ghi ro trong evidence thay vi coi la FAIL).
# ---------------------------------------------------------------------
Write-Host "`n=== FRONTEND ===" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
    Write-Host "[frontend] npm ci..." -ForegroundColor Yellow
    & $npmCmd ci --no-audit --no-fund | Tee-Object -Variable frontendCiLog | Out-Null
    $frontendCiOk = $LASTEXITCODE -eq 0
    Write-Host "[frontend] npm ci: $(if($frontendCiOk){'OK'}else{'FAIL'})" -ForegroundColor $(if($frontendCiOk){'Green'}else{'Red'})

    $frontendBuildOk = $false
    $frontendLintOk = $false
    if ($frontendCiOk) {
        Write-Host "[frontend] npm run build..." -ForegroundColor Yellow
        & $npmCmd run build | Tee-Object -Variable frontendBuildLog | Out-Null
        $frontendBuildOk = $LASTEXITCODE -eq 0
        Write-Host "[frontend] build: $(if($frontendBuildOk){'OK'}else{'FAIL'})" -ForegroundColor $(if($frontendBuildOk){'Green'}else{'Red'})

        Write-Host "[frontend] npm run lint..." -ForegroundColor Yellow
        & $npmCmd run lint | Tee-Object -Variable frontendLintLog | Out-Null
        $frontendLintOk = $LASTEXITCODE -eq 0
        Write-Host "[frontend] lint: $(if($frontendLintOk){'OK'}else{'FAIL'})" -ForegroundColor $(if($frontendLintOk){'Green'}else{'Red'})
    } else {
        Write-Host ($frontendCiLog | Out-String)
    }
} finally {
    Pop-Location
}
$evidence.frontend_npm_ci = if ($frontendCiOk) { "PASS" } else { "FAIL" }
$evidence.frontend_build = if ($frontendBuildOk) { "PASS" } else { "FAIL" }
$evidence.frontend_lint = if ($frontendLintOk) { "PASS" } else { "FAIL" }
$evidence.frontend_test = "SKIPPED (chua co file test frontend nao trong repo)"
if (-not ($frontendCiOk -and $frontendBuildOk -and $frontendLintOk)) { $allPass = $false }

# ---------------------------------------------------------------------
# Buoc 5: Ghi evidence
# ---------------------------------------------------------------------
$evidence.overall = if ($allPass) { "PASS" } else { "FAIL" }
$evidencePath = Join-Path $RepoRoot ("reports\dev\NODE_BUILD_TEST_EVIDENCE_" + (Get-Date -Format "yyyy-MM-dd") + ".json")
$evidence | ConvertTo-Json | Set-Content -Path $evidencePath -Encoding utf8
Write-Host "`n[evidence] Da ghi: $evidencePath" -ForegroundColor Cyan

Write-Host "`n=== KET QUA: $($evidence.overall) ===" -ForegroundColor $(if ($allPass) { "Green" } else { "Red" })
if (-not $allPass) { exit 1 }
