@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo   Google Maps Lead Harvester - Automated 1-Click Setup (Windows)
echo ======================================================================
echo.

:: 1. Check Python
echo [*] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python 3.10+ is required but not found in PATH.
        echo Please download and install Python from https://www.python.org/downloads/
        echo Make sure to check "Add Python to PATH" during installation.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)
echo [OK] Using Python: %PYTHON_CMD%

:: 2. Check Node.js
echo [*] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 18+ is required but not found in PATH.
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js detected.

:: 3. Install Python Dependencies
echo.
echo [*] Installing Python requirements...
%PYTHON_CMD% -m pip install --upgrade pip
%PYTHON_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python packages.
    pause
    exit /b 1
)
echo [OK] Python dependencies installed.

:: 4. Install Playwright Chromium Browser
echo.
echo [*] Installing Playwright Chromium browser binaries...
%PYTHON_CMD% -m playwright install chromium
if %errorlevel% neq 0 (
    echo [WARNING] Playwright install encountered an issue, retrying with force...
    %PYTHON_CMD% -m playwright install --with-deps chromium
)
echo [OK] Playwright browser installed.

:: 5. Install Frontend Dependencies and Build
echo.
echo [*] Installing React frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend npm packages.
    cd ..
    pause
    exit /b 1
)

echo [*] Building production React bundle...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build React frontend.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend built successfully into frontend/dist.

echo.
echo ======================================================================
echo   [SUCCESS] Setup Completed Successfully!
echo ======================================================================
echo.
echo   To launch the application:
echo     1. Run: start.bat
echo        OR: npm start
echo        OR: python app.py
echo.
echo   Then open your browser at: http://localhost:5000
echo ======================================================================
echo.
pause

