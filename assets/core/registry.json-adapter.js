/* ============================================================================
 * registry.json-adapter.js  – v1.0.8
 * Lädt buildings.json, registriert "building" in der Registry
 * und triggert cb:registry:update/ready + cb:assets-ready (Legacy).
 * Pfade (in dieser Reihenfolge): assets/data/, assets/registry/, data/
 * ========================================================================== */
(function () {
  'use strict';

  var VERSION = 'v1.0.8';

  var SOURCES = [
    'assets/data/buildings.json',
    'assets/registry/buildings.json',
    'data/buildings.json'
  ];

  function log()  { (window.CBLog?.info  || console.log).apply(console, ['[registry.json-adapter]', ...arguments]); }
  function warn() { (window.CBLog?.warn  || console.warn).apply(console, ['[registry.json-adapter]', ...arguments]); }

  function counts() {
    var R = window.Registry || {};
    return {
      categories: R.list?.('categories')?.length || 0,
      buildings:  R.list?.('building')  ?.length || 0
    };
  }

  function normalize(raw) {
    var b = Object.assign({}, raw);

    // evtl. andere Feldnamen tolerieren
    if (b.category && !b.cat) { b.cat = b.category; }
    // Icon-Basis optional anwenden, wenn kein absoluter Pfad
    if (b.icon && !/^(\.|\/|assets|https?:)/.test(b.icon)) {
      var base = (window.__iconsBase || 'assets/ui/build/');
      b.icon = base + b.icon;
    }
    // Defaults
    if (typeof b.enabled === 'undefined') b.enabled = true;
    if (!b.size) b.size = [1,1];

    return b;
  }

  function registerBuildings(payload) {
    var list = Array.isArray(payload?.buildings) ? payload.buildings
             : Array.isArray(payload)            ? payload
             : [];

    var ok = 0;
    for (var i = 0; i < list.length; i++) {
      var b = normalize(list[i]);
      try {
        window.Registry?.register?.('building', b);
        ok++;
      } catch (e) {
        warn('Register-Fehler für', b && b.id, e);
      }
    }
    return ok;
  }

  function dispatch(sourceTag) {
    var detail = { ready: true, counts: counts(), source: sourceTag || 'json-adapter' };
    try { window.dispatchEvent(new CustomEvent('cb:registry:update', { detail })); } catch(_) {}
    try { window.dispatchEvent(new CustomEvent('cb:registry:ready',  { detail })); } catch(_) {}
    // Legacy-Bridge (einige UIs hören noch hierauf)
    try { window.dispatchEvent(new CustomEvent('cb:assets-ready',     { detail })); } catch(_) {}
    // UI freundlich „anstupsen“
    try { window.UIBuild?.rerender?.(); } catch(_) {}
    log('events dispatched', detail.counts);
  }

  async function fetchFirst(urls) {
    for (var i = 0; i < urls.length; i++) {
      var url = urls[i] + '?v=' + Date.now(); // Cache-Bust (Safari)
      try {
        var res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var json = await res.json();
        log('geladen:', urls[i]);
        return { json: json, url: urls[i] };
      } catch (e) {
        warn('Konnte nicht laden → nächster Kandidat:', urls[i]);
      }
    }
    throw new Error('Keine buildings.json gefunden.');
  }

  (async function boot() {
    log('Modul geladen', VERSION);

    // Warten, bis Registry existiert (wenn Skripte knapp nacheinander kommen)
    var waitCount = 0;
    while (!window.Registry?.register && waitCount < 50) {
      await new Promise(function (r) { setTimeout(r, 10); });
      waitCount++;
    }
    if (!window.Registry?.register) {
      warn('Registry fehlt – Abbruch.');
      return;
    }

    var payload = await fetchFirst(SOURCES);
    // iconsBase global merken (für UI)
    if (payload.json && payload.json.iconsBase) {
      window.__iconsBase = payload.json.iconsBase;
    }

    var applied = registerBuildings(payload.json);
    log('applied', applied, 'buildings aus', payload.url);

    dispatch(payload.url);
  })().catch(function (e) {
    warn('Fehler:', e && e.message || e);
  });
})();
