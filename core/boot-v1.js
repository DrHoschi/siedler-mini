/* ============================================================================
 * Datei    : core/boot-v1.js
 * Version  : v25.11.13-final3 (3-Gate: user+assets+registry)
 * Startet  : cb:game:start ⇐ req:game:start + cb:assets-ready + cb:registry:ready
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[boot]';
  if (window.__BOOT_SINGLETON__) { console.info(TAG,'bereits init – skip'); return; }
  window.__BOOT_SINGLETON__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  const state = {
    version:'v25.11.13-final3',
    userReady:false,
    assetsReady:false,
    registryReady:false,
    started:false,
  };
  INFO('BootManager initialisiert', state.version);

  function maybeStart(){
    if (state.started) return;
    if (!state.userReady || !state.assetsReady || !state.registryReady) {
      const miss=[];
      if (!state.userReady)     miss.push('userReady');
      if (!state.assetsReady)   miss.push('assetsReady');
      if (!state.registryReady) miss.push('registryReady');
      WARN('Start blockiert → fehlend:', miss.length===1?miss[0]:JSON.stringify(miss));
      return;
    }
    state.started = true;
    dispatchEvent(new CustomEvent('cb:game:start', { detail:{} }));
    INFO('cb:game:start emittiert');
  }

  // Nutzer klickt "Start"
  addEventListener('req:game:start', ()=>{ state.userReady = true; maybeStart(); }, { once:true });

  // Assets einmalig
  addEventListener('cb:assets-ready', (e)=>{ if (state.assetsReady) return;
    state.assetsReady = true; INFO('Assets bereit ✓', e?.detail||{});
    maybeStart();
  }, { once:true });

  // Registry einmalig
  addEventListener('cb:registry:ready', (e)=>{ if (state.registryReady) return;
    state.registryReady = true; INFO('Registry bereit ✓', e?.detail||{});
    maybeStart();
  }, { once:true });
})();
