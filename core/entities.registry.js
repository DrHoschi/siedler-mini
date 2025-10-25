/* ============================================================================
 * Neue Siedler – Entities.Registry-Bridge
 * Dateiname: core/entities.registry.js
 * Version: v1.1.2
 *
 * Aufgabe:
 *  - Dient als dünne Fassade für Altcode: delegiert alle Abfragen an Registry
 *  - Reagiert robust auf cb:registry:ready (window UND document)
 *  - Loggt Status kurz & klar
 * ========================================================================== */
(function initEntitiesRegistry (global) {
  'use strict';

  var MOD  = "[entities.registry]";
  var logI = (global.CBLog?.info  || console.log).bind(console, MOD);
  var logW = (global.CBLog?.warn  || console.warn).bind(console, MOD);

  var _ready = false;
  var _onReadyQueue = [];

  function markReady(){
    if (_ready) return;
    _ready = true;
    // wartende Callbacks abfeuern
    try {
      while (_onReadyQueue.length) {
        var fn = _onReadyQueue.shift();
        try { fn(); } catch(_){}
      }
    } catch(_){}
  }

  function handleReady(ev){
    // Event kommt entweder von window oder document
    markReady();
  }

  // Auf Ready-Events hören (beide Targets)
  global.addEventListener('cb:registry:ready', handleReady);
  document.addEventListener('cb:registry:ready', handleReady);

  // Falls Registry bereits steht, sofort ready markieren
  if (global.Registry && global.Registry.__ready === true) {
    markReady();
  } else {
    logW("Registry noch nicht bereit – warte auf cb:registry:ready");
  }

  // dünne Fassade auf die echte Registry
  var API = {
    version: "v1.1.2 (delegiert an Registry)",

    isReady: function(){ return !!_ready; },

    /** whenReady(cb): führt cb aus, sobald Registry bereit ist */
    whenReady: function(cb){
      if (typeof cb !== 'function') return;
      if (_ready) { try { cb(); } catch(_){}} else { _onReadyQueue.push(cb); }
    },

    /** list(kind): delegiert */
    list: function(kind){
      if (!global.Registry) return [];
      return global.Registry.list(kind);
    },

    /** where(kind, pred): delegiert */
    where: function(kind, pred){
      if (!global.Registry) return [];
      return global.Registry.where(kind, pred);
    },

    /** get(kind, id): delegiert */
    get: function(kind, id){
      if (!global.Registry) return null;
      return global.Registry.get(kind, id);
    },

    /** upsert(kind, item): delegiert */
    upsert: function(kind, item){
      if (!global.Registry) return;
      return global.Registry.upsert(kind, item);
    }
  };

  // Globales Marker-Log + Bereitmeldung
  try {
    Object.defineProperty(global, "EntitiesRegistry", { value: API, writable:false, configurable:false });
  } catch(_) {
    global.EntitiesRegistry = API;
  }
  logI("bereit v1.1.2 – delegiert an Registry");
})(window);
