/* game.bootstrap.js — v17.8.7 (stabil) */
(function () {
  "use strict";

  const MOD = "[bootstrap]";
  const ok   = (window.CBLog?.ok   || console.log).bind(console, MOD);
  const info = (window.CBLog?.info || console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  || console.error).bind(console, MOD);

  // ---- State ---------------------------------------------------------------
  const TILE = 64;                          // Tile-Größe (px)
  const TILESET_URL = "assets/tiles/tileset.terrain.png";

  let mapData = null;                       // JSON aus assets/maps/…
  let tilesetImg = null;                    // Image-Objekt
  let rafId = 0;

  // Kamera in Tile-Koordinaten
  const cam = { x: 0, y: 0, zoom: 1 };

  // ---- Utils ---------------------------------------------------------------
  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url + "?v=" + Date.now(); // Cache-Bust
    });
  }

  // ---- Renderer-Verdrahtung ------------------------------------------------
  function attachRenderer() {
    if (!window.Render) { warn("Render-Modul nicht vorhanden."); return; }

    // 1) Kamera-Provider
    Render.setCameraProvider(() => cam);

    // 2) Map-Drawer (zeichnet NUR Map-Kacheln; Entities bleiben bei der Engine)
    Render.setMapDrawer((ctx, camera) => {
      if (!mapData || !tilesetImg) return;

      const canvas = ctx.canvas;
      const pxTile = TILE * camera.zoom;

      // Sichtbereich in Tiles bestimmen
      const tilesX = Math.ceil(canvas.width  / pxTile) + 2;
      const tilesY = Math.ceil(canvas.height / pxTile) + 2;
      const startX = Math.floor(camera.x);
      const startY = Math.floor(camera.y);

      // Annahme: mapData.tiles ist ein 2D-Array [y][x] mit Tile-IDs (>=0)
      const grid = mapData.tiles || mapData.map || mapData.layer || [];
      const h = grid.length;
      const w = h ? grid[0].length : 0;
      if (!w || !h) return;

      // Tileset als Atlas: 8 Spalten à 64px (anpassen wenn anders)
      const ATLAS_COLS = Math.floor(tilesetImg.width / TILE) || 1;

      ctx.save();
      // optional: Bodenfarbe löschen — wird im Render.frame() schon gecleart

      for (let ty = 0; ty < tilesY; ty++) {
        const my = startY + ty;
        if (my < 0 || my >= h) continue;

        for (let tx = 0; tx < tilesX; tx++) {
          const mx = startX + tx;
          if (mx < 0 || mx >= w) continue;

          const id = grid[my][mx] | 0;          // Tile-ID
          if (id < 0) continue;

          // Quelle im Atlas
          const sx = (id % ATLAS_COLS) * TILE;
          const sy = Math.floor(id / ATLAS_COLS) * TILE;

          // Zielpunkt (in Pixel)
          const dx = (mx - camera.x) * pxTile;
          const dy = (my - camera.y) * pxTile;

          ctx.drawImage(tilesetImg, sx, sy, TILE, TILE, dx, dy, pxTile, pxTile);
        }
      }
      ctx.restore();
    });

    // 3) Einfache RAF-Loop → feuert Render-Frames
    if (!rafId) {
      const tick = () => {
        try { window.dispatchEvent(new Event("cb:render-frame")); } catch (_) {}
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }
  }

  // ---- Eingaben: Pan & Zoom -------------------------------------------------
  function attachInput() {
    const cvs = document.getElementById("game");
    if (!cvs) return;

    // Wheel-Zoom (Desktop/Trackpad)
    cvs.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const dir = Math.sign(ev.deltaY);
      const old = cam.zoom;
      cam.zoom = Math.min(3, Math.max(0.5, +(old * (dir > 0 ? 0.9 : 1.1)).toFixed(3)));
    }, { passive: false });

    // Drag-Pan (einfach)
    let dragging = false, sx = 0, sy = 0, startX = 0, startY = 0;
    cvs.addEventListener("pointerdown", (e) => {
      dragging = true; sx = e.clientX; sy = e.clientY; startX = cam.x; startY = cam.y; cvs.setPointerCapture(e.pointerId);
    });
    cvs.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = (e.clientX - sx) / (TILE * cam.zoom);
      const dy = (e.clientY - sy) / (TILE * cam.zoom);
      cam.x = startX - dx;
      cam.y = startY - dy;
    });
    cvs.addEventListener("pointerup",   ()=> dragging = false);
    cvs.addEventListener("pointercancel",()=> dragging = false);
  }

  // ---- Map laden & Startfluss ----------------------------------------------
  async function loadMapFromCanvas() {
    const cvs = document.getElementById("game");
    const url = cvs?.getAttribute("data-map") || "assets/maps/map-mini.json";
    try {
      mapData = await loadJSON(url);
      window.__CURRENT_MAP__ = mapData;                 // für Tools/Inspector
      ok(`Map geprüft/geladen: %s`, url);
      // Kamera zentrieren (grob)
      const grid = mapData.tiles || mapData.map || [];
      const h = grid.length, w = h ? grid[0].length : 0;
      if (w && h) { cam.x = (w - (cvs.width  / (TILE*cam.zoom))) * 0.5;
                    cam.y = (h - (cvs.height / (TILE*cam.zoom))) * 0.5; }
      return true;
    } catch (e) {
      err(`Map konnte nicht geladen werden: ${e?.message || e}`);
      return false;
    }
  }

  async function boot() {
    ok("Modul geladen (v17.8.7)");

    // Renderer initialisiert sich selbst (core.render.js)
    // Wir warten auf den Start-Impuls der UI:
    window.addEventListener("cb:game-start", async () => {
      // Tileset + Map laden
      try {
        tilesetImg = await loadImage(TILESET_URL);
        ok(`Tileset erreichbar (${TILESET_URL})`);
      } catch (e) {
        warn(`Tileset nicht erreichbar: ${e?.message || e}`);
      }

      await loadMapFromCanvas();

      // Renderer andocken + Eingaben anklemmen
      attachRenderer();
      attachInput();

      // Für Legacy-Flows (alte Game.start) ein freundlicher Hinweis
      info("ready (legacy Game.start)");
    });
  }

  boot();
})();
