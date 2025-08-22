// Siedler‑Mini V15.0.0 (UMD) — BOOT/GLUE
// - Kein ES-Import; verdrahtet DOM ↔ window.GameLoader / UI-Events
// - Vollbild, Debug-Toggle, Toasts, Versions-/Cachebusting

(() => {
  const VERSION = '15.0.0';
  const BUST = (() => {
    // kurze Build-ID für Cachebusting (YYYYMMDD-HHMM)
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  })();

  const $ = sel => document.querySelector(sel);

  // DOM-Refs (IDs aus index.html)
  const btnStart = $('#btnStart');
  const btnReload = $('#btnReload');
  const btnDebug = $('#btnDebug');          // Debug-Overlay an/aus
  const btnSaveDebug = $('#btnSaveDebug');  // Debug-Log speichern
  const btnFullscreen = $('#btnFullscreen');
  const mapSelect = $('#mapSelect');
  const autoStart = $('#autoStart');
  const debugOverlay = $('#debugOverlay');

  // --- kleine Helpers ---
  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.position = 'fixed';
      t.style.left = '50%';
      t.style.bottom = '14px';
      t.style.transform = 'translateX(-50%)';
      t.style.background = '#122131';
      t.style.border = '1px solid #1e2d42';
      t.style.borderRadius = '10px';
      t.style.color = '#cfe3ff';
      t.style.padding = '8px 12px';
      t.style.boxShadow = '0 10px 40px rgba(0,0,0,.35)';
      t.style.display = 'none';
      t.style.zIndex = '9999';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.style.display = 'none'), 4200);
  }

  // Globale JS‑Fehler -> Toast
  window.addEventListener('error', e => toast('JS-Fehler: ' + (e.message || e.error || e)));
  window.addEventListener('unhandledrejection', e => toast('Promise-Fehler: ' + (e.reason?.message || e.reason)));

  // --- Debug Overlay toggle ---
  function setDebugVisible(on) {
    document.body.classList.toggle('debug-on', !!on);
    localStorage.setItem('sm:debugOn', on ? '1' : '0');
    if (typeof window.setDebug === 'function') {
      window.setDebug(on ? `[Boot ${VERSION}] Debug aktiv …` : '');
    } else if (debugOverlay) {
      debugOverlay.style.display = on ? 'block' : 'none';
      debugOverlay.textContent = on ? `[Boot ${VERSION}] Debug aktiv …` : '';
    }
  }
  function getDebugVisible() {
    return localStorage.getItem('sm:debugOn') === '1';
  }

  // --- Vollbild ---
  function isFS() { return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement; }
  function enterFS(el) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen).call(el);
  }
  function exitFS() {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || document.mozCancelFullScreen).call(document);
  }

  // --- Events an game.js (UI-Brücke, ohne Import) ---
  function startSelectedMap() {
    const url = mapSelect?.value;
    if (!url) return;
    // a) öffentliche API, falls vorhanden
    if (window.GameLoader && typeof window.GameLoader.start === 'function') {
      window.GameLoader.start(url);
    }
    // b) zusätzlich Event, falls jemand darauf hört
    window.dispatchEvent(new CustomEvent('ui:start', { detail: { map: url }}));
  }

  // --- Buttons verdrahten ---
  btnStart?.addEventListener('click', startSelectedMap);

  btnReload?.addEventListener('click', () => {
    // Seite hart neu laden mit Versionsbust
    const u = new URL(location.href);
    u.searchParams.set('v', `${VERSION}-${BUST}`);
    location.replace(u.toString());
  });

  btnDebug?.addEventListener('click', () => setDebugVisible(!getDebugVisible()));

  // F2 auch als Toggle
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2') setDebugVisible(!getDebugVisible());
  });

  btnSaveDebug?.addEventListener('click', () => {
    if (window.SM_DEBUG?.saveLog) window.SM_DEBUG.saveLog();
    else {
      // Fallback: Overlay-Inhalt speichern
      const txt = debugOverlay?.textContent || '[kein Debug verfügbar]';
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `siedler-mini-debug-${Date.now()}.txt`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  btnFullscreen?.addEventListener('click', () => {
    if (isFS()) exitFS(); else enterFS(document.documentElement);
  });

  // Map-Auswahl & Autostart merken
  mapSelect?.addEventListener('change', () => localStorage.setItem('sm:lastMap', mapSelect.value));
  autoStart?.addEventListener('change', () => localStorage.setItem('sm:autoStart', autoStart.checked ? '1' : '0'));

  // Startwerte aus LocalStorage
  (function restore() {
    const last = localStorage.getItem('sm:lastMap');
    if (last && mapSelect) {
      const has = [...mapSelect.options].some(o => o.value === last);
      if (has) mapSelect.value = last;
    }
    setDebugVisible(getDebugVisible());
    if (autoStart?.checked || localStorage.getItem('sm:autoStart') === '1') {
      if (autoStart) autoStart.checked = true;
      // kleiner Delay, damit game.js schon hängt
      setTimeout(startSelectedMap, 80);
    }
  })();

  // Versions‑Banner ins Debug
  if (typeof window.setDebug === 'function') {
    window.setDebug(`[Boot ${VERSION}] bereit (${BUST})`);
  }
})();
