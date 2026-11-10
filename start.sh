#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "  Google Maps Lead Harvester - Starting Web Application"
echo "======================================================================"
echo ""

PYTHON_CMD="python3"
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    PYTHON_CMD="python"
elif ! command -v python3 &> /dev/null && command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

# Build frontend if dist doesn't exist
if [ ! -f "frontend/dist/index.html" ]; then
    echo "[*] Production frontend build not detected. Building now..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

PORT="${PORT:-5000}"
echo "[*] Starting Flask server on http://localhost:$PORT..."
echo "[*] Press Ctrl+C anytime to stop."
echo ""

# Attempt to open browser
if command -v xdg-open &> /dev/null; then
    (sleep 2 && xdg-open "http://localhost:$PORT") &
elif command -v open &> /dev/null; then
    (sleep 2 && open "http://localhost:$PORT") &
fi

$PYTHON_CMD app.py

