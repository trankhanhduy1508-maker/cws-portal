@echo off
setlocal EnableExtensions EnableDelayedExpansion
rem CWS Worker launcher for Render -> Supabase tasks and B2 outputs.
set "CWS_DIR=G:\CWS_Render"
set "PYTHON_DIR=%CWS_DIR%\PythonEmbed"
set "PYTHON_EXE=%PYTHON_DIR%\python.exe"
set "PYTHON_VERSION=3.12.7"
set "PYTHON_ZIP_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-embed-amd64.zip"
set "GETPIP_URL=https://bootstrap.pypa.io/get-pip.py"
set "COOLDOWN_SEC=15"
set "CWS_ENABLE_INTEGRATED_VIDEO_MERGE=false"
set "CWS_ENABLE_LEGACY_VIDEO_MERGE_FALLBACK=true"
if not defined CWS_SUPABASE_KEY echo [ERROR] Missing CWS_SUPABASE_KEY.& exit /b 1
if not defined CWS_B2_KEY_ID echo [ERROR] Missing CWS_B2_KEY_ID.& exit /b 1
if not defined CWS_B2_APP_KEY echo [ERROR] Missing CWS_B2_APP_KEY.& exit /b 1
if not exist "%CWS_DIR%" mkdir "%CWS_DIR%"
if not exist "%PYTHON_EXE%" goto :bootstrap
goto :preflight
:bootstrap
if not exist "%PYTHON_DIR%" mkdir "%PYTHON_DIR%"
curl -fL -o "%PYTHON_DIR%\python_embed.zip" "%PYTHON_ZIP_URL%" || exit /b 1
tar -xf "%PYTHON_DIR%\python_embed.zip" -C "%PYTHON_DIR%" || exit /b 1
del /q "%PYTHON_DIR%\python_embed.zip"
for %%f in ("%PYTHON_DIR%\python*._pth") do powershell -NoProfile -Command "(Get-Content '%%f') -replace '^#import site','import site' | Set-Content '%%f'"
if not exist "%PYTHON_DIR%\DLLs" mkdir "%PYTHON_DIR%\DLLs"
curl -fL -o "%PYTHON_DIR%\get-pip.py" "%GETPIP_URL%" || exit /b 1
"%PYTHON_EXE%" "%PYTHON_DIR%\get-pip.py" --quiet || exit /b 1
del /q "%PYTHON_DIR%\get-pip.py"
:preflight
"%PYTHON_EXE%" "%~dp0cws_worker.py" --preflight || exit /b 1
:supervise
"%PYTHON_EXE%" "%~dp0cws_worker.py"
timeout /t %COOLDOWN_SEC% /nobreak >nul
goto :supervise
