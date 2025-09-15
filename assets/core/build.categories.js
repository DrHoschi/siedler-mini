/* ============================================================================
 * build.categories.js — Kategorien + Items für das Baumenü (Dock)
 * Version: v1.1.0  (15. Sep 2025)
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

  function log(msg){ try{ (window.CBLog?.ok||console.log)(msg); }catch(_){ console.log(msg); } }
  function A(path){ return path || null; }

  // Pfad-Helfer (nur zur Lesbarkeit)
  var B = 'assets/buildings/';
  var R = 'assets/tex/road/';
  var T = 'assets/tex/terrain/';

  /** Kategorien in gewünschter Dock-Reihenfolge */
  var CATS = [
    // 1) Allgemein / Verwaltung
    {
      id: 'general',
      title: 'Allg. / Verwaltung',
      items: [
        { id:'rathaus',  label:'Rathaus',   icon: A(B+'rathaus_wood1.png') },
        { id:'wohnhaus', label:'Wohnhaus',  icon: A(B+'wohnhaus_wood1_ug0.png') },
        { id:'depot',    label:'Depot',     icon: A(B+'depot_wood.png') }
      ]
    },

    // 2) Produktion / Nahrung
    {
      id: 'production_food',
      title: 'Produktion / Nahrung',
      items: [
        { id:'fischer',  label:'Fischer',   icon: A(B+'fischer_wood1.png') },
        { id:'farm',     label:'Farm',      icon: A(B+'farm_wood.png') },
        { id:'muehle',   label:'Mühle',     icon: A(B+'windmuehle_wood.png') },
        { id:'baecker',  label:'Bäckerei',  icon: A(B+'baecker_wood.png') }
      ]
    },

    // 3) Produktion / Rohstoffe
    {
      id: 'production_raw',
      title: 'Produktion / Rohstoffe',
      items: [
        { id:'holzfaeller', label:'Holzfäller', icon: A(B+'lumberjack_wood.png') },
        { id:'steinmetz',   label:'Steinmetz',  icon: A(B+'steinmetz_wood.png') },
        { id:'schmied',     label:'Schmied',    icon: A(B+'schmied_wood0.png') }
      ]
    },

    // 4) Wohnen (zusätzliche Varianten als Reserve)
    {
      id: 'housing',
      title: 'Wohnen',
      items: [
        { id:'haus_i',   label:'Haus I', icon: A(B+'wohnhaus_wood0_ug0.png') },
        { id:'haus_ii',  label:'Haus II',icon: A(B+'wohnhaus_wood1_ug0.png') }
      ]
    },

    // 5) Infrastruktur (Overlay / Wege & Straßen)
    {
      id: 'infrastructure',
      title: 'Infrastruktur',
      items: [
        { id:'road_straight', label:'Straße (gerade)', icon: A(R+'topdown_road_straight.png'), kind:'overlay', todo:true },
        { id:'road_corner',   label:'Straße (Ecke)',   icon: A(R+'topdown_road_corner.png'),   kind:'overlay', todo:true },
        { id:'road_cross',    label:'Straße (Kreuz)',  icon: A(R+'topdown_road_cross.png'),    kind:'overlay', todo:true },
        { id:'road_t',        label:'Straße (T)',      icon: A(R+'topdown_road_t.png'),        kind:'overlay', todo:true }
      ]
    },

    // 6) Deko / Landschaft (Terrain-Platzhalter – ohne Spiel-Logik)
    {
      id: 'decor',
      title: 'Deko / Landschaft',
      items: [
        { id:'terrain_grass',  label:'Gras',     icon: A(T+'topdown_grass.PNG'),  kind:'decor', todo:true },
        { id:'terrain_meadow', label:'Wiese',    icon: A(T+'topdown_meadow.PNG'), kind:'decor', todo:true },
        { id:'terrain_dirt',   label:'Erde',     icon: A(T+'topdown_dirt.PNG'),   kind:'decor', todo:true },
        { id:'terrain_rock',   label:'Fels',     icon: A(T+'topdown_rock.PNG'),   kind:'decor', todo:true },
        { id:'terrain_shore',  label:'Küste',    icon: A(T+'topdown_shore.PNG'),  kind:'decor', todo:true }
      ]
    },

    // 7) Militär (Reserve – 1 Platzhalter)
    {
      id: 'military',
      title: 'Militär',
      items: [
        { id:'wachturm', label:'Wachturm', icon: A(B+'wachturm_wood.png'), todo:true }
      ]
    }
  ];

  // Export + Event
  window.BUILD_CATEGORIES = CATS;
  try{
    window.dispatchEvent(new CustomEvent('cb:build-categories-ready', { detail:{ categories: CATS } }));
  }catch(_){/* IE/alt ign. */}

  var count = CATS.reduce((n,c)=>n+(c.items?c.items.length:0),0);
  log(MOD+' bereit (v1.1.0) — '+CATS.length+' Kategorien / '+count+' Items');
})();
