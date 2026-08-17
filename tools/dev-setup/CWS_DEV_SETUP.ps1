[CmdletBinding()]
param(
    [string]$CanonicalRepoPath = (Join-Path $env:USERPROFILE 'cws-portal-canonical-main'),
    [string]$RuntimeRoot = (Join-Path $env:SystemDrive 'CWS_Render'),
    [switch]$SkipOpenCode,
    [switch]$SkipGitHubAuth
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
$Warnings = New-Object System.Collections.Generic.List[string]

$PythonFallbackVersion = '3.12.10'
$BlenderVersion = '5.2.0'
$BlenderSeries = 'Blender5.2'

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Write-Result([string]$Name, [string]$Value, [ConsoleColor]$Color = [ConsoleColor]::Green) {
    $Results[$Name] = $Value
    Write-Host ("[{0}] {1}" -f $Name, $Value) -ForegroundColor $Color
}

function Add-Warning([string]$Message) {
    if (-not $Warnings.Contains($Message)) { $Warnings.Add($Message) }
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
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

function Find-PythonPath {
    $commandPath = Find-CommandPath @('python.exe', 'python', 'py.exe')
    if ($commandPath) {
        if ((Split-Path -Leaf $commandPath).ToLowerInvariant() -eq 'py.exe') {
            try {
                $resolved = (& $commandPath -3 -c "import sys; print(sys.executable)" 2>$null | Select-Object -First 1)
                if ($resolved -and (Test-Path -LiteralPath $resolved -PathType Leaf)) { return $resolved }
            } catch {}
        }
        return $commandPath
    }

    $roots = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Python'),
        (Join-Path $env:ProgramFiles 'Python*'),
        (Join-Path $RuntimeRoot 'Python')
    )

    foreach ($root in $roots) {
        $items = Get-ChildItem -Path $root -Filter python.exe -File -Recurse -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending
        $candidate = $items | Select-Object -First 1
        if ($candidate) { return $candidate.FullName }
    }
    return $null
}

function Find-BlenderPath {
    $commandPath = Find-CommandPath @('blender.exe', 'blender')
    if ($commandPath) { return $commandPath }

    $roots = @(
        (Join-Path $env:ProgramFiles 'Blender Foundation'),
        (Join-Path ${env:ProgramFiles(x86)} 'Blender Foundation'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Blender Foundation'),
        (Join-Path $RuntimeRoot 'Blender')
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Container) }

    foreach ($root in $roots) {
        $candidate = Get-ChildItem -LiteralPath $root -Filter blender.exe -File -Recurse -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending |
            Select-Object -First 1
        if ($candidate) { return $candidate.FullName }
    }
    return $null
}

function Invoke-Download([string]$Uri, [string]$Destination) {
    $parent = Split-Path -Parent $Destination
    if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $partial = "$Destination.part"
    Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
    Write-Host "[download] $Uri" -ForegroundColor DarkCyan
    Invoke-WebRequest -Uri $Uri -OutFile $partial -UseBasicParsing
    if (-not (Test-Path -LiteralPath $partial -PathType Leaf)) { throw "Download did not create file: $Destination" }
    if ((Get-Item -LiteralPath $partial).Length -lt 1024) { throw "Downloaded file is unexpectedly small: $Destination" }
    Move-Item -LiteralPath $partial -Destination $Destination -Force
}

function Assert-ValidSignature([string]$Path) {
    $signature = Get-AuthenticodeSignature -FilePath $Path
    if ($signature.Status -ne 'Valid') {
        throw "Authenticode verification failed for $Path ($($signature.Status))."
    }
}

function Install-Exe([string]$Uri, [string]$Label, [string[]]$Arguments) {
    $file = Join-Path $env:TEMP ("cws-" + [Guid]::NewGuid().ToString('N') + '.exe')
    try {
        Write-Host "[setup] Installing missing $Label from official fallback source..." -ForegroundColor Yellow
        Invoke-Download $Uri $file
        Assert-ValidSignature $file
        $process = Start-Process -FilePath $file -ArgumentList $Arguments -Wait -PassThru
        if ($process.ExitCode -notin @(0, 3010)) { throw "$Label installer failed with exit code $($process.ExitCode)." }
    } finally {
        Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
    }
}

function Install-Msi([string]$Uri, [string]$Label) {
    $file = Join-Path $env:TEMP ("cws-" + [Guid]::NewGuid().ToString('N') + '.msi')
    try {
        Write-Host "[setup] Installing missing $Label from official fallback source..." -ForegroundColor Yellow
        Invoke-Download $Uri $file
        Assert-ValidSignature $file
        $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', "`"$file`"", '/qn', '/norestart') -Wait -PassThru
        if ($process.ExitCode -notin @(0, 3010)) { throw "$Label MSI failed with exit code $($process.ExitCode)." }
    } finally {
        Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
    }
}

function Get-GitHubReleaseAssetUrl([string]$Repository, [string]$AssetRegex) {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest" -Headers @{ 'User-Agent' = 'CWS-Dev-Setup' }
    $asset = $release.assets | Where-Object { $_.name -match $AssetRegex } | Select-Object -First 1
    if (-not $asset) { throw "No matching official release asset found for $Repository ($AssetRegex)." }
    return $asset.browser_download_url
}

function Install-WingetPackage([string]$Id, [string]$Label) {
    $winget = Find-CommandPath @('winget.exe', 'winget')
    if (-not $winget) { return $false }
    Write-Host "[setup] Installing missing $Label ($Id) with winget..." -ForegroundColor Yellow
    & $winget install --id $Id --exact --source winget --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        Add-Warning "winget failed for $Label; trying official fallback."
        return $false
    }
    Refresh-ProcessPath
    return $true
}

function Install-OfficialFallback([string]$Name) {
    switch ($Name) {
        'Git' {
            $uri = Get-GitHubReleaseAssetUrl 'git-for-windows/git' '64-bit\.exe$'
            Install-Exe $uri 'Git' @('/VERYSILENT', '/NORESTART', '/NOCANCEL', '/SP-')
        }
        'VSCode' {
            Install-Exe 'https://update.code.visualstudio.com/latest/win32-x64-system/stable' 'Visual Studio Code' @('/VERYSILENT', '/NORESTART', '/MERGETASKS=!runcode')
        }
        'GitHubCLI' {
            $uri = Get-GitHubReleaseAssetUrl 'cli/cli' 'windows_amd64\.msi$'
            Install-Msi $uri 'GitHub CLI'
        }
        'Python' {
            $uri = "https://www.python.org/ftp/python/$PythonFallbackVersion/python-$PythonFallbackVersion-amd64.exe"
            Install-Exe $uri "Python $PythonFallbackVersion" @('/quiet', 'InstallAllUsers=1', 'PrependPath=1', 'Include_pip=1', 'Include_test=0')
        }
        'Node' {
            $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
            $lts = $index | Where-Object { $_.lts -and ($_.files -contains 'win-x64-msi') } | Select-Object -First 1
            if (-not $lts) { throw 'Could not resolve current Node.js LTS Windows MSI.' }
            $uri = "https://nodejs.org/dist/$($lts.version)/node-$($lts.version)-x64.msi"
            Install-Msi $uri 'Node.js LTS'
        }
        default { throw "No official fallback is defined for $Name." }
    }
    Refresh-ProcessPath
}

function Ensure-CoreTool([string]$Name, [string[]]$Commands, [string]$WingetId) {
    if (Find-CommandPath $Commands) {
        Write-Host "[keep] $Name already available." -ForegroundColor Green
        return
    }
    $installed = Install-WingetPackage $WingetId $Name
    if (-not $installed -or -not (Find-CommandPath $Commands)) {
        Install-OfficialFallback $Name
    }
    if (-not (Find-CommandPath $Commands)) { throw "$Name installation completed but executable is still unavailable." }
}

function Ensure-Blender {
    $existing = Find-BlenderPath
    if ($existing) {
        Write-Host '[keep] Blender already available.' -ForegroundColor Green
        return $existing
    }

    $installed = Install-WingetPackage 'BlenderFoundation.Blender' 'Blender'
    if ($installed) {
        $existing = Find-BlenderPath
        if ($existing) { return $existing }
    }

    Write-Host '[setup] winget unavailable/failed; using official Blender portable ZIP fallback...' -ForegroundColor Yellow
    $blenderRoot = Join-Path $RuntimeRoot 'Blender'
    $zip = Join-Path $env:TEMP "blender-$BlenderVersion-windows-x64.zip"
    $uri = "https://download.blender.org/release/$BlenderSeries/blender-$BlenderVersion-windows-x64.zip"
    try {
        Invoke-Download $uri $zip
        New-Item -ItemType Directory -Path $blenderRoot -Force | Out-Null
        Expand-Archive -LiteralPath $zip -DestinationPath $blenderRoot -Force
    } finally {
        Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
    }

    $existing = Find-BlenderPath
    if (-not $existing) { throw 'Blender portable fallback completed but blender.exe could not be located.' }
    return $existing
}

function Ensure-PythonPackages([string]$PythonExe) {
    if (-not $PythonExe -or -not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) {
        throw 'Python executable unavailable while ensuring Python packages.'
    }

    & $PythonExe -m pip --version *> $null
    if ($LASTEXITCODE -ne 0) {
        & $PythonExe -m ensurepip --upgrade
        if ($LASTEXITCODE -ne 0) { throw 'pip bootstrap failed.' }
    }

    $packages = @(
        @{ Import = 'pytest'; Spec = 'pytest>=8,<10' },
        @{ Import = 'requests'; Spec = 'requests>=2.31,<3' },
        @{ Import = 'boto3'; Spec = 'boto3>=1.35,<2' },
        @{ Import = 'PIL'; Spec = 'Pillow>=10,<13' }
    )

    foreach ($package in $packages) {
        & $PythonExe -c "import $($package.Import)" *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[keep] Python package $($package.Import) already available." -ForegroundColor Green
            continue
        }
        Write-Host "[setup] Installing $($package.Spec)..." -ForegroundColor Yellow
        & $PythonExe -m pip install --disable-pip-version-check --quiet --no-input $package.Spec
        if ($LASTEXITCODE -ne 0) { throw "Python package installation failed: $($package.Spec)" }
    }

    & $PythonExe -m pytest --version *> $null
    if ($LASTEXITCODE -ne 0) { throw 'pytest verification failed after package setup.' }
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
    $lines.Add(('Warnings: {0}' -f ($(if ($Warnings.Count) { $Warnings -join '; ' } else { 'NONE' }))))
    $lines.Add(('Blocker: {0}' -f ($(if ($Blockers.Count) { $Blockers -join '; ' } else { 'NONE' }))))
    $lines.Add(('Overall: {0}' -f ($(if ($Blockers.Count) { 'BLOCKED' } else { 'PASS' }))))
    $lines | Set-Content -LiteralPath $ReportPath -Encoding UTF8
    Write-Host "[report] $ReportPath" -ForegroundColor Cyan
}

try {
    Write-Host 'CWS Windows development setup' -ForegroundColor Cyan
    Write-Host 'Safe to rerun: detect first, install only missing prerequisites, preserve repo and credentials.'
    Write-Host 'winget is optional: official-source fallbacks are used when winget is unavailable.'

    Write-Step 'Preflight'
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'This setup is Windows-only.' }
    Write-Result 'Windows' ([Environment]::OSVersion.Version.ToString())
    if (-not (Test-IsAdministrator)) { throw 'Administrator elevation is required. Run CWS_DEV_SETUP.bat and approve UAC.' }
    Write-Result 'Administrator' 'PASS'

    New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
    $env:CWS_DIR = $RuntimeRoot
    Write-Result 'CWS_DIR_Process' $RuntimeRoot

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
    if ($Blockers.Count -gt 0) { throw ($Blockers -join '; ') }

    Refresh-ProcessPath
    $wingetPath = Find-CommandPath @('winget.exe', 'winget')
    if ($wingetPath) {
        Write-Result 'winget' (Get-ToolVersion 'winget.exe')
    } else {
        Write-Result 'winget' 'MISSING - OFFICIAL FALLBACK ENABLED' Yellow
    }

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

    Write-Step 'Detect and install missing tools'
    Ensure-CoreTool 'Git' @('git.exe', 'git') 'Git.Git'
    Ensure-CoreTool 'VSCode' @('code.cmd', 'code.exe', 'code') 'Microsoft.VisualStudioCode'
    Ensure-CoreTool 'GitHubCLI' @('gh.exe', 'gh') 'GitHub.cli'
    Ensure-CoreTool 'Python' @('python.exe', 'python') 'Python.Python.3.12'
    Ensure-CoreTool 'Node' @('node.exe', 'node') 'OpenJS.NodeJS.LTS'
    Refresh-ProcessPath

    $blenderPath = Ensure-Blender
    $pythonPath = Find-PythonPath
    Ensure-PythonPackages $pythonPath
    Ensure-CodexExtension
    Write-Result 'Tools_Install' 'PASS'

    Write-Step 'Verify toolchain'
    $toolChecks = @(
        [pscustomobject]@{ Name = 'Git'; Command = 'git.exe'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'VSCode'; Command = 'code.cmd'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'GitHubCLI'; Command = 'gh.exe'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'Node'; Command = 'node.exe'; Arguments = @('--version') },
        [pscustomobject]@{ Name = 'npm'; Command = 'npm.cmd'; Arguments = @('--version') }
    )
    foreach ($check in $toolChecks) {
        Refresh-ProcessPath
        $version = Get-ToolVersion $check.Command $check.Arguments
        if (-not $version) { throw "Verification failed for $($check.Name)." }
        Write-Result $check.Name $version
    }

    $pythonPath = Find-PythonPath
    $pythonVersion = Get-ExecutableVersion $pythonPath @('--version')
    if (-not $pythonVersion) { throw 'Python verification failed.' }
    Write-Result 'Python_Path' $pythonPath
    Write-Result 'Python_Version' $pythonVersion

    $pytestVersion = (& $pythonPath -m pytest --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'pytest verification failed.' }
    Write-Result 'pytest' (($pytestVersion -split "`r?`n")[0])

    foreach ($module in @('requests', 'boto3', 'PIL')) {
        & $pythonPath -c "import $module" *> $null
        if ($LASTEXITCODE -ne 0) { throw "Python import verification failed: $module" }
        Write-Result "Python_$module" 'PASS'
    }

    $blenderPath = Find-BlenderPath
    $blenderVersion = Get-ExecutableVersion $blenderPath @('--version')
    if (-not $blenderVersion) { throw 'Blender verification failed.' }
    Write-Result 'Blender_Path' $blenderPath
    Write-Result 'Blender_Version' $blenderVersion

    $codePath = Find-CommandPath @('code.cmd', 'code.exe', 'code')
    $extensions = & $codePath --list-extensions 2>$null
    if ($extensions -notcontains 'openai.chatgpt') { throw 'Codex IDE extension verification failed.' }
    Write-Result 'Codex_IDE' 'openai.chatgpt PRESENT'

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

    Write-Step 'GitHub CLI authentication'
    if ($SkipGitHubAuth) {
        Write-Result 'GitHub_Auth' 'SKIPPED' Yellow
    } else {
        & gh.exe auth status 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Result 'GitHub_Auth' 'PASS'
        } else {
            Add-Warning 'GitHub CLI is not authenticated. Normal Git operations remain usable if repository fetch succeeds.'
            Write-Result 'GitHub_Auth' 'UNAUTHENTICATED - OPTIONAL' Yellow
        }
    }

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
    if ($Warnings.Count -gt 0) {
        Write-Host 'Warnings:' -ForegroundColor Yellow
        $Warnings | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
    }
    exit 0
} catch {
    if (-not $Blockers.Contains($_.Exception.Message)) { $Blockers.Add($_.Exception.Message) }
    Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
    Write-SetupReport
    exit 1
}
