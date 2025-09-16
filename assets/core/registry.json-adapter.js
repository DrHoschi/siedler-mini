/* ============================================================================
 * Neue Siedler – Registry JSON Adapter
 * Version: v1.0.7
 * Aufgabe: buildings.json laden und in die Registry eintragen
 * Events:
 *   - dispatch 'cb:registry:ready' nach erfolgreichem Apply
 * Sucht:
 *   1) assets/registry/buildings.json
 *   2) data/buildings.json  (Fallback)
 * ========================================================================== */
(function (global) {
  'use strict';

  const logI = (global.CBLog?.info  || console.log).bind(console, "[registry.json-adapter]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[registry.json-adapter]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[registry.json-adapter]");

  const CANDIDATES = [
    "assets/registry/buildings.json",
    "data/buildings.json"
  ];

  function dispatchReady(sourceTag, counts){
    try {
      global.dispatchEvent(new CustomEvent("cb:registry:ready", {
        detail: { ready:true, counts, source: sourceTag }
      }));
    } catch(_) {}
  }

  function applyData(json){
    const R = global.Registry;
    if (!R) { logW("Registry nicht verfügbar – apply skip"); return {cats:0, blds:0}; }

    const list = Array.isArray(json?.buildings) ? json.buildings : [];
    let applied = 0;

    for (const b of list) {
      if (!b || !b.id || !b.cat || !b.name) continue;
      R.register?.("building", {
        id: b.id,
        name: b.name,
        cat: b.cat,
        sprite: b.sprite,
        icon: b.icon || null,
        enabled: b.enabled !== false,
        size: Array.isArray(b.size) ? b.size : [1,1],
        place: b.place || ""
      });
      applied++;
    }

    const cats = R.list?.("categories")?.length || 0;
    const blds = R.list?.("buildings") ?.length || 0;
    logI(`applied ${applied} buildings`);
    return {cats, blds};
  }

  async function fetchJson(url){
    const res = await fetch(url + (url.includes('?')?'':'?v=' + Date.now()), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  (async function init(){
    logI("Modul geladen v1.0.7");
    let data = null, used = null;

    for (const url of CANDIDATES) {
      try {
        data = await fetchJson(url);
        used = url;
        break;
      } catch (e) {
        logW(`Konnte nicht laden: ${url} → versuche nächsten Kandidaten…`);
      }
    }

    if (!data) { logE("Keine buildings.json gefunden."); return; }

    const counts = applyData(data);
    logI(`ready dispatched (cats: ${counts.cats} blds: ${counts.blds}) aus ${used}`);
    dispatchReady("registry.json-adapter", counts);
  })();
})(window);
