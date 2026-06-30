/* ============================================================================
   MYTHIC CLASH: WARS OF PANTHEONS
   decks.js — Starter decks (uravnoteženo)
   ----------------------------------------------------------------------------
   Vsak deck = 40 kart. Sestava:
     16 Champion, 14 Energy, 6 Oracle, 3 Relic, 1 Realm
   Energije so usklajene z dejanskimi potrebami napadov championov,
   championi pa so osredotočeni na 1–2 energijska tipa za konsistentnost.
============================================================================ */

// pomožna: ponovi id n-krat
function rep(id, n) { return Array.from({ length: n }, () => id); }

const STARTER_DECKS = {

  /* ---------------------------------------------------------------- */
  /* OLYMPUS — Sky/Wisdom jedro. Pegasus + Oracle pritisk, Zeus finale. */
  olympus: {
    id: "olympus",
    name: "Olympus Strike",
    pantheon: "Greek",
    blurb: "Uravnotežen grški deck. Hiter Sky pritisk, card draw in Zeus kot zaključek.",
    style: "Balanced • Sky • Draw",
    list: [
      // 16 Champions — jedro Sky (Pegasus, Zeus) + Wisdom (Athena, Oracle)
      ...rep("greek-pegasus", 4),   // Sky, poceni, cost 0 retreat
      ...rep("greek-oracle", 3),    // Wisdom, draw engine
      ...rep("greek-athena", 3),    // Wisdom/War
      ...rep("greek-hydra", 2),     // Nature splash (cheap)
      ...rep("greek-zeus", 2),      // Sky finisher
      ...rep("greek-heracles", 1),  // War body
      "greek-heracles-asc",         // ascension
      // 14 Energy — Sky težišče
      ...rep("energy-sky", 8), ...rep("energy-wisdom", 4), ...rep("energy-war", 2),
      // 6 Oracle
      ...rep("oracle-council-olympus", 2), // draw + attach
      ...rep("oracle-prophecy-war", 2),    // blessing
      "oracle-ritual-rebirth", "oracle-march-legion",
      // 3 Relic
      "relic-thunderbolt", "relic-shield-athena", "relic-ankh",
      // 1 Realm
      "realm-olympus",
      // Oprema (orožje/oklep)
      "equip-spear-olympus", "equip-legion-aegis",
      // Minioni (1 mana)
      ...rep("minion-hoplite", 2), ...rep("minion-harpy", 2),
      // Napadalni uroki
      ...rep("spell-lightning-bolt", 2), "spell-divine-wrath",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* RAGNAROK — War jedro, agresija. Veliko War teles + Thor finale.   */
  ragnarok: {
    id: "ragnarok",
    name: "Ragnarok Fury",
    pantheon: "Norse",
    blurb: "Agresiven nordijski deck. Veliko War napadov, hitri pritisk in Thor, Storm Unleashed.",
    style: "Aggro • War • Burst",
    list: [
      // 16 Champions — jedro War, a manj eksplozivno (manj Valkyrie/Fenrir)
      ...rep("norse-valkyrie", 3),   // War, poceni agresija (4->3)
      ...rep("norse-fenrir", 2),     // War, velik damage (3->2)
      ...rep("norse-frostgiant", 3), // Frost body (2->3, počasnejši wall)
      ...rep("norse-freya", 3),      // Sky/War utility + heal (2->3)
      ...rep("norse-thor", 2),       // War/Sky
      ...rep("norse-loki", 1),       // Trickery splash
      ...rep("norse-odin", 1),       // Wisdom/Sky draw (0->1, manj tempa)
      "norse-thor-asc",              // ascension
      // 14 Energy — War težišče + nekaj Sky/Frost
      ...rep("energy-war", 7), ...rep("energy-sky", 3), ...rep("energy-frost", 4),
      // 6 Oracle
      ...rep("oracle-valkyries", 2),     // draw3
      ...rep("oracle-prophecy-war", 1),  // blessing (2->1)
      "oracle-tricksters-bargain", "oracle-march-legion", "oracle-ritual-rebirth",
      // 3 Relic
      ...rep("relic-runestone", 2), "relic-spear-mars",
      // 1 Realm
      "realm-asgard",
      // Oprema (orožje/oklep)
      "equip-wolf-blade", "equip-jotun-hide",
      // Minioni (1 mana)
      ...rep("minion-berserker", 2), ...rep("minion-shieldmaiden", 2),
      // Napadalni uroki
      "spell-mjolnir", ...rep("spell-frost-nova", 1),
    ],
  },

  /* ---------------------------------------------------------------- */
  /* SANDS — Sun jedro, heal/revive. Scarab+Isis začetek, Ra finale.   */
  eternity: {
    id: "eternity",
    name: "Sands of Eternity",
    pantheon: "Egyptian",
    blurb: "Egipčanski deck zdravljenja in vstajenj. Sončno težišče, vztrajen tempo, močan late game.",
    style: "Sun • Heal • Revive",
    list: [
      // 16 Champions — jedro Sun (Scarab, Isis, Ra, Horus delno)
      ...rep("egypt-scarab", 4),    // Sun, poceni
      ...rep("egypt-isis", 3),      // Sun, heal
      ...rep("egypt-horus", 2),     // Sky/Sun
      ...rep("egypt-sphinx", 2),    // Wisdom/Sun wall
      ...rep("egypt-ra", 2),        // Sun finisher
      ...rep("egypt-anubis", 1),    // Underworld splash
      "egypt-osiris",               // Underworld/Sun revive
      "egypt-anubis-asc",           // ascension
      // 14 Energy — Sun težišče + Sky (Horus) + Wisdom (Sphinx) + Underworld
      ...rep("energy-sun", 8), ...rep("energy-underworld", 2),
      ...rep("energy-wisdom", 2), ...rep("energy-sky", 2),
      // 6 Oracle
      ...rep("oracle-ritual-rebirth", 2), // heal60
      ...rep("oracle-sandstorm-ra", 2),   // dmg30
      "oracle-blessing-ancestors", "oracle-council-olympus",
      // 3 Relic
      "relic-eye-of-ra", ...rep("relic-ankh", 2),
      // 1 Realm
      "realm-duat",
      // Oprema (orožje/oklep)
      "equip-khopesh-ra", "equip-legion-aegis",
      // Minioni (1 mana)
      ...rep("minion-tomb-guard", 2), ...rep("minion-scarab-swarm", 2),
      // Napadalni uroki
      ...rep("spell-solar-flare", 2),
    ],
  },

  /* ---------------------------------------------------------------- */
  /* FOREST — Nature jedro, status/control. Osredotočeno, manj razpršeno. */
  spirits: {
    id: "spirits",
    name: "Forest of Spirits",
    pantheon: "Slavic",
    blurb: "Slovanski deck narave in statusov. Nadzor tempa, zdravljenje, prekletstva in led okoli Nature jedra.",
    style: "Nature • Status • Control",
    list: [
      // 16 Champions — Nature/Underworld/Fire jedro + več udarne moči
      ...rep("slavic-svarog", 3),    // Fire finisher 40/70
      ...rep("slavic-veles", 3),     // Underworld 30/60 + curse
      ...rep("slavic-leshy", 2),     // Nature wall 30/50 + freeze
      ...rep("slavic-perun", 2),     // 130HP Sky/War finisher 40/70
      ...rep("slavic-morana", 2),    // Frost 30/60
      ...rep("slavic-vesna", 2),     // Nature heal
      ...rep("slavic-babayaga", 2),  // Trickery/Nature poison
      // 14 Energy — Fire + Nature + Underworld + nekaj Sky (Perun)
      ...rep("energy-fire", 4), ...rep("energy-nature", 4),
      ...rep("energy-underworld", 3), ...rep("energy-sky", 2), ...rep("energy-frost", 1),
      // 6 Oracle
      ...rep("oracle-sandstorm-ra", 2),       // dmg30 (closing power)
      ...rep("oracle-tricksters-bargain", 2), // curse
      ...rep("oracle-prophecy-war", 2),       // blessing (+10 dmg)
      // 3 Relic
      ...rep("relic-veles-chain", 2), "relic-druid-amulet",
      // 1 Realm
      "realm-grove",
      // Oprema (orožje/oklep)
      "equip-bark-carapace", "equip-jotun-hide",
      // Minioni (1 mana)
      ...rep("minion-domovoi", 2), ...rep("minion-vila", 2),
      // Napadalni uroki
      ...rep("spell-fireball", 2),
    ],
  },

  /* ---------------------------------------------------------------- */
  /* ROME — War/Wisdom legija. Disciplina, formacije,ščiti.            */
  legion: {
    id: "legion",
    name: "Legion of Rome",
    pantheon: "Roman",
    blurb: "Rimski deck discipline. War napadi, formacije z rezervo, ščiti in Mars kot zaključek.",
    style: "War • Formation • Shield",
    list: [
      // 16 Champions — War/Wisdom jedro
      ...rep("roman-legionnaire", 3), // War, formacija (reserve reduce)
      ...rep("roman-mars", 2),        // War finisher
      ...rep("roman-minerva", 2),     // Wisdom
      ...rep("roman-romulus", 2),     // War/Wisdom
      ...rep("roman-vulcan", 2),      // Fire body
      ...rep("roman-janus", 2),       // Wisdom utility
      ...rep("roman-augur", 1),       // Wisdom draw
      ...rep("roman-wolf", 2),        // Nature splash (Lupa)
      // 14 Energy — War težišče + Wisdom + nekaj Fire
      ...rep("energy-war", 7), ...rep("energy-wisdom", 4), ...rep("energy-fire", 3),
      // 6 Oracle
      ...rep("oracle-march-legion", 2),  // shieldAll
      ...rep("oracle-prophecy-war", 2),  // blessing
      ...rep("oracle-council-olympus", 2), // draw + attach
      // 3 Relic
      ...rep("relic-spear-mars", 2), "relic-shield-athena",
      // 1 Realm
      "realm-forum",
      // Oprema (orožje/oklep)
      "equip-legion-aegis", "equip-spear-olympus",
      // Minioni (1 mana)
      ...rep("minion-legionnaire", 2), ...rep("minion-velite", 2),
      // Napadalni uroki
      ...rep("spell-javelin", 2),
    ],
  },

  /* ---------------------------------------------------------------- */
  /* CELTIC — Nature/Sun/Trickery. Mistika, heal, raznolikost.         */
  tirnanog: {
    id: "tirnanog",
    name: "Tir na nÓg",
    pantheon: "Celtic",
    blurb: "Keltski deck mistike. Nature in Sun moč, prekletstva, zdravljenje in junak Cúchulainn.",
    style: "Nature • Sun • Mystic",
    list: [
      // 16 Champions — Nature/Sun jedro
      ...rep("celtic-cernunnos", 3),  // Nature body 40/60
      ...rep("celtic-druid", 2),      // Nature draw/heal
      ...rep("celtic-cuchulainn", 2), // War finisher 80
      ...rep("celtic-lugh", 2),       // Sun 40/60
      ...rep("celtic-brigid", 2),     // Fire/Nature heal
      ...rep("celtic-morrigan", 2),   // Trickery curse
      ...rep("celtic-banshee", 1),    // Moon control
      ...rep("celtic-faerie", 2),     // Trickery cheap
      // 14 Energy — Nature težišče + Sun + Fire + Trickery
      ...rep("energy-nature", 6), ...rep("energy-sun", 3),
      ...rep("energy-fire", 2), ...rep("energy-trickery", 2), ...rep("energy-war", 1),
      // 6 Oracle
      ...rep("oracle-tricksters-bargain", 2), // curse
      ...rep("oracle-blessing-ancestors", 2), // heal reserve
      ...rep("oracle-ritual-rebirth", 2),     // heal active 60
      // 3 Relic
      ...rep("relic-druid-amulet", 2), "relic-ankh",
      // 1 Realm
      "realm-grove",
      // Oprema (orožje/oklep)
      "equip-gaebolg", "equip-bark-carapace",
      // Minioni (1 mana)
      ...rep("minion-druid-acolyte", 2), ...rep("minion-pixie", 2),
      // Napadalni uroki
      ...rep("spell-archer-volley", 2),
    ],
  },
};

/* expose */
if (typeof window !== "undefined") window.STARTER_DECKS = STARTER_DECKS;
if (typeof module !== "undefined") module.exports = { STARTER_DECKS };
