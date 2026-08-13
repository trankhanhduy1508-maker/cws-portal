$ErrorActionPreference = 'Stop'

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Run-Step([string]$Name, [scriptblock]$Action) {
    Write-Host "`n=== $Name ==="
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

Assert-Command git
Assert-Command node
Assert-Command npm
Assert-Command python

$nodeVersion = (node --version).Trim().TrimStart('v')
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -ne 22) {
    throw "Node major mismatch: expected 22 from .nvmrc/CI, found $nodeVersion"
}

$pythonVersion = (python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
if ($pythonVersion -ne '3.12') {
    throw "Python version mismatch: expected 3.12, found $pythonVersion"
}

Write-Host "CWS_WORKBENCH_NODE=$nodeVersion"
Write-Host "CWS_WORKBENCH_PYTHON=$pythonVersion"
Write-Host "CWS_WORKBENCH_SHA=$((git rev-parse HEAD).Trim())"

Run-Step 'Frontend tests' { npm test }
Run-Step 'Frontend build' { npm run build }
Run-Step 'Admin build' { npm run build:admin }
Run-Step 'Frontend lint' { npm run lint }

Push-Location backend
try {
    Run-Step 'Backend build' { npm run build }
    Run-Step 'Backend tests' { npm test -- --runInBand }
    Run-Step 'Backend lint check (non-fixing)' { npx eslint "{src,apps,libs,test}/**/*.ts" }
}
finally {
    Pop-Location
}

if ($IsWindows -or $env:OS -eq 'Windows_NT') {
    Run-Step 'Worker compile' { python -m compileall -q worker }
    Run-Step 'Worker tests' { python -m unittest discover -s worker -p 'test_*.py' }
}
else {
    Write-Host 'Worker native verification skipped: requires Windows.'
}

Write-Host "`n=== Git status ==="
git status --short
if ($LASTEXITCODE -ne 0) {
    throw 'git status failed'
}

Write-Host "`nCWS_WORKBENCH_LOCAL_VERIFICATION=PASS"
Write-Host 'Evidence level: local CODE VERIFICATION only; not runtime/production/Golden E2E proof.'
