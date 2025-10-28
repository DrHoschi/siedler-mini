/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-bind4a
 * Zweck   : Zahnrad/Hotkey -> NUR req:insp:toggle senden (robust, iOS-freundlich)
 * ============================================================================ */
(function(){
  'use strict';
  const MOD = '[insp-bind]';
  const log = (t)=> (window.CBLog?.info||console.log)(MOD, t);

  const TOGGLE_EVT = ()=> window.dispatchEvent(new CustomEvent('req:insp:toggle'));

  function bindButton(btn){
    if (!btn || btn.__inspBound) return;
    btn.__inspBound = true;

    // iOS: touchend -> Click-Shim, damit kein „hängender“ Pointerzustand entsteht
    btn.addEventListener('touchend', (e)=>{ e.preventDefault(); e.stopPropagation(); TOGGLE_EVT(); }, { passive:false });
    btn.addEventListener('click',    (e)=>{ e.preventDefault(); e.stopPropagation(); TOGGLE_EVT(); }, { passive:false });
    log('Button gebunden');
  }

  function tryBind(){
    // Deine gängigen Targets:
    bindButton(document.getElementById('btn-inspector')
            || document.querySelector('[data-action="inspector-toggle"]')
            || document.querySelector('#hud-root [data-inspector]'));
  }

  // Hotkey (optional): F10 toggelt
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'F10'){ e.preventDefault(); TOGGLE_EVT(); }
  }, { passive:false });

  // Erst binden, dann auf spätere DOM-Änderungen lauschen
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', tryBind, { once:true });
  } else {
    tryBind();
  }

  // Falls Button später gerendert wird (HUD/UI), binden wir nach
  const mo = new MutationObserver(()=> tryBind());
  mo.observe(document.documentElement, { subtree:true, childList:true });

  log('bereit v25.10.31-bind4a');
})();
