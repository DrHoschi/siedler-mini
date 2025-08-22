/* ============================================================================
 * game.js  —  Siedler‑Mini • v11.1r6
 * ----------------------------------------------------------------------------
 * Aufgaben:
 *  - Stellt startGame(url) / reloadGame(url) bereit
 *  - Zentrale GameLoader‑API mit Reentrancy‑Guard & Cache‑Bust
 *  - Einfache Kamera (zoom/position) + Canvas‑Rendering (Grid + Maprahmen)
 *  - Sauberes Logging, kompatibel zu saveDebugLog()/dev‑inspector
 * ============================================================================
 */

(() => {
  // -------- Version/Logger ---------------------------------------------------
  const VERSION = 'v11.1r6';
  const L = {
    log : (...a) => console.log('[game]', ...a),
    info: (...a) => console.info('[game]', ...a),
    warn: (...a) => console.warn('[game]', ...a),
    err : (...a) => console.error('[game]', ...a),
  };

  // -------- Globale Runtime (für Inspector & andere Module) ------------------
  const R = (window.__GAME_RUN__ = window.__GAME_RUN__ || {
    starting   : false,           // Start/Reload läuft?
    currentMap : null,            // zuletzt gestartete Map-URL (inkl. Bust)
    mapData    : null,            // geladene Map (JSON)
    canvas     : null,
    ctx        : null,
    camera     : { x:0, y:0, zoom:1 },
    tile       : 64,
    rows       : 0,
    cols       : 0,
    dpr        : window.devicePixelRatio || 1,
    rafId      : 0,               // requestAnimationFrame‑ID
    gridColor  : 'rgba(255,255,255,0.06)',
    needsDraw  : true,            // einfaches Inval‑Flag
  });

  // -------- Canvas anlegen/holen --------------------------------------------
  function ensureCanvas() {
    if (R.canvas) return;
    let c = document.getElementById('stage');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'stage';
      // Die CSS‑Größe übernimmt die Seite; wir skalieren mit DPR
      c.style.display = 'block';
      c.style.width = '100%';
      c.style.height = '100%';
      document.body.appendChild(c);
    }
    R.canvas = c;
    R.ctx = c.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const rectW = Math.max(1, R.canvas.clientWidth  || window.innerWidth);
    const rectH = Math.max(1, R.canvas.clientHeight || window.innerHeight);
    const W = Math.floor(rectW  * R.dpr);
    const H = Math.floor(rectH * R.dpr);
    if (R.canvas.width !== W || R.canvas.height !== H) {
      R.canvas.width  = W;
      R.canvas.height = H;
      R.needsDraw = true;
    }
  }

  // -------- Einfache Kamera‑API ---------------------------------------------
  const Camera = {
    setZoom(z) {
      const clamped = Math.max(0.5, Math.min(3.5, Number(z) || 1));
      if (clamped !== R.camera.zoom) {
        R.camera.zoom = clamped;
        R.needsDraw = true;
      }
    },
    setPosition(x, y) {
      x = Number.isFinite(x) ? x : 0;
      y = Number.isFinite(y) ? y : 0;
      if (x !== R.camera.x || y !== R.camera.y) {
        R.camera.x = x; R.camera.y = y;
        R.needsDraw = true;
      }
    }
  };

  // -------- Rendering (leichtgewichtiges Grid + Map‑Rahmen) -----------------
  function render() {
    R.rafId = window.requestAnimationFrame(render);
    if (!R.needsDraw || !R.ctx) return;
    R.needsDraw = false;

    const { ctx, canvas, camera, gridColor, tile, rows, cols } = R;
    const W = canvas.width, H = canvas.height;

    // Hintergrund
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c1b2b';
    ctx.fillRect(0, 0, W, H);

    // Welt‑Transform (Center + Zoom + Pan)
    ctx.translate(W/2, H/2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Grid (sichtbarer Bereich grob)
    const worldW = cols * tile;
    const worldH = rows * tile;

    // Leichter Rahmen um die Map
    ctx.fillStyle = '#11263a';
    ctx.fillRect(-worldW/2 - tile, -worldH/2 - tile, worldW + 2*tile, worldH + 2*tile);

    // Raster
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / camera.zoom;

    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const y = -worldH/2 + r * tile;
      ctx.moveTo(-worldW/2, y);
      ctx.lineTo( worldW/2, y);
    }
    for (let c = 0; c <= cols; c++) {
      const x = -worldW/2 + c * tile;
      ctx.moveTo(x, -worldH/2);
      ctx.lineTo(x,  worldH/2);
    }
    ctx.stroke();

    ctx.restore();
  }

  function startLoop() {
    if (!R.rafId) R.rafId = window.requestAnimationFrame(render);
  }
  function stopLoop() {
    if (R.rafId) cancelAnimationFrame(R.rafId);
    R.rafId = 0;
  }

  // -------- Map laden/initialisieren ----------------------------------------
  async function loadMapJson(url) {
    // WICHTIG: keinen eigenen Cache‑Bust anhängen; das macht GameLoader
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Map‑Fetch fehlgeschlagen: ${res.status} ${res.statusText}`);
    return res.json();
  }

  function applyMapMeta(map) {
    // Erwartete Felder: rows, cols, tile (Fallbacks)
    R.rows = Number.isFinite(map.rows) ? map.rows : 16;
    R.cols = Number.isFinite(map.cols) ? map.cols : 16;
    R.tile = Number.isFinite(map.tile) ? map.tile : 64;

    // Kamera grob zentrieren
    Camera.setZoom(1.0);
    Camera.setPosition( (R.cols * R.tile)/2, (R.rows * R.tile)/2 );

    R.needsDraw = true;
  }

  // -------- Öffentliche Start/Reload‑Funktionen -----------------------------
  /**
   * Startet das Spiel mit einer Map‑URL.
   * Erwartet eine „Raw“-URL (ohne eigenen Bust), Bust kommt zentral über GameLoader.
   */
  async function startGame(mapUrl) {
    try {
      ensureCanvas();
      L.log('bereit •', VERSION);

      L.log('Lade Map:', mapUrl);
      const map = await loadMapJson(mapUrl);
      R.mapData = map;

      // Map anwenden (Größe etc.)
      applyMapMeta(map);
      L.log('Map OK:', map);

      // Hier könnten später Texturen/Atlas/Units … geladen/initialisiert werden

      startLoop();
      L.log('gestartet •', mapUrl);
    } catch (e) {
      L.err('Start fehlgeschlagen:', e);
      throw e;
    }
  }

  /**
   * Lädt die aktuelle oder eine neue Map neu.
   */
  async function reloadGame(mapUrl) {
    try {
      ensureCanvas();

      const url = mapUrl || R.currentMap;
      if (!url) throw new Error('Kein Map‑Pfad für reloadGame verfügbar.');
      L.log('Reload •', url);

      stopLoop();
      const map = await loadMapJson(url);
      R.mapData = map;

      applyMapMeta(map);
      startLoop();
      L.log('Reload OK •', url);
    } catch (e) {
      L.err('Reload fehlgeschlagen:', e);
      throw e;
    }
  }

  // -------- Zentrale Loader‑API (einziger Ort mit Cache‑Bust!) --------------
  function withBust(url) {
    const u = new URL(url, location.href);
    u.searchParams.set('v', Date.now().toString());
    return u.pathname + u.search;
  }

  window.GameLoader = {
    async start(mapUrl) {
      if (R.starting) { L.warn('Start ignoriert (busy)'); return; }
      R.starting = true;
      try {
        const finalUrl = withBust(mapUrl);
        R.currentMap = finalUrl;
        L.log('Starte Karte:', finalUrl);
        await startGame(finalUrl);
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
        await reloadGame(finalUrl);
      } finally {
        R.starting = false;
      }
    }
  };

  // -------- Kleine Kamera‑API für’s UI/Debug --------------------------------
  window.GameCamera = {
    setZoom: Camera.setZoom,
    setPosition: Camera.setPosition,
  };

  // -------- Globale Hooks (für Boot/Inspector) ------------------------------
  window.startGame  = startGame;   // falls Boot direkt darauf zugreift
  window.reloadGame = reloadGame;

  // -------- Initial‑Log ------------------------------------------------------
  L.log('bereit •', VERSION);
})();
