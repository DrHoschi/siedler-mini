/* ============================================================================
 * Datei   : core/registry-v1.js
 * Version : v25.11.13-final (emit once)
 * Zweck   : Daten laden/registrieren → cb:registry:ready
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[registry]';
  if (window.__REGISTRY_V1__) { console.info(TAG,'bereits aktiv – skip'); return; }
  window.__REGISTRY_V1__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG, ...a);

  async function loadJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const r = await fetch(url + bust, { cache:'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
    return r.json();
  }

  async function init(){
    // TODO: ersetze die Pfade durch deine echten Quellen
    const buildings = await loadJSON('data/buildings.json');
    // ggf. weitere Quellen …
    INFO('bereit', { counts:{ buildings: Array.isArray(buildings)?buildings.length:Object.keys(buildings||{}).length } });
    dispatchEvent(new CustomEvent('cb:registry:ready', {
      detail:{ version:'v25.11.13', counts:{ buildings: (buildings?.length||0) } }
    }));
  }

  init().catch(e=>console.warn(TAG,'Fehler:', e?.message||e));
})();
