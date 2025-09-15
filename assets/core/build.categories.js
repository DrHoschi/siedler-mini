/* ============================================================================
 * assets/core/build.categories.js
 * Version: v1.1.1 (Siedler-Mini)
 *
 * Liefert strukturierte Kategorien + Items fürs Bau-Dock.
 * Kompatibel mit ui-build.js + ui-build.data-bridge.js
 * - Export: window.BUILD_CATEGORIES
 * - Event:  'cb:build-categories-ready' { detail:{ categories } }
 * ========================================================================== */
(function () {
  'use strict';
  var MOD = '[build.categories]';

  // --- Logging helper (kein Hard-Fail wenn CBLog fehlt)
  function info(msg){ try{ (window.CBLog?.info||console.log)(msg);}catch(_){ console.log(msg); } }

  // --- Pfad-Helper: nimmt 1:1 die Assets aus deiner Repo-Struktur
  function B(name){ return 'assets/buildings/' + name; }
  function T(name){ return 'assets/tex/terrain/' + name; }
  function R(name){ return 'assets/tex/road/' + name; }

  // --- Kategorien in Dock-Reihenfolge
  //    Titel = sichtbarer Überschrifts-Text
  //    id    = stabile technische ID
  //    items = { id, label, icon, kind? }
  var CATS = [
    // 1) Allgemein / Verwaltung
    {
      id: 'general',
      title: 'Allg. / Verwaltung',
      items: [
        { id:'rathaus',  label:'Rathaus',   icon:B('rathaus_wood1.png') },
        { id:'wohnhaus', label:'Wohnhaus',  icon:B('wohnhaus_wood1_ug0.png') },
        { id:'depot',    label:'Depot',     icon:B('depot_wood.png') }
      ]
    },

    // 2) Produktion / Nahrung
    {
      id: 'production_food',
      title: 'Produktion / Nahrung',
      items: [
        { id:'fischer',    label:'Fischer',    icon:B('fischer_wood1.png') },
        { id:'farm',       label:'Farm',       icon:B('farm_wood.png') },
        { id:'muehle',     label:'Mühle',      icon:B('windmuehle_wood.png') },
        { id:'baeckerei',  label:'Bäckerei',   icon:B('baecker_wood.png') }
      ]
    },

    // 3) Produktion / Rohstoffe
    {
      id: 'production_raw',
      title: 'Produktion / Rohstoffe',
      items: [
        { id:'holzfaeller', label:'Holzfäller', icon:B('lumberjack_wood.png') },
        { id:'steinmetz',   label:'Steinmetz',  icon:B('steinmetz_wood.png') },
        { id:'schmied',     label:'Schmied',    icon:B('schmied_wood0.png') }
      ]
    },

    // 4) Wohnen
    {
      id: 'housing',
      title: 'Wohnen',
      items: [
        { id:'wohnhaus_klein', label:'Wohnhaus (klein)', icon:B('wohnhaus_wood0_ug0.png') },
        { id:'wohnhaus',       label:'Wohnhaus',         icon:B('wohnhaus_wood1_ug0.png') }
      ]
    },

    // 5) Infrastruktur
    {
      id: 'infrastructure',
      title: 'Infrastruktur',
      items: [
        // Roads als Overlay/Tools – Icons aus /assets/tex/road/
        { id:'road_straight', label:'Straße (gerade)',    icon:R('topdown_road_straight.png'), kind:'overlay' },
        { id:'road_corner',   label:'Straße (Kurve)',     icon:R('topdown_road_corner.png'),   kind:'overlay' },
        { id:'road_t',        label:'Straße (T-Kreuzung)',icon:R('topdown_road_t.png'),        kind:'overlay' },
        { id:'road_cross',    label:'Straße (Kreuzung)',  icon:R('topdown_road_cross.png'),    kind:'overlay' },

        // Pfad/Platzhalter (kann später zu Tool werden)
        { id:'weg',           label:'Weg/Trampelpfad',    icon:T('sm_topdown_meadow0_ug0.jpeg'), kind:'overlay' }
      ]
    },

    // 6) Deko / Landschaft
    {
      id: 'decor',
      title: 'Deko / Landschaft',
      items: [
        { id:'wiese',    label:'Wiese',     icon:T('topdown_meadow.PNG'),            kind:'terrain' },
        { id:'erde',     label:'Erde',      icon:T('topdown_dirt.PNG'),              kind:'terrain' },
        { id:'fels',     label:'Fels',      icon:T('topdown_rock.PNG'),              kind:'terrain' },
        { id:'strand',   label:'Strand',    icon:T('topdown_shore.PNG'),             kind:'terrain' },
        { id:'wasser',   label:'Wasser',    icon:T('sm_topdown_water0_ug0.jpeg'),    kind:'terrain' },
        { id:'nadelwald',label:'Nadelwald', icon:T('sm_topdown_tree_needle0_ug0.PNG'),kind:'terrain' }
      ]
    },

    // 7) Militär
    {
      id: 'military',
      title: 'Militär',
      items: [
        { id:'wachturm', label:'Wachturm', icon:B('wachturm_wood.png') }
      ]
    }
  ];

  // --- global exportieren
  window.BUILD_CATEGORIES = CATS;

  // --- Event senden (damit ui-build.data-bridge sofort Daten hat)
  try {
    var ev = new CustomEvent('cb:build-categories-ready', { detail:{ categories: CATS } });
    window.dispatchEvent(ev);
  } catch(_) { /* IE11 not needed */ }

  info(MOD + ' bereit (v1.1.1) — ' + CATS.length + ' Kategorien / ' +
       CATS.reduce((n,c)=>n+(c.items?.length||0),0) + ' Items');
})();
