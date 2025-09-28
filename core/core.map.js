/* core.map.js — v17.0.1 (Tileset-Loader robust) */
(function () {
  "use strict";

  const MOD   = "[map]";
  const info  = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const ok    = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const warn  = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err   = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // Globale Ablage ähnlich deinem assets-Modul
  window.__ASSETS = window.__ASSETS || {};

  // --- Hilfen ---------------------------------------------------------------
  async function fetchJSON(url) {
    const resolved = new URL(url, window.location.href).toString();
    info("lade JSON:", resolved);
    const res = await fetch(resolved, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${resolved}`);
    // nur echtes JSON, keine Kommentare (jsonc) – deine Datei ist gültig
    return res.json();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error("Bild nicht erreichbar: " + src));
      img.src = new URL(src, window.location.href).toString();
    });
  }

  // --- Tileset laden (robust, mit Fallback) --------------------------------
  async function loadTileset() {
    // 1. Versuch: terrain-Atlas
    const candidates = [
      "assets/tiles/tileset.terrain.json",
      "assets/tiles/tileset.json"
    ];

    let atlas = null, chosen = null;
    for (const url of candidates) {
      try {
        atlas = await fetchJSON(url);
        chosen = url;
        break;
      } catch (e) {
        warn("Tileset-Kandidat verworfen:", url, "→", e.message);
      }
    }
    if (!atlas) {
      throw new Error("Tileset nicht erreichbar: " + candidates.join(" | "));
    }

    // Bildpfad aus 'meta.image' verwenden (deine Datei hat das Feld)
    const imgPath = atlas?.meta?.image;
    if (!imgPath) throw new Error("Tileset.meta.image fehlt im JSON");

    const img = await loadImage(imgPath);

    window.__ASSETS.tileset = {
      json: atlas,
      image: img,
      tileSize: atlas?.meta?.tileSize || 64
    };

    ok("Tileset geladen (%s)", chosen);
  }

  // --- Map-API (minimal für dein Setup) ------------------------------------
  const MapAPI = {
    async load(data) {
      // Hier würdest du deine map-mini.json verarbeiten.
      // Entscheidend ist: Tileset MUSS vorher da sein.
      if (!window.__ASSETS.tileset) {
        await loadTileset().catch(e => { throw e; });
      }
      window.__CURRENT_MAP__ = data;
      ok("bereit – Drawer registriert");
      // Zeichnen beim Render-Frame
      window.addEventListener("cb:render-frame", drawFrame);
    }
  };

  // --- Einfacher Drawer: zeigt ein sichtbares Feld statt Schwarz -----------
  function drawFrame() {
    try {
      const cvs = document.getElementById("game");
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;

      const ts = window.__ASSETS.tileset;
      if (!ts?.image) return;

      // Demo: kachelt das erste Frame als sichtbaren Beweis, dass das Tileset da ist
      const frame = ts.json.frames?.["terrain_r0_c0"];
      if (!frame) return;

      const TILE = ts.tileSize || 64;
      const cols = Math.ceil(cvs.width  / TILE);
      const rows = Math.ceil(cvs.height / TILE);

      // Clear
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      // Gitter-Hintergrund leicht
      ctx.fillStyle = "#0b0f0d";
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          ctx.drawImage(
            ts.image,
            frame.x, frame.y, frame.w, frame.h,
            x * TILE, y * TILE, TILE, TILE
          );
        }
      }
    } catch (e) {
      err("drawFrame:", e.message || e);
    }
  }

  // --- Public hook ----------------------------------------------------------
  window.Game = window.Game || {};
  window.Game.Map = MapAPI;

  // Beim Start gleich versuchen, das Tileset vorzuwärmen (bessere Logs)
  window.addEventListener("cb:game-start", () => {
    loadTileset().catch(e => err("Map-Load fehlgeschlagen:", e.message));
  });
})();
