param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'

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

function Set-TopLevelTomlKey {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Key,
        [Parameter(Mandatory = $true)]
        [string]$ValueLiteral
    )

    # Intentionally use the script-scope $lines collection directly.
    # Windows PowerShell 5.1 can reject an empty List[string] passed through a
    # mandatory function parameter as EmptyStringNotAllowed, even when the
    # caller is representing an empty config. Keeping the collection out of
    # parameter binding removes that failure mode entirely.
    $sectionIndex = $lines.Count
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*\[') {
            $sectionIndex = $i
            break
        }
    }

    $pattern = '^\s*' + [regex]::Escape($Key) + '\s*='
    $matches = New-Object System.Collections.Generic.List[int]
    for ($i = 0; $i -lt $sectionIndex; $i++) {
        if ($lines[$i] -match $pattern) {
            $matches.Add($i)
        }
    }

    $canonicalLine = "$Key = $ValueLiteral"
    if ($matches.Count -eq 0) {
        if ($sectionIndex -gt 0 -and $lines[$sectionIndex - 1].Trim().Length -ne 0) {
            $lines.Insert($sectionIndex, '')
            $sectionIndex++
        }
        $lines.Insert($sectionIndex, $canonicalLine)
        return
    }

    $firstIndex = $matches[0]
    $lines[$firstIndex] = $canonicalLine

    for ($m = $matches.Count - 1; $m -ge 1; $m--) {
        $lines.RemoveAt($matches[$m])
    }
}

# Balanced local-autonomy posture:
# - on-request: sandboxed routine work does not ask by default
# - auto_review: eligible escalations are reviewed automatically
# - workspace-write: preserve filesystem sandbox protection
Set-TopLevelTomlKey -Key 'approval_policy' -ValueLiteral '"on-request"'
Set-TopLevelTomlKey -Key 'approvals_reviewer' -ValueLiteral '"auto_review"'
Set-TopLevelTomlKey -Key 'sandbox_mode' -ValueLiteral '"workspace-write"'

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
