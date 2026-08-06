param(
  [Parameter(Mandatory=$true)][string]$WorkerId,
  [Parameter(Mandatory=$true)][string]$ServiceAccount,
  [Parameter(Mandatory=$true)][string]$StorePath,
  [Parameter(Mandatory=$true)][string]$SqlOut,
  [int]$ExpiresDays = 90
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

$python = Get-Command python.exe -ErrorAction Stop
& $python.Source (Join-Path $PSScriptRoot 'provision_worker_identity.py') $WorkerId `
  --store $store --sql-out $sql --expires-days $ExpiresDays
if ($LASTEXITCODE -ne 0) { throw "Provisioning helper failed with exit code $LASTEXITCODE" }
icacls $store /inheritance:r | Out-Null
icacls $store /grant:r "${ServiceAccount}:(R,W)" "SYSTEM:(F)" "Administrators:(F)" | Out-Null
Write-Host "Provisioned DPAPI store and least-privilege ACL for $ServiceAccount."
Write-Host "Hash-only SQL written to $sql; plaintext credential was not printed."
