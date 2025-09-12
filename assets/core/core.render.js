/* assets/core/core.render.js  v17.9.4
 * Robuster Terrain-Renderer
 * - wartet auf cb:game-start
 * - lädt Frames aus tileset.terrain.json
 * - FIX B: Fallback-Pattern aus tileset.terrain.png (erstes Frame)
 * - zeichnet nur die Map-Canvas, UI bleibt unskaliert
 */
(() => {
  'use strict';

  const TAG = '[render]';
  const LOG = (...a) => console.log(TAG, ...a);
  const WARN = (...a) => console.warn(TAG, ...a);
  const ERR = (...a) => console.error(TAG, ...a);

  // --- State --------------------------------------------------------------
  let canvas, ctx, dpr = Math.max(1, window.devicePixelRatio || 1);
  let running = false;
  let rafId = 0;

  // Terrain
  let frames = null;          // aus tileset.terrain.json
  let tilesetImg = null;      // Image-Objekt aus tileset.terrain.png
  let fallbackPattern = null; // CanvasPattern (FIX B)
  let tileSize = 64;          // logical tile size (map-space)
  let gridCols = 16, gridRows = 16;

  // Kamera (liest nur, steuert nicht die UI)
  const camera = {
    x: 0, y: 0, zoom: 1.0
  };

  // Kleine Hilfe: sichere Canvas finden
  function pickCanvas() {
    // explizite IDs zuerst, dann „erstes Canvas“
    return (
      document.getElementById('map') ||
      document.getElementById('game-canvas') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Falls die Canvas per CSS auf 100% läuft, nimm das Viewportmaß
    const cssW = rect.width || window.innerWidth;
    const cssH = rect.height || window.innerHeight;
    canvas.width  = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
  }

  // --- Assets laden -------------------------------------------------------
  async function loadTilesetJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      frames   = json.frames || null;
      tileSize = (json.meta && json.meta.tileSize) || 64;
      if (json.meta && json.meta.grid) {
        gridCols = json.meta.grid.cols || gridCols;
        gridRows = json.meta.grid.rows || gridRows;
      }
      LOG('Frames verfügbar (JSON)', Object.keys(frames || {}).length);
    } catch (e) {
      WARN('Frames aus JSON nicht lesbar → nutze Fallback. Grund:', e.message);
      frames = null;
    }
  }

  function loadTilesetPng(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('PNG lädt nicht'));
      img.src = url;
    });
  }

  async function ensureAssets() {
    // Pfade wie in deinen Logs
    const jsonUrl = 'assets/tiles/tileset.terrain.json';
    const pngUrl  = 'assets/tiles/tileset.terrain.png';

    // Lade PNG zuerst (brauchen wir für beide Wege)
    try {
      tilesetImg = await loadTilesetPng(pngUrl);
      LOG('PNG geladen', pngUrl);
    } catch (e) {
      ERR('PNG konnte nicht geladen werden → keine Darstellung möglich.', e);
      return false;
    }

    // Lade Frames (optional)
    await loadTilesetJson(jsonUrl);

    // FIX B: Fallback-Pattern anlegen (erstes Sprite in der PNG)
    try {
      const off = document.createElement('canvas');
      off.width = off.height = tileSize * dpr;
      const octx = off.getContext('2d');
      // erstes Kachelbild (0,0) annehmen
      octx.drawImage(
        tilesetImg,
        0, 0, tileSize, tileSize,
        0, 0, off.width, off.height
      );
      fallbackPattern = octx.createPattern(off, 'repeat');
      LOG('Fallback-Pattern bereit.');
    } catch (e) {
      WARN('Fallback-Pattern fehlgeschlagen:', e);
      fallbackPattern = null;
    }
    return true;
  }

  // --- Zeichnen -----------------------------------------------------------
  function clear() {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function applyCamera() {
    ctx.setTransform(dpr * camera.zoom, 0, 0, dpr * camera.zoom,
                     Math.floor(-camera.x * dpr * camera.zoom),
                     Math.floor(-camera.y * dpr * camera.zoom));
  }

  function drawTerrainWithFrames() {
    // sehr einfache Demo-Matrix: fülle Bildfläche mit frame[0,0]
    // Du kannst hier später deine echte Map-Matrix einhängen.
    const key = 'terrain_r0_c0';
    const f = frames && frames[key];
    if (!f) return false;

    const cols = Math.ceil((canvas.width  / dpr) / tileSize / camera.zoom) + 2;
    const rows = Math.ceil((canvas.height / dpr) / tileSize / camera.zoom) + 2;

    const startX = Math.floor(camera.x / tileSize) * tileSize;
    const startY = Math.floor(camera.y / tileSize) * tileSize;

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const dx = startX + c * tileSize;
        const dy = startY + r * tileSize;
        ctx.drawImage(
          tilesetImg,
          f.x, f.y, f.w, f.h,
          dx, dy, tileSize, tileSize
        );
      }
    }
    return true;
  }

  function drawTerrainFallback() {
    if (!fallbackPattern) return false;
    ctx.save();
    applyCamera();
    ctx.fillStyle = fallbackPattern;
    // groß genug füllen
    const W = Math.ceil((canvas.width  / dpr) / camera.zoom) + tileSize * 2;
    const H = Math.ceil((canvas.height / dpr) / camera.zoom) + tileSize * 2;
    ctx.fillRect(camera.x - tileSize, camera.y - tileSize, W, H);
    ctx.restore();
    return true;
  }

  function renderFrame() {
    if (!running) return;
    clear();

    // Terrain
    let drawn = false;
    if (frames) {
      drawn = drawTerrainWithFrames();
    }
    if (!drawn) {
      drawn = drawTerrainFallback();
    }
    if (!drawn) {
      WARN('Nichts gezeichnet (weder Frames noch Fallback verfügbar).');
    }

    rafId = requestAnimationFrame(renderFrame);
  }

  // --- Lifecycle ----------------------------------------------------------
  async function init() {
    try {
      canvas = pickCanvas();
      if (!canvas) {
        ERR('Keine Canvas im DOM gefunden – Abbruch.');
        return;
      }
      ctx = canvas.getContext('2d');
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      const ok = await ensureAssets();
      if (!ok) return;

      start();
      LOG('Modul bereit; Loop läuft.');
    } catch (e) {
      ERR('Init-Fehler:', e);
    }
  }

  function start() {
    if (running) return;
    running = true;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(renderFrame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // Kamera-API – wird von deinem camera.js „gefüttert“
  function setCameraState({ x, y, zoom }) {
    if (typeof x === 'number')   camera.x = x;
    if (typeof y === 'number')   camera.y = y;
    if (typeof zoom === 'number') camera.zoom = Math.max(0.25, Math.min(4, zoom));
  }

  // Expose (debug)
  window.Render = { init, start, stop, setCameraState };

  // Events
  window.addEventListener('cb:game-start', () => {
    LOG('cb:game-start erhalten → init()');
    init();
  });

  LOG('Modul geladen; wartet auf cb:game-start.');
})();
