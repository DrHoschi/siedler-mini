/* ============================================================================
 * Datei    : core/boot-v1.js
 * Projekt  : Neue Siedler
 * Version  : v26.08.31-sa04-continue-gate14
 * Zweck    : 3-Gate-Boot + SA-04 SaveGame-V2-Gate + Runtime-/Production-Guards.
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[boot]';
  if (window.__BOOT_SINGLETON__) { console.info(TAG,'bereits init – skip'); return; }
  window.__BOOT_SINGLETON__ = true;
  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const state={version:'v26.08.31-sa04-continue-gate14',userReady:false,assetsReady:false,registryReady:false,saveV2Ready:false,continuePrepared:false,started:false,mode:null};
  window.BootState=state; INFO('BootManager initialisiert',state.version);
  function emit(name,detail={}){try{dispatchEvent(new CustomEvent(name,{detail}));}catch(_){}}
  function maybeStart(){
    if(state.started)return;
    const blocked=state.mode==='continue'&&!state.continuePrepared;
    if(!state.userReady||!state.assetsReady||!state.registryReady||!state.saveV2Ready||blocked)return;
    state.started=true;emit('cb:game:start',{mode:state.mode||'new'});INFO('cb:game:start emittiert',state.mode||'new');
  }
  function prepareContinue(){
    if(!state.saveV2Ready||!window.SaveGameV2)return false;
    const r=window.SaveGameV2.prepareContinue({slot:'autosave'});
    if(!r?.ok){state.continuePrepared=false;state.userReady=false;state.mode=null;emit('cb:game:continue:blocked',{reason:'no-valid-save-v2',message:r?.message||'Kein gültiger Spielstand'});return false;}
    state.continuePrepared=true;return true;
  }
  function onUserRequest(mode){state.userReady=true;state.mode=mode||'new';if(state.mode==='continue'&&state.saveV2Ready&&!prepareContinue())return;maybeStart();}
  addEventListener('req:game:start',()=>onUserRequest('new'));
  addEventListener('req:game:continue',()=>onUserRequest('continue'));
  addEventListener('cb:assets-ready',()=>{state.assetsReady=true;maybeStart();},{once:true});
  addEventListener('cb:registry:ready',()=>{state.registryReady=true;maybeStart();},{once:true});
  addEventListener('cb:savegame:v2:ready',()=>{state.saveV2Ready=true;if(state.userReady&&state.mode==='continue'&&!prepareContinue())return;maybeStart();},{once:true});
  function appendScript(src){const s=document.createElement('script');s.src=src;s.async=false;s.onerror=()=>WARN('Modul konnte nicht geladen werden:',src);(document.head||document.documentElement).appendChild(s);return s;}
  appendScript('core/sa04.runtime-guards.js?v=26.08.28-sa04-1');
  appendScript('core/sa04.production-bridge.js?v=26.08.30-hunter-stock');
  appendScript('core/sa04.pause-builder-fixes.js?v=26.08.31-sa04-builder-recovery2');
  appendScript('core/sa04.worker-pause-hunter.js?v=26.08.30-sa04-worker4');
  appendScript('core/sa04.hunter-production-fix.js?v=26.08.31-sa04-hunter-prod1');
  appendScript('core/sa04.hunter-entry-fix.js?v=26.08.31-sa04-hunter-entry1');
  appendScript('core/sa04.resource-piles.js?v=26.08.31-sa04-piles2');
  appendScript('core/sa04.stock-persistence.js?v=26.08.31-sa04-stock-save1');
  appendScript('core/sa04.housing-residents.js?v=26.08.31-sa04-housing1');
  appendScript('core/sa04.housing-taxes.js?v=26.08.31-sa04-tax1');
  appendScript('core/sa04.housing-menu.js?v=26.08.31-sa04-housing-menu2');
  appendScript('core/savegame-v2-uid-guard.js?v=26.08.27-sa04-1');
  appendScript('core/savegame-v2.js?v=26.08.27-sa04-2');
})();