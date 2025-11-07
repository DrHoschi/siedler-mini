/* ============================================================================
 * Datei    : core/boot-v1.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.13-final+singleton
 * Zweck    : BootManager – orchestriert Assets, Registry, Game-Start
 * Hinweis  : Singleton-Guard verhindert Doppelinitialisierung bei Doppel-Include
 * ========================================================================== */
(function(){
  'use strict';
  const TAG = '[boot]';

  // -------- Singleton-Guard -------------------------------------------------
  if (window.__BOOT_V1__) {
    console.info(TAG, 'BootManager bereits initialisiert – ignoriere Doppelstart');
    return;
  }
  window.__BOOT_V1__ = true;

  // -------- Logging Helpers -------------------------------------------------
  const OK   = (...a)=> (window.CBLog?.ok   || console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error|| console.error)(TAG, ...a);

  // -------- State -----------------------------------------------------------
  const state = {
    assetsReady: false,
    registryReady: false,
    started: false,
    version: 'v25.11.07-final2'
  };

  INFO('BootManager initialisiert', state.version);

  // -------- Helpers ---------------------------------------------------------
  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_) {}
  }

  function maybeStart(){
    if (state.started) return;
    if (!state.assetsReady || !state.registryReady) {
      const missing = [];
      if (!state.assetsReady)  missing.push('assetsReady');
      if (!state.registryReady) missing.push('registryReady');
      WARN('Start blockiert → fehlend:', missing.length===1 ? missing[0] : JSON.stringify(missing));
      return;
    }
    state.started = true;
    // Einheitliches Game-Start Event (einmalig)
    window.dispatchEvent(new CustomEvent('cb:game-start', { detail:{} }));
    OK('Szene initialisiert.');
  }

  // -------- Events (once) ---------------------------------------------------
  // Assets
  window.addEventListener('cb:assets-ready', (e)=>{
    if (state.assetsReady) return;
    state.assetsReady = true;
    INFO('Assets bereit ✓', e?.detail || {});
    maybeStart();
  }, { once:true });

  // Registry
  window.addEventListener('cb:registry:ready', (e)=>{
    if (state.registryReady) return;
    state.registryReady = true;
    INFO('Registry bereit ✓', e?.detail || {});
    maybeStart();
  }, { once:true });

})();
