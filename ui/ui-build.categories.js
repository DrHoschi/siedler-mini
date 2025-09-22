/* ============================================================================
 * Datei: main/ui/ui-build.categories.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Datenquelle für das Build-Dock (Kategorien & Items) – keine DOM-Logik!
 * Datum: 2025-09-22
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Events: dispatch 'cb:build-categories-ready' { categories }
 * ============================================================================ */

(function(){
  'use strict';
  const MOD='[build.categories]';
  const VERSION='v1.0.0';

  // Beispiel-Kategorien Epoche 1
  const CATS = [
    { id:'core', title:'Kern', items:[
      { id:'hq', label:'HQ (Holz)', icon:'icons/build/hq.png' }
    ]},
    { id:'eco', title:'Wirtschaft', items:[
      { id:'lumberjack', label:'Holzfällerhütte', icon:'icons/build/lumberjack.png' },
      { id:'fisher', label:'Fischerhütte', icon:'icons/build/fisher.png' },
      { id:'quarry', label:'Steinbruch', icon:'icons/build/quarry.png' }
    ]}
  ];

  window.BUILD_CATEGORIES = CATS;
  window.dispatchEvent(new CustomEvent('cb:build-categories-ready', { detail: { categories: CATS, version: VERSION } }));
  (console.log||(()=>{}))('🧩', MOD, 'bereit', VERSION);
})();