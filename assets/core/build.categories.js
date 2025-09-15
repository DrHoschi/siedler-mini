/* ============================================================================
 * build.categories.js — Kategorien + Items fürs Tabbed-Dock (Registry-Ready)
 * Version: v17.0.0-rc1
 * Projekt: Siedler-Mini
 *
 * ZWECK
 *  - Stellt window.BUILD_CATEGORIES bereit (kompatibel zu bestehender ui-build.js)
 *  - Holt Daten primär aus der Registry (Registry-Patch), sonst statischer Fallback
 *  - Dispatcht 'cb:build-categories-ready' mit { detail: { categories } }
 *
 * API (global)
 *   window.BUILD_CATEGORIES : Array<Category>
 *   Category = { id, title, order?, items: Array<Item> }
 *   Item = { id, label, icon, kind?, order?, todo? }
 *
 * EVENTS (dispatch)
 *   'cb:build-categories-ready' { detail: { categories } }
 *
 * HINWEIS
 *  - KEIN ES-Module (global/IIFE), damit bestehende Einbindung erhalten bleibt.
 *  - Debug/Inspector bleibt unberührt (nur Logs; keine Features entfernt).
 * ========================================================================== */
(function(){
  'use strict';
  var MOD = '[build.categories]';

  // ---------------------------------------------------------------------------
  // KONSTANTEN
  // ---------------------------------------------------------------------------
  var EVT_READY = 'cb:build-categories-ready';

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------
  function log(){ try { console.log.apply(console, arguments); } catch(_){} }
  function warn(){ try { console.warn.apply(console, arguments); } catch(_){} }

  function hasRegistry(){
    // Wir akzeptieren mehrere mögliche Namen aus dem Registry-Patch,
    // damit diese Datei "vorwärts-kompatibel" bleibt.
    return !!(window.ASSET_REGISTRY
           || window.REGISTRY
           || (window.Core && window.Core.Registry)
           || window.REGISTRY_BUILDINGS);
  }

  function deriveFromRegistry(){
    // Erwartete Struktur (tolerant):
    // - REGISTRY.buildings: { [id]: { id,label,ui:{icon}, kind, meta:{category,order} } }
    // - oder ASSET_REGISTRY.buildings / REGISTRY_BUILDINGS etc.
    var reg =
      (window.Core && window.Core.Registry) ||
      window.ASSET_REGISTRY ||
      window.REGISTRY ||
      { buildings: window.REGISTRY_BUILDINGS };

    var buildings = (reg && reg.buildings) || {};
    var catMap = Object.create(null);

    Object.keys(buildings).forEach(function(id){
      var b = buildings[id] || {};
      var ui = b.ui || {};
      var meta = b.meta || {};
      var catId = (meta.category || 'misc').toLowerCase();
      var item = {
        id: b.id || id,
        label: b.label || id,
        icon: ui.icon || ui.iconPath || ('assets/ui/build/' + id + '.png'),
        kind: b.kind || 'building',
        order: typeof meta.order === 'number' ? meta.order : 9999
      };
      if(!catMap[catId]){
        catMap[catId] = {
          id: catId,
          title: meta.categoryTitle || (catId.charAt(0).toUpperCase()+catId.slice(1)),
          order: typeof (reg.categories && reg.categories[catId] && reg.categories[catId].order) === 'number'
            ? reg.categories[catId].order : 9999,
          items: []
        };
      }
      catMap[catId].items.push(item);
    });

    // sortiere Items je Kategorie
    Object.keys(catMap).forEach(function(k){
      catMap[k].items.sort(function(a,b){
        var ao = (typeof a.order==='number') ? a.order : 9999;
        var bo = (typeof b.order==='number') ? b.order : 9999;
        if(ao !== bo) return ao - bo;
        return String(a.label).localeCompare(String(b.label));
      });
    });

    // sortiere Kategorien
    var categories = Object.keys(catMap).map(function(k){ return catMap[k]; });
    categories.sort(function(a,b){
      var ao = (typeof a.order==='number') ? a.order : 9999;
      var bo = (typeof b.order==='number') ? b.order : 9999;
      if(ao !== bo) return ao - bo;
      return String(a.title).localeCompare(String(b.title));
    });

    return categories;
  }

  function staticFallback(){
    // Minimaler, sinnvoller Startbestand (stabil, bis Registry greift)
    return [
      {
        id: 'basis',
        title: 'Basis',
        order: 10,
        items: [
          { id:'townhall', label:'Rathaus / HQ', icon:'assets/ui/build/hq.png', kind:'building', order:10 },
          { id:'depot',    label:'Depot',        icon:'assets/ui/build/depot.png', kind:'building', order:20 }
        ]
      },
      {
        id: 'produktion',
        title: 'Produktion',
        order: 20,
        items: [
          { id:'lumberjack',  label:'Holzfäller',   icon:'assets/ui/build/lumberjack.png', kind:'building', order:10 },
          { id:'stonecutter', label:'Steinmetz',    icon:'assets/ui/build/stonecutter.png', kind:'building', order:20 },
          { id:'farm',        label:'Farm',         icon:'assets/ui/build/farm.png', kind:'building', order:30 },
          { id:'fisher',      label:'Fischerhütte', icon:'assets/ui/build/fisher.png', kind:'building', order:40 }
        ]
      },
      {
        id: 'wege',
        title: 'Wege',
        order: 30,
        items: [
          { id:'path_dirt', label:'Trampelpfad', icon:'assets/ui/build/path.png', kind:'path', order:10 }
        ]
      }
    ];
  }

  // ---------------------------------------------------------------------------
  // HAUPTLOGIK
  // ---------------------------------------------------------------------------
  try {
    var categories = hasRegistry() ? deriveFromRegistry() : staticFallback();
    window.BUILD_CATEGORIES = categories;
    log(MOD, 'bereit — Kategorien:', categories);

    // Event feuern (UI kann darauf reagieren)
    var evt = new CustomEvent(EVT_READY, { detail: { categories: categories } });
    window.dispatchEvent(evt);
  } catch (err){
    warn(MOD, 'Fehler beim Erstellen der Kategorien', err);
    // versuche zumindest den Fallback bereitzustellen
    try {
      window.BUILD_CATEGORIES = staticFallback();
      var evt2 = new CustomEvent(EVT_READY, { detail: { categories: window.BUILD_CATEGORIES } });
      window.dispatchEvent(evt2);
    } catch(_){}
  }

  // ---------------------------------------------------------------------------
  // EXPORTS (global)
  // ---------------------------------------------------------------------------
  // (Absichtlich leer — nur window.BUILD_CATEGORIES + Event)
})();
