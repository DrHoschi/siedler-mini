/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-coreSM2
 * Zweck   : Zentrale OPEN/CLOSE-Logik (einzige Autorität)
 *
 * Lauscht : req:insp:open, req:insp:close, req:insp:toggle
 * Sendet  : cb:insp:open/close + Kompat cb:inspector:open/close
 * DOM     : setzt/entfernt body.is-inspector / .inspector-open und #inspector.open
 * ============================================================================ */
(function(){
  'use strict';

  const MOD = '[insp-core]';
  const log = (t,...a)=> (window.CBLog?.info||console.log).call(console, MOD, t, ...a);

  const $ = (s)=>document.querySelector(s);
  const host = ()=> $('#inspector') || $('#inspector-overlay');

  let openState = false; // Single Source of Truth

  function applyDOM(){
    const h = host();
    document.body.classList.toggle('is-inspector', openState);
    document.body.classList.toggle('inspector-open', openState);
    if (h){
      h.classList.toggle('open', openState);
      if (!openState){
        h.removeAttribute('hidden');
        h.style.removeProperty('display');
        h.style.removeProperty('visibility');
        h.style.removeProperty('opacity');
        h.style.removeProperty('pointer-events');
      }
    }
  }

  function emit(name){ window.dispatchEvent(new CustomEvent(name)); }
  function emitOpen(){  emit('cb:insp:open');  emit('cb:inspector:open'); }
  function emitClose(){ emit('cb:insp:close'); emit('cb:inspector:close'); }

  function doOpen(){
    if (openState) return;
    openState = true;  applyDOM(); emitOpen();  log('geöffnet ✓');
  }
  function doClose(){
    if (!openState) return;
    openState = false; applyDOM(); emitClose(); log('geschlossen ✓');
  }
  function doToggle(){ openState ? doClose() : doOpen(); }

  // Requests (einziger Ort der reagiert)
  window.addEventListener('req:insp:open',   doOpen,   { passive:true });
  window.addEventListener('req:insp:close',  doClose,  { passive:true });
  window.addEventListener('req:insp:toggle', doToggle, { passive:true });

  // Start: Alt-Flags bereinigen (sonst falscher Anfangszustand)
  (function boot(){
    const stray = document.body.classList.contains('is-inspector') ||
                  document.body.classList.contains('inspector-open') ||
                  host()?.classList.contains('open');
    if (stray){ openState = false; applyDOM(); }
    log('bereit v25.10.31-coreSM2');
  })();
})();
