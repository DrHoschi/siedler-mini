/* ============================================================================
 * Datei: assets/core/entities.registry.js
 * Version: v1.2.0
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Zentrale Registry ("Single Source of Truth") für alle Entities/Gebäude
 *  - Einheitliche Definition von Kategorien, Farben und Sprite-Pfaden
 *  - Wird von Engine (core.entities.js) und UI (ui-build.js) genutzt
 *
 * Struktur:
 *  1. Konstanten / Hilfsfunktionen
 *  2. Kategorien
 *  3. Gebäude-Definitionen
 *  4. Exports (window.EntitiesRegistry)
 * ============================================================================
 */
(() => {
  'use strict';

  const TAG  = '[entities.registry]';
  const LOG  = (...a) => console.log(TAG, ...a);

  // --------------------------------------------------------------------------
  // 1. Kategorien (Farben = Platzhalterfarben im Build-Modus)
  // --------------------------------------------------------------------------
  const categories = {
    center:   { id: 'center',   name: 'Zentrum',      color: '#FFD700' }, // Gold = zentrale Gebäude (Rathaus)
    storage:  { id: 'storage',  name: 'Lager',        color: '#8B4513' }, // Braun = Lager/Depot
    food:     { id: 'food',     name: 'Nahrung',      color: '#FF6347' }, // Rot = Nahrung/Farm/Fischer
    resource: { id: 'resource', name: 'Ressourcen',   color: '#4682B4' }, // Blau = Holz/Stein/Bergbau
    military: { id: 'military', name: 'Militär',      color: '#708090' }, // Grau = Wachturm/HQ
    refine:   { id: 'refine',   name: 'Veredelung',   color: '#32CD32' }  // Grün = Schmied/Windmühle etc.
  };

  // --------------------------------------------------------------------------
  // 2. Gebäude (Sprite-Pfade nach filelist.txt abgeglichen)
  // --------------------------------------------------------------------------
  const buildings = {
    rathaus: {
      id: 'rathaus',
      name: 'Rathaus',
      category: 'center',
      sprite: 'assets/buildings/rathaus_wood1.png'
    },
    depot: {
      id: 'depot',
      name: 'Depot',
      category: 'storage',
      sprite: 'assets/buildings/depot_wood.png'
    },
    farm: {
      id: 'farm',
      name: 'Bauernhof',
      category: 'food',
      sprite: 'assets/buildings/farm_wood.png'
    },
    fischer: {
      id: 'fischer',
      name: 'Fischerhütte',
      category: 'food',
      sprite: 'assets/buildings/fischer_wood1.png'
    },
    baecker: {
      id: 'baecker',
      name: 'Bäckerei',
      category: 'refine',
      sprite: 'assets/buildings/baecker_wood.png'
    },
    lumberjack: {
      id: 'lumberjack',
      name: 'Holzfällerhütte',
      category: 'resource',
      sprite: 'assets/buildings/lumberjack_wood.png'
    },
    steinmetz: {
      id: 'steinmetz',
      name: 'Steinmetz',
      category: 'resource',
      sprite: 'assets/buildings/steinmetz_wood.png'
    },
    schmied: {
      id: 'schmied',
      name: 'Schmiede',
      category: 'refine',
      sprite: 'assets/buildings/schmied_wood0.png'
    },
    windmuehle: {
      id: 'windmuehle',
      name: 'Windmühle',
      category: 'refine',
      sprite: 'assets/buildings/windmuehle_wood.png'
    },
    wohnhaus: {
      id: 'wohnhaus',
      name: 'Wohnhaus',
      category: 'center',
      sprite: 'assets/buildings/wohnhaus_wood0_ug0.png'
    },
    wachturm: {
      id: 'wachturm',
      name: 'Wachturm',
      category: 'military',
      sprite: 'assets/buildings/wachturm_wood.png'
    },
    hq: {
      id: 'hq',
      name: 'Hauptquartier',
      category: 'military',
      sprite: 'assets/buildings/hq_wood.png'
    }
  };

  // --------------------------------------------------------------------------
  // 3. Registry Objekt
  // --------------------------------------------------------------------------
  const registry = {
    version: 'v1.2.0',
    categories,
    buildings,
    getCategory: (id) => categories[id] || null,
    getBuilding: (id) => buildings[id] || null,
    listCategories: () => Object.values(categories),
    listBuildings: () => Object.values(buildings)
  };

  // --------------------------------------------------------------------------
  // 4. Export
  // --------------------------------------------------------------------------
  window.EntitiesRegistry = registry;
  LOG(`bereit ${registry.version} (Kategorien: ${Object.keys(categories).length} , Gebäude: ${Object.keys(buildings).length} )`);
})();
