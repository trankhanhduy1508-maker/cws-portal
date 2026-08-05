param(
  [ValidateSet('install','start','stop','remove','status','cycle')]
  [string]$Action = 'status',
  [string]$Python = 'C:\Users\Administrator\Tools\Python312\python.exe',
  [string]$Repo = 'C:\Users\Administrator\cws-portal',
  [string]$Log = 'C:\Users\Administrator\cws-portal\worker\cws-service-events.jsonl'
)

$ErrorActionPreference = 'Stop'
$serviceHost = Join-Path $Repo 'worker\windows_service_host.py'
if (!(Test-Path -LiteralPath $Python) -or !(Test-Path -LiteralPath $serviceHost)) { throw 'service host or Python is missing' }
$args = "`"$serviceHost`""
switch ($Action) {
  'install' {
    & $Python $serviceHost --startup auto install
    & sc.exe failure CWSNodeAgentStaging reset= 86400 actions= restart/5000/restart/15000/none/0
    [Environment]::SetEnvironmentVariable('CWS_SERVICE_LOG', $Log, 'Machine')
  }
  'start' { & $Python $serviceHost start }
  'stop' { & $Python $serviceHost --wait 10 stop }
  'remove' { & $Python $serviceHost remove }
  'status' { & sc.exe query CWSNodeAgentStaging }
  'cycle' { & $Python $serviceHost --wait 10 stop; & $Python $serviceHost start }
}
