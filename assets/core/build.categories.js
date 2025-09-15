/* ============================================================================
 * build.categories.js — Kategorien + Items fürs Tabbed-Dock
 * Version: v1.1.0 (robust, registry-kompatibel, mit Platzhaltern)
 * Projekt: Siedler-Mini
 *
 * Zweck
 *  - Strukturierte Liste der Bau-Einträge (Dock-Reihenfolge, Labels, Icons)
 *  - Kompatibel zu bestehender ui-build.data-bridge.js + ui-build.js
 *
 * Globale API
 *   window.BUILD_CATEGORIES : Array<Category>
 *   Category = { id, title, items: Array<Item> }
 *   Item = { id, label, icon, kind?, disabled?, todo? }
 *
 * Events (dispatch)
 *   'cb:build-categories-ready' { detail: { categories } }
 * ========================================================================== */
(function () {
  'use strict';
  var MOD = '[build.categories]';

  // Logging (failsafe)
  function log(m){ try{ (window.CBLog?.ok || console.log)(m); } catch(_) { console.log(m); } }
  function warn(m){ try{ (window.CBLog?.warn || console.warn)(m); } catch(_) { console.warn(m); } }

  // --- Asset-Resolver -------------------------------------------------------
  // Primär: BUILD_ASSETS.building.<id>
  // Fallback: statischer Pfad in assets/buildings/<id>_wood*.png
  // Extra: Terrain/Platzhalter für Deko/Infrastruktur
  var ASSETS = (window.BUILD_ASSETS || { building:{}, ui:{} });

  // Bekannte Bild-Dateien (Fallback), passend zu deiner Repository-Struktur
  var FALLBACK_BUILDING = {
    // Verwaltung
    hq:            'assets/buildings/hq_wood.png',
    rathaus:       'assets/buildings/rathaus_wood1.png',
    depot:         'assets/buildings/depot_wood.png',
    wohnhaus:      'assets/buildings/wohnhaus_wood1_ug0.png',

    // Nahrung
    fischer:       'assets/buildings/fischer_wood1.png',
    farm:          'assets/buildings/farm_wood.png',
    windmuehle:    'assets/buildings/windmuehle_wood.png',
    baecker:       'assets/buildings/baecker_wood.png',

    // Rohstoffe / Produktion
    holzfaeller:   'assets/buildings/lumberjack_wood.png',
    steinmetz:     'assets/buildings/steinmetz_wood.png',
    schmied:       'assets/buildings/schmied_wood0.png',

    // Militär (Platzhalter)
    wachturm:      'assets/buildings/wachturm_wood.png'
  };

  // Kleine Terrain-Platzhalter (für Deko/Infrastruktur)
  var FALLBACK_TERRAIN = {
    grass:  'assets/tex/terrain/sm_topdown_grass0.jpeg',
    meadow: 'assets/tex/terrain/sm_topdown_meadow0_ug0.jpeg',
    dirt:   'assets/tex/terrain/sm_topdown_dirt0.jpeg',
    rock:   'assets/tex/terrain/sm_topdown_rock0_ug0.jpeg',
    shore:  'assets/tex/terrain/sm_topdown_shore.PNG',
    water:  'assets/tex/terrain/sm_topdown_water0_ug0.jpeg'
  };

  // Liefert Icon-URL für ein Gebäude-ID
  function iconFor(id, fallbackKey){
    // 1) per BUILD_ASSETS
    var fromMap = ASSETS.building && (ASSETS.building[id] || ASSETS.building[id.toLowerCase()]);
    if (fromMap) return fromMap;

    // 2) fixer Fallback je ID
    if (FALLBACK_BUILDING[id]) return FALLBACK_BUILDING[id];

    // 3) optional Terrain-Placeholder
    if (fallbackKey && FALLBACK_TERRAIN[fallbackKey]) return FALLBACK_TERRAIN[fallbackKey];

    // 4) ultima ratio: UI-Placeholder (falls vorhanden)
    return (ASSETS.ui && ASSETS.ui.placeholder64) || 'assets/placeholder64.PNG';
  }

  // Hilfsfunktion: baue Item
  function B(id, label, opts){
    opts = opts || {};
    return {
      id: id,
      label: label,
      icon: opts.icon || iconFor(id, opts.fallbackKey),
      kind: opts.kind,             // 'overlay' | 'decor' | undefined
      disabled: !!opts.disabled,   // true => ausgegraut
      todo: !!opts.todo            // true => markiert als TODO
    };
  }

  // --- Kategorien in Dock-Reihenfolge --------------------------------------
  var CATS = [
    {
      id: 'general',
      title: 'Allg. / Verwaltung',
      items: [
        B('rathaus',  'Rathaus'),
        B('wohnhaus', 'Wohnhaus'),
        B('depot',    'Depot')
        // Optional: HQ zeigen?
        // B('hq',       'Hauptquartier')
      ]
    },
    {
      id: 'production_food',
      title: 'Produktion / Nahrung',
      items: [
        B('fischer',    'Fischer'),
        B('farm',       'Farm'),
        B('windmuehle', 'Mühle'),
        B('baecker',    'Bäckerei')
      ]
    },
    {
      id: 'production_raw',
      title: 'Produktion / Rohstoffe',
      items: [
        B('holzfaeller', 'Holzfäller'),
        B('steinmetz',   'Steinmetz'),
        B('schmied',     'Schmied')
      ]
    },
    {
      id: 'housing',
      title: 'Wohnen',
      items: [
        // weitere Stufen vorbereitet (IDs kompatibel zu deiner Struktur)
        B('wohnhaus', 'Wohnhaus I'),
        // Falls du später mehrere Varianten mappen willst:
        // B('wohnhaus2','Wohnhaus II', { icon: 'assets/buildings/wohnhaus_wood0_ug0.png', disabled:true, todo:true })
      ]
    },
    {
      id: 'infrastructure',
      title: 'Infrastruktur',
      items: [
        // Platzhalter, später durch echte Overlays ersetzen (Straßen/Wege)
        B('road_stone', 'Straße',       { kind:'overlay', todo:true, icon: FALLBACK_TERRAIN.dirt }),
        B('path_trail', 'Trampelpfad',  { kind:'overlay', todo:true, icon: FALLBACK_TERRAIN.meadow })
      ]
    },
    {
      id: 'decor',
      title: 'Deko / Landschaft',
      items: [
        B('tree_pine',  'Baum (Nadel)', { kind:'decor',  todo:true, icon: FALLBACK_TERRAIN.meadow }),
        B('tree_oak',   'Baum (Laub)',  { kind:'decor',  todo:true, icon: FALLBACK_TERRAIN.grass }),
        B('rock_small', 'Felsen',       { kind:'decor',  todo:true, icon: FALLBACK_TERRAIN.rock }),
        B('shore_tile', 'Strand',       { kind:'decor',  todo:true, icon: FALLBACK_TERRAIN.shore }),
        B('water_tile', 'Wasser',       { kind:'decor',  todo:true, icon: FALLBACK_TERRAIN.water })
      ]
    },
    {
      id: 'military',
      title: 'Militär',
      items: [
        B('wachturm', 'Wachturm', { todo:true }) // Platzhalter-Asset vorhanden
      ]
    }
  ];

  // --- Export + Event -------------------------------------------------------
  try {
    window.BUILD_CATEGORIES = CATS;
    window.dispatchEvent(new CustomEvent('cb:build-categories-ready', { detail:{ categories: CATS } }));
    log(MOD + ' bereit (v1.1.0) — ' + CATS.length + ' Kategorien');
  } catch (e) {
    warn(MOD + ' Export-Problem: ' + (e && e.message));
    window.BUILD_CATEGORIES = CATS; // Fallback dennoch setzen
  }
})();
