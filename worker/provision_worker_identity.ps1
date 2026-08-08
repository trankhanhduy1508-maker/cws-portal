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
  [string]$B2Endpoint = 's3.us-west-004.backblazeb2.com',
  [string]$B2Bucket = 'MTEB90',
  [string]$B2OutputPrefix = 'renders',
  [string]$BlenderExe,
  [Security.SecureString]$B2KeyId,
  [Security.SecureString]$B2AppKey,
  [switch]$ConfigureB2Only
)

$ErrorActionPreference = 'Stop'
$store = [IO.Path]::GetFullPath($StorePath)
$sql = [IO.Path]::GetFullPath($SqlOut)
$directory = [IO.Path]::GetDirectoryName($store)
if ([string]::IsNullOrWhiteSpace($directory)) { throw 'StorePath must include a directory' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null

# The DPAPI operation must run as the same dedicated account that will run
# Node Agent. This script does not print or accept a plaintext token.
icacls $directory /inheritance:r | Out-Null
icacls $directory /grant:r "${ServiceAccount}:(OI)(CI)(M)" "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" | Out-Null

if (-not $ConfigureB2Only) {
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
}
else {
  $resolvedWorkerId = [Environment]::GetEnvironmentVariable('CWS_WORKER_ID', 'User')
  if (-not $resolvedWorkerId -or -not (Test-Path -LiteralPath $store -PathType Leaf)) {
    throw 'Existing Worker identity and DPAPI store are required for -ConfigureB2Only'
  }
}

New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
[Environment]::SetEnvironmentVariable('CWS_BACKEND_URL', $BackendUrl, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKER_ID', $resolvedWorkerId, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKER_CREDENTIAL_FILE', $store, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKSPACE', [IO.Path]::GetFullPath($Workspace), 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_ENDPOINT', $B2Endpoint, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_BUCKET', $B2Bucket, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_OUTPUT_PREFIX', $B2OutputPrefix, 'User')
if ($pythonPath) { [Environment]::SetEnvironmentVariable('CWS_PYTHON_EXE', $pythonPath, 'User') }
if ($BlenderExe) {
  $blender = [IO.Path]::GetFullPath($BlenderExe)
  if (-not (Test-Path -LiteralPath $blender -PathType Leaf)) { throw 'BlenderExe does not exist' }
  [Environment]::SetEnvironmentVariable('CWS_BLENDER_EXE', $blender, 'User')
}

if (($null -eq $B2KeyId) -xor ($null -eq $B2AppKey)) {
  throw 'B2KeyId and B2AppKey must be supplied together'
}
if ($null -ne $B2KeyId) {
  $keyIdPtr = [IntPtr]::Zero
  $appKeyPtr = [IntPtr]::Zero
  $keyIdPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($B2KeyId)
  $appKeyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($B2AppKey)
  try {
    $keyIdPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyIdPtr)
    $appKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($appKeyPtr)
    if (-not $keyIdPlain -or -not $appKeyPlain) { throw 'B2 credentials cannot be empty' }
    [Environment]::SetEnvironmentVariable('CWS_B2_KEY_ID', $keyIdPlain, 'User')
    [Environment]::SetEnvironmentVariable('CWS_B2_APP_KEY', $appKeyPlain, 'User')
  }
  finally {
    if ($keyIdPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyIdPtr) }
    if ($appKeyPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($appKeyPtr) }
    $keyIdPlain = $null
    $appKeyPlain = $null
  }
}

if (-not $ConfigureB2Only) {
  Write-Host "Provisioned DPAPI store and least-privilege ACL for $ServiceAccount."
  Write-Host "Hash-only SQL written to $sql; plaintext credential was not printed."
}
Write-Host "Configured non-secret CWS runtime values for Worker $resolvedWorkerId."
if ($null -ne $B2KeyId) { Write-Host 'Configured scoped B2 credentials without printing them.' }
