#!/usr/bin/env python3
import csv
import html
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

SOURCE = Path("../outputs/kv-lekari-karlovarsky-kraj-2026-08-03/kv_lekari_digitalni_audit_2026-08-03.csv")
DESTINATION = Path("data/opening-hours.json")
CACHE = Path("/private/tmp/velyos-opening-hours-cache.json")
WEB_CACHE = Path("/private/tmp/kv_doctors_search_cache.json")
AUDITED_AT = "2026-08-03"
DAY_KEYS = {"1": "mon", "2": "tue", "3": "wed", "4": "thu", "5": "fri", "6": "sat", "7": "sun"}
GENERIC = {"sro", "mudr", "mddr", "ordinace", "lekar", "lekare", "prakticky", "praktickeho", "medical", "medic", "clinic"}
SCHEMA_DAYS = {"monday": "mon", "tuesday": "tue", "wednesday": "wed", "thursday": "thu", "friday": "fri", "saturday": "sat", "sunday": "sun"}


def normalize(value):
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def tokens(value):
    return [part for part in normalize(value).split() if len(part) >= 4 and part not in GENERIC]


def canonical_url(value):
    if not value:
        return ""
    parsed = urllib.parse.urlsplit(value)
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def format_time(value):
    return f"{int(value[0]):02d}:{int(value[1]):02d}"


def extract_schedule(opening):
    seasons = opening.get("seasons", []) if isinstance(opening, dict) else []
    season = next((item for item in seasons if item.get("active")), seasons[0] if seasons else {})
    days = season.get("days", {}) if isinstance(season, dict) else {}
    schedule = {}
    for number, key in DAY_KEYS.items():
        intervals = days.get(number, {}).get("interval", []) if isinstance(days.get(number, {}), dict) else []
        formatted = []
        for interval in intervals:
            if isinstance(interval, list) and len(interval) == 2:
                formatted.append(f"{format_time(interval[0])}–{format_time(interval[1])}")
        schedule[key] = formatted
    return schedule


def extract_jsonld_schedule(body):
    schedule = {key: [] for key in DAY_KEYS.values()}
    blocks = re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', body or "", re.I | re.S)

    def walk(node):
        if isinstance(node, dict):
            specs = node.get("openingHoursSpecification")
            if isinstance(specs, dict):
                specs = [specs]
            if isinstance(specs, list):
                for spec in specs:
                    if not isinstance(spec, dict) or not spec.get("opens") or not spec.get("closes"):
                        continue
                    days = spec.get("dayOfWeek", [])
                    if isinstance(days, str):
                        days = [days]
                    interval = f'{str(spec["opens"])[:5]}–{str(spec["closes"])[:5]}'
                    for day in days:
                        key = SCHEMA_DAYS.get(str(day).rsplit("/", 1)[-1].lower())
                        if key and interval not in schedule[key]:
                            schedule[key].append(interval)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    for block in blocks:
        try:
            walk(json.loads(html.unescape(block).strip()))
        except Exception:
            continue
    return schedule


def fetch_firms(query):
    url = "https://search.seznam.cz/?q=" + urllib.parse.quote(query)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; VELYOS-public-research/1.1)"})
    with urllib.request.urlopen(request, timeout=15) as response:
        body = response.read(1_800_000).decode("utf-8", "replace")
    match = re.search(r'<script id="renderer-state-data" data-state="(.*?)" data-search-page-context', body, re.S)
    if not match:
        raise ValueError("Strukturovaná data Seznamu nenalezena")
    state = json.loads(html.unescape(match.group(1)))
    firms = []

    def walk(node):
        if isinstance(node, dict):
            if node.get("source") == "firm" and isinstance(node.get("extend"), dict):
                extend = node["extend"]
                address = extend.get("address", {}) if isinstance(extend.get("address"), dict) else {}
                schedule = extract_schedule(extend.get("opening", {}))
                firms.append({
                    "title": node.get("title", ""),
                    "ico": re.sub(r"\D", "", node.get("subjectIcFormatted", "") or ""),
                    "city": address.get("city", ""),
                    "schedule": schedule,
                    "sourceUrl": canonical_url(node.get("urlDetail", "")),
                })
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(state.get("data", {}))
    unique = {}
    for firm in firms:
        key = firm["sourceUrl"] or f'{firm["title"]}|{firm["city"]}'
        unique[key] = firm
    return list(unique.values())


def best_match(row, firms):
    provider_ico = re.sub(r"\D", "", row.get("poskytovatel_ico", "") or "")
    city = normalize(row.get("mesto", ""))
    provider_tokens = tokens(row.get("poskytovatel_nazev", ""))
    scored = []
    for firm in firms:
        title = normalize(firm["title"])
        firm_city = normalize(firm["city"])
        score = 0
        if provider_ico and firm["ico"] == provider_ico:
            score += 100
        if city and firm_city == city:
            score += 25
        score += sum(5 for token in provider_tokens if token in title)
        if any(firm["schedule"].values()):
            score += 5
        scored.append((score, firm))
    if not scored:
        return None, "C"
    score, firm = max(scored, key=lambda item: item[0])
    if score >= 125:
        return firm, "A"
    if score >= 35:
        return firm, "B"
    return None, "C"


def main():
    with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    web_cache = json.loads(WEB_CACHE.read_text(encoding="utf-8")) if WEB_CACHE.exists() else {}
    pages = {}
    for cache_key, page in web_cache.items():
        if not cache_key.startswith("page:") or not isinstance(page, dict) or not page.get("html"):
            continue
        pages[canonical_url(cache_key[5:])] = page["html"]
        pages[canonical_url(page.get("final_url", ""))] = page["html"]
    output = {}
    for index, row in enumerate(rows, 1):
        query = f'"{row["poskytovatel_nazev"]}" "{row["mesto"]}" lékař ordinace kontakt'
        key = row["lead_id"]
        if key not in cache:
            try:
                cache[key] = {"firms": fetch_firms(query), "error": ""}
            except Exception as exc:
                cache[key] = {"firms": [], "error": str(exc)}
            CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
            time.sleep(0.18)
        firm, confidence = best_match(row, cache[key].get("firms", []))
        schedule = firm["schedule"] if firm else {key: [] for key in DAY_KEYS.values()}
        source_url = firm["sourceUrl"] if firm else ""
        if not any(schedule.values()) and row.get("web"):
            web_url = canonical_url(row["web"])
            web_schedule = extract_jsonld_schedule(pages.get(web_url, ""))
            if any(web_schedule.values()):
                schedule = web_schedule
                source_url = web_url
                confidence = "A"
        output[row["misto_id"]] = {
            "schedule": schedule,
            "sourceUrl": source_url,
            "confidence": confidence,
            "auditedAt": AUDITED_AT,
        }
        if index % 25 == 0 or index == len(rows):
            found = sum(any(item["schedule"].values()) for item in output.values())
            print(f"Zpracováno {index}/{len(rows)} · hodiny nalezeny {found}", flush=True)
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    DESTINATION.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Zapsáno {len(output)} míst → {DESTINATION}")


if __name__ == "__main__":
    main()
