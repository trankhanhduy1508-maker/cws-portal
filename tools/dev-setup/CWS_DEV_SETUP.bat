@echo off
setlocal

rem Thin one-click launcher. All setup logic lives in the PowerShell script.
set "SCRIPT=%~dp0CWS_DEV_SETUP.ps1"

if not exist "%SCRIPT%" (
  echo [FAIL] Missing setup script: "%SCRIPT%"
  pause
  exit /b 1
)

rem winget installs require elevation. Re-launch only when necessary.
fltmc >nul 2>&1
if errorlevel 1 (
  echo [INFO] Requesting Administrator approval for the setup run...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%SCRIPT%'"
  if errorlevel 1 (
    echo [FAIL] Could not request Administrator approval.
    pause
    exit /b 1
  )
  exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" echo [FAIL] CWS development setup stopped with exit code %EXIT_CODE%.
if "%EXIT_CODE%"=="0" echo [DONE] CWS development setup completed.
pause
exit /b %EXIT_CODE%
