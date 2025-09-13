/* ============================================================================
 * Neue Siedler – Entities Registry
 * Datei: assets/core/entities.registry.js
 * Version: v1.0.0
 *
 * Zweck
 *  - Zentrale, UI- und Engine-neutrale Definition von Gebäuden
 *  - Kategorie-Tabelle inkl. Platzhalterfarben (kein Rot/Grün!)
 *  - Sprite-Pfade (so weit wie möglich auf deinen aktuellen Bestand gemappt)
 *  - Aliasse pro Gebäude (z.B. "house" ↔ "wohnhaus")
 *
 * Verwendung
 *  - window.EntitiesRegistry.resolve(kind)  → {key, label, category, color, sprite, size}
 *  - window.EntitiesRegistry.color(kind)    → Platzhalterfarbe für Kategorie
 *  - window.EntitiesRegistry.CATEGORIES     → { id → {label, color} }
 *  - window.EntitiesRegistry.KINDS          → { key → Def }
 *
 * Hinweise
 *  - Farben sind KEINE Build-Validierung! Rot/Grün bleiben für „platzierbar / nicht
 *    platzierbar“ reserviert (kommt separat in der Bau-Logik).
 *  - Sprites sind best-effort gemäß deiner aktuellen File-Liste; wenn ein Sprite fehlt,
 *    rendert die Engine automatisch den farbigen Platzhalter.
 * ============================================================================ */

(function () {
  'use strict';

  const LOG = (...a)=> (window.CBLog?.info || console.log)('[entities.registry]', ...a);

  // ----------------------------- Kategorien --------------------------------
  // Keins davon ist Rot/Grün, damit diese Farben für Platzier-Status frei bleiben.
  const CATEGORIES = {
    // Verwaltung / Zentrum
    admin:      { id:'admin',      label:'Verwaltung',      color:'#2563EB' }, // blau
    // Nahrung/Produktion
    food:       { id:'food',       label:'Nahrung',         color:'#F59E0B' }, // orange/amber
    // Rohstoffe
    resources:  { id:'resources',  label:'Rohstoffe',       color:'#7C3AED' }, // violett
    // Wohnen
    housing:    { id:'housing',    label:'Wohnen',          color:'#06B6D4' }, // cyan
    // Infrastruktur / Wege
    infra:      { id:'infra',      label:'Infrastruktur',   color:'#64748B' }, // slate
    // Deko / Landschaft
    deco:       { id:'deco',       label:'Deko/Landschaft', color:'#E91E63' }, // pink
    // Militär
    military:   { id:'military',   label:'Militär',         color:'#8D6E63' }, // braun
  };

  // Ein paar bequeme Sets für Alias-Auflösung
  const alias = (arr)=> new Set(arr.map(s=> String(s).trim().toLowerCase()));

  // Globale Standardgröße für Tiles/Sprites
  const DEFAULT_SIZE = 64;

  // ------------------------------- Gebäude ---------------------------------
  // Sprite-Pfade sind auf Basis deiner Liste gewählt:
  //  assets/buildings/*.png   (neuer Zielort)
  //  assets/tex/building/wood/*.PNG (Altbestand, als Fallback)
  //
  // Engine/Bau-UI schickt meist z.B. "place-house" → "house" (siehe Aliasse).
  //
  // WICHTIG: Rathaus ≠ HQ. Rathaus = Dorfzentrum (admin). HQ = militärisch (military).
  const KINDS = {
    // Verwaltung
    'rathaus': {
      key: 'rathaus',
      label: 'Rathaus',
      category: 'admin',
      // bevorzugt „neuer“ Ort:
      sprite: firstExisting([
        'assets/buildings/rathaus_wood1.png',
        'assets/buildings/rathaus_stone1.png',
        'assets/buildings/rathaus_baustelle_wood0.png',
        // Fallbacks (Altbestand)
        'assets/tex/building/wood/hq_wood.PNG' // nur als absoluter Fallback Bild, bis dein Rathaus final ist
      ]),
      size: DEFAULT_SIZE,
      // Aliasse, die in deinem Flow vorkommen könnten:
      aliases: alias(['rathaus', 'townhall', 'place-rathaus', 'place-townhall'])
    },

    // Militär (HQ separat von Rathaus!)
    'hq': {
      key: 'hq',
      label: 'Hauptquartier',
      category: 'military',
      sprite: firstExisting([
        'assets/hq_stone.png',
        'assets/tex/building/wood/hq_wood.PNG'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['hq', 'hauptquartier', 'place-hq'])
    },

    // Wohnen
    'house': {
      key: 'house',
      label: 'Wohnhaus',
      category: 'housing',
      sprite: firstExisting([
        'assets/buildings/wohnhaus_wood1_ug0.png',
        'assets/buildings/wohnhaus_wood0_ug0.png',
        'assets/tex/building/wood/haeuser_wood1.PNG'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['house', 'wohnhaus', 'place-house'])
    },

    // Nahrung
    'farm': {
      key: 'farm',
      label: 'Farm',
      category: 'food',
      sprite: firstExisting([
        'assets/buildings/farm_wood.png'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['farm', 'place-farm'])
    },
    'fisher': {
      key: 'fisher',
      label: 'Fischer',
      category: 'food',
      sprite: firstExisting([
        'assets/buildings/fischer_wood1.png'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['fischer', 'fisher', 'place-fisher'])
    },
    'baker': {
      key: 'baker',
      label: 'Bäcker',
      category: 'food',
      sprite: firstExisting([
        'assets/buildings/baecker_wood.png'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['baecker','baker','place-baker'])
    },
    'windmill': {
      key: 'windmill',
      label: 'Mühle',
      category: 'food',
      sprite: firstExisting([
        'assets/buildings/windmuehle_wood.png',
        'assets/tex/building/wood/wassermuehle_wood.PNG'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['windmill','muehle','place-windmill'])
    },

    // Rohstoffe
    'lumberjack': {
      key: 'lumberjack',
      label: 'Holzfäller',
      category: 'resources',
      sprite: firstExisting([
        'assets/buildings/lumberjack_wood.png',
        'assets/lumberjack.png' // älterer, großer Platzhalter
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['lumberjack','holzfaeller','woodcutter','place-lumberjack'])
    },
    'stonecutter': {
      key: 'stonecutter',
      label: 'Steinmetz',
      category: 'resources',
      sprite: firstExisting([
        'assets/buildings/steinmetz_wood.png',
        'assets/tex/building/wood/stonebraker_wood.PNG'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['stonecutter','steinmetz','place-stonecutter'])
    },
    'smith': {
      key: 'smith',
      label: 'Schmied',
      category: 'resources',
      sprite: firstExisting([
        'assets/buildings/schmied_wood0.png'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['smith','schmied','place-smith'])
    },
    'depot': {
      key: 'depot',
      label: 'Depot',
      category: 'resources',
      sprite: firstExisting([
        'assets/buildings/depot_wood.png',
        'assets/depot.png'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['depot','warehousedepot','place-depot'])
    },

    // Militär
    'guardtower': {
      key: 'guardtower',
      label: 'Wachturm',
      category: 'military',
      sprite: firstExisting([
        'assets/buildings/wachturm_wood.png'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['guardtower','wachturm','place-guardtower'])
    },

    // Infrastruktur (Sprites hier i.d.R. nicht als Gebäude, aber Farbe/Kategorie nutzbar)
    'road': {
      key: 'road',
      label: 'Straße',
      category: 'infra',
      sprite: firstExisting([
        'assets/tex/road/topdown_road_straight.png'
      ]),
      size: DEFAULT_SIZE,
      aliases: alias(['road','place-road'])
    },
  };

  // ---------------------------- Hilfsfunktionen ----------------------------
  // Best-effort Sprite-Auswahl (nimmt den ersten Pfad; Verfügbarkeit prüft die Engine
  // zur Laufzeit sowieso – hier nur semantische Reihenfolge/neue Orte zuerst).
  function firstExisting(list) {
    // Wir können hier offline nicht prüfen, ob die Datei existiert.
    // Die Render-Engine zeichnet ohnehin einen Platzhalter, wenn das Bild nicht lädt.
    // Daher genügt die Prioritätenliste als "Wunsch".
    return Array.isArray(list) ? list[0] : list || null;
  }

  // Aliasse „auflösen“ (z.B. "place-house" → "house")
  function normalizeKind(input) {
    if (!input) return null;
    const key = String(input).trim().toLowerCase();
    // Direkter Treffer?
    if (KINDS[key]) return key;
    // Alias-Suche
    for (const k in KINDS) {
      if (KINDS[k].aliases && KINDS[k].aliases.has(key)) return k;
    }
    return null;
  }

  // Öffentliche API: Definition auflösen
  function resolve(kind) {
    const k = normalizeKind(kind);
    if (!k) return null;
    const def = KINDS[k];
    const cat = CATEGORIES[def.category];
    return {
      key: def.key,
      label: def.label,
      category: def.category,
      color: cat?.color || '#94A3B8', // neutrale Slate-Variante
      sprite: def.sprite || null,
      size: def.size || DEFAULT_SIZE,
      aliases: def.aliases ? Array.from(def.aliases) : []
    };
  }

  function color(kindOrCategoryId) {
    // Kategorie-ID direkt?
    if (CATEGORIES[kindOrCategoryId]) return CATEGORIES[kindOrCategoryId].color;
    // Oder via Kind ermitteln
    const r = resolve(kindOrCategoryId);
    return r?.color || '#94A3B8';
  }

  // Optionale Startplatzierung: Rathaus als Dorfzentrum (einheitlicher Key!)
  const DEFAULT_START = ['rathaus'];

  // ------------------------------ Export -----------------------------------
  window.EntitiesRegistry = {
    VERSION: '1.0.0',
    DEFAULT_SIZE,
    CATEGORIES,
    KINDS,
    DEFAULT_START,
    resolve,
    color,
    normalizeKind,
  };

  LOG('bereit v1.0.0 (Kategorien:', Object.keys(CATEGORIES).length, ', Gebäude:', Object.keys(KINDS).length, ')');
})();
