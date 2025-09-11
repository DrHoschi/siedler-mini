/* assets/core/core.render.js — v17.9.2 */
(function () {
  "use strict";

  const MOD = "[render]";
  const log  = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // --- Canvas holen ----------------------------------------------------------
  const cvs = document.getElementById("game");
  const ctx = cvs?.getContext?.("2d");
  if (!cvs || !ctx) {
    err("Kein Canvas #game gefunden.");
    return;
  }

  // --- Kleine Helfer ---------------------------------------------------------
  const Camera = window.Camera || {
    worldToScreen(x, y) { return { x, y }; },
    scale: 1,
    get offsetX(){ return 0; },
    get offsetY(){ return 0; },
  };

  function getTileset() {
    const AS = window.Assets || {};
    const key = "tileset.terrain";

    // Mögliche Shapes durchprobieren
    const reg    = AS.registry?.[key] || AS[key] || {};
    const frames = AS.frames?.[key]   || reg.frames || AS.sprites?.[key]?.frames || null;
    let   image  = AS.images?.[key]   || reg.image  || AS.sprites?.[key]?.image || null;
    const meta   = AS.meta?.[key]     || reg.meta   || AS.sprites?.[key]?.meta  || {};

    if (!image && meta?.image) {
      // Sicherheitsnetz: eigenes Image bauen, falls das Assets-Modul nur Meta hält
      image = new Image();
      image.src = meta.image;
      image.decode?.().catch(()=>{});
    }
    return { frames, image, meta };
  }

  function pickAnyFrame(frames) {
    // irgendeinen existierenden Terrain-Key nehmen
    const keys = frames ? Object.keys(frames) : [];
    // bevorzugt r0/c0, sonst der erste
    const pref = "terrain_r0_c0";
    return frames?.[pref] || (keys.length ? frames[keys[0]] : null);
  }

  // Grid zeichnen (Debug/Style)
  function drawGrid(tileSize, color = "rgba(255,255,255,0.06)") {
    if (!tileSize) return;
    ctx.save();
    ctx.strokeStyle = color;
    for (let x = 0; x < cvs.width; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, cvs.height); ctx.stroke();
    }
    for (let y = 0; y < cvs.height; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(cvs.width, y + 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  // --- State -----------------------------------------------------------------
  let CURRENT_MAP = window.__CURRENT_MAP__ || null;  // {width,height,tiles?}
  let TILESET = null;                                 // {frames,image,meta}
  let TILE_SIZE = 64;

  // --- Map/Assets Handover ---------------------------------------------------
  function ensureTileset() {
    if (TILESET?.frames && TILESET?.image) return true;
    const t = getTileset();
    if (t.frames && t.image) {
      TILESET = t;
      TILE_SIZE = t.meta?.tileSize || 64;
      ok("Tileset aktiv: %s (tileSize=%s)", "tileset.terrain", TILE_SIZE);
      return true;
    }
    return false;
  }

  function handleMapReady(map) {
    CURRENT_MAP = map || window.__CURRENT_MAP__ || CURRENT_MAP;
    if (CURRENT_MAP) ok("Map übernommen.");
  }

  // Events aus anderen Modulen
  window.addEventListener("cb:map-ready", (e) => handleMapReady(e?.detail?.map));
  // Falls Bootstrap die Map nur global ablegt:
  if (!CURRENT_MAP && window.__CURRENT_MAP__) handleMapReady(window.__CURRENT_MAP__);

  // --- Render-Loop (Event-gesteuert) ----------------------------------------
  function renderFrame() {
    // Canvas wischen
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = "#0d1412";           // dunkler Grund
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    const hasTS = ensureTileset();
    if (!hasTS) {
      warn("Frames noch nicht da → skip.");
      drawGrid(64);
      return;
    }

    const { frames, image } = TILESET;
    const any = pickAnyFrame(frames);
    if (!any) {
      warn("Tileset ohne Frames → skip.");
      drawGrid(64);
      return;
    }

    // Kamera
    const scale = Camera.scale || 1;
    const offX  = Camera.offsetX || 0;
    const offY  = Camera.offsetY || 0;

    // Map vorhanden?
    const map = CURRENT_MAP;
    let cols = 0, rows = 0;

    // Versuche Map-Shape zu erkennen
    // a) Tiled 2D: map.tiles[row][col]
    // b) Linear: map.tiles[], plus map.width/map.height
    // c) Kein Map-Content → Fallback-Teppich
    let drawAsFallback = false;

    if (map?.tiles && Array.isArray(map.tiles[0])) {
      rows = map.tiles.length;
      cols = map.tiles[0].length;
    } else if (map?.tiles && map?.width && map?.height) {
      cols = map.width; rows = map.height;
    } else if (map?.width && map?.height) {
      cols = map.width; rows = map.height;
      drawAsFallback = true;
    } else {
      // keine Map: Bildschirm mit einem Tile kacheln
      cols = Math.ceil(cvs.width  / (TILE_SIZE * scale)) + 2;
      rows = Math.ceil(cvs.height / (TILE_SIZE * scale)) + 2;
      drawAsFallback = true;
    }

    // Zeichnen
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const startCol = Math.floor(offX / (TILE_SIZE * scale));
    const startRow = Math.floor(offY / (TILE_SIZE * scale));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Frame-Key bestimmen: wenn Map keine Codes liefert → irgendein Frame
        let fr = any;

        if (!drawAsFallback && map?.tiles) {
          const code = Array.isArray(map.tiles[0])
            ? map.tiles[r]?.[c]
            : map.tiles[r * cols + c];

          // einfache Heuristik: wenn der Code ein Key-Name ist, nutze ihn;
          // wenn es eine Zahl ist, mappe auf r/c im 16x16-Raster:
          if (typeof code === "string" && frames[code]) {
            fr = frames[code];
          } else if (Number.isInteger(code)) {
            const rr = Math.floor(code / 16);
            const cc = code % 16;
            const key = `terrain_r${rr}_c${cc}`;
            fr = frames[key] || any;
          }
        }

        const sx = fr.x, sy = fr.y, sw = fr.w, sh = fr.h;

        const wx = c * TILE_SIZE;
        const wy = r * TILE_SIZE;

        const sxn = (wx * scale) - offX;
        const syn = (wy * scale) - offY;
        const dw  = TILE_SIZE * scale;
        const dh  = TILE_SIZE * scale;

        ctx.drawImage(image, sx, sy, sw, sh, Math.round(sxn), Math.round(syn), Math.round(dw), Math.round(dh));
      }
    }

    ctx.restore();

    // feines Grid oben drüber – hilft beim Kontrollieren
    drawGrid(Math.round(TILE_SIZE * scale));
  }

  // Der Renderer arbeitet auf Events
  function tick() {
    try { renderFrame(); } catch (e) { err("Render-Fehler:", e); }
    // Der eigentliche Takt kommt von game.bootstrap → cb:render-frame,
    // aber falls das mal nicht feuert, animieren wir minimal weiter:
    // (kleiner Sicherheitsgurt)
  }

  // Unsere Haupt-Clock: auf jedes Frame-Event rendern
  window.addEventListener("cb:render-frame", tick);

  ok("Modul geladen (v17.9.2): wartet auf cb:render-frame, zeichnet Terrain wenn verfügbar.");
})();
