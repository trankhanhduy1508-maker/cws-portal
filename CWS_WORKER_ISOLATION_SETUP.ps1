[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)] [string] $PackageRoot,
    [Parameter(Mandatory = $true)] [string] $DataRoot,
    [Parameter(Mandatory = $true)] [string] $WorkerIdentity,
    [switch] $Apply,
    [string] $ConfirmPhrase
)

$ErrorActionPreference = 'Stop'
$package = [IO.Path]::GetFullPath($PackageRoot).TrimEnd('\')
$data = [IO.Path]::GetFullPath($DataRoot).TrimEnd('\')
if ($package -eq $data) { throw 'PackageRoot and DataRoot must be separate' }
if (-not (Test-Path -LiteralPath $package -PathType Container)) { throw 'PackageRoot missing' }
if (-not (Test-Path -LiteralPath $data -PathType Container)) { throw 'DataRoot missing' }
Write-Output "PLAN: package RX, data Modify for $WorkerIdentity; no service/firewall/power action."
if (-not $Apply) { exit 0 }
if ($ConfirmPhrase -ne 'APPLY CWS WORKER ACL') { throw 'Explicit confirmation required' }
if (-not $PSCmdlet.ShouldProcess($package, 'Replace package ACLs')) { exit 0 }
& icacls.exe $package /inheritance:r /grant:r "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" "${WorkerIdentity}:(OI)(CI)(RX)" /T /C
if ($LASTEXITCODE -ne 0) { throw 'Package ACL update failed' }
if (-not $PSCmdlet.ShouldProcess($data, 'Replace data ACLs')) { exit 0 }
& icacls.exe $data /inheritance:r /grant:r "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" "${WorkerIdentity}:(OI)(CI)(M)" /T /C
if ($LASTEXITCODE -ne 0) { throw 'Data ACL update failed' }
