/* ============================================================================
 * Datei: assets/core/registry.json-adapter.js
 * Version: v1.0.5
 * Aufgabe:
 *  - buildings.json laden (robust: 2 Standardpfade probieren)
 *  - IN DIE REGISTRY EINTRAGEN (type = "building" SINGULAR!)
 *  - iconsBase in Registry.meta setzen
 *  - NACH dem Eintragen genau 1x cb:registry:ready dispatchen
 * ========================================================================== */
(function (global) {
  'use strict';
  var MOD = '[registry.json-adapter]';
  var VER = 'v1.0.5';
  var logI = (global.CBLog?.info  || console.log).bind(console, MOD);
  var logW = (global.CBLog?.warn  || console.warn).bind(console, MOD);
  var logE = (global.CBLog?.error || console.error).bind(console, MOD);

  logI('Modul geladen', VER);

  // 1) Mögliche JSON-Orte (wir probieren nacheinander)
  var CANDIDATES = [
    'assets/registry/buildings.json',
    'data/buildings.json'
  ];

  function fetchJSON(url){
    return fetch(url, { cache: 'no-store' }).then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status+' @ '+url);
      return r.json().then(function(j){ j.__src = url; return j; });
    });
  }

  function tryLoadAny(urls, i){
    i = i||0;
    if (i >= urls.length) return Promise.reject(new Error('Keine buildings.json gefunden'));
    var url = urls[i];
    return fetchJSON(url).catch(function(){
      logW('Konnte nicht laden → nächster Kandidat:', url);
      return tryLoadAny(urls, i+1);
    });
  }

  function resolveIconURL(base, icon){
    if (!icon) return null;
    if (/^https?:\/\//i.test(icon) || icon.startsWith('assets/')) return icon;
    base = (base||'').replace(/\/+$/,'');
    return base ? (base + '/' + icon) : icon;
  }

  function applyData(data){
    var R = global.Registry;
    if (!R || typeof R.register !== 'function') {
      logW('Registry noch nicht bereit – verzögere applyData');
      global.addEventListener('cb:registry:ready', function once(){
        global.removeEventListener('cb:registry:ready', once);
        applyData(data);
      }, { once:true });
      return;
    }

    // iconsBase bereitstellen
    var base = data.iconsBase || '';
    R.meta = R.meta || {};
    R.meta.iconsBase = base;
    global.__REGISTRY_ICONS_BASE = base;

    var list = Array.isArray(data.buildings) ? data.buildings : [];
    var count = 0;
    list.forEach(function(b){
      if (!b || !b.id) { logW('Übersprungen (fehlende id):', b); return; }
      try{
        var entry = Object.assign({}, b);
        // optional: Icon vollständigen Pfad geben (UI kann auch base+name joinen)
        if (entry.icon) entry.icon = resolveIconURL(base, entry.icon);
        // *** WICHTIG: SINGULAR building! ***
        R.register('building', entry);
        count++;
      }catch(e){ logE('register(building,'+b.id+') fehlgeschlagen:', e); }
    });

    logI('applied', count, 'buildings aus', data.__src || '(unbekannt)');

    // Counts + Ready
    try{
      var cats = R.list?.('categories')?.length || 0;
      var blds = R.list?.('buildings') ?.length || 0;
      global.dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail: { ready:true, counts:{ categories:cats, buildings:blds }, source:'json-adapter' }
      }));
      logI('ready dispatched (cats:', cats, 'blds:', blds, ')');
    }catch(_){}
  }

  // Start: so früh wie möglich
  (function boot(){
    tryLoadAny(CANDIDATES)
      .then(applyData)
      .catch(function(err){
        logE('Fehler: buildings.json nicht gefunden/ladbar → Baumenü bleibt leer.', err);
      });
  })();

  // Sicherheitsnetz: auch nach Game-Start nochmal versuchen, falls ganz früh geladen wurde
  global.addEventListener('cb:game-start', function(){ 
    tryLoadAny(CANDIDATES).then(applyData).catch(function(){/* schon erledigt */});
  }, { once:true });

})(window);
