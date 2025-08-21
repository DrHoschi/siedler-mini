/* game.js — Siedler‑Mini
   Render-Loop, Zoom/Pan, Map/Tileset-Loader, Debug, Fallback-Grid
   Erwartet boot.js, das CustomEvents "app:*" schickt.
*/
(() => {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  const $ = (s) => document.querySelector(s);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const now = () => performance.now();

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  // Debug overlay ggf. einklappen, bis Text kommt
  const dbgBox = document.getElementById('debug-overlay');
  if (dbgBox) dbgBox.style.display = 'none';

  // Für boot.js: Text setzen & Box bei Bedarf anzeigen
  const setDebug = (txt) => {
    if (!dbgBox) return;
    if (txt && txt.trim()) {
      dbgBox.style.display = 'block';
      dbgBox.textContent = txt;
    } else {
      dbgBox.style.display = 'none';
      dbgBox.textContent = '';
    }
  };
  // global verfügbar
  window.setDebug = setDebug;

  // ────────────────────────────────────────────────────────────────────────────
  // Spielzustand
  const state = {
    running: false,
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
    view: {
      x: 0,
      y: 0,
      zoom: 1.0,
      zoomMin: 0.5,
      zoomMax: 3.5,
    },
    pointer: {
      dragging: false,
      lastX: 0,
      lastY: 0,
      touches: new Map(), // pinch
    },
    map: {
      url: null,
      rows: 16,
      cols: 16,
      tileSize: 64,
      layers: [],     // optional aus map-Datei
    },
    atlas: {
      ok: false,
      json: null,
      image: null,
      frames: null,   // map frames name->rect
      urlJson: 'assets/tiles/tileset.json',
      urlImage: 'assets/tiles/tileset.png',
    },
    timings: { last: now(), dt: 16 },
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Event-Anbindung an boot.js

  document.addEventListener('app:resize', (e) => {
    state.dpr = e.detail?.dpr ?? state.dpr;
    // Canvas ist in boot.js bereits in richtige Pixelgröße gebracht
    // hier nur redraw erzwingen
  });

  document.addEventListener('app:wheel', (e) => {
    const { deltaY, ctrlKey } = e.detail || {};
    const zBefore = state.view.zoom;
    const step = ctrlKey ? 0.15 : 0.1;
    const dir = deltaY > 0 ? -1 : 1;
    state.view.zoom = clamp(zBefore + dir * step, state.view.zoomMin, state.view.zoomMax);
  });

  // Maus‑Panning
  document.addEventListener('app:mousedown', (e) => {
    state.pointer.dragging = true;
    state.pointer.lastX = e.clientX;
    state.pointer.lastY = e.clientY;
  });
  document.addEventListener('app:mousemove', (e) => {
    if (!state.pointer.dragging) return;
    const dx = e.clientX - state.pointer.lastX;
    const dy = e.clientY - state.pointer.lastY;
    state.pointer.lastX = e.clientX;
    state.pointer.lastY = e.clientY;
    const speed = 1 / state.view.zoom;      // bei großem Zoom etwas langsamer
    state.view.x += dx * speed;
    state.view.y += dy * speed;
  });
  document.addEventListener('mouseup', () => {
    state.pointer.dragging = false;
  });

  // Touch: 1‑Finger pan, 2‑Finger pinch
  document.addEventListener('app:touchstart', (ev) => {
    const e = ev.changedTouches || ev.touches || [];
    for (const t of e) state.pointer.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
  }, { passive:false });

  document.addEventListener('app:touchmove', (ev) => {
    const touches = ev.touches;
    if (!touches || touches.length === 0) return;

    if (touches.length === 1) {
      // Pan
      const t = touches[0];
      const p = state.pointer.touches.get(t.identifier);
      if (p) {
        const dx = t.clientX - p.x;
        const dy = t.clientY - p.y;
        state.view.x += dx / state.view.zoom;
        state.view.y += dy / state.view.zoom;
        p.x = t.clientX; p.y = t.clientY;
      }
    } else if (touches.length >= 2) {
      // Pinch
      const [a, b] = [touches[0], touches[1]];
      const oldA = state.pointer.touches.get(a.identifier);
      const oldB = state.pointer.touches.get(b.identifier);
      if (oldA && oldB) {
        const dOld = Math.hypot(oldA.x - oldB.x, oldA.y - oldB.y);
        const dNew = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (dOld > 0) {
          const factor = dNew / dOld;
          state.view.zoom = clamp(state.view.zoom * factor, state.view.zoomMin, state.view.zoomMax);
        }
        oldA.x = a.clientX; oldA.y = a.clientY;
        oldB.x = b.clientX; oldB.y = b.clientY;
      }
    }
  }, { passive:false });

  document.addEventListener('app:touchend', (ev) => {
    const e = ev.changedTouches || [];
    for (const t of e) state.pointer.touches.delete(t.identifier);
  }, { passive:false });

  // Start über UI/Autostart
  document.addEventListener('app:start', (e) => {
    const url = e.detail?.mapUrl;
    if (url) loadMap(url);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Laden Map + Atlas

  async function loadMap(mapUrl) {
    state.map.url = mapUrl;
    try {
      const res = await fetch(mapUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Minimale Map-Struktur
      state.map.rows     = data.rows     ?? 16;
      state.map.cols     = data.cols     ?? 16;
      state.map.tileSize = data.tileSize ?? 64;
      state.map.layers   = Array.isArray(data.layers) ? data.layers : [];

      // falls Map einen Atlas explizit vorgibt, übernehmen
      const atlasPathJson  = data.atlas?.json  ?? state.atlas.urlJson;
      const atlasPathImage = data.atlas?.image ?? state.atlas.urlImage;

      await loadAtlas(atlasPathJson, atlasPathImage);

      // Nach dem Laden Kamera halbwegs sinnvoll setzen:
      centerToMap();
      state.running = true;

      console.log('%c[map]', 'color:#cfa', 'geladen:', mapUrl, '→',
        `${state.map.cols}×${state.map.rows} tiles @${state.map.tileSize}px`);
    } catch (err) {
      console.error('[ERR] map load', err);
      // Fallback: Nur Grid
      state.atlas.ok = false;
      state.running = true;
    }
  }

  async function loadAtlas(jsonUrl, imageUrl) {
    try {
      const [j, img] = await Promise.all([
        fetch(jsonUrl, { cache: 'no-store' }).then(r => r.json()),
        loadImage(imageUrl),
      ]);

      state.atlas.json = j;
      state.atlas.image = img;
      state.atlas.frames = j.frames || j; // je nach Struktur
      state.atlas.ok = !!img && !!state.atlas.frames;

      console.log('%c[atlas]', 'color:#adf', 'json:', jsonUrl, 'image:', imageUrl, 'ok:', state.atlas.ok);
    } catch (e) {
      console.warn('[warn] Atlas konnte nicht geladen werden → Fallback Grid', e);
      state.atlas.ok = false;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
    });
  }

  function centerToMap() {
    // Kamera so setzen, dass die Map mittig im View liegt.
    state.view.zoom = clamp(1, state.view.zoomMin, state.view.zoomMax);
    state.view.x = 0;
    state.view.y = 0;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Zeichnen

  function clear() {
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0); // UI-Farbe unabhängig vom Zoom
    ctx.fillStyle = '#0e1b26';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function draw() {
    clear();

    // Kamera setzen (nur Canvas, UI bleibt fix)
    const z = state.view.zoom;
    ctx.setTransform(z, 0, 0, z, state.view.x * z, state.view.y * z);

    // Optional: Grid-Hintergrund
    drawGrid();

    // Falls Atlas und Layer da sind, Tiles zeichnen
    if (state.atlas.ok && state.map.layers.length > 0) {
      drawTiles();
    }
  }

  function drawGrid() {
    const tile = state.map.tileSize;
    const cols = state.map.cols;
    const rows = state.map.rows;
    const w = cols * tile;
    const h = rows * tile;

    // Fläche für Map
    ctx.fillStyle = '#152634';
    ctx.fillRect(0, 0, w, h);

    // Raster
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = c * tile + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * tile + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  function drawTiles() {
    const img = state.atlas.image;
    const frames = state.atlas.frames;
    const tile = state.map.tileSize;

    // Wir erwarten Layer mit tile-keys, z.B. "grass", "dirt", …
    for (const layer of state.map.layers) {
      const grid = layer.grid; // 2D array of tile keys or null
      if (!Array.isArray(grid)) continue;
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const key = row[c];
          if (!key) continue;
          const fr = frames[key] || frames[key + ' ']; // robust gegen trailing-space
          if (!fr) continue;
          const sx = fr.x, sy = fr.y, sw = fr.w, sh = fr.h;
          const dx = c * tile, dy = r * tile;
          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, tile, tile);
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Main Loop

  function loop(ts) {
    const dt = ts - state.timings.last;
    state.timings.last = ts;
    state.timings.dt = dt;

    if (state.running) {
      draw();
      // Debug-Minizeile
      setDebug(
        `Cam: x=${state.view.x.toFixed(1)}  y=${state.view.y.toFixed(1)}  ` +
        `zoom=${state.view.zoom.toFixed(2)}\n` +
        `Map: ${state.map.url ?? '(none)'}\n` +
        `rows=${state.map.rows}  cols=${state.map.cols}  tile=${state.map.tileSize}\n` +
        `DPR=${state.dpr}    Size=${Math.round(canvas.width/state.dpr)}x${Math.round(canvas.height/state.dpr)}`
      );
    } else {
      clear(); // Startscreen‑Hintergrund
      setDebug(''); // Debug aus
    }

    requestAnimationFrame(loop);
  }

  state.timings.last = now();
  requestAnimationFrame(loop);

  // ────────────────────────────────────────────────────────────────────────────
  // Optionale globale API (Fallbacks aus boot.js nutzen diese ggf.)
  window.Game = {
    loadMap: (url) => loadMap(url),
    start:   () => { state.running = true; },
    stop:    () => { state.running = false; },
    setZoom: (z) => { state.view.zoom = clamp(z, state.view.zoomMin, state.view.zoomMax); },
    panBy:   (dx, dy) => { state.view.x += dx; state.view.y += dy; },
  };

})();
