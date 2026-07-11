@echo off
setlocal
title NC City County Trainer

cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:8000"
set "VENV_DIR=.venv"
set "VENV_PY=%VENV_DIR%\Scripts\python.exe"
set "VENV_ACTIVATE=%VENV_DIR%\Scripts\activate.bat"

if exist "%VENV_DIR%" if not exist "%VENV_PY%" (
    echo Existing .venv is not a usable Windows virtual environment.
    echo Rebuilding .venv...
    rmdir /s /q "%VENV_DIR%"
)

if not exist "%VENV_PY%" (
    call :find_python
    if errorlevel 1 goto :failed

    echo Creating virtual environment...
    %PYTHON_CMD% -m venv "%VENV_DIR%"
    if errorlevel 1 goto :failed
)

call "%VENV_ACTIVATE%"
if errorlevel 1 goto :failed

if exist "requirements.txt" (
    echo Installing requirements...
    python -m pip install --disable-pip-version-check -r requirements.txt
    if errorlevel 1 goto :failed
)

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

:find_python
set "PYTHON_CMD="

for %%V in (3.12 3.11 3.10 3.9 3.13 3.14 3) do (
    py -%%V --version >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_CMD=py -%%V"
        exit /b 0
    )
)

python --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=python"
    exit /b 0
)

echo Could not find Python. Install Python 3 from https://www.python.org/downloads/windows/
exit /b 1

:failed
echo.
echo Setup failed. Check the error above, then run this file again.
pause
exit /b 1
