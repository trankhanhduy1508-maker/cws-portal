# Hướng Dẫn Cài Đặt Codex CLI - Auto Approval

## Yêu Cầu Hệ Thống
- Windows 10/11
- PowerShell 5.1+
- Node.js LTS
- Tài khoản OpenAI có credit

## Bước 1: Cài Node.js
1. Vào https://nodejs.org
2. Tải bản LTS (bên trái)
3. Chạy file .msi → Next → Next → Finish

Kiểm tra:
node -v
npm -v

## Bước 2: Bật Quyền Chạy Script
Mở PowerShell Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Gõ Y → Enter

## Bước 3: Cài Codex CLI
npm install -g @openai/codex

Kiểm tra:
codex --version

## Bước 4: Lấy API Key
1. Vào https://platform.openai.com/api-keys
2. Đăng nhập → Create new secret key
3. Copy key (sk-proj-...)

## Bước 5: Set API Key
Tạm thời:
$env:OPENAI_API_KEY = "sk-proj-KEY-CUA-BAN"

Vĩnh viễn:
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-proj-KEY-CUA-BAN", "User")

## Bước 6: Chạy Codex Không Hỏi
codex -a never

Hoặc bypass hoàn toàn:
codex --dangerously-bypass-approvals-and-sandbox

## Script Auto Select Option 2 (File auto-codex.ps1)
$wshell = New-Object -ComObject WScript.Shell
$SEND_INTERVAL = 3
Write-Host "CLICK CHUOT VAO CUA SO CODEX TRUOC!" -ForegroundColor Yellow
$startTime = Get-Date
try {
    while ($true) {
        $elapsed = (New-TimeSpan -Start $startTime).ToString('hh\:mm\:ss')
        if ((Get-Date).Second -eq 0) {
            Write-Host "`r[$elapsed] Dang chay...    " -NoNewline -ForegroundColor DarkGray
        }
        Start-Sleep -Milliseconds 200
        $wshell.SendKeys("{DOWN}")
        Start-Sleep -Milliseconds 300
        $wshell.SendKeys("{ENTER}")
        Start-Sleep -Seconds $SEND_INTERVAL
    }
} finally {
    if ($wshell -ne $null) {
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($wshell) | Out-Null
    }
}

## Cách Dùng Overnight
1. PowerShell 1: codex -a never → paste prompt
2. PowerShell 2: .\auto-codex.ps1
3. CLICK CHUỘT VÀO CỬA SỔ CODEX
4. Không chạm chuột/bàn phím nữa
5. Đi ngủ

## Lỗi Thường Gặp
npm not recognized → Cài Node.js
running scripts is disabled → Set-ExecutionPolicy
Bad Request/401 → Key sai hoặc hết credit
Codex vẫn hỏi → Thêm -a never
Script focus sai → Bỏ AppActivate, click Codex trước
Hiện False liên tục → Click Codex trước khi chạy script

