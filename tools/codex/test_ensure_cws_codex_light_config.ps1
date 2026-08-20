Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-TemporaryDirectory {
    $path = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    return $path
}

function Remove-TemporaryDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function Assert-True {
    param(
        [Parameter(Mandatory = $true)]
        [bool]$Condition,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Assert-Equal {
    param(
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        $Actual,
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        $Expected,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($Actual -ne $Expected) {
        throw "$Message`nExpected: $Expected`nActual: $Actual"
    }
}

function Assert-Contains {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [Parameter(Mandatory = $true)]
        [string]$Needle,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $Text.Contains($Needle)) {
        throw "$Message`nMissing: $Needle`nText: $Text"
    }
}

function Invoke-NativeProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory,
        [hashtable]$Environment = @{}
    )

    $savedEnvironment = @{}
    foreach ($key in $Environment.Keys) {
        $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, [string]$Environment[$key], 'Process')
    }

    $originalLocation = Get-Location
    try {
        if ($WorkingDirectory) {
            Set-Location -LiteralPath $WorkingDirectory
        }

        $output = & $FilePath @ArgumentList 2>&1
        $exitCode = $LASTEXITCODE

        return [pscustomobject]@{
            ExitCode = $exitCode
            StdOut = (($output | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] } | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine)
            StdErr = (($output | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] } | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine)
        }
    }
    finally {
        Set-Location -LiteralPath $originalLocation
        foreach ($key in $savedEnvironment.Keys) {
            [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process')
        }
    }
}

function Get-NormalizedFileContent {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $text = [System.IO.File]::ReadAllText($Path)
    return $text -replace "`r`n", "`n"
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$helperPath = Join-Path $repoRoot 'tools\codex\ensure_cws_codex_light_config.ps1'
$launcherPath = Join-Path $repoRoot 'CWS_CODEX_LIGHT.cmd'

Assert-True (Test-Path -LiteralPath $helperPath) "Helper script not found: $helperPath"
Assert-True (Test-Path -LiteralPath $launcherPath) "Launcher script not found: $launcherPath"

$sandboxRoot = New-TemporaryDirectory
try {
    $emptyConfigPath = Join-Path $sandboxRoot 'empty-user\.codex\config.toml'
    $emptyRun = Invoke-NativeProcess -FilePath 'powershell.exe' -ArgumentList @(
        '-NoLogo',
        '-NoProfile',
        '-File',
        $helperPath,
        '-ConfigPath',
        $emptyConfigPath
    ) -WorkingDirectory $repoRoot

    Assert-Equal $emptyRun.ExitCode 0 "Helper should succeed for an absent config path."
    Assert-True (Test-Path -LiteralPath $emptyConfigPath) "Helper should create the config file for an absent path."
    $emptyConfig = Get-NormalizedFileContent -Path $emptyConfigPath
    Assert-Contains $emptyConfig 'approval_policy = "on-request"' 'Empty config should contain the canonical approval policy.'
    Assert-Contains $emptyConfig 'approvals_reviewer = "auto_review"' 'Empty config should contain the canonical approvals reviewer.'
    Assert-Contains $emptyConfig 'sandbox_mode = "workspace-write"' 'Empty config should contain the canonical sandbox mode.'

    $existingUserRoot = Join-Path $sandboxRoot 'existing-user'
    $existingConfigDir = Join-Path $existingUserRoot '.codex'
    New-Item -ItemType Directory -Path $existingConfigDir -Force | Out-Null
    $existingConfigPath = Join-Path $existingConfigDir 'config.toml'
    $existingConfigText = @'
approval_policy = "never"
approval_policy = "on-failure"
approvals_reviewer = "manual"
sandbox_mode = "danger-full-access"

[profiles.default]
model = "gpt-5"
'@
    [System.IO.File]::WriteAllText($existingConfigPath, $existingConfigText, [System.Text.UTF8Encoding]::new($false))

    $existingRun = Invoke-NativeProcess -FilePath 'powershell.exe' -ArgumentList @(
        '-NoLogo',
        '-NoProfile',
        '-File',
        $helperPath,
        '-ConfigPath',
        $existingConfigPath
    ) -WorkingDirectory $repoRoot

    Assert-Equal $existingRun.ExitCode 0 "Helper should succeed for an existing config."
    $backupPath = "$existingConfigPath.cws-light-v2.bak"
    Assert-True (Test-Path -LiteralPath $backupPath) "Helper should create a backup when rewriting an existing config."
    $existingConfig = Get-NormalizedFileContent -Path $existingConfigPath
    Assert-Equal ([regex]::Matches($existingConfig, '(?m)^approval_policy\s*=')).Count 1 'Duplicate approval_policy keys should collapse to one canonical top-level entry.'
    Assert-Equal ([regex]::Matches($existingConfig, '(?m)^approvals_reviewer\s*=')).Count 1 'approvals_reviewer should appear once at top level.'
    Assert-Equal ([regex]::Matches($existingConfig, '(?m)^sandbox_mode\s*=')).Count 1 'sandbox_mode should appear once at top level.'
    Assert-Contains $existingConfig 'approval_policy = "on-request"' 'Existing config should rewrite approval_policy to the canonical value.'
    Assert-Contains $existingConfig 'approvals_reviewer = "auto_review"' 'Existing config should rewrite approvals_reviewer to the canonical value.'
    Assert-Contains $existingConfig 'sandbox_mode = "workspace-write"' 'Existing config should rewrite sandbox_mode to the canonical value.'
    Assert-Contains $existingConfig '[profiles.default]' 'Existing config should preserve the section header.'
    Assert-Contains $existingConfig 'model = "gpt-5"' 'Existing config should preserve section contents.'

    $launcherUserRoot = Join-Path $sandboxRoot 'launcher-user'
    New-Item -ItemType Directory -Path $launcherUserRoot -Force | Out-Null
    $fakeBin = Join-Path $sandboxRoot 'fake-bin'
    New-Item -ItemType Directory -Path $fakeBin -Force | Out-Null
    $fakeCodexPath = Join-Path $fakeBin 'codex.cmd'
    $fakeCodexScript = @'
@echo off
echo FAKE_CODEX_MARKER
if defined FAKE_CODEX_MARKER_FILE (
  >"%FAKE_CODEX_MARKER_FILE%" echo invoked
)
exit /b 0
'@
    [System.IO.File]::WriteAllText($fakeCodexPath, $fakeCodexScript, [System.Text.UTF8Encoding]::new($false))
    $markerPath = Join-Path $sandboxRoot 'fake-codex-marker.txt'
    $launcherEnvironment = @{
        'CWS_REPO_ROOT' = $repoRoot
        'USERPROFILE' = $launcherUserRoot
        'PATH' = "$fakeBin;$($env:PATH)"
        'FAKE_CODEX_MARKER_FILE' = $markerPath
    }

    $launcherRun = Invoke-NativeProcess -FilePath 'cmd.exe' -ArgumentList @(
        '/d',
        '/c',
        $launcherPath
    ) -WorkingDirectory $repoRoot -Environment $launcherEnvironment

    Assert-Equal $launcherRun.ExitCode 0 "Launcher should exit 0 when pointed at a fake Codex CLI."
    Assert-Contains $launcherRun.StdOut 'FAKE_CODEX_MARKER' 'Launcher should invoke the fake Codex CLI from PATH.'
    Assert-True (Test-Path -LiteralPath $markerPath) "Fake Codex CLI should create its invocation marker file."
}
finally {
    Remove-TemporaryDirectory -Path $sandboxRoot
}
