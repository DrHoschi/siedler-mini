/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-coreSM
 * Zweck   : Zentrale Zustandsmaschine für OPEN/CLOSE (einziger Autor!)
 *
 * Lauscht : req:insp:open, req:insp:close, req:insp:toggle
 * Sendet  : cb:insp:open, cb:insp:close (und Kompat: cb:inspector:open/close)
 * DOM     : setzt/entfernt NUR hier body.is-inspector / .inspector-open + host .open
 *
 * Wichtig : Andere Module (Bridge/Buttons) dürfen NICHT selbst Klassen setzen,
 *           sondern nur Requests schicken. So vermeiden wir Re-Open/Freeze.
 * ============================================================================ */
(function(){
  'use strict';

  const MOD = '[insp-core]';
  const LOGI = (window.CBLog?.info||console.log).bind(console, MOD);
  const LOGW = (window.CBLog?.warn||console.warn).bind(console, MOD);

  const $ = (s)=>document.querySelector(s);
  const host = ()=> $('#inspector') || $('#inspector-overlay');

  let isOpen = false; // einzige Wahrheitsquelle

  function applyDOM(){
    const h = host();
    // Body-Flags
    document.body.classList.toggle('is-inspector', isOpen);
    document.body.classList.toggle('inspector-open', isOpen);
    // Host-Klasse
    if (h){
      h.classList.toggle('open', isOpen);
      if (!isOpen){
        // evtl. erzwungene Styles vom Overlay o. ä. sicher entfernen
        h.removeAttribute('hidden');
        h.style.removeProperty('display');
        h.style.removeProperty('visibility');
        h.style.removeProperty('opacity');
        h.style.removeProperty('pointer-events');
      }
    }
  }

  function emit(name){
    window.dispatchEvent(new CustomEvent(name));
  }
  function emitCompatOpened(){
    emit('cb:insp:open');
    emit('cb:inspector:open'); // für overlay.hooks v1.4
  }
  function emitCompatClosed(){
    emit('cb:insp:close');
    emit('cb:inspector:close'); // für overlay.hooks v1.4
  }

  function doOpen(){
    if (isOpen) return;
    isOpen = true;
    applyDOM();
    emitCompatOpened();
    LOGI('geöffnet ✓');
  }
  function doClose(){
    if (!isOpen) return;
    isOpen = false;
    applyDOM();
    emitCompatClosed();
    LOGI('geschlossen ✓');
  }
  function doToggle(){ isOpen ? doClose() : doOpen(); }

  // ---- Eventanbindung (einziger Autor der Sichtbarkeit) ----
  window.addEventListener('req:insp:open',   doOpen,   { passive:true });
  window.addEventListener('req:insp:close',  doClose,  { passive:true });
  window.addEventListener('req:insp:toggle', doToggle, { passive:true });

  // Beim Start: sauberen Zustand herstellen (falls alte Klassen rumlagen)
  (function boot(){
    const bHas = document.body.classList.contains('is-inspector') ||
                 document.body.classList.contains('inspector-open') ||
                 host()?.classList.contains('open');
    if (bHas){
      // Normalisieren: wir übernehmen und schließen initial
      isOpen = false;
      applyDOM();
      LOGW('Startzustand bereinigt (alte Flags entfernt).');
    }
    LOGI('bereit v25.10.31-coreSM');
  })();
})();
