@echo off
setlocal
if "%CWS_PYTHON_EXE%"=="" set "CWS_PYTHON_EXE=python"
"%CWS_PYTHON_EXE%" "%~dp0worker\worker_engine.py" %*
exit /b %ERRORLEVEL%
