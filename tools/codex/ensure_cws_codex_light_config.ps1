param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'

function Set-TopLevelTomlKey {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.Generic.List[string]]$Lines,
        [Parameter(Mandatory = $true)]
        [string]$Key,
        [Parameter(Mandatory = $true)]
        [string]$ValueLiteral
    )

    $sectionIndex = $Lines.Count
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match '^\s*\[') {
            $sectionIndex = $i
            break
        }
    }

    $pattern = '^\s*' + [regex]::Escape($Key) + '\s*='
    $matches = New-Object System.Collections.Generic.List[int]
    for ($i = 0; $i -lt $sectionIndex; $i++) {
        if ($Lines[$i] -match $pattern) {
            $matches.Add($i)
        }
    }

    $canonicalLine = "$Key = $ValueLiteral"
    if ($matches.Count -eq 0) {
        if ($sectionIndex -gt 0 -and $Lines[$sectionIndex - 1].Trim().Length -ne 0) {
            $Lines.Insert($sectionIndex, '')
            $sectionIndex++
        }
        $Lines.Insert($sectionIndex, $canonicalLine)
        return
    }

    $firstIndex = $matches[0]
    $Lines[$firstIndex] = $canonicalLine

    for ($m = $matches.Count - 1; $m -ge 1; $m--) {
        $Lines.RemoveAt($matches[$m])
    }
}

$configDirectory = Split-Path -Parent $ConfigPath
if (-not (Test-Path -LiteralPath $configDirectory)) {
    New-Item -ItemType Directory -Path $configDirectory -Force | Out-Null
}

$originalText = ''
if (Test-Path -LiteralPath $ConfigPath) {
    $originalText = [System.IO.File]::ReadAllText($ConfigPath)
}

$normalizedText = $originalText -replace "`r`n", "`n"
$rawLines = @()
if ($normalizedText.Length -gt 0) {
    $rawLines = $normalizedText -split "`n", -1
    if ($rawLines.Count -gt 0 -and $rawLines[$rawLines.Count - 1] -eq '') {
        $rawLines = $rawLines[0..($rawLines.Count - 2)]
    }
}

$lines = New-Object 'System.Collections.Generic.List[string]'
foreach ($line in $rawLines) {
    $lines.Add([string]$line)
}

# Balanced local-autonomy posture:
# - on-request: sandboxed routine work does not ask by default
# - auto_review: eligible escalations are reviewed automatically
# - workspace-write: preserve filesystem sandbox protection
Set-TopLevelTomlKey -Lines $lines -Key 'approval_policy' -ValueLiteral '"on-request"'
Set-TopLevelTomlKey -Lines $lines -Key 'approvals_reviewer' -ValueLiteral '"auto_review"'
Set-TopLevelTomlKey -Lines $lines -Key 'sandbox_mode' -ValueLiteral '"workspace-write"'

$newText = ($lines -join "`r`n").TrimEnd() + "`r`n"
if ($newText -eq ($originalText -replace "(?<!`r)`n", "`r`n")) {
    Write-Output '[CWS] Codex config already matches CWS Light V2.'
    exit 0
}

if (Test-Path -LiteralPath $ConfigPath) {
    $backupPath = "$ConfigPath.cws-light-v2.bak"
    Copy-Item -LiteralPath $ConfigPath -Destination $backupPath -Force
    Write-Output "[CWS] Backed up previous Codex config to: $backupPath"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($ConfigPath, $newText, $utf8NoBom)
Write-Output "[CWS] Updated Codex config: $ConfigPath"
Write-Output '[CWS] Effective CWS Light V2 posture: approval_policy=on-request, approvals_reviewer=auto_review, sandbox_mode=workspace-write.'
