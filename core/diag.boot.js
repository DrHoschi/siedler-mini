/* ============================================================================
 * Datei   : core/diag.boot.js
 * Projekt : Neue Siedler
 * Version : v25.10.26-1
 * Zweck   : Boot-Diagnosen, Error-Sink, Preloads, Komfort-Events
 * ========================================================================== */
(() => {
  'use strict';
  const TAG  = '[diag]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  /* --------------------------- [1] Fehler-Sammelpunkt ---------------------- */
  window.addEventListener('error', (e)=>{
    ERR('global-error', e.message, e.filename, e.lineno);
    dispatchEvent(new CustomEvent('cb:insp:console', { detail:{ type:'error', msg:e.message, src:e.filename }}));
  });
  window.addEventListener('unhandledrejection', (e)=>{
    ERR('unhandled', e.reason);
    dispatchEvent(new CustomEvent('cb:insp:console', { detail:{ type:'error', msg:String(e.reason) }}));
  });

  /* ------------------------ [2] Boot-Snapshot fürs Inspector --------------- */
  addEventListener('cb:boot:ready', ()=>{
    const snap   = window.Registry?.snapshot?.() || null;
    const counts = snap?.data ? {
      buildings: snap.data.buildings?.length || 0,
      units    : snap.data.units?.length || 0,
      resources: Array.isArray(snap.data.resources)
        ? snap.data.resources.length
        : Object.keys(snap.data.resources || {}).length
    } : {};
    const assets = window.Assets?.stats?.() || { json:0, img:0 };
    const map    = window.MapRuntime?.info?.() || {};

    dispatchEvent(new CustomEvent('cb:diag:boot-snapshot', {
      detail: { counts, assets, map, meta: snap?.meta || {} }
    }));
    LOG('Boot-Snapshot gesendet', counts);
  });

  /* -------------------- [3] Ressourcen-Icons vorladen ---------------------- */
  addEventListener('cb:registry:ready', ()=>{
    try{
      const list = window.Registry?.list?.('resources') || [];
      list.forEach(r => { const i=new Image(); i.src=`assets/icons/resources/${r.id}.png`; });
      LOG('Icons preload', list.length);
    }catch(e){ WARN('preload fail', e?.message || e); }
  });

  /* ------------------ [4] Komfort: Build-Toggle-Event ---------------------- */
  addEventListener('req:build:toggle', ()=>{
    // Wenn deine UI einen echten Toggle hat, ersetzen:
    dispatchEvent(new Event('cb:build:open'));
  });

  /* ------------------ [5] Build-Button sicher einblenden ------------------- */
  addEventListener('cb:game:start', ()=>{
    const btn = document.getElementById('btn-build');
    if (btn) btn.hidden = false;
  });

  LOG('aktiv');
})();
