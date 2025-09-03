/* ============================================================================
 * build.categories.js — Kategorien + Items fürs Tabbed-Dock
 * Version: v1.0.0
 * Projekt: Siedler-Mini
 *
 * Zweck
 *  - Strukturierte Liste der Bau-Einträge (Dock-Reihenfolge, Labels, Icons)
 *  - Kompatibel zu bestehender ui-build.js (kein ES-Module erforderlich)
 *
 * API (global)
 *   window.BUILD_CATEGORIES : Array<Category>
 *   Category = { id, title, items: Array<Item> }
 *   Item = { id, label, icon, kind?, todo? }
 *
 * Events (dispatch)
 *   'cb:build-categories-ready' { detail: { categories } }
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[build.categories]';

  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){ console.log(m);} }
  function A(path, fallback){ // Asset-Resolver
    try{
      if (!path) return fallback || (window.BUILD_ASSETS?.ui?.buildMarker) || null;
      return path;
    }catch(_){
      return fallback || (window.BUILD_ASSETS?.ui?.buildMarker) || null;
    }
  }

  var ASSETS = (window.BUILD_ASSETS || { ui:{}, building:{} });

  /** Kategorien in Dock-Reihenfolge */
  var CATS = [
    {
      id: 'general',
      title: 'Allg.',
      items: [
        { id:'hq',      label:'Hauptquartier', icon: A(ASSETS.building.hq) },
        { id:'rathaus', label:'Rathaus',       icon: A(null), todo:true },
        { id:'depot',   label:'Depot',         icon: A(ASSETS.building.depot) }
      ]
    },
    {
      id: 'production_food',
      title: 'Produktion',
      items: [
        { id:'farm',         label:'Farm',         icon: A(ASSETS.building.farm) },
        { id:'fischer',      label:'Fischer',      icon: A(ASSETS.building.fischer) },
        { id:'wassermuehle', label:'Wassermühle',  icon: A(ASSETS.building.wassermuehle) },
        { id:'windmuehle',   label:'Windmühle',    icon: A(ASSETS.building.windmuehle) },
        { id:'baeckerei',    label:'Bäckerei',     icon: A(ASSETS.building.baeckerei) },
        { id:'lumberjack',   label:'Holzfäller',   icon: A(ASSETS.building.lumberjack) },
        { id:'stonebraker',  label:'Steinbruch',   icon: A(ASSETS.building.stonebraker) }
      ]
    },
    {
      id: 'housing',
      title: 'Wohnen',
      items: [
        { id:'haeuser1', label:'Haus I',  icon: A(ASSETS.building.haeuser1) },
        { id:'haeuser2', label:'Haus II', icon: A(ASSETS.building.haeuser2) }
      ]
    },
    {
      id: 'infrastructure',
      title: 'Infrastruktur',
      items: [
        { id:'road_stone',  label:'Straße',       icon: A(null), kind:'overlay', todo:true },
        { id:'path_trail',  label:'Trampelpfad',  icon: A(null), kind:'overlay', todo:true }
      ]
    },
    {
      id: 'decor',
      title: 'Deko / Landschaft',
      items: [
        { id:'tree_oak',       label:'Baum (Eiche)',  icon: A(null), kind:'decor', todo:true },
        { id:'tree_pine',      label:'Baum (Kiefer)', icon: A(null), kind:'decor', todo:true },
        { id:'rock_small',     label:'Felsen',        icon: A(null), kind:'decor', todo:true },
        { id:'bush',           label:'Busch',         icon: A(null), kind:'decor', todo:true },
        { id:'fence_wood',     label:'Holzzaun',      icon: A(null), kind:'decor', todo:true },
        { id:'field_farmland', label:'Acker/Feld',    icon: A(null), kind:'decor', todo:true }
      ]
    },
    {
      id: 'military',
      title: 'Militär',
      items: [
        { id:'turm', label:'Turm', icon: A(null), todo:true }
      ]
    }
  ];

  // Global exportieren
  window.BUILD_CATEGORIES = CATS;

  // Für UI signalisieren, dass Kategorien verfügbar sind
  try{
    window.dispatchEvent(new CustomEvent('cb:build-categories-ready', { detail:{ categories: CATS } }));
  }catch(_){}

  ok(MOD+' bereit (v1.0.0) — '+CATS.length+' Kategorien');
})();
