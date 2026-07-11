@echo off
setlocal
title NC City County Trainer

cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:8000"
set "VENV_ACTIVATE=.venv\Scripts\activate.bat"

if not exist "%VENV_ACTIVATE%" (
    echo Could not find %VENV_ACTIVATE%.
    echo Create the virtual environment and install dependencies first, then run this file again.
    pause
    exit /b 1
)

call "%VENV_ACTIVATE%"
if errorlevel 1 goto :failed

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process '%APP_URL%'"

echo Starting NC City County Trainer...
echo Open %APP_URL% if your browser does not open automatically.
echo Press Ctrl+C to stop the server.
echo.
python app.py
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Server stopped with exit code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%

:failed
echo.
echo Startup failed. Check the error above, then run this file again.
pause
exit /b 1
