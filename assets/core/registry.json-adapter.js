<script>
/* ============================================================================
 * Registry JSON Adapter (buildings)
 * v1.0.9 – konsistente Typ-Bezeichnung, robustes Eventing
 * Pfad der Daten: assets/data/buildings.json
 * Erwartetes Registry-Type: 'buildings' (PLURAL)
 * ========================================================================== */
(function () {
  'use strict';

  var LOG = (window.CBLog && CBLog.info) ? CBLog : console;
  var WARN = (window.CBLog && CBLog.warn) ? CBLog : console;

  var TYPE = 'buildings';                 // <-- EINHEITLICH PLURAL
  var SRC  = 'assets/data/buildings.json';

  function dispatch(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail||{} })); } catch(e){}
  }

  function ensureRegistry() {
    if (!window.Registry) {
      window.Registry = {
        _store: {},
        register: function(type, arr){ this._store[type] = (arr||[]).slice(0); return this._store[type]; },
        list:     function(type){ return (this._store[type]||[]).slice(0); }
      };
      WARN.warn('[registry.json-adapter] Registry Shim aktiv – echte registry.js fehlt?');
    }
  }

  function normalize(raw){
    // Erwartete Struktur: { iconsBase?:string, buildings: [ { id, name, cat, icon, sprite, enabled, size, place } ] }
    var base = raw && typeof raw === 'object' ? raw : {};
    var arr  = Array.isArray(base.buildings) ? base.buildings : [];

    // Fallback: wenn versehentlich "building" (singular) verwendet wurde
    if ((!arr || !arr.length) && Array.isArray(base.building)) {
      arr = base.building;
    }

    // harte Normalisierung & sanity checks
    var out = arr.map(function(it){
      var o = Object.assign({}, it);
      o.id      = String(o.id || '').trim();
      o.name    = String(o.name || o.id || '').trim();
      o.cat     = String(o.cat || 'admin').trim();           // admin|food|raw
      o.enabled = (o.enabled !== false);
      o.size    = Array.isArray(o.size) && o.size.length===2 ? o.size.slice(0,2) : [1,1];
      o.icon    = o.icon || '';
      o.sprite  = o.sprite || '';
      o.place   = o.place || '';
      return o;
    }).filter(function(o){ return !!o.id; });

    return { iconsBase: base.iconsBase || 'assets/ui/build/', list: out };
  }

  function loadJSON(url){
    return new Promise(function(resolve, reject){
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.overrideMimeType && xhr.overrideMimeType('application/json');
        xhr.onload = function(){
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch(e){ reject(e); }
          } else {
            reject(new Error('HTTP '+xhr.status));
          }
        };
        xhr.onerror = function(){ reject(new Error('Network error')); };
        xhr.send();
      } catch(e){
        reject(e);
      }
    });
  }

  (function boot(){
    LOG.info('[registry.json-adapter] Modul geladen v1.0.9');
    ensureRegistry();

    loadJSON(SRC).then(function(data){
      LOG.info('[registry.json-adapter] geladen: '+SRC);
      var norm = normalize(data);
      // Registrieren – **PLURAL**
      var stored = window.Registry.register(TYPE, norm.list);
      LOG.info('[registry.json-adapter] applied '+stored.length+' buildings aus '+SRC);

      // informiere UI/Bridge
      dispatch('cb:registry:update', { type: TYPE, count: stored.length });
      // Erster Load → als ready interpretieren
      dispatch('cb:registry:ready',  { type: TYPE, count: stored.length });
      // Kompat: einige Module lauschen auf assets-ready
      dispatch('cb:assets-ready',    { ok:true, source:'registry.json-adapter' });
    }).catch(function(err){
      WARN.warn('[registry.json-adapter] Konnte nicht laden ('+SRC+'): ', err);
      dispatch('cb:registry:ready', { type: TYPE, count: 0, error: String(err&&err.message||err) });
    });
  })();
})();
</script>
