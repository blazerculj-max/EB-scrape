#!/usr/bin/env python3
# Procesira eb_transfers_latest.json -> tr_*.json + primerja s prejsnjim za "Novo" pogled
import json, re, os, sys
from collections import defaultdict

LATEST = sys.argv[1] if len(sys.argv)>1 else 'eb_transfers_latest.json'
OUTDIR = 'transfers_data'
os.makedirs(OUTDIR, exist_ok=True)

d = json.load(open(LATEST, encoding='utf-8'))
recs = d['records']

def clean_club(c):
    if not c: return ''
    c = c.replace('\xa0',' ').strip()
    c = re.sub(r'\s*\((Champion|[A-Z0-9]{2,5})\)\s*$','',c).strip()
    return c

NAT_MAP = {
    'USA':'ZDA','Serbian':'Srbija','French':'Francija','Canadian':'Kanada','Croatian':'Hrvaška',
    'Bosnia and Herzegovina':'BiH','Lithuanian':'Litva','Italian':'Italija','Montenegrin':'Črna gora',
    'German':'Nemčija','Slovenian':'Slovenija','Nigerian':'Nigerija','Latvian':'Latvija','Swedish':'Švedska',
    'Ukrainian':'Ukrajina','Spanish':'Španija','Greek':'Grčija','Turkish':'Turčija','Russian':'Rusija',
    'Polish':'Poljska','Czech':'Češka','Austrian':'Avstrija','Belgian':'Belgija','Finnish':'Finska',
    'Israeli':'Izrael','Estonian':'Estonija','Georgian':'Gruzija','Senegalese':'Senegal','British':'V. Britanija',
    'Kosovan':'Kosovo','Slovakian':'Slovaška','Hungarian':'Madžarska','Romanian':'Romunija','Bulgarian':'Bolgarija',
    'Dutch':'Nizozemska','Portuguese':'Portugalska','Swiss':'Švica','Danish':'Danska','Norwegian':'Norveška',
    'Icelandic':'Islandija','Macedonian':'S. Makedonija','Albanian':'Albanija',
}
def norm_nat(n): return NAT_MAP.get(n, n) if n else None

LEAGUE_NAMES = {'EuroLeague':'EvroLiga','EuroCup':'EvroPokal','Basketball-Champions-League':'Liga prvakov (BCL)',
    'FIBA-Europe-Cup':'FIBA Europe Cup','ABA-League':'Liga ABA','VTB-United-League':'Liga VTB',
    'BNXT-League':'BNXT liga','Czech-Republic':'Češka','North-Macedonia':'S. Makedonija','United-Kingdom':'V. Britanija','Bosnia':'BiH'}
def disp_country(c): return LEAGUE_NAMES.get(c, c.replace('-',' '))
COMPS = {'EuroLeague','EuroCup','Basketball-Champions-League','FIBA-Europe-Cup','ABA-League','VTB-United-League','BNXT-League'}

clean = []
for r in recs:
    if not r['name']: continue
    clean.append({'n':r['name'],'h':r['height'],'p':r['pos'],'y':r['born'],'nat':norm_nat(r.get('nat')),
        'c':clean_club(r['club']),'co':r['country'],'coD':disp_country(r['country']),
        's':r['section'],'to':r['to'],'tl':r['toLeague'],'isComp':r['country'] in COMPS,
        'url':r.get('url')})

# --- PRIMERJAVA s prejsnjim ---
# kljuc transferja: ime|klub|destinacija ; kljuc igralca: ime|klub|drzava
prev_path = f'{OUTDIR}/tr_index.json'  # trenutni (postane prejsnji)
new_moves, new_players = [], []
prev = None
if os.path.exists(prev_path):
    # Prejsnji posnetek beri SAMO kot UTF-8. Ce ni veljaven (stara cp1250
    # datoteka ali poskodovan zapis), ga zavrzi in obravnavaj kot prvi zagon —
    # raje to kot lazno "vse je novo" iz napacno dekodiranih smeti.
    try:
        prev = json.load(open(prev_path, encoding='utf-8'))['players']
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError):
        prev = None
    if prev is None:
        print('Opozorilo: prejsnji posnetek ni veljaven UTF-8 — obravnavam kot prvi zagon.')
        try: os.remove(prev_path)
        except OSError: pass

if prev is not None:
    prev_move_keys = set(f"{p['n']}|{p.get('to')}" for p in prev if p.get('to'))
    prev_player_keys = set(f"{p['n']}|{p['c']}|{p['co']}" for p in prev)
    for r in clean:
        if r['to'] and f"{r['n']}|{r['to']}" not in prev_move_keys:
            new_moves.append(r)
        pk = f"{r['n']}|{r['c']}|{r['coD']}"
        if pk not in prev_player_keys:
            new_players.append(r)
    # shrani trenutni kot prejsnji PRED prepisom
    os.rename(prev_path, f'{OUTDIR}/tr_prev_index.json')
    print(f'Primerjava: {len(new_moves)} novih prestopov, {len(new_players)} novih igralcev')
else:
    print('Ni prejsnjega posnetka (prvi zagon) — vse je "novo" se ne racuna.')

by_country = defaultdict(list)
for r in clean: by_country[r['co']].append(r)
transfers = [r for r in clean if r['s']=='left' and r['to']]
all_nats = sorted(set(r['nat'] for r in clean if r['nat']))
search_index = [{'n':r['n'],'c':r['c'],'co':r['coD'],'p':r['p'],'y':r['y'],'h':r['h'],'nat':r['nat'],'s':r['s'],'to':r['to'],'tl':r['tl']} for r in clean]

countries_meta = []
for co, rs in sorted(by_country.items(), key=lambda x:-len(x[1])):
    countries_meta.append({'co':co,'coD':disp_country(co),'n':len(rs),'isComp':co in COMPS,
        'clubs':len(set(r['c'] for r in rs if r['c'])),'moves':sum(1 for r in rs if r['to']),
        'updated':d.get('updated',{}).get(co,'')})

# "Novo" datoteka
json.dump({'generated':d['generated'],'newMoves':new_moves,'newPlayers':new_players[:500]},
          open(f'{OUTDIR}/tr_new.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))

json.dump({'generated':d['generated'],'season':'2025-2026','total':len(clean),'totalMoves':len(transfers),
           'nats':all_nats,'newMoves':len(new_moves),'newPlayers':len(new_players),'countries':countries_meta},
          open(f'{OUTDIR}/tr_manifest.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
json.dump({'moves':transfers}, open(f'{OUTDIR}/tr_moves.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
json.dump({'players':search_index}, open(f'{OUTDIR}/tr_index.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
for co, rs in by_country.items():
    json.dump({'co':co,'coD':disp_country(co),'players':rs}, open(f'{OUTDIR}/tr_{co}.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))

# ─────────────────────────────────────────────────────────────
# DODATNO: izhod za EuroBall transfer app (full + incremental)
# Pretvori interni 'clean' zapis v app format (player/from/to/...).
# eurobasket.json      = cela baza (full fetch)
# eurobasket_new.json  = samo novosti od zadnjega posnetka (🆕 Novo)
# ─────────────────────────────────────────────────────────────
import hashlib

def app_id(r):
    raw = f"eb-{r.get('n','')}-{r.get('c','')}-{r.get('to','')}".lower()
    return "eb-" + hashlib.md5(raw.encode("utf-8")).hexdigest()[:10]

def app_league(r):
    tl = (r.get('tl') or '').strip()
    coD = (r.get('coD') or '').strip()
    if tl and coD and tl != coD:
        return f"{tl} · {coD}"
    return tl or coD or 'Europe'

def app_summary(r, status):
    # Samo metapodatki: pozicija · letnik · narodnost · visina.
    # Poteza (from -> to) se NE ponavlja tukaj — kartica jo ze prikaze posebej.
    bits = []
    if r.get('p'):   bits.append(r['p'])
    if r.get('y'):   bits.append(str(r['y']))
    if r.get('nat'): bits.append(r['nat'])
    if r.get('h'):   bits.append(f"{r['h']}cm")
    return ' · '.join(bits)

def to_app(r, is_new=False):
    to = (r.get('to') or '').strip()
    if to:
        status = 'signed'
    elif r.get('s') == 'left':
        status = 'left'; to = 'Prosti igralec'
    else:
        status = 'roster'; to = r.get('c') or '—'
    obj = {
        'id': app_id(r),
        'player': (r.get('n') or 'Unknown').strip(),
        'pos': (r.get('p') or '?'),
        'from': r.get('c') or '—',
        'to': to,
        'league': app_league(r),
        'status': status,
        'date': '',
        'summary': app_summary(r, status),
        'source_name': 'Eurobasket',
        'source_url': 'https://basketball.eurobasket.com/',
        'nat': r.get('nat'),
        'born': r.get('y'),
        'height': r.get('h'),
        'country': r.get('coD'),
        'playerUrl': r.get('url'),
        'origin': 'eurobasket',
    }
    if is_new:
        obj['isNew'] = True
    return obj

# Mnozica ID-jev novih (prestopi + igralci) za oznako isNew v polni bazi
new_ids = set()
for r in new_moves + new_players:
    new_ids.add(app_id(r))

# --- firstSeen: kdaj je bil prestop PRVIC zaznan (ohranjeno med zagoni) ---
# Hranimo seen.json: { app_id: ISO-cas }. Star zig obdrzimo, nov zapisemo zdaj.
from datetime import datetime, timezone
SEEN_PATH = f'{OUTDIR}/seen.json'
now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
seen = {}
if os.path.exists(SEEN_PATH):
    try:
        seen = json.load(open(SEEN_PATH, encoding='utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        seen = {}
# samo dejanski prestopi dobijo firstSeen (ne roster seznami)
for r in clean:
    if r.get('to'):
        aid = app_id(r)
        if aid not in seen:
            seen[aid] = now_iso
json.dump(seen, open(SEEN_PATH, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# --- ohrani obstojece verify oznake iz prejsnje baze ---
# verify_transfers.py pise verify v eurobasket.json PO tem skriptu. Ker tukaj
# bazo regeneriramo iz nic, bi brez tega izgubili potrjene linke, katerih
# novica je medtem izginila iz feeda. Zato jih preberemo in prenesemo naprej.
prev_verify = {}
EB_PATH = f'{OUTDIR}/eurobasket.json'
if os.path.exists(EB_PATH):
    try:
        prevdata = json.load(open(EB_PATH, encoding='utf-8'))
        for it in prevdata.get('items', []):
            if it.get('verify') and it['verify'].get('url'):
                prev_verify[it['id']] = it['verify']
    except (json.JSONDecodeError, UnicodeDecodeError, KeyError):
        prev_verify = {}

# Full — z isNew + firstSeen + ohranjen verify
# DEDUP: isti prestop se v Eurobasketu pojavi veckrat (pod drzavo izvora IN
# pod tekmovanji kot BCL/BNXT). Vsi delijo isti app_id. Obdrzimo enega —
# prednostno zapis iz DRZAVE (isComp=False), ne iz tekmovanja.
by_id = {}
order = []
for r in clean:
    # roster zapisov (brez 'to') NE dedupliciramo — legitimno se ponovijo
    if not r.get('to'):
        order.append(('keep', r)); continue
    aid = app_id(r)
    if aid not in by_id:
        by_id[aid] = r
        order.append(('id', aid))
    else:
        # ze imamo prestop s tem id; zamenjaj samo ce je obstojeci iz tekmovanja
        # in nov iz prave drzave (boljsi izvor). Sicer preskoci (dvojnik).
        if by_id[aid].get('isComp') and not r.get('isComp'):
            by_id[aid] = r

app_items = []
seen_ids = set()
for kind, val in order:
    if kind == 'keep':
        r = val
    else:
        aid = val
        if aid in seen_ids:
            continue
        seen_ids.add(aid)
        r = by_id[aid]
    obj = to_app(r)
    aid = app_id(r)
    if aid in new_ids:
        obj['isNew'] = True
    if r.get('to') and aid in seen:
        obj['firstSeen'] = seen[aid]
    if obj['id'] in prev_verify:
        obj['verify'] = prev_verify[obj['id']]
    app_items.append(obj)

# 2. stopnja dedup: isti IGRALEC + isti CILJ a razlicen izvor (Eurobasket
# istega igralca vcasih navede z razlicnim prejsnjim klubom). Skoraj zagotovo
# isti prestop -> obdrzimo enega, prednostno zapis iz prave drzave.
def _norm(s): return (s or '').strip().lower()
dedup2 = {}
result = []
for obj in app_items:
    if obj.get('status') == 'roster' or not obj.get('to'):
        result.append(obj); continue
    key = (_norm(obj.get('player')), _norm(obj.get('to')))
    if key not in dedup2:
        dedup2[key] = len(result)
        result.append(obj)
    else:
        idx = dedup2[key]
        prev = result[idx]
        # zamenjaj le, ce je obstojeci iz tekmovanja, nov pa iz prave drzave
        prev_comp = '·' in (prev.get('league') or '') and any(
            c in (prev.get('league') or '') for c in ['BCL','BNXT','EvroLiga','EuroLeague','EuroCup','FIBA Europe Cup','Liga prvakov'])
        new_comp = '·' in (obj.get('league') or '') and any(
            c in (obj.get('league') or '') for c in ['BCL','BNXT','EvroLiga','EuroLeague','EuroCup','FIBA Europe Cup','Liga prvakov'])
        if prev_comp and not new_comp:
            # ohrani firstSeen/verify od prejsnjega, a vzemi boljsi izvor
            if 'firstSeen' in prev and 'firstSeen' not in obj: obj['firstSeen'] = prev['firstSeen']
            if 'verify' in prev and 'verify' not in obj: obj['verify'] = prev['verify']
            if prev.get('isNew'): obj['isNew'] = True
            result[idx] = obj
app_items = result
json.dump({'generated_at': d['generated'], 'schema_version': 1, 'source': 'Eurobasket master',
           'season': '2025-2026', 'count': len(app_items), 'items': app_items},
          open(f'{OUTDIR}/eurobasket.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))

# Incremental (novi prestopi + novi igralci; prestopi imajo prednost)
seen_new = set()
new_items = []
for r in new_moves:
    obj = to_app(r, is_new=True); new_items.append(obj); seen_new.add(obj['id'])
for r in new_players:
    obj = to_app(r, is_new=True)
    if obj['id'] not in seen_new:
        new_items.append(obj); seen_new.add(obj['id'])
json.dump({'generated_at': d['generated'], 'schema_version': 1, 'source': 'Eurobasket incremental',
           'count': len(new_items), 'newMoves': len(new_moves), 'newPlayers': len(new_players),
           'items': new_items},
          open(f'{OUTDIR}/eurobasket_new.json','w',encoding='utf-8'), ensure_ascii=False, separators=(',',':'))
print(f'App izhod: eurobasket.json ({len(app_items)}), eurobasket_new.json ({len(new_items)} novih)')

print(f'Procesirano: {len(clean)} zapisov, {len(transfers)} prestopov, {len(all_nats)} nacionalnosti')
