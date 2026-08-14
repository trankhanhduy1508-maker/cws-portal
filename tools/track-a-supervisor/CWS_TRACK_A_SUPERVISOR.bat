@echo off
setlocal

set "SCRIPT=%~dp0track_a_supervisor.py"
set "CWS_SUPERVISOR_DB=%LOCALAPPDATA%\CWS\track-a-supervisor\jobs.sqlite3"

if not exist "%SCRIPT%" (
  echo [FAIL] Missing supervisor script: "%SCRIPT%"
  pause
  exit /b 1
)

where py >nul 2>&1
if not errorlevel 1 (
  py -3 "%SCRIPT%" %*
  set "EXIT_CODE=%ERRORLEVEL%"
  goto :finish
)

where python >nul 2>&1
if not errorlevel 1 (
  python "%SCRIPT%" %*
  set "EXIT_CODE=%ERRORLEVEL%"
  goto :finish
)

echo [FAIL] Python 3 is required for the local manifest tool.
echo        Run tools\dev-setup\CWS_DEV_SETUP.bat first, then retry.
set "EXIT_CODE=1"

:finish
echo.
if "%EXIT_CODE%"=="0" echo [DONE] Track A local manifest command completed.
if not "%EXIT_CODE%"=="0" echo [FAIL] Track A local manifest command failed with exit code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%
