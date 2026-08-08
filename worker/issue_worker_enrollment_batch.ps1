param(
  [Parameter(Mandatory = $true)][string]$Aal2TokenFile,
  [Parameter(Mandatory = $true)][string]$WorkerIdsFile,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [string]$BackendUrl = 'https://cws-portal.onrender.com',
  [int]$FleetId = 2
)

$ErrorActionPreference = 'Stop'
$output = [IO.Path]::GetFullPath($OutputDirectory)
$principal = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
New-Item -ItemType Directory -Force -Path $output | Out-Null
icacls $output /inheritance:r | Out-Null
icacls $output /grant:r "${principal}:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" | Out-Null

$python = Get-Command python.exe -ErrorAction SilentlyContinue
if ($python) { $pythonPath = $python.Source }
elseif (Test-Path -LiteralPath 'C:\Users\Administrator\Tools\Python312\python.exe') {
  $pythonPath = 'C:\Users\Administrator\Tools\Python312\python.exe'
}
else { throw 'Python 3 is required to issue Worker enrollment tickets' }

& $pythonPath (Join-Path $PSScriptRoot 'issue_worker_enrollment_batch.py') `
  --backend-url $BackendUrl `
  --aal2-token-file ([IO.Path]::GetFullPath($Aal2TokenFile)) `
  --worker-ids-file ([IO.Path]::GetFullPath($WorkerIdsFile)) `
  --output-directory $output `
  --fleet-id $FleetId
if ($LASTEXITCODE -ne 0) { throw "Enrollment batch issue failed with exit code $LASTEXITCODE" }
Get-ChildItem -LiteralPath $output -Filter '*.ticket' | ForEach-Object {
  icacls $_.FullName /inheritance:r | Out-Null
  icacls $_.FullName /grant:r "${principal}:(F)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null
}
Write-Host 'Ticket files are short-lived. Transfer each only to its matching Worker and delete the batch directory after enrollment.'
