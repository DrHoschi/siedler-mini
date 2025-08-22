// boot.js — Siedler‑Mini v11.1r6 (UMD)
// - Initialisiert Canvas/Resize
// - Verdrahtet Startscreen + Toolbar
// - Schreibt Version/Boost-ID in Badge + Debug
// - Brücke zu GameLoader/GameCamera (falls vorhanden)

(function () {
  const $ = (s) => document.querySelector(s);

  // Canvas/DPR an Fenstergröße anpassen
  const canvas = $('#stage');
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  ctx.imageSmoothingEnabled = false;

  function resize() {
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const r = canvas.getBoundingClientRect();
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // UI‑Refs (Startscreen)
  const elStartScreen = $('#startScreen');
  const elMap = $('#mapSelect');
  const elAuto = $('#autoStart');
  const btnStart = $('#btnStart');
  const btnReload = $('#btnReload');
  const btnFS = $('#btnFullscreen');
  const btnDbg = $('#btnDebug');
  const btnSave = $('#saveDebugBtn');

  // Toolbar (unten)
  const badge = $('#badge');
  const tbStart = $('#tbStart');
  const tbReload = $('#tbReload');
  const tbFS = $('#tbFS');
  const tbDbg = $('#tbDbg');
  const tbSave = $('#tbSave');

  // Version/Boost-ID anzeigen
  const BUILD = (window.BUILD_ID || 'v11.1r6');
  function updateBadge() {
    if (badge) badge.textContent = `V${BUILD}`;
    if (typeof window.setDebug === 'function') {
      window.setDebug(`[Boot] bereit • ${BUILD}`);
    } else {
      const dbg = document.getElementById('debugOverlay');
      if (dbg) { dbg.style.display = 'block'; dbg.textContent = `[Boot] bereit • ${BUILD}`; }
    }
  }
  updateBadge();

  // Persistenz für Map/Autostart
  try {
    const last = localStorage.getItem('sm:lastMap');
    if (last && elMap && [...elMap.options].some(o=>o.value===last)) elMap.value = last;
    if (localStorage.getItem('sm:autoStart') === '1' && elAuto) elAuto.checked = true;
  } catch {}

  elMap?.addEventListener('change', () => { try{ localStorage.setItem('sm:lastMap', elMap.value); }catch{} });
  elAuto?.addEventListener('change', () => { try{ localStorage.setItem('sm:autoStart', elAuto.checked ? '1' : '0'); }catch{} });

  // Helpers
  function getSelectedMap() {
    return elMap?.value || 'assets/maps/map-demo.json';
  }
  function doStart() {
    const url = getSelectedMap();
    if (window.GameLoader?.start) window.GameLoader.start(url);
    // Fallback: custom Event, falls deine Logik darauf hört
    window.dispatchEvent(new CustomEvent('ui:start', { detail: { map: url } }));
    if (elStartScreen) elStartScreen.style.display = 'none';
  }
  function doReload() {
    const url = getSelectedMap();
    if (window.GameLoader?.reload) window.GameLoader.reload(url);
    else if (window.GameLoader?.start) window.GameLoader.start(url);
    window.dispatchEvent(new CustomEvent('ui:reload', { detail: { map: url } }));
  }
  function toggleDebug() {
    const on = !document.body.classList.contains('debug-on');
    document.body.classList.toggle('debug-on', on);
    if (typeof window.setDebug === 'function') {
      window.setDebug(on ? `[Boot] Debug aktiv • ${BUILD}` : '');
    }
  }
  function toggleFS() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || document.mozCancelFullScreen).call(document);
    } else {
      (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen || document.documentElement.mozRequestFullScreen).call(document.documentElement);
    }
  }

  // Buttons verdrahten (Startscreen)
  btnStart?.addEventListener('click', doStart);
  btnReload?.addEventListener('click', doReload);
  btnDbg?.addEventListener('click', toggleDebug);
  btnFS?.addEventListener('click', toggleFS);
  btnSave?.addEventListener('click', () => window.saveDebugLog?.());

  // Toolbar‑Buttons
  tbStart?.addEventListener('click', doStart);
  tbReload?.addEventListener('click', doReload);
  tbDbg?.addEventListener('click', toggleDebug);
  tbFS?.addEventListener('click', toggleFS);
  tbSave?.addEventListener('click', () => window.saveDebugLog?.());

  // Hotkeys
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2') toggleDebug();
    if (e.code === 'KeyF' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleFS(); }
  });

  // Query‑Param ?map=… / ?autostart=1 / ?debug=1
  (function applyQuery() {
    const q = new URLSearchParams(location.search);
    const map = q.get('map');
    const autostart = q.get('autostart');
    const dbg = q.get('debug');
    if (map && elMap) {
      // wenn nicht in der Liste → dynamisch ergänzen
      if (![...elMap.options].some(o => o.value === map)) {
        const opt = document.createElement('option'); opt.value = map; opt.textContent = map.split('/').pop(); elMap.appendChild(opt);
      }
      elMap.value = map;
    }
    if (dbg === '1') document.body.classList.add('debug-on');
    if (autostart === '1') { if (elAuto) elAuto.checked = true; setTimeout(doStart, 50); }
  })();

  // AutoStart aus UI
  if (elAuto?.checked) setTimeout(doStart, 60);

  // Minimaler Render‑Kick (Hintergrund), damit sofort was zu sehen ist
  requestAnimationFrame(() => {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#0b1825';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  });

  // Public shim (falls andere Teile darauf zugreifen)
  window.__GAME_STATE__ = window.__GAME_STATE__ || {
    canvas, ctx, zoom: 1, camX: 0, camY: 0, roads: [], buildings: [], width: canvas.width, height: canvas.height
  };

  console.log('[BOOT] bereit •', BUILD);
})();
<script>
// minimaler Button‑Hook (nur ausführen, wenn die IDs existieren)
(() => {
  const byId = (id) => document.getElementById(id);

  const startBtn = byId('btnStart') || byId('startBtn') || byId('start-button');
  const reloadBtn = byId('btnReload') || byId('reloadBtn');
  const mapSel = byId('mapSelect') || byId('selectMap');

  const getUrl = () => (mapSel?.value?.trim() || 'assets/maps/map-demo.json');

  startBtn && startBtn.addEventListener('click', () => {
    const url = getUrl();
    console.log('[ui] Start:', url);
    window.GameLoader?.start(url);
  });

  reloadBtn && reloadBtn.addEventListener('click', () => {
    const url = getUrl();
    console.log('[ui] Reload:', url);
    window.GameLoader?.reload(url);
  });
})();
</script>
