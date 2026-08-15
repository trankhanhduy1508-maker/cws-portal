[CmdletBinding()]
param(
    [string]$CanonicalRepoPath = (Join-Path $env:USERPROFILE 'cws-portal-canonical-main'),
    [switch]$SkipOpenCode
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$CanonicalOwner = 'trankhanhduy1508-maker'
$CanonicalName = 'cws-portal'
$CanonicalUrl = "https://github.com/$CanonicalOwner/$CanonicalName.git"
$ExpectedBranch = 'main'
$ReportPath = Join-Path $CanonicalRepoPath 'CWS_DEV_SETUP_REPORT.txt'
$Results = [ordered]@{}
$Blockers = New-Object System.Collections.Generic.List[string]

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Write-Result([string]$Name, [string]$Value, [ConsoleColor]$Color = [ConsoleColor]::Green) {
    $Results[$Name] = $Value
    Write-Host ("[{0}] {1}" -f $Name, $Value) -ForegroundColor $Color
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Refresh-ProcessPath {
    $userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
    $machinePath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
    $env:PATH = "$userPath;$machinePath"
}

function Find-CommandPath([string[]]$Names) {
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { return $command.Source }
    }
    return $null
}

function Get-ToolVersion([string]$CommandName, [string[]]$Arguments = @('--version')) {
    $command = Get-Command $CommandName -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $command) { return $null }
    try {
        $output = & $command.Source @Arguments 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { return $null }
        return ($output.Trim() -split "`r?`n")[0]
    } catch { return $null }
}

function Get-ExecutableVersion([string]$Path, [string[]]$Arguments = @('--version')) {
    if (-not $Path -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    try {
        $output = & $Path @Arguments 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { return $null }
        return ($output.Trim() -split "`r?`n")[0]
    } catch { return $null }
}

function Find-BlenderPath {
    $commandPath = Find-CommandPath @('blender.exe', 'blender')
    if ($commandPath) { return $commandPath }

    $roots = @(
        (Join-Path $env:ProgramFiles 'Blender Foundation'),
        (Join-Path ${env:ProgramFiles(x86)} 'Blender Foundation'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Blender Foundation')
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Container) }

    foreach ($root in $roots) {
        $candidate = Get-ChildItem -LiteralPath $root -Filter blender.exe -File -Recurse -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending |
            Select-Object -First 1
        if ($candidate) { return $candidate.FullName }
    }
    return $null
}

function Install-WingetPackage([string]$Id, [string]$Label) {
    Write-Host "[setup] Installing missing $Label ($Id) with winget..." -ForegroundColor Yellow
    & winget.exe install --id $Id --exact --source winget --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "winget failed while installing $Label ($Id), exit code $LASTEXITCODE"
    }
}

function Ensure-Pytest([string]$PythonExe) {
    if (-not $PythonExe -or -not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) {
        throw 'Python executable unavailable while ensuring pytest.'
    }

    & $PythonExe -m pytest --version *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host '[keep] pytest already available.' -ForegroundColor Green
        return
    }

    Write-Host '[setup] Installing missing pytest with python -m pip...' -ForegroundColor Yellow
    & $PythonExe -m pip install --disable-pip-version-check --quiet pytest
    if ($LASTEXITCODE -ne 0) { throw 'pytest installation failed.' }

    & $PythonExe -m pytest --version *> $null
    if ($LASTEXITCODE -ne 0) { throw 'pytest verification failed after installation.' }
}

function Ensure-CodexExtension {
    $codePath = Find-CommandPath @('code.cmd', 'code.exe', 'code')
    if (-not $codePath) { throw 'VS Code unavailable while ensuring Codex extension.' }

    $extensions = & $codePath --list-extensions 2>$null
    if ($extensions -contains 'openai.chatgpt') {
        Write-Host '[keep] OpenAI Codex IDE extension already installed.' -ForegroundColor Green
        return
    }

    Write-Host '[setup] Installing OpenAI Codex IDE extension (openai.chatgpt)...' -ForegroundColor Yellow
    & $codePath --install-extension openai.chatgpt --force
    if ($LASTEXITCODE -ne 0) { throw 'OpenAI Codex IDE extension installation failed.' }

    $extensions = & $codePath --list-extensions 2>$null
    if ($extensions -notcontains 'openai.chatgpt') { throw 'OpenAI Codex IDE extension verification failed.' }
}

function Get-ConfigPresence([string]$Name) {
    $processValue = [Environment]::GetEnvironmentVariable($Name, 'Process')
    $userValue = [Environment]::GetEnvironmentVariable($Name, 'User')
    $machineValue = [Environment]::GetEnvironmentVariable($Name, 'Machine')
    if (-not ([string]::IsNullOrWhiteSpace($processValue) -and [string]::IsNullOrWhiteSpace($userValue) -and [string]::IsNullOrWhiteSpace($machineValue))) {
        return 'PRESENT'
    }
    return 'MISSING'
}

function Invoke-Git([string[]]$Arguments, [string]$WorkingDirectory = $CanonicalRepoPath) {
    Push-Location $WorkingDirectory
    try {
        $output = & git.exe @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        return [pscustomobject]@{ Output = ($output | Out-String).Trim(); ExitCode = $exitCode }
    } finally { Pop-Location }
}

function Write-SetupReport {
    if (-not (Test-Path -LiteralPath $CanonicalRepoPath -PathType Container)) { return }
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('CWS Development Setup Report')
    $lines.Add(('Timestamp UTC: {0}' -f (Get-Date).ToUniversalTime().ToString('o')))
    $lines.Add(('Machine: {0}' -f $env:COMPUTERNAME))
    $lines.Add(('User: {0}' -f $env:USERNAME))
    foreach ($key in $Results.Keys) { $lines.Add(('{0}: {1}' -f $key, $Results[$key])) }
    $lines.Add(('Blocker: {0}' -f ($(if ($Blockers.Count) { $Blockers -join '; ' } else { 'NONE' }))))
    $lines.Add(('Overall: {0}' -f ($(if ($Blockers.Count) { 'BLOCKED' } else { 'PASS' }))))
    $lines | Set-Content -LiteralPath $ReportPath -Encoding UTF8
    Write-Host "[report] $ReportPath" -ForegroundColor Cyan
}

try {
    Write-Host 'CWS Windows development setup' -ForegroundColor Cyan
    Write-Host 'Safe to rerun: detect first, install only missing prerequisites, preserve repo and credentials.'

    Write-Step 'Preflight'
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'This setup is Windows-only.' }
    Write-Result 'Windows' ([Environment]::OSVersion.Version.ToString())
    if (-not (Test-IsAdministrator)) { throw 'Administrator elevation is required. Run CWS_DEV_SETUP.bat and approve UAC.' }
    Write-Result 'Administrator' 'PASS'

    try {
        Resolve-DnsName github.com -ErrorAction Stop | Select-Object -First 1 | Out-Null
        Write-Result 'DNS' 'PASS'
    } catch {
        $Blockers.Add('DNS resolution for github.com failed')
        Write-Result 'DNS' 'FAIL' Red
    }
    try {
        $https = Test-NetConnection github.com -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($https) { Write-Result 'Internet_HTTPS' 'PASS' } else { throw 'TCP 443 unavailable' }
    } catch {
        $Blockers.Add('HTTPS connectivity to github.com failed')
        Write-Result 'Internet_HTTPS' 'FAIL' Red
    }

    Refresh-ProcessPath
    $wingetPath = Find-CommandPath @('winget.exe', 'winget')
    if (-not $wingetPath) {
        $Blockers.Add('winget is missing; install/update Microsoft App Installer, then rerun')
        Write-Result 'winget' 'MISSING' Red
    } else { Write-Result 'winget' (Get-ToolVersion 'winget.exe') }

    foreach ($tool in @(
        [pscustomobject]@{ Name = 'Git'; Command = 'git.exe' },
        [pscustomobject]@{ Name = 'VSCode'; Command = 'code.cmd' },
        [pscustomobject]@{ Name = 'GitHubCLI'; Command = 'gh.exe' },
        [pscustomobject]@{ Name = 'Python'; Command = 'python.exe' },
        [pscustomobject]@{ Name = 'Node'; Command = 'node.exe' },
        [pscustomobject]@{ Name = 'npm'; Command = 'npm.cmd' }
    )) {
        $detectedVersion = Get-ToolVersion $tool.Command
        Write-Result $tool.Name ($(if ($detectedVersion) { $detectedVersion } else { 'MISSING' })) $(if ($detectedVersion) { 'Green' } else { 'Yellow' })
    }
    $initialBlender = Find-BlenderPath
    Write-Result 'Blender' ($(if ($initialBlender) { $initialBlender } else { 'MISSING' })) $(if ($initialBlender) { 'Green' } else { 'Yellow' })

    if ($Blockers.Count -gt 0) { throw ($Blockers -join '; ') }

    Write-Step 'Detect and install missing tools'
    $packages = @(
        [pscustomobject]@{ Command = @('git.exe', 'git'); Label = 'Git'; Id = 'Git.Git' },
        [pscustomobject]@{ Command = @('code.cmd', 'code.exe', 'code'); Label = 'Visual Studio Code'; Id = 'Microsoft.VisualStudioCode' },
        [pscustomobject]@{ Command = @('gh.exe', 'gh'); Label = 'GitHub CLI'; Id = 'GitHub.cli' },
        [pscustomobject]@{ Command = @('python.exe', 'python'); Label = 'Python 3.12'; Id = 'Python.Python.3.12' },
        [pscustomobject]@{ Command = @('node.exe', 'node'); Label = 'Node.js LTS'; Id = 'OpenJS.NodeJS.LTS' }
    )
    foreach ($package in $packages) {
        if (-not (Find-CommandPath $package.Command)) { Install-WingetPackage $package.Id $package.Label }
        else { Write-Host "[keep] $($package.Label) already available." -ForegroundColor Green }
        Refresh-ProcessPath
    }

    $blenderPath = Find-BlenderPath
    if (-not $blenderPath) {
        Install-WingetPackage 'BlenderFoundation.Blender' 'Blender'
        Refresh-ProcessPath
        $blenderPath = Find-BlenderPath
    } else {
        Write-Host '[keep] Blender already available.' -ForegroundColor Green
    }
    if (-not $blenderPath) { throw 'Blender installation completed but blender.exe could not be located.' }

    $pythonPath = Find-CommandPath @('python.exe', 'python')
    Ensure-Pytest $pythonPath
    Ensure-CodexExtension
    Write-Result 'Tools_Install' 'PASS'

    Write-Step 'Verify toolchain'
    $toolChecks = @(
        [pscustomobject]@{ Name = 'Git'; Command = 'git.exe'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'VSCode'; Command = 'code.cmd'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'GitHubCLI'; Command = 'gh.exe'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'Python'; Command = 'python.exe'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'Node'; Command = 'node.exe'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'npm'; Command = 'npm.cmd'; Arguments = @('--version') }
    )
    foreach ($check in $toolChecks) {
        Refresh-ProcessPath
        $version = Get-ToolVersion $check.Command $check.Arguments
        if (-not $version) { throw "Verification failed for $($check.Name)." }
        Write-Result $check.Name $version
    }

    $pythonPath = Find-CommandPath @('python.exe', 'python')
    $pytestVersion = (& $pythonPath -m pytest --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'pytest verification failed.' }
    Write-Result 'pytest' (($pytestVersion -split "`r?`n")[0])

    $blenderPath = Find-BlenderPath
    $blenderVersion = Get-ExecutableVersion $blenderPath @('--version')
    if (-not $blenderVersion) { throw 'Blender verification failed.' }
    Write-Result 'Blender_Path' $blenderPath
    Write-Result 'Blender_Version' $blenderVersion

    $codePath = Find-CommandPath @('code.cmd', 'code.exe', 'code')
    $extensions = & $codePath --list-extensions 2>$null
    if ($extensions -notcontains 'openai.chatgpt') { throw 'Codex IDE extension verification failed.' }
    Write-Result 'Codex_IDE' 'openai.chatgpt PRESENT'

    Write-Step 'GitHub browser authentication'
    & gh.exe auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[ACTION] GitHub CLI is not authenticated. Opening browser authorization...' -ForegroundColor Yellow
        & gh.exe auth login --hostname github.com --git-protocol https --web
    }
    & gh.exe auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Result 'GitHub_Auth' 'PASS' } else { $Blockers.Add('GitHub browser authorization did not complete'); Write-Result 'GitHub_Auth' 'BLOCKED' Red }

    Write-Step 'Canonical repository'
    $parent = Split-Path -Parent $CanonicalRepoPath
    if (-not (Test-Path -LiteralPath $CanonicalRepoPath)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
        & git.exe clone $CanonicalUrl $CanonicalRepoPath
        if ($LASTEXITCODE -ne 0) { throw 'Canonical repository clone failed.' }
    } elseif (-not (Test-Path -LiteralPath (Join-Path $CanonicalRepoPath '.git'))) {
        throw "Target exists but is not a Git repository: $CanonicalRepoPath"
    } else { Write-Host '[keep] Existing canonical clone preserved.' -ForegroundColor Green }

    $origin = (Invoke-Git @('remote', 'get-url', 'origin')).Output
    if ($origin.TrimEnd('/') -ne $CanonicalUrl.TrimEnd('/')) { throw "origin mismatch: $origin" }
    Write-Result 'Repo_Origin' $origin
    $fetch = Invoke-Git @('fetch', '--prune')
    if ($fetch.ExitCode -ne 0) { $Blockers.Add('git fetch --prune failed') }
    $branch = (Invoke-Git @('branch', '--show-current')).Output
    $status = (Invoke-Git @('status', '--short', '--branch')).Output
    $head = (Invoke-Git @('log', '-1', '--oneline')).Output
    Write-Result 'Repo_Branch' $branch $(if ($branch -eq $ExpectedBranch) { 'Green' } else { 'Yellow' })
    Write-Result 'Repo_HEAD' $head
    Write-Result 'Repo_Status' $status
    if ($branch -ne $ExpectedBranch) { $Blockers.Add("canonical clone is on '$branch', expected '$ExpectedBranch'; no checkout performed") }
    if ($status -match '(?m)^## .*\[behind ') { $Blockers.Add('canonical main is behind origin/main; no automatic pull/reset performed') }

    Write-Step 'Telegram and B2 configuration presence'
    foreach ($name in @('CWS_TELEGRAM_BOT_TOKEN', 'CWS_TELEGRAM_CHAT_ID', 'CWS_B2_KEY_ID', 'CWS_B2_APP_KEY', 'CWS_B2_ENDPOINT', 'CWS_B2_BUCKET')) {
        $presence = Get-ConfigPresence $name
        Write-Result $name $presence $(if ($presence -eq 'PRESENT') { 'Green' } else { 'Yellow' })
    }

    if (-not $SkipOpenCode -and $Blockers.Count -eq 0) {
        Write-Step 'Open canonical repository in VS Code'
        & $codePath $CanonicalRepoPath
        Write-Result 'VSCode_Open' 'PASS'
    } elseif ($SkipOpenCode) { Write-Result 'VSCode_Open' 'SKIPPED' Yellow }

    Write-SetupReport
    if ($Blockers.Count -gt 0) {
        Write-Host "`n=== BLOCKED ===" -ForegroundColor Red
        $Blockers | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
        exit 2
    }
    Write-Host "`n=== PASS ===" -ForegroundColor Green
    exit 0
} catch {
    if (-not $Blockers.Contains($_.Exception.Message)) { $Blockers.Add($_.Exception.Message) }
    Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
    Write-SetupReport
    exit 1
}
