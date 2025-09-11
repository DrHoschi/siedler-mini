/* assets/core/core.render.js — v17.9.3
   Sichtbares Terrain nach "Spiel starten".
   - Stellt window.Render bereit (init, tick)
   - Hört auf Tileset-Load (map) ODER lädt tileset.terrain.json selbst als Fallback
   - Zeichnet Terrain-Backdrop + optionales Grid
   - Nutzt Camera (falls vorhanden)
*/

(function () {
  "use strict";

  const MOD = "[render]";
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  // ---------------------------------------------------------------------------
  // Canvas anlegen
  // ---------------------------------------------------------------------------
  const CANVAS_ID = "game-canvas";
  let   canvas    = document.getElementById(CANVAS_ID);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.imageRendering = "pixelated";
    canvas.style.zIndex = "0"; // UI schwebt darüber
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext("2d", { alpha: false });

  function resize() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width  = Math.floor(canvas.clientWidth  * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // „CSS-Pixel“-Koordinaten
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------------------------------------------------------------------------
  // Tileset/Frames
  // ---------------------------------------------------------------------------
  const TILESET_JSON_URL = "assets/tiles/tileset.terrain.json";
  const TILE_IMG_URL     = "assets/tiles/tileset.terrain.png";

  let frames = null;        // Map<string, {x,y,w,h}>
  let tileImg = null;       // HTMLImageElement
  let tileSize = 64;        // Default, wird aus JSON meta überschrieben

  function haveFrames() {
    return frames && tileImg && tileImg.complete;
  }

  // Versuche Frames aus „map“-Modul abzuholen (falls dieses bereits geladen hat)
  function adoptFramesFromMap(detail) {
    try {
      // Variante A: map feuert CustomEvent mit detail { frames, meta, imageUrl }
      if (detail?.frames) {
        frames   = detail.frames;
        tileSize = detail.meta?.tileSize ?? tileSize;
        const url = detail.imageUrl || TILE_IMG_URL;
        if (!tileImg || tileImg.src.endsWith("/placeholder")) {
          tileImg = new Image();
          tileImg.src = url;
          tileImg.onload = () => ok("Tileset-Bild übernommen (map):", url);
        }
        ok("Frames vom map-Modul übernommen.");
        return true;
      }

      // Variante B: globaler Namespace (selten)
      if (window.TILESET?.frames) {
        frames   = window.TILESET.frames;
        tileSize = window.TILESET.meta?.tileSize ?? tileSize;
        if (!tileImg) {
          tileImg = new Image();
          tileImg.src = window.TILESET.meta?.image || TILE_IMG_URL;
          tileImg.onload = () => ok("Tileset-Bild übernommen (global).");
        }
        ok("Frames aus window.TILESET übernommen.");
        return true;
      }
    } catch (e) {
      warn("Adoption der Frames fehlgeschlagen:", e);
    }
    return false;
  }

  // Fallback: JSON selbst laden
  async function loadFramesSelf() {
    try {
      const res = await fetch(TILESET_JSON_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();

      frames   = json.frames || null;
      tileSize = json.meta?.tileSize ?? tileSize;

      tileImg = new Image();
      tileImg.src = json.meta?.image || TILE_IMG_URL;
      await new Promise((done, fail) => {
        tileImg.onload = done;
        tileImg.onerror = fail;
      });

      ok("Tileset selbst geladen:", TILESET_JSON_URL);
    } catch (e) {
      err("Tileset-Load (Fallback) fehlgeschlagen:", e);
    }
  }

  // Auf Events hören, die das map-Modul beim JSON-Load feuert
  window.addEventListener("cb:tileset-ready", (ev) => {
    if (adoptFramesFromMap(ev?.detail)) {
      ok("Frames via cb:tileset-ready erhalten.");
    }
  });

  // ---------------------------------------------------------------------------
  // Camera / Viewport
  // ---------------------------------------------------------------------------
  function getCamera() {
    const Cam = window.Camera;
    if (!Cam) return { x: 0, y: 0, zoom: 1 };
    return { x: Cam.x || 0, y: Cam.y || 0, zoom: Cam.zoom || 1 };
  }

  // ---------------------------------------------------------------------------
  // Zeichnen
  // ---------------------------------------------------------------------------
  const SHOW_GRID = true; // temporär zum Debuggen

  function drawGrid(size = 128) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let x = 0; x < canvas.clientWidth; x += size) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.clientHeight); ctx.stroke();
    }
    for (let y = 0; y < canvas.clientHeight; y += size) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.clientWidth, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawTerrain() {
    // Wenn Frames da sind, nutze das erste „Gras“-Frame als Tapete
    if (haveFrames()) {
      const firstKey = Object.keys(frames)[0];
      const f = frames[firstKey];
      if (!f) return;

      const { x:camX, y:camY, zoom } = getCamera();

      const tileW = tileSize * zoom;
      const tileH = tileSize * zoom;

      // kleine Randsäume, damit beim Panning nichts durchscheint
      const cols = Math.ceil(canvas.clientWidth  / tileW) + 2;
      const rows = Math.ceil(canvas.clientHeight / tileH) + 2;

      // Start so ausrichten, dass beim Scrollen ein nahtloses Muster entsteht
      const offX = -((camX % tileSize) + tileSize) % tileSize;
      const offY = -((camY % tileSize) + tileSize) % tileSize;

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const dx = offX + c * tileW;
          const dy = offY + r * tileH;
          ctx.drawImage(
            tileImg,           // Quelle
            f.x, f.y, f.w, f.h, // Ausschnitt
            dx, dy, tileW, tileH // Ziel
          );
        }
      }
    } else {
      // Noch keine Frames? Sichtbarer Platzhalter statt „schwarz“
      ctx.fillStyle = "#0d1416";
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText("…lade Tileset…", 16, 28);
    }
  }

  function frame() {
    // Hintergrund löschen
    ctx.fillStyle = "#0b0f10";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Terrain
    drawTerrain();

    // optionales Debug-Grid
    if (SHOW_GRID) drawGrid(128);

    // Nächstes Frame anfordern
    window.requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Render-API für bootstrap (global!)
  // ---------------------------------------------------------------------------
  window.Render = {
    init() {
      ok("Modul bereit (v17.9.3): wartet auf Frames + startet Loop.");
      // Versuch 1: Frames vom map-Modul übernehmen (falls schon da)
      if (!adoptFramesFromMap()) {
        // Versuch 2: Fallback selbst laden (ohne hart zu blockieren)
        loadFramesSelf().then(() => {
          if (haveFrames()) ok("Frames verfügbar (Fallback).");
          else warn("Noch keine Frames nach Fallback-Load.");
        });
      }
      // Animations-Loop starten
      window.requestAnimationFrame(frame);
    },
    tick() {
      // Wird von bootstrap ggf. zyklisch aufgerufen; unser Loop läuft ohnehin.
    },
  };

  // Beim Spielstart initialisieren
  window.addEventListener("cb:game-start", () => {
    ok("cb:game-start erhalten → init()");
    window.Render.init();
  });

  // Falls bootstrap früher prüfen sollte: sofort registrieren
  ok("Modul geladen (v17.9.3) und window.Render registriert; wartet auf cb:game-start.");

})();
