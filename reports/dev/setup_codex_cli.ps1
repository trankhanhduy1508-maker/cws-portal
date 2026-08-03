# Cai dat Codex CLI (OpenAI) tren may Windows nay, tai dung lai Node.js
# portable da chuan bi san cho CWS (reports/dev/setup_node_runtime_test.ps1)
# - KHONG tai/cai them 1 ban Node rieng, KHONG dung npm install -g vao
# node_modules cua backend/frontend CWS (npm -g ghi vao thu muc global
# rieng cua chinh ban Node portable, hoan toan tach biet voi
# backend/node_modules va node_modules o repo root - khong lam hong
# lockfile/dependency nao cua CWS).
#
# IDEMPOTENT: chay lai duoc - npm install -g tu kiem tra ban da cai,
# them PATH chi 1 lan (kiem tra truoc khi them, khong nhan doi).
#
# Cach chay:  .\setup_codex_cli.ps1

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$CwsNodeTestDir = "C:\CWS_Node_Test"

Write-Host "=== Cai dat Codex CLI (tai dung Node.js portable cua CWS) ===" -ForegroundColor Cyan

# ---------------------------------------------------------------------
# Buoc 1: Tim Node portable da co san cho CWS - neu chua co, tu chay
# script setup CWS de tao (dung lai logic co san, KHONG viet lai).
# ---------------------------------------------------------------------
$nodeExe = Get-ChildItem -Path (Join-Path $CwsNodeTestDir "Node") -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $nodeExe) {
    Write-Host "[setup] Chua thay Node portable cho CWS, dang tu chay setup_node_runtime_test.ps1 truoc..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "setup_node_runtime_test.ps1")
    $nodeExe = Get-ChildItem -Path (Join-Path $CwsNodeTestDir "Node") -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
    if (-not $nodeExe) { throw "Van khong tim thay Node sau khi chay setup_node_runtime_test.ps1" }
}

$nodeHome = Split-Path $nodeExe -Parent
$npmCmd = Join-Path $nodeHome "npm.cmd"
Write-Host "[OK] Dung Node portable co san: $nodeHome" -ForegroundColor Green

# ---------------------------------------------------------------------
# Buoc 2: npm install -g @openai/codex (dung dung goi npm chinh thuc
# tren npmjs.org, xac nhan ten goi truoc khi cai - KHONG doan). Global
# install cua 1 ban Node portable ghi vao DUNG thu muc Node do (vd
# node-v22.23.2-win-x64\node_modules + file .cmd shim canh node.exe),
# HOAN TOAN tach biet voi backend/node_modules va node_modules o goc
# repo CWS (npm ci rieng, khong lien quan).
# ---------------------------------------------------------------------
Write-Host "`n[setup] Dang cai @openai/codex (npm install -g)..." -ForegroundColor Yellow
& $npmCmd install -g @openai/codex --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install -g @openai/codex that bai (exit $LASTEXITCODE)" }
Write-Host "[OK] Da cai xong @openai/codex." -ForegroundColor Green

# `npm bin -g` da bi GO BO tu npm 8+ - dung `npm prefix -g` thay the.
# Tren Windows, thu muc global bin CHINH LA thu muc prefix (khac Unix la
# prefix/bin) - file shim .cmd nam truc tiep trong do.
$npmGlobalBin = (& $npmCmd prefix -g).Trim()
if (-not $npmGlobalBin -or -not (Test-Path $npmGlobalBin)) { $npmGlobalBin = $nodeHome }  # fallback: tren Windows portable, bin global = chinh thu muc Node
Write-Host "[OK] Thu muc global bin: $npmGlobalBin" -ForegroundColor Green

$codexCmdPath = Join-Path $npmGlobalBin "codex.cmd"
if (!(Test-Path $codexCmdPath)) { throw "Cai xong nhung khong thay $codexCmdPath - kiem tra lai cau truc goi." }

# ---------------------------------------------------------------------
# Buoc 3: Them thu muc global bin vao PATH cua USER (persistent qua
# registry, giong [Environment]::SetEnvironmentVariable - de cua so
# PowerShell/CMD MOI mo sau nay tu goi duoc `codex` khong can kich hoat
# gi them) - KIEM TRA TRUOC KHI THEM, tranh PATH phinh to/nhan doi neu
# chay lai script nhieu lan.
# ---------------------------------------------------------------------
Write-Host "`n[setup] Cau hinh PATH (User, persistent)..." -ForegroundColor Yellow
$currentUserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$pathEntries = @()
if ($currentUserPath) { $pathEntries = $currentUserPath -split ';' | Where-Object { $_ -ne '' } }

if ($pathEntries -contains $npmGlobalBin) {
    Write-Host "[OK] PATH (User) da co san thu muc nay tu truoc." -ForegroundColor Green
} else {
    $newUserPath = if ($currentUserPath) { "$currentUserPath;$npmGlobalBin" } else { $npmGlobalBin }
    [Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
    Write-Host "[OK] Da them '$npmGlobalBin' vao PATH (User). Cua so PowerShell/CMD MOI se tu thay - cua so dang mo (ke ca phien nay) can mo lai moi thay." -ForegroundColor Green
}

# Cap nhat PATH ngay TRONG PHIEN NAY de buoc verify o duoi chay duoc
# luon, khong bat nguoi dung phai tu mo cua so moi truoc khi thay ket qua.
$env:PATH = "$npmGlobalBin;$env:PATH"

# ---------------------------------------------------------------------
# Buoc 4: Verify - QUAN TRONG: verify bang 1 TIEN TRINH CON MOI hoan
# toan doc lai PATH tu registry (gia lap "mo cua so PowerShell moi"
# that su, KHONG chi dung bien $env:PATH da tu sua o tren trong CHINH
# phien nay - phai chung minh PATH persistent that, khong phai chi hoat
# dong tam trong phien hien tai).
# ---------------------------------------------------------------------
Write-Host "`n=== VERIFY (tien trinh con moi, doc PATH tu registry - gia lap cua so moi) ===" -ForegroundColor Cyan
$verifyScriptPath = Join-Path $env:TEMP "cws_codex_verify.ps1"
@'
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$machinePath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
$env:PATH = "$userPath;$machinePath"
& codex --version
exit $LASTEXITCODE
'@ | Set-Content -Path $verifyScriptPath -Encoding utf8

$stdoutPath = Join-Path $env:TEMP "cws_codex_verify_out.txt"
$stderrPath = Join-Path $env:TEMP "cws_codex_verify_err.txt"
$proc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $verifyScriptPath) `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
$verifyOut = Get-Content $stdoutPath -Raw -ErrorAction SilentlyContinue
$verifyErr = Get-Content $stderrPath -Raw -ErrorAction SilentlyContinue
Remove-Item $verifyScriptPath, $stdoutPath, $stderrPath -ErrorAction SilentlyContinue
Write-Host "[codex --version] $verifyOut$verifyErr"

$codexOk = $proc.ExitCode -eq 0 -and $verifyOut -match '\d'
Write-Host "`n=== KET QUA: $(if($codexOk){'PASS'}else{'FAIL'}) ===" -ForegroundColor $(if($codexOk){'Green'}else{'Red'})

$evidence = [ordered]@{
    timestamp_utc      = (Get-Date).ToUniversalTime().ToString("o")
    node_home_reused   = $nodeHome
    npm_global_bin     = $npmGlobalBin
    codex_version_out  = $verifyOut.Trim()
    verify_process_exit_code = $proc.ExitCode
    path_user_updated  = -not ($pathEntries -contains $npmGlobalBin)
    overall            = if ($codexOk) { "PASS" } else { "FAIL" }
}
$evidencePath = Join-Path $RepoRoot ("reports\dev\CODEX_CLI_SETUP_EVIDENCE_" + (Get-Date -Format "yyyy-MM-dd") + ".json")
$evidence | ConvertTo-Json | Set-Content -Path $evidencePath -Encoding utf8
Write-Host "[evidence] Da ghi: $evidencePath" -ForegroundColor Cyan

if (-not $codexOk) { exit 1 }
