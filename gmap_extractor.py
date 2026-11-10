import argparse
import csv
import json
import os
import re
import sys
import time
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import urllib3
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
WHATSAPP_REGEX = re.compile(r'(?:https?://)?(?:wa\.me|api\.whatsapp\.com/send\?phone=)(\+?[0-9]{7,15})', re.IGNORECASE)
PHONE_REGEX = re.compile(r'(?:\+?[0-9]{1,4}[\s\-]?)?(?:\([0-9]{2,5}\)[\s\-]?)?[0-9]{3,5}[\s\-]?[0-9]{3,6}')

EXCLUDED_EMAIL_EXTS = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.css', '.js', '.woff', '.woff2', '.ttf')
EXCLUDED_EMAIL_DOMAINS = ('sentry.io', 'wixpress.com', 'schema.org', 'google.com', 'example.com', 'domain.com', 'email.com')

def clean_phone(phone_str: str) -> str:
    """Clean and extract telephone number from raw text."""
    if not phone_str:
        return ""
    lines = [l.strip() for l in phone_str.split("\n") if l.strip()]
    for line in lines:
        cleaned = re.sub(r'^[^\d+]+', '', line)
        if any(c.isdigit() for c in cleaned) and len(cleaned) >= 6:
            return cleaned.strip()
    return ""

def clean_address(addr_str: str) -> str:
    """Clean address text."""
    if not addr_str:
        return ""
    lines = [l.strip() for l in addr_str.split("\n") if l.strip()]
    for line in lines:
        cleaned = re.sub(r'^[^\w\d]+', '', line)
        if cleaned and len(cleaned) > 3:
            return cleaned.strip()
    return ""

def extract_website_contact_info(url: str, timeout: int = 5):
    """Deep crawl website (homepage + contact/about/impressum page) for emails and WhatsApp."""
    emails = set()
    whatsapp_numbers = set()
    if not url or not url.startswith("http"):
        return "", ""

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    subpages_to_check = []
    base_domain = urlparse(url).netloc

    try:
        session = requests.Session()
        resp = session.get(url, headers=headers, timeout=timeout, allow_redirects=True, verify=False)
        html = resp.text

        def find_in_html(content: str):
            for em in EMAIL_REGEX.findall(content):
                em_lower = em.lower()
                if any(em_lower.endswith(ext) for ext in EXCLUDED_EMAIL_EXTS):
                    continue
                if any(dom in em_lower for dom in EXCLUDED_EMAIL_DOMAINS):
                    continue
                emails.add(em)

            for wa in WHATSAPP_REGEX.findall(content):
                whatsapp_numbers.add(wa)

            for wa in re.findall(r'href=["\'](?:https?://)?(?:wa\.me|api\.whatsapp\.com/send\?phone=)(\+?[0-9]{7,15})["\']', content, re.IGNORECASE):
                whatsapp_numbers.add(wa)

        find_in_html(html)

        # If no email yet on homepage, look for Contact / Impressum / About links
        if not emails:
            contact_hrefs = re.findall(r'href=["\']([^"\']*(?:contact|kontakt|impressum|about|touch)[^"\']*)["\']', html, re.IGNORECASE)
            for href in contact_hrefs[:2]:
                full_url = urljoin(url, href)
                if urlparse(full_url).netloc == base_domain and full_url != url:
                    subpages_to_check.append(full_url)

        # Check contact subpages
        for sub_url in subpages_to_check:
            try:
                sub_resp = session.get(sub_url, headers=headers, timeout=timeout, verify=False)
                find_in_html(sub_resp.text)
                if emails:
                    break
            except Exception:
                pass

    except Exception:
        pass

    email_res = ", ".join(sorted(emails))
    wa_res = ", ".join(sorted(whatsapp_numbers))
    return email_res, wa_res

def geocode_location(loc_str: str):
    """Fetch central coordinates (lat, lon) for a city/region."""
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={loc_str.strip()}&format=json&limit=1"
        resp = requests.get(url, headers={"User-Agent": "LeadHarvester/2.0"}, timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None, None

def generate_spiral_grid(center_lat: float, center_lon: float, num_points: int, step_lat=0.032, step_lon=0.042):
    """Generate spiral coordinate grid points around center."""
    points = [(center_lat, center_lon)]
    x = 0
    y = 0
    dx = 0
    dy = -1
    side = int(num_points ** 0.5) + 3
    for _ in range(side * side):
        if len(points) >= num_points:
            break
        if (-side/2 < x <= side/2) and (-side/2 < y <= side/2):
            if (x, y) != (0, 0):
                points.append((center_lat + y * step_lat, center_lon + x * step_lon))
        if x == y or (x < 0 and x == -y) or (x > 0 and x == 1 - y):
            dx, dy = -dy, dx
        x, y = x + dx, y + dy
    return points[:num_points]

def normalize_slug(href: str, name: str) -> str:
    """Normalize place slug for cross-sector deduplication."""
    if href:
        m = re.search(r'/maps/place/([^/@?]+)', href)
        if m:
            return m.group(1).lower().strip()
    return re.sub(r'[^\w\d]', '', (name or "").lower().strip())

def generate_search_sectors(query: str, max_results: int) -> list:
    """
    Generate exhaustive search sectors across the target location.
    Combines:
    1. Primary location search
    2. Locality and cardinal zone queries (North, South, East, West, Central, Downtown, etc.)
    3. Geo-coordinate spiral tiles with zoom (14z & 13z) around city coordinates
    4. Suburb / neighborhood / vicinity terms
    """
    query = query.strip()
    m = re.match(r'^(.*?)\s+in\s+(.*)$', query, re.IGNORECASE)
    if m:
        kw = m.group(1).strip()
        full_loc = m.group(2).strip()
    else:
        parts = query.split()
        if len(parts) >= 2:
            kw = parts[0]
            full_loc = " ".join(parts[1:]).strip()
        else:
            kw = query
            full_loc = ""

    clean_city = full_loc.split(",")[0].strip() if full_loc else ""
    state_or_country = full_loc.split(",")[1].strip() if "," in full_loc else ""

    sectors = []
    seen_urls = set()

    def add_sector(url):
        if url and url not in seen_urls:
            seen_urls.add(url)
            sectors.append(url)

    # 1. Primary full query
    kw_enc = kw.replace(' ', '+')
    if full_loc:
        add_sector(f"https://www.google.com/maps/search/{kw_enc}+in+{full_loc.replace(' ', '+')}?hl=en")
        if clean_city and clean_city != full_loc:
            add_sector(f"https://www.google.com/maps/search/{kw_enc}+in+{clean_city.replace(' ', '+')}?hl=en")
    else:
        add_sector(f"https://www.google.com/maps/search/{kw_enc}?hl=en")

    # 2. Locality & Cardinal Zone expansions for the city
    if clean_city:
        zone_terms = [
            f"North {clean_city}",
            f"South {clean_city}",
            f"East {clean_city}",
            f"West {clean_city}",
            f"Central {clean_city}",
            f"Downtown {clean_city}",
            f"Greater {clean_city}",
            f"near {clean_city}",
            f"Midtown {clean_city}",
            f"Uptown {clean_city}",
            f"Old {clean_city}",
            f"New {clean_city}",
            f"Suburbs {clean_city}",
            f"Metro {clean_city}"
        ]
        if state_or_country:
            zone_terms.append(f"{clean_city} {state_or_country}")
            zone_terms.append(f"Downtown {clean_city} {state_or_country}")

        for zt in zone_terms:
            add_sector(f"https://www.google.com/maps/search/{kw_enc}+in+{zt.replace(' ', '+')}?hl=en")

    # 3. Geo-Coordinate Spiral Grid
    # Geocode city to get latitude/longitude
    lat, lon = None, None
    if full_loc:
        lat, lon = geocode_location(full_loc)
    if not lat and clean_city:
        lat, lon = geocode_location(clean_city)

    if lat and lon:
        # Determine number of coordinate tiles needed
        tile_count = max(8, min(180, (max_results // 30) + 4))
        grid = generate_spiral_grid(lat, lon, tile_count, step_lat=0.032, step_lon=0.040)
        for plat, plon in grid:
            add_sector(f"https://www.google.com/maps/search/{kw_enc}/@{plat:.5f},{plon:.5f},14z?hl=en")

    # If geocoding failed, add additional vicinity variants
    if not lat and clean_city:
        for extra in ["Center", "Area", "District", "Plaza", "Circle", "Valley", "Hills", "Road", "Park"]:
            add_sector(f"https://www.google.com/maps/search/{kw_enc}+in+{clean_city.replace(' ', '+')}+{extra}?hl=en")

    return sectors

def scrape_google_maps(
    query: str,
    max_results: int = 100,
    extract_email: bool = True,
    extract_phone: bool = True,
    headless: bool = True,
    on_progress = None,
    csv_path: str = None,
    stop_check = None
):
    start_time = time.time()
    print("==================================================")
    print(" Google Maps High-Volume Fast Lead Extractor")
    print(f" Search Query   : {query}")
    print(f" Target Leads   : {max_results}")
    print(f" Extract Email  : {'Yes' if extract_email else 'No'}")
    print(f" Extract Mobile : {'Yes' if extract_phone else 'No'}")
    print("==================================================\n")

    results = []
    seen_links = set()
    stealth = Stealth()
    email_executor = ThreadPoolExecutor(max_workers=6) if extract_email else None

    # Incremental CSV writing
    csv_file = None
    csv_writer = None
    if csv_path:
        csv_file = open(csv_path, mode="w", newline="", encoding="utf-8-sig")
        csv_writer = csv.DictWriter(csv_file, fieldnames=[
            "Name", "Phone", "Email", "WhatsApp", "Website",
            "Rating", "Reviews_Count", "Category", "Address", "Google_Maps_URL"
        ])
        csv_writer.writeheader()
        csv_file.flush()

    def notify(evt, payload):
        if on_progress:
            try:
                on_progress(evt, payload)
            except Exception:
                pass

    notify("status", {"message": "Planning comprehensive geographic coverage sectors..."})
    sector_urls = generate_search_sectors(query, max_results)
    print(f"[*] Prepared {len(sector_urls)} geographic search sectors.")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-infobars",
                "--window-size=1400,900"
            ]
        )

        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-US",
            viewport={"width": 1400, "height": 900}
        )

        context.route(
            "**/*",
            lambda route: route.abort() if route.request.resource_type in ["image", "media", "font"] else route.continue_()
        )

        page = context.new_page()
        stealth.apply_stealth_sync(page)

        detail_page = context.new_page()
        stealth.apply_stealth_sync(detail_page)
        detail_counter = 0

        stopped = False

        # ==========================================
        # PHASE 1: DISCOVER ALL TARGET PLACES
        # ==========================================
        notify("phase", {
            "phase": 1,
            "name": "Discovery",
            "message": f"Phase 1: Discovering up to {max_results} target places across search sectors..."
        })
        print(f"[*] Starting Phase 1: Discovering up to {max_results} target listings...")

        discovered_places = []

        # Universal JavaScript card extraction (queries both a.hfpxzc and /maps/place/ anchors)
        JS_EXTRACT_CARDS = """
        () => {
            const out = [];
            const links = document.querySelectorAll("a.hfpxzc, a[href*='/maps/place/']");
            for (const a of links) {
                const href = a.href;
                if (!href) continue;
                const ariaLabel = (a.getAttribute("aria-label") || "").trim();
                const card = a.closest("div[jsaction]") || a.closest("div.m6QErb") || a.parentElement;
                out.push({
                    href: href,
                    ariaLabel: ariaLabel,
                    text: card ? card.innerText : ""
                });
            }
            return out;
        }
        """

        for s_idx, sector_url in enumerate(sector_urls):
            if len(discovered_places) >= max_results:
                break
            if stop_check and stop_check():
                stopped = True
                break

            notify("status", {"message": f"[Phase 1: Discovery] Sector [{s_idx+1}/{len(sector_urls)}]: Discovered {len(discovered_places):,}/{max_results:,} target places..."})
            print(f"[*] [Phase 1] Scanning sector [{s_idx+1}/{len(sector_urls)}] ({len(discovered_places)}/{max_results} places)...")

            try:
                page.goto(sector_url, wait_until="commit", timeout=25000)
            except Exception:
                continue

            # Dismiss consent banner
            try:
                reject_btn = page.locator("button:has-text('Reject all'), button:has-text('Reject'), button:has-text('Alle ablehnen')").first
                if reject_btn.is_visible(timeout=1000):
                    reject_btn.click()
            except Exception:
                pass

            time.sleep(1.2)

            feed = page.locator("div[role='feed'], div[aria-label*='Results'], div.m6QErb[aria-label]").first
            if feed.count() == 0:
                try:
                    page.locator("a.hfpxzc, a[href*='/maps/place/']").first.wait_for(timeout=3500)
                    feed = page.locator("div[role='feed'], div[aria-label*='Results'], div.m6QErb[aria-label]").first
                except Exception:
                    pass

            scroll_count = 0
            max_scrolls_per_sector = 35
            stagnant_count = 0
            last_total_seen = len(seen_links)

            while len(discovered_places) < max_results and scroll_count < max_scrolls_per_sector:
                if stop_check and stop_check():
                    stopped = True
                    break

                try:
                    raw_cards = page.evaluate(JS_EXTRACT_CARDS)
                except Exception:
                    raw_cards = []

                for card in raw_cards:
                    if len(discovered_places) >= max_results:
                        break
                    href = card.get("href", "")
                    if not href:
                        continue

                    name = card.get("ariaLabel", "").strip()
                    text = card.get("text", "")
                    lines = [l.strip() for l in text.split("\n") if l.strip()]

                    if not name and lines:
                        name = lines[0]

                    if not name or "All filters" in name or "Price" in name:
                        continue

                    key = normalize_slug(href, name)
                    if not key or key in seen_links:
                        continue
                    seen_links.add(key)

                    rating = ""
                    reviews_count = ""
                    category = ""
                    for line in lines[1:]:
                        if "★" in line or (any(c.isdigit() for c in line) and "." in line and len(line) <= 5):
                            rating = line.replace("★", "").strip()
                        elif "(" in line and ")" in line and any(c.isdigit() for c in line):
                            reviews_count = re.sub(r'[^\d]', '', line)
                        elif not category and not line.startswith("Open") and not line.startswith("Closed") and not line.startswith("·"):
                            category = line

                    discovered_places.append({
                        "name": name,
                        "rating": rating,
                        "reviews_count": reviews_count,
                        "category": category,
                        "url": href
                    })

                    notify("discovering", {
                        "count": len(discovered_places),
                        "target": max_results
                    })

                if len(discovered_places) >= max_results or stopped:
                    break

                # Scroll feed and simulate wheel
                if feed.count() > 0:
                    try:
                        feed.evaluate("el => { el.scrollBy(0, 3200); el.scrollTop = el.scrollHeight; }")
                    except Exception:
                        pass
                page.mouse.wheel(0, 2000)
                time.sleep(1.2)
                scroll_count += 1

                if len(seen_links) == last_total_seen:
                    stagnant_count += 1
                    # Check for "Search this area" button
                    try:
                        search_btn = page.locator("button:has-text('Search this area'), button:has-text('Search here')")
                        if search_btn.count() > 0 and search_btn.first.is_visible():
                            search_btn.first.click()
                            time.sleep(1.5)
                            stagnant_count = 0
                            continue
                    except Exception:
                        pass

                    # Try PageDown
                    page.keyboard.press("PageDown")
                    time.sleep(0.8)

                    # Check for explicit end of list or stagnant limit
                    is_end = page.locator("text=\"You've reached the end of the list\"").count() > 0
                    if is_end or stagnant_count >= 4:
                        break
                else:
                    stagnant_count = 0
                    last_total_seen = len(seen_links)

            if stopped or len(discovered_places) >= max_results:
                break

        page.close()

        total_discovered = len(discovered_places)
        print(f"\n[*] [Phase 1 Completed] Discovered {total_discovered} places.")
        notify("discovered", {"total": total_discovered})

        # ==========================================
        # PHASE 2: EXTRACT DATA FOR DISCOVERED PLACES
        # ==========================================
        notify("phase", {
            "phase": 2,
            "name": "Extraction",
            "total": total_discovered,
            "message": f"Phase 2: Extracting full contact records for {total_discovered} places..."
        })
        print(f"[*] Starting Phase 2: Extracting contacts for {total_discovered} places...\n")

        detail_counter = 0

        for idx, place_summary in enumerate(discovered_places, 1):
            if stop_check and stop_check():
                stopped = True
                break

            # Memory hygiene: recycle detail_page every 35 items
            detail_counter += 1
            if detail_counter % 35 == 0:
                try:
                    detail_page.close()
                    detail_page = context.new_page()
                    stealth.apply_stealth_sync(detail_page)
                except Exception:
                    pass

            name = place_summary["name"]
            url = place_summary["url"]

            notify("extracting_item", {
                "current": idx,
                "total": total_discovered,
                "name": name
            })

            phone = ""
            address = ""
            website = ""
            whatsapp = ""
            email = ""

            try:
                detail_page.goto(url, wait_until="commit", timeout=12000)
                try:
                    detail_page.wait_for_selector("h1, button[data-item-id*='phone'], a[data-item-id='authority']", timeout=2500)
                except Exception:
                    pass

                if extract_phone:
                    phone_elem = detail_page.locator("button[data-item-id*='phone'], button[aria-label*='Phone' i], a[href^='tel:']").first
                    if phone_elem.count() > 0:
                        phone_attr = phone_elem.get_attribute("data-item-id") or ""
                        if "phone:tel:" in phone_attr:
                            phone = phone_attr.split("phone:tel:")[-1].strip()
                        else:
                            phone = clean_phone(phone_elem.inner_text())

                    if not phone:
                        detail_text = detail_page.inner_text("div[role='main']") if detail_page.locator("div[role='main']").count() > 0 else ""
                        matches = PHONE_REGEX.findall(detail_text)
                        for m in matches:
                            clean_m = re.sub(r'[^\d+]', '', m)
                            if 8 <= len(clean_m) <= 16:
                                phone = m.strip()
                                break

                    if phone:
                        clean_p = re.sub(r'[^\d+]', '', phone)
                        if len(clean_p) >= 10:
                            whatsapp = phone

                site_elem = detail_page.locator("a[data-item-id='authority'], a[aria-label*='Website' i], a[data-tooltip*='website' i]").first
                if site_elem.count() > 0:
                    website = site_elem.get_attribute("href") or ""

                addr_elem = detail_page.locator("button[data-item-id='address'], button[aria-label*='Address' i], button[data-tooltip*='address' i]").first
                if addr_elem.count() > 0:
                    address = clean_address(addr_elem.inner_text())

                # Ratings
                try:
                    rating_box = detail_page.locator("div.F7nice").first
                    if rating_box.count() > 0:
                        rating_span = rating_box.locator("span[aria-hidden='true']").first
                        if rating_span.count() > 0 and rating_span.inner_text().strip():
                            place_summary["rating"] = rating_span.inner_text().strip()
                        reviews_span = rating_box.locator("span[aria-label*='reviews']").first
                        if reviews_span.count() > 0:
                            place_summary["reviews_count"] = re.sub(r'[^\d]', '', reviews_span.inner_text())
                except Exception:
                    pass

                # WhatsApp link
                wa_link = detail_page.locator("a[href*='wa.me'], a[href*='whatsapp.com']").first
                if wa_link.count() > 0:
                    wa_href = wa_link.get_attribute("href") or ""
                    match = WHATSAPP_REGEX.search(wa_href)
                    whatsapp = match.group(1) if match else wa_href

            except Exception:
                pass

            place_summary["phone"] = phone
            place_summary["whatsapp"] = whatsapp
            place_summary["email"] = email
            place_summary["website"] = website
            place_summary["address"] = address

            place_idx = len(results)
            results.append(place_summary)

            # Incremental real-time CSV write
            if csv_writer and csv_file:
                csv_writer.writerow({
                    "Name": place_summary.get("name", ""),
                    "Phone": place_summary.get("phone", ""),
                    "Email": place_summary.get("email", ""),
                    "WhatsApp": place_summary.get("whatsapp", ""),
                    "Website": place_summary.get("website", ""),
                    "Rating": place_summary.get("rating", ""),
                    "Reviews_Count": place_summary.get("reviews_count", ""),
                    "Category": place_summary.get("category", ""),
                    "Address": place_summary.get("address", ""),
                    "Google_Maps_URL": place_summary.get("url", "")
                })
                csv_file.flush()

            notify("place_extracted", {
                "current": idx,
                "total": total_discovered,
                "place": place_summary
            })

            safe_n = place_summary["name"].encode("ascii", "ignore").decode("ascii")[:30]
            print(f"[{idx}/{total_discovered}] {safe_n} | Phone: {phone or 'N/A'}")

            # Background parallel website email extraction
            if extract_email and website and email_executor:
                def background_email_task(res_idx, site_url, place_name):
                    try:
                        em, wa = extract_website_contact_info(site_url, timeout=4)
                        if em or wa:
                            if em:
                                results[res_idx]["email"] = em
                            if wa and not results[res_idx]["whatsapp"]:
                                results[res_idx]["whatsapp"] = wa
                            notify("email_updated", {
                                "index": res_idx,
                                "email": results[res_idx]["email"],
                                "whatsapp": results[res_idx]["whatsapp"],
                                "name": place_name
                            })
                    except Exception:
                        pass

                email_executor.submit(background_email_task, place_idx, website, place_summary["name"])

        detail_page.close()
        browser.close()

    if email_executor:
        email_executor.shutdown(wait=False)

    if csv_file:
        try:
            csv_file.close()
        except Exception:
            pass

    total_duration = round(time.time() - start_time, 1)
    status_str = "Stopped by user" if stopped else "Successfully extracted"
    print(f"\n[DONE] {status_str}: {len(results)} leads in {total_duration}s.")
    notify("completed", {"total": len(results), "duration": total_duration, "stopped": stopped})
    return results

def save_to_csv(data: list, filename: str):
    fieldnames = [
        "Name", "Phone", "Email", "WhatsApp", "Website",
        "Rating", "Reviews_Count", "Category", "Address", "Google_Maps_URL"
    ]
    with open(filename, mode="w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in data:
            writer.writerow({
                "Name": item.get("name", ""),
                "Phone": item.get("phone", ""),
                "Email": item.get("email", ""),
                "WhatsApp": item.get("whatsapp", ""),
                "Website": item.get("website", ""),
                "Rating": item.get("rating", ""),
                "Reviews_Count": item.get("reviews_count", ""),
                "Category": item.get("category", ""),
                "Address": item.get("address", ""),
                "Google_Maps_URL": item.get("url", "")
            })

def main():
    parser = argparse.ArgumentParser(description="Fast Google Maps Lead Extractor (Stealth)")
    parser.add_argument("query", nargs="?", default="Dentists in Berlin", help="Search query")
    parser.add_argument("-m", "--max-results", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("-o", "--output", default="gmaps_leads.csv", help="Output CSV path")
    parser.add_argument("--json", default=None, help="Optional JSON path")
    parser.add_argument("--no-email", action="store_true", help="Skip email extraction")
    parser.add_argument("--no-phone", action="store_true", help="Skip mobile/phone extraction")

    args = parser.parse_args()

    results = scrape_google_maps(
        query=args.query,
        max_results=args.max_results,
        extract_email=not args.no_email,
        extract_phone=not args.no_phone,
        headless=True
    )

    if results:
        save_to_csv(results, args.output)
        print(f"[SUCCESS] Saved {len(results)} leads to: {os.path.abspath(args.output)}")
        if args.json:
            with open(args.json, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()
