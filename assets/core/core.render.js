/* ============================================================================
 * Datei: assets/core/core.render.js
 * Version: v17.9.7
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Terrain-Renderer für Tileset (Frames optional)
 *  - FIX B: Fallback-Pattern aus tileset.terrain.png (erstes Tile)
 *  - Integration Entities/Gebäude via window.drawEntities(ctx, entitiesState?)
 *    -> sicherer Guard + Fallback-Parameter verhindert Log-Spam
 *
 * Struktur:
 *  - Konstanten/Logging → State → Hilfsfunktionen → Render-Loop → Lifecycle → Export
 * ============================================================================ */
(() => {
  'use strict';

  // ---- Logging ------------------------------------------------------------
  const TAG  = '[render]';
  const LOG  = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const OK   = (...a) => (window.CBLog?.ok    || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  // ---- State --------------------------------------------------------------
  let canvas, ctx;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  let running = false, rafId = 0;

  // Tileset + Frames
  let frames = null;          // aus tileset.terrain.json (optional)
  let tilesetImg = null;      // Image-Objekt aus tileset.terrain.png
  let fallbackPattern = null; // CanvasPattern (erstes Tile)
  let tileSize = 64;          // Map-Logik
  let gridCols = 16, gridRows = 16;

  // ---- Kamera -------------------------------------------------------------
  function readCam() {
    const cam = (window.GameCamera || {});
    return {
      x   : typeof cam.x    === 'number' ? cam.x    : 0,
      y   : typeof cam.y    === 'number' ? cam.y    : 0,
      zoom: typeof cam.zoom === 'number' ? cam.zoom : 1
    };
  }

  // ---- Canvas-Helfer ------------------------------------------------------
  function pickCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('map')  ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width  || window.innerWidth;
    const cssH = rect.height || window.innerHeight;
    canvas.width  = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
  }

  // ---- Asset-Load ---------------------------------------------------------
  async function loadTilesetJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      frames   = json.frames || null;
      tileSize = (json.meta && (json.meta.tileSize || json.meta.tile)) || tileSize;
      if (json.meta?.grid) {
        gridCols = json.meta.grid.cols || gridCols;
        gridRows = json.meta.grid.rows || gridRows;
      }
      LOG('Frames geladen:', frames ? Object.keys(frames).length : 0);
    } catch (e) {
      WARN('Frames aus JSON nicht lesbar → Fallback nutzen. Grund:', e.message);
      frames = null;
    }
  }

  function loadTilesetPng(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('PNG lädt nicht'));
      img.src = url;
    });
  }

  async function ensureAssets() {
    const jsonUrl = 'assets/tiles/tileset.terrain.json';
    const pngUrl  = 'assets/tiles/tileset.terrain.png';

    try {
      tilesetImg = await loadTilesetPng(pngUrl);
      OK('PNG geladen:', pngUrl);
    } catch (e) {
      ERR('PNG konnte nicht geladen werden – ohne PNG kein Rendern.', e);
      return false;
    }

    await loadTilesetJson(jsonUrl);

    // FIX B: Fallback-Pattern (erstes Tile oben links)
    try {
      const off  = document.createElement('canvas');
      off.width  = off.height = tileSize * dpr;
      const octx = off.getContext('2d');
      octx.drawImage(
        tilesetImg,
        0, 0, tileSize, tileSize,       // Quelle
        0, 0, off.width, off.height     // Ziel @ DPR
      );
      fallbackPattern = octx.createPattern(off, 'repeat');
      OK('Fallback-Pattern bereit.');
    } catch (e) {
      WARN('Fallback-Pattern fehlgeschlagen:', e.message);
      fallbackPattern = null;
    }

    return true;
  }

  // ---- Zeichnen -----------------------------------------------------------
  function clearCanvas() {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function applyWorldTransform(cam) {
    const s = dpr * cam.zoom;
    // Welt-Transform: erst skalieren, dann verschieben in Weltkoordinaten
    ctx.setTransform(s, 0, 0, s, Math.floor(-cam.x * s), Math.floor(-cam.y * s));
  }

  function drawTerrainWithFrames(cam) {
    // Minimal: benutze ein Referenz-Frame (kannst du später matrixbasiert erweitern)
    const key = 'terrain_r0_c0';
    const f = frames && frames[key];
    if (!f) return false;

    const cols = Math.ceil((canvas.width  / (dpr * cam.zoom)) / tileSize) + 2;
    const rows = Math.ceil((canvas.height / (dpr * cam.zoom)) / tileSize) + 2;
    const startX = Math.floor(cam.x / tileSize) * tileSize;
    const startY = Math.floor(cam.y / tileSize) * tileSize;

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const dx = startX + c * tileSize;
        const dy = startY + r * tileSize;
        ctx.drawImage(tilesetImg, f.x, f.y, f.w, f.h, dx, dy, tileSize, tileSize);
      }
    }
    return true;
  }

  function drawTerrainFallback(cam) {
    if (!fallbackPattern) return false;
    ctx.fillStyle = fallbackPattern;
    // Fläche um Kamera groß genug füllen
    const W = Math.ceil(canvas.width  / (dpr * cam.zoom)) + tileSize * 2;
    const H = Math.ceil(canvas.height / (dpr * cam.zoom)) + tileSize * 2;
    ctx.fillRect(cam.x - tileSize, cam.y - tileSize, W, H);
    return true;
  }

  function frame() {
    if (!running) return;

    clearCanvas();

    const cam = readCam();
    applyWorldTransform(cam);

    // Terrain
    let drawn = false;
    if (frames) drawn = drawTerrainWithFrames(cam);
    if (!drawn) drawn = drawTerrainFallback(cam);
    if (!drawn) WARN('Nichts gezeichnet (weder Frames noch Fallback).');

    // --- Entities / Gebäude (sicher) --------------------------------------
    try {
      if (typeof window.drawEntities === 'function') {
        // Robuster Fallback-State: GameCore bevorzugt, sonst Game, sonst {}
        const entitiesState =
          window.GameCore?.state?.entities ||
          window.Game?.state?.entities    ||
          {};
        window.drawEntities(ctx, entitiesState);
      }
    } catch (e) {
      WARN('drawEntities Fehler:', e);
    }

    // Reset Transform → UI/HUD/Inspector nicht skalieren
    ctx.setTransform(1,0,0,1,0,0);

    rafId = requestAnimationFrame(frame);
  }

  // ---- Lifecycle ----------------------------------------------------------
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
      OK('Modul bereit: Loop läuft.');
    } catch (e) {
      ERR('Init-Fehler:', e);
    }
  }

  function start() {
    if (running) return;
    running = true;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // Externe, optionale API (z. B. für Tests/Inspector)
  function setCameraState({ x, y, zoom }) {
    const cam = (window.GameCamera ||= {});
    if (typeof x    === 'number') cam.x    = x;
    if (typeof y    === 'number') cam.y    = y;
    if (typeof zoom === 'number') cam.zoom = Math.max(0.25, Math.min(4, zoom));
  }

  // ---- Export / Hook ------------------------------------------------------
  window.Render = { init, start, stop, setCameraState };
  LOG('Modul geladen (v17.9.7), wartet auf cb:game-start.');
  window.addEventListener('cb:game-start', init);
})();
