/* ============================================================================
 * Datei   : core/asset.js
 * Version : v25.11.13-final (emit once)
 * Zweck   : feuert genau 1× cb:assets-ready, wenn Basispaket geladen ist
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[assets]';
  if (window.__ASSETS_LOADER__) { console.info(TAG,'bereits aktiv – skip'); return; }
  window.__ASSETS_LOADER__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG, ...a);

  let emitted=false;
  function emitOnce(name, detail){ if (emitted) return; emitted=true;
    dispatchEvent(new CustomEvent(name,{ detail }));
  }

  async function loadAll(){
    // TODO: hier kommt dein echter Loader; Demo-Detail wie im Log:
    const detail = { ok:true, counts:{ images:1, json:5 }, version:'v25.10.25-final', errors:[] };
    INFO('Assets bereit ✓', detail);
    emitOnce('cb:assets-ready', detail);
  }

  loadAll().catch(err=>emitOnce('cb:assets-ready',{ ok:false, error:String(err)}));
})();
