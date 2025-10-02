/* ============================================================================
 * Datei: core/core.render.js
 * Version: v18.0.0
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Zentrale Render-Schleife (Canvas 2D)
 *  - Sendet jedes Frame ein Event 'cb:render-frame' mit { ctx, cam, markDrawn }
 *    → Module (z. B. core.map.js) können damit zeichnen und "markDrawn()" rufen.
 *  - Falls niemand zeichnet, greift ein sichtbares Fallback (erstes Tile als Pattern)
 *
 * Start:
 *  - wartet auf 'cb:game-start'
 *  - Fallback: DOMContentLoaded / cb:assets-ready → auto-init (einmalig)
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

  // Fallback-Tileset (optional) ---------------------------------------------
  let tilesetImg = null;      // assets/tiles/tileset.terrain.png
  let fallbackPattern = null; // Pattern aus erstem Tile
  let tileSize = 64;

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

  // ---- Fallback-Assets ----------------------------------------------------
  function loadTilesetPng(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('PNG lädt nicht: ' + url));
      img.src = url;
    });
  }

  async function ensureFallbackAssets() {
    try {
      tilesetImg = await loadTilesetPng('assets/tiles/tileset.terrain.png');
      const off  = document.createElement('canvas');
      off.width  = off.height = tileSize * dpr;
      const octx = off.getContext('2d');
      // erstes Tile oben links als Fallback
      octx.drawImage(tilesetImg, 0, 0, tileSize, tileSize, 0, 0, off.width, off.height);
      fallbackPattern = octx.createPattern(off, 'repeat');
      OK('Fallback-Pattern bereit.');
    } catch (e) {
      WARN('Kein Fallback möglich:', e.message);
    }
  }

  // ---- Zeichnen -----------------------------------------------------------
  function clearCanvas() {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function applyWorldTransform(cam) {
    const s = dpr * cam.zoom;
    // Welt-Transform: zuerst skalieren, dann verschieben
    ctx.setTransform(s, 0, 0, s, Math.floor(-cam.x * s), Math.floor(-cam.y * s));
  }

  function drawFallback(cam) {
    if (!fallbackPattern) return false;
    ctx.fillStyle = fallbackPattern;
    // Sichtbereich großzügig füllen (Weltkoordinaten!)
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

    // --- Hook für Welt-Zeichner (Map etc.) --------------------------------
    const hook = { drawn: false };
    const markDrawn = () => { hook.drawn = true; };
    try {
      window.dispatchEvent(new CustomEvent('cb:render-frame', {
        detail: { ctx, cam, markDrawn, dpr }
      }));
    } catch (e) {
      WARN('cb:render-frame Listener-Fehler:', e);
    }

    // Falls niemand gezeichnet hat → Fallback (Pattern)
    if (!hook.drawn) {
      drawFallback(cam);
    }

    // UI/Overlay im Screenspace: Transform zurücksetzen
    ctx.setTransform(1,0,0,1,0,0);

    rafId = requestAnimationFrame(frame);
  }

  // ---- Lifecycle ----------------------------------------------------------
  let initOnce = false;
  async function init() {
    if (initOnce) return; initOnce = true;
    try {
      canvas = pickCanvas();
      if (!canvas) {
        ERR('Keine Canvas im DOM gefunden – Abbruch.');
        return;
      }
      ctx = canvas.getContext('2d', { alpha: true });
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      await ensureFallbackAssets();

      start();
      OK('Render-Loop läuft.');
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

  function setCameraState({ x, y, zoom }) {
    const cam = (window.GameCamera ||= {});
    if (typeof x    === 'number') cam.x    = x;
    if (typeof y    === 'number') cam.y    = y;
    if (typeof zoom === 'number') cam.zoom = Math.max(0.25, Math.min(4, zoom));
  }

  // ---- Export / Hooks -----------------------------------------------------
  window.Render = { init, start, stop, setCameraState };

  // Start-Bedingungen: Game-Start bevorzugt, ansonsten Fallbacks
  window.addEventListener('cb:game-start', init);
  window.addEventListener('cb:assets-ready', init);
  document.addEventListener('DOMContentLoaded', init);

  LOG('Modul geladen (v18.0.0), wartet auf Startsignal.');
})();
