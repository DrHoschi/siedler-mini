/* assets/core/core.map.js — v17.9.1 */
(function () {
  "use strict";

  const MOD  = "[map]";
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // ---- Konstanten -----------------------------------------------------------
  const TILESET_META_URL = "assets/tiles/tileset.terrain.json"; // <— wichtig: kein "./"
  const CANVAS_ID        = "game";

  // ---- interner State -------------------------------------------------------
  const State = {
    cvs: null,
    ctx: null,
    tilesetMeta: null,   // JSON atlas
    tilesetImg: null,    // Image object
    map: null,           // geladene Map (map-mini.json)
    ready: false
  };

  // ---- Loader ---------------------------------------------------------------
  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return await res.json();
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image load failed: " + url));
      img.src = url + (url.includes("?") ? "" : `?v=${Date.now()}`); // cache buster
    });
  }

  async function loadTileset() {
    // Tileset-JSON
    const meta = await loadJSON(TILESET_META_URL);
    const imgUrl = meta?.meta?.image;
    if (!imgUrl) throw new Error("Tileset-JSON ohne meta.image");

    // PNG (Pfad kommt aus der JSON – bei dir: assets/tiles/tileset.terrain.png)
    const img = await loadImage(imgUrl);

    State.tilesetMeta = meta;
    State.tilesetImg  = img;

    ok(`Tileset geladen: ${imgUrl}`);
  }

  async function loadMapFromCanvas() {
    const cvs = document.getElementById(CANVAS_ID);
    if (!cvs) throw new Error("Canvas #game fehlt");
    State.cvs = cvs;
    State.ctx = cvs.getContext("2d");
    const url = cvs.getAttribute("data-map") || "assets/maps/map-mini.json";
    const data = await loadJSON(url);
    State.map = data;
    ok(`Map geladen: ${url}`);
  }

  // ---- Zeichnen -------------------------------------------------------------
  function drawTerrain(ctx, cam) {
    // Sicherheitsnetze
    if (!State.map || !State.tilesetMeta || !State.tilesetImg) return;

    const frames   = State.tilesetMeta.frames || {};
    const tileSize = State.tilesetMeta.meta?.tileSize || 64;
    const rows     = State.map.grid?.rows || State.map.rows || 0;
    const cols     = State.map.grid?.cols || State.map.cols || 0;
    const tiles    = State.map.tiles || [];

    // Kamera (optional)
    const camX   = cam?.x || 0;
    const camY   = cam?.y || 0;
    const zoom   = cam?.zoom || 1;

    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);

    // Grundfläche leeren
    ctx.clearRect(camX, camY, State.cvs.width / zoom, State.cvs.height / zoom);

    // Tiles zeichnen
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = tiles[r]?.[c]; // z. B. "terrain_r0_c0"
        const fr = id && frames[id];
        if (!fr) continue;

        ctx.drawImage(
          State.tilesetImg,
          fr.x, fr.y, fr.w, fr.h,
          c * tileSize, r * tileSize, tileSize, tileSize
        );
      }
    }

    ctx.restore();
  }

  // ---- Drawer registrieren --------------------------------------------------
  function registerDrawer() {
    // Kamera-Quelle
    const Camera = window.Game?.Camera || window.CBGame?.Camera || null;

    function onFrame() {
      try {
        const cam = Camera?.get?.() || Camera || { x: 0, y: 0, zoom: 1 };
        drawTerrain(State.ctx, cam);
      } catch (e) {
        err("Render-Fehler:", e?.message || e);
      }
    }

    // über die Overlay-Hooks (unser Render-Ticker)
    window.addEventListener("cb:render-frame", onFrame);
    ok("bereit – Drawer registriert");
  }

  // ---- Boot ----------------------------------------------------------------
  async function boot() {
    try {
      await loadTileset();
    } catch (e) {
      err(`Map-Load fehlgeschlagen: Tileset nicht erreichbar: ${TILESET_META_URL}`);
      return;
    }

    await loadMapFromCanvas();
    registerDrawer();
    State.ready = true;
  }

  // Start an cb:game-start koppeln
  window.addEventListener("cb:game-start", () => {
    if (!State.ready) boot().catch(e => err("Boot-Fehler:", e?.message || e));
  });

  // für Legacy-Flows, falls sofort gerendert werden soll
  window.Game = window.Game || {};
  window.Game.Map = window.Game.Map || {};
  window.Game.Map.load = async (data) => { State.map = data; };

})();
