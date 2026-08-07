@echo off
setlocal
if "%CWS_PYTHON_EXE%"=="" set "CWS_PYTHON_EXE=python"
"%CWS_PYTHON_EXE%" "%~dp0production_node_agent.py" %*
exit /b %ERRORLEVEL%
