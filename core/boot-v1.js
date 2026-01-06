/* ============================================================================
 * Datei    : core/boot-v1.js
 * Version  : v26.01.06-builder-from-hq (3-Gate: user+assets+registry)
 *
 * Fix (2025-12-19):
 *   - "Weiterspielen" sendet req:game:continue (ui/ui-start.js),
 *     aber Boot hörte bisher NUR auf req:game:start.
 *     Ergebnis: Continue-Klick hat NICHTS ausgelöst → Panel bleibt offen.
 *
 * Startet  : cb:game:start ⇐ (req:game:start ODER req:game:continue)
 *                      + cb:assets-ready + cb:registry:ready
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[boot]';
  if (window.__BOOT_SINGLETON__) { console.info(TAG,'bereits init – skip'); return; }
  window.__BOOT_SINGLETON__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  const state = {
    version:'v25.12.19-continue-fix',
    userReady:false,
    assetsReady:false,
    registryReady:false,
    started:false,
    mode:null,              // 'new' | 'continue'
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
    dispatchEvent(new CustomEvent('cb:game:start', { detail:{ mode: state.mode || 'new' } }));
    INFO('cb:game:start emittiert');
  }

  // ------------------------------------------------------------
  // User-Gate: Start ODER Continue
  // ------------------------------------------------------------
  function onUserRequest(mode){
    // Mehrfachklick ist ok, wir starten trotzdem nur 1× (state.started Guard)
    state.userReady = true;
    state.mode = mode || state.mode || 'new';
    INFO('UserReady ✓ via', state.mode);
    maybeStart();

    // UX/Debug: Wenn Assets lange brauchen, sehen wir wenigstens warum.
    // (Keine harte Abbruch-Logik – nur Warnung.)
    setTimeout(()=>{
      if (state.started) return;
      if (!state.assetsReady)   WARN('Warte noch auf assetsReady …');
      if (!state.registryReady) WARN('Warte noch auf registryReady …');
    }, 1500);
  }

  addEventListener('req:game:start',    ()=> onUserRequest('new'));
  addEventListener('req:game:continue', ()=> onUserRequest('continue'));

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
