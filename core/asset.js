/* ============================================================================
 * Datei   : core/asset.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-final+emit-once
 * Zweck   : Minimaler Asset-Loader → feuert cb:assets-ready genau einmal
 * ========================================================================== */
(function(){
  'use strict';
  const TAG = '[assets]';

  if (window.__ASSETS_LOADER__) {
    console.info(TAG, 'bereits aktiv – ignoriere Doppel-Init');
    return;
  }
  window.__ASSETS_LOADER__ = true;

  const OK   = (...a)=> (window.CBLog?.ok   || console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);

  let emitted = false;

  function emitOnce(name, detail){
    if (emitted) return;
    emitted = true;
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  async function loadAll(){
    // TODO: dein echter Loader; hier nur Demo-Infos aus deinem Log
    const detail = { ok:true, counts:{ images:1, json:5 }, version:'v25.10.25-final', errors:[] };
    INFO('assets-ready ✓ ', ` (json:${detail.counts.json}, img:${detail.counts.images})`);
    emitOnce('cb:assets-ready', detail);
  }

  loadAll().catch(()=> emitOnce('cb:assets-ready', { ok:false }));
})();
