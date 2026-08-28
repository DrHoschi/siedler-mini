/* ============================================================================
 * Datei    : core/boot-v1.js
 * Projekt  : Neue Siedler
 * Version  : v26.08.28-sa04-continue-gate3
 * Zweck    : 3-Gate-Boot + SA-04 SaveGame-V2-Gate + Runtime-Guards.
 *
 * Startet  : cb:game:start ⇐ (req:game:start ODER req:game:continue)
 *                      + cb:assets-ready + cb:registry:ready + SaveGameV2 ready
 * Continue : zusätzlich nur nach gültigem SaveGameV2.prepareContinue().
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[boot]';
  if (window.__BOOT_SINGLETON__) { console.info(TAG,'bereits init – skip'); return; }
  window.__BOOT_SINGLETON__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  const state = {
    version:'v26.08.28-sa04-continue-gate3',
    userReady:false,
    assetsReady:false,
    registryReady:false,
    saveV2Ready:false,
    continuePrepared:false,
    started:false,
    mode:null
  };
  window.BootState = state;
  INFO('BootManager initialisiert', state.version);

  function emit(name,detail={}){
    try{ dispatchEvent(new CustomEvent(name,{detail})); }catch(_){}
  }

  function maybeStart(){
    if (state.started) return;

    const continueBlocked = state.mode === 'continue' && !state.continuePrepared;
    if (!state.userReady || !state.assetsReady || !state.registryReady || !state.saveV2Ready || continueBlocked) {
      const miss=[];
      if (!state.userReady)     miss.push('userReady');
      if (!state.assetsReady)   miss.push('assetsReady');
      if (!state.registryReady) miss.push('registryReady');
      if (!state.saveV2Ready)   miss.push('saveV2Ready');
      if (state.mode === 'continue' && state.saveV2Ready && !state.continuePrepared) miss.push('continuePrepared');
      WARN('Start blockiert → fehlend:', miss.length===1?miss[0]:JSON.stringify(miss));
      return;
    }

    state.started = true;
    emit('cb:game:start', { mode: state.mode || 'new' });
    INFO('cb:game:start emittiert', state.mode || 'new');
  }

  function prepareContinue(){
    if (!state.saveV2Ready || !window.SaveGameV2) return false;
    const result = window.SaveGameV2.prepareContinue({slot:'autosave'});
    if (!result?.ok){
      state.continuePrepared=false;
      state.userReady=false;
      state.mode=null;
      WARN('Continue nicht möglich:', result?.message || 'kein Savegame');
      emit('cb:game:continue:blocked',{reason:'no-valid-save-v2', message:result?.message || 'Kein gültiger Spielstand'});
      return false;
    }
    state.continuePrepared=true;
    INFO('Continue-Snapshot vorbereitet ✓');
    return true;
  }

  function onUserRequest(mode){
    if (state.started) return;
    state.userReady = true;
    state.mode = mode || 'new';
    INFO('UserReady ✓ via', state.mode);

    if (state.mode === 'continue' && state.saveV2Ready){
      if (!prepareContinue()) return;
    }
    maybeStart();

    setTimeout(()=>{
      if (state.started) return;
      if (!state.assetsReady)   WARN('Warte noch auf assetsReady …');
      if (!state.registryReady) WARN('Warte noch auf registryReady …');
      if (!state.saveV2Ready)   WARN('Warte noch auf SaveGame V2 …');
    }, 1500);
  }

  addEventListener('req:game:start',    ()=> onUserRequest('new'));
  addEventListener('req:game:continue', ()=> onUserRequest('continue'));

  addEventListener('cb:assets-ready', (e)=>{
    if (state.assetsReady) return;
    state.assetsReady = true;
    INFO('Assets bereit ✓', e?.detail||{});
    maybeStart();
  }, { once:true });

  addEventListener('cb:registry:ready', (e)=>{
    if (state.registryReady) return;
    state.registryReady = true;
    INFO('Registry bereit ✓', e?.detail||{});
    maybeStart();
  }, { once:true });

  addEventListener('cb:savegame:v2:ready', (e)=>{
    state.saveV2Ready=true;
    INFO('SaveGame V2 bereit ✓', e?.detail||{});
    if (state.userReady && state.mode === 'continue'){
      if (!prepareContinue()) return;
    }
    maybeStart();
  }, { once:true });

  function appendScript(src){
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.onerror=()=>WARN('Modul konnte nicht geladen werden:',src);
    (document.head||document.documentElement).appendChild(s);
    return s;
  }

  // Guards müssen VOR SaveGame V2 registriert sein, damit Restore-/Save-Events
  // sicher abgefangen werden. Sie warten intern auf die später geladenen Systeme.
  appendScript('core/sa04.runtime-guards.js?v=26.08.28-sa04-1');
  appendScript('core/savegame-v2-uid-guard.js?v=26.08.27-sa04-1');
  appendScript('core/savegame-v2.js?v=26.08.27-sa04-2');
})();