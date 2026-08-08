param(
  [Parameter(Mandatory = $true)][string]$TicketFile,
  [string]$BackendUrl = 'https://cws-portal.onrender.com',
  [string]$ServiceAccount = ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name),
  [string]$StorePath = (Join-Path $env:LOCALAPPDATA 'CWS\worker.dpapi'),
  [string]$Workspace = (Join-Path $env:LOCALAPPDATA 'CWS\workspace'),
  [string]$BlenderExe
)

$ErrorActionPreference = 'Stop'
$ticket = [IO.Path]::GetFullPath($TicketFile)
$store = [IO.Path]::GetFullPath($StorePath)
$directory = [IO.Path]::GetDirectoryName($store)
if (-not (Test-Path -LiteralPath $ticket -PathType Leaf)) { throw 'Enrollment ticket file does not exist' }
New-Item -ItemType Directory -Force -Path $directory | Out-Null
icacls $directory /inheritance:r | Out-Null
icacls $directory /grant:r "${ServiceAccount}:(OI)(CI)(M)" "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" | Out-Null
icacls $ticket /inheritance:r | Out-Null
icacls $ticket /grant:r "${ServiceAccount}:(R)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null

$python = Get-Command python.exe -ErrorAction SilentlyContinue
if ($python) { $pythonPath = $python.Source }
elseif (Test-Path -LiteralPath 'C:\Users\Administrator\Tools\Python312\python.exe') {
  $pythonPath = 'C:\Users\Administrator\Tools\Python312\python.exe'
}
else { throw 'Python 3 is required to enroll the Worker identity' }

$workerId = & $pythonPath -c "import sys;sys.path.insert(0,r'$PSScriptRoot');from provision_worker_identity import stable_worker_id,windows_machine_guid;print(stable_worker_id(windows_machine_guid()))"
if ($LASTEXITCODE -ne 0 -or -not $workerId) { throw 'Could not derive stable Worker ID' }

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
  '--backend-url', $BackendUrl, '--ticket-file', $ticket, '--store', $store,
  '--worker-id', $workerId, '--hostname', $env:COMPUTERNAME, '--vram-mb', $vramMb)
if ($gpuName) { $arguments += @('--gpu-name', $gpuName) }
& $pythonPath @arguments
if ($LASTEXITCODE -ne 0) { throw "Worker enrollment failed with exit code $LASTEXITCODE" }

icacls $store /inheritance:r | Out-Null
icacls $store /grant:r "${ServiceAccount}:(R,W)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null
New-Item -ItemType Directory -Force -Path $Workspace | Out-Null
[Environment]::SetEnvironmentVariable('CWS_BACKEND_URL', $BackendUrl, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKER_ID', $workerId, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKER_CREDENTIAL_FILE', $store, 'User')
[Environment]::SetEnvironmentVariable('CWS_WORKSPACE', [IO.Path]::GetFullPath($Workspace), 'User')
[Environment]::SetEnvironmentVariable('CWS_PYTHON_EXE', $pythonPath, 'User')
if ($BlenderExe) {
  $blender = [IO.Path]::GetFullPath($BlenderExe)
  if (-not (Test-Path -LiteralPath $blender -PathType Leaf)) { throw 'BlenderExe does not exist' }
  [Environment]::SetEnvironmentVariable('CWS_BLENDER_EXE', $blender, 'User')
}

# Architecture V1: no long-lived storage or database master credential on Worker.
[Environment]::SetEnvironmentVariable('CWS_B2_KEY_ID', $null, 'User')
[Environment]::SetEnvironmentVariable('CWS_B2_APP_KEY', $null, 'User')
[Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', $null, 'User')
Write-Host "Worker $workerId enrolled. The one-time ticket was deleted after Backend acceptance."
