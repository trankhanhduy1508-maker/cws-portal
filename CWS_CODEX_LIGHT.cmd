@echo off
setlocal
title CWS Codex Light

rem Canonical lightweight Codex launcher for Founder-controlled local Windows work.
rem Safe policy (approval reviewer / sandbox) is owned by the machine-local Codex config.
rem Never put secrets, tokens, API keys, or machine-private credentials in this file.

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

cd /d "%CWS_REPO%"
if errorlevel 1 (
  echo [CWS] Failed to enter canonical repo.
  pause
  exit /b 1
)

echo [CWS] Starting lightweight Codex CLI.
echo [CWS] Repo: %CD%
echo [CWS] Approval and sandbox policy come from the machine-local Codex configuration.
echo [CWS] Do not use dangerous universal approval or sandbox bypass modes.
echo.

"%CODEX_EXE%"
set "CWS_EXIT=%ERRORLEVEL%"

echo.
echo [CWS] Codex exited with code %CWS_EXIT%.
exit /b %CWS_EXIT%
