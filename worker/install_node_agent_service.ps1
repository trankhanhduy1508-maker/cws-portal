param(
  [ValidateSet('install','start','stop','remove','status','cycle')]
  [string]$Action = 'status',
  [string]$Python = '',
  [string]$Repo = '',
  [string]$StateRoot = '',
  [string]$BackendUrl = 'https://cws-portal.onrender.com',
  [string]$BlenderExe = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe',
  [string]$Log = ''
)

$ErrorActionPreference = 'Stop'
$serviceName = 'CWSNodeAgentProduction'
$serviceAccount = "NT SERVICE\$serviceName"
if ([string]::IsNullOrWhiteSpace($Repo)) { $Repo = Split-Path -Parent $PSScriptRoot }
if ([string]::IsNullOrWhiteSpace($Python)) {
  $pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
  if (-not $pythonCommand) { throw 'Python 3 is required for the canonical Node Agent service' }
  $Python = $pythonCommand.Source
}
if ([string]::IsNullOrWhiteSpace($StateRoot)) { $StateRoot = Join-Path $env:ProgramData 'CWS\state' }
if ([string]::IsNullOrWhiteSpace($Log)) { $Log = Join-Path $env:ProgramData 'CWS\cws-service-events.jsonl' }
$serviceHost = Join-Path $Repo 'worker\windows_service_host.py'
$agentScript = Join-Path $Repo 'worker\production_node_agent.py'
if (!(Test-Path -LiteralPath $Python -PathType Leaf) -or !(Test-Path -LiteralPath $serviceHost -PathType Leaf) -or !(Test-Path -LiteralPath $agentScript -PathType Leaf)) {
  throw 'canonical Python or Node Agent files are missing'
}
& $Python -c 'import win32service, win32serviceutil, win32event, servicemanager'
if ($LASTEXITCODE -ne 0) { throw 'pywin32 SCM dependencies are missing; install worker/requirements-production.txt first' }
if ($BlenderExe -and !(Test-Path -LiteralPath $BlenderExe -PathType Leaf)) { throw 'Blender executable is missing' }

function Set-MachineValue([string]$Name, [string]$Value) {
  [Environment]::SetEnvironmentVariable($Name, $Value, 'Machine')
}

switch ($Action) {
  'install' {
    New-Item -ItemType Directory -Force -Path $StateRoot | Out-Null
    $serviceDirectory = Split-Path -Parent $serviceHost
    Set-MachineValue 'CWS_BACKEND_URL' $BackendUrl
    Set-MachineValue 'CWS_SERVICE_ACCOUNT' $serviceAccount
    Set-MachineValue 'CWS_STATE_ROOT' ([IO.Path]::GetFullPath($StateRoot))
    Set-MachineValue 'CWS_WORKSPACE' ([IO.Path]::GetFullPath((Join-Path $StateRoot 'workspace')))
    Set-MachineValue 'CWS_PYTHON_EXE' ([IO.Path]::GetFullPath($Python))
    Set-MachineValue 'CWS_NODE_AGENT_SCRIPT' ([IO.Path]::GetFullPath($agentScript))
    if ($BlenderExe) { Set-MachineValue 'CWS_BLENDER_EXE' ([IO.Path]::GetFullPath($BlenderExe)) }
    Set-MachineValue 'CWS_SERVICE_LOG' ([IO.Path]::GetFullPath($Log))
    & $Python $serviceHost --startup auto install
    & sc.exe sidtype $serviceName unrestricted | Out-Host
    & sc.exe config $serviceName start= delayed-auto obj= $serviceAccount | Out-Host
    & sc.exe failure $serviceName reset= 86400 actions= restart/5000/restart/15000/restart/30000 | Out-Host
    & icacls.exe $StateRoot /grant:r "${serviceAccount}:(OI)(CI)(M)" 'SYSTEM:(OI)(CI)(F)' 'Administrators:(OI)(CI)(F)' | Out-Null
    & icacls.exe $serviceDirectory /grant:r "${serviceAccount}:(OI)(CI)(RX)" | Out-Null
  }
  'start' { & $Python $serviceHost start }
  'stop' { & $Python $serviceHost --wait 10 stop }
  'remove' { & $Python $serviceHost remove }
  'status' { & sc.exe query $serviceName }
  'cycle' { & $Python $serviceHost --wait 10 stop; & $Python $serviceHost start }
}
