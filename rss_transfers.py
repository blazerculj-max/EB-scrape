#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rss_transfers.py — izlusci PRESTOPE iz RSS novic (ne le potrjuje Eurobasket).

Bere iste RSS vire kot verify_transfers.py, in iz NASLOVOV poskusa razbrati
"kdo gre kam" + ali je potrjeno ali govorica. Rezultat -> rss_transfers.json.

POMEMBNO: luscenje iz prostega besedila je negotovo. Ujamemo jasne naslove
("X signs with Y", "Y lands X"), marsikaj pa zgresimo. Zato so ti prestopi
v LOCENEM zavihku, ne pomesani z zanesljivim Eurobasketom.

Uporaba:  python rss_transfers.py [izhod.json]
"""

import sys, re, json, hashlib
from datetime import datetime, timezone

# ponovno uporabi vire + pomozne funkcije iz verify_transfers.py
try:
    import verify_transfers as V
except ImportError:
    sys.exit("rss_transfers.py mora biti v isti mapi kot verify_transfers.py")

OUT = sys.argv[1] if len(sys.argv) > 1 else "rss_transfers.json"

# ── besede, ki kazejo, da naslov SPLOH govori o prestopu ──
# (brez tega bi luscili iz vsake novice, tudi o tekmah)
TRANSFER_HINT = re.compile(
    r'(\b(sign|signs|signed|signing|joins?|joined|lands?|adds?|acquires?|inks?|'
    r'agree|agreed|deal|completes?|returns?|moves?|heads?\s+to|'
    r'extends?|extension|re-?sign|renew|waives?|releases?|parts?\s+ways|'
    r'leaves?|departs?|exits?|interested|interest|talks|linked|target|'
    r'rumou?r|reportedly|set\s+to|close\s+to|eyeing|pursuing|'
    # SLO
    r'podpis|prestop|okrepi|pripelj|prihaja|vraca|odhaja|zanima|posod|'
    # IT/ES
    r'firma|ufficiale|ingaggi|interessat|ficha|fichaje|acuerdo|incorpora)\b'
    r'|\bto\s+[A-Z])', re.I)

# ── vzorci za luscenje "igralec -> klub" iz naslova ──
# vsak vrne (player, club). Preizkusimo po vrsti; prvi zadetek zmaga.
_PATTERNS = [
    # "Club signs/lands/adds Player"
    (re.compile(r'^(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:officially\s+)?(?:sign|signs|signed|lands?|adds?|acquires?|inks?|completes?\s+(?:signing\s+of)?)\s+'
                r'(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'club_first'),
    # "Player signs/joins (with) Club"
    (re.compile(r'^(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:signs?|signed|joins?|joined|inks?\s+deal\s+with|heads?\s+to|moves?\s+to|returns?\s+to)\s+'
                r'(?:with\s+|for\s+)?(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'player_first'),
    # "Player to Club" (npr. "Saben Lee to Zalgiris", z ali brez locil na koncu)
    (re.compile(r'^(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+to\s+'
                r'(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s*[:.\-–]?\s*$', re.I), 'player_to'),
    # SLO: "Player se vraca v / prestopa v / okrepil Club"
    (re.compile(r'^(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:se\s+vraca\s+v|prestopa\s+v|prestopil\s+(?:k|v)|okrepil|podpisal\s+(?:z|za))\s+'
                r'(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'slo_player'),
    # SLO: "Club okrepil/pripeljal/podpisal Player"
    (re.compile(r'^(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:okrepil|pripeljal|podpisal|pridobil)\s+'
                r'(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'slo_club'),
    # IT: "Club firma/ingaggia/ufficiale Player" / "interessata a Player"
    (re.compile(r'^(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:firma|ingaggia|preso|ufficiale[:,]?|interessat[ao]\s+a)\s+'
                r'(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'it_club'),
    # "Club interested in / eyeing / targets Player"  (govorica)
    (re.compile(r'^(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:interested\s+in|eyeing|targets?|pursuing|in\s+talks\s+with|wants?|monitoring)\s+'
                r'(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'club_rumor'),
    # "Player linked with / set to join Club"  (govorica) — klub je drugi
    (re.compile(r'^(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:linked\s+with|set\s+to\s+join|close\s+to\s+(?:joining|signing\s+(?:with|for)))\s+'
                r'(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'player_rumor'),
]

# besede, ki naredijo zadetek GOVORICA (tudi ce vzorec ni rumor-tip)
_RUMOR_HINT = re.compile(r'\b(rumou?r|reportedly|interested|interest|talks|linked|'
                         r'could|might|set\s+to|close\s+to|eyeing|target|pursuing|'
                         r'naj\s+bi|zanima|govorice|menda|'
                         r'interess|trattativa|suena|interes|podr[ií]a)\b', re.I)

# ocitno NE-prestop naslovi (filtriraj ven)
_NOISE = re.compile(r'\b(beats?|defeats?|wins?|loses?|score|game|match|preview|'
                    r'recap|highlights?|MVP|award|injury|injured|suspend|'
                    r'retire|dies|passed\s+away|coach\s+of\s+the|power\s+rankings|'
                    r'standings|playoff|final\s+four|round\s+\d)\b', re.I)

# besede, ki niso klubi (da ne lovimo "Player to EuroLeague")
_NOT_CLUB = {'euroleague','eurocup','bcl','nba','europe','fiba','the','his','her',
             'free','agency','agent','team','squad','roster','contract','deal',
             'liga','league','serie','acb','lega','this','that','here','there'}


def clean_token(s):
    return re.sub(r'\s+', ' ', (s or '')).strip(' .,:-–—')


def _fold(s):
    """Splosci naglase (c<-c,s<-s...) da slovenski/IT naslovi ujamejo vzorce."""
    import unicodedata
    nf = unicodedata.normalize('NFD', s)
    out = ''.join(c for c in nf if unicodedata.category(c) != 'Mn')
    for a, b in {'ı':'i','ş':'s','ğ':'g','ø':'o','ł':'l','đ':'d'}.items():
        out = out.replace(a, b).replace(a.upper(), b.upper())
    return out


def extract_transfer(title):
    """Vrne (player, club, is_rumor) ali None. player/club sta v IZVIRNI obliki."""
    orig = title.strip()
    if _NOISE.search(orig):
        return None
    if not TRANSFER_HINT.search(_fold(orig)):
        return None
    # vzorce poskusi na fold-ani verziji, a indekse preslikaj nazaj na original
    folded = _fold(orig)
    for rx, kind in _PATTERNS:
        m = rx.search(folded)
        if not m:
            continue
        # vzemi izvirni izrez (iste pozicije v orig in folded — folding ne meni dolzine)
        player = clean_token(orig[m.start('player'):m.end('player')])
        club = clean_token(orig[m.start('club'):m.end('club')])
        if not player or not club:
            continue
        if club.lower() in _NOT_CLUB or player.lower() in _NOT_CLUB:
            continue
        if len(player) < 3 or len(club) < 3:
            continue
        is_rumor = (kind in ('club_rumor', 'player_rumor')) or bool(_RUMOR_HINT.search(folded))
        return (player, club, is_rumor)
    return None


def rss_id(player, club):
    raw = f"rss-{player}-{club}".lower()
    return "rss-" + hashlib.md5(raw.encode('utf-8')).hexdigest()[:10]


def main():
    news = V.collect_news()
    if len(news) < 5:
        print("Premalo novic — preskakujem (verjetno feedi nedosegljivi).", file=sys.stderr)
        # vseeno zapisi prazno, da app ne pokaze starih
        json.dump({'generated_at': datetime.now(timezone.utc).isoformat(),
                   'count': 0, 'items': []},
                  open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
        return

    seen = {}
    for n in news:
        res = extract_transfer(n['title'])
        if not res:
            continue
        player, club, is_rumor = res
        tid = rss_id(player, club)
        item = {
            'id': tid,
            'player': player,
            'to': club,
            'status': 'rumor' if is_rumor else 'signed',
            'is_rumor': is_rumor,
            'headline': n['title'],
            'src': n['src'],
            'url': n['link'] or None,
            'date': n.get('date') or None,
        }
        # ce ze imamo isti id: potrjen prevlada nad govorico
        if tid in seen:
            if seen[tid]['is_rumor'] and not is_rumor:
                seen[tid] = item
        else:
            seen[tid] = item

    items = list(seen.values())
    # najprej potrjeni, nato govorice; znotraj po datumu (novejse zgoraj)
    items.sort(key=lambda x: (x['is_rumor'], x['date'] or ''), reverse=False)
    confirmed = sum(1 for i in items if not i['is_rumor'])
    rumors = sum(1 for i in items if i['is_rumor'])
    json.dump({'generated_at': datetime.now(timezone.utc).isoformat(),
               'count': len(items), 'confirmed': confirmed, 'rumors': rumors,
               'items': items},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f"RSS prestopi: {len(items)} (potrjeni={confirmed}, govorice={rumors}) iz {len(news)} novic")
    print(f"Zapisano: {OUT}")


if __name__ == '__main__':
    main()
