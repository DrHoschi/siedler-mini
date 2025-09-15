/* ============================================================================
 * assets/core/build.categories.js — Kategorien + Items fürs Tabbed-Dock
 * Version: v1.1.0 (komplett, robust, kommentiert)
 * Projekt: Neue Siedler / Siedler-Mini
 *
 * Zweck
 *  - Strukturierte Liste der Bau-Einträge (Dock-Reihenfolge, Labels, Icons)
 *  - Kompatibel zur bestehenden ui-build.js + ui-build.data-bridge.js
 *  - Enthält Platzhalter (Infra/Deko/Militär) gemäß Lastenheft
 *
 * Globale API
 *   window.BUILD_CATEGORIES : Array<Category>
 *   Category = { id, title, items: Array<Item> }
 *   Item = { id, label, icon, kind? ("overlay"|"decor"), todo? (bool) }
 *
 * Events (dispatch)
 *   'cb:build-categories-ready' { detail: { categories } }
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[build.categories]';

  // ---------- Logging-Helfer ----------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){ console.log(m);} }
  function info(m){ try{ (window.CBLog?.info||console.log)(m);}catch(_){ console.log(m);} }

  // ---------- Asset-Resolver ----------
  // Verwendet deine echten Dateien (siehe filelist)
  // Fällt auf Marker/Null zurück, wenn etwas fehlt – dann siehst du die Karte trotzdem.
  var ASSETS = window.BUILD_ASSETS || {
    ui: { buildMarker: 'assets/placeholder64.PNG' }, // generischer Fallback
    building: {
      // Verwaltung / Wohnen / Produktion (deine Pfade)
      rathaus:      'assets/buildings/rathaus_wood1.png',
      wohnhaus1:    'assets/buildings/wohnhaus_wood1_ug0.png',
      wohnhaus0:    'assets/buildings/wohnhaus_wood0_ug0.png',
      depot:        'assets/buildings/depot_wood.png',
      hq:           'assets/buildings/hq_wood.png',

      fischer:      'assets/buildings/fischer_wood1.png',
      farm:         'assets/buildings/farm_wood.png',
      windmuehle:   'assets/buildings/windmuehle_wood.png',
      baeckerei:    'assets/buildings/baecker_wood.png',

      lumberjack:   'assets/buildings/lumberjack_wood.png', // Holzfäller
      steinmetz:    'assets/buildings/steinmetz_wood.png',
      schmied:      'assets/buildings/schmied_wood0.png',

      wachturm:     'assets/buildings/wachturm_wood.png'
    },
    terrain: {
      grass:  'assets/tex/terrain/topdown_meadow.PNG',
      dirt:   'assets/tex/terrain/topdown_dirt.PNG',
      rock:   'assets/tex/terrain/topdown_rock.PNG',
      shore:  'assets/tex/terrain/topdown_shore.PNG',
      water:  'assets/tex/terrain/sm_topdown_water0_ug0.jpeg'
    },
    road: {
      straight: 'assets/tex/road/topdown_road_straight.png',
      corner:   'assets/tex/road/topdown_road_corner.png',
      cross:    'assets/tex/road/topdown_road_cross.png',
      tee:      'assets/tex/road/topdown_road_t.png'
    },
    path: {
      trail: 'assets/tex/path/topdown_path0.PNG'
    }
  };

  function A(path, fallback){
    try{
      if (path) return path;
      return fallback || (ASSETS.ui?.buildMarker) || null;
    }catch(_){
      return fallback || (ASSETS.ui?.buildMarker) || null;
    }
  }

  // ---------- Kategorien (Dock-Reihenfolge) ----------
  // Entspricht deinem Screenshot / Mockup:
  // 1) Allg. / Verwaltung  2) Produktion / Nahrung  3) Produktion / Rohstoffe
  // 4) Wohnen              5) Infrastruktur         6) Deko / Landschaft
  // 7) Militär
  var CATS = [
    {
      id: 'general',
      title: 'Allg. / Verwaltung',
      items: [
        { id:'rathaus', label:'Rathaus',   icon: A(ASSETS.building.rathaus) },
        { id:'wohnhaus',label:'Wohnhaus',  icon: A(ASSETS.building.wohnhaus1 || ASSETS.building.wohnhaus0) },
        { id:'depot',   label:'Depot',     icon: A(ASSETS.building.depot) }
      ]
    },
    {
      id: 'production_food',
      title: 'Produktion / Nahrung',
      items: [
        { id:'fischer',    label:'Fischer',     icon: A(ASSETS.building.fischer) },
        { id:'farm',       label:'Farm',        icon: A(ASSETS.building.farm) },
        { id:'muehle',     label:'Mühle',       icon: A(ASSETS.building.windmuehle) },
        { id:'baeckerei',  label:'Bäckerei',    icon: A(ASSETS.building.baeckerei) }
      ]
    },
    {
      id: 'production_raw',
      title: 'Produktion / Rohstoffe',
      items: [
        { id:'lumberjack', label:'Holzfäller',  icon: A(ASSETS.building.lumberjack) },
        { id:'steinmetz',  label:'Steinmetz',   icon: A(ASSETS.building.steinmetz) },
        { id:'schmied',    label:'Schmied',     icon: A(ASSETS.building.schmied) }
      ]
    },
    {
      id: 'housing',
      title: 'Wohnen',
      items: [
        { id:'haus_i',     label:'Haus I',      icon: A(ASSETS.building.wohnhaus0) },
        { id:'haus_ii',    label:'Haus II',     icon: A(ASSETS.building.wohnhaus1) }
      ]
    },
    {
      id: 'infrastructure',
      title: 'Infrastruktur',
      items: [
        { id:'road_straight', label:'Straße (gerade)', icon: A(ASSETS.road.straight), kind:'overlay', todo:true },
        { id:'road_corner',   label:'Straße (Ecke)',   icon: A(ASSETS.road.corner),   kind:'overlay', todo:true },
        { id:'road_cross',    label:'Kreuzung',        icon: A(ASSETS.road.cross),    kind:'overlay', todo:true },
        { id:'road_t',        label:'T-Kreuzung',      icon: A(ASSETS.road.tee),      kind:'overlay', todo:true },
        { id:'path_trail',    label:'Trampelpfad',     icon: A(ASSETS.path.trail),    kind:'overlay', todo:true }
      ]
    },
    {
      id: 'decor',
      title: 'Deko / Landschaft',
      items: [
        { id:'tile_grass', label:'Wiese',   icon: A(ASSETS.terrain.grass), kind:'decor', todo:true },
        { id:'tile_dirt',  label:'Erde',    icon: A(ASSETS.terrain.dirt),  kind:'decor', todo:true },
        { id:'tile_rock',  label:'Fels',    icon: A(ASSETS.terrain.rock),  kind:'decor', todo:true },
        { id:'tile_shore', label:'Strand',  icon: A(ASSETS.terrain.shore), kind:'decor', todo:true },
        { id:'tile_water', label:'Wasser',  icon: A(ASSETS.terrain.water), kind:'decor', todo:true }
      ]
    },
    {
      id: 'military',
      title: 'Militär',
      items: [
        { id:'wachturm', label:'Wachturm', icon: A(ASSETS.building.wachturm), todo:true }
      ]
    }
  ];

  // ---------- Export + Event ----------
  window.BUILD_CATEGORIES = CATS;
  try{
    window.dispatchEvent(new CustomEvent('cb:build-categories-ready', { detail:{ categories: CATS } }));
  }catch(_){}

  ok(MOD+' bereit (v1.1.0) — '+CATS.length+' Kategorien, '+CATS.reduce((n,c)=>n+c.items.length,0)+' Items');
})();
