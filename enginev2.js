/* ============================================================================
   MYTHIC CLASH — ENGINE v2 (MTG-style: mana/tap, board of 3, hybrid combat)
   ----------------------------------------------------------------------------
   Ruleset:
   - Življenja 30/igralec; zmaga = nasprotnik na 0.
   - Energija = mana: igraš 1/turn na vrsto, ostane in se ODTAPA na začetku
     tvoje poteze; tapaš za priklic/napade/efekte.
   - Board max 3 šampioni; prvi (izbrani) zastonj, dodatni stanejo summonCost.
   - Summon sickness (Naval/charge obide).
   - Boj (hibrid): napadalec tapne + plača ceno napada; cilja ŠAMPIONA ali FACE.
     Ob napadu na face lahko branilec z NETAPNJENIM šampionom prestreže (block).
   - Statusi, weakness/resistance, combo (momentum), Naklonjenost (favor),
     keywordi (charge/lifesteal/overload/onEnter/onDefeat) ostanejo.
   Per-card hardkodirane sposobnosti se migrirajo kasneje (prek keyword sistema).
============================================================================ */
(function (global) {
  "use strict";
  const CARDS = global.CARDS;
  const STARTER_DECKS = global.STARTER_DECKS;

  const START_LIFE = 150;   // z odprtim startom (prazen board), 6-board swarmom in napadalnimi
                            // uroki je 150 boljši — boardi se razvijejo, burst ne konča igre v 2 potezah.
  const BOARD_MAX = 6;
  const HAND_START = 7;
  let UID = 1;

  // Hero Power po panteonu (balansirano: ~2 mana, 1× na potezo)
  const HERO_POWERS = {
    Greek:    { name: "Bolt of Olympus", cost: 2, kind: "heroAttack", value: 25, text: "25 škode nasprotnikovemu heroju (lahko brani netapnjen šampion)." },
    Norse:    { name: "Storm Chain",     cost: 2, kind: "chain",      value: 15, text: "15 škode VSEM nasprotnikovim šampionom." },
    Egyptian: { name: "Solar Renewal",   cost: 2, kind: "heroHeal",   value: 25, text: "Heroj dobi +25 življenja." },
    Slavic:   { name: "Frost Surge",     cost: 2, kind: "chain",      value: 12, text: "12 škode vsem nasprotnikovim šampionom." },
    Roman:    { name: "Legion Bulwark",  cost: 2, kind: "shieldAll",  value: 0,  text: "Vsi tvoji šampioni dobijo Shield." },
    Celtic:   { name: "Moon Mend",       cost: 1, kind: "heroHeal",   value: 18, text: "Heroj dobi +18 življenja (poceni)." },
  };

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function omenRoll() { return Math.random() < 0.5; }
  function def(inst) { return CARDS[inst.cardId]; }
  // Summon cost (mana): balansiran po HP + najmočnejšem napadu + redkosti.
  // Karta lahko ima ročni override d.summonCost.
  const RARITY_FLOOR = { Common: 1, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };
  function maxAtkDmg(d) { return Math.max(0, ...((d.attacks || []).map(a => a.damage || 0))); }
  function summonCostOf(d) {
    if (typeof d.summonCost === "number") return d.summonCost;
    let cost = Math.round(((d.hp || 60) + maxAtkDmg(d) * 1.2) / 60);
    if (d.stage === "ascended") cost += 1;
    cost = Math.max(RARITY_FLOOR[d.rarity] || 1, cost);
    return Math.max(1, Math.min(6, cost));
  }
  // Mana cost za ne-šampione (Oracle/Relic/Realm) — za ko pridejo v v2.
  function manaCostOf(d) {
    if (typeof d.manaCost === "number") return d.manaCost;
    if (d.type === "Realm") return 3;
    if (d.type === "Relic") return d.relicMode === "instant" ? 1 : 2;
    if (d.type === "Oracle") return 2;
    if (d.type === "Equipment") return 2; // orožje/oklep: privzeto 2 (sicer d.manaCost)
    return 0; // Energy = ni cene (je resurs)
  }
  // Oprema (orožje/oklep) pritrjena na šampiona
  function weaponOf(c) { return c && c.weapon ? CARDS[c.weapon] : null; }
  function armorOf(c)  { return c && c.armor  ? CARDS[c.armor]  : null; }
  function equipGrants(c, kw) { const w = weaponOf(c), a = armorOf(c); return (!!w && w.grant === kw) || (!!a && a.grant === kw); }
  function isTaunt(c) { return !!(def(c).taunt || equipGrants(c, "taunt")); } // "zid" — napasti ga moraš najprej

  /* ---------------- Sinergije (Faza 2) ----------------
     Bond = 3+ šampionov enega panteona na boardu (trajen bonus).
     Zavezništvo = 2+ enega IN 2+ drugega panteona (cross-combo). */
  const BONDS = {
    Greek:    { name: "Modrost",     text: "Na začetku poteze potegneš +1 karto." },
    Norse:    { name: "Furija",      text: "Tvoji napadi zadajo +10 škode." },
    Roman:    { name: "Formacija",   text: "Tvoji šampioni prejmejo −10 škode." },
    Egyptian: { name: "Obnova",      text: "Ob koncu poteze tvoji šampioni +15 HP." },
    Slavic:   { name: "Prekletstvo", text: "Napadi proti tarči s statusom +15 škode." },
    Celtic:   { name: "Mistika",     text: "Tvoji šampioni dobijo +20% Umik (dodge)." },
  };
  const ALLIANCES = [
    { id: "order",   a: "Greek",    b: "Roman",    name: "Klasični red", text: "Shield vpije −30 (namesto −20)." },
    { id: "winter",  a: "Norse",    b: "Slavic",   name: "Zimski pakt",  text: "Zmrznjeni prejmejo ×1.4 škode." },
    { id: "warhost", a: "Norse",    b: "Roman",    name: "Vojni pohod",  text: "War napadi +15 škode." },
    { id: "sunsky",  a: "Greek",    b: "Egyptian", name: "Sončno nebo",  text: "Sky in Sun napadi +10 škode." },
    { id: "sunring", a: "Egyptian", b: "Celtic",   name: "Sončni krog",  text: "Ob koncu poteze tvoji šampioni +10 HP." },
  ];
  function pantheonCounts(p) { const c = {}; p.board.forEach(ch => { const pan = def(ch).pantheon; if (pan) c[pan] = (c[pan] || 0) + 1; }); return c; }
  function hasBond(p, pan) { return (pantheonCounts(p)[pan] || 0) >= 3; }
  function hasAlliance(p, id) { const al = ALLIANCES.find(x => x.id === id); if (!al) return false; const c = pantheonCounts(p); return (c[al.a] || 0) >= 2 && (c[al.b] || 0) >= 2; }
  function synergyOf(p) {
    const c = pantheonCounts(p);
    return { counts: c, bonds: Object.keys(c).filter(pan => c[pan] >= 3 && BONDS[pan]), alliances: ALLIANCES.filter(al => (c[al.a] || 0) >= 2 && (c[al.b] || 0) >= 2).map(al => al.id) };
  }
  function synergyLabels(p) {
    const s = synergyOf(p); const out = [];
    s.bonds.forEach(pan => out.push({ kind: "bond", pantheon: pan, name: BONDS[pan].name, text: pan + " Bond — " + BONDS[pan].text }));
    s.alliances.forEach(id => { const al = ALLIANCES.find(x => x.id === id); out.push({ kind: "alliance", id, name: al.name, text: "Zavezništvo — " + al.text }); });
    return out;
  }

  const G = {
    players: [], turn: 0, turnCount: 1, log: [], over: false, winner: null,
    realm: null, difficulty: "normal",
    pendingBlock: null,   // {attackerUid, attackerOwner, atkIndex, dmg, atkType} ko človek brani face
    mulliganPhase: false, mulliganStage: null,
    startingActiveChosen: false,
  };

  function logMsg(m) { G.log.push(m); }

  function makeInstance(cardId) {
    const d = CARDS[cardId];
    const inst = { uid: "u" + (UID++), cardId, type: d.type };
    if (d.type === "Champion") {
      inst.maxHp = d.hp; inst.damage = 0; inst.status = {};
      inst.tapped = false; inst.sick = true;
      inst.relic = null; inst.relicEffect = null;
      inst.weapon = null; inst.armor = null;
      inst._comboType = null; inst._comboCount = 0;
      inst.osirisUsed = false;
    }
    return inst;
  }

  function newPlayer(name, deckId, isAI) {
    const dk = STARTER_DECKS[deckId];
    return {
      name, isAI: !!isAI, deckId, pantheon: dk.pantheon,
      deck: shuffle(dk.list.map(makeInstance)),
      hand: [], discard: [], board: [], mana: [], life: START_LIFE, maxLife: START_LIFE,
      favor: 0, _favorArmed: false, kills: 0,
      heroPower: HERO_POWERS[dk.pantheon] || HERO_POWERS.Greek, heroPowerUsed: false,
      playedEnergyThisTurn: false,
      stats: { damageDealt: 0, cardsDrawn: 0, kills: 0 },
    };
  }

  function cur() { return G.players[G.turn]; }
  function oppOf(p) { return G.players[1 - G.players.indexOf(p)]; }
  function ownerOfChamp(c) { return G.players.find(p => p.board.indexOf(c) >= 0) || null; }
  function hp(c) { return c.maxHp - c.damage; }

  /* ---------------- setup ---------------- */
  function startGame(playerDeckId, aiDeckId, difficulty) {
    UID = 1;
    G.difficulty = difficulty || "normal";
    G.players = [newPlayer("Ti", playerDeckId, false), newPlayer("Nasprotnik", aiDeckId, true)];
    G.turn = 0; G.turnCount = 1; G.over = false; G.winner = null; G.log = [];
    G.pendingBlock = null; G.startingActiveChosen = false; G.noDeckout = false;
    for (const p of G.players) {
      p._mulligans = 0;
      dealOpening(p);
      p.stats.cardsDrawn += HAND_START;
    }
    // brez "free" championa — oba začneta s praznim boardom, vse igraš iz roke
    G.mulliganPhase = true; G.mulliganStage = "keep"; // človek obdrži ali mulligana
    logMsg("Bitka se začenja (v2)! " + G.players[0].name + " vs " + G.players[1].name + ".");
    return G;
  }
  function dealOpening(p, n) {
    n = n || HAND_START;
    let tries = 0;
    do {
      p.deck = shuffle(p.deck.concat(p.hand)); p.hand = [];
      for (let i = 0; i < n && p.deck.length; i++) p.hand.push(p.deck.pop());
      tries++;
    } while (tries < 50 && !p.hand.some(i => def(i).type === "Champion" && def(i).stage === "basic"));
  }
  // človek obdrži roko -> konča mulligan, začne bitko (board prazen)
  function keepHand() {
    if (!G.mulliganPhase) return { ok: false };
    G.mulliganPhase = false; G.startingActiveChosen = true;
    beginTurn(true);
    return { ok: true };
  }

  /* ---------------- turn ---------------- */
  function beginTurn(first) {
    const p = cur();
    p.playedEnergyThisTurn = false;
    p.heroPowerUsed = false;
    // untap mana + champs; clear sickness; overload
    p.mana.forEach(m => m.tapped = false);
    for (const c of p.board) {
      c.tapped = false; c.sick = false;
      if (c._overloadLock > 0) {
        const lose = Math.min(c._overloadLock, p.mana.filter(m => !m.tapped).length);
        for (let k = 0; k < lose; k++) { const m = p.mana.find(x => !x.tapped); if (m) m.tapped = true; }
        c._overloadLock = 0;
        if (lose > 0) logMsg(p.name + ": " + def(c).name + " — Preobremenitev tapne " + lose + " mane.");
      }
      // freeze 50% odprave
      if (c.status.freeze && omenRoll()) { delete c.status.freeze; logMsg(def(c).name + " ni več zamrznjen."); }
      // Guard drža poteče na začetku tvoje poteze
      if (c.status.guard) delete c.status.guard;
    }
    if (!first) draw(p, 1);
    else logMsg(p.name + " začenja (brez vleke na prvi potezi).");
    if (!first && hasBond(p, "Greek")) { draw(p, 1); logMsg(p.name + ": Greek Bond (Modrost) — +1 karta."); } // Greek Bond
  }
  function draw(p, n) {
    for (let i = 0; i < n; i++) {
      if (!p.deck.length) {
        if (G.noDeckout) { logMsg(p.name + " nima več kart za vleko (brez kazni v Pohodu)."); return; }
        endGame(1 - G.players.indexOf(p), p.name + " ne more vleči in izgubi!"); return;
      }
      p.hand.push(p.deck.pop()); p.stats.cardsDrawn++;
    }
  }
  function endTurn() {
    if (G.over) return;
    const p = cur();
    endOfTurn(p);
    if (G.over) return;
    G.turn = 1 - G.turn; G.turnCount++;
    logMsg("— Poteza " + G.turnCount + ": " + cur().name + " —");
    beginTurn(false);
  }
  function endOfTurn(p) {
    for (const c of p.board.slice()) {
      if (c.status.burn) { let d = 15; if (c.status.poison) d += 5; rawDamage(c, p, d, "Burn"); if (checkDeaths()) return; }
      if (c.status.poison) { rawDamage(c, p, 5 + 10 * c.status.poison, "Poison"); c.status.poison++; if (checkDeaths()) return; }
      if (def(c).decay) { rawDamage(c, p, def(c).decay, "Razpad"); if (checkDeaths()) return; } // npr. berserk: vsak konec poteze izgubi HP
      if (c.status.blessing) { c.status.blessing--; if (c.status.blessing <= 0) delete c.status.blessing; }
      // Relikvija Druidic Amulet: +10 HP na koncu poteze
      if (c.relicEffect === "healEndTurn10") { c.damage = Math.max(0, c.damage - 10); }
    }
    // Realm Grove: lastnikovi šampioni +10 HP na koncu poteze
    if (G.realm === "realm-grove" && G.realmOwner === G.players.indexOf(p)) {
      p.board.forEach(c => c.damage = Math.max(0, c.damage - 10));
    }
    // Sinergije: Egyptian Bond (Obnova +15) + Sončni krog zavezništvo (+10)
    let synHeal = 0;
    if (hasBond(p, "Egyptian")) synHeal += 15;
    if (hasAlliance(p, "sunring")) synHeal += 10;
    if (synHeal) { p.board.forEach(c => c.damage = Math.max(0, c.damage - synHeal)); logMsg(p.name + ": Sinergija — šampioni +" + synHeal + " HP."); }
  }

  /* ---------------- mana ---------------- */
  function playEnergy(p, energyInst) {
    if (p.playedEnergyThisTurn) return { ok: false, msg: "Energijo lahko igraš le 1× na turn." };
    const d = def(energyInst); if (d.type !== "Energy") return { ok: false };
    const i = p.hand.indexOf(energyInst); if (i < 0) return { ok: false };
    p.hand.splice(i, 1);
    p.mana.push({ type: d.energyType, tapped: false });
    p.playedEnergyThisTurn = true;
    logMsg(p.name + " igra energijo: " + d.energyType + " (mana " + p.mana.length + ").");
    return { ok: true };
  }
  // ali lahko plačaš cost iz NETAPNJENE mane (brez tapanja)
  function canPay(p, cost, lughAny) {
    const pool = p.mana.filter(m => !m.tapped).map(m => m.type);
    const specific = cost.filter(c => c !== "Any");
    const anyN = cost.filter(c => c === "Any").length;
    const tmp = pool.slice();
    for (const need of specific) {
      let idx = tmp.indexOf(need);
      if (idx < 0 && lughAny && tmp.length) idx = 0;
      if (idx < 0) return false; tmp.splice(idx, 1);
    }
    return tmp.length >= anyN;
  }
  // plača (tapne) cost; vrne true/false
  function payMana(p, cost, lughAny) {
    if (!canPay(p, cost, lughAny)) return false;
    const untapped = p.mana.filter(m => !m.tapped);
    const specific = cost.filter(c => c !== "Any");
    const anyN = cost.filter(c => c === "Any").length;
    for (const need of specific) {
      let m = untapped.find(x => !x.tapped && x.type === need);
      if (!m && lughAny) m = untapped.find(x => !x.tapped);
      m.tapped = true;
    }
    let cnt = 0;
    for (const m of untapped) { if (cnt >= anyN) break; if (!m.tapped) { m.tapped = true; cnt++; } }
    return true;
  }
  // plača z IZBRANIMI mana indeksi (ročna izbira); validira, da pokrijejo cost
  function paySpecific(p, indices, cost, lughAny) {
    const chosen = (indices || []).map(i => p.mana[i]).filter(m => m && !m.tapped);
    if (chosen.length !== cost.length) return false;
    const pool = chosen.map(m => m.type);
    const specific = cost.filter(c => c !== "Any");
    const anyN = cost.filter(c => c === "Any").length;
    const tmp = pool.slice();
    for (const need of specific) {
      let idx = tmp.indexOf(need);
      if (idx < 0 && lughAny && tmp.length) idx = 0;
      if (idx < 0) return false; tmp.splice(idx, 1);
    }
    if (tmp.length !== anyN) return false;
    chosen.forEach(m => m.tapped = true);
    return true;
  }
  // plača cost: ročno (manaIdx) ali samodejno
  function payCost(p, cost, lughAny, manaIdx) {
    if (manaIdx && manaIdx.length) return paySpecific(p, manaIdx, cost, lughAny);
    return payMana(p, cost, lughAny);
  }
  function manaCostArr(n) { return Array.from({ length: n }, () => "Any"); }
  function cardNeedsTarget(d) {
    if (d.type === "Champion") return null;
    if (d.type === "Realm") return null;
    const ENEMY = ["curseEnemy", "dmgEnemy30", "dmgEnemy25", "dmgEnemy40", "fireball40burn", "boltStun50", "burnEnemy", "freezeEnemy"];
    const ALLY = ["healActive60", "healActive40", "blessActive"];
    // aoe* in faceDmg25 ne potrebujejo tarče (prizadenejo ves board / obraz)
    const e = d.effect;
    if (d.type === "Relic" && d.relicMode === "attach") return "ally";
    if (d.type === "Equipment") return "ally";
    if (ENEMY.includes(e)) return "enemy";
    if (ALLY.includes(e)) return "ally";
    return null; // board-wide / draw
  }

  /* ---------------- summon ---------------- */
  function summon(p, champInst, manaIdx) {
    const d = def(champInst);
    if (d.type !== "Champion") return { ok: false };
    if (p.board.length >= BOARD_MAX) return { ok: false, msg: "Board je poln (3)." };
    const cost = manaCostArr(summonCostOf(d));
    if (!canPay(p, cost)) return { ok: false, msg: "Premalo mane za priklic (" + cost.length + ")." };
    const i = p.hand.indexOf(champInst); if (i < 0) return { ok: false };
    if (!payCost(p, cost, false, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    p.hand.splice(i, 1);
    champInst.sick = !d.charge; // Naval obide summon sickness
    p.board.push(champInst);
    logMsg(p.name + " prikliče " + d.name + " (cena " + cost.length + ").");
    onEnter(p, champInst);
    return { ok: true };
  }

  /* ---------------- Aktivirane sposobnosti ---------------- */
  // Champion lahko ima d.activated = { name, cost:[...], effect, text }.
  // Aktivacija plača cost + TAPNE championa (namesto napada).
  function canActivate(p, c) {
    const d = def(c);
    return d.activated && !c.tapped && !c.sick && !c.status.stun && canPay(p, d.activated.cost, d.id === "celtic-lugh");
  }
  function activateAbility(p, champUid, manaIdx) {
    const c = p.board.find(x => x.uid === champUid);
    if (!c) return { ok: false };
    const d = def(c);
    if (!d.activated) return { ok: false, msg: "Ta šampion nima aktivne sposobnosti." };
    if (c.tapped || c.sick || c.status.stun) return { ok: false, msg: "Ne more aktivirati (tapnjen/sick/stun)." };
    const lugh = d.id === "celtic-lugh";
    if (!canPay(p, d.activated.cost, lugh)) return { ok: false, msg: "Premalo mane." };
    if (!payCost(p, d.activated.cost, lugh, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    c.tapped = true;
    const e = d.activated.effect;
    switch (e) {
      case "healSelf30": c.damage = Math.max(0, c.damage - 30); logMsg(def(c).name + " se pozdravi 30 HP."); break;
      case "healBoard20": p.board.forEach(x => x.damage = Math.max(0, x.damage - 20)); logMsg(p.name + ": vsi šampioni +20 HP."); break;
      case "shieldSelf": c.status.shield = true; logMsg(def(c).name + " dvigne Shield."); break;
      case "guard": c.status.guard = true; logMsg(def(c).name + " zavzame obrambno držo (−50% škode)."); break;
      case "blessSelf": c.status.blessing = Math.max(c.status.blessing || 0, 2); logMsg(def(c).name + " dobi Blessing."); break;
      default: logMsg("(sposobnost " + e + " še ni v v2)"); break;
    }
    return { ok: true };
  }

  /* ---------------- Hero Power (1× na potezo) ---------------- */
  function useHeroPower(p, manaIdx) {
    const hpw = p.heroPower; if (!hpw) return { ok: false };
    if (p.heroPowerUsed) return { ok: false, msg: "Hero Power je že uporabljen to potezo." };
    const cost = manaCostArr(hpw.cost);
    if (!canPay(p, cost)) return { ok: false, msg: "Premalo mane za Hero Power." };
    if (!payCost(p, cost, false, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    p.heroPowerUsed = true;
    const opp = oppOf(p);
    if (hpw.kind === "heroAttack") {
      const blockers = opp.board.filter(c => !c.tapped);
      if (blockers.length) {
        const b = blockers.sort((a, b) => (b.maxHp - b.damage) - (a.maxHp - a.damage))[0];
        logMsg(def(b).name + " prestreže Hero Power.");
        rawDamage(b, opp, hpw.value, "Hero Power"); checkDeaths();
      } else {
        opp.life -= hpw.value;
        logMsg(p.name + ": Hero Power udari OBRAZ za " + hpw.value + " (življenja " + opp.name + ": " + opp.life + ").");
        if (opp.life <= 0) endGame(G.players.indexOf(p), opp.name + " je premagan!");
      }
    } else if (hpw.kind === "chain") {
      opp.board.slice().forEach(c => rawDamage(c, opp, hpw.value, "Chain"));
      logMsg(p.name + ": Chain — " + hpw.value + " škode vsem nasprotnikovim šampionom.");
      checkDeaths();
    } else if (hpw.kind === "heroHeal") {
      p.life = Math.min(p.maxLife, p.life + hpw.value);
      logMsg(p.name + ": Hero Power — heroj +" + hpw.value + " (življenja " + p.life + ").");
    } else if (hpw.kind === "shieldAll") {
      p.board.forEach(c => c.status.shield = true);
      logMsg(p.name + ": Hero Power — vsi šampioni dobijo Shield.");
    }
    return { ok: true };
  }

  /* ---------------- Mulligan (samo začetek, samo človek) ---------------- */
  // mulligan: prvi je zastonj, vsak naslednji poteguje 1 karto manj
  function mulliganHand() {
    const you = G.players[0];
    if (!G.mulliganPhase) return { ok: false };
    you._mulligans = (you._mulligans || 0) + 1;
    const n = Math.max(3, HAND_START - Math.max(0, you._mulligans - 1));
    dealOpening(you, n);
    logMsg(you.name + " mulligan #" + you._mulligans + " — roka " + n + (you._mulligans === 1 ? " (prvi zastonj)." : " (−1 karta)."));
    return { ok: true, handSize: n, nextSize: Math.max(3, n - 1), free: you._mulligans === 1 };
  }

  /* ---------------- Oracle / Relic / Realm ---------------- */
  function spellEffect(key, p, targetUid) {
    const opp = oppOf(p);
    const ally = p.board.find(c => c.uid === targetUid) || p.board[0];
    const enemy = opp.board.find(c => c.uid === targetUid) || opp.board[0];
    switch (key) {
      case "draw3": draw(p, 3); break;
      case "draw2": case "draw2attach": draw(p, 2); break;
      case "healActive60": if (ally) { ally.damage = Math.max(0, ally.damage - 60); logMsg(def(ally).name + " +60 HP."); } break;
      case "healActive40": if (ally) { ally.damage = Math.max(0, ally.damage - 40); logMsg(def(ally).name + " +40 HP."); } break;
      case "healReserve30": p.board.forEach(c => c.damage = Math.max(0, c.damage - 30)); logMsg(p.name + ": vsi šampioni +30 HP."); break;
      case "blessActive": if (ally) { ally.status.blessing = Math.max(ally.status.blessing || 0, 2); logMsg(def(ally).name + " dobi Blessing."); } break;
      case "shieldAll": p.board.forEach(c => c.status.shield = true); logMsg(p.name + ": vsi dobijo Shield."); break;
      case "curseEnemy": if (enemy) { enemy.status.curse = true; logMsg(def(enemy).name + " je preklet."); } break;
      case "burnEnemy": if (enemy) { enemy.status.burn = true; logMsg(def(enemy).name + " gori."); } break;
      case "freezeEnemy": if (enemy) { enemy.status.freeze = true; logMsg(def(enemy).name + " zamrznjen."); } break;
      case "dmgEnemy30": if (enemy) { rawDamage(enemy, opp, 30, "urok"); checkDeaths(); } break;
      // ---- napadalni uroki (Faza: spelle) ----
      case "dmgEnemy25": if (enemy) { rawDamage(enemy, opp, 25, "Kopje"); checkDeaths(); } break;
      case "dmgEnemy40": if (enemy) { rawDamage(enemy, opp, 40, "Ognjena krogla"); checkDeaths(); } break;
      case "fireball40burn": if (enemy) { rawDamage(enemy, opp, 40, "Ognjena krogla"); enemy.status.burn = true; checkDeaths(); } break;
      case "boltStun50": if (enemy) { rawDamage(enemy, opp, 50, "Mjölnir"); enemy.status.stun = true; checkDeaths(); } break;
      case "aoe15": opp.board.slice().forEach(c => rawDamage(c, opp, 15, "Salva")); logMsg(p.name + ": Salva — 15 vsem nasprotnikovim šampionom."); checkDeaths(); break;
      case "aoe20": opp.board.slice().forEach(c => rawDamage(c, opp, 20, "Sončni izbruh")); logMsg(p.name + ": 20 vsem nasprotnikovim šampionom."); checkDeaths(); break;
      case "aoe15freeze": opp.board.slice().forEach(c => { rawDamage(c, opp, 15, "Zmrzal"); c.status.freeze = true; }); logMsg(p.name + ": Zmrzal — 15 + zmrznitev vsem."); checkDeaths(); break;
      case "faceDmg25": opp.life -= 25; logMsg(p.name + ": urok udari OBRAZ za 25 (življenja " + opp.name + ": " + opp.life + ")."); if (opp.life <= 0) endGame(G.players.indexOf(p), opp.name + " je premagan z urokom!"); break;
      default: logMsg("(učinek " + key + " še ni v v2)"); break;
    }
  }
  // odigraj Oracle/Relic/Realm; opts={targetUid, manaIdx}
  function playCard(p, inst, opts) {
    opts = opts || {};
    const d = def(inst);
    if (!["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) return { ok: false };
    const cost = manaCostArr(manaCostOf(d));
    if (!canPay(p, cost)) return { ok: false, msg: "Premalo mane (" + cost.length + ")." };
    const i = p.hand.indexOf(inst); if (i < 0) return { ok: false };
    if (!payCost(p, cost, false, opts.manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    p.hand.splice(i, 1);

    if (d.type === "Realm") {
      G.realm = d.id; G.realmEffect = d.effect || d.realmEffect; G.realmOwner = G.players.indexOf(p);
      p.discard.push(inst);
      logMsg(p.name + " razglasi Realm: " + d.name + ".");
      return { ok: true };
    }
    if (d.type === "Relic" && d.relicMode === "attach") {
      const tgt = p.board.find(c => c.uid === opts.targetUid) || p.board[0];
      if (!tgt) { return { ok: false, msg: "Ni tarče za relikvijo." }; }
      tgt.relic = d.id; tgt.relicEffect = d.effect;
      p.discard.push(inst);
      logMsg(p.name + ": " + def(tgt).name + " dobi " + d.name + ".");
      return { ok: true };
    }
    if (d.type === "Equipment") {
      const tgt = p.board.find(c => c.uid === opts.targetUid) || p.board[0];
      if (!tgt) { return { ok: false, msg: "Ni šampiona za opremo." }; }
      const slot = d.slot === "armor" ? "armor" : "weapon";
      const oldId = tgt[slot];
      if (oldId) { // zamenjaj staro opremo (gre v odlagališče)
        const old = CARDS[oldId];
        if (slot === "armor" && old.hpBonus) { tgt.maxHp -= old.hpBonus; if (tgt.damage > tgt.maxHp) tgt.damage = tgt.maxHp; }
        p.discard.push(makeInstance(oldId));
      }
      tgt[slot] = d.id;
      if (slot === "armor" && d.hpBonus) tgt.maxHp += d.hpBonus; // oklep dvigne mejo HP
      if (d.grant === "shield") tgt.status.shield = true;
      p.discard.push(inst);
      logMsg(p.name + ": " + def(tgt).name + " opremi " + d.name + ".");
      return { ok: true };
    }
    // Oracle ali instant Relic
    logMsg(p.name + " odigra " + d.name + ".");
    spellEffect(d.effect, p, opts.targetUid);
    p.discard.push(inst);
    return { ok: true };
  }

  /* ---------------- combat ---------------- */
  function effType(atk) { return (atk.cost || []).find(c => c !== "Any") || null; }

  function computeDamage(attacker, atkOwner, defender, atk, opts) {
    opts = opts || {};
    let dmg = atk.damage || 0; const parts = [];
    if (attacker.status.blessing) dmg += 15;
    if (attacker.status.curse) dmg -= 15;
    const atkType0 = effType(atk);
    // Relikvije na napadalcu / branilcu
    if (attacker.relicEffect === "dmgPlus20") dmg += 20;
    if (defender.relicEffect === "dmgReduce20") dmg -= 20;
    // Oprema: orožje (+napad), oklep (−prejeta škoda); Prebod ignorira Shield
    const wpn = weaponOf(attacker), arm = armorOf(defender);
    if (wpn && wpn.atkBonus) dmg += wpn.atkBonus;
    if (arm && arm.dmgReduce) dmg -= arm.dmgReduce;
    const pierce = !!(wpn && wpn.grant === "pierce");
    // Realm bonusi (napadalec)
    const ad = def(attacker);
    if (G.realm === "realm-olympus" && atkType0 === "Sky" && ad.pantheon === "Greek") dmg += 10;
    if (G.realm === "realm-asgard" && atkType0 === "War" && ad.pantheon === "Norse") dmg += 10;
    if (G.realm === "realm-duat" && (atkType0 === "Underworld" || atkType0 === "Sun")) dmg += 10;
    // Realm: Forum -10 če ima branilčev lastnik 2+ šampione
    const dOwner = ownerOfChamp(defender);
    if (G.realm === "realm-forum") { if (dOwner && dOwner.board.length >= 2) dmg -= 10; }
    // Sinergije — napad
    if (atkOwner) {
      if (hasBond(atkOwner, "Norse")) { dmg += 10; parts.push("FURIJA"); }                                  // Norse Bond
      if (atkType0 === "War" && hasAlliance(atkOwner, "warhost")) { dmg += 15; parts.push("VOJNA"); }        // Norse+Roman
      if ((atkType0 === "Sky" || atkType0 === "Sun") && hasAlliance(atkOwner, "sunsky")) { dmg += 10; parts.push("SONCE"); } // Greek+Egyptian
      if (hasBond(atkOwner, "Slavic")) { const s = defender.status || {}; if (s.burn || s.freeze || s.stun || s.curse || s.poison) { dmg += 15; parts.push("KLETEV"); } } // Slavic Bond
    }
    // Sinergije — obramba
    if (dOwner && hasBond(dOwner, "Roman")) { dmg -= 10; parts.push("FORMACIJA"); }                          // Roman Bond
    if (defender.status.shield && !pierce) dmg -= (dOwner && hasAlliance(dOwner, "order")) ? 30 : 20;        // Greek+Roman: Shield −30
    if (dmg < 0) dmg = 0;
    const atkType = atkType0;
    let mult = 1;
    const dd = def(defender);
    if (atkType) {
      if (dd.weakness === atkType) { mult *= 1.5; parts.push("WEAK"); }
      else if (dd.resistance === atkType) { mult *= 0.6; parts.push("RESIST"); }
    }
    if (defender.status.freeze) mult *= (atkOwner && hasAlliance(atkOwner, "winter")) ? 1.4 : 1.2;           // Norse+Slavic
    if (defender.status.stun) mult *= 1.1;
    if (defender.status.guard) { mult *= 0.5; parts.push("GUARD"); } // obrambna drža −50%
    if (opts.forceOmenBonus) { mult *= 1.3; parts.push("FAVOR"); }
    else if ((atk.cost || []).length >= 3) {
      if (opts.omen === true) { mult *= 1.3; parts.push("OMEN+"); }
      else if (opts.omen == null) mult *= 1.15;
    }
    dmg = Math.round((dmg * mult) / 5) * 5;
    if (opts.comboBonus) dmg += opts.comboBonus;
    if (dmg < 0) dmg = 0;
    return { dmg, parts };
  }
  function comboInfo(att, atkType) {
    if (!atkType) return { count: 0, bonus: 0 };
    const count = att._comboType === atkType ? att._comboCount + 1 : 1;
    return { count, bonus: count >= 2 ? Math.min((count - 1) * 10, 30) : 0 };
  }
  function previewDamage(att, attOwner, defn, atk) {
    if (!att || !defn || !atk) return null;
    const t = effType(atk); const cb = comboInfo(att, t);
    const fo = !!(attOwner && attOwner._favorArmed && attOwner.favor > 0);
    const r = computeDamage(att, attOwner, defn, atk, { comboBonus: cb.bonus, forceOmenBonus: fo });
    return { dmg: r.dmg, parts: r.parts, comboCount: cb.count };
  }
  // predviden damage proti OBRAZU (brez naključnega omena; heavy -> ×1.15 pričakovano)
  function previewFace(att, attOwner, atk) {
    if (!att || !atk) return null;
    const atkType = effType(atk); const cb = comboInfo(att, atkType);
    const fo = !!(attOwner && attOwner._favorArmed && attOwner.favor > 0);
    let dmg = atk.damage || 0; const parts = [];
    if (att.status.blessing) dmg += 15;
    if (att.status.curse) dmg -= 15;
    const w = weaponOf(att); if (w && w.atkBonus) dmg += w.atkBonus;
    const heavy = (atk.cost || []).length >= 3;
    let mult = 1;
    if (fo) { mult *= 1.3; parts.push("FAVOR"); }
    else if (heavy) { mult *= 1.15; parts.push("OMEN?"); }
    dmg = Math.round((dmg * mult) / 5) * 5 + cb.bonus;
    if (dmg < 0) dmg = 0;
    if (cb.bonus > 0) parts.push("COMBO+" + cb.bonus);
    return { dmg, parts, comboCount: cb.count };
  }

  function canAttack(p, c) {
    return c && !c.tapped && !c.sick && !c.status.stun;
  }

  // ali ima branilec še žive Taunt branilce (zid)?
  function tauntsOf(opp) { return opp.board.filter(c => isTaunt(c)); }
  // attacker napade; target = {kind:'champ', uid} | {kind:'face'}
  function attack(p, attackerUid, atkIndex, target, manaIdx) {
    if (G.over) return { ok: false };
    const att = p.board.find(c => c.uid === attackerUid);
    if (!att) return { ok: false };
    if (!canAttack(p, att)) return { ok: false, msg: "Ta šampion ne more napasti (tapnjen/sick/stun)." };
    const atk = def(att).attacks[atkIndex];
    if (!atk || !(atk.damage > 0)) return { ok: false, msg: "Ta karta nima napada." };
    const lugh = def(att).id === "celtic-lugh";
    if (!canPay(p, atk.cost, lugh)) return { ok: false, msg: "Premalo mane za napad." };

    const opp = oppOf(p);
    const taunts = tauntsOf(opp);
    // VALIDIRAJ tarčo PRED plačilom (Taunt zid)
    let defn = null;
    if (target && target.kind === "champ") {
      defn = opp.board.find(c => c.uid === target.uid);
      if (!defn) return { ok: false, msg: "Tarča ne obstaja." };
      if (taunts.length && !isTaunt(defn)) return { ok: false, msg: "Najprej premagaj branilce (Taunt)." };
    } else {
      if (taunts.length) return { ok: false, msg: "Najprej premagaj branilce (Taunt)." };
    }
    // plačaj + tapni napadalca
    if (!payCost(p, atk.cost, lugh, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    att.tapped = true;
    const atkType = effType(atk);
    if (defn) return resolveStrike(p, att, atk, atkType, opp, defn);
    return faceHit(p, att, atk, atkType, opp);
  }

  // človek (branilec) izbere blokerja ali null (sprejme v obraz)
  function resolveBlock(blockerUidOrNull) {
    const pb = G.pendingBlock; if (!pb) return { ok: false };
    const attacker = G.players[pb.attackerOwnerIndex];
    const att = attacker.board.find(c => c.uid === pb.attackerUid);
    const opp = oppOf(attacker);
    const atk = def(att).attacks[pb.atkIndex];
    G.pendingBlock = null;
    if (blockerUidOrNull) {
      const blocker = opp.board.find(c => c.uid === blockerUidOrNull && !c.tapped);
      if (blocker) { logMsg(opp.name + " prestreže z " + def(blocker).name + "."); return resolveStrike(attacker, att, atk, pb.atkType, opp, blocker); }
    }
    return faceHit(attacker, att, atk, pb.atkType, opp);
  }

  function resolveStrike(p, att, atk, atkType, opp, defn) {
    let forceOmen = false;
    if (p._favorArmed && p.favor > 0) { forceOmen = true; p.favor--; p._favorArmed = false; logMsg(p.name + " porabi Naklonjenost (×1.3)."); }
    const heavy = (atk.cost || []).length >= 3;
    const omen = forceOmen ? true : (heavy ? omenRoll() : null);
    const cb = comboInfo(att, atkType);
    const r = computeDamage(att, p, defn, atk, { omen, forceOmenBonus: forceOmen, comboBonus: cb.bonus });
    att._comboType = atkType; att._comboCount = cb.count;
    if (heavy && !forceOmen && omen === false) { p.favor = Math.min(3, p.favor + 1); }
    // Umik (dodge): pasivna možnost izogiba napadu
    const dodgeChance = (def(defn).dodge || 0) + (hasBond(opp, "Celtic") ? 0.2 : 0); // Celtic Bond (Mistika)
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
      logMsg(def(defn).name + " se izogne napadu (Umik)!");
      att._comboType = atkType; att._comboCount = cb.count;
      afterAction(p);
      return { ok: true, dmg: 0, dodged: true };
    }
    if (r.dmg > 0) { defn.damage += r.dmg; p.stats.damageDealt += r.dmg; }
    if (defn.status.shield && r.dmg > 0 && !(weaponOf(att) && weaponOf(att).grant === "pierce")) delete defn.status.shield;
    if ((def(att).lifesteal || equipGrants(att, "lifesteal")) && r.dmg > 0) { defn0heal(att, r.dmg); }
    // Trni (oklep): branilec vrne škodo napadalcu
    const dArm = armorOf(defn);
    if (dArm && dArm.thorns && r.dmg > 0) {
      att.damage += dArm.thorns;
      logMsg(def(att).name + " utrpi " + dArm.thorns + " od Trnov (" + dArm.name + ").");
    }
    if (def(att).overload) att._overloadLock = (att._overloadLock || 0) + def(att).overload;
    logMsg(p.name + ": " + def(att).name + " → " + def(defn).name + " za " + r.dmg + (r.parts.length ? " [" + r.parts.join(",") + "]" : "") + ".");
    applyAtkEffect(atk, att, p, defn, opp);
    checkDeaths();
    afterAction(p);
    return { ok: true, dmg: r.dmg };
  }
  function defn0heal(c, amt) { c.damage = Math.max(0, c.damage - amt); logMsg(def(c).name + " (Krvoses) +" + amt + " HP."); }

  function faceHit(p, att, atk, atkType, opp) {
    let forceOmen = false;
    if (p._favorArmed && p.favor > 0) { forceOmen = true; p.favor--; p._favorArmed = false; logMsg(p.name + " porabi Naklonjenost (×1.3)."); }
    const heavy = (atk.cost || []).length >= 3;
    const omen = forceOmen ? true : (heavy ? omenRoll() : null);
    const cb = comboInfo(att, atkType);
    // proti face ni weakness/resistance; uporabimo osnovno + blessing/curse + combo + omen/favor
    let dmg = atk.damage || 0;
    if (att.status.blessing) dmg += 15;
    if (att.status.curse) dmg -= 15;
    const wF = weaponOf(att); if (wF && wF.atkBonus) dmg += wF.atkBonus; // orožje šteje tudi proti obrazu
    let mult = 1;
    if (forceOmen) mult *= 1.3; else if (heavy && omen === true) mult *= 1.3; else if (heavy && omen == null) mult *= 1.15;
    dmg = Math.round((dmg * mult) / 5) * 5 + cb.bonus;
    if (dmg < 0) dmg = 0;
    att._comboType = atkType; att._comboCount = cb.count;
    if (heavy && !forceOmen && omen === false) p.favor = Math.min(3, p.favor + 1);
    opp.life -= dmg; p.stats.damageDealt += dmg;
    if (def(att).lifesteal && dmg > 0) defn0heal(att, dmg);
    if (def(att).overload) att._overloadLock = (att._overloadLock || 0) + def(att).overload;
    logMsg(p.name + ": " + def(att).name + " udari OBRAZ za " + dmg + " (življenja " + opp.name + ": " + opp.life + ").");
    if (opp.life <= 0) { endGame(G.players.indexOf(p), opp.name + " je premagan (0 življenj)!"); }
    afterAction(p);
    return { ok: true, dmg, face: true };
  }

  function applyAtkEffect(atk, att, attOwner, defn, defOwner) {
    if (!atk.effect) return;
    const e = atk.effect;
    if (e === "burn") defn.status.burn = true;
    else if (e === "freeze") defn.status.freeze = true;
    else if (e === "poison") defn.status.poison = defn.status.poison || 1;
    else if (e === "curse") defn.status.curse = true;
    else if (e === "selfShield") att.status.shield = true;
    else if (e === "blessActive") att.status.blessing = Math.max(att.status.blessing || 0, 2);
    else if (e === "selfDamage20") { att.damage += 20; }
    else if (e === "selfDamage30") { att.damage += 30; }
    // ostali efekti (draw, heal...) se migrirajo kasneje
  }

  /* ---------------- keywords (onEnter / onDefeat) ---------------- */
  function applyKwEffect(eff, source, owner) {
    if (!eff || !owner) return;
    const opp = oppOf(owner);
    const enemy = opp.board[0]; // najprej prvi nasprotnikov (poenostavljeno; UI lahko izbere)
    const v = eff.value || 0;
    switch (eff.kind) {
      case "damageEnemy": if (enemy) { rawDamage(enemy, opp, v, "keyword"); checkDeaths(); } else { opp.life -= v; if (opp.life <= 0) endGame(G.players.indexOf(owner), opp.name + " premagan!"); } break;
      case "draw": draw(owner, v || 1); break;
      case "heal": if (source) source.damage = Math.max(0, source.damage - (v || 20)); break;
      case "freezeEnemy": if (enemy) enemy.status.freeze = true; break;
      case "burnEnemy": if (enemy) enemy.status.burn = true; break;
      case "stunEnemy": if (enemy) enemy.status.stun = (enemy.status.stun || 0) + 1; break;
      case "curseEnemy": if (enemy) enemy.status.curse = true; break;
      case "shieldSelf": if (source) source.status.shield = true; break;
    }
  }
  function onEnter(p, inst) {
    const d = def(inst);
    if (d.onEnter) { logMsg(d.name + " — Klic ob vstopu!"); applyKwEffect(d.onEnter, inst, p); }
  }

  /* ---------------- damage / deaths ---------------- */
  function rawDamage(c, owner, amt, src) { c.damage += amt; logMsg(owner.name + ": " + def(c).name + " -" + amt + " (" + src + ")."); }

  function checkDeaths() {
    let any = false;
    for (const p of G.players) {
      for (const c of p.board.slice()) {
        if (c.damage >= c.maxHp) {
          // Osiris rebirth
          if (def(c).id === "egypt-osiris" && !c.osirisUsed) {
            c.osirisUsed = true; c.damage = c.maxHp - 60; c.status = {}; c.tapped = true;
            logMsg(p.name + ": Osiris se ponovno rodi (60 HP).");
            continue;
          }
          defeat(p, c); any = true;
        }
      }
    }
    return any;
  }
  function defeat(owner, champ) {
    logMsg(owner.name + ": " + def(champ).name + " je premagan.");
    owner.discard.push(champ);
    const i = owner.board.indexOf(champ); if (i >= 0) owner.board.splice(i, 1);
    const killer = oppOf(owner); killer.kills++; killer.stats.kills++;
    if (def(champ).onDefeat) { logMsg(def(champ).name + " — Poslednji dih!"); applyKwEffect(def(champ).onDefeat, champ, owner); }
  }

  function afterAction(p) {
    // napad NE konča poteze (lahko napadeš z več šampioni); poteza se konča z endTurn ali ko ni več akcij
  }

  function endGame(winnerIdx, msg) { G.over = true; G.winner = winnerIdx; logMsg("KONEC: " + msg); }

  /* ---------------- AI ---------------- */
  function aiHp(c) { return c.maxHp - c.damage; }
  function aiBestAtk(c, owner, target) {
    let best = null;
    (def(c).attacks || []).forEach((atk, i) => {
      if (!canPay(owner, atk.cost, def(c).id === "celtic-lugh")) return;
      const pr = target ? previewDamage(c, owner, target, atk) : null;
      const dmg = pr ? pr.dmg : (atk.damage || 0);
      if (!best || dmg > best.dmg) best = { atk, i, dmg };
    });
    return best;
  }
  function aiChooseBlock(defOwner, attacker, atk) {
    const incoming = (atk.damage || 0); // груба ocena
    const untapped = defOwner.board.filter(c => !c.tapped);
    if (!untapped.length) return null;
    // blokiraj če smo nizko na življenjih ali če bloker preživi
    if (defOwner.life - incoming > 12) {
      // sprejmemo v obraz, če smo varni — razen če bloker ubije napadalca brez smrti
      const goodTrade = untapped.find(b => aiHp(b) > incoming && false);
      if (!goodTrade) return null;
    }
    // izberi blokerja z najmanj HP, ki še preživi; sicer najbolj zdravega
    const survive = untapped.filter(b => aiHp(b) > incoming).sort((a, b) => aiHp(a) - aiHp(b));
    return survive[0] || untapped.sort((a, b) => aiHp(b) - aiHp(a))[0];
  }
  function aiTakeTurn(onStep, onDone) {
    const p = cur();
    if (!p.isAI || G.over) { onDone && onDone(); return; }
    const diff = G.difficulty || "normal";
    const opp = oppOf(p);
    const steps = [];
    // 1) igraj energijo
    steps.push(() => { const e = p.hand.find(i => def(i).type === "Energy"); if (e) playEnergy(p, e); });
    // 2) prikliči šampione dokler je prostor in mana
    steps.push(() => {
      let guard = 0;
      while (p.board.length < BOARD_MAX && guard++ < 3) {
        const c = p.hand.find(i => def(i).type === "Champion" && def(i).stage === "basic" && canPay(p, Array.from({ length: summonCostOf(def(i)) }, () => "Any")));
        if (!c) break; const r = summon(p, c); if (!r.ok) break;
      }
    });
    // 3) napadi z vsemi pripravljenimi
    steps.push(() => {
      for (const c of p.board.slice()) {
        if (G.over) break;
        if (!canAttack(p, c)) continue;
        // tarča: lethal na board, sicer face če varno/lethal, sicer najboljši matchup
        const targets = opp.board.slice();
        let chosen = null, chosenTarget = null;
        // poskusi face če nima blokerjev
        const best = aiBestAtk(c, p, targets[0] || c);
        if (!best) continue;
        if (!targets.length) { attack(p, c.uid, best.i, { kind: "face" }); continue; }
        // izberi tarčo z najboljšo škodo / lethal
        let bt = null, btDmg = -1;
        targets.forEach(t => { const pr = previewDamage(c, p, t, def(c).attacks[best.i]); if (pr && pr.dmg > btDmg) { btDmg = pr.dmg; bt = t; } });
        // če lahko ubije tarčo -> napadi tarčo; sicer pritisni face (hibrid)
        if (bt && btDmg >= aiHp(bt)) attack(p, c.uid, best.i, { kind: "champ", uid: bt.uid });
        else if (diff !== "easy" && opp.life <= btDmg + 5) attack(p, c.uid, best.i, { kind: "face" });
        else attack(p, c.uid, best.i, { kind: "champ", uid: bt.uid });
      }
    });
    let k = 0;
    (function run() {
      if (G.over) { onDone && onDone(); return; }
      if (k >= steps.length) { if (!G.over) endTurn(); onDone && onDone(); return; }
      steps[k++](); onStep && onStep();
      if (G.over) { onDone && onDone(); return; }
      setTimeout(run, 600);
    })();
  }

  /* ---------------- exports ---------------- */
  const api = {
    G, startGame, beginTurn, endTurn, draw, playEnergy, canPay, payMana,
    summon, attack, resolveBlock, previewDamage, previewFace, canAttack, summonCostOf, manaCostOf,
    playCard, cardNeedsTarget, activateAbility, canActivate, mulliganHand, useHeroPower,
    keepHand, aiTakeTurn, cur, oppOf, def, makeInstance, omenRoll,
    isTaunt, tauntsOf, synergyOf, synergyLabels, HERO_POWERS, BOARD_MAX, START_LIFE,
  };
  if (typeof module !== "undefined") module.exports = api;
  if (global) { global.V2 = api; }
})(typeof window !== "undefined" ? window : globalThis);
