# Google Maps Lead Harvester

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](license.md)
[![Open Source Love](https://img.shields.io/badge/Open_Source-%E2%99%A5-red.svg)](https://github.com)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)

An open-source high-volume lead discovery and extraction system with a modern React frontend and a Playwright-stealth backend.

---

### Developed by [Knowndevs Technologies](https://knowndevs.com/)

<p align="left">
  <a href="https://knowndevs.com/" target="_blank" rel="noopener noreferrer">
    <img src="https://knowndevs.com/wp-content/uploads/2025/12/Site-Logo.png" alt="Knowndevs Technologies Logo" width="220" />
  </a>
</p>

Developed and maintained with ❤️ by **[Knowndevs Technologies](https://knowndevs.com/)** — Empowering businesses with cutting-edge web development, automation, and AI-driven digital engineering.

---

## Key Features

- **2-Stage Scraping Pipeline**:
  - **Stage 1 (Discovery)**: Fast DOM card scanning across geographic sectors and spiral coordinates to find target places in bulk.
  - **Stage 2 (Extraction)**: Visits each discovered listing to extract phone numbers, websites, ratings, reviews, and addresses.
- **Asynchronous Email & Social Crawl**: Uses a background thread pool to crawl business websites for email addresses and WhatsApp contact links without delaying the place scraper.
- **Large Target Limit**: Capable of discovering and harvesting up to 10,000 leads per query across metropolitan sub-regions.
- **Modern React Interface**:
  - Interactive table with real-time SSE streaming.
  - Custom tooltips on mouse hover displaying full text for long names and addresses.
  - Column text-wrapping with two-line clamp.
  - Live search filtering, sorting, pagination, and multi-format exports (CSV, JSON, Clipboard).
- **Single-Command Setup & Run**: One-line install and run scripts for Windows, macOS, and Linux.

---

## Project Structure

```text
├── frontend/             # React + Vite + Tailwind CSS dashboard
│   ├── src/              # React components (DataTable, Tooltip, ProgressCard, etc.)
│   └── package.json
├── app.py                # Flask server with SSE stream and static distribution
├── gmap_extractor.py     # Playwright engine with multi-sector discovery
├── requirements.txt      # Python dependencies
├── package.json          # Root scripts for installation and build orchestration
├── run.py                # Cross-platform Python runner
├── setup.bat / setup.sh  # Automated setup scripts
├── start.bat / start.sh  # Launch scripts
└── exports/              # Real-time CSV exports destination
```

---

## Quickstart

### Prerequisites

- Python 3.10+
- Node.js 18+

---

### Option 1: Automated Script (Recommended)

#### Windows
```cmd
setup.bat
start.bat
```

#### macOS / Linux
```bash
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

The application will start at `http://localhost:5000`.

---

### Option 2: Using Node / NPM

```bash
# 1. Install all backend and frontend dependencies & build React
npm run setup

# 2. Start the unified application
npm start
```

For frontend and backend development with hot-reloading:
```bash
npm run dev
```

---

### Option 3: Using Python Runner

```bash
# Setup dependencies and build frontend
python run.py --setup

# Launch application
python run.py
```

---

## API Endpoints

- `GET /api/stream-scrape`: Server-Sent Events (SSE) endpoint providing real-time discovery and extraction progress.
- `POST /api/stop`: Stops the active extraction job and safely flushes collected leads to disk.
- `GET /api/download/<filename>`: Downloads the generated CSV file.

---

## License

This project is licensed under the MIT License.

