#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
eb_scrape.py — server-side zajem Eurobasket prestopov (brez brskalnika).
Python port konzolne skripte eb_fetch_daily.js.

Pobere transfer strani za vse drzave/lige, parsira igralce + odhode,
in zapise eb_transfers_latest.json (isti format kot konzolni scraper),
da ga process_transfers.py predela naprej.

Uporaba:  python eb_scrape.py [izhod.json]
Privzeti izhod: eb_transfers_latest.json
"""

import sys, re, json, time, html as _html
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

try:
    import requests
except ImportError:
    sys.exit("Manjka 'requests'. Namesti: pip install requests beautifulsoup4")

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Manjka 'beautifulsoup4'. Namesti: pip install requests beautifulsoup4")

# --- iste tarce kot v eb_fetch_daily.js ---
TARGETS = ["Albania","Armenia","Austria","Azerbaijan","Belarus","Belgium","Bosnia",
    "Bulgaria","Croatia","Cyprus","Czech-Republic","Denmark","Estonia","Finland","France",
    "Georgia","Germany","Greece","Holland","Hungary","Iceland","Ireland","Israel","Italy",
    "Kosovo","Latvia","Lithuania","Luxembourg","Malta","Moldova","Montenegro","North-Macedonia",
    "Norway","Poland","Portugal","Romania","Russia","Scotland","Serbia","Slovakia","Slovenia",
    "Spain","Sweden","Switzerland","Turkey","Ukraine","United-Kingdom","EuroLeague","EuroCup",
    "Basketball-Champions-League","FIBA-Europe-Cup","ABA-League","VTB-United-League","BNXT-League"]

URL = "https://www.eurobasket.com/{}/basketball-Transfers.aspx"

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.eurobasket.com/",
    "Connection": "keep-alive",
}

# --- regexi (identicni JS-u) ---
DATA_RE  = re.compile(r'^\((\d{3})-([A-Z/]{1,5})-(\d{4})\)$')
DATA_NOY = re.compile(r'^\((F?\d{4})\)$')
TO_RE    = re.compile(r'^to (.+?)\s*\(([^)]+)\)\s*$')
CLUB_RE  = re.compile(r'^[A-Z0-9\u00C0-\u017F][A-Z0-9 .\-\u00C0-\u017F]{3,}(\s*\([^)]+\))?$')
SKIP     = re.compile(r'^Select League|^Updated on|^Liga |^Check also|^Transfers in|^Players Left$|^Free Agents$|^$')

def clean(s):
    return (s or "").replace("\u00a0", " ").strip()


def html_to_text(html):
    """Priblizek brskalnikovega innerText: blok elementi -> nove vrstice."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    # vsak <br> in blok element loci v svojo vrstico
    for br in soup.find_all("br"):
        br.replace_with("\n")
    block = ("p","div","tr","li","h1","h2","h3","h4","h5","h6","table",
             "thead","tbody","td","th","ul","ol","section","article","header","footer")
    for tag in soup.find_all(block):
        tag.insert_before("\n")
        tag.insert_after("\n")
    text = soup.get_text()
    text = _html.unescape(text)
    # normaliziraj + odstrani prazne vrstice (blok-pretvorba jih ustvari vec
    # kot brskalnikov innerText; parser racuna na sosednje NEprazne vrstice)
    lines = [clean(l) for l in text.split("\n")]
    lines = [l for l in lines if l != ""]
    return "\n".join(lines)


def build_nat_map(html):
    """Mapa ime->nacionalnost iz flag slik (identicno JS regexu)."""
    m = {}
    re_nat = re.compile(
        r'flags/[A-Za-z]+\.(?:png|gif)"[^>]*alt="([^"]*)"[^>]*>\s*'
        r'<a[^>]*player/[^"]*"[^>]*>\s*(?:&nbsp;)?([^<]+)</a>', re.I)
    for mt in re_nat.finditer(html):
        nat = mt.group(1).strip()
        name = clean(mt.group(2))
        if name:
            m[name.lower()] = nat
    return m


def parse_page(txt, nat_map, country):
    lines = [l.strip() for l in txt.split("\n")]
    start = next((i for i,l in enumerate(lines) if "Updated on" in l), -1)
    if start < 0: start = 0
    end = next((i for i,l in enumerate(lines) if i > start and l == "Eurobasket.com"), -1)
    if end < 0: end = len(lines)
    C = lines[start:end]
    recs = []
    club = None
    section = None
    for i, l in enumerate(C):
        if l == "Players Left": section = "left"; continue
        if l == "Free Agents":  section = "free"; continue
        m  = DATA_RE.match(l)
        m2 = DATA_NOY.match(l)
        if m or m2:
            name = ""
            for j in range(i-1, max(-1, i-5), -1):
                cj = C[j] if 0 <= j < len(C) else ""
                if cj and not SKIP.match(cj) and not DATA_RE.match(cj) \
                   and not DATA_NOY.match(cj) and not TO_RE.match(cj):
                    name = cj; break
            if not name: continue
            nm = clean(name)
            if m:
                height = int(m.group(1)); pos = m.group(2); born = int(m.group(3))
            else:
                height = None; pos = None; born = int(m2.group(1).replace("F",""))
            rec = {"country": country, "name": nm,
                   "nat": nat_map.get(nm.lower()),
                   "height": height, "pos": pos, "born": born,
                   "club": clean(club), "section": section,
                   "to": None, "toLeague": None}
            for j in range(i+1, min(len(C), i+4)):
                if not C[j]: continue
                tm = TO_RE.match(C[j])
                if tm:
                    rec["to"] = clean(tm.group(1)); rec["toLeague"] = clean(tm.group(2))
                break
            recs.append(rec)
        elif CLUB_RE.match(l) and not l.startswith("to ") and not DATA_RE.match(l):
            club = l; section = None
    return recs


def fetch_one(tgt, session, retries=3):
    last = None
    for attempt in range(retries):
        try:
            r = session.get(URL.format(tgt), headers=HEADERS, timeout=40)
            if r.status_code != 200:
                last = f"HTTP {r.status_code}"
                time.sleep(1.5 * (attempt + 1)); continue
            html = r.text
            nat_map = build_nat_map(html)
            text = html_to_text(html)
            dm = re.search(r'Updated on:\s*([^\n]+)', text)
            recs = parse_page(text, nat_map, tgt)
            updated = dm.group(1).strip() if dm else ""
            return {"tgt": tgt, "recs": recs, "updated": updated, "err": False}
        except Exception as e:
            last = str(e); time.sleep(1.5 * (attempt + 1))
    print(f"  ! {tgt}: {last}", file=sys.stderr)
    return {"tgt": tgt, "recs": [], "updated": "", "err": True}


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "eb_transfers_latest.json"
    session = requests.Session()
    all_recs = []
    upd_map = {}
    fails = 0
    print(f"Strani: {len(TARGETS)} (paralelno po 6)")
    # paralelno po 6, kot v JS
    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(lambda t: fetch_one(t, session), TARGETS))
    for r in results:
        if r["err"]: fails += 1
        all_recs.extend(r["recs"])
        upd_map[r["tgt"]] = r["updated"]
    moves = sum(1 for r in all_recs if r.get("to"))
    out = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": "Eurobasket",
        "season": "2025-2026",
        "count": len(all_recs),
        "updated": upd_map,
        "records": all_recs,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"GOTOVO. {len(all_recs)} zapisov, {moves} odhodov, {fails} strani neuspesnih.")
    print(f"Zapisano: {out_path}")
    if fails > len(TARGETS) // 2:
        print("OPOZORILO: vec kot polovica strani ni uspela — morda blokada (Cloudflare/IP).",
              file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
