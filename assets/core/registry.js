/* ============================================================================
 * Neue Siedler – Core Registry
 * Dateiname: assets/core/registry.js
 * Version: v1.2.3
 *
 * Aufgabe:
 *  - Zentrale, schreibbare Datenhaltung (Kategorien, Gebäude)
 *  - Eindeutige Events:
 *      cb:registry:ready  – nach Initialisierung (mit Counts)
 *      cb:registry:update – bei Upserts (kind + id)
 *
 * Lastenheft-konform:
 *  - Registry existiert vor Entities/Renderer/Game
 *  - __ready ist gesetzt, sobald die Registry initialisiert ist
 *  - Ready-Event wird (kompatibel) auf window UND document gefeuert
 * ========================================================================== */
(function initRegistry (global) {
  'use strict';

  // --- Logging --------------------------------------------------------------
  var logI = (global.CBLog?.info  || console.log).bind(console, "[registry]");
  var logW = (global.CBLog?.warn  || console.warn).bind(console, "[registry]");
  var logE = (global.CBLog?.error || console.error).bind(console, "[registry]");

  // Bei Mehrfach-Include nicht doppelt initialisieren
  if (global.Registry && global.Registry.__ready) {
    logW("bereits initialisiert – skip");
    try {
      var cats0 = global.Registry.list?.('categories')?.length || 0;
      var blds0 = global.Registry.list?.('buildings') ?.length || 0;
      _dispatchReady({ categories: cats0, buildings: blds0 }, 'registry-reused');
    } catch(_) {}
    return;
  }

  // --- Utils ----------------------------------------------------------------
  function deepFreeze(o){
    try {
      Object.freeze(o);
      Object.getOwnPropertyNames(o).forEach(function(p){
        if (o[p] && typeof o[p] === "object" && !Object.isFrozen(o[p])) deepFreeze(o[p]);
      });
    } catch(_) {}
    return o;
  }

  function dispatch(type, detail){
    // Primär laut Lastenheft: window
    try { global.dispatchEvent(new CustomEvent(type, { detail })); } catch(_) {}
    // Kompat: einige Module hören auf document
    try { document.dispatchEvent(new CustomEvent(type, { detail })); } catch(_) {}
  }

  function _dispatchReady(counts, source){
    dispatch("cb:registry:ready", { ready:true, counts:counts||{categories:0,buildings:0}, source: source||"registry" });
  }

  // --- Startdaten (leer genügt; Adapter füllt später auf) -------------------
  var CATEGORIES = [
    { id:"admin", name:"Allg. / Verwaltung",      sort:10 },
    { id:"food",  name:"Produktion / Nahrung",    sort:20 },
    { id:"raw",   name:"Produktion / Rohstoffe",  sort:30 }
  ];
  var BUILDINGS = []; // der JSON-Adapter (data/buildings.json) upsertet hier hinein

  // --- interner Zustand -----------------------------------------------------
  var _state = {
    categories: CATEGORIES.slice(0),
    buildings:  BUILDINGS.slice(0)
  };

  // --- öffentliche API ------------------------------------------------------
  var Registry = {
    version: "1.2.3",
    __ready: false,

    /** list(kind): flache Liste holen */
    list: function(kind){
      if (kind === "categories") return _state.categories.slice().sort(function(a,b){ return (a.sort|0)-(b.sort|0); });
      if (kind === "buildings")  return _state.buildings.slice();
      logW("list(): unbekannte Art", kind); return [];
    },

    /** where(kind, predicateObj): exakte Treffer anhand Schlüssel/Werte */
    where: function(kind, pred){
      var src = (kind==="categories") ? _state.categories
              : (kind==="buildings")  ? _state.buildings
              : [];
      if (!src.length) { if (kind!=="categories" && kind!=="buildings") logW("where(): unbekannte Art", kind); return []; }
      var p = pred || {};
      var keys = Object.keys(p);
      if (!keys.length) return src.slice();
      return src.filter(function(entry){
        for (var k=0; k<keys.length; k++){
          var key = keys[k];
          if (entry[key] !== p[key]) return false;
        }
        return true;
      });
    },

    /** get(kind, id): einen Eintrag holen */
    get: function(kind, id){
      var src = (kind==="categories") ? _state.categories
              : (kind==="buildings")  ? _state.buildings
              : [];
      for (var i=0; i<src.length; i++){ if (src[i].id === id) return src[i]; }
      return null;
    },

    /** upsert(kind, item): einfügen/aktualisieren + Update-Event */
    upsert: function(kind, item){
      var list = (kind==="categories") ? _state.categories
               : (kind==="buildings")  ? _state.buildings
               : null;
      if (!list) { logW("upsert(): unbekannte Art", kind); return; }
      if (!item || !item.id){ logW("upsert(): ungültiges Item", item); return; }
      var i = -1;
      for (var j=0; j<list.length; j++){ if (list[j].id === item.id) { i = j; break; } }
      if (i >= 0) list[i] = Object.assign({}, list[i], item);
      else list.push(Object.assign({}, item));
      dispatch("cb:registry:update", { kind:kind, id:item.id });
    },

    /** Legacy-Brücke (für Altcode, der "register('building',payload)" nutzt) */
    register: function(type, payload){
      if (type === "building") return Registry.upsert("buildings", payload);
      if (type === "category") return Registry.upsert("categories", payload);
      logW("register(): unbekannter type", type);
    },

    /** freeze(): read-only Snapshot liefern */
    freeze: function(){ return deepFreeze({ categories: _state.categories.slice(), buildings: _state.buildings.slice() }); }
  };

  // --- Global setzen & Ready signalisieren ---------------------------------
  try { Object.defineProperty(global, "Registry", { value: Registry, writable:false, configurable:false }); }
  catch(_) { global.Registry = Registry; }

  // __ready markieren + Ready-Event mit aktuellen Counts
  try {
    Registry.__ready = true;
    var cats = Registry.list('categories').length|0;
    var blds = Registry.list('buildings').length |0;
    logI("bereit v"+Registry.version+" (Kategorien: "+cats+" , Gebäude: "+blds+")");
    _dispatchReady({ categories:cats, buildings:blds }, 'registry-init');
  } catch (e) {
    logE("Init-Fehler:", e);
  }
})(window);
