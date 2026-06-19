#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_transfers.py — preveri Eurobasket odhode proti RSS novicam.

Bere vec RSS virov (vec jezikov), in za vsak odhod V VECJO LIGO poisce,
ali ga novice potrjujejo. Doda polje "verify" v vsak ustrezen zapis
eurobasket.json + eurobasket_new.json.

Oznake (verify.status):
  "confirmed"  — ime igralca + klub + signalna beseda (podpis) v isti novici
  "mentioned"  — ime + klub skupaj, a brez jasne signalne besede (mogoce govorica)
  "unconfirmed"— v vecji ligi, a ni najdeno v nobeni novici
  (brez verify) — odhod NI v vecji ligi -> ne ocenjujemo (mediji ne porocajo)

POMEMBNO: "unconfirmed" NI dokaz laznega prestopa — pomeni le "ni v nedavnih
novicah". Pomaga lo/prednostno preveriti sumljive, ne razsoja dokoncno.

Uporaba:  python verify_transfers.py [transfers_data]
"""

import sys, os, re, json, time, html as _html, unicodedata
from concurrent.futures import ThreadPoolExecutor

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Manjka requests/bs4. Namesti: pip install requests beautifulsoup4")

# ── RSS viri (vec jezikov). Mrtev vir se preprosto preskoci. ──
FEEDS = [
    # agregatorji (pan-evropsko)
    ("Sportando",      "https://sportando.basketball/en/feed/"),
    ("Sportando-rumors","https://sportando.basketball/en/rumors/basket-rumors/feed/"),
    ("Sportando-trans","https://sportando.basketball/en/basketball-transactions/feed/"),
    ("Eurohoops",      "https://www.eurohoops.net/en/feed/"),
    ("BallinEurope",   "https://www.ballineurope.com/feed/"),
    # uradni medijski partner EuroLeague + FIBA: loceni feedi po tekmovanjih
    ("TalkBasket-EL",  "https://www.talkbasket.net/euroleague/feed"),
    ("TalkBasket-EC",  "https://www.talkbasket.net/eurocup/feed"),
    ("TalkBasket-BCL", "https://www.talkbasket.net/bcl/feed"),
    ("TalkBasket-FEC", "https://www.talkbasket.net/category/fiba-europe-cup/feed"),
    ("TalkBasket-NT",  "https://www.talkbasket.net/fiba/feed"),         # nacionalne reprezentance/zveze
    ("TalkBasket-DOM", "https://www.talkbasket.net/domestic/feed"),      # domace lige
    ("TalkBasket-trans","https://www.talkbasket.net/transfers/feed"),    # signings & rumors
    # jezikovni / nacionalni viri
    ("Sportando-IT",   "https://www.sportando.basketball/it/feed/"),
    ("Eurohoops-ES",   "https://www.eurohoops.net/basket/spain/feed/"),  # ACB / spanska kosarka
    ("Gigantes-ES",    "https://www.gigantes.com/feed/"),                # spanska kos. revija
    ("Solobasket-ES",  "https://www.solobasket.com/feed"),
]

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
    "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.8",
    "Accept-Language": "en,it,es,sl;q=0.8",
}

# ── Lige, ki jih mediji realno pokrivajo (verifikacija samo zanje) ──
MAJOR_LEAGUES = {
    'Liga Endesa','ACB','Serie A','LBA','BBL','Betclic ELITE ProA','LNB','ProA',
    'LKL','VTB United League','Winner League','GBL','BSL','ABA League','Liga OTP banka',
    'EuroLeague','EuroCup','Basketball Champions League','BCL','FIBA Europe Cup',
}

# ── Signalne besede za POTRJEN prestop (vec jezikov) ──
SIGN_WORDS = [
    # EN
    r'sign(s|ed|ing)?', r'joins?', r'joined', r'agree(s|d)?', r'official', r'announce(s|d)?',
    r'deal', r'contract', r'completes?', r'lands?', r'adds?', r'acquires?', r'inks?',
    # IT
    r'firma', r'firmato', r'ufficiale', r'ingaggi(a|o|ato)', r'accordo', r'preso',
    # ES
    r'fich(a|aje|ado)', r'firma', r'oficial', r'acuerdo', r'incorpora', r'refuerzo', r'nuevo jugador',
    # govorica (NE potrditev) — za locevanje
]
RUMOR_WORDS = [
    r'rumou?r', r'interest(ed)?', r'in talks', r'talks with', r'linked', r'could', r'reportedly',
    r'set to', r'eyeing', r'target', r'monitoring', r'pursuing', r'close to', r'considering',
    r'interess(e|ato)', r'trattativa', r'sondaggio',
    r'interes', r'suena', r'pretende', r'negocia', r'podr[ií]a',
]
SIGN_RE  = re.compile(r'\b(' + '|'.join(SIGN_WORDS) + r')\b', re.I)
RUMOR_RE = re.compile(r'\b(' + '|'.join(RUMOR_WORDS) + r')\b', re.I)


def strip_accents(s):
    nf = unicodedata.normalize('NFD', s)
    return ''.join(c for c in nf if unicodedata.category(c) != 'Mn')

def norm(s):
    """Normaliziraj za primerjavo: brez naglasov, male crke, brez locil."""
    s = strip_accents(str(s or '')).lower()
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def strip_html(s):
    return re.sub(r'\s+', ' ', _html.unescape(re.sub(r'<[^>]+>', ' ', str(s or '')))).strip()


def _parse_items(content, name):
    soup = BeautifulSoup(content, "xml")
    items = []
    for it in soup.find_all(["item", "entry"]):
        title = strip_html(it.find("title").get_text() if it.find("title") else "")
        desc_el = it.find("description") or it.find("summary") or it.find("content")
        desc = strip_html(desc_el.get_text() if desc_el else "")
        link_el = it.find("link")
        link = (link_el.get("href") or link_el.get_text()).strip() if link_el else ""
        items.append({"src": name, "title": title, "desc": desc,
                      "link": link, "text": norm(title + " " + desc),
                      "raw": title + " " + desc})
    return items


def fetch_feed(name_url):
    name, url = name_url
    # Drugi nabor headerjev za vire z blago anti-bot zascito (npr. 403).
    ALT = dict(HEADERS, **{
        "Accept": "*/*",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
        "Cache-Control": "no-cache",
    })
    for hdrs in (HEADERS, ALT):
        try:
            r = requests.get(url, headers=hdrs, timeout=30)
            if r.status_code == 200:
                return _parse_items(r.content, name)
            if r.status_code in (403, 429):
                continue  # poskusi z drugim naborom headerjev
            print(f"  ! {name}: HTTP {r.status_code}", file=sys.stderr)
            return []
        except Exception as e:
            print(f"  ! {name}: {e}", file=sys.stderr)
            return []
    print(f"  ! {name}: blokiran (403/429 tudi po drugem poskusu)", file=sys.stderr)
    return []


def collect_news():
    print(f"Berem {len(FEEDS)} RSS virov…")
    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(fetch_feed, FEEDS))
    news = [n for sub in results for n in sub]
    print(f"  zbranih {len(news)} novic")
    return news


# tokeni imena/kluba za ujemanje (zadnji priimek + glavna klubska beseda)
def name_tokens(name):
    t = [w for w in norm(name).split() if len(w) >= 3]
    return t

def club_tokens(club):
    stop = {'bc','kk','sc','cb','club','team','basket','basketball','baloncesto',
            'pallacanestro','kosarkarski','of','the','de','la','el'}
    return [w for w in norm(club).split() if len(w) >= 3 and w not in stop]


def _word_positions(tokens, target):
    """Indeksi, kjer se cela beseda 'target' pojavi v seznamu tokenov."""
    return [i for i, w in enumerate(tokens) if w == target]


def verify_move(rec, news):
    """Vrne dict verify za en odhod v vecjo ligo.

    Strogo ujemanje, da se izognemo laznim potrditvam:
    - priimek in vsaj en klubski token morata biti CELI BESEDI (ne podniz),
    - in BLIZU skupaj (v oknu <= 6 besed), ne kjerkoli v clanku,
    - prvo ime (ce obstaja) mora biti tudi prisotno za kratke/pogoste priimke.
    """
    pl = name_tokens(rec['name'])
    cl = club_tokens(rec.get('to') or '')
    if not pl or not cl:
        return {"status": "unconfirmed", "src": None, "url": None}
    surname = pl[-1]
    first = pl[0] if len(pl) > 1 else None
    # kratek/pogost priimek (<=4 crke) zahteva tudi prisotnost prvega imena
    needs_first = len(surname) <= 4

    WINDOW = 6
    best = None  # (rank, item)
    for n in news:
        toks = n["text"].split()
        s_pos = _word_positions(toks, surname)
        if not s_pos:
            continue
        # ce kratek priimek: prvo ime mora biti v novici (kjerkoli)
        if needs_first:
            if not first or first not in toks:
                continue
        # vsaj en klubski token mora biti CELA BESEDA in BLIZU priimka
        near = False
        for cpos_target in cl:
            for c_i in _word_positions(toks, cpos_target):
                if any(abs(c_i - s_i) <= WINDOW for s_i in s_pos):
                    near = True; break
            if near: break
        if not near:
            continue
        # ime+klub sta blizu — klasificiraj
        is_sign  = bool(SIGN_RE.search(n["raw"]))
        is_rumor = bool(RUMOR_RE.search(n["raw"]))
        rank = 2 if (is_sign and not is_rumor) else 1
        if best is None or rank > best[0]:
            best = (rank, n)
            if rank == 2:
                break
    if best is None:
        return {"status": "unconfirmed", "src": None, "url": None}
    rank, n = best
    return {"status": "confirmed" if rank == 2 else "mentioned",
            "src": n["src"], "url": n["link"] or None}


def process_file(path, news):
    if not os.path.exists(path):
        print(f"  (preskok, ni datoteke: {path})"); return
    data = json.load(open(path, encoding='utf-8'))
    items = data.get("items", [])
    n_conf = n_ment = n_unc = n_skip = 0
    for it in items:
        # app format ima league kot "toLeague · drzava"; vzemi prvi del
        raw_league = it.get("league") or it.get("toLeague") or ""
        league = raw_league.split("·")[0].strip()
        status = it.get("status")
        # ocenjujemo SAMO dejanske odhode (status != roster) v vecje lige
        is_move = status not in (None, "roster") or it.get("to") not in (None, "", "—")
        if league in MAJOR_LEAGUES and is_move:
            # rec rabi name + to: app format ima 'player'/'to'
            rec = {"name": it.get("player") or it.get("name") or "",
                   "to": it.get("to") or ""}
            v = verify_move(rec, news)
            it["verify"] = v
            if v["status"] == "confirmed": n_conf += 1
            elif v["status"] == "mentioned": n_ment += 1
            else: n_unc += 1
        else:
            n_skip += 1
    json.dump(data, open(path, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(',', ':'))
    base = os.path.basename(path)
    print(f"  {base}: potrjeni={n_conf} omenjeni={n_ment} nepotrjeni={n_unc} (preskok={n_skip})")


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else "transfers_data"
    news = collect_news()
    if len(news) < 5:
        print("OPOZORILO: skoraj nic novic — preskocim verifikacijo, da ne oznacim vsega kot nepotrjeno.",
              file=sys.stderr)
        sys.exit(0)   # ne pokvari pipeline; pusti datoteke brez verify
    for fn in ("eurobasket.json", "eurobasket_new.json"):
        process_file(os.path.join(outdir, fn), news)
    print("GOTOVO (verifikacija).")


if __name__ == "__main__":
    main()
