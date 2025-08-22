/* ============================================================================
 * boot.js — Siedler‑Mini
 * Initialisiert die UI exakt EIN MAL, verdrahtet Buttons,
 * zeigt Quick‑Diag an und loggt „UI bereit.“ genau einmal.
 * Kein eigener Cache‑Bust, keine Auto‑Start-Dopplung.
 * ========================================================================== */

(() => {
  // Doppelte Ausführung verhindern (z. B. doppelt eingebunden)
  if (window.__BOOT_INIT_DONE__) return;
  window.__BOOT_INIT_DONE__ = true;

  const $  = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // Busy‑Guard für lokale Aktionen (zusätzlich zum Guard in game.js)
  let busy = false;
  const guard = (fn) => async (...a) => {
    if (busy) return;
    busy = true;
    try { await fn(...a); }
    finally { busy = false; }
  };

  const doStart  = guard(async () => $('#btnStart')?.click());
  const doReload = guard(async () => $('#btnReload')?.click());

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

  window.addEventListener('DOMContentLoaded', () => {
    // Panel sichtbar machen
    const panel = $('#startPanel'); if (panel) panel.hidden = false;

    // Buttons: NICHT doppelt verdrahten
    const bStart = $('#btnStart');   if (bStart && !bStart.__wired__)   { bStart.__wired__   = true; }
    const bReload= $('#btnReload');  if (bReload && !bReload.__wired__) { bReload.__wired__  = true; }
    const bFull  = $('#btnFull');    if (bFull && !bFull.__wired__)     { bFull.__wired__    = true; on(bFull,  'click', () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
    });}
    const bDbg   = $('#btnDebug');   if (bDbg && !bDbg.__wired__)       { bDbg.__wired__     = true; on(bDbg,   'click', () => {
      const di = document.getElementById('devInspector');
      if (!di) return;
      const min = di.classList.contains('min');
      window.DevInspector?.setMinimized(!min);
    });}
    const bSave  = $('#btnSaveDbg'); if (bSave && !bSave.__wired__)     { bSave.__wired__    = true; on(bSave,  'click', () => {
      if (typeof window.saveDebugLog === 'function') return window.saveDebugLog();
      const txt = document.querySelector('#diLogPre')?.textContent || '';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], {type:'text/plain'}));
      a.download = 'siedler-mini-debug.txt';
      a.click(); URL.revokeObjectURL(a.href);
    });}

    // Quick‑Diag initial
    paintDiag();

    // Optionaler Auto‑Start: via Query (?autostart=1) ODER Checkbox
    const qsAuto   = new URLSearchParams(location.search).get('autostart');
    const autoFlag = (qsAuto === '1' || qsAuto === 'true') || !!$('#autoStart')?.checked;
    if (autoFlag) setTimeout(() => $('#btnStart')?.click(), 0);

    // „UI bereit.“ genau ein Mal loggen
    if (!window.__BOOT_UI_LOGGED__) {
      console.log('[boot] UI bereit.');
      window.__BOOT_UI_LOGGED__ = true;
    }
  });
})();
