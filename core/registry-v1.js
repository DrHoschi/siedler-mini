/* ============================================================================
 * Datei   : core/registry.js
 * Version : v25.11.09-final
 * Zweck   : Einfache Registry (Buildings etc.), liefert 3×3 Größen
 * ========================================================================== */
(() => {
  'use strict';

  const TAG = '[registry]';
  const LOG = (...a)=>(window.CBLog?.info??console.info)(TAG, ...a);

  const buildings = {
    'b.hq'          : { id:'b.hq',          title:'HQ',            size:[3,3] },
    'b.lumberjack'  : { id:'b.lumberjack',  title:'Holzfäller',    size:[3,3] },
    'b.quarry'      : { id:'b.quarry',      title:'Steinbruch',    size:[3,3] },
    'b.house_small' : { id:'b.house_small', title:'Wohnhaus klein',size:[3,3] },
  };

  const Registry = {
    get(kind, id){
      if (kind === 'building') return buildings[id] || null;
      return null;
    },
    counts(){
      return { buildings: Object.keys(buildings).length };
    }
  };

  window.Registry = Registry;
  LOG('bereit', { counts: Registry.counts() });
  window.dispatchEvent(new CustomEvent('cb:registry:ready', {
    detail: { version:'v25.11.09', counts: Registry.counts() }
  }));
})();
