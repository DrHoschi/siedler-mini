/* ============================================================================
 * game.js — Siedler‑Mini • v11.1r6
 * ---------------------------------------------------------------------------
 * Features:
 *  - GameLoader.start/reload mit zentralem Cache‑Bust + Reentrancy‑Guard
 *  - startGame()/reloadGame() verändern URL NICHT mehr (kein doppelter Bust)
 *  - Einfaches Canvas‑Rendering (Grid), damit immer etwas sichtbar ist
 *  - Kamera‑API (Zoom 0.5–3.5, Position) für UI/Debug
 *  - Sauberes Logging kompatibel zu dev‑inspector + saveDebugLog()
 *  - Robust: legt #game‑Canvas an, falls nicht vorhanden
 * ========================================================================== */

(() => {
  // -------- Version/Logger ---------------------------------------------------
  const VERSION = 'v11.1r6';
  const L = {
    log : (...a) => console.log('[game]', ...a),
    info: (...a) => console.info('[game]', ...a),
    warn: (...a) => console.warn('[game]', ...a),
    err : (...a) => console.error('[game]', ...a),
  };

  // -------- Runtime State ----------------------------------------------------
  const R = (window.__GAME_RUN__ = window.__GAME_RUN__ || {
    starting   : false,                 // Start/Reload läuft?
    currentMap : null,                  // akt. Map‑URL (inkl. Cache‑Bust)
    mapData    : null,                  // geladene Map (JSON)
    canvas     : null,
    ctx        : null,
    camera     : { x:0, y:0, zoom:1 },
    tile       : 64,
    rows       : 16,
    cols       : 16,
    dpr        : window.devicePixelRatio || 1,
    rafId      : 0,
    gridColor  : 'rgba(255,255,255,0.06)',
    needsDraw  : true,
  });

  // -------- Canvas‑Setup -----------------------------------------------------
  function ensureCanvas() {
    if (R.canvas && R.ctx) return;
    let c = document.getElementById('game');              // bevorzugt #game
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'game';
      c.style.display = 'block';
      c.style.width = '100vw';
      c.style.height = '100vh';
      document.body.appendChild(c);
    }
    R.canvas = c;
    R.ctx = c.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const cssW = Math.max(1, R.canvas.clientWidth  || window.innerWidth);
    const cssH = Math.max(1, R.canvas.clientHeight || window.innerHeight);
    const W = Math.floor(cssW * R.dpr);
    const H = Math.floor(cssH * R.dpr);
    if (R.canvas.width !== W || R.canvas.height !== H) {
      R.canvas.width  = W;
      R.canvas.height = H;
      R.needsDraw = true;
    }
  }

  // -------- Kamera‑API -------------------------------------------------------
  const Camera = {
    setZoom(z) {
      const clamped = Math.max(0.5, Math.min(3.5, Number(z) || 1));
      if (clamped !== R.camera.zoom) { R.camera.zoom = clamped; R.needsDraw = true; }
    },
    setPosition(x, y) {
      x = Number.isFinite(x) ? x : 0;
      y = Number.isFinite(y) ? y : 0;
      if (x !== R.camera.x || y !== R.camera.y) { R.camera.x = x; R.camera.y = y; R.needsDraw = true; }
    }
  };

  // -------- Rendering (leichtes Grid) ---------------------------------------
  function render() {
    R.rafId = window.requestAnimationFrame(render);
    if (!R.needsDraw || !R.ctx) return;
    R.needsDraw = false;

    const { ctx, canvas, camera, gridColor, tile, rows, cols } = R;
    const W = canvas.width, H = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c1b2b';
    ctx.fillRect(0, 0, W, H);

    ctx.translate(W/2, H/2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const worldW = cols * tile;
    const worldH = rows * tile;

    // Rahmen
    ctx.fillStyle = '#11263a';
    ctx.fillRect(-worldW/2 - tile, -worldH/2 - tile, worldW + 2*tile, worldH + 2*tile);

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / camera.zoom;
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const y = -worldH/2 + r * tile;
      ctx.moveTo(-worldW/2, y); ctx.lineTo(worldW/2, y);
    }
    for (let c = 0; c <= cols; c++) {
      const x = -worldW/2 + c * tile;
      ctx.moveTo(x, -worldH/2); ctx.lineTo(x, worldH/2);
    }
    ctx.stroke();

    ctx.restore();
  }

  function startLoop() { if (!R.rafId) R.rafId = window.requestAnimationFrame(render); }
  function stopLoop()  { if (R.rafId) cancelAnimationFrame(R.rafId); R.rafId = 0; }

  // -------- Map laden & anwenden --------------------------------------------
  async function loadMapJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Map‑Fetch fehlgeschlagen: ${res.status} ${res.statusText}`);
    return res.json();
  }

  function applyMapMeta(map) {
    R.rows = Number.isFinite(map.rows) ? map.rows : R.rows;
    R.cols = Number.isFinite(map.cols) ? map.cols : R.cols;
    R.tile = Number.isFinite(map.tile) ? map.tile : R.tile;

    // Kamera grob zentrieren
    Camera.setZoom(1.0);
    Camera.setPosition((R.cols * R.tile)/2, (R.rows * R.tile)/2);
    R.needsDraw = true;
  }

  // -------- Start/Reload (ohne eigenen Bust) --------------------------------
  async function startGame(mapUrl) {
    try {
      ensureCanvas();
      L.log('Lade Map:', mapUrl);
      const map = await loadMapJson(mapUrl);
      R.mapData = map;
      applyMapMeta(map);
      L.log('Map OK:', map);
      startLoop();
      L.log('gestartet •', mapUrl);
    } catch (e) {
      L.err('Start fehlgeschlagen:', e);
      throw e;
    }
  }

  async function reloadGame(mapUrl) {
    try {
      ensureCanvas();
      L.log('Reload •', mapUrl);
      stopLoop();
      const map = await loadMapJson(mapUrl);
      R.mapData = map;
      applyMapMeta(map);
      startLoop();
      L.log('Reload OK •', mapUrl);
    } catch (e) {
      L.err('Reload fehlgeschlagen:', e);
      throw e;
    }
  }

  // -------- Zentraler Loader (einziger Ort mit Cache‑Bust) ------------------
  function withBust(url) {
    const u = new URL(url, location.href);
    u.searchParams.set('v', Date.now().toString());
    return u.pathname + u.search;
  }

  window.GameLoader = {
    async start(mapUrl) {
      if (!mapUrl) throw new Error('Keine Map‑URL übergeben');
      if (R.starting) { L.warn('Start ignoriert (busy)'); return; }
      R.starting = true;
      try {
        const finalUrl = withBust(mapUrl);
        R.currentMap = finalUrl;
        L.log('Starte Karte:', finalUrl);
        await startGame(finalUrl);           // HIER kein weiterer Bust
      } finally {
        R.starting = false;
      }
    },
    async reload(mapUrl) {
      if (R.starting) { L.warn('Reload ignoriert (busy)'); return; }
      R.starting = true;
      try {
        const base = mapUrl || R.currentMap || 'assets/maps/map-demo.json';
        const finalUrl = withBust(base);
        R.currentMap = finalUrl;
        L.log('Reload Karte:', finalUrl);
        await reloadGame(finalUrl);          // HIER kein weiterer Bust
      } finally {
        R.starting = false;
      }
    }
  };

  // -------- Kleine Kamera‑API -----------------------------------------------
  window.GameCamera = {
    setZoom: Camera.setZoom,
    setPosition: Camera.setPosition,
  };

  // -------- Initial‑Log (nur EINMAL pro Laden) ------------------------------
  L.log('bereit •', VERSION);
})();
