param(
  [Parameter(Mandatory=$true)][string]$Blender,
  [ValidateSet('heavy-single','heavy-animation')][string]$Profile = 'heavy-single',
  [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runner = Join-Path $repo 'tests\blender\run_eevee_stress_render.py'
& python $runner --blender $Blender --profile $Profile --generate --timeout-seconds $TimeoutSeconds
if ($LASTEXITCODE -ne 0) { throw "EEVEE stress runner failed with exit code $LASTEXITCODE" }
