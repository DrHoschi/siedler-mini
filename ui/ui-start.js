/* ============================================================================
 * Datei: ui/ui-start.js
 * Projekt: Neue Siedler
 * Version: v1.2.0 (2025-09-22)
 * Zweck:
 *   - Startpanel steuert Spielstart/Continue/Reset/Vollbild
 *   - Dispatch von req:game:new|continue|reset
 *   - Robuster Fallback: wenn Core kein cb:game-start liefert, emitte es selbst
 *   - Sichtbare Logs (konform zu Debug-Policy; nie entfernen)
 * Events:
 *   emit: req:game:new|continue|reset, req:ui:fullscreen, cb:ui:ready, cb:game-start (Fallback)
 *   listen: cb:assets-ready, cb:registry:ready, cb:game-start
 * ============================================================================ */

(function(){
  'use strict';
  const MOD='[ui-start]';
  const VERSION='v1.2.0';

  // ==== Helpers / Event-API ====
  const UIE = window.UIEvents;
  const emit = (name, detail)=> (UIE?.emit||((n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}))))(name, detail);
  const on   = (name, handler)=> (UIE?.on||((n,h)=>{ const fn=(e)=>h(e.detail,e); window.addEventListener(n,fn); return ()=>window.removeEventListener(n,fn);}))(name, handler);
  const log  = (...a)=> (console.log||(()=>{}))('🚀', MOD, ...a);
  const warn = (...a)=> (console.warn||(()=>{}))('⚠️', MOD, ...a);

  // ==== DOM ====
  const $panel = document.getElementById('start-panel');
  const $btnNew = document.getElementById('btn-new');
  const $btnCont = document.getElementById('btn-continue');
  const $btnReset = document.getElementById('btn-reset');
  const $btnFs = document.getElementById('btn-fullscreen');

  if(!$panel || !$btnNew || !$btnCont || !$btnReset || !$btnFs){
    warn('Start-Panel oder Buttons fehlen – prüfe index.html IDs (btn-new/continue/reset/fullscreen)');
  }

  // ==== State ====
  let coreReady = false;     // wurde cb:game-start vom Core gesendet?
  let assetsReady = false;
  let registryReady = false;

  // ==== Sichtbar, dass UI lebt ====
  emit('cb:ui:ready', { from:'ui-start', version: VERSION });
  log('bereit', VERSION);

  // ==== Core-Signale beobachten ====
  on('cb:assets-ready', ()=>{ assetsReady=true; log('assets-ready'); });
  on('cb:registry:ready', ()=>{ registryReady=true; log('registry-ready'); });
  on('cb:game-start', ()=>{ coreReady=true; log('game-start aus Core'); hidePanel(); });

  // ==== Panel-Steuerung ====
  function hidePanel(){ if($panel) $panel.style.display='none'; }
  function showPanel(){ if($panel) $panel.style.display='flex'; }

  // ==== Aktionen ====
  function startNewGame(){
    log('Neues Spiel angefordert → req:game:new');
    emit('req:game:new', {});
    // Fallback-Timer: wenn Core nicht antwortet, UI triggert cb:game-start selbst
    fallbackGameStart();
  }

  function continueGame(){
    log('Weiterspielen angefordert → req:game:continue');
    emit('req:game:continue', {});
    fallbackGameStart();
  }

  function resetGame(){
    log('Reset angefordert → req:game:reset');
    emit('req:game:reset', {});
    // Reset blendet Panel NICHT aus; Core entscheidet
  }

  function goFullscreen(){
    const el=document.documentElement;
    if(el.requestFullscreen) el.requestFullscreen();
    emit('req:ui:fullscreen', {});
    log('Fullscreen angefragt');
  }

  // ==== Fallback-Mechanik ====
  function fallbackGameStart(){
    const T1 = 250;   // kurze Wartezeit auf Core
    const T2 = 1200;  // zweite Chance
    setTimeout(()=>{
      if(coreReady) return;
      warn('Core hat cb:game-start noch nicht gesendet → Versuch 1 (UI-Fallback)');
      emit('cb:game-start', { from:'ui-start', fallback:true, t:T1 });
      hidePanel();
    }, T1);
    setTimeout(()=>{
      if(coreReady) return;
      warn('Core weiterhin still → Versuch 2 (UI-Fallback, sichtbar)');
      window.UINotify?.push?.('GameStart (Fallback) ausgelöst','info');
      emit('cb:game-start', { from:'ui-start', fallback:true, t:T2 });
      hidePanel();
    }, T2);
  }

  // ==== Button-Wiring ====
  $btnNew   && $btnNew.addEventListener('click', startNewGame);
  $btnCont  && $btnCont.addEventListener('click', continueGame);
  $btnReset && $btnReset.addEventListener('click', resetGame);
  $btnFs    && $btnFs.addEventListener('click', goFullscreen);

  // ==== ESC im Panel → schließt nicht automatisch; nur Fokussteuerung ====
  $panel && $panel.addEventListener('keydown', (ev)=>{
    if(ev.key==='Escape'){ ev.stopPropagation(); window.UINotify?.push?.('ESC im Startmenü','info'); }
  });

  // ==== Panel garantieren ====
  showPanel();

})();
