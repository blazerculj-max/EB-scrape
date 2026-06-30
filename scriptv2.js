/* ============================================================================
   MYTHIC CLASH v2 — UI (script-v2.js)  [samostojen prototip, v2.html]
============================================================================ */
const V2 = window.V2;
const G = V2.G;
const def = V2.def;
const $ = s => document.querySelector(s);
function el(t, c, h) { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; }
function artImg(d, cls) { return d && d.id ? `<img class="${cls}" src="art/${d.id}.png" alt="" decoding="async" onerror="this.style.display='none'">` : ""; }
let toastTimer;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.remove("hidden"); t.style.opacity = "1"; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 1800); }

/* ---------------- TOOLTIPS (hover + dvoklik za pin) ----------------
   Vsak element z atributoma data-tip (besedilo) in po želji data-tip-title
   dobi razlago. Hover prikaže, dvoklik "pripne" (za touch/branje). */
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
let tipPinned = false;
function ensureTip() {
  let t = document.getElementById("v2-tip");
  if (!t) { t = el("div", "v2-tip hidden"); t.id = "v2-tip"; document.body.appendChild(t); }
  return t;
}
function showTip(target, x, y) {
  const t = ensureTip();
  const title = target.getAttribute("data-tip-title");
  const body = target.getAttribute("data-tip");
  if (!body && !title) return;
  t.innerHTML = (title ? `<div class="v2-tip-title">${esc(title)}</div>` : "") +
    `<div class="v2-tip-body">${esc(body).replace(/\n/g, "<br>")}</div>`;
  t.classList.remove("hidden");
  const r = t.getBoundingClientRect();
  let px = x + 14, py = y + 16;
  if (px + r.width > window.innerWidth - 8) px = x - r.width - 14;
  if (py + r.height > window.innerHeight - 8) py = y - r.height - 16;
  t.style.left = Math.max(6, px) + "px";
  t.style.top = Math.max(6, py) + "px";
}
function hideTip(force) { if (tipPinned && !force) return; const t = document.getElementById("v2-tip"); if (t) t.classList.add("hidden"); }
function initTooltips() {
  document.addEventListener("mouseover", e => {
    const tgt = e.target.closest("[data-tip],[data-tip-title]"); if (!tgt) return;
    if (tipPinned) return; showTip(tgt, e.clientX, e.clientY);
  });
  document.addEventListener("mousemove", e => {
    if (tipPinned) return;
    const tgt = e.target.closest("[data-tip],[data-tip-title]");
    if (tgt) showTip(tgt, e.clientX, e.clientY); else hideTip();
  });
  document.addEventListener("mouseout", e => {
    const tgt = e.target.closest("[data-tip],[data-tip-title]"); if (tgt && !tipPinned) hideTip();
  });
  // dvoklik = pripni razlago (uporabno na dotik/za branje)
  document.addEventListener("dblclick", e => {
    const tgt = e.target.closest("[data-tip],[data-tip-title]");
    if (tgt) { e.preventDefault(); tipPinned = true; showTip(tgt, e.clientX, e.clientY); }
    else { tipPinned = false; hideTip(true); }
  });
  document.addEventListener("click", e => { if (tipPinned && !e.target.closest("#v2-tip")) { tipPinned = false; hideTip(true); } });
}

/* Razlage učinkov / statusov / ključnih besed (za tooltipe) */
const STATUS_TEXT = {
  burn: ["🔥 Ožig", "Šampion gori — prejema dodatno škodo skozi čas."],
  freeze: ["❄️ Zmrznjen", "Prejema +20% škode."],
  stun: ["💫 Omamljen", "Prejema +10% škode; lahko izpusti napad."],
  curse: ["💀 Prekletstvo", "Njegovi napadi zadajo −15 škode."],
  blessing: ["✨ Blagoslov", "Njegovi napadi zadajo +15 škode (nekaj potez)."],
  shield: ["🛡️ Shield", "Naslednji prejeti udarec −20 škode (nato izgine)."],
  poison: ["☠️ Strup", "Prejema škodo skozi čas."],
  guard: ["⛨ Obrambna drža", "Prejema −50% škode do naslednje poteze."],
};
const KEYWORD_TEXT = {
  charge: ["⚡ Naval", "Lahko napade že v isti potezi, ko je priklican."],
  lifesteal: ["🩸 Krvoses", "Ko zada škodo, se za toliko pozdravi."],
  overload: ["⛓ Preobremenitev", "Po močnem napadu ostane tapnjen dlje."],
  onEnter: ["➹ Ob prihodu", "Sproži učinek, ko pride na bojišče."],
  onDefeat: ["☠ Ob porazu", "Sproži učinek, ko je premagan."],
  dodge: ["💨 Umik", "Ima možnost, da se popolnoma izogne napadu."],
  pierce: ["🗡️ Prebod", "Napadi ignorirajo Shield branilca."],
  thorns: ["🌵 Trni", "Napadalec ob udarcu nanj utrpi škodo."],
};
const EFFECT_TEXT = {
  stunOmen: "Omen met: ob ugodnem znamenju je branilec omamljen.",
  selfShield: "Ta šampion dobi Shield.",
  selfDamage20: "Zada polno škodo, a šampion utrpi 20 povratne škode.",
  draw3: "Potegneš 3 karte.", draw2: "Potegneš 2 karti.", draw2attach: "Potegneš 2 karti.",
  healActive60: "Izbrani šampion +60 HP.", healActive40: "Izbrani šampion +40 HP.",
  healReserve30: "Vsi tvoji šampioni +30 HP.", blessActive: "Izbrani šampion dobi Blagoslov.",
  shieldAll: "Vsi tvoji šampioni dobijo Shield.", curseEnemy: "Nasprotnikov šampion je preklet (−15 škode).",
  burnEnemy: "Nasprotnikov šampion gori.", freezeEnemy: "Nasprotnikov šampion zamrzne (+20% škode).",
  dmgEnemy30: "Zada 30 škode nasprotnikovemu šampionu.",
  healSelf30: "Ta šampion +30 HP.", healBoard20: "Vsi tvoji šampioni +20 HP.",
  shieldSelf: "Ta šampion dobi Shield (−20 naslednji udarec).",
  guard: "Obrambna drža: −50% prejete škode do naslednje poteze.",
  blessSelf: "Ta šampion dobi Blagoslov.",
  dmgPlus20: "Pritrjeni šampion zada +20 škode.", dmgReduce20: "Pritrjeni šampion prejme −20 škode.",
  healEndTurn10: "Pritrjeni šampion se ob koncu poteze pozdravi 10 HP.",
};
function atkTipText(atk) {
  let s = `${atk.damage} škode · cena ${(atk.cost || []).length} mane`;
  if (atk.text) s += "\n" + atk.text;
  if (atk.effect && EFFECT_TEXT[atk.effect]) s += "\nUčinek: " + EFFECT_TEXT[atk.effect];
  return s;
}
function cardTipText(d) {
  const lines = [];
  if (d.type === "Champion") {
    lines.push(`Šampion · ${d.pantheon} · ❤${d.hp}`);
    (d.attacks || []).forEach(a => lines.push(`• ${a.name}: ${a.damage} dmg (${(a.cost || []).length} mane)`));
    if (d.ability) lines.push(`Sposobnost — ${d.ability.name}: ${d.ability.text}`);
    if (d.activated) lines.push(`⚡ ${d.activated.name}: ${d.activated.text}`);
    if (d.weakness) lines.push(`Šibkost: ${d.weakness}  ·  Odpornost: ${d.resistance || "—"}`);
  } else {
    lines.push(`${d.type}${d.pantheon ? " · " + d.pantheon : ""}`);
    if (d.text) lines.push(d.text);
  }
  return lines.join("\n");
}
function tipAttr(title, body) { return `data-tip-title="${esc(title)}" data-tip="${esc(body)}"`; }

/* ---------------- FX (puščica, animacije, reveal) ---------------- */
function ensureFx() {
  if (!document.getElementById("v2-fx")) { const f = el("div", "v2-fx"); f.id = "v2-fx"; document.body.appendChild(f); }
  if (!document.getElementById("v2-arrow")) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "v2-arrow"; svg.classList.add("hidden");
    svg.innerHTML = `<defs>
      <marker id="ah" markerWidth="9" markerHeight="9" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ffd97a"/></marker>
      <filter id="arrowglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path id="v2-arrow-line" d="" fill="none" stroke="#ffd97a" stroke-width="5" stroke-linecap="round" marker-end="url(#ah)" filter="url(#arrowglow)" opacity="0.95"/>`;
    document.body.appendChild(svg);
  }
}
function elCenter(e) { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
function findChampEl(uid) { return document.querySelector(`.v2-champ[data-uid="${uid}"]`); }
function heroElOf(side) { return document.querySelector(`.v2-${side} .v2-hero`); }
function flyDamage(x, y, dmg, kind) {
  ensureFx();
  const n = el("div", "v2-fd " + (kind || ""));
  n.textContent = kind === "heal" ? "+" + dmg : (dmg > 0 ? "-" + dmg : "0");
  n.style.left = x + "px"; n.style.top = y + "px";
  document.getElementById("v2-fx").appendChild(n);
  setTimeout(() => n.remove(), 1100);
}
function shakeEl(e) { if (!e) return; e.classList.remove("v2-hit"); void e.offsetWidth; e.classList.add("v2-hit"); setTimeout(() => e.classList.remove("v2-hit"), 450); }
function lunge(attEl, targetEl) {
  if (!attEl || !targetEl) return;
  const a = elCenter(attEl), t = elCenter(targetEl);
  const dx = (t.x - a.x) * 0.3, dy = (t.y - a.y) * 0.3;
  attEl.style.transition = "transform .13s ease-out";
  attEl.style.transform = `translate(${dx}px,${dy}px) scale(1.05)`;
  attEl.style.zIndex = "60";
  setTimeout(() => { attEl.style.transform = ""; setTimeout(() => { attEl.style.transition = ""; attEl.style.zIndex = ""; }, 160); }, 150);
}
// animira napad: napadalec (uid) -> tarča (el); izpiše škodo
function animateStrike(attUid, targetEl, dmg, dodged) {
  const attEl = findChampEl(attUid);
  lunge(attEl, targetEl);
  if (targetEl) {
    const c = elCenter(targetEl);
    const isHero = targetEl.classList.contains("v2-hero");
    setTimeout(() => {
      shakeEl(targetEl);
      if (isHero && !dodged && dmg > 0) { targetEl.classList.add("hero-hurt"); setTimeout(() => targetEl.classList.remove("hero-hurt"), 600); }
      if (dodged) flyDamage(c.x, c.y, 0, "dodge");
      else flyDamage(c.x, c.y, dmg, dmg > 0 ? "dmg" : "zero");
    }, 130);
  }
}
// sweep banner ob menjavi poteze (feel)
let turnBannerTimer;
function showTurnBanner(text, cls) {
  ensureFx();
  const fx = document.getElementById("v2-fx");
  const old = fx.querySelector(".v2-turnbanner"); if (old) old.remove();
  const b = el("div", "v2-turnbanner " + (cls || ""), `<span>${text}</span>`);
  fx.appendChild(b);
  requestAnimationFrame(() => b.classList.add("show"));
  clearTimeout(turnBannerTimer);
  turnBannerTimer = setTimeout(() => { b.classList.add("out"); setTimeout(() => b.remove(), 350); }, 800);
}
// reveal karte, ki jo odigra nasprotnik (ali kdorkoli)
function revealCard(d, label, done) {
  ensureFx();
  const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
  const card = el("div", "v2-reveal-card");
  card.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#23233a,#3a3a52)");
  let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : d.type === "Realm" ? "🏛" : "✦"));
  card.innerHTML = `<div class="v2-reveal-label">${label || "Nasprotnik igra"}</div>
    <div class="v2-reveal-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span></div>
    <div class="v2-reveal-name">${d.name}</div>
    <div class="v2-reveal-meta">${d.type}${d.type === "Champion" ? " · ❤" + d.hp : ""}</div>`;
  const wrap = el("div", "v2-reveal");
  wrap.appendChild(card);
  document.getElementById("v2-fx").appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("show"));
  setTimeout(() => { wrap.classList.remove("show"); wrap.classList.add("out"); }, 1000);
  setTimeout(() => { wrap.remove(); if (done) done(); }, 1350);
}
// puščica: posodobi glede na stanje + kazalec
let arrowPos = { x: 0, y: 0 };
function arrowActive() { return (G.turn === 0 && !G.over && !manaPick && ((selAttacker && selAtkIndex != null) || pendingPlay)); }
function updateArrow() {
  ensureFx();
  const svg = document.getElementById("v2-arrow"), line = document.getElementById("v2-arrow-line");
  if (!arrowActive()) { svg.classList.add("hidden"); return; }
  let originEl = null;
  if (selAttacker && selAtkIndex != null) originEl = findChampEl(selAttacker);
  if (!originEl) { svg.classList.add("hidden"); return; }
  const o = elCenter(originEl);
  const tx = arrowPos.x || o.x, ty = arrowPos.y || (o.y - 60);
  const mx = (o.x + tx) / 2, my = (o.y + ty) / 2;
  const cy = my - Math.max(45, Math.abs(tx - o.x) * 0.32); // lok navzgor (Hearthstone-like)
  svg.classList.remove("hidden");
  line.setAttribute("d", `M ${o.x} ${o.y} Q ${mx} ${cy} ${tx} ${ty}`);
}
// predogled škode med ciljanjem (Hearthstone-like): koliko + ali je smrtno
function ensureDmgPrev() {
  let p = document.getElementById("v2-dmgprev");
  if (!p) { p = el("div", "v2-dmgprev hidden"); p.id = "v2-dmgprev"; document.body.appendChild(p); }
  return p;
}
function hideDmgPreview() {
  const p = document.getElementById("v2-dmgprev"); if (p) p.classList.add("hidden");
  const svg = document.getElementById("v2-arrow"); if (svg) svg.classList.remove("lethal");
  document.querySelectorAll(".v2-champ.lethal-target, .v2-hero.lethal-target").forEach(e => e.classList.remove("lethal-target"));
}
function updateDmgPreview() {
  if (!(selAttacker && selAtkIndex != null) || G.turn !== 0 || G.over || manaPick) { hideDmgPreview(); return; }
  const you = G.players[0], opp = G.players[1];
  const att = you.board.find(c => c.uid === selAttacker); if (!att) { hideDmgPreview(); return; }
  const atk = def(att).attacks[selAtkIndex];
  if (!atk || !V2.canPay(you, atk.cost, def(att).id === "celtic-lugh")) { hideDmgPreview(); return; }
  const elx = document.elementFromPoint(arrowPos.x, arrowPos.y); if (!elx) { hideDmgPreview(); return; }
  const champEl = elx.closest('.v2-champ[data-owner="opp"]');
  const heroEl = elx.closest('.v2-opp .v2-hero');
  let pv = null, target = null, lethal = false;
  if (champEl) {
    const defn = opp.board.find(c => c.uid === champEl.dataset.uid);
    if (defn) { pv = V2.previewDamage(att, you, defn, atk); lethal = pv && pv.dmg >= (defn.maxHp - defn.damage); target = champEl; }
  } else if (heroEl) {
    pv = V2.previewFace(att, you, atk); lethal = pv && pv.dmg >= opp.life; target = heroEl;
  }
  if (!pv || !target) { hideDmgPreview(); return; }
  document.querySelectorAll(".lethal-target").forEach(e => e.classList.remove("lethal-target"));
  const p = ensureDmgPrev();
  const lab = { WEAK: "ŠIBKOST ×1.5", RESIST: "ODPOR ×0.6", GUARD: "GARDA ×0.5", FAVOR: "NAKLONJENOST", "OMEN?": "OMEN (±)", FURIJA: "FURIJA +10", FORMACIJA: "FORMACIJA −10", VOJNA: "VOJNI POHOD +15", SONCE: "SONČNO NEBO +10", KLETEV: "PREKLETSTVO +15" };
  const parts = (pv.parts || []).filter(x => lab[x]);
  p.className = "v2-dmgprev" + (lethal ? " lethal" : "");
  p.innerHTML = `<span class="dp-dmg">-${pv.dmg}</span>${lethal ? '<span class="dp-lethal">💀 SMRTNO</span>' : ""}${parts.length ? `<span class="dp-parts">${parts.map(x => lab[x] || x).join(" · ")}</span>` : ""}`;
  const r = target.getBoundingClientRect();
  p.style.left = (r.left + r.width / 2) + "px";
  p.style.top = (r.top - 6) + "px";
  p.classList.remove("hidden");
  const svg = document.getElementById("v2-arrow"); if (svg) svg.classList.toggle("lethal", !!lethal);
  if (lethal) target.classList.add("lethal-target");
}

let chosenDeck = null, chosenDiff = "normal";
let selAttacker = null, selAtkIndex = null; // izbira napada (tvoja poteza)
let pendingPlay = null;  // {inst, need:'ally'|'enemy'} — čaka izbiro tarče za urok/relic
let manaPick = null;     // {cost, lughAny, sel:[], onPaid} — ročna izbira mane
let aiBusy = false;
let seenChampUids = new Set(); // za "enter play" animacijo (vsak šampion se animira ob prvem prikazu)

/* ---------------- SETUP ---------------- */
function heroPowerBlurb(pantheon) {
  const hp = V2.HERO_POWERS && (V2.HERO_POWERS[pantheon] || V2.HERO_POWERS.Greek);
  if (!hp) return "";
  return `<div class="deck-hp" ${tipAttr("★ " + hp.name, hp.text)}>★ ${hp.name} <span class="deck-hp-cost">⬡${hp.cost}</span></div>`;
}
function setupInner(html) { const w = document.querySelector("#v2-setup .v2-setup-inner"); w.innerHTML = html; return w; }
function setupHeader(sub) {
  return `<span class="eyebrow">Wars of Pantheons · Arena v2</span>
    <h1 class="game-title" style="font-size:clamp(34px,7vw,68px)">MYTHIC<br>CLASH</h1>
    ${sub ? `<p class="tagline">${sub}</p>` : ""}`;
}
function buildSetup() { loadRun(); showMainMenu(); }
function showMainMenu() {
  loadRun();
  const resume = RUN ? `<button class="mode-card resume" data-m="resume"><div class="mc-ic">▶</div><h3>Nadaljuj</h3><p>${RUN.mode === "arena" ? "Arena" : "Kampanja"} v teku — ${RUN.deck.length} kart.</p></button>` : "";
  const w = setupInner(`${setupHeader("Izberi način igre.")}
    <div class="mode-grid">
      <button class="mode-card" data-m="premade"><div class="mc-ic">⚔️</div><h3>Hitra igra</h3><p>Izberi enega od premade deckov in se bori proti naključnemu nasprotniku.</p></button>
      <button class="mode-card" data-m="custom"><div class="mc-ic">🛠️</div><h3>Custom deck</h3><p>Sestavi svoj deck in igraj proti smiselnemu nasprotniku.</p></button>
      <button class="mode-card" data-m="campaign"><div class="mc-ic">🗺️</div><h3>Kampanja</h3><p>Premagaj 6 vse težjih panteonov. Deck in heroj rasteta. 1 poraz konča.</p></button>
      <button class="mode-card" data-m="arena"><div class="mc-ic">🏟️</div><h3>Arena</h3><p>Draftaj deck 30 kart (3 na izbiro). Nagrada po vsaki zmagi. Do 3 porazov.</p></button>
    </div>
    ${resume}`);
  w.querySelectorAll(".mode-card").forEach(b => b.addEventListener("click", () => {
    const m = b.dataset.m;
    if (m === "premade") showPremade();
    else if (m === "custom") showCustomBuilder();
    else if (m === "campaign") { if (RUN && RUN.mode === "campaign") showRunMap(); else { clearRun(); openRunStart(); } }
    else if (m === "arena") { if (RUN && RUN.mode === "arena") showRunMap(); else { clearRun(); openArenaStart(); } }
    else if (m === "resume") showRunMap();
  }));
}
function showPremade() {
  const decks = Object.values(STARTER_DECKS).filter(d => d.id !== "custom" && d.id !== "run");
  const cards = decks.map(d => {
    const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    return `<button class="deck-card" data-deck="${d.id}" style="--deck-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <span class="deck-pantheon">${d.pantheon}</span><div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3><div class="deck-style">${d.style}</div><div class="deck-blurb">${d.blurb}</div>${heroPowerBlurb(d.pantheon)}</button>`;
  }).join("");
  const w = setupInner(`${setupHeader("Hitra igra — izberi deck.")}
    <button class="rules-toggle" id="back-menu" style="align-self:flex-start">← Nazaj</button>
    <div id="v2-decks" class="v2-decks">${cards}</div>
    <div class="difficulty-block"><span class="eyebrow">Težavnost</span><div id="v2-diff" class="diff-row"></div></div>
    <button id="v2-start" class="btn-primary" disabled>Začni bitko</button>`);
  w.querySelector("#back-menu").addEventListener("click", showMainMenu);
  w.querySelectorAll(".deck-card").forEach(b => b.addEventListener("click", () => {
    chosenDeck = b.dataset.deck; w.querySelectorAll(".deck-card").forEach(c => c.classList.remove("selected")); b.classList.add("selected"); w.querySelector("#v2-start").disabled = false;
  }));
  const dr = w.querySelector("#v2-diff");
  [["easy", "Lahko"], ["normal", "Normalno"], ["hard", "Težko"]].forEach(([id, lab]) => {
    const b = el("button", "diff-chip" + (id === chosenDiff ? " sel" : ""), `<span class="diff-name">${lab}</span>`);
    b.addEventListener("click", () => { chosenDiff = id; dr.querySelectorAll(".diff-chip").forEach(c => c.classList.remove("sel")); b.classList.add("sel"); });
    dr.appendChild(b);
  });
  w.querySelector("#v2-start").addEventListener("click", startV2);
}
function startV2() {
  if (!chosenDeck) return;
  const others = Object.keys(STARTER_DECKS).filter(k => k !== chosenDeck && k !== "custom" && k !== "run");
  const aiDeck = others[(Math.random() * others.length) | 0];
  V2.startGame(chosenDeck, aiDeck, chosenDiff);
  $("#v2-setup").classList.add("hidden");
  $("#v2-game").classList.remove("hidden");
  showFirstPick();
}

/* ---------------- CUSTOM DECK BUILDER ---------------- */
let customDeck = [];
function energyFor(list, ratio) {
  const need = {}; list.forEach(id => cardEnergyTypes(id).forEach(t => need[t] = (need[t] || 0) + 1));
  let types = Object.keys(need).sort((a, b) => need[b] - need[a]); if (!types.length) types = ["Sky", "War", "Nature"];
  const target = Math.round(list.length * (ratio || 0.5)); const out = []; let i = 0;
  while (out.length < target && types.length) { const e = energyCardFor(types[i % types.length]); if (e) out.push(e); i++; if (i > 300) break; }
  return out;
}
function showCustomBuilder() {
  const counts = {}; customDeck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const poolIds = [...new Set(randomCardPool())].sort((a, b) => {
    const da = CARDS[a], db = CARDS[b];
    return (da.pantheon || "z").localeCompare(db.pantheon || "z") || (V2.summonCostOf(da) || V2.manaCostOf(da)) - (V2.summonCostOf(db) || V2.manaCostOf(db));
  });
  const champCount = customDeck.filter(id => CARDS[id].type === "Champion").length;
  const cardHtml = id => {
    const d = CARDS[id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
    const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : `⬡${V2.manaCostOf(d)}`;
    const n = counts[id] || 0;
    return `<div class="cb-card ${n ? "owned" : ""}" data-id="${id}" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">${cost}</span>${n ? `<span class="cb-count">×${n}</span>` : ""}</div>
      <div class="rdc-n">${d.name}</div><div class="rdc-m">${d.minion ? "Minion" : d.type}${d.type === "Champion" ? " ❤" + d.hp : ""}</div>
      ${n ? `<button class="cb-rem" data-rem="${id}">−</button>` : ""}</div>`;
  };
  const enough = customDeck.length >= 16 && champCount >= 6;
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Custom deck</span><h2 class="run-title">Sestavi svoj deck</h2></div>
      <button class="rules-toggle" id="cb-back">← Nazaj</button></header>
    <div class="cb-bar">
      <span class="run-statline">🃏 <b>${customDeck.length}</b> kart · ${champCount} šampionov ${customDeck.length < 16 ? "(min 16)" : ""} ${champCount < 6 ? "· potrebuješ ≥6 šampionov" : ""}</span>
      ${affinityHtml(customDeck)}
      <span class="cb-actions"><button class="rules-toggle" id="cb-clear">Počisti</button>
      <button class="btn-primary" id="cb-start" ${enough ? "" : "disabled"}>Začni bitko</button></span>
    </div>
    <p class="run-sub">Klikni karto za dodajanje (do 3 kopije, max 30). Klikni <b>−</b> za odstranitev. Energije se dodajo samodejno. Igraš proti naključnemu premade decku.</p>
    <div class="cb-pool">${poolIds.map(cardHtml).join("")}</div>`);
  s.querySelector("#cb-back").addEventListener("click", showMainMenu);
  s.querySelector("#cb-clear").addEventListener("click", () => { customDeck = []; showCustomBuilder(); });
  s.querySelector("#cb-start").addEventListener("click", startCustom);
  s.querySelectorAll(".cb-card").forEach(card => card.addEventListener("click", e => {
    if (e.target.classList.contains("cb-rem")) return; // handled below
    const id = card.dataset.id; const n = customDeck.filter(x => x === id).length;
    if (n >= 3) { toast("Največ 3 kopije."); return; }
    if (customDeck.length >= 30) { toast("Deck je poln (30)."); return; }
    customDeck.push(id); showCustomBuilder();
  }));
  s.querySelectorAll(".cb-rem").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation(); const id = b.dataset.rem; const i = customDeck.indexOf(id); if (i >= 0) customDeck.splice(i, 1); showCustomBuilder();
  }));
}
function startCustom() {
  const champCount = customDeck.filter(id => CARDS[id].type === "Champion").length;
  if (customDeck.length < 16 || champCount < 6) { toast("Potrebuješ vsaj 16 kart in 6 šampionov."); return; }
  const list = customDeck.slice().concat(energyFor(customDeck, 0.55));
  STARTER_DECKS.custom = { id: "custom", name: "Custom", pantheon: deckPantheon(customDeck), blurb: "", style: "Custom", list };
  const others = Object.keys(STARTER_DECKS).filter(k => k !== "custom" && k !== "run");
  const aiDeck = others[(Math.random() * others.length) | 0];
  V2.startGame("custom", aiDeck, chosenDiff || "normal");
  $("#v2-setup").classList.add("hidden"); $("#v2-game").classList.remove("hidden");
  showFirstPick();
}

/* ============================================================================
   ROGUELIKE (KAMPANJA / ARENA): zaporedje bitk + nagrade, deck/heroj rasteta
============================================================================ */
const RUN_KEY = "mythic-run-v2";
const RUN_STAGES = [
  { ai: "olympus", diff: "easy", name: "Olympus Strike" },
  { ai: "spirits", diff: "easy", name: "Forest of Spirits" },
  { ai: "eternity", diff: "normal", name: "Sands of Eternity" },
  { ai: "tirnanog", diff: "normal", name: "Tir na nÓg" },
  { ai: "legion", diff: "hard", name: "Legion of Rome" },
  { ai: "ragnarok", diff: "hard", name: "Ragnarok Fury" },
];
let RUN = null;
let runActive = false;
function loadRun() { try { const s = JSON.parse(localStorage.getItem(RUN_KEY)); if (s && Array.isArray(s.deck)) { if (!s.mode) s.mode = "campaign"; RUN = s; } } catch (_) {} }
function saveRun() { try { localStorage.setItem(RUN_KEY, JSON.stringify(RUN)); } catch (_) {} }
function clearRun() { RUN = null; try { localStorage.removeItem(RUN_KEY); } catch (_) {} }
function deckPantheon(list) {
  const c = deckPantheonCounts(list);
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || "Greek";
}
function deckPantheonCounts(list) {
  const c = {}; list.forEach(id => { const d = CARDS[id]; if (d && d.type === "Champion" && d.pantheon) c[d.pantheon] = (c[d.pantheon] || 0) + 1; });
  return c;
}
function deckEnergyCounts(list) {
  const c = {}; list.forEach(id => { const d = CARDS[id]; if (d && d.type === "Energy" && d.energyType) c[d.energyType] = (c[d.energyType] || 0) + 1; });
  return c;
}
// katere KONKRETNE energije karta potrebuje (iz cen napadov / energyType)
function cardEnergyTypes(id) {
  const d = CARDS[id]; const out = new Set(); if (!d) return out;
  if (d.type === "Energy") { if (d.energyType) out.add(d.energyType); return out; }
  if (d.type === "Champion") (d.attacks || []).forEach(a => (a.cost || []).forEach(c => { if (c && c !== "Any") out.add(c); }));
  if (d.energyType && d.energyType !== "Any") out.add(d.energyType);
  return out;
}
function energyCardFor(type) { const id = "energy-" + String(type).toLowerCase(); return CARDS[id] ? id : null; }
function runTopPantheons() { const c = deckPantheonCounts(RUN.deck); return Object.keys(c).sort((a, b) => c[b] - c[a]); }

// LEAN startni deck za run (~14 kart): poceni championi + energije, ki jih potrebujejo
function runStarterDeck(deckId) {
  const full = STARTER_DECKS[deckId].list;
  const distinct = [...new Set(full)];
  const basics = distinct.filter(id => { const d = CARDS[id]; return d && d.type === "Champion" && d.stage === "basic"; });
  basics.sort((a, b) => V2.summonCostOf(CARDS[a]) - V2.summonCostOf(CARDS[b]));
  const champs = basics.slice(0, 5);
  if (basics[0]) champs.push(basics[0]); // 2. kopija najcenejšega
  if (basics[1]) champs.push(basics[1]);
  // energije glede na potrebe championov (round-robin -> pokrije vse barve)
  const need = {}; champs.forEach(id => cardEnergyTypes(id).forEach(t => need[t] = (need[t] || 0) + 1));
  const types = Object.keys(need).sort((a, b) => need[b] - need[a]);
  const energy = []; let i = 0;
  while (energy.length < 6 && types.length) { const e = energyCardFor(types[i % types.length]); if (e) energy.push(e); i++; if (i > 30) break; }
  const sig = full.find(id => ["Oracle", "Relic"].includes((CARDS[id] || {}).type));
  return [...champs, ...energy, ...(sig ? [sig] : [])];
}
// ob draftu nove karte samodejno dodaj manjkajočo energijo (do 2 na draft) — "dobiš tudi to energijo"
function autoAddEnergy(cardId) {
  const need = [...cardEnergyTypes(cardId)];
  const have = deckEnergyCounts(RUN.deck);
  const added = [];
  for (const t of need) {
    if (added.length >= 2) break;
    let cur = have[t] || 0;
    while (cur < 2 && added.length < 2) { const eid = energyCardFor(t); if (!eid) break; RUN.deck.push(eid); added.push(t); cur++; }
  }
  return added;
}
// kompakten prikaz "afinitete" decka (panteoni + energije)
function affinityHtml(list) {
  const pc = deckPantheonCounts(list), ec = deckEnergyCounts(list);
  const pan = Object.keys(pc).sort((a, b) => pc[b] - pc[a]).map(p => {
    const st = PANTHEON_STYLE[p] || { symbol: "✦" };
    return `<span class="aff-chip" ${tipAttr(p, "Šampionov tega panteona: " + pc[p])}>${st.symbol} ${pc[p]}</span>`;
  }).join("");
  const en = Object.keys(ec).sort((a, b) => ec[b] - ec[a]).map(t => {
    const s = ENERGY_STYLE[t] || { glyph: "✦", color: "#aaa" };
    return `<span class="aff-chip" style="--mc:${s.color}" ${tipAttr(t + " energija", "Energij tega tipa: " + ec[t])}>${s.glyph} ${ec[t]}</span>`;
  }).join("");
  return `<div class="run-affinity"><span class="aff-lab">Panteoni</span>${pan || "<i>—</i>"}<span class="aff-lab">Energije</span>${en || "<i>—</i>"}</div>`;
}
function ensureRunScreen() {
  let s = document.getElementById("v2-run");
  if (!s) { s = el("section", "screen hidden"); s.id = "v2-run"; document.body.appendChild(s); }
  return s;
}
function hideRun() { const s = document.getElementById("v2-run"); if (s) s.classList.add("hidden"); }
function showRunScreen(html) {
  const s = ensureRunScreen();
  s.innerHTML = `<div class="run-wrap">${html}</div>`;
  ["v2-setup", "v2-game"].forEach(id => $("#" + id) && $("#" + id).classList.add("hidden"));
  s.classList.remove("hidden");
  return s;
}

// začetek pohoda: izbira starting deck-a (če run obstaja -> map)
function openRunStart() {
  loadRun();
  if (RUN) return showRunMap();
  const decks = Object.values(STARTER_DECKS).filter(d => d.id !== "custom" && d.id !== "run");
  const cards = decks.map(d => {
    const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    return `<button class="deck-card run-pick" data-deck="${d.id}" style="--deck-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <span class="deck-pantheon">${d.pantheon}</span><div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3><div class="deck-style">${d.style}</div><div class="deck-blurb">${d.blurb}</div>${heroPowerBlurb(d.pantheon)}</button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Roguelike kampanja</span><h2 class="run-title">Izberi začetni deck</h2></div>
      <button class="rules-toggle" id="run-back">← Nazaj</button></header>
    <p class="run-sub">Začneš z majhnim jedrom (~14 kart) izbranega panteona. Po vsaki zmagi draftaš karto — če dodaš novo energijo, dobiš tudi ustrezno mano. Gradi okrog enega panteona za moč, ali mešaj za fleksibilnost. Poraz konča pohod.</p>
    <div class="deck-grid run-decks">${cards}</div>`);
  s.querySelector("#run-back").addEventListener("click", backToMenu);
  s.querySelectorAll(".run-pick").forEach(b => b.addEventListener("click", () => startRun(b.dataset.deck)));
}
function startRun(deckId) {
  RUN = { mode: "campaign", deckId, deck: runStarterDeck(deckId), heroLife: V2.START_LIFE, champHpBonus: 0, handBonus: 0, favorStart: 0, stage: 0, upgrades: {} };
  saveRun(); showRunMap();
}
function backToMenu() { hideRun(); $("#v2-setup").classList.remove("hidden"); showMainMenu(); }

/* ---------------- ARENA (draft 30 + nagrade, do 3 porazov) ---------------- */
const ARENA_PICKS = 30;
function openArenaStart() {
  loadRun(); if (RUN && RUN.mode === "arena") return showRunMap();
  const decks = Object.values(STARTER_DECKS).filter(d => d.id !== "custom" && d.id !== "run");
  const cards = decks.map(d => {
    const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    return `<button class="deck-card run-pick" data-deck="${d.id}" style="--deck-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <span class="deck-pantheon">${d.pantheon}</span><div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3><div class="deck-blurb">Draftaš lahko karte vseh panteonov.</div>${heroPowerBlurb(d.pantheon)}</button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena</span><h2 class="run-title">Izberi svojega heroja</h2></div>
      <button class="rules-toggle" id="run-back">← Nazaj</button></header>
    <p class="run-sub">Panteon določi tvojega heroja in <b>Hero Power</b> (prikazan na vsaki kartici). Nato draftaš 30 kart (3 na izbiro), na koncu pa izbereš svoje energije. Igraš do <b>3 porazov</b>; po vsaki zmagi izbereš nagrado.</p>
    <div class="deck-grid run-decks">${cards}</div>`);
  s.querySelector("#run-back").addEventListener("click", backToMenu);
  s.querySelectorAll(".run-pick").forEach(b => b.addEventListener("click", () => startArena(b.dataset.deck)));
}
function startArena(coreDeckId) {
  RUN = { mode: "arena", deckId: coreDeckId, deck: [], draftLeft: ARENA_PICKS, energyDone: false, energyPick: {}, heroLife: V2.START_LIFE, champHpBonus: 0, handBonus: 0, favorStart: 0, stage: 0, wins: 0, losses: 0, upgrades: {} };
  saveRun(); showArenaDraft();
}
function showArenaDraft() {
  if (RUN.draftLeft <= 0) return showArenaEnergyPick();
  const pool = randomCardPool();
  const offers = []; let guard = 0;
  while (offers.length < 3 && guard++ < 200) { const id = pool[(Math.random() * pool.length) | 0]; if (!offers.includes(id)) offers.push(id); }
  const cardHtml = id => {
    const d = CARDS[id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
    const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : `⬡${V2.manaCostOf(d)}`;
    const atks = d.type === "Champion" ? atkRowsHtml(d, null) : `<div class="rdc-m">${d.text || d.effect || ""}</div>`;
    return `<button class="reward-card" data-id="${id}" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
      <div class="rw-tag">${d.minion ? "Minion" : d.type}</div>
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">${cost}</span></div>
      <div class="rdc-n">${d.name}</div><div class="rdc-m">${d.pantheon || "—"}${d.type === "Champion" ? " · ❤" + d.hp : ""}</div>${atks}</button>`;
  };
  const picked = ARENA_PICKS - RUN.draftLeft;
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena draft · ${picked}/${ARENA_PICKS}</span><h2 class="run-title">Izberi karto</h2></div></header>
    ${affinityHtml(RUN.deck)}
    <div class="reward-grid">${offers.map(cardHtml).join("")}</div>`);
  s.querySelectorAll(".reward-card").forEach((b, i) => b.addEventListener("click", () => { RUN.deck.push(offers[i]); RUN.draftLeft--; saveRun(); showArenaDraft(); }));
}
function fillArenaEnergy() { RUN.deck.push(...energyFor(RUN.deck, 0.5)); }
// na koncu drafta: izberi svoje energije (10–16), da deck ni samo energij
function showArenaEnergyPick() {
  const MIN = 10, MAX = 16;
  RUN.energyPick = RUN.energyPick || {};
  const chosen = RUN.energyPick;
  const total = Object.values(chosen).reduce((a, b) => a + b, 0);
  const need = {}; RUN.deck.forEach(id => cardEnergyTypes(id).forEach(t => need[t] = (need[t] || 0) + 1));
  const rec = Object.keys(need).sort((a, b) => need[b] - need[a]).map(t => { const s = ENERGY_STYLE[t] || {}; return `<span class="aff-chip" style="--mc:${s.color}">${s.glyph} ${t} ×${need[t]}</span>`; }).join("") || "<i>—</i>";
  const types = (typeof ENERGY_TYPES !== "undefined" ? ENERGY_TYPES : Object.keys(ENERGY_STYLE).filter(k => k !== "Any"));
  const btns = types.map(t => { const s = ENERGY_STYLE[t] || {}; const c = chosen[t] || 0; return `<button class="energy-pick ${c ? "has" : ""}" data-t="${t}" style="--mc:${s.color}">${s.glyph} ${t} <b>${c}</b></button>`; }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena · energije</span><h2 class="run-title">Izberi energije (${total}/${MAX})</h2></div></header>
    <p class="run-sub">Tvoje karte največ rabijo: ${rec}. Dodaj <b>${MIN}–${MAX}</b> energij. Klik = +1, desni klik = −1. (Tako deck ni samo energije — preostanek so tvoje karte.)</p>
    <div class="energy-pick-grid">${btns}</div>
    <div class="run-foot">
      <button class="rules-toggle" id="ep-auto">Samodejno priporočilo</button>
      <button class="rules-toggle" id="ep-clear">Počisti</button>
      <button class="btn-primary" id="ep-go" ${total >= MIN ? "" : "disabled"}>Potrdi (${total})</button>
    </div>`);
  s.querySelectorAll(".energy-pick").forEach(b => {
    b.addEventListener("click", () => { const t = b.dataset.t; if (Object.values(chosen).reduce((a, c) => a + c, 0) >= MAX) { toast("Največ " + MAX + " energij."); return; } chosen[t] = (chosen[t] || 0) + 1; saveRun(); showArenaEnergyPick(); });
    b.addEventListener("contextmenu", e => { e.preventDefault(); const t = b.dataset.t; if (chosen[t] > 0) { chosen[t]--; saveRun(); showArenaEnergyPick(); } });
  });
  s.querySelector("#ep-auto").addEventListener("click", () => { RUN.energyPick = {}; fillArenaEnergy(); finalizeArenaEnergy(); });
  s.querySelector("#ep-clear").addEventListener("click", () => { RUN.energyPick = {}; saveRun(); showArenaEnergyPick(); });
  s.querySelector("#ep-go").addEventListener("click", () => {
    Object.keys(chosen).forEach(t => { for (let i = 0; i < chosen[t]; i++) { const e = energyCardFor(t); if (e) RUN.deck.push(e); } });
    finalizeArenaEnergy();
  });
}
function finalizeArenaEnergy() { RUN.energyDone = true; RUN.energyPick = {}; saveRun(); showRunMap(); }

function showRunMap() {
  if (RUN.mode === "arena") return showArenaMap();
  const done = RUN.stage >= RUN_STAGES.length;
  const ladder = RUN_STAGES.map((st, i) => {
    const stt = i < RUN.stage ? "done" : (i === RUN.stage ? "current" : "locked");
    const sym = (PANTHEON_STYLE[(STARTER_DECKS[st.ai] || {}).pantheon] || { symbol: "✦" }).symbol;
    const mark = stt === "done" ? "✓" : stt === "current" ? "▶" : "🔒";
    return `<div class="run-stage ${stt}"><span class="rs-n">${i + 1}</span><span class="rs-sym">${sym}</span>
      <div class="rs-info"><b>${st.name}</b> <span class="rs-diff">${({ easy: "Lahko", normal: "Normalno", hard: "Težko" })[st.diff]}</span></div><span class="rs-mark">${mark}</span></div>`;
  }).join("");
  const champs = RUN.deck.filter(id => (CARDS[id] || {}).type === "Champion").length;
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Kampanja · ${RUN.stage}/${RUN_STAGES.length} zmag</span><h2 class="run-title">${done ? "🏆 Kampanja dokončana!" : "Karta kampanje"}</h2></div>
      <button class="rules-toggle" id="run-quit">Opusti</button></header>
    <div class="run-statline">
      ❤ Heroj: <b>${RUN.heroLife}</b> · 🃏 Deck: <b>${RUN.deck.length}</b> (${champs} šampionov)
      ${RUN.champHpBonus ? ` · 🛡 Šampioni +${RUN.champHpBonus} HP` : ""}${RUN.handBonus ? ` · ✋ +${RUN.handBonus} karta` : ""}${RUN.favorStart ? ` · 🔮 +${RUN.favorStart} Naklonjenost` : ""}
    </div>
    ${affinityHtml(RUN.deck)}
    <div class="run-ladder">${ladder}</div>
    <div class="run-foot">
      <button class="rules-toggle" id="run-deckbtn">Poglej deck</button>
      ${done ? `<button class="btn-primary" id="run-finish">Zaključi</button>` : `<button class="btn-primary" id="run-fight">Začni bitko ${RUN.stage + 1}: ${RUN_STAGES[RUN.stage].name}</button>`}
    </div>`);
  s.querySelector("#run-quit").addEventListener("click", () => { if (confirm("Opustiš kampanjo?")) { clearRun(); backToMenu(); } });
  s.querySelector("#run-deckbtn").addEventListener("click", () => showRunDeck());
  if (done) s.querySelector("#run-finish").addEventListener("click", () => { clearRun(); backToMenu(); });
  else s.querySelector("#run-fight").addEventListener("click", runLaunch);
}
function showArenaMap() {
  if (RUN.draftLeft > 0) return showArenaDraft();
  if (!RUN.energyDone) return showArenaEnergyPick();
  const champs = RUN.deck.filter(id => (CARDS[id] || {}).type === "Champion").length;
  const over = RUN.losses >= 3;
  const hearts = "❤".repeat(3 - RUN.losses) + "🖤".repeat(RUN.losses);
  const diffLab = RUN.wins < 3 ? "Lahko" : RUN.wins < 6 ? "Normalno" : "Težko";
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena · ${RUN.wins} zmag</span><h2 class="run-title">${over ? "🏟️ Arena končana" : "Arena"}</h2></div>
      <button class="rules-toggle" id="run-quit">Opusti</button></header>
    <div class="run-statline">🏆 Zmage: <b>${RUN.wins}</b> · Življenja runa: ${hearts} · 🃏 Deck: <b>${RUN.deck.length}</b> (${champs} šampionov)</div>
    ${affinityHtml(RUN.deck)}
    <div class="run-foot">
      <button class="rules-toggle" id="run-deckbtn">Poglej deck</button>
      ${over ? `<button class="btn-primary" id="run-finish">Zaključi</button>` : `<button class="btn-primary" id="run-fight">Začni bitko ${RUN.wins + 1} (${diffLab})</button>`}
    </div>`);
  s.querySelector("#run-quit").addEventListener("click", () => { if (confirm("Opustiš areno?")) { clearRun(); backToMenu(); } });
  s.querySelector("#run-deckbtn").addEventListener("click", () => showRunDeck());
  if (over) s.querySelector("#run-finish").addEventListener("click", () => { clearRun(); backToMenu(); });
  else s.querySelector("#run-fight").addEventListener("click", runLaunch);
}
function showRunDeck(removeMode) {
  const counts = {}; RUN.deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const cards = Object.keys(counts).sort().map(id => {
    const d = CARDS[id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
    const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : d.type === "Energy" ? "+mana" : `⬡${V2.manaCostOf(d)}`;
    const up = RUN.upgrades && RUN.upgrades[id];
    const upTip = up ? "Nadgradnje: " + (up.hp ? "+" + up.hp + " HP " : "") + (up.dmg ? "+" + up.dmg + " škode " : "") + (up.grants || []).map(g => g.split(":").pop()).join(", ") : "";
    return `<button class="run-deckcard ${removeMode ? "removable" : ""}" data-id="${id}" ${up ? tipAttr(d.name + " ★", upTip) : ""} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">×${counts[id]}</span>${up ? `<span class="rdc-up">★</span>` : ""}</div>
      <div class="rdc-n">${d.name}${up ? " ★" : ""}</div><div class="rdc-m">${d.type} · ${cost}</div></button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">${removeMode ? "Odstrani karto" : "Tvoj deck"}</span><h2 class="run-title">${RUN.deck.length} kart</h2></div>
      <button class="rules-toggle" id="run-deckback">← Nazaj</button></header>
    ${removeMode ? `<p class="run-sub">Klikni karto, ki jo odstraniš iz decka.</p>` : affinityHtml(RUN.deck)}
    <div class="run-deckgrid">${cards}</div>`);
  s.querySelector("#run-deckback").addEventListener("click", () => removeMode ? showReward(RUN._pendingRewards) : showRunMap());
  if (removeMode) s.querySelectorAll(".run-deckcard").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.id; const i = RUN.deck.indexOf(id); if (i >= 0) RUN.deck.splice(i, 1);
    RUN._pendingRewards = null; saveRun(); showRunMap();
  }));
}

// nagrade po zmagi
function randomCardPool() {
  // igrljive karte (brez energij, ascension in nadgrajenih klonov)
  return Object.values(CARDS).filter(d => d.type !== "Energy" && d.stage !== "ascended" && !d.upgraded).map(d => d.id);
}
function genRewards() {
  const all = randomCardPool();
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  // ena karta "v tvojem slogu" (tvoji panteoni ali nevtralna oprema), ena "divja"
  const top = runTopPantheons().slice(0, 3);
  const onColor = all.filter(id => { const d = CARDS[id]; return (d.pantheon && top.includes(d.pantheon)) || d.type === "Equipment"; });
  const upgrades = [
    { t: "upgradeCard", label: "⬆ Nadgradi šampiona", desc: "Izberi šampiona in mu daj trajno novo moč (HP / škodo / sposobnost)." },
    { t: "life", label: "❤ Heroj +25 življenja", desc: "Trajno višja meja življenj." },
    { t: "champhp", label: "🛡 Blagoslov: šampioni +10 HP", desc: "Vsi tvoji šampioni dobijo +10 HP." },
    { t: "hand", label: "✋ +1 karta v začetni roki", desc: "Vsako bitko začneš z eno karto več." },
    { t: "favor", label: "🔮 +1 Naklonjenost na začetku", desc: "Vsako bitko začneš z dodatno Naklonjenostjo." },
    { t: "remove", label: "✂ Odstrani karto", desc: "Stanjšaj deck — odstrani 1 karto." },
  ];
  const c1 = pick(onColor.length ? onColor : all);
  let c2 = pick(all); let g = 0; while (c2 === c1 && g++ < 6) c2 = pick(all);
  // nadgradnja championa je na voljo le, če imaš šampiona; sicer običajni upgrade
  const hasChamp = RUN.deck.some(id => (CARDS[id] || {}).type === "Champion");
  const pool = hasChamp ? upgrades : upgrades.filter(u => u.t !== "upgradeCard");
  const up = () => pool[(Math.random() * pool.length) | 0];
  // Arena: 2 naključni izbiri (lahko 2 karti, 2 upgrada ali mešano); Kampanja: karta + karta + upgrade
  if (RUN.mode === "arena") {
    const bag = [{ t: "card", id: c1, tag: "Karta" }, { t: "card", id: c2, tag: "Karta" }, up(), up()];
    for (let i = bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[bag[i], bag[j]] = [bag[j], bag[i]]; }
    return bag.slice(0, 2);
  }
  return [{ t: "card", id: c1, tag: "V tvojem slogu" }, { t: "card", id: c2, tag: "Divja karta" }, up()];
}
function showReward(rewards) {
  rewards = rewards || genRewards();
  RUN._pendingRewards = rewards;
  const cardHtml = r => {
    if (r.t === "card") {
      const d = CARDS[r.id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
      const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
      const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : `⬡${V2.manaCostOf(d)}`;
      const atks = d.type === "Champion" ? atkRowsHtml(d, null) : `<div class="rdc-m">${d.text || d.effect || ""}</div>`;
      return `<button class="reward-card" data-r="card" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
        <div class="rw-tag">${r.tag || "Dodaj karto"}</div>
        <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">${cost}</span></div>
        <div class="rdc-n">${d.name}</div><div class="rdc-m">${d.type}${d.type === "Champion" ? " · ❤" + d.hp : ""}</div>${atks}</button>`;
    }
    return `<button class="reward-card upgrade" data-r="${r.t}">
      <div class="rw-tag">Nadgradnja</div>
      <div class="rw-up-label">${r.label}</div><div class="rw-up-desc">${r.desc}</div></button>`;
  };
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Zmaga! Bitka ${RUN.stage}/${RUN_STAGES.length}</span><h2 class="run-title">Izberi nagrado</h2></div></header>
    <div class="reward-grid">${rewards.map(cardHtml).join("")}</div>`);
  const btns = s.querySelectorAll(".reward-card");
  rewards.forEach((r, i) => btns[i].addEventListener("click", () => applyReward(r)));
}
function applyReward(r) {
  if (r.t === "card") {
    RUN.deck.push(r.id);
    const addedEnergy = autoAddEnergy(r.id);
    saveRun();
    toast("Dodano: " + CARDS[r.id].name + (addedEnergy.length ? " (+ " + addedEnergy.length + " " + addedEnergy[0] + " energija)" : ""));
    showRunMap(); return;
  }
  if (r.t === "life") { RUN.heroLife += 25; saveRun(); showRunMap(); return; }
  if (r.t === "champhp") { RUN.champHpBonus += 10; saveRun(); showRunMap(); return; }
  if (r.t === "hand") { RUN.handBonus += 1; saveRun(); showRunMap(); return; }
  if (r.t === "favor") { RUN.favorStart += 1; saveRun(); showRunMap(); return; }
  if (r.t === "remove") { showRunDeck(true); return; }
  if (r.t === "upgradeCard") { showUpgradePicker(); return; }
}

/* ---------------- Nadgradnja kart (per-champion, trajno v runu) ---------------- */
// možne nadgradnje za danega championa (smiselne glede na to, kar že ima)
function champUpgradeOptions(cardId) {
  const d = CARDS[cardId]; const up = RUN.upgrades[cardId] || { grants: [] };
  const has = kw => (d[kw] || (up.grants || []).includes(kw));
  const opts = [
    { k: "hp", label: "❤ +25 HP", desc: "Trajno +25 najvišjega HP." },
    { k: "dmg", label: "⚔ +10 škode", desc: "Vsi napadi te karte +10 škode." },
  ];
  const extra = [];
  if (!has("lifesteal")) extra.push({ k: "kw:lifesteal", label: "🩸 Krvoses", desc: "Napadi zdravijo to karto za zadano škodo." });
  if (!has("charge")) extra.push({ k: "kw:charge", label: "⚡ Naval", desc: "Lahko napade že v potezi priklica." });
  if (!d.activated && !(up.grants || []).some(g => g.startsWith("ability:")))
    extra.push({ k: "ability:shieldSelf", label: "🛡 Aegis (aktivno)", desc: "Tapni + 1 mana: dvigne Shield." });
  if (!d.activated && !(up.grants || []).some(g => g.startsWith("ability:")))
    extra.push({ k: "ability:healSelf30", label: "❤ Okrevanje (aktivno)", desc: "Tapni + 2 mana: pozdravi 30 HP." });
  // 1 naključni "extra" + 2 osnovni = 3 izbire
  if (extra.length) opts.push(extra[(Math.random() * extra.length) | 0]);
  return opts;
}
function showUpgradePicker() {
  const champIds = [...new Set(RUN.deck.filter(id => (CARDS[id] || {}).type === "Champion"))];
  const cards = champIds.map(id => {
    const d = CARDS[id]; const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    const up = RUN.upgrades[id];
    const mark = up ? `<span class="rdc-x">★${(up.hp ? " +" + up.hp + "HP" : "") + (up.dmg ? " +" + up.dmg + "dmg" : "")}</span>` : "";
    return `<button class="run-deckcard" data-id="${id}" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${st.symbol}</span>${mark}</div>
      <div class="rdc-n">${d.name}${up ? " ★" : ""}</div><div class="rdc-m">❤${d.hp} · Champion</div></button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Nadgradnja</span><h2 class="run-title">Katerega šampiona okrepiš?</h2></div>
      <button class="rules-toggle" id="up-back">← Nazaj</button></header>
    <p class="run-sub">Nadgradnja velja za <b>vse kopije</b> te karte v decku — fokus na en tip šampiona se splača.</p>
    <div class="run-deckgrid">${cards}</div>`);
  s.querySelector("#up-back").addEventListener("click", () => showReward(RUN._pendingRewards));
  s.querySelectorAll(".run-deckcard").forEach(b => b.addEventListener("click", () => showUpgradeOptions(b.dataset.id)));
}
function showUpgradeOptions(cardId) {
  const d = CARDS[cardId]; const opts = champUpgradeOptions(cardId);
  const cardsHtml = opts.map((o, i) => `<button class="reward-card upgrade" data-i="${i}">
    <div class="rw-tag">${d.name}</div><div class="rw-up-label">${o.label}</div><div class="rw-up-desc">${o.desc}</div></button>`).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Nadgradnja · ${d.name}</span><h2 class="run-title">Izberi moč</h2></div>
      <button class="rules-toggle" id="up-back2">← Nazaj</button></header>
    <div class="reward-grid">${cardsHtml}</div>`);
  s.querySelector("#up-back2").addEventListener("click", () => showUpgradePicker());
  s.querySelectorAll(".reward-card").forEach((b, i) => b.addEventListener("click", () => applyUpgrade(cardId, opts[i])));
}
function applyUpgrade(cardId, opt) {
  const up = RUN.upgrades[cardId] || { hp: 0, dmg: 0, grants: [] };
  if (opt.k === "hp") up.hp = (up.hp || 0) + 25;
  else if (opt.k === "dmg") up.dmg = (up.dmg || 0) + 10;
  else { up.grants = up.grants || []; if (!up.grants.includes(opt.k)) up.grants.push(opt.k); }
  RUN.upgrades[cardId] = up; saveRun();
  toast(CARDS[cardId].name + ": " + opt.label);
  showRunMap();
}
// zgradi nadgrajeno definicijo karte in jo registriraj; vrne (morda novi) id
function upgradedCardId(baseId) {
  const up = RUN.upgrades[baseId]; if (!up) return baseId;
  const id = baseId + "#u";
  const c = JSON.parse(JSON.stringify(CARDS[baseId]));
  c.id = id; c._baseId = baseId; c.upgraded = true;
  c.name = c.name + " ★";
  if (up.hp) c.hp += up.hp;
  if (up.dmg) (c.attacks || []).forEach(a => { a.damage = (a.damage || 0) + up.dmg; });
  (up.grants || []).forEach(g => {
    if (g === "kw:lifesteal") c.lifesteal = true;
    else if (g === "kw:charge") c.charge = true;
    else if (g === "ability:shieldSelf") c.activated = { name: "Aegis", cost: ["Any"], effect: "shieldSelf", text: "Tapni + 1 mana: dvigne Shield (−20 naslednji udarec)." };
    else if (g === "ability:healSelf30") c.activated = { name: "Okrevanje", cost: ["Any", "Any"], effect: "healSelf30", text: "Tapni + 2 mana: pozdravi 30 HP." };
  });
  CARDS[id] = c;
  return id;
}

function runLaunch() {
  let aiDeck, diff;
  if (RUN.mode === "arena") {
    const decks = Object.keys(STARTER_DECKS).filter(k => k !== "custom" && k !== "run");
    aiDeck = decks[(Math.random() * decks.length) | 0];
    diff = RUN.wins < 3 ? "easy" : RUN.wins < 6 ? "normal" : "hard";
  } else {
    const stage = RUN_STAGES[RUN.stage]; aiDeck = stage.ai; diff = stage.diff;
  }
  const list = RUN.deck.map(id => upgradedCardId(id)); // vključi per-card nadgradnje
  STARTER_DECKS.run = { id: "run", name: "Tvoj deck", pantheon: STARTER_DECKS[RUN.deckId] ? STARTER_DECKS[RUN.deckId].pantheon : deckPantheon(RUN.deck), blurb: "", style: "Run", list };
  V2.startGame("run", aiDeck, diff);
  G.noDeckout = true; // lean run deck -> brez deckout poraza (samo nehaš vleči)
  const you = G.players[0];
  you.maxLife = RUN.heroLife; you.life = RUN.heroLife;
  you.favor = Math.min(3, RUN.favorStart || 0);
  if (RUN.champHpBonus) [...you.deck, ...you.hand].forEach(i => { if (def(i).type === "Champion") i.maxHp += RUN.champHpBonus; });
  for (let k = 0; k < (RUN.handBonus || 0); k++) { if (you.deck.length) you.hand.push(you.deck.pop()); }
  runActive = true;
  hideRun(); $("#v2-setup").classList.add("hidden"); $("#v2-game").classList.remove("hidden");
  showFirstPick();
}
function onRunBattleEnd(won) {
  $("#v2-game").classList.add("hidden");
  if (RUN.mode === "arena") {
    if (won) { RUN.wins++; saveRun(); showReward(); }
    else { RUN.losses++; saveRun(); if (RUN.losses >= 3) runGameOver(false); else showArenaMap(); }
    return;
  }
  // kampanja
  if (won) {
    RUN.stage++; saveRun();
    if (RUN.stage >= RUN_STAGES.length) runGameOver(true);
    else showReward();
  } else { runGameOver(false); }
}
function runGameOver(won) {
  const arena = RUN.mode === "arena";
  const title = arena ? (won ? "ARENA — ZMAGA 🏆" : "ARENA KONČANA") : (won ? "ZMAGA KAMPANJE 🏆" : "KAMPANJA KONČANA");
  const sub = arena
    ? `${RUN.wins} zmag pred 3 porazi. Deck je imel ${RUN.deck.length} kart.`
    : (won ? "Premagal si vseh 6 panteonov!" : `Padel si v bitki ${RUN.stage + 1}. Deck je dosegel ${RUN.deck.length} kart.`);
  const s = showRunScreen(`
    <div class="run-over">
      <h1 class="victory-title" style="${won ? "" : "background:linear-gradient(180deg,#ffd9d2,#ff6b5e 55%,#7a241d);-webkit-background-clip:text;background-clip:text;color:transparent;"}">${title}</h1>
      <p class="run-sub">${sub}</p>
      <button class="btn-primary" id="run-new">Nazaj v meni</button>
    </div>`);
  clearRun();
  s.querySelector("#run-new").addEventListener("click", backToMenu);
}

/* ---------------- FIRST CHAMPION PICK ---------------- */
function showFirstPick() {
  seenChampUids = new Set(); lastChampFx = {}; prevYouMana = []; // nova bitka -> ponastavi FX sledenje
  const you = G.players[0];
  const titleEl = document.querySelector("#v2-pick .mull-title"); if (titleEl) titleEl.textContent = "Mulligan — obdrži ali zameši roko";
  const subEl = document.querySelector("#v2-pick .mull-sub"); if (subEl) subEl.innerHTML = "Začneš s <b>praznim boardom</b> — vse igraš iz roke. Prvi mulligan je zastonj, vsak naslednji poteguje 1 karto manj.";
  const wrap = $("#v2-pick-cards"); wrap.innerHTML = "";
  you.hand.forEach(inst => {
    const d = def(inst);
    wrap.appendChild(d.type === "Champion" && d.stage === "basic" ? champPreviewCard(d) : handInfoCard(d));
  });
  let actions = document.getElementById("v2-pick-actions");
  if (!actions) { actions = el("div", "mull-actions"); actions.id = "v2-pick-actions"; $("#v2-pick .mulligan-inner").appendChild(actions); }
  actions.innerHTML = "";
  const mulls = you._mulligans || 0;
  const nextCost = mulls === 0 ? "zastonj" : "−" + mulls + (mulls === 1 ? " karta" : " kart");
  const keep = el("button", "mull-btn keep", "✓ Obdrži in začni");
  keep.addEventListener("click", () => { V2.keepHand(); $("#v2-pick").classList.add("hidden"); render(); showTurnBanner("Tvoja poteza", "you"); });
  const mull = el("button", "mull-btn mull", `🔄 Mulligan (${nextCost})`);
  mull.addEventListener("click", () => { V2.mulliganHand(); showFirstPick(); });
  actions.appendChild(keep); actions.appendChild(mull);
  $("#v2-pick").classList.remove("hidden");
}
// info kartica za ne-šampione (energija/oracle/relic/realm) v izbiri
function handInfoCard(d) {
  const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
  const n = el("div", "mull-card v2-infocard");
  n.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#23233a,#3a3a52)");
  let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : d.type === "Realm" ? "🏛" : "✦"));
  let costTag = "";
  if (d.type === "Energy") costTag = `<span class="v2-cost energy">+mana</span>`;
  else if (["Oracle", "Relic", "Realm"].includes(d.type)) costTag = `<span class="v2-cost">⬡ ${V2.manaCostOf(d)}</span>`;
  const desc = d.type === "Energy" ? `${d.energyType} mana` : (d.text || (d.effect || ""));
  n.innerHTML = `
    <div class="v2-pick-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span>${costTag}</div>
    <div class="v2-pick-body">
      <div class="v2-pick-name">${d.name}</div>
      <div class="v2-pick-meta">${d.type}${d.pantheon ? " · " + d.pantheon : ""}</div>
      <div class="v2-info-desc">${desc}</div>
    </div>`;
  return n;
}
function energiesUsed(d) {
  const set = [...new Set((d.attacks || []).flatMap(a => a.cost || []).filter(c => c !== "Any"))];
  if (!set.length) return `<span class="v2-pick-en none">brez specifične</span>`;
  return set.map(t => { const s = ENERGY_STYLE[t] || { color: "#888", glyph: "✦" };
    return `<span class="v2-pick-en"><span class="v2-cc" style="--mc:${s.color}">${s.glyph}</span> ${t}</span>`; }).join("");
}
function champPreviewCard(d) {
  const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const n = el("div", "mull-card v2-pickcard");
  n.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  const wr = [];
  if (d.weakness) wr.push(`<span class="wk">⚠ ${d.weakness}</span>`);
  if (d.resistance) wr.push(`<span class="rs">🛡 ${d.resistance}</span>`);
  n.innerHTML = `
    <div class="v2-pick-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${st.symbol}</span>
      <span class="v2-champ-hp">❤ ${d.hp}</span></div>
    <div class="v2-pick-body">
      <div class="v2-pick-name">${d.name} ${kwMini(d)}</div>
      <div class="v2-pick-meta">${d.pantheon} · ${d.rarity}</div>
      ${d.ability ? `<div class="v2-pick-ability"><b>${d.ability.name}.</b> ${d.ability.text}</div>` : ""}
      ${d.activated ? `<div class="v2-pick-ability act"><b>⚡ ${d.activated.name}</b> (${costHtml(d.activated.cost)}). ${d.activated.text}</div>` : ""}
      ${d.dodge ? `<div class="v2-pick-ability act">💨 <b>Umik ${Math.round(d.dodge * 100)}%</b> — možnost izogiba napadu.</div>` : ""}
      <div class="v2-pick-sec">Napadi</div>
      ${atkRowsHtml(d, null)}
      <div class="v2-pick-sec">Energije</div>
      <div class="v2-pick-enrow">${energiesUsed(d)}</div>
      ${wr.length ? `<div class="v2-pick-wr">${wr.join("")}</div>` : ""}
    </div>`;
  return n;
}

/* ---------------- RENDER ---------------- */
let lastChampFx = {};   // {uid:{hp,buffs,x,y}} — za smrt/heal/buff FX
let prevYouMana = [];   // za mana tap/dodajanje FX
function render() {
  if (!G.players.length) return;
  renderSide($("#v2-opp"), G.players[1], false);
  renderSide($("#v2-you"), G.players[0], true);
  renderHand();
  renderActions();
  renderLog();
  $("#v2-turn").innerHTML = G.over ? "" : `Poteza ${G.turnCount} · na potezi: <b>${G.turn === 0 ? "Ti" : "Nasprotnik"}</b>`;
  $("#v2-end").style.display = (G.turn === 0 && !G.over) ? "" : "none";
  updateArrow();
  hideDmgPreview();
  fxTrackChamps();
  fxManaChanges();
}
// zazna smrt (poof), zdravljenje (zelen +) in nove buffe (utrip) med renderji
function fxTrackChamps() {
  const all = []; G.players.forEach(pl => pl.board.forEach(c => all.push(c)));
  const curUids = new Set(all.map(c => c.uid));
  Object.keys(lastChampFx).forEach(uid => { if (!curUids.has(uid)) { const f = lastChampFx[uid]; deathPoof(f.x, f.y); } });
  const cur = {};
  all.forEach(c => {
    const eln = findChampEl(c.uid);
    const b = eln ? eln.getBoundingClientRect() : null;
    const pos = b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : (lastChampFx[c.uid] || { x: 0, y: 0 });
    const hp = c.maxHp - c.damage;
    const buffs = ["blessing", "shield", "guard"].filter(k => c.status && c.status[k]);
    const prev = lastChampFx[c.uid];
    if (prev && eln) {
      if (hp > prev.hp) { flyDamage(pos.x, pos.y - 14, hp - prev.hp, "heal"); eln.classList.add("fx-heal"); setTimeout(() => eln.classList.remove("fx-heal"), 650); }
      if (buffs.some(bk => !prev.buffs.includes(bk))) { eln.classList.add("fx-buff"); setTimeout(() => eln.classList.remove("fx-buff"), 750); }
    }
    cur[c.uid] = { hp, buffs, x: pos.x, y: pos.y };
  });
  lastChampFx = cur;
}
function deathPoof(x, y) {
  ensureFx();
  const n = el("div", "v2-poof", "☠");
  n.style.left = x + "px"; n.style.top = y + "px";
  document.getElementById("v2-fx").appendChild(n);
  setTimeout(() => n.remove(), 700);
}
// mana: utrip ob tapanju, pop ob dodajanju (samo igralčeva)
function fxManaChanges() {
  const you = G.players[0]; if (!you) { prevYouMana = []; return; }
  const cur = you.mana.map(m => m.tapped);
  const pips = document.querySelectorAll('#v2-you .v2-manacard');
  cur.forEach((tapped, i) => {
    const pip = pips[i]; if (!pip) return;
    if (i >= prevYouMana.length) { pip.classList.add("just-added"); setTimeout(() => pip.classList.remove("just-added"), 500); }
    else if (tapped && !prevYouMana[i]) { pip.classList.add("just-tapped"); setTimeout(() => pip.classList.remove("just-tapped"), 420); }
  });
  prevYouMana = cur;
}

function heroBar(p) {
  const pct = Math.max(0, Math.round(p.life / (p.maxLife || V2.START_LIFE) * 100));
  const st = PANTHEON_STYLE[p.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const hpw = p.heroPower ? `<span class="v2-hero-pw" title="${p.heroPower.text}">★ ${p.heroPower.name}</span>` : "";
  return `<div class="v2-hero">
    <div class="v2-hero-ava" style="--c-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">${st.symbol}</div>
    <div class="v2-hero-info">
      <span class="v2-hero-name">${p.name} ${hpw}</span>
      <div class="v2-hero-bar"><div class="v2-hero-fill ${p.life <= 40 ? "low" : ""}" style="width:${pct}%"></div>
        <span class="v2-hero-life">❤ ${p.life}</span></div>
    </div>
  </div>`;
}
// kompaktna (read-only) mana vrstica za nasprotnika (v glavi)
function manaRow(p) {
  const untap = p.mana.filter(m => !m.tapped).length;
  const pips = p.mana.map(m => {
    const s = ENERGY_STYLE[m.type] || { color: "#888", glyph: "✦" };
    return `<span class="v2-mana ${m.tapped ? "tapped" : ""}" style="--mc:${s.color}">${s.glyph}</span>`;
  }).join("");
  return `<div class="v2-mana-row"><span class="v2-mana-lab">MANA <b>${untap}</b>/${p.mana.length}</span>${pips}</div>`;
}
// aktivne sinergije (Bond / Zavezništvo) kot chip-i
function synergyChips(p) {
  if (!V2.synergyLabels) return "";
  const labels = V2.synergyLabels(p);
  if (!labels.length) return "";
  return `<div class="v2-syn">` + labels.map(l => {
    const st = l.pantheon ? (PANTHEON_STYLE[l.pantheon] || { symbol: "✦" }) : null;
    const ic = l.kind === "bond" ? (st ? st.symbol : "⚡") : "🤝";
    return `<span class="v2-synchip ${l.kind === "bond" ? "syn-bond" : "syn-ally"}" ${tipAttr((l.kind === "bond" ? "⚡ Bond: " : "🤝 ") + l.name, l.text)}>${ic} ${l.name}</span>`;
  }).join("") + `</div>`;
}
// interaktivna cona energij POD tvojim boardom — klikni karte energij za plačilo
function renderManaZone(you) {
  const zone = el("div", "v2-manazone");
  const untap = you.mana.filter(m => !m.tapped).length;
  const picking = !!manaPick;
  const lab = picking
    ? `<span class="mz-lab picking">Tapni energije za plačilo: ${costHtml(manaPick.cost)} <b>${manaPick.sel.length}/${manaPick.cost.length}</b></span><button class="mz-cancel">✕</button>`
    : `<span class="mz-lab">ENERGIJE <b>${untap}</b>/${you.mana.length}</span>`;
  const pips = you.mana.map((m, i) => {
    const s = ENERGY_STYLE[m.type] || { color: "#888", glyph: "✦" };
    const sel = picking && manaPick.sel.includes(i);
    const cls = "v2-manacard" + (m.tapped ? " tapped" : "") + (sel ? " sel" : "") + (picking && (!m.tapped || sel) ? " selectable" : "");
    return `<span class="${cls}" data-mi="${i}" style="--mc:${s.color}" ${tipAttr(m.type + " energija", m.tapped ? "Porabljena to potezo (odtapne se na začetku tvoje poteze)." : "Na voljo za priklic / napade / efekte.")}>${s.glyph}<small>${m.type}</small></span>`;
  }).join("");
  zone.innerHTML = `${lab}<div class="mz-pips">${pips || '<span class="mz-empty">— igraj energijo iz roke —</span>'}</div>`;
  if (picking) {
    const cx = zone.querySelector(".mz-cancel"); if (cx) cx.addEventListener("click", () => { manaPick = null; render(); });
    zone.querySelectorAll(".v2-manacard").forEach(pip => pip.addEventListener("click", () => {
      const i = +pip.dataset.mi;
      if (you.mana[i].tapped && !manaPick.sel.includes(i)) return;
      const k = manaPick.sel.indexOf(i); if (k >= 0) manaPick.sel.splice(k, 1); else manaPick.sel.push(i);
      if (manaSelValid(manaPick.sel, manaPick.cost, manaPick.lughAny)) { const cb = manaPick.onPaid, idx = manaPick.sel.slice(); manaPick = null; cb(idx); }
      else render();
    }));
  }
  return zone;
}

function renderSide(container, p, isYou) {
  container.innerHTML = "";
  const row = el("div", "v2-board-row");
  if (!p.board.length) row.appendChild(el("div", "v2-empty", isYou ? "Tvoj board je prazen" : "Brez branilcev — napadljiv obraz!"));
  p.board.forEach(c => row.appendChild(boardChamp(c, p, isYou)));
  // razpored simetričen: nasprotnik = glava zgoraj + board; ti = board + noga (heroj + energije v eni vrstici)
  if (isYou) {
    container.appendChild(row);
    const footer = el("div", "v2-you-footer");
    const hb = el("div", "v2-head");
    hb.innerHTML = heroBar(p) + `<div class="v2-meta">Deck ${p.deck.length} · Roka ${p.hand.length}</div>` + synergyChips(p);
    footer.appendChild(hb);
    footer.appendChild(renderManaZone(p));
    container.appendChild(footer);
  } else {
    const head = el("div", "v2-head");
    head.innerHTML = heroBar(p) + `<div class="v2-meta">Deck ${p.deck.length} · Roka ${p.hand.length}</div>` + synergyChips(p) + manaRow(p);
    container.appendChild(head);
    container.appendChild(row);
    const heroEl = head.querySelector(".v2-hero");
    if (heroEl) {
      const canFace = G.turn === 0 && !G.over && selAttacker && selAtkIndex != null && !V2.tauntsOf(p).length;
      if (canFace) heroEl.classList.add("face-targetable");
      heroEl.addEventListener("click", () => {
        if (G.turn === 0 && !G.over && selAttacker && selAtkIndex != null) doAttack({ kind: "face" });
        else toast("Izberi svojega napadalca in napad, nato klikni nasprotnikov lik.");
      });
    }
  }
}

function boardChamp(c, owner, isYou) {
  const d = def(c);
  const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const life = c.maxHp - c.damage;
  const pct = Math.max(0, Math.round(life / c.maxHp * 100));
  const taunt = V2.isTaunt(c);
  const node = el("div", "v2-champ" + (c.tapped ? " tapped" : "") + (c.sick ? " sick" : "") + (d.minion ? " minion" : "") + (taunt ? " taunt" : ""));
  node.dataset.uid = c.uid;
  node.dataset.owner = isYou ? "you" : "opp";
  if (!seenChampUids.has(c.uid)) { node.classList.add("entering"); seenChampUids.add(c.uid); } // enter-play animacija (enkrat)
  node.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  const canAtk = isYou && G.turn === 0 && !G.over && V2.canAttack(owner, c);
  if (canAtk) node.classList.add("ready");
  if (selAttacker === c.uid) node.classList.add("selected-att");
  // targetable highlight — pri Tauntu so napadljivi le Taunt branilci
  if (selAttacker && selAtkIndex != null && !isYou) {
    const oppTaunts = V2.tauntsOf(owner).length;
    if (!oppTaunts || taunt) node.classList.add("targetable");
    else node.classList.add("blocked-target");
  }
  if (pendingPlay && ((pendingPlay.need === "ally" && isYou) || (pendingPlay.need === "enemy" && !isYou)))
    node.classList.add(pendingPlay.need === "enemy" ? "targetable" : "target-ally");
  const stChips = statusChips(c);
  // combo/momentum badge: zaporedni napadi istega tipa dajo bonus naslednjemu
  let comboTag = "";
  if (c._comboCount >= 2 && c._comboType) {
    const es = ENERGY_STYLE[c._comboType] || { glyph: "✦", color: "#ffd97a" };
    const nextBonus = Math.min(c._comboCount * 10, 30);
    comboTag = `<span class="v2-tag combo" style="--mc:${es.color}" ${tipAttr("🔥 Combo ×" + c._comboCount, "Zaporedni " + c._comboType + " napadi. Naslednji " + c._comboType + " napad: +" + nextBonus + " škode.")}>🔥${c._comboCount}</span>`;
  }
  const tauntTag = taunt ? `<span class="v2-tag taunt" ${tipAttr("🛡 Taunt (Zid)", "Nasprotnik mora najprej napasti tega branilca, preden lahko udari ostale ali obraz.")}>🛡</span>` : "";
  const decayTag = d.decay ? `<span class="v2-tag decay" ${tipAttr("☠ Razpad " + d.decay + "/potezo", "Vsak konec poteze izgubi " + d.decay + " HP in sčasoma umre.")}>☠${d.decay}</span>` : "";
  node.innerHTML = `
    <div class="v2-champ-art">${artImg(d, "champ-art-img")}<span class="v2-champ-sym">${st.symbol}</span>
      <span class="v2-champ-hp">${life}</span>
      ${c.sick ? `<span class="v2-tag sick">💤</span>` : ""}${c.tapped ? `<span class="v2-tag tap">↻</span>` : ""}${tauntTag}${decayTag}${comboTag}
      ${stChips ? `<div class="v2-champ-statusbar">${stChips}</div>` : ""}</div>
    <div class="v2-champ-body">
      <div class="v2-champ-name" ${tipAttr(d.name, cardTipText(d))}>${d.name}</div>
      <div class="v2-hpbar"><div class="v2-hpfill ${pct <= 35 ? "low" : ""}" style="width:${pct}%"></div></div>
      ${atkRowsHtml(d, isYou ? owner : null)}
      <div class="v2-status">${kwMini(d)}${equipChips(c)}</div>
    </div>`;
  node.addEventListener("click", () => onChampClick(c, owner, isYou));
  return node;
}
// vrstice napadov: cena (mana glyphi) + damage; označi plačljive (tvoja poteza)
function atkRowsHtml(d, owner) {
  if (!d.attacks || !d.attacks.length) return "";
  return `<div class="v2-atks">` + d.attacks.map(a => {
    const payable = owner && G.turn === 0 && !G.over && V2.canPay(owner, a.cost, d.id === "celtic-lugh");
    return `<div class="v2-atk${payable ? " ok" : ""}" ${tipAttr(a.name, atkTipText(a))}><span class="v2-atk-cost">${costHtml(a.cost)}</span><span class="v2-atk-dmg">${a.damage}</span></div>`;
  }).join("") + `</div>`;
}
const STATUS_BUFFS = ["blessing", "shield", "guard"];
const STATUS_SHORT = { burn: "Ožig", freeze: "Zmrznjen", stun: "Omama", curse: "Prekletstvo", blessing: "Blagoslov", shield: "Shield", poison: "Strup", guard: "Garda" };
function statusChips(c) {
  const s = c.status || {}; const out = [];
  const map = { burn: "🔥", freeze: "❄️", stun: "💫", curse: "💀", blessing: "✨", shield: "🛡️", poison: "☠️", guard: "⛨" };
  // kompaktni ikonski badge-i — VSI vidni; ime+učinek v tooltipu (hover/dvoklik)
  for (const k in map) if (s[k]) {
    const t = STATUS_TEXT[k] || [k, ""];
    const kind = STATUS_BUFFS.includes(k) ? "buff" : "debuff";
    const n = (typeof s[k] === "number" && s[k] > 1) ? `<b>${s[k]}</b>` : "";
    out.push(`<span class="v2-st ${kind}" ${tipAttr(t[0], (STATUS_SHORT[k] || k) + " — " + t[1])}>${map[k]}${n}</span>`);
  }
  return out.join("");
}
function kwIcon(kw, glyph) { const t = KEYWORD_TEXT[kw] || [kw, ""]; return `<span class="v2-kwi" ${tipAttr(t[0], t[1])}>${glyph}</span>`; }
function kwMini(d) {
  const ic = [];
  if (d.charge) ic.push(kwIcon("charge", "⚡")); if (d.lifesteal) ic.push(kwIcon("lifesteal", "🩸")); if (d.overload) ic.push(kwIcon("overload", "⛓"));
  if (d.onEnter) ic.push(kwIcon("onEnter", "➹")); if (d.onDefeat) ic.push(kwIcon("onDefeat", "☠"));
  if (d.activated) ic.push(`<span class="v2-kwi" ${tipAttr("⚡ " + d.activated.name, d.activated.text)}>✦</span>`); if (d.dodge) ic.push(kwIcon("dodge", "💨"));
  return ic.length ? `<span class="v2-kw">${ic.join("")}</span>` : "";
}
// chip-i pritrjene opreme (orožje/oklep) + razlaga; kw doda granted keywords
function equipChips(c) {
  const out = [];
  [["weapon", c.weapon, "🗡️"], ["armor", c.armor, "🛡️"]].forEach(([slot, id, gl]) => {
    if (!id) return; const e = CARDS[id];
    out.push(`<span class="v2-equip ${slot}" ${tipAttr(gl + " " + e.name, e.text)}>${gl}</span>`);
  });
  return out.join("");
}

function renderHand() {
  const you = G.players[0];
  const h = $("#v2-hand"); h.innerHTML = "";
  you.hand.forEach(inst => {
    const d = def(inst);
    const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const node = el("div", "v2-handcard");
    node.setAttribute("data-tip-title", d.name); node.setAttribute("data-tip", cardTipText(d));
    node.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#2a2a3a,#444)");
    let cost = "";
    if (d.type === "Champion") cost = `<span class="v2-cost">⬡ ${V2.summonCostOf(d)}</span>`;
    else if (d.type === "Energy") cost = `<span class="v2-cost energy">+mana</span>`;
    else if (["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) cost = `<span class="v2-cost">⬡ ${V2.manaCostOf(d)}</span>`;
    const playable = isPlayable(inst);
    if (playable) node.classList.add("playable");
    let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : "✦");
    node.innerHTML = `<div class="v2-hc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span>${cost}</div>
      <div class="v2-hc-body"><div class="v2-hc-name">${d.name}</div>
      <div class="v2-hc-meta">${d.type === "Equipment" ? (d.slot === "armor" ? "Oklep" : "Orožje") : d.type}${d.type === "Champion" ? " ❤" + d.hp : ""}</div>
      ${d.type === "Champion" ? atkRowsHtml(d, null) : ""}</div>`;
    node.addEventListener("click", () => onHandClick(inst));
    h.appendChild(node);
  });
  $("#v2-hand").classList.toggle("dim", G.turn !== 0 || G.over);
}
function isPlayable(inst) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over || G.pendingBlock || manaPick) return false;
  if (d.type === "Energy") return !you.playedEnergyThisTurn;
  if (d.type === "Champion") return d.stage === "basic" && you.board.length < V2.BOARD_MAX && V2.canPay(you, Array.from({ length: V2.summonCostOf(d) }, () => "Any"));
  if (["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) {
    if (!V2.canPay(you, Array.from({ length: V2.manaCostOf(d) }, () => "Any"))) return false;
    const need = V2.cardNeedsTarget(d);
    if (need === "ally" && !you.board.length) return false;
    if (need === "enemy" && !G.players[1].board.length) return false;
    if (d.type === "Realm" && G.realm === d.id) return false;
    return true;
  }
  return false;
}

function renderActions() {
  const panel = $("#v2-actions"); panel.innerHTML = "";
  if (G.over) { panel.appendChild(el("div", "hint", G.winner === 0 ? "ZMAGA! 🏆" : "Poraz.")); return; }
  if (G.turn !== 0) { panel.appendChild(el("div", "hint", "Nasprotnik je na potezi…")); return; }
  const you = G.players[0];

  // ročna izbira mane -> sedaj v coni energij POD boardom
  if (manaPick) {
    panel.appendChild(el("div", "hint", `Tapni energije <b>pod svojim boardom</b> za plačilo: ${costHtml(manaPick.cost)}.`));
    return;
  }

  // čaka tarčo za urok/relic
  if (pendingPlay) {
    panel.appendChild(el("div", "hint", `Izberi ${pendingPlay.need === "enemy" ? "nasprotnikovega" : "svojega"} šampiona za <b>${def(pendingPlay.inst).name}</b>.`));
    const cancel = el("button", "action-btn", "Prekliči");
    cancel.addEventListener("click", () => { pendingPlay = null; render(); });
    panel.appendChild(cancel);
    return;
  }

  if (selAttacker) {
    const c = you.board.find(x => x.uid === selAttacker); const d = c ? def(c) : null;
    if (d) {
      panel.appendChild(el("div", "hint", `Napada: <b>${d.name}</b>. Izberi napad, nato tarčo.`));
      if (V2.tauntsOf(G.players[1]).length) panel.appendChild(el("div", "hint taunt-hint", `🛡 Nasprotnik ima <b>zid (Taunt)</b> — najprej premagaj branilce z 🛡 (obraz in ostali so zaščiteni).`));
      d.attacks.forEach((atk, i) => {
        const can = V2.canPay(you, atk.cost, d.id === "celtic-lugh");
        const b = el("button", "action-btn attack" + (selAtkIndex === i ? " sel" : ""));
        b.innerHTML = `${atk.name} <span class="ab-cost">${atk.damage} dmg · ${costHtml(atk.cost)}</span>`;
        b.disabled = !can;
        b.setAttribute("data-tip-title", atk.name); b.setAttribute("data-tip", atkTipText(atk));
        b.addEventListener("click", () => { selAtkIndex = i; toast("Klikni nasprotnikovega šampiona ali NJEGOV OBRAZ."); render(); });
        panel.appendChild(b);
      });
      // aktivirana (obrambna/utility) sposobnost — namesto napada
      if (d.activated) {
        const a = d.activated;
        const canAct = V2.canPay(you, a.cost, d.id === "celtic-lugh");
        const ab = el("button", "action-btn ability");
        ab.innerHTML = `⚡ ${a.name} <span class="ab-cost">${costHtml(a.cost)}</span>`;
        ab.disabled = !canAct;
        ab.title = a.text;
        ab.setAttribute("data-tip-title", "⚡ " + a.name); ab.setAttribute("data-tip", (EFFECT_TEXT[a.effect] || a.text));
        ab.addEventListener("click", () => doActivate());
        panel.appendChild(ab);
      }
      const cancel = el("button", "action-btn", "Prekliči");
      cancel.addEventListener("click", () => { selAttacker = null; selAtkIndex = null; render(); });
      panel.appendChild(cancel);
      // gumb za napad na obraz (če je izbran napad)
      if (selAtkIndex != null) {
        const face = el("button", "action-btn attack", "⚔ Napadi OBRAZ nasprotnika");
        face.addEventListener("click", () => doAttack({ kind: "face" }));
        panel.appendChild(face);
      }
    }
  } else {
    panel.appendChild(el("div", "hint", "Klikni svojega <b>netapnjenega</b> šampiona za napad, ali igraj karto iz roke (energija / priklic)."));
    // Hero Power
    if (you.heroPower) {
      const hpw = you.heroPower;
      const canHP = !you.heroPowerUsed && V2.canPay(you, Array.from({ length: hpw.cost }, () => "Any"));
      const b = el("button", "action-btn hero-power" + (you.heroPowerUsed ? " used" : ""));
      b.innerHTML = `★ ${hpw.name} <span class="ab-cost">⬡${hpw.cost}</span>`;
      b.title = hpw.text;
      b.setAttribute("data-tip-title", "★ " + hpw.name); b.setAttribute("data-tip", hpw.text + "\n(1× na potezo)");
      b.disabled = !canHP;
      b.addEventListener("click", doHeroPower);
      panel.appendChild(b);
    }
    // Naklonjenost toggle
    if (you.favor > 0 || you._favorArmed) {
      const armed = you._favorArmed && you.favor > 0;
      const fb = el("button", "action-btn favor" + (armed ? " armed" : ""), `🔮 Naklonjenost ${you.favor}/3 ${armed ? "✦" : ""}`);
      fb.addEventListener("click", () => { you._favorArmed = !you._favorArmed; render(); });
      panel.appendChild(fb);
    }
  }
}
function doHeroPower() {
  const you = G.players[0]; const hpw = you.heroPower; if (!hpw) return;
  payThen(Array.from({ length: hpw.cost }, () => "Any"), false, idx => {
    const r = V2.useHeroPower(you, idx);
    if (!r.ok) toast(r.msg || "Ni mogoče.");
    manaPick = null; render(); checkOver();
  });
}
function costHtml(cost) {
  return (cost || []).map(c => { const s = ENERGY_STYLE[c]; return `<span class="v2-cc" style="--mc:${s ? s.color : "#aaa"}">${s ? s.glyph : "◇"}</span>`; }).join("");
}

function renderLog() {
  const l = $("#v2-log"); l.innerHTML = "";
  G.log.slice(-24).forEach(line => l.appendChild(el("div", null, line)));
  l.scrollTop = l.scrollHeight;
}

/* ---------------- HUMAN INTERACTION ---------------- */
// plačaj cost: če ni izbire (untapped == cost) avtomatsko; sicer ročna izbira mane
function kCombos(arr, k) {
  const res = [];
  (function rec(start, combo) {
    if (combo.length === k) { res.push(combo.slice()); return; }
    for (let i = start; i < arr.length; i++) { combo.push(arr[i]); rec(i + 1, combo); combo.pop(); }
  })(0, []);
  return res;
}
function payThen(cost, lughAny, onPaid) {
  const you = G.players[0];
  if (!V2.canPay(you, cost, lughAny)) { toast("Premalo mane."); return; }
  const untapped = you.mana.map((m, i) => i).filter(i => !you.mana[i].tapped);
  // moraš porabiti vso netapnjeno mano -> samodejno
  if (untapped.length === cost.length) { onPaid(untapped); return; }
  // sicer: če vse veljavne izbire pustijo ISTI preostanek tipov, je izbira nepomembna -> samodejno
  const combos = kCombos(untapped, cost.length).filter(c => manaSelValid(c, cost, lughAny));
  if (combos.length) {
    const remSig = c => { const u = new Set(c); return you.mana.filter((m, i) => !m.tapped && !u.has(i)).map(m => m.type).sort().join("|"); };
    const sigs = new Set(combos.map(remSig));
    if (sigs.size === 1) { onPaid(combos[0]); return; } // npr. 2 enaki energiji & cena 2, ali edina veljavna izbira
  }
  manaPick = { cost, lughAny, sel: [], onPaid };
  toast("Izberi mano za plačilo (" + cost.length + ").");
  render();
}
function manaSelValid(sel, cost, lughAny) {
  const you = G.players[0];
  if (sel.length !== cost.length) return false;
  const pool = sel.map(i => you.mana[i]).filter(m => m && !m.tapped).map(m => m.type);
  if (pool.length !== cost.length) return false;
  const specific = cost.filter(c => c !== "Any"); const anyN = cost.filter(c => c === "Any").length;
  const tmp = pool.slice();
  for (const need of specific) { let k = tmp.indexOf(need); if (k < 0 && lughAny && tmp.length) k = 0; if (k < 0) return false; tmp.splice(k, 1); }
  return tmp.length === anyN;
}

function onHandClick(inst) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over || manaPick) return;
  if (d.type === "Energy") { const r = V2.playEnergy(you, inst); if (!r.ok && r.msg) toast(r.msg); render(); return; }
  if (d.type === "Champion") {
    if (d.stage !== "basic") { toast("Ascension karte (zaenkrat) v v2 ne moreš priklicati."); return; }
    if (you.board.length >= V2.BOARD_MAX) { toast("Board je poln (3)."); return; }
    const cost = Array.from({ length: V2.summonCostOf(d) }, () => "Any");
    payThen(cost, false, idx => { const r = V2.summon(you, inst, idx); if (!r.ok) toast(r.msg || "Ni mogoče."); manaPick = null; render(); });
    return;
  }
  if (["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) {
    const need = V2.cardNeedsTarget(d);
    if (need) {
      if (need === "ally" && !you.board.length) { toast("Nimaš šampiona za opremo."); return; }
      pendingPlay = { inst, need };
      selAttacker = null; selAtkIndex = null;
      toast(need === "enemy" ? "Izberi nasprotnikovega šampiona." : (d.type === "Equipment" ? "Izberi šampiona za opremo." : "Izberi svojega šampiona."));
      render();
      return;
    }
    const cost = Array.from({ length: V2.manaCostOf(d) }, () => "Any");
    payThen(cost, false, idx => { const r = V2.playCard(you, inst, { manaIdx: idx }); if (!r.ok) toast(r.msg || "Ni mogoče."); manaPick = null; render(); });
    return;
  }
}

function onChampClick(c, owner, isYou) {
  if (G.turn !== 0 || G.over || manaPick) return;
  // 1) izbira tarče za urok/relic
  if (pendingPlay) {
    const want = pendingPlay.need;
    if ((want === "ally" && isYou) || (want === "enemy" && !isYou)) {
      const inst = pendingPlay.inst; const d = def(inst);
      const cost = Array.from({ length: V2.manaCostOf(d) }, () => "Any");
      const targetUid = c.uid;
      pendingPlay = null;
      payThen(cost, false, idx => { const r = V2.playCard(G.players[0], inst, { targetUid, manaIdx: idx }); if (!r.ok) toast(r.msg || "Ni mogoče."); manaPick = null; render(); });
      return;
    } else { toast(want === "ally" ? "Izberi SVOJEGA šampiona." : "Izberi NASPROTNIKOVEGA šampiona."); return; }
  }
  // 2) napad
  if (isYou) {
    if (!V2.canAttack(owner, c)) { toast("Ta šampion ne more napasti (tapnjen / sick / stun)."); return; }
    if (selAttacker === c.uid) { selAttacker = null; selAtkIndex = null; render(); return; }
    selAttacker = c.uid; selAtkIndex = null;
    // če ima samo en plačljiv napad, ga samodejno izberi -> puščica se takoj pokaže
    const atks = def(c).attacks || [];
    const payable = atks.map((a, i) => i).filter(i => V2.canPay(owner, atks[i].cost, def(c).id === "celtic-lugh"));
    if (payable.length === 1) selAtkIndex = payable[0];
    render();
  } else {
    if (selAttacker && selAtkIndex != null) doAttack({ kind: "champ", uid: c.uid });
    else toast("Najprej izberi svojega napadalca in napad.");
  }
}

function doActivate() {
  const you = G.players[0];
  const c = you.board.find(x => x.uid === selAttacker); if (!c || !def(c).activated) return;
  payThen(def(c).activated.cost, def(c).id === "celtic-lugh", idx => {
    const r = V2.activateAbility(you, selAttacker, idx);
    if (!r.ok) toast(r.msg || "Ni mogoče.");
    selAttacker = null; selAtkIndex = null; manaPick = null;
    render();
  });
}
function doAttack(target) {
  const you = G.players[0];
  const c = you.board.find(x => x.uid === selAttacker); if (!c) return;
  const atk = def(c).attacks[selAtkIndex];
  const attUid = selAttacker, atkIdx = selAtkIndex;
  payThen(atk.cost, def(c).id === "celtic-lugh", idx => {
    const targetEl = target.kind === "champ" ? findChampEl(target.uid) : heroElOf("opp");
    const r = V2.attack(you, attUid, atkIdx, target, idx);
    if (!r.ok) { toast(r.msg || "Napad ni mogoč."); manaPick = null; render(); return; }
    selAttacker = null; selAtkIndex = null; manaPick = null;
    updateArrow();
    animateStrike(attUid, targetEl, r.dmg, r.dodged);
    setTimeout(() => { render(); checkOver(); }, 300);
  });
}

$("#v2-end") && document.addEventListener("DOMContentLoaded", () => {});

/* ---------------- AI TURN ---------------- */
function endHumanTurn() {
  if (G.turn !== 0 || G.over) return;
  selAttacker = null; selAtkIndex = null;
  V2.endTurn(); render();
  if (!G.over) setTimeout(runAiTurn, 500);
}
function runAiTurn() {
  if (G.over) { checkOver(); return; }
  aiBusy = true;
  showTurnBanner("Poteza nasprotnika", "opp");
  const ai = G.players[1];
  const e = ai.hand.find(i => def(i).type === "Energy"); if (e) V2.playEnergy(ai, e);
  render();
  setTimeout(aiSummon, 550);
}
function aiSummon() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1];
  if (ai.board.length < V2.BOARD_MAX) {
    const affordable = ai.hand.filter(i => def(i).type === "Champion" && def(i).stage === "basic" && V2.canPay(ai, Array.from({ length: V2.summonCostOf(def(i)) }, () => "Any")));
    // sinergija: raje prikliči šampiona prevladujočega panteona (gradi Bond)
    const boardPan = {}; ai.board.forEach(x => { const p = def(x).pantheon; if (p) boardPan[p] = (boardPan[p] || 0) + 1; });
    affordable.sort((a, b) => ((boardPan[def(b).pantheon] || 0) - (boardPan[def(a).pantheon] || 0)) || (V2.summonCostOf(def(b)) - V2.summonCostOf(def(a))));
    const c = affordable[0];
    if (c) { const dd = def(c); revealCard(dd, "Nasprotnik prikliče", () => { V2.summon(ai, c); render(); setTimeout(aiSummon, 350); }); return; }
  }
  setTimeout(aiSpells, 400);
}
function aiSpells() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], you = G.players[0];
  // odigraj en smiseln Oracle/Relic/Realm, če je mana in tarča
  const inst = ai.hand.find(i => {
    const d = def(i); if (!["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) return false;
    if (!V2.canPay(ai, Array.from({ length: V2.manaCostOf(d) }, () => "Any"))) return false;
    const need = V2.cardNeedsTarget(d);
    if (need === "ally" && !ai.board.length) return false;
    if (need === "enemy" && !you.board.length) return false;
    if (d.type === "Realm" && G.realm === d.id) return false;
    return true;
  });
  if (inst) {
    const need = V2.cardNeedsTarget(def(inst));
    let targetUid = null;
    if (need === "enemy") targetUid = (you.board[0] || {}).uid;
    else if (need === "ally") targetUid = (ai.board.slice().sort((a, b) => (b.maxHp - b.damage) - (a.maxHp - a.damage))[0] || {}).uid;
    const dd = def(inst);
    revealCard(dd, "Nasprotnik igra", () => { V2.playCard(ai, inst, { targetUid }); render(); setTimeout(aiSpells, 300); });
    return; // morda še en
  }
  setTimeout(aiAbilities, 400);
}
function aiAbilities() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], opp = G.players[0];
  // Hero Power, če je smiseln in plačljiv
  const hpw = ai.heroPower;
  if (hpw && !ai.heroPowerUsed && V2.canPay(ai, Array.from({ length: hpw.cost }, () => "Any"))) {
    let use = false;
    if (hpw.kind === "heroHeal") use = ai.life < ai.maxLife * 0.6;
    else if (hpw.kind === "chain") use = opp.board.length >= 2 || (opp.board.length === 1 && (opp.board[0].maxHp - opp.board[0].damage) <= hpw.value);
    else if (hpw.kind === "heroAttack") use = !opp.board.some(c => !c.tapped) || opp.life <= hpw.value;
    else if (hpw.kind === "shieldAll") use = ai.board.length >= 2 && opp.board.length >= 1;
    if (use) { V2.useHeroPower(ai); render(); setTimeout(aiAbilities, 600); return; }
  }
  // aktiviraj obrambno/heal sposobnost na poškodovanem šampionu (HP < 55%)
  const c = ai.board.find(x => V2.canActivate && V2.canActivate(ai, x) &&
    (x.maxHp - x.damage) / x.maxHp < 0.55 &&
    ["healSelf30", "guard", "shieldSelf", "healBoard20"].includes(def(x).activated.effect));
  if (c) { V2.activateAbility(ai, c.uid); render(); setTimeout(aiAbilities, 500); return; }
  setTimeout(() => aiAttack(ai.board.filter(x => V2.canAttack(ai, x))), 450);
}
function aiAttack(queue) {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], you = G.players[0];
  if (!queue.length) { V2.endTurn(); aiBusy = false; render(); checkOver(); if (!G.over) showTurnBanner("Tvoja poteza", "you"); return; }
  const c = queue.shift();
  if (!V2.canAttack(ai, c)) { aiAttack(queue); return; }
  const best = aiBestAttack(c);
  if (!best) { aiAttack(queue); return; }
  // tarča: spoštuj Taunt (zid) — sicer ubij šampiona če moreš, sicer pritisni obraz
  let target = { kind: "face" };
  const taunts = V2.tauntsOf(you);
  const bestVs = pool => { let bt = null, btDmg = -1; pool.forEach(t => { const pr = V2.previewDamage(c, ai, t, def(c).attacks[best.i]); if (pr && pr.dmg > btDmg) { btDmg = pr.dmg; bt = t; } }); return { bt, btDmg }; };
  if (taunts.length) {
    const { bt } = bestVs(taunts); target = { kind: "champ", uid: bt.uid };
  } else if (you.board.length) {
    const { bt, btDmg } = bestVs(you.board);
    if (bt && btDmg >= (bt.maxHp - bt.damage)) target = { kind: "champ", uid: bt.uid };
  }
  const targetEl = target.kind === "champ" ? findChampEl(target.uid) : heroElOf("you");
  const res = V2.attack(ai, c.uid, best.i, target);
  if (!res || !res.ok) { aiAttack(queue); return; }
  animateStrike(c.uid, targetEl, res.dmg, res.dodged);
  setTimeout(() => {
    render(); checkOver();
    if (G.over) { aiBusy = false; return; }
    setTimeout(() => aiAttack(queue), 350);
  }, 320);
}
function aiBestAttack(c) {
  const ai = G.players[1];
  let best = null;
  (def(c).attacks || []).forEach((atk, i) => {
    if (!V2.canPay(ai, atk.cost, def(c).id === "celtic-lugh")) return;
    if (!best || (atk.damage || 0) > (best.dmg || 0)) best = { i, dmg: atk.damage || 0 };
  });
  return best;
}

/* obramba face poteka prek Taunt zidu (glej engine attack) — star blokirni modal je opuščen */

/* ---------------- END / OVERLAY ---------------- */
function checkOver() {
  if (!G.over) return;
  render();
  if (runActive) {
    runActive = false;
    const won = G.winner === 0;
    setTimeout(() => onRunBattleEnd(won), 1100);
    return;
  }
  setTimeout(() => toast(G.winner === 0 ? "🏆 ZMAGA!" : "Poraz — heroj je padel."), 200);
}

/* ---------------- BOOT ---------------- */
window.addEventListener("DOMContentLoaded", () => {
  ensureFx();
  initTooltips();
  buildSetup();
  $("#v2-end").addEventListener("click", endHumanTurn);
  // Dnevnik: zložljiv, privzeto zaprt
  const logPanel = document.querySelector(".log-panel");
  if (logPanel) {
    logPanel.classList.add("collapsed");
    const h = logPanel.querySelector("h4");
    if (h) { h.style.cursor = "pointer"; h.addEventListener("click", () => logPanel.classList.toggle("collapsed")); }
  }
  document.addEventListener("mousemove", (e) => {
    arrowPos = { x: e.clientX, y: e.clientY };
    if (arrowActive()) { updateArrow(); updateDmgPreview(); }
    else hideDmgPreview();
  });
});

// debug/test hook
window.__run = { end: (won) => { runActive = false; onRunBattleEnd(won); }, get state() { return RUN; } };
