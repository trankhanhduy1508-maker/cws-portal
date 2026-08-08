param(
  [string]$WorkerId,
  [string]$ServiceAccount = ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name),
  [string]$StorePath = (Join-Path $env:LOCALAPPDATA 'CWS\worker.dpapi'),
  [string]$SqlOut = (Join-Path $env:TEMP 'cws-worker-identity.sql'),
  [int]$FleetId = 2,
  [string]$GpuName,
  [int]$VramMb = 0,
  [int]$ExpiresDays = 90,
  [string]$BackendUrl = 'https://cws-portal.onrender.com',
  [string]$Workspace = (Join-Path $env:LOCALAPPDATA 'CWS\workspace'),
  [string]$BlenderExe
)

$ErrorActionPreference = 'Stop'
Write-Warning 'Recovery-only path: normal Architecture V1 enrollment uses enroll_worker_identity.ps1 with a one-time Backend ticket.'
$store = [IO.Path]::GetFullPath($StorePath)
$sql = [IO.Path]::GetFullPath($SqlOut)
$directory = [IO.Path]::GetDirectoryName($store)
if ([string]::IsNullOrWhiteSpace($directory)) { throw 'StorePath must include a directory' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null

# The DPAPI operation must run as the same dedicated account that will run
# Node Agent. This script does not print or accept a plaintext token.
icacls $directory /inheritance:r | Out-Null
icacls $directory /grant:r "${ServiceAccount}:(OI)(CI)(M)" "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" | Out-Null

$python = Get-Command python.exe -ErrorAction SilentlyContinue
if (-not $python) {
  $bundled = 'C:\Users\Administrator\Tools\Python312\python.exe'
  if (Test-Path -LiteralPath $bundled) { $pythonPath = $bundled }
  else { throw 'Python 3 is required to provision the Worker identity' }
}
else { $pythonPath = $python.Source }

if (-not $GpuName -and (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue)) {
  $gpu = & nvidia-smi.exe --query-gpu=name,memory.total --format=csv,noheader,nounits 2>$null | Select-Object -First 1
  if ($gpu -match '^\s*(.+),\s*(\d+)\s*$') {
    $GpuName = $Matches[1].Trim()
    $VramMb = [int]$Matches[2]
  }
}

$arguments = @((Join-Path $PSScriptRoot 'provision_worker_identity.py'))
if ($WorkerId) { $arguments += $WorkerId }
$arguments += @('--store', $store, '--sql-out', $sql, '--expires-days', $ExpiresDays,
  '--fleet-id', $FleetId, '--vram-mb', $VramMb)
if ($GpuName) { $arguments += @('--gpu-name', $GpuName) }
& $pythonPath @arguments
if ($LASTEXITCODE -ne 0) { throw "Provisioning helper failed with exit code $LASTEXITCODE" }
$resolvedWorkerId = (Select-String -LiteralPath $sql -Pattern "values \('([^']+)'" | Select-Object -First 1).Matches.Groups[1].Value
if (-not $resolvedWorkerId) { throw 'Could not resolve provisioned Worker ID from hash-only SQL' }
icacls $store /inheritance:r | Out-Null
icacls $store /grant:r "${ServiceAccount}:(R,W)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null

New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
[Environment]::SetEnvironmentVariable('CWS_BACKEND_URL', $BackendUrl, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKER_ID', $resolvedWorkerId, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKER_CREDENTIAL_FILE', $store, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKSPACE', [IO.Path]::GetFullPath($Workspace), 'User')
if ($pythonPath) { [Environment]::SetEnvironmentVariable('CWS_PYTHON_EXE', $pythonPath, 'User') }
if ($BlenderExe) {
  $blender = [IO.Path]::GetFullPath($BlenderExe)
  if (-not (Test-Path -LiteralPath $blender -PathType Leaf)) { throw 'BlenderExe does not exist' }
  [Environment]::SetEnvironmentVariable('CWS_BLENDER_EXE', $blender, 'User')
}

[Environment]::SetEnvironmentVariable('CWS_B2_ENDPOINT', $null, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_BUCKET', $null, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_KEY_ID', $null, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_APP_KEY', $null, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_OUTPUT_PREFIX', $null, 'User')

Write-Host "Provisioned DPAPI store and least-privilege ACL for $ServiceAccount."
Write-Host "Hash-only SQL written to $sql; plaintext credential was not printed."
Write-Host "Configured non-secret CWS runtime values for Worker $resolvedWorkerId."
Write-Host 'Worker storage uses short-lived job-scoped Backend capabilities; no B2 credential was installed.'
