param(
  [Parameter(Mandatory = $true)][string]$BootstrapTokenFile,
  [string]$BackendUrl = 'https://cws-portal.onrender.com',
  [string]$ServiceAccount = '',
  [string]$StateRoot = '',
  [string]$StorePath = '',
  [string]$Workspace = '',
  [string]$BlenderExe
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ServiceAccount)) { $ServiceAccount = $env:CWS_SERVICE_ACCOUNT }
if ([string]::IsNullOrWhiteSpace($ServiceAccount)) { throw 'CWS_SERVICE_ACCOUNT is required; interactive-user enrollment is disabled' }
if ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name -ne $ServiceAccount) {
  throw "Enrollment must run as the configured CWS service identity: $ServiceAccount"
}
if ([string]::IsNullOrWhiteSpace($StateRoot)) { $StateRoot = Join-Path $env:ProgramData 'CWS\state' }
if ([string]::IsNullOrWhiteSpace($StorePath)) { $StorePath = Join-Path $StateRoot 'worker.dpapi' }
if ([string]::IsNullOrWhiteSpace($Workspace)) { $Workspace = Join-Path $StateRoot 'workspace' }
$bootstrap = [IO.Path]::GetFullPath($BootstrapTokenFile)
$state = [IO.Path]::GetFullPath($StateRoot)
$store = [IO.Path]::GetFullPath($StorePath)
$identityMetadata = Join-Path $state 'worker-identity.json'
$directory = [IO.Path]::GetDirectoryName($store)
if (-not (Test-Path -LiteralPath $bootstrap -PathType Leaf)) { throw 'Site bootstrap capability file does not exist' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null
icacls $directory /inheritance:r | Out-Null
icacls $directory /grant:r "${ServiceAccount}:(OI)(CI)(M)" "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" | Out-Null
icacls $bootstrap /inheritance:r | Out-Null
icacls $bootstrap /grant:r "${ServiceAccount}:(R)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null

$pythonPath = $env:CWS_PYTHON_EXE
if ([string]::IsNullOrWhiteSpace($pythonPath)) {
  $python = Get-Command python.exe -ErrorAction SilentlyContinue
  if ($python) { $pythonPath = $python.Source }
}
if ([string]::IsNullOrWhiteSpace($pythonPath) -or !(Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
  throw 'CWS_PYTHON_EXE must point to the Golden Image Python runtime'
}

$gpuName = $null
$vramMb = 0
if (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue) {
  $gpu = & nvidia-smi.exe --query-gpu=name,memory.total --format=csv,noheader,nounits 2>$null | Select-Object -First 1
  if ($gpu -match '^\s*(.+),\s*(\d+)\s*$') {
    $gpuName = $Matches[1].Trim()
    $vramMb = [int]$Matches[2]
  }
}

$arguments = @((Join-Path $PSScriptRoot 'enroll_worker_identity.py'),
  '--backend-url', $BackendUrl, '--bootstrap-token-file', $bootstrap, '--store', $store,
  '--hostname', $env:COMPUTERNAME, '--vram-mb', $vramMb)
if ($gpuName) { $arguments += @('--gpu-name', $gpuName) }
$enrollmentOutput = & $pythonPath @arguments
if ($LASTEXITCODE -ne 0) { throw "Worker enrollment failed with exit code $LASTEXITCODE" }

$resolvedWorkerId = ($enrollmentOutput | Select-String -Pattern '^Enrolled CWS Worker: (cwsw_[a-f0-9]{32})$' | Select-Object -First 1).Matches.Groups[1].Value
if (-not $resolvedWorkerId) { throw 'Automatic enrollment did not return a canonical Worker ID' }

icacls $store /inheritance:r | Out-Null
icacls $store /grant:r "${ServiceAccount}:(R,W)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null
New-Item -ItemType Directory -Force -Path $state | Out-Null
New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
@{ worker_id = $resolvedWorkerId; credential_file = $store } |
  ConvertTo-Json -Compress | Set-Content -LiteralPath $identityMetadata -Encoding utf8
icacls $identityMetadata /inheritance:r | Out-Null
icacls $identityMetadata /grant:r "${ServiceAccount}:(R)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null
if ($BlenderExe) {
  $blender = [IO.Path]::GetFullPath($BlenderExe)
  if (-not (Test-Path -LiteralPath $blender -PathType Leaf)) { throw 'BlenderExe does not exist' }
}

# Architecture V1: no long-lived storage or database master credential on Worker.
[Environment]::SetEnvironmentVariable('CWS_B2_KEY_ID', $null, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_APP_KEY', $null, 'User')
[Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', $null, 'User')
Write-Host "Worker $resolvedWorkerId automatically enrolled. The site bootstrap capability was deleted after Backend acceptance."
