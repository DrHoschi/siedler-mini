// game.js — Siedler-Mini Runtime (mobile-first)
// -------------------------------------------------------------

(() => {
  // ---------- kleine Helfer ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();

  // ---------- DOM / Canvas ----------
  let canvas = document.getElementById('game-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    // Canvas nimmt die Bühne ein; UI ist per CSS z-index darüber
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const stage = document.getElementById('stage') || document.body;
    stage.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');

  // DPR-Handling
  function resizeCanvasToCSSPixels() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 CSS-Pixel = 1 Logik-Pixel
    state.dpr = dpr;
  }
  window.addEventListener('resize', resizeCanvasToCSSPixels, { passive: true });

  // ---------- Kamera ----------
  class Camera {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.zoom = 1.0;
      this.min = 0.5;
      this.max = 3.5;
    }
    setPosition(x, y) {
      this.x = x;
      this.y = y;
    }
    setZoom(z) {
      this.zoom = clamp(z, this.min, this.max);
    }
    apply(ctx) {
      ctx.translate(Math.floor(canvas.width / (state.dpr * 2)), Math.floor(canvas.height / (state.dpr * 2)));
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.x, -this.y);
    }
    screenToWorld(px, py) {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      const cx = w / 2;
      const cy = h / 2;
      return {
        x: (px - cx) / this.zoom + this.x,
        y: (py - cy) / this.zoom + this.y
      };
    }
  }

  // ---------- State ----------
  const state = {
    dpr: window.devicePixelRatio || 1,
    running: false,
    lastTime: 0,
    grid: { rows: 16, cols: 16, tile: 64 }, // defaults
    mapUrl: null,

    // Tileset
    atlas: null,   // { frames: {key:{x,y,w,h}}, image: Image }
    layer: null,   // flache Liste von Keys (rows*cols)

    camera: new Camera(),

    // Input
    dragging: false,
    dragStart: { x: 0, y: 0 },
    camStart: { x: 0, y: 0 },
    pinch: null,   // { startDist, startZoom }

    // Debug
    diagEl: null,
  };

  // ---------- Debug-Overlay (DOM) ----------
  function ensureDiag() {
    if (state.diagEl) return;
    const el = document.createElement('div');
    el.id = 'diag-box';
    el.style.position = 'fixed';
    el.style.left = '16px';
    el.style.top = '16px';
    el.style.zIndex = '1000';
    el.style.pointerEvents = 'none';
    el.style.background = 'rgba(0,0,0,0.7)';
    el.style.color = '#e8f0ff';
    el.style.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    el.style.borderRadius = '10px';
    el.style.padding = '10px 12px';
    el.style.whiteSpace = 'pre';
    el.style.minWidth = '240px';
    document.body.appendChild(el);
    state.diagEl = el;
  }
  function updateDiag(extra = '') {
    ensureDiag();
    const { camera, grid, dpr } = state;
    const size = `${Math.round(canvas.clientWidth)}x${Math.round(canvas.clientHeight)}`;
    const lines = [
      `Cam:  x=${camera.x.toFixed(1)}  y=${camera.y.toFixed(1)}  zoom=${camera.zoom.toFixed(2)}`,
      `Map:  ${state.mapUrl || '—'}`,
      `rows=${grid.rows}  cols=${grid.cols}  tile=${grid.tile}`,
      `DPR=${dpr}    Size=${size}`,
    ];
    if (extra) lines.push(extra);
    state.diagEl.textContent = lines.join('\n');
  }

  // ---------- Map-Lader ----------
  async function loadMap(mapUrl) {
    state.mapUrl = mapUrl || state.mapUrl;

    const baseInfo = `[map]`;
    try {
      // Map JSON
      const res = await fetch(state.mapUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const map = await res.json();

      // Basiswerte aus Map übernehmen (optional)
      const rows = Number(map?.rows) || state.grid.rows;
      const cols = Number(map?.cols) || state.grid.cols;
      const tile = Number(map?.tileSize || map?.tile) || state.grid.tile;
      state.grid = { rows, cols, tile };

      // Layer
      const layer0 = map?.layers?.[0];
      if (layer0?.grid && Array.isArray(layer0.grid)) {
        state.layer = layer0.grid.slice();
      } else {
        // Fallback: generisches Checker-Muster
        state.layer = Array.from({ length: rows * cols }, (_, i) => (i % 2 ? 'grass' : 'dirt'));
      }

      // Optional: Tileset-Atlas
      state.atlas = null;
      if (map?.atlas?.json && map?.atlas?.image) {
        const atlasJsonUrl = resolveRelative(mapUrl, map.atlas.json);
        const atlasImgUrl = resolveRelative(mapUrl, map.atlas.image);

        const [jsonOk, imgOk] = await Promise.all([
          fetch(atlasJsonUrl, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
          loadImage(atlasImgUrl),
        ]);

        if (jsonOk && imgOk) {
          state.atlas = {
            frames: jsonOk.frames || jsonOk, // beides unterstützen
            image: imgOk,
          };
          log(`atlas`, `OK  json=${short(atlasJsonUrl)}  image=${short(atlasImgUrl)}`);
        } else {
          log(`atlas`, `fehlend → rendere ohne Atlas weiter.`);
        }
      } else {
        log(`atlas`, `nicht angegeben → rendere ohne Atlas weiter.`);
      }

      // Kamera auf sinnvolle Startposition
      const startX = (cols * tile) / 2;
      const startY = (rows * tile) / 2;
      state.camera.setPosition(startX, startY);
      state.camera.setZoom(clamp(state.camera.zoom, state.camera.min, state.camera.max));

      updateDiag(`${baseInfo} geladen ✔`);
      state.running = true;
    } catch (err) {
      state.layer = null;            // wir rendern nur Grid
      updateDiag(`${baseInfo} Fehler: ${String(err.message || err)}`);
      log('map', `Fehler beim Laden: ${String(err.message || err)}`);
      state.running = true;          // trotzdem laufen & Grid zeichnen
    }
  }

  function resolveRelative(baseUrl, ref) {
    try { return new URL(ref, new URL(baseUrl, location.href)).toString(); }
    catch { return ref; }
  }
  function short(u) {
    try { const { pathname } = new URL(u); return pathname.replace(/.*?\/siedler-mini\//, '…/'); }
    catch { return u; }
  }
  function loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    });
  }

  // ---------- Render ----------
  function renderGrid() {
    const { tile, rows, cols } = state.grid;
    const { camera } = state;

    ctx.save();
    camera.apply(ctx);

    // Hintergrund
    ctx.fillStyle = '#0f1a25';
    ctx.fillRect(camera.x - 20000, camera.y - 20000, 40000, 40000);

    // Kachel-Fläche (nur Gitterlinien)
    const w = cols * tile;
    const h = rows * tile;

    ctx.fillStyle = '#0c1721';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(150,170,190,0.15)';
    ctx.lineWidth = 1 / camera.zoom;

    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = Math.floor(c * tile) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let r = 0; r <= rows; r++) {
      const y = Math.floor(r * tile) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  function renderTiles() {
    const { tile, rows, cols } = state.grid;
    const { camera } = state;
    const { atlas, layer } = state;

    ctx.save();
    camera.apply(ctx);

    // Background
    ctx.fillStyle = '#0c1721';
    ctx.fillRect(0, 0, cols * tile, rows * tile);

    // Mit Atlas → aus Bild ausschneiden
    if (atlas && atlas.frames && atlas.image) {
      for (let idx = 0; idx < layer.length; idx++) {
        const key = layer[idx];
        const f = atlas.frames[key];
        if (!f) continue;
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const dx = c * tile;
        const dy = r * tile;
        ctx.drawImage(
          atlas.image,
          f.x || f.left || 0, f.y || f.top || 0, f.w || f.width || tile, f.h || f.height || tile,
          dx, dy, tile, tile
        );
      }
    } else {
      // Ohne Atlas → einfache Farbzuordnung für Keys
      const colorFor = (key) =>
        key === 'grass' ? '#2b7d2e' :
        key === 'dirt'  ? '#7d5f2b' :
        key === 'water' ? '#1e4a6a' :
        key === 'snow'  ? '#ced7df' :
        key === 'rock'  ? '#56616d' :
        key === 'lava'  ? '#63221a' :
        '#3a4a59';

      for (let idx = 0; idx < layer.length; idx++) {
        const key = layer[idx];
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        ctx.fillStyle = colorFor(key);
        ctx.fillRect(c * tile, r * tile, tile, tile);
      }
    }

    // dezentes Grid darüber
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1 / camera.zoom;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = Math.floor(c * tile) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * tile);
    }
    for (let r = 0; r <= rows; r++) {
      const y = Math.floor(r * tile) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(cols * tile, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  function frame(ts) {
    if (!state.running) return;
    const dt = (ts - state.lastTime) || 16;
    state.lastTime = ts;

    // clear to CSS pixels (wir nutzen transform auf DPR)
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    if (state.layer && state.grid) {
      renderTiles();
    } else {
      renderGrid();
    }

    updateDiag();

    requestAnimationFrame(frame);
  }

  // ---------- Input (nur auf dem Canvas) ----------
  function isCanvasTarget(ev) {
    return ev.target === canvas;
  }

  // Drag (Maus)
  canvas.addEventListener('mousedown', (e) => {
    if (!isCanvasTarget(e)) return;
    state.dragging = true;
    state.dragStart.x = e.clientX;
    state.dragStart.y = e.clientY;
    state.camStart.x = state.camera.x;
    state.camStart.y = state.camera.y;
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.dragging) return;
    const dx = (e.clientX - state.dragStart.x) / state.camera.zoom;
    const dy = (e.clientY - state.dragStart.y) / state.camera.zoom;
    state.camera.setPosition(state.camStart.x - dx, state.camStart.y - dy);
  });

  window.addEventListener('mouseup', () => { state.dragging = false; });

  // Wheel-Zoom (Maus)
  canvas.addEventListener('wheel', (e) => {
    if (!isCanvasTarget(e)) return;
    e.preventDefault();
    const old = state.camera.zoom;
    const delta = -Math.sign(e.deltaY) * 0.1;
    const next = clamp(old + delta, state.camera.min, state.camera.max);

    // zoom um Maus-Position (sanft)
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldBefore = state.camera.screenToWorld(mx, my);
    state.camera.setZoom(next);
    const worldAfter = state.camera.screenToWorld(mx, my);
    state.camera.setPosition(
      state.camera.x + (worldBefore.x - worldAfter.x),
      state.camera.y + (worldBefore.y - worldAfter.y)
    );
  }, { passive: false });

  // Touch: drag + pinch
  canvas.addEventListener('touchstart', (e) => {
    if (!isCanvasTarget(e)) return;
    if (e.touches.length === 1) {
      state.dragging = true;
      state.dragStart.x = e.touches[0].clientX;
      state.dragStart.y = e.touches[0].clientY;
      state.camStart.x = state.camera.x;
      state.camStart.y = state.camera.y;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      state.dragging = false;
      state.pinch = {
        startDist: dist2(e.touches[0], e.touches[1]),
        startZoom: state.camera.zoom,
      };
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!isCanvasTarget(e)) return;
    if (state.pinch && e.touches.length === 2) {
      e.preventDefault();
      const d = dist2(e.touches[0], e.touches[1]);
      const scale = d / Math.max(1, state.pinch.startDist);
      state.camera.setZoom(state.pinch.startZoom * scale);
    } else if (state.dragging && e.touches.length === 1) {
      const dx = (e.touches[0].clientX - state.dragStart.x) / state.camera.zoom;
      const dy = (e.touches[0].clientY - state.dragStart.y) / state.camera.zoom;
      state.camera.setPosition(state.camStart.x - dx, state.camStart.y - dy);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => { state.dragging = false; state.pinch = null; });

  function dist2(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  // ---------- Logging ----------
  function log(tag, msg) {
    // schlankes Prefix, damit deine Screenshots schön lesbar bleiben
    console.log(`[%s] %s`, tag, msg);
  }

  // ---------- Public API (wie gewünscht) ----------
  async function startGame(mapUrl) {
    state.running = false;
    await loadMap(mapUrl || state.mapUrl);
    state.lastTime = now();
    requestAnimationFrame(frame);
  }
  async function reloadGame(mapUrl) {
    await startGame(mapUrl || state.mapUrl);
  }

  // Exporte für index.html & UI
  window.startGame = startGame;
  window.reloadGame = reloadGame;

  // Bridges (deine gewünschte, stabile Schnittstelle)
  window.GameLoader = {
    start: (mapUrl) => window.startGame?.(mapUrl),
    reload: (mapUrl) => window.reloadGame?.(mapUrl),
  };
  window.GameCamera = {
    setZoom: (z) => window.game?.camera?.setZoom?.(z),
    setPosition: (x, y) => window.game?.camera?.setPosition?.(x, y),
  };

  // "game" Objekt bereitstellen (z. B. für Konsolen-Inspektion)
  window.game = {
    camera: state.camera,
    get grid() { return state.grid; },
    get mapUrl() { return state.mapUrl; },
  };

  // Init
  resizeCanvasToCSSPixels();
  updateDiag('[boot] bereit');
})();
