/* game.js
 * Siedler‑Mini • v11.1r6 • 2025‑08‑22
 * -----------------------------------
 * Verantwortlich für:
 *  - Laden & (Neu)Starten einer Map (GameLoader)
 *  - Kamera & einfache Interaktion (GameCamera)
 *  - Minimaler Renderer (Grid / Map-Bounds)
 *
 * Öffentliche API (für boot.js / Debug):
 *   window.GameLoader.start(mapUrl?)
 *   window.GameLoader.reload(mapUrl?)
 *   window.GameLoader.isRunning
 *   window.GameCamera.setZoom(z)
 *   window.GameCamera.setPosition(x,y)
 *   window.GameCamera.get()
 */

(() => {
  "use strict";

  // ===== Version / Helpers ===================================================
  const VERSION = "v11.1r6";
  const DEFAULT_MAP = "assets/maps/map-demo.json";

  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ===== Canvas / Context ====================================================
  const canvas = document.getElementById("stage");
  if (!canvas) {
    console.error("[game] Canvas #stage fehlt – index.html prüfen!");
    return;
  }
  const ctx = canvas.getContext("2d");

  // ===== State ===============================================================
  const state = {
    running: false,
    mapUrl: null,
    map: null,              // geladene Map (JSON)
    tileSize: 64,           // Fallback falls Map nichts liefert
    rows: 16,
    cols: 16,

    // Anzeige/Device
    DPR: Math.max(1, window.devicePixelRatio || 1),
    width: 0,
    height: 0,

    // Kamera
    camera: {
      x: 0,
      y: 0,
      zoom: 1.0,
      minZoom: 0.5,
      maxZoom: 3.5
    },

    // Input
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    camStartX: 0,
    camStartY: 0,

    // Loop
    lastTime: 0
  };

  // ===== Resize Handling =====================================================
  function resizeCanvas() {
    const DPR = state.DPR = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * DPR));
    const h = Math.max(1, Math.floor(rect.height * DPR));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    state.width = w;
    state.height = h;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // ===== Map Laden ===========================================================
  async function loadMap(url) {
    const bustUrl = url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now();
    console.log("[game] Lade Map:", url);

    const res = await fetch(bustUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden von ${url}`);
    const data = await res.json();

    // Sanity & Defaults
    state.map = data;
    state.tileSize = Number(data.tileSize || 64);
    state.rows = Number(data.rows || 16);
    state.cols = Number(data.cols || 16);

    // Kamera initial grob mittig
    state.camera.x = (state.cols * state.tileSize) / 2;
    state.camera.y = (state.rows * state.tileSize) / 2;
    state.camera.zoom = clamp(state.camera.zoom, state.camera.minZoom, state.camera.maxZoom);

    console.log("[game] Map OK:", { rows: state.rows, cols: state.cols, tile: state.tileSize });
  }

  // ===== Renderer (minimal) ==================================================
  function clear() {
    ctx.fillStyle = "#0d1722";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function worldToScreen(wx, wy) {
    const { x, y, zoom } = state.camera;
    const sx = (wx - x) * zoom + state.width / 2;
    const sy = (wy - y) * zoom + state.height / 2;
    return [sx, sy];
  }

  function drawGrid() {
    const { rows, cols, tileSize } = state;
    const totalW = cols * tileSize;
    const totalH = rows * tileSize;

    // Map-Umrandung
    ctx.save();
    ctx.lineWidth = 2 * state.camera.zoom;
    ctx.strokeStyle = "rgba(120,160,200,0.35)";

    const [x0, y0] = worldToScreen(0, 0);
    const [x1, y1] = worldToScreen(totalW, totalH);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();

    // Zartes Grid
    ctx.save();
    ctx.strokeStyle = "rgba(120,160,200,0.18)";
    ctx.lineWidth = 1 * state.camera.zoom;

    // Vertikal
    for (let c = 1; c < cols; c++) {
      const wx = c * tileSize;
      const [sx0, sy0] = worldToScreen(wx, 0);
      const [sx1, sy1] = worldToScreen(wx, totalH);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
    }
    // Horizontal
    for (let r = 1; r < rows; r++) {
      const wy = r * tileSize;
      const [sx0, sy0] = worldToScreen(0, wy);
      const [sx1, sy1] = worldToScreen(totalW, wy);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawHudReadout() {
    // Ein paar State-Werte in die Ecke (hilfreich ohne separates Overlay)
    const z = state.camera.zoom.toFixed(2);
    const txt = `Cam: x=${state.camera.x.toFixed(1)}  y=${state.camera.y.toFixed(1)}  zoom=${z}
Map: ${state.map ? state.mapUrl : "—"} 
rows=${state.rows} cols=${state.cols} tile=${state.tileSize}
DPR=${state.DPR}   Size=${state.width}×${state.height}`;
    ctx.save();
    const pad = 12 * state.DPR;
    ctx.font = `${12 * state.DPR}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const lines = txt.split("\n");
    const metrics = ctx.measureText("M".repeat(48));
    const boxW = Math.max(metrics.width + pad * 2, 260 * state.DPR);
    const boxH = (lines.length * 16 + 10) * state.DPR;

    // Bubble
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#0f1d31";
    ctx.strokeStyle = "#1e2d42";
    ctx.lineWidth = 1 * state.DPR;
    ctx.beginPath();
    const x = pad, y = pad;
    roundRect(ctx, x, y, boxW, boxH, 8 * state.DPR);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#cfe3ff";
    let ty = y + 20 * state.DPR;
    for (const line of lines) {
      ctx.fillText(line, x + 12 * state.DPR, ty);
      ty += 16 * state.DPR;
    }
    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
  }

  function render() {
    clear();
    if (state.map) drawGrid();
    drawHudReadout();
  }

  // ===== Loop ================================================================
  function tick(t) {
    if (!state.running) return;
    const dt = (t - state.lastTime) || 16;
    state.lastTime = t;
    // (hier später: Animationen, Units etc.)
    render();
    requestAnimationFrame(tick);
  }

  // ===== Input (nur auf dem Canvas) =========================================
  // Maus / Touch Drag
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.camStartX = state.camera.x;
    state.camStartY = state.camera.y;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    const dx = (e.clientX - state.dragStartX) / state.camera.zoom;
    const dy = (e.clientY - state.dragStartY) / state.camera.zoom;
    state.camera.x = state.camStartX - dx;
    state.camera.y = state.camStartY - dy;
  });
  canvas.addEventListener("pointerup", () => { state.dragging = false; });
  canvas.addEventListener("pointercancel", () => { state.dragging = false; });

  // Wheel‑Zoom (nur über Canvas)
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const { minZoom, maxZoom } = state.camera;
    const factor = Math.exp(-e.deltaY * 0.0015); // smooth
    const newZ = clamp(state.camera.zoom * factor, minZoom, maxZoom);
    state.camera.zoom = newZ;
  }, { passive: false });

  // ===== Public API ==========================================================
  async function start(mapUrl = DEFAULT_MAP) {
    try {
      state.mapUrl = mapUrl;
      await loadMap(mapUrl);
      if (!state.running) {
        state.running = true;
        state.lastTime = now();
        requestAnimationFrame(tick);
      }
      console.log("[game] gestartet •", mapUrl);
    } catch (err) {
      console.error("[game] Startfehler:", err);
      alert("GameStart fehlgeschlagen. Details in der Konsole.");
    }
  }

  async function reload(mapUrl = state.mapUrl || DEFAULT_MAP) {
    console.log("[game] reload •", mapUrl);
    await start(mapUrl);
  }

  // Kamera‑API (für Debug/Boot)
  function setZoom(z) {
    state.camera.zoom = clamp(Number(z) || 1, state.camera.minZoom, state.camera.maxZoom);
  }
  function setPosition(x, y) {
    state.camera.x = Number.isFinite(x) ? Number(x) : state.camera.x;
    state.camera.y = Number.isFinite(y) ? Number(y) : state.camera.y;
  }
  function getCamera() {
    return { ...state.camera };
  }

  // Expose
  window.GameLoader = {
    start, reload,
    get isRunning() { return !!state.running; },
    get state() { return state; },
    get mapUrl() { return state.mapUrl; }
  };
  window.GameCamera = { setZoom, setPosition, get: getCamera };

  // ===== Boot‑Hint ===========================================================
  console.log(`[game] bereit • ${VERSION}`);
})();
