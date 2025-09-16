/* ============================================================================
 * Datei: assets/core/registry.json-adapter.js
 * Projekt: Neue Siedler
 * Version: v1.0.4
 *
 * Aufgabe
 *  - buildings.json laden
 *  - Inhalte in Registry eintragen (Registry.upsert('buildings', …))
 *  - iconsBase in Registry.meta hinterlegen (für UI-Bridge)
 *  - NACH dem Eintragen genau 1x cb:registry:ready dispatchen
 * ========================================================================== */
(function (global) {
  'use strict';
  var MOD = '[registry.json-adapter]';
  var VER = 'v1.0.4';
  var logI = (global.CBLog?.info  || console.log).bind(console, MOD);
  var logW = (global.CBLog?.warn  || console.warn).bind(console, MOD);
  var logE = (global.CBLog?.error || console.error).bind(console, MOD);

  logI('Modul geladen', VER);

  // ------------------------------ Helpers -----------------------------------
  function once(fn){
    var done = false;
    return function(){ if (done) return; done = true; try{ fn.apply(this, arguments); }catch(e){ logE(e); } };
  }
  function fetchJSON(url){
    return fetch(url).then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status+' @ '+url);
      return r.json();
    });
  }
  function counts(){
    var R = global.Registry || {};
    var cats = R.list?.('categories')?.length || 0;
    var blds = R.list?.('buildings') ?.length || 0;
    return { categories: cats, buildings: blds };
  }

  // --------------------------- Apply JSON -> Registry ------------------------
  function applyData(data){
    if (!global.Registry) { logW('Registry fehlt – Abbruch'); return; }

    // iconsBase bereitstellen (UI-Bridge nutzt das)
    var base = data?.iconsBase || '';
    global.Registry.meta = global.Registry.meta || {};
    global.Registry.meta.iconsBase = base;
    // optionaler globaler Hook (falls andere Module das brauchen)
    global.__REGISTRY_ICONS_BASE = base;

    var buildings = data?.buildings || [];
    var applied = 0;

    buildings.forEach(function(b){
      try{
        // nichts „umbauen“ – Originalfelder beibehalten (Bridge join’t icon+iconsBase)
        if (!b.id) { logW('Building ohne id übersprungen:', b?.name || b); return; }
        // upsert statt register('buildings', …)
        global.Registry.upsert && global.Registry.upsert('buildings', b);
        applied++;
      }catch(e){
        logE('Fehler beim Eintragen', b?.id || b, e);
      }
    });

    logI('applied', applied, 'buildings');
  }

  // ------------------------------- Ready Event -------------------------------
  var dispatchReady = once(function(sourceTag){
    var c = counts();
    try {
      global.dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail: { ready:true, counts:c, source: sourceTag || 'json-adapter' }
      }));
    } catch(_){}
    logI('ready dispatched (cats:', c.categories, 'blds:', c.buildings, ')');
  });

  // --------------------------------- Start -----------------------------------
  var started = false;
  function start(){
    if (started) return; started = true;
    // Pfad zu deinem JSON (so wie du es nutzt)
    var url = 'data/buildings.json';

    fetchJSON(url)
      .then(function(data){
        applyData(data);          // 1) erst eintragen
        dispatchReady('json-adapter'); // 2) dann ready feuern
      })
      .catch(function(err){
        logE('Fehler beim Laden von', url, err);
      });
  }

  // Startbedingungen: sobald Assets bereit ODER Game-Start
  global.addEventListener('cb:assets-ready', start, { once:true });
  global.addEventListener('cb:game-start',   start, { once:true });

  // Fallback: wenn DOM schon da und Registry existiert, vorsichtig starten
  if (document.readyState !== 'loading' && global.Registry) {
    // kurzer Timeout, damit andere Listener sich registrieren können
    setTimeout(start, 0);
  }
})(window);
