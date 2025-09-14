/* ============================================================================
 * Datei: assets/core/entities.registry.js
 * Version: v1.1.0
 *
 * Zweck:
 *  - Zentrale Registry ("Single Source of Truth") für Gebäude/Kategorien
 *  - Nutzt NUR vorhandene Assets (laut aktueller filelist)
 *  - Liefert Engine+UI dieselben Daten (BuildCatalog Export für ui-build)
 *  - Keine Rot/Grün-Farben (für Platzierbarkeit reserviert)
 *
 * Öffentliche API:
 *   window.EntitiesRegistry.version
 *   window.EntitiesRegistry.categories  : Map<String, Category>
 *   window.EntitiesRegistry.buildings   : Map<String, Building>
 *   window.EntitiesRegistry.get(id)     : Building | null
 *   window.EntitiesRegistry.list()      : Building[]
 *   window.EntitiesRegistry.listByCategory(catId) : Building[]
 *   window.EntitiesRegistry.colorFor(catId)       : string (rgba)
 *   window.EntitiesRegistry.resolveSprite(id)     : string (URL)
 *   window.EntitiesRegistry.resolveMenuThumb(id)  : string (URL)
 *   window.EntitiesRegistry.hasSprite(id)         : boolean
 *
 * Zusätzlich für das Baumenü (ui-build):
 *   window.BuildCatalog = {
 *     version,
 *     categories: [{ id, label, color }],
 *     items:      [{ id, label, category, icon }]
 *   }
 *   → feuert 'cb:entities.registry:ready'
 * ============================================================================ */

(() => {
  'use strict';

  const TAG  = '[entities.registry]';
  const LOG  = (...a) => (window.CBLog?.ok   || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn || console.warn)(TAG, ...a);

  // ---- Gemeinsame Defaults -----------------------------------------------
  const PLACEHOLDER_ICON = 'assets/placeholder64.PNG';        // existiert
  const TILE              = 64;

  // Farben (bewusst KEIN Rot/Grün; die bleiben für Platzierbarkeit)
  const CATEGORY_COLORS = {
    admin     : 'rgba( 50,  90, 200, 0.75)', // Blau
    housing   : 'rgba(120,  70, 200, 0.75)', // Violett
    food      : 'rgba(220, 170,  30, 0.75)', // Gold
    resource  : 'rgba( 20, 140, 160, 0.75)', // Türkis
    military  : 'rgba(180, 100,  40, 0.75)', // Bronze
    processing: 'rgba(140, 110,  40, 0.75)', // Ocker
    misc      : 'rgba(110, 110, 110, 0.75)', // Grau
  };

  // ---- Kategorien ---------------------------------------------------------
  const CATEGORIES = [
    { id: 'admin',      label: 'Allg. / Verwaltung', color: CATEGORY_COLORS.admin },
    { id: 'food',       label: 'Produktion / Nahrung', color: CATEGORY_COLORS.food },
    { id: 'resource',   label: 'Produktion / Rohstoffe', color: CATEGORY_COLORS.resource },
    { id: 'processing', label: 'Weiterverarbeitung', color: CATEGORY_COLORS.processing },
    { id: 'housing',    label: 'Wohnen', color: CATEGORY_COLORS.housing },
    { id: 'military',   label: 'Militär', color: CATEGORY_COLORS.military },
    // { id: 'misc',    label: 'Sonstiges', color: CATEGORY_COLORS.misc },
  ];

  // Hilfsmap für schnellen Zugriff
  const CAT_MAP = new Map(CATEGORIES.map(c => [c.id, c]));

  // ---- Gebäude (auf Basis DEINER aktuellen Dateien) ----------------------
  // Alle Pfade sind klein geschrieben & unter assets/buildings/,
  // außer HQ – das liegt (noch) unter assets/tex/building/wood/hq_wood.PNG.
  const BUILDINGS_RAW = [
    // Verwaltung
    {
      id: 'rathaus',
      label: 'Rathaus',
      category: 'admin',
      sprite: 'assets/buildings/rathaus_wood1.png',
      thumb : 'assets/buildings/rathaus_wood1.png',
      w: TILE, h: TILE, anchor: 'center'
    },
    { id: 'depot', label: 'Depot', category: 'admin',
      sprite: 'assets/buildings/depot_wood.png',
      thumb : 'assets/buildings/depot_wood.png',
      w: TILE, h: TILE, anchor: 'center'
    },

    // Wohnen
    { id: 'house', label: 'Wohnhaus', category: 'housing',
      sprite: 'assets/buildings/wohnhaus_wood0_ug0.png',
      thumb : 'assets/buildings/wohnhaus_wood0_ug0.png',
      w: TILE, h: TILE, anchor: 'center'
    },

    // Nahrung
    { id: 'farm', label: 'Farm', category: 'food',
      sprite: 'assets/buildings/farm_wood.png',
      thumb : 'assets/buildings/farm_wood.png',
      w: TILE, h: TILE, anchor: 'center'
    },
    { id: 'fischer', label: 'Fischer', category: 'food',
      sprite: 'assets/buildings/fischer_wood1.png',
      thumb : 'assets/buildings/fischer_wood1.png',
      w: TILE, h: TILE, anchor: 'center'
    },
    { id: 'baecker', label: 'Bäcker', category: 'processing',
      sprite: 'assets/buildings/baecker_wood.png',
      thumb : 'assets/buildings/baecker_wood.png',
      w: TILE, h: TILE, anchor: 'center'
    },
    { id: 'windmuehle', label: 'Mühle', category: 'processing',
      sprite: 'assets/buildings/windmuehle_wood.png',
      thumb : 'assets/buildings/windmuehle_wood.png',
      w: TILE, h: TILE, anchor: 'center'
    },

    // Rohstoffe
    { id: 'lumberjack', label: 'Holzfäller', category: 'resource',
      sprite: 'assets/buildings/lumberjack_wood.png',
      thumb : 'assets/buildings/lumberjack_wood.png',
      w: TILE, h: TILE, anchor: 'center'
    },
    { id: 'steinmetz', label: 'Steinmetz', category: 'resource',
      sprite: 'assets/buildings/steinmetz_wood.png',
      thumb : 'assets/buildings/steinmetz_wood.png',
      w: TILE, h: TILE, anchor: 'center'
    },
    { id: 'schmied', label: 'Schmied', category: 'resource',
      sprite: 'assets/buildings/schmied_wood0.png',
      thumb : 'assets/buildings/schmied_wood0.png',
      w: TILE, h: TILE, anchor: 'center'
    },

    // Militär
    { id: 'wachturm', label: 'Wachturm', category: 'military',
      sprite: 'assets/buildings/wachturm_wood.png',
      thumb : 'assets/buildings/wachturm_wood.png',
      w: TILE, h: TILE, anchor: 'center'
    },
    // HQ liegt (noch) NICHT im buildings-Ordner – Pfad beibehalten:
    { id: 'hq', label: 'Hauptquartier', category: 'military',
      sprite: 'assets/tex/building/wood/hq_wood.PNG', // existiert bei dir
      thumb : 'assets/placeholder64.PNG',             // neutrales Icon
      w: TILE, h: TILE, anchor: 'center'
    },
  ];

  // Aliase (optionale Kurzschreibweisen aus UI/Inspector)
  const ALIASES = new Map([
    ['wohnhaus', 'house'],
    ['fisher',   'fischer'],
    ['bakery',   'baecker'],
    ['muehle',   'windmuehle'],
    ['hq_stone', 'hq'],
  ]);

  // Vollständige Normalisierung + Maps
  const BUILDING_MAP = new Map();
  for (const b of BUILDINGS_RAW) {
    const norm = { ...b };
    // Fallbacks
    if (!norm.thumb)  norm.thumb  = PLACEHOLDER_ICON;
    if (!norm.sprite) norm.sprite = PLACEHOLDER_ICON;
    if (!norm.w) norm.w = TILE;
    if (!norm.h) norm.h = TILE;
    if (!norm.anchor) norm.anchor = 'center';

    BUILDING_MAP.set(norm.id, norm);
  }

  // ---- API ----------------------------------------------------------------
  const API = {
    version: '1.1.0',
    categories: CAT_MAP,
    buildings : BUILDING_MAP,

    get(id) {
      if (!id) return null;
      const real = ALIASES.get(id) || id;
      return BUILDING_MAP.get(real) || null;
    },

    list() {
      return Array.from(BUILDING_MAP.values());
    },

    listByCategory(catId) {
      const realCat = CAT_MAP.get(catId)?.id || catId;
      return API.list().filter(b => b.category === realCat);
    },

    colorFor(catId) {
      return (CAT_MAP.get(catId)?.color) || CATEGORY_COLORS.misc;
    },

    resolveSprite(id) {
      const b = API.get(id);
      return b?.sprite || PLACEHOLDER_ICON;
    },

    resolveMenuThumb(id) {
      const b = API.get(id);
      return b?.thumb || PLACEHOLDER_ICON;
    },

    hasSprite(id) {
      const url = API.resolveSprite(id);
      return !!url && url !== PLACEHOLDER_ICON;
    }
  };

  // ---- Exporte ------------------------------------------------------------
  window.EntitiesRegistry = API;

  // Export für das Baumenü (ui-build erwartet Kategorien + Items mit icon)
  window.BuildCatalog = {
    version: API.version,
    categories: CATEGORIES.map(c => ({ id: c.id, label: c.label, color: c.color })),
    items: API.list().map(b => ({
      id: b.id,
      label: b.label,
      category: b.category,
      icon: API.resolveMenuThumb(b.id)
    })),
  };

  // Signal für abhängige Module
  window.dispatchEvent(new CustomEvent('cb:entities.registry:ready', {
    detail: { version: API.version, count: API.list().length }
  }));

  LOG(`bereit v${API.version} (Kategorien: ${CATEGORIES.length} , Gebäude: ${API.list().length} )`);
})();
