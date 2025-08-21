/* boot.js  —  Siedler‑Mini  (dockbares UI, Debug‑Overlay, Map‑Loader)
   ──────────────────────────────────────────────────────────────────
   Features:
   • Fixes UI-Panel unten‑links (zoomt NICHT mit)
   • Debug-Overlay oben‑links (togglebar)
   • Query‑Params:  ?map=…  und  ?autostart=1|0
   • Autostart Toggle
   • Sauberes Logging (boot:, ui:, map:, diag:)
   • Canvas‑Resize mit DPR
   • Nur Canvas fängt Wheel/Pinch ab (kein Browser‑Zoom)
   • Map‑Laden via CustomEvent + Fallback auf window.Game.loadMap/start
*/

(() => {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────────
  // Kurz-Helfer
  const $ = (sel) => document.querySelector(sel);
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  // Log mit Kanal
  const log = {
    boot:  (...a) => console.log('%c[boot]',  'color:#9fd;font-weight:600', ...a),
    ui:    (...a) => console.log('%c[ui]  ',  'color:#adf', ...a),
    map:   (...a) => console.log('%c[map] ',  'color:#cfa', ...a),
    diag:  (...a) => console.log('%c[diag]',  'color:#bbb', ...a),
    warn:  (...a) => console.warn('%c[warn]', 'color:#fb6', ...a),
    err:   (...a) => console.error('%c[ERR]', 'color:#f88', ...a),
  };

  // ────────────────────────────────────────────────────────────────────────────
  // DOM-Refs
  const canvas       = $('#stage');
  const uiPanel      = $('#ui');
  const btnStart     = $('#btnStart');
  const btnReload    = $('#btnReload');
  const selMap       = $('#selMap');
  const chkAutostart = $('#chkAutostart');
  const btnDebug     = $('#btnDebug');
  const dbgBox       = $('#debug-overlay');

  if (!canvas) { log.err('Canvas #stage nicht gefunden.'); return; }

  // Public Debug-API für game.js
  window.setDebug = function setDebug(text) {
    if (dbgBox) dbgBox.textContent = text || '';
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Maps registrieren (passe hier an, wenn du neue Dateien hinzufügst)
  const MAPS = [
    { label: 'map-demo.json',          url: 'assets/maps/map-demo.json' },
    { label: 'map-pro.json',           url: 'assets/maps/map-pro.json' },
    { label: 'map-checker (16×16)',    url: 'assets/maps/map-checker-16x16.json' },
  ];

  // Dropdown befüllen, falls leer
  if (selMap && selMap.options.length === 0) {
    MAPS.forEach(m => {
      const o = document.createElement('option');
      o.value = m.url;
      o.textContent = m.label;
      selMap.appendChild(o);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Query-Params
  const urlParams = new URLSearchParams(location.search);
  const qpMap      = urlParams.get('map');              // relative URL zur Map
  const qpAutostart= urlParams.get('autostart');        // "1" | "0"
  const qpBust     = Date.now().toString();             // einfacher Bust

  if (qpMap && selMap) {
    // Versuch, die selektierte Option auf Query-Map zu setzen (oder adhoc hinzufügen)
    const exists = [...selMap.options].some(o => o.value === qpMap);
    if (!exists) {
      const o = document.createElement('option');
      o.value = qpMap;
      o.textContent = qpMap.split('/').pop();
      selMap.appendChild(o);
    }
    selMap.value = qpMap;
  }

  if (chkAutostart && qpAutostart !== null) {
    chkAutostart.checked = qpAutostart === '1';
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Canvas‑Resize mit DPR
  const state = {
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
    width: 0,
    height: 0,
    running: false,
    debugVisible: true,
  };

  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    state.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = Math.floor(r.width  * state.dpr);
    const h = Math.floor(r.height * state.dpr);
    if (w !== state.width || h !== state.height) {
      state.width = w; state.height = h;
      canvas.width  = w;
      canvas.height = h;
      // CSS Größe bleibt visuell: vollflächig (per CSS)
      dispatch('app:resize', { width: w, height: h, dpr: state.dpr });
      log.boot(`Canvas resized → ${w}×${h} (DPR=${state.dpr})`);
    }
  }

  // Fullscreen‑Canvas (füllt Viewport)
  function fitCanvasToViewport() {
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
  }

  fitCanvasToViewport();
  resizeCanvas();
  on(window, 'resize',  resizeCanvas);
  on(window, 'orientationchange',  () => setTimeout(resizeCanvas, 50));

  // ────────────────────────────────────────────────────────────────────────────
  // Gesten: Nur Canvas, kein Browser‑Zoom/Scroll
  ['gesturestart','gesturechange','gestureend'].forEach(ev =>
    document.addEventListener(ev, e => e.preventDefault(), { passive:false })
  );

  // Wheel unterbinden (Seite scrollt nicht)
  on(canvas, 'wheel', (e) => {
    e.preventDefault();
    // Reiche ans Spiel weiter
    dispatch('app:wheel', { deltaY: e.deltaY, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey });
  }, { passive:false });

  // Touch‑Gesten weiterreichen (Panning/Pinch handled by game.js)
  on(canvas, 'touchstart', (e) => { e.preventDefault(); dispatch('app:touchstart', e); }, { passive:false });
  on(canvas, 'touchmove',  (e) => { e.preventDefault(); dispatch('app:touchmove',  e); }, { passive:false });
  on(canvas, 'touchend',   (e) => { e.preventDefault(); dispatch('app:touchend',   e); }, { passive:false });

  // Maus‑Panning weiterreichen
  on(canvas, 'mousedown', (e) => dispatch('app:mousedown', e));
  on(window, 'mousemove', (e) => dispatch('app:mousemove', e));
  on(window, 'mouseup',   (e) => dispatch('app:mouseup',   e));

  // ────────────────────────────────────────────────────────────────────────────
  // UI‑Events
  on(btnReload, 'click', () => {
    // Bust‑Param neu setzen, damit GitHub‑Cache sicher umgangen wird
    const u = new URL(location.href);
    u.searchParams.set('bust', qpBust);
    location.replace(u.toString());
  });

  on(btnStart, 'click', () => {
    const url = selMap?.value || 'assets/maps/map-demo.json';
    startGame(url);
  });

  on(selMap, 'change', () => {
    if (state.running) {
      startGame(selMap.value);
    }
  });

  on(chkAutostart, 'change', () => {
    localStorage.setItem('autostart', chkAutostart.checked ? '1' : '0');
  });

  on(btnDebug, 'click', () => {
    state.debugVisible = !state.debugVisible;
    if (dbgBox) dbgBox.style.display = state.debugVisible ? 'block' : 'none';
    dispatch('app:debug-toggle', { visible: state.debugVisible });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Start/Map‑Load
  function startGame(mapUrl) {
    const bustUrl = addBust(mapUrl);
    state.running = true;
    log.ui('Start gedrückt →', bustUrl);

    // an Spiel weiterreichen:
    // 1) CustomEvent (sauber entkoppelt)
    dispatch('app:start', { mapUrl: bustUrl });

    // 2) Fallbacks, falls game.js direkt API erwartet
    if (window.Game && typeof window.Game.loadMap === 'function') {
      window.Game.loadMap(bustUrl);
    }
    if (window.Game && typeof window.Game.start === 'function') {
      window.Game.start();
    }
  }

  function addBust(url) {
    try {
      const u = new URL(url, location.href);
      u.searchParams.set('v', Date.now().toString());
      return u.pathname + u.search;
    } catch {
      // relative Pfade (z.B. assets/maps/x.json)
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}v=${Date.now()}`;
    }
  }

  function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Autostart-Logik
  const lsAutostart = localStorage.getItem('autostart');
  if (chkAutostart && lsAutostart !== null) {
    chkAutostart.checked = lsAutostart === '1';
  }

  // Beim ersten Load: Default Map selektieren (falls nichts gesetzt)
  if (selMap && !selMap.value) {
    selMap.value = MAPS[0]?.url ?? 'assets/maps/map-demo.json';
  }

  // Query‑Autostart oder Checkbox
  const shouldAutostart =
    (chkAutostart && chkAutostart.checked) ||
    qpAutostart === '1';

  if (shouldAutostart) {
    setTimeout(() => {
      const url = selMap?.value || 'assets/maps/map-demo.json';
      log.boot('Autostart…', url);
      startGame(url);
    }, 50);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Initiale Diagnostics
  (function bootDiag() {
    const info = {
      page: location.href,
      dpr: state.dpr,
      safeArea: {
        top: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)'),
        bottom: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)'),
      }
    };
    log.boot('Init OK');
    log.diag(info);
  })();

})();
