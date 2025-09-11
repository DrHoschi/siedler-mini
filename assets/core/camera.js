/* assets/core/camera.js — v17.9.0
   Neue Siedler – Kamera (Pan/Zoom) mit Touch- & Wheel-Support
   API:
     Game.Camera.init({ canvas, mapWidth, mapHeight, tileSize })
     Game.Camera.setMapSize(w, h, tile)
     Game.Camera.setView(x, y, zoom)
     Game.Camera.apply(ctx)                 // setzt ctx.setTransform(...)
     Game.Camera.worldToScreen(x, y) -> {x,y}
     Game.Camera.screenToWorld(x, y) -> {x,y}
     Game.Camera.getState() -> {x, y, zoom, vw, vh}
   Events:
     window.dispatchEvent( new CustomEvent('cb:camera-changed', {detail:{x,y,zoom}}) );
*/

(function () {
  "use strict";

  const MOD = "[camera]";
  const log  = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  // State
  const cam = {
    canvas: null,
    x: 0, y: 0,             // Welt-Offset links/oben
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 3,
    viewW: 0, viewH: 0,     // Viewport in Pixel
    mapW: 0, mapH: 0,       // Map in Pixel
    tile: 32,               // fallback
    // drag
    isDown: false,
    lastX: 0, lastY: 0,
    // pinch
    pinchActive: false,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    // inertia (klein & simpel)
    vx: 0, vy: 0,
  };

  // ---- Public API ----------------------------------------------------------

  function init(opts = {}) {
    cam.canvas = opts.canvas || document.getElementById("game");
    if (!cam.canvas) throw new Error("Camera: Canvas #game nicht gefunden.");

    setMapSize(opts.mapWidth || 0, opts.mapHeight || 0, opts.tileSize || cam.tile);
    onResize();
    addEvents();

    window.addEventListener("cb:render-frame", tick); // kleiner, stetiger Dämpfer
    log("bereit");
    return api;
  }

  function setMapSize(wTiles, hTiles, tileSize) {
    if (tileSize) cam.tile = tileSize|0;
    cam.mapW = (wTiles|0) * cam.tile;
    cam.mapH = (hTiles|0) * cam.tile;
    clampToBounds();
  }

  function setView(x, y, z) {
    if (Number.isFinite(x)) cam.x = x;
    if (Number.isFinite(y)) cam.y = y;
    if (Number.isFinite(z)) cam.zoom = clamp(z, cam.minZoom, cam.maxZoom);
    clampToBounds();
    emitChanged();
  }

  function getState() {
    return { x: cam.x, y: cam.y, zoom: cam.zoom, vw: cam.viewW, vh: cam.viewH };
  }

  function apply(ctx) {
    // Canvas-Transform setzen: erst scale, dann translate (negativer Offset)
    ctx.setTransform(cam.zoom, 0, 0, cam.zoom, -cam.x * cam.zoom, -cam.y * cam.zoom);
  }

  function worldToScreen(wx, wy) {
    return {
      x: (wx - cam.x) * cam.zoom,
      y: (wy - cam.y) * cam.zoom
    };
  }

  function screenToWorld(sx, sy) {
    return {
      x: sx / cam.zoom + cam.x,
      y: sy / cam.zoom + cam.y
    };
  }

  const api = { init, setMapSize, setView, apply, worldToScreen, screenToWorld, getState };

  // ---- Internals -----------------------------------------------------------

  function addEvents() {
    // Resize
    window.addEventListener("resize", onResize, { passive: true });

    // Mouse drag
    cam.canvas.addEventListener("mousedown", onDown, { passive: false });
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp, { passive: true });

    // Wheel zoom (ctrl+wheel schneller)
    cam.canvas.addEventListener("wheel", onWheel, { passive: false });

    // Touch (pan + pinch)
    cam.canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    cam.canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    cam.canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    cam.canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });
  }

  function onResize() {
    const rect = cam.canvas.getBoundingClientRect();
    cam.viewW = rect.width  || cam.canvas.width  || window.innerWidth;
    cam.viewH = rect.height || cam.canvas.height || window.innerHeight;
    clampToBounds();
    emitChanged();
  }

  function onDown(e) {
    // Nur linke Taste
    if (e.button !== 0) return;
    cam.isDown = true;
    cam.lastX = e.clientX;
    cam.lastY = e.clientY;
    cam.vx = cam.vy = 0;
    e.preventDefault();
  }

  function onMove(e) {
    if (!cam.isDown) return;
    const dx = (e.clientX - cam.lastX) / cam.zoom;
    const dy = (e.clientY - cam.lastY) / cam.zoom;
    cam.lastX = e.clientX; cam.lastY = e.clientY;

    cam.x -= dx; cam.y -= dy;
    cam.vx = -dx * 0.9; cam.vy = -dy * 0.9;  // etwas „Trägheit“
    clampToBounds();
    emitChanged();
    e.preventDefault();
  }

  function onUp() { cam.isDown = false; }

  function onWheel(e) {
    // Cursor-basiertes Zoomen (zum Cursor hin)
    const delta = e.deltaY;
    const factor = (e.ctrlKey ? 0.0008 : 0.0012) * delta;
    const newZoom = clamp(cam.zoom * (1 - factor), cam.minZoom, cam.maxZoom);

    // Welt-Punkt unter dem Cursor merken
    const rect = cam.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const wx = px / cam.zoom + cam.x;
    const wy = py / cam.zoom + cam.y;

    cam.zoom = newZoom;

    // Offset so korrigieren, dass derselbe Welt-Punkt unter dem Cursor bleibt
    cam.x = wx - px / cam.zoom;
    cam.y = wy - py / cam.zoom;

    clampToBounds();
    emitChanged();
    e.preventDefault();
  }

  // ---- Touch / Pinch ------------------------------------------------------

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      cam.isDown = true;
      cam.lastX = e.touches[0].clientX;
      cam.lastY = e.touches[0].clientY;
      cam.vx = cam.vy = 0;
    } else if (e.touches.length === 2) {
      cam.pinchActive = true;
      cam.pinchStartDist = dist(e.touches[0], e.touches[1]);
      cam.pinchStartZoom = cam.zoom;
    }
    e.preventDefault();
  }

  function onTouchMove(e) {
    if (cam.pinchActive && e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      const scale = d / (cam.pinchStartDist || d);
      cam.zoom = clamp(cam.pinchStartZoom * scale, cam.minZoom, cam.maxZoom);
      clampToBounds();
      emitChanged();
      e.preventDefault();
      return;
    }
    if (cam.isDown && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = (t.clientX - cam.lastX) / cam.zoom;
      const dy = (t.clientY - cam.lastY) / cam.zoom;
      cam.lastX = t.clientX; cam.lastY = t.clientY;
      cam.x -= dx; cam.y -= dy;
      cam.vx = -dx * 0.9; cam.vy = -dy * 0.9;
      clampToBounds();
      emitChanged();
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    cam.isDown = false;
    cam.pinchActive = false;
  }

  function dist(a, b) {
    const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  // ---- Bounds / Ticker -----------------------------------------------------

  function clampToBounds() {
    if (!cam.viewW || !cam.viewH || !cam.mapW || !cam.mapH) return;

    // sichtbare Breite/Höhe in Weltkoordinaten
    const vw = cam.viewW / cam.zoom;
    const vh = cam.viewH / cam.zoom;

    const maxX = Math.max(0, cam.mapW - vw);
    const maxY = Math.max(0, cam.mapH - vh);

    cam.x = clamp(cam.x, 0, maxX);
    cam.y = clamp(cam.y, 0, maxY);
  }

  function tick() {
    // einfache Trägheit ausklingen lassen
    if (Math.abs(cam.vx) > 0.001 || Math.abs(cam.vy) > 0.001) {
      cam.x = clamp(cam.x + cam.vx, 0, Math.max(0, cam.mapW - cam.viewW / cam.zoom));
      cam.y = clamp(cam.y + cam.vy, 0, Math.max(0, cam.mapH - cam.viewH / cam.zoom));
      cam.vx = lerp(cam.vx, 0, 0.15);
      cam.vy = lerp(cam.vy, 0, 0.15);
      emitChanged();
    }
  }

  function emitChanged() {
    try {
      window.dispatchEvent(new CustomEvent("cb:camera-changed", { detail: getState() }));
    } catch(_) {}
  }

  // ---- Export --------------------------------------------------------------
  window.Game = window.Game || {};
  window.Game.Camera = api;

  // Auto-Init, wenn Canvas existiert (Map-Größe kann später gesetzt werden)
  try {
    if (document.getElementById("game")) init({ canvas: document.getElementById("game") });
  } catch (e) { warn("Auto-Init fehlgeschlagen:", e?.message || e); }

})();
