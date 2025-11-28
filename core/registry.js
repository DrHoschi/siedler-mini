/* ============================================================================
 * Datei   : core/registry.js
 * Version : v25.11.27-final
 * Zweck   : Zentrale Datenbank (Gebäude / Produktion / Units ...)
 * ========================================================================== */

(function(){
  'use strict';
  const TAG = '[registry]';
  if (window.__REGISTRY_V2__) return console.info(TAG,'skip (already loaded)');
  window.__REGISTRY_V2__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);

  const Registry = {
    buildings: {},

    getBuilding(id){
      return Registry.buildings[id] || null;
    }
  };
  window.Registry = Registry;

  async function loadJSON(url){
    const r = await fetch(url + '?v=' + Date.now(), { cache:'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
    return r.json();
  }

  async function init(){
    try{
      const buildings = await loadJSON('data/buildings.json');
      Registry.buildings = buildings;

      INFO('bereit', { buildings: Object.keys(buildings).length });

      dispatchEvent(new CustomEvent('cb:registry:ready',{
        detail:{ version:'v25.11.27', registry: Registry }
      }));
    }
    catch(e){
      WARN('Fehler:', e);
    }
  }

  init();
})();
