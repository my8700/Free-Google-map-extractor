#!/usr/bin/env python3
"""
Google Maps Lead Harvester - Unified Cross-Platform Runner
Usage:
  python run.py          # Auto-checks setup, builds frontend if needed, and starts server
  python run.py --setup  # Installs all Python + Node dependencies and builds frontend
"""

import os
import sys
import subprocess
import webbrowser
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def run_command(cmd, cwd=BASE_DIR, check=True):
    print(f"[*] Running: {cmd}")
    shell = isinstance(cmd, str)
    return subprocess.run(cmd, cwd=cwd, shell=shell, check=check)

def setup():
    print("==================================================================")
    print(" Google Maps Lead Harvester - Automated Setup")
    print("==================================================================")
    
    # 1. Python dependencies
    print("\n[1/3] Installing Python dependencies...")
    run_command(f'"{sys.executable}" -m pip install --upgrade pip')
    run_command(f'"{sys.executable}" -m pip install -r requirements.txt')
    
    # 2. Playwright Chromium
    print("\n[2/3] Installing Playwright Chromium browser...")
    run_command(f'"{sys.executable}" -m playwright install chromium')
    
    # 3. Frontend npm dependencies & build
    print("\n[3/3] Installing frontend dependencies & building React production bundle...")
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    run_command("npm install", cwd=frontend_dir)
    run_command("npm run build", cwd=frontend_dir)
    
    print("\n[SUCCESS] Setup completed successfully!")

def main():
    if "--setup" in sys.argv:
        setup()
        return

    # Auto-verify frontend build
    dist_index = os.path.join(BASE_DIR, "frontend", "dist", "index.html")
    if not os.path.exists(dist_index):
        print("[!] Frontend production build not found in frontend/dist.")
        print("[*] Running automated build now...")
        setup()

    # Launch app.py
    port = int(os.environ.get("PORT", 5000))
    url = f"http://localhost:{port}"
    print(f"\n[*] Starting Google Maps Lead Harvester on {url}")
    print("[*] Press Ctrl+C in this terminal to stop.")
    
    try:
        # Schedule browser opening after 1.5 seconds
        def open_browser():
            time.sleep(1.5)
            webbrowser.open(url)
            
        import threading
        threading.Thread(target=open_browser, daemon=True).start()
        
        from app import app
        app.run(host="0.0.0.0", port=port, debug=False)
    except KeyboardInterrupt:
        print("\n[*] Server stopped.")

if __name__ == "__main__":
    main()

