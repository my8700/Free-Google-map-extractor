@echo off
setlocal

echo ======================================================================
echo   Google Maps Lead Harvester - Starting Web Application
echo ======================================================================
echo.

:: Detect Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python not found. Please run setup.bat first.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

:: Build frontend if dist doesn't exist
if not exist "frontend\dist\index.html" (
    echo [*] Production frontend build not detected. Building now...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

echo [*] Launching Python Flask server at http://localhost:5000...
echo [*] Press Ctrl+C in this terminal window to stop the server anytime.
echo.

:: Open default browser after 2 seconds in background
start "" cmd /c "timeout /t 2 >nul & start http://localhost:5000"

:: Start Flask app
%PYTHON_CMD% app.py

