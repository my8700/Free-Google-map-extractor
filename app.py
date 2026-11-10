import os
import re
import time
import json
import queue
import threading
from flask import Flask, render_template, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from gmap_extractor import scrape_google_maps, save_to_csv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

if os.path.isdir(FRONTEND_DIST):
    app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
else:
    app = Flask(__name__, template_folder=BASE_DIR, static_folder=BASE_DIR, static_url_path="")

CORS(app)

EXPORTS_DIR = os.path.join(BASE_DIR, "exports")
os.makedirs(EXPORTS_DIR, exist_ok=True)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "API route not found"}), 404
    if os.path.isdir(FRONTEND_DIST):
        file_path = os.path.join(FRONTEND_DIST, path)
        if path and os.path.exists(file_path):
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, "index.html")
    if os.path.exists(os.path.join(BASE_DIR, "index.html")):
        return render_template("index.html")
    return "Frontend not built yet. Run 'npm run build' or 'cd frontend && npm run build'.", 404

STOP_EVENTS = {}

@app.route("/api/stop", methods=["POST"])
def api_stop():
    stopped_count = 0
    for job_id, event in list(STOP_EVENTS.items()):
        event.set()
        stopped_count += 1
    return jsonify({"success": True, "stopped_count": stopped_count})

@app.route("/api/stream-scrape")
def api_stream_scrape():
    keywords = request.args.get("keywords", "").strip()
    city_state = request.args.get("city_state", "").strip()
    query = request.args.get("query", "").strip()
    
    if not query:
        if keywords and city_state:
            query = f"{keywords} in {city_state}"
        elif keywords:
            query = keywords
        elif city_state:
            query = city_state

    if not query:
        return jsonify({"error": "Keywords or City/State is required"}), 400

    try:
        max_results = int(request.args.get("max_results", 100))
    except ValueError:
        max_results = 100

    extract_email = request.args.get("extract_email", "true").lower() in ("true", "1", "yes")
    extract_phone = request.args.get("extract_phone", "true").lower() in ("true", "1", "yes")

    if max_results < 1:
        max_results = 5
    elif max_results > 10000:
        max_results = 10000

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', query)[:30]
    timestamp = int(time.time())
    csv_filename = f"leads_{safe_name}_{timestamp}.csv"
    csv_path = os.path.join(EXPORTS_DIR, csv_filename)

    stop_event = threading.Event()
    job_id = f"job_{timestamp}_{os.getpid()}"
    STOP_EVENTS[job_id] = stop_event

    def generate_events():
        q = queue.Queue()
        stop_signal = object()

        def on_progress(event_type, payload):
            q.put({"event": event_type, "data": payload})

        def worker():
            try:
                results = scrape_google_maps(
                    query=query,
                    max_results=max_results,
                    extract_email=extract_email,
                    extract_phone=extract_phone,
                    headless=True,
                    on_progress=on_progress,
                    csv_path=csv_path,
                    stop_check=stop_event.is_set
                )

                q.put({
                    "event": "done",
                    "data": {
                        "count": len(results),
                        "csv_filename": csv_filename if os.path.exists(csv_path) else None,
                        "results": results
                    }
                })
            except Exception as e:
                q.put({"event": "error", "data": {"message": str(e)}})
            finally:
                STOP_EVENTS.pop(job_id, None)
                q.put(stop_signal)

        t = threading.Thread(target=worker, daemon=True)
        t.start()

        while True:
            try:
                item = q.get(timeout=25)
                if item is stop_signal:
                    break
                payload = json.dumps(item)
                yield f"data: {payload}\n\n"
            except queue.Empty:
                yield ": ping\n\n"

    return Response(
        generate_events(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )

@app.route("/api/scrape", methods=["POST"])
def api_scrape():
    data = request.get_json() or {}
    
    keywords = data.get("keywords", "").strip()
    city_state = data.get("city_state", "").strip()
    
    # Also support single query if passed
    query = data.get("query", "").strip()
    if not query:
        if keywords and city_state:
            query = f"{keywords} in {city_state}"
        elif keywords:
            query = keywords
        elif city_state:
            query = city_state

    if not query:
        return jsonify({"error": "Keywords or City/State is required"}), 400

    max_results = int(data.get("max_results", 10))
    extract_email = bool(data.get("extract_email", True))
    extract_phone = bool(data.get("extract_phone", True))

    if max_results < 1:
        max_results = 5
    elif max_results > 10000:
        max_results = 10000

    try:
        results = scrape_google_maps(
            query=query,
            max_results=max_results,
            extract_email=extract_email,
            extract_phone=extract_phone,
            headless=True
        )

        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', query)[:30]
        timestamp = int(time.time())
        csv_filename = f"leads_{safe_name}_{timestamp}.csv"
        csv_path = os.path.join(EXPORTS_DIR, csv_filename)

        if results:
            save_to_csv(results, csv_path)

        return jsonify({
            "success": True,
            "count": len(results),
            "csv_filename": csv_filename if results else None,
            "results": results
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/download/<filename>")
def download_csv(filename):
    return send_from_directory(EXPORTS_DIR, filename, as_attachment=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("==================================================")
    print(" Fast Google Maps Lead Extractor Web Interface")
    print(f" Open your browser: http://localhost:{port}")
    print("==================================================")
    app.run(host="0.0.0.0", port=port, debug=False)
