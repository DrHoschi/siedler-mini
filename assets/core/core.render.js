/* core.render.js – v17.9.1 (Minimal-Renderer, diagnostikfreundlich)
   Aufgaben:
   - Canvas auf dpr-Größe bringen
   - Frame-Loop abonnieren (cb:render-frame)
   - Terrain aus tileset.terrain zeichnen (falls Map+Tileset vorhanden)
   - Klare Logs, wenn Daten fehlen
*/
(function () {
  "use strict";

  const MOD = "[render]";
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // ————————————————————————————————————————————————————————————————
  // Canvas + Kontext
  const cvs = document.getElementById("game");
  if (!cvs) { err("Canvas #game nicht gefunden."); return; }
  const ctx = cvs.getContext("2d", { alpha:false });

  // Sizing auf Device Pixel Ratio
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(cvs.clientWidth  * dpr);
    const h = Math.floor(cvs.clientHeight * dpr);
    if (cvs.width !== w || cvs.height !== h) {
      cvs.width = w; cvs.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 CSS-px == 1 „Logik“-px
  }
  resize();
  window.addEventListener("resize", resize);

  // ————————————————————————————————————————————————————————————————
  // Zugriff auf Map + Tileset
  function getMap() {
    // Erwartet, dass core.map.js die Daten auf Game.Map.current oder Game.Map._data hält.
    const M = (window.Game?.Map ?? {});
    return M.current || M._data || window.__CURRENT_MAP__ || null;
  }

  function getTerrainTileset() {
    // assets/core/build.assets.js registriert „tileset.terrain“ als PNG
    const A = window.Assets;
    if (A?.get) {
      const img = A.get("tileset.terrain"); // HTMLImageElement?
      if (img instanceof Image || (img && img.naturalWidth)) return img;
    }
    return null;
  }

  // Frames aus JSON (assets/tiles/tileset.terrain.json) zwischenspeichern
  // core.map.js sollte sie beim Laden irgendwo ablegen; wir bieten Fallback:
  let terrainFrames = null;
  function getTerrainFrames() {
    if (terrainFrames) return terrainFrames;
    // 1) bevorzugt über Game.Map.tilesetTerrainFrames
    const M = window.Game?.Map;
    if (M?.tilesetTerrainFrames) {
      terrainFrames = M.tilesetTerrainFrames;
      return terrainFrames;
    }
    // 2) Fallback: globaler Cache, den core.map.js beim Laden gesetzt hat
    if (window.__TERRAIN_FRAMES__) {
      terrainFrames = window.__TERRAIN_FRAMES__;
      return terrainFrames;
    }
    return null;
  }

  // ————————————————————————————————————————————————————————————————
  // Terrain zeichnen (einfacher Drawer)
  function drawTerrain() {
    const map = getMap();
    const img = getTerrainTileset();
    const frames = getTerrainFrames();

    if (!map)      { warn("Keine Map-Daten vorhanden → skip."); return; }
    if (!img)      { warn("Tileset-Bild (tileset.terrain) fehlt → skip."); return; }
    if (!frames)   { warn("Frames aus tileset.terrain.json fehlen → skip."); return; }

    const tileSize = (map.tileSize || map.meta?.tileSize || 64) | 0;
    const rows = map.rows ?? map.height ?? map.grid?.rows ?? 0;
    const cols = map.cols ?? map.width  ?? map.grid?.cols ?? 0;

    if (!rows || !cols) { warn("Map hat 0×0 Dimensionen → nichts zu zeichnen."); return; }

    // Einfaches Terrain-Layer:
    // Wir erwarten map.tiles als 2D-Array von Frame-Keys (z.B. "terrain_r0_c0").
    const tiles = map.tiles || map.layer || map.data || null;
    if (!tiles || !tiles.length) { warn("Map.tiles leer → nichts zu zeichnen."); return; }

    for (let y = 0; y < rows; y++) {
      const row = tiles[y];
      if (!row) continue;
      for (let x = 0; x < cols; x++) {
        const key = row[x];
        if (!key) continue;
        const f = frames[key];
        if (!f) continue;
        // FrameInfo: {x,y,w,h}
        ctx.drawImage(img, f.x, f.y, f.w, f.h, x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  // ————————————————————————————————————————————————————————————————
  // Debug-Hintergrund (damit man sofort etwas sieht)
  function clearWithGrid() {
    // dunkles Grün/Schwarz + feines Grid, damit „schwarz ohne Grid“ als Fehler sichtbar ist
    ctx.fillStyle = "#0b0f0d";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    const step = 64;
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    for (let x = 0; x < cvs.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); }
    for (let y = 0; y < cvs.height; y += step){ ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // ————————————————————————————————————————————————————————————————
  // Frame-Loop
  function renderFrame() {
    clearWithGrid();
    try { drawTerrain(); } catch(e) { err("Fehler beim Terrain-Draw:", e); }
  }

  // Der Loop wird von core.bootstrap/game.bootstrap.js mit ‚cb:render-frame‘ getriggert.
  window.addEventListener("cb:render-frame", renderFrame);

  ok("Modul geladen (v17.9.1): wartet auf cb:render-frame, zeichnet Terrain wenn verfügbar.");
})();
