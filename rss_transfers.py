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
    # "Player signs/inks (... deal) with Club" — dovoli besede med signal in klubom
    (re.compile(r'^(?P<player>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30}?)\s+'
                r'(?:signs?|signed|inks?)\s+(?:[\w\-]+\s+){0,3}?(?:deal\s+)?with\s+'
                r'(?P<club>[A-Z][\w\u00C0-\u024F.\'\- ]{2,30})', re.I), 'player_deal'),
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
_NOISE = re.compile(r'\b(beats?|defeats?|wins?|loses?|lost|score|game|match|preview|'
                    r'recap|highlights?|MVP|award|injury|injured|suspend|'
                    r'retire|dies|passed\s+away|coach\s+of\s+the|power\s+rankings|'
                    r'standings|playoff|final\s+four|round\s+\d|'
                    # dodatni ne-prestop glagoli (iz pravih napak)
                    r'apologi[sz]es|stuns?|crushes?|leads?|explains?|responds?|'
                    r'moves?\s+closer|hints?\s+at|had\s+to|commits?\s+to|'
                    r'open\s+to|nearing|expected\s+to\s+become|set\s+to\s+become|'
                    r'reportedly\s+sign|draw\s+to|fail(s|ed)?\s+to|book|reach|'
                    r'vows?|intends?\s+to|ready\s+to|passed\s+on|'
                    r'president|citizenship|ownership|qualifying\s+squad|'
                    r'miss\s+|decision\s+to|talks?\s+nba|super\s+excited)\b', re.I)

# besede, ki niso klubi (da ne lovimo "Player to EuroLeague")
_NOT_CLUB = {'euroleague','eurocup','bcl','nba','europe','fiba','the','his','her',
             'free','agency','agent','team','squad','roster','contract','deal',
             'liga','league','serie','acb','lega','this','that','here','there',
             'european','greece','turkey','spain','italy','france','slovenia',
             'lakers','nuggets','cavs','pistons','grizzlies','thunder','bulls',
             'usa','team usa','china','australia','puerto'}

# besede, ki ne smejo biti ZACETEK imena igralca (predlogi, clenki, prefiksi)
_BAD_NAME_START = {'with','for','to','a','an','the','of','on','in','at','and',
                   'multi-year','two-year','three-year','four-year','former',
                   'deal','pole','guard','center','forward','star','veteran'}

# narodnost/vloga prefiksi za odstranitev z zacetka imena
_NAME_PREFIX = re.compile(r'^(former\s+[\w\s]+?\s+player\s+|pole\s+|guard\s+|'
                          r'center\s+|forward\s+|star\s+|veteran\s+|'
                          r'nba\s+|ex-?nba\s+)', re.I)


def clean_token(s):
    s = re.sub(r'\s+', ' ', (s or '')).strip(' .,:-–—')
    # odstrani narodnost/vlogo prefiks iz imena
    s = _NAME_PREFIX.sub('', s).strip()
    # odstrani glagolske/predlozne prefikse iz kluba (join/to/with/for/at)
    s = re.sub(r'^(join|joins|to\s+join|with|for|at|to|deal\s+with|'
               r'a\s+\w+\s+deal\s+with|multi-year\s+deal\s+with)\s+', '', s, flags=re.I).strip()
    return s


def _valid_name(name):
    """Ime mora biti videti kot osebno ime: 2-4 besede, brez predlogov na zacetku."""
    if not name:
        return False
    words = name.split()
    if len(words) < 2 or len(words) > 4:  # ime priimek (1-2 dela vsak)
        return False
    if words[0].lower() in _BAD_NAME_START:
        return False
    # vse besede morajo imeti veliko zacetnico (osebno ime)
    if not all(w[0].isupper() for w in words if w):
        return False
    # zavrni, ce vsebuje stevilke ali tipicne ne-ime besede
    if re.search(r'\d', name):
        return False
    return True


def _valid_club(club):
    if not club:
        return False
    if club.lower() in _NOT_CLUB:
        return False
    if club.split()[0].lower() in _BAD_NAME_START:
        return False
    if len(club) < 3 or len(club.split()) > 4:
        return False
    # zavrni klube z genericnimi ne-klub besedami
    if re.search(r'\b(squad|project|list|future|moment|spot|semifinals?|'
                 r'title|deal|career|opportunity|citizenship|ownership|'
                 r'group|cup|games?|season|summer|coach|president)\b', club, re.I):
        return False
    return True


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
        if not _valid_name(player) or not _valid_club(club):
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
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=75)).strftime('%Y-%m-%d')
    for n in news:
        # preskoci stare novice (TalkBasket feedi vracajo tudi arhiv 2014+)
        nd = n.get('date') or ''
        if nd and nd < cutoff:
            continue
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
