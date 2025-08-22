/* ============================================================================
 * boot.js  —  Siedler‑Mini
 * Aufgabe:
 *   • UI initialisieren (Buttons verdrahten) – exakt EIN Mal
 *   • Start/Reload sicher auslösen (keine Doppel-Starts)
 *   • Quick‑Diag im Startpanel anzeigen
 *   • KEIN eigener Cache‑Bust (macht GameLoader in game.js)
 *
 * Abhängigkeiten:
 *   • index.html stellt die Elemente (#stage, #startPanel, Buttons) bereit
 *   • game.js exportiert window.GameLoader und optional GameCamera
 *   • debug.js/dev-inspector.js können vorab geladen sein (optional)
 * ========================================================================== */

(() => {
  // Mehrfach‑Einbindung abfangen (z. B. wenn boot.js versehentlich 2x eingebunden wird)
  if (window.__BOOT_INIT_DONE__) {
    // Optional: nur einmal loggen
    if (!window.__BOOT_INIT_LOGGED__) {
      console.log('[boot] bereits initialisiert – überspringe zweiten Lauf.');
      window.__BOOT_INIT_LOGGED__ = true;
    }
    return;
  }
  window.__BOOT_INIT_DONE__ = true;

  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // Einmaliger Busy‑Guard gegen Doppelklicks
  let busy = false;
  function guard(fn) {
    return async (...args) => {
      if (busy) return;
      busy = true;
      try { await fn(...args); }
      finally { busy = false; }
    };
  }

  // Start/Reload‑Aktionen – immer über GameLoader,
  // der intern Reentrancy + Cache‑Bust handhabt
  const doStart = guard(async () => {
    const map = $('#mapSelect')?.value || 'assets/maps/map-demo.json';
    if (!window.GameLoader?.start) throw new Error('GameLoader.start fehlt');
    console.log('[boot] Start Game', map);
    // Button kurz deaktivieren (UI Feedback)
    if ($('#btnStart')) $('#btnStart').disabled = true;
    try { await window.GameLoader.start(map); }
    finally { if ($('#btnStart')) $('#btnStart').disabled = false; }
  });

  const doReload = guard(async () => {
    const map = $('#mapSelect')?.value || 'assets/maps/map-demo.json';
    console.log('[boot] Reload Game', map);
    if (window.GameLoader?.reload) return window.GameLoader.reload(map);
    if (window.GameLoader?.start)  return window.GameLoader.start(map);
    throw new Error('GameLoader.reload/start fehlt');
  });

  // Quick‑Diag in das kleine Feld im Start‑Panel schreiben
  function paintDiag() {
    const box = $('#quickDiag'); if (!box) return;
    const L = [];
    const ok = (b, t, extra='') => L.push(`[${b?'OK':'FAIL'}] ${t}${extra?(' • '+extra):''}`);
    ok(!!$('#stage'), 'Canvas #stage');
    ok(!!window.GameLoader && typeof window.GameLoader.start === 'function', 'GameLoader.start');
    ok(!!window.GameCamera, 'GameCamera');
    ok(typeof window.saveDebugLog === 'function', 'saveDebugLog()');
    const sw = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    ok(sw, 'ServiceWorker aktiv', sw?'Ja':'Nein');
    ok(true, 'Map‑URL', $('#mapSelect')?.value || '—');
    box.textContent = L.join('\n');
  }

  // DOM‑Wiring sobald die Seite bereit ist
  window.addEventListener('DOMContentLoaded', () => {
    // Panel sichtbar machen (falls hidden)
    const panel = $('#startPanel'); if (panel) panel.hidden = false;

    // Buttons nur 1x verdrahten (Wired‑Flag)
    const bStart = $('#btnStart');   if (bStart && !bStart.__wired__)   { bStart.__wired__ = true;   on(bStart, 'click', doStart); }
    const bReload= $('#btnReload');  if (bReload && !bReload.__wired__) { bReload.__wired__= true;   on(bReload,'click', doReload); }
    const bFull  = $('#btnFull');    if (bFull && !bFull.__wired__)     { bFull.__wired__  = true;   on(bFull,  'click', () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
    });}
    const bDbg   = $('#btnDebug');   if (bDbg && !bDbg.__wired__)       { bDbg.__wired__   = true;   on(bDbg,   'click', () => {
      const di = document.getElementById('devInspector');
      if (!di) return;
      const min = di.classList.contains('min');
      window.DevInspector?.setMinimized(!min);
    });}
    const bSave  = $('#btnSaveDbg'); if (bSave && !bSave.__wired__)     { bSave.__wired__  = true;   on(bSave,  'click', () => {
      if (typeof window.saveDebugLog === 'function') return window.saveDebugLog();
      // Fallback: Inspector‑Inhalt exportieren
      const txt = document.querySelector('#diLogPre')?.textContent || '';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], {type:'text/plain'}));
      a.download = 'siedler-mini-debug.txt';
      a.click(); URL.revokeObjectURL(a.href);
    });}

    // Quick‑Diag einmalig ausgeben
    paintDiag();

    // Optionaler Auto‑Start (nur 1x, wenn Checkbox gesetzt ODER ?autostart=1)
    const autoChecked = !!$('#autoStart')?.checked;
    const qsAuto = new URLSearchParams(location.search).get('autostart');
    const wantAuto = (qsAuto === '1' || qsAuto === 'true') || autoChecked;

    if (wantAuto) {
      // Selbst wenn ein anderes Script auch starten will,
      // verhindert der Guard in game.js Doppel‑Starts.
      setTimeout(() => bStart?.click(), 0);
    }

    console.log('[boot] UI bereit.');
  });
})();
