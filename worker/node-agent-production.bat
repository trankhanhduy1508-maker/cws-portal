@echo off
setlocal
if "%CWS_PYTHON_EXE%"=="" set "CWS_PYTHON_EXE=python"
set "CWS_WORKER_ROOT=%~dp0"
set "PYTHONPATH=%CWS_WORKER_ROOT%;%PYTHONPATH%"
"%CWS_PYTHON_EXE%" "%~dp0production_node_agent.py" %*
exit /b %ERRORLEVEL%
