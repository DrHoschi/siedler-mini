/* eslint-disable no-console */
/**
 * Core Renderer (v17.9.4)
 * - zeichnet Terrain (Tileset) + Entities
 * - konsumiert Kamera (panning/zoom) und Map
 * - FIX B: verhindert Browser-Zoom/Scroll, benutzt eigenes Kamera-Zoom
 *
 * Erwartete globale Events:
 *  - 'cb:game-start'  -> init & Render-Loop starten
 *  - 'cb:render-frame' (optional) -> einzelnes Repaint triggern
 *
 * Abhängigkeiten (müssen vorher geladen sein):
 *  - assets/core/camera.js     (stellt window.Camera bereit)
 *  - assets/core/core.map.js   (stellt window.MapData bereit)
 *  - assets/tiles/tileset.terrain.{png,json} im assets/tiles/
 */

(function () {
  const TAG = '[render]';
  const STATE = {
    started: false,
    raf: 0,
    // Canvas-Layer
    terrainCanvas: null,
    entityCanvas: null,
    tctx: null,
    ectx: null,
    // Tileset
    tilesImage: null,
    frames: null, // {key:{x,y,w,h}}
    tileSize: 64,
    gridCols: 16,
    gridRows: 16,
    // Map
    mapReady: false,
    // simple Entity-Store (Platzhalter, bis das Entities-Modul liefert)
    entities: [],
  };

  // ---------- Utilities ----------
  const on = (type, fn, opts) => window.addEventListener(type, fn, opts);
  const off = (type, fn, opts) => window.removeEventListener(type, fn, opts);

  function log(...args) { console.log(TAG, ...args); }

  function ensureLayers() {
    if (STATE.terrainCanvas) return;

    const root = document.body; // robust; wir legen Fullscreen-Canvas oben drüber
    const make = (id) => {
      const c = document.createElement('canvas');
      c.id = id;
      c.style.position = 'fixed';
      c.style.left = '0';
      c.style.top = '0';
      c.style.width = '100vw';
      c.style.height = '100vh';
      c.style.imageRendering = 'pixelated';
      c.style.pointerEvents = 'auto';
      c.style.zIndex = id === 'terrain-layer' ? '0' : '1';
      // FIX B: eigenes Input-Handling, Browser darf NICHT scrollen/zoomen
      c.style.touchAction = 'none';
      root.appendChild(c);
      return c;
    };

    STATE.terrainCanvas = make('terrain-layer');
    STATE.entityCanvas  = make('entity-layer');
    STATE.tctx = STATE.terrainCanvas.getContext('2d');
    STATE.ectx = STATE.entityCanvas.getContext('2d');

    // Size to device pixels
    const resize = () => {
      const DPR = Math.max(1, window.devicePixelRatio || 1);
      [STATE.terrainCanvas, STATE.entityCanvas].forEach((c) => {
        c.width  = Math.floor(window.innerWidth  * DPR);
        c.height = Math.floor(window.innerHeight * DPR);
        c.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
      });
      requestFrame();
    };
    on('resize', resize);
    resize();

    // ------- FIX B: Eingaben kapern & Kamera ansteuern -------
    // Mouse wheel (Desktop)
    const onWheel = (e) => {
      // Nur wenn über unseren Layern gescrollt wird:
      if (e.target !== STATE.terrainCanvas && e.target !== STATE.entityCanvas) return;
      e.preventDefault(); // verhindert Browser-Zoom/Scroll
      const delta = Math.sign(e.deltaY);
      const factor = (delta > 0) ? 0.9 : 1.1;
      if (window.Camera && typeof Camera.zoomBy === 'function') {
        Camera.zoomBy(factor, e.clientX, e.clientY);
        requestFrame();
      }
    };
    on('wheel', onWheel, { passive: false });

    // Touch: Panning (1 Finger) / Pinch (2 Finger)
    let touchPrev = null;
    let pinchPrevDist = 0;

    const getDistance = (t1, t2) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      // Nur wenn auf unseren Layern:
      if (![STATE.terrainCanvas, STATE.entityCanvas].includes(e.target)) return;

      e.preventDefault();
      if (e.touches.length === 1) {
        touchPrev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        pinchPrevDist = getDistance(e.touches[0], e.touches[1]);
      }
    };

    const onTouchMove = (e) => {
      if (![STATE.terrainCanvas, STATE.entityCanvas].includes(e.target)) return;
      if (!e.touches || e.touches.length === 0) return;

      e.preventDefault(); // FIX B: blockt Browser-Gesten
      if (e.touches.length === 1 && touchPrev) {
        const cx = e.touches[0].clientX, cy = e.touches[0].clientY;
        const dx = cx - touchPrev.x, dy = cy - touchPrev.y;
        touchPrev = { x: cx, y: cy };
        if (window.Camera && typeof Camera.panBy === 'function') {
          Camera.panBy(-dx, -dy); // invertiert = „Karte bewegen“
          requestFrame();
        }
      } else if (e.touches.length === 2) {
        const dist = getDistance(e.touches[0], e.touches[1]);
        if (pinchPrevDist > 0) {
          const factor = dist / pinchPrevDist;
          if (window.Camera && typeof Camera.zoomBy === 'function') {
            // Mittelpunkt der Finger als Zoom-Anker
            const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            Camera.zoomBy(factor, mx, my);
            requestFrame();
          }
        }
        pinchPrevDist = dist;
      }
    };

    const onTouchEnd = (e) => {
      if (![STATE.terrainCanvas, STATE.entityCanvas].includes(e.target)) return;
      e.preventDefault();
      if (e.touches.length === 0) {
        touchPrev = null;
        pinchPrevDist = 0;
      }
    };

    on('touchstart', onTouchStart, { passive: false });
    on('touchmove',  onTouchMove,  { passive: false });
    on('touchend',   onTouchEnd,   { passive: false });
    on('touchcancel',onTouchEnd,   { passive: false });
  }

  // ---------- Tileset laden (Fallback direkt aus JSON) ----------
  async function loadTilesetFrames() {
    // 1) Versuche, ob das Map/Assets-System schon Frames liefert
    if (window.Assets && Assets.frames && Assets.frames['tileset.terrain']) {
      const meta = Assets.meta?.['tileset.terrain'];
      STATE.frames   = Assets.frames['tileset.terrain'];
      STATE.tileSize = meta?.tileSize || STATE.tileSize;
      STATE.gridCols = meta?.grid?.cols || STATE.gridCols;
      STATE.gridRows = meta?.grid?.rows || STATE.gridRows;
      log('Frames aus Assets verwendet.');
      return;
    }

    // 2) Fallback: JSON direkt nachladen
    const url = 'assets/tiles/tileset.terrain.json';
    log('Tileset selbst laden:', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Tileset JSON nicht erreichbar');
    const data = await res.json();
    STATE.frames   = data.frames;
    STATE.tileSize = data.meta?.tileSize || STATE.tileSize;
    STATE.gridCols = data.meta?.grid?.cols || STATE.gridCols;
    STATE.gridRows = data.meta?.grid?.rows || STATE.gridRows;
    log('Frames verfügbar (Fallback).');

    // Lade das PNG (brauchen wir ohnehin)
    const img = new Image();
    img.src = data.meta?.image || 'assets/tiles/tileset.terrain.png';
    await img.decode().catch(() => {}); // iOS-safe
    STATE.tilesImage = img;
    log('Tileset Image bereit.');
  }

  // ---------- Map besorgen ----------
  async function ensureMap() {
    // Erwartet window.MapData mit .matrix (int indices) ODER bauen Dummy
    if (window.MapData && Array.isArray(MapData.matrix)) {
      STATE.mapReady = true;
      return;
    }

    try {
      const res = await fetch('assets/maps/map-mini.json', { cache: 'no-store' });
      const m = await res.json();
      window.MapData = m;
      STATE.mapReady = true;
    } catch (e) {
      // Fallback: kleine grüne Dummy-Matrix
      const W = 64, H = 48;
      const mat = Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
      window.MapData = { width: W, height: H, matrix: mat };
      STATE.mapReady = true;
    }
  }

  // ---------- Entities (Platzhalter-Renderer) ----------
  function hookEntityPlacement() {
    // Wir lauschen simplem CustomEvent 'cb:place-entity'
    // und der UI-Build-Brücke kann dieses Event werfen.
    on('cb:place-entity', (ev) => {
      const ent = ev?.detail;
      if (!ent) return;
      // erwartete Felder: {type:'hq'|'farm'|..., x, y} in Tile-Koordinaten
      STATE.entities.push(ent);
      requestFrame();
    });

    // Bonus: Wenn deine Build-UI nur Log schreibt (place-hq etc.),
    // geben wir eine simple API auf window.Render.place() frei,
    // damit du im devtools schnell testen kannst:
    window.Render.place = (type, x, y) => {
      STATE.entities.push({ type, x, y });
      requestFrame();
    };
  }

  // ---------- Zeichnen ----------
  function drawTerrain() {
    const { tctx, terrainCanvas: c } = STATE;
    if (!STATE.frames || !STATE.tilesImage || !STATE.mapReady || !window.MapData) return;

    tctx.clearRect(0, 0, c.width, c.height);

    // Kamera lesen
    const cam = (window.Camera && typeof Camera.getView === 'function')
      ? Camera.getView()
      : { x: 0, y: 0, scale: 1 };

    tctx.save();
    tctx.translate(-cam.x, -cam.y);
    tctx.scale(cam.scale, cam.scale);

    const T = STATE.tileSize;
    const mat = MapData.matrix;
    const rows = mat.length;
    const cols = mat[0].length;

    // Sichtfenster berechnen (einfach, robust)
    const vw = c.width  / cam.scale;
    const vh = c.height / cam.scale;
    const colStart = Math.max(0, Math.floor(cam.x / T));
    const rowStart = Math.max(0, Math.floor(cam.y / T));
    const colEnd   = Math.min(cols, Math.ceil((cam.x + vw) / T) + 1);
    const rowEnd   = Math.min(rows, Math.ceil((cam.y + vh) / T) + 1);

    for (let r = rowStart; r < rowEnd; r += 1) {
      for (let q = colStart; q < colEnd; q += 1) {
        const idx = mat[r][q] || 0; // 0 == terrain_r0_c0
        const rr = Math.floor(idx / STATE.gridCols);
        const cc = idx % STATE.gridCols;
        const key = `terrain_r${rr}_c${cc}`;
        const fr = STATE.frames[key];
        if (!fr) continue;
        tctx.drawImage(
          STATE.tilesImage,
          fr.x, fr.y, fr.w, fr.h,
          q * T, r * T, T, T
        );
      }
    }

    tctx.restore();
  }

  function drawEntities() {
    const { ectx, entityCanvas: c } = STATE;
    ectx.clearRect(0, 0, c.width, c.height);

    const cam = (window.Camera && typeof Camera.getView === 'function')
      ? Camera.getView()
      : { x: 0, y: 0, scale: 1 };

    ectx.save();
    ectx.translate(-cam.x, -cam.y);
    ectx.scale(cam.scale, cam.scale);

    const T = STATE.tileSize;
    // Platzhalter: farbige Blöcke + Label
    for (const ent of STATE.entities) {
      const { x, y, type = 'ent' } = ent; // x,y in Tile-Koordinaten
      const px = x * T;
      const py = y * T;
      ectx.fillStyle =
        type === 'hq' ? '#ffcc00' :
        type === 'farm' ? '#66cc33' :
        type === 'lumberjack' ? '#8b5a2b' :
        type === 'depot' ? '#66a3ff' :
        '#ff66aa';
      ectx.fillRect(px + 4, py + 4, T - 8, T - 8);
      ectx.fillStyle = '#111';
      ectx.font = '12px system-ui, sans-serif';
      ectx.fillText(type, px + 6, py + 16);
    }

    ectx.restore();
  }

  function frame() {
    drawTerrain();
    drawEntities();
    STATE.raf = window.requestAnimationFrame(frame);
  }
  function requestFrame() {
    if (!STATE.started) return;
    if (!STATE.raf) STATE.raf = window.requestAnimationFrame(frame);
  }

  async function init() {
    if (STATE.started) return;
    STATE.started = true;

    ensureLayers();
    try {
      await Promise.all([
        loadTilesetFrames(),
        ensureMap(),
      ]);
      hookEntityPlacement();

      // Falls Tileset-Bild noch fehlt (wenn Frames aus Assets kamen):
      if (!STATE.tilesImage) {
        const img = new Image();
        img.src = 'assets/tiles/tileset.terrain.png';
        await img.decode().catch(() => {});
        STATE.tilesImage = img;
      }

      log('bereit (v17.9.4): Tiles + Map ok, starte Loop.');
      requestFrame();
    } catch (e) {
      console.error(TAG, 'Fehler beim Init:', e);
    }
  }

  // Public API
  window.Render = {
    request: requestFrame,
    place: (...args) => window.Render.place && window.Render.place(...args),
  };

  // Event-Wiring
  on('cb:game-start', init, { once: true });
  on('cb:render-frame', () => requestFrame());

  // Dev: wenn schon spät gestartet wurde
  if (document.readyState !== 'loading') {
    // nichts – wir warten auf cb:game-start
  }
})();
