/* ============================================================================
 * Datei   : ui/inspector/inspector.force-close.hotfix.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-hotfix2
 * Zweck   : Robustes SCHLIESSEN (X + Zahnrad + Events) ohne Re-Open-Loop
 *           - "Close-Guard" blockt Re-Open für 250 ms
 *           - Entfernt Body-Flags + Host .open + erzwungene Inline-Styles
 *           - Greift nicht in bestehende Module ein (reine Ergänzung)
 * ============================================================================ */
(() => {
  'use strict';
  const MOD = '[insp-hotfix]';
  const log  = (m,...a)=> (window.CBLog?.info||console.log).call(console, MOD, m, ...a);

  const $ = s => document.querySelector(s);
  const getHost = () => $('#inspector') || $('#inspector-overlay');
  const isOpen  = () => document.body.classList.contains('is-inspector') ||
                        getHost()?.classList.contains('open');

  // Re-Open-Blocker (Zeitfenster, in dem kein Open akzeptiert wird)
  function setCloseGuard(){
    window.__inspClosingUntil = Date.now() + 250; // 250 ms blocken
  }
  function openAllowed(){
    return !(window.__inspClosingUntil && Date.now() < window.__inspClosingUntil);
  }

  // Hard-Close: wirklich ALLES weg, was offen hält
  function hardCloseNow(){
    setCloseGuard();

    // 1) Body-Flags
    document.body.classList.remove('is-inspector','inspector-open');

    // 2) Host-Flags + Inline-Styles (falls Safety-CSS/Bridge etwas erzwungen hat)
    const h = getHost();
    if (h){
      h.classList.remove('open');
      h.removeAttribute('hidden');
      h.style.removeProperty('display');
      h.style.removeProperty('visibility');
      h.style.removeProperty('opacity');
      h.style.removeProperty('pointer-events');
    }

    log('Hard close ausgeführt (Flags & Styles entfernt).');
  }

  // Delegation: X im Inspector schließt immer hard
  document.addEventListener('click', (ev) => {
    const closeBtn = ev.target.closest?.('#inspector .insp-close, #inspector-overlay .insp-close');
    if (!closeBtn) return;
    ev.preventDefault();
    ev.stopPropagation();
    hardCloseNow();
  }, { passive:false });

  // Events, die ein Close bedeuten, schließen ebenfalls hard
  window.addEventListener('req:insp:close',  hardCloseNow, { passive:true });
  window.addEventListener('cb:insp:close',   hardCloseNow, { passive:true });
  window.addEventListener('cb:inspector:close', hardCloseNow, { passive:true });

  // ESC → Close (falls nicht schon woanders behandelt)
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isOpen()){
      ev.preventDefault();
      hardCloseNow();
    }
  }, { passive:false });

  // Open-Filter: blocke Re-Open direkt nach dem Schließen (Bridge/Core)
  // Wir fangen die gängigen Open-Events ab und lassen sie nur durch, wenn erlaubt.
  function guardOpenEvent(ev){
    if (openAllowed()) return;     // ok, nichts zu tun
    ev.stopImmediatePropagation(); // blocken
    log('Open geblockt (Close-Guard aktiv).');
  }
  ['req:insp:open','cb:insp:open','inspector:ready'].forEach(evt => {
    window.addEventListener(evt, guardOpenEvent, true); // Capture-Phase -> früh bremsen
  });

  // Zusätzlich: globaler Hook – falls jemand UIInspector.open(...) direkt ruft
  // (wir überschreiben NICHT, wir wickeln nur sanft drum herum)
  if (window.UIInspector && !window.UIInspector.__guardWrapped){
    const origOpen = window.UIInspector.open?.bind(window.UIInspector);
    if (origOpen){
      window.UIInspector.open = function guardedOpen(tabKey){
        if (!openAllowed()){
          log('UIInspector.open geblockt (Close-Guard aktiv).');
          return;
        }
        return origOpen(tabKey);
      };
      window.UIInspector.__guardWrapped = true;
      log('Open-Guard für UIInspector.open aktiv.');
    }
  }

  log('Force-Close-Hotfix aktiv (v25.10.31-hotfix2).');
})();
