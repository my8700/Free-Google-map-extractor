#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "  Google Maps Lead Harvester - Automated Setup (Linux / macOS)"
echo "======================================================================"
echo ""

# 1. Check Python
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "[ERROR] Python 3.10+ is required but not installed."
    echo "Please install Python 3 (e.g. 'brew install python' or 'sudo apt install python3 python3-pip')."
    exit 1
fi
echo "[OK] Using Python: $($PYTHON_CMD --version)"

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js 18+ is required but not installed."
    echo "Please install Node.js from https://nodejs.org/ or using nvm."
    exit 1
fi
echo "[OK] Using Node.js: $(node --version)"

# 3. Virtual environment (optional recommendation)
if [ ! -d ".venv" ]; then
    echo "[*] Creating Python virtual environment in .venv..."
    $PYTHON_CMD -m venv .venv || true
fi

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    PYTHON_CMD="python"
fi

# 4. Install Python dependencies
echo ""
echo "[*] Installing Python dependencies..."
$PYTHON_CMD -m pip install --upgrade pip
$PYTHON_CMD -m pip install -r requirements.txt

# 5. Install Playwright browser
echo ""
echo "[*] Installing Playwright Chromium browser binaries..."
$PYTHON_CMD -m playwright install chromium
if [ "$(uname)" == "Linux" ]; then
    echo "[*] Installing system dependencies for Linux..."
    $PYTHON_CMD -m playwright install-deps chromium || true
fi

# 6. Install & build frontend
echo ""
echo "[*] Installing React frontend dependencies and building production assets..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "======================================================================"
echo "  [SUCCESS] Setup Completed Successfully!"
echo "======================================================================"
echo ""
echo "  To launch the application:"
echo "    ./start.sh"
echo "    OR: npm start"
echo "    OR: python app.py"
echo ""
echo "  Then visit: http://localhost:5000"
echo "======================================================================"

