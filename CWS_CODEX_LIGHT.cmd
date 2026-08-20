@echo off
setlocal EnableExtensions
title CWS Codex Light V2

rem Canonical lightweight Codex launcher for Founder-controlled local Windows work.
rem V2 reduces routine approval friction while preserving Codex sandbox protections.
rem Never put secrets, tokens, API keys, or machine-private credentials in this file.
rem HARD RULE: this launcher must never initiate or auto-confirm host power/session transitions.

if defined CWS_REPO_ROOT (
  set "CWS_REPO=%CWS_REPO_ROOT%"
) else (
  set "CWS_REPO=%USERPROFILE%\cws-portal-canonical-main"
)

if not exist "%CWS_REPO%\.git" (
  echo [CWS] Canonical repo not found:
  echo       %CWS_REPO%
  echo [CWS] Set CWS_REPO_ROOT to the canonical local repo path and retry.
  pause
  exit /b 1
)

set "CODEX_EXE="
for /f "delims=" %%I in ('where codex 2^>nul') do if not defined CODEX_EXE set "CODEX_EXE=%%I"

if not defined CODEX_EXE if exist "%LOCALAPPDATA%\Programs\OpenAI\Codex\bin\codex.exe" (
  set "CODEX_EXE=%LOCALAPPDATA%\Programs\OpenAI\Codex\bin\codex.exe"
)

if not defined CODEX_EXE (
  echo [CWS] Codex CLI was not found in PATH or the known local install path.
  echo [CWS] Verify the current official Codex installation before changing this launcher.
  pause
  exit /b 1
)

set "CWS_RUNTIME_TOOLS=%CWS_REPO%\.runtime-tools"
if not exist "%CWS_RUNTIME_TOOLS%" (
  mkdir "%CWS_RUNTIME_TOOLS%" >nul 2>nul
  if errorlevel 1 (
    echo [CWS] Failed to create repo-local runtime tools directory:
    echo       %CWS_RUNTIME_TOOLS%
    pause
    exit /b 1
  )
)

set "CWS_CODEX_CONFIG_HELPER=%CWS_REPO%\tools\codex\ensure_cws_codex_light_config.ps1"
if not exist "%CWS_CODEX_CONFIG_HELPER%" (
  echo [CWS] Missing canonical Codex config helper:
  echo       %CWS_CODEX_CONFIG_HELPER%
  echo [CWS] Update the canonical repository before using CWS Codex Light V2.
  pause
  exit /b 1
)

set "CODEX_CONFIG=%USERPROFILE%\.codex\config.toml"
powershell.exe -NoLogo -NoProfile -File "%CWS_CODEX_CONFIG_HELPER%" -ConfigPath "%CODEX_CONFIG%"
set "CWS_CONFIG_EXIT=%ERRORLEVEL%"
if not "%CWS_CONFIG_EXIT%"=="0" (
  echo [CWS] Failed to prepare the machine-local Codex configuration.
  echo [CWS] Existing config was not intentionally discarded; inspect the helper output above.
  pause
  exit /b %CWS_CONFIG_EXIT%
)

cd /d "%CWS_REPO%"
if errorlevel 1 (
  echo [CWS] Failed to enter canonical repo.
  pause
  exit /b 1
)

set "CWS_CODEX_LIGHT=2"

echo [CWS] Starting lightweight Codex CLI V2.
echo [CWS] Repo: %CD%
echo [CWS] Runtime tools: %CWS_RUNTIME_TOOLS%
echo [CWS] Approval posture: on-request + auto_review.
echo [CWS] Sandbox posture: workspace-write. No universal bypass/full-access mode is enabled.
echo [CWS] POWER-STATE HARD RULE: Codex/AI must never shutdown, reboot, restart,
echo       log off, sleep, hibernate, or auto-confirm any equivalent host action.
echo [CWS] If a host power/session transition is required: STOP and report
echo       BLOCKED_BY_POWER_STATE_INVARIANT.
echo.

"%CODEX_EXE%"
set "CWS_EXIT=%ERRORLEVEL%"

echo.
echo [CWS] Codex exited with code %CWS_EXIT%.
exit /b %CWS_EXIT%
