/*! core.render.js – v17.9.4
 *  Aufgaben:
 *  - Auf cb:game-start warten oder sofort starten, wenn schon gefeuert.
 *  - Tileset-Frames beziehen (vom Asset-Layer ODER via FIX B Fallback).
 *  - Terrain zuverlässig zeichnen (ein Pattern als Tapete), damit die Map sichtbar ist.
 *  - Keine UI-Elemente mitschwenken/-zoomen (Canvas liegt unter den FABs).
 */

(function () {
  const LOG = (...a) => console.log("[render]", ...a);

  // --- Canvas anlegen (einmalig) -------------------------------------------
  const ROOT_ID = "game" ; // Falls du einen anderen Root hast, hier anpassen
  const CANVAS_ID = "map-canvas";
  let canvas = document.getElementById(CANVAS_ID);
  if (!canvas) {
    const root = document.getElementById(ROOT_ID) || document.body;
    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      zIndex: "0",            // < FABs/Overlays
      touchAction: "none",    // Scroll/Pinch nicht vom Canvas abfangen
      imageRendering: "auto",
    });
    root.prepend(canvas);
  }
  const ctx = canvas.getContext("2d");

  // Size helper: immer auf Viewport volle Größe
  function resizeToViewport() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  resizeToViewport();
  window.addEventListener("resize", resizeToViewport);

  // --- State ----------------------------------------------------------------
  const STATE = {
    started: false,
    frames: null,        // { frameName: {x,y,w,h}, ... }
    img: null,           // Image for tileset.terrain.png
    tileSize: 64,
    pattern: null,       // CanvasPattern for background "tapete"
    raf: 0,
  };

  // --- Frames besorgen (vom Asset-Layer oder FIX B) -------------------------
  const TILESET_JSON_URL = "assets/tiles/tileset.terrain.json";
  const TILESET_IMG_URL  = "assets/tiles/tileset.terrain.png";

  async function ensureFrames() {
    if (STATE.frames && STATE.img) return true;

    // 1) Versuch: vom (neuen) Asset-Layer lesen
    try {
      const A = window.Assets || window.assets;
      if (A && typeof A.get === "function") {
        const meta = A.get("tileset.terrain.json") || A.get("tileset.terrain");
        const png  = A.get("tileset.terrain.png") || A.get("tileset.terrain.image");
        if (meta && meta.frames && png && png instanceof HTMLImageElement) {
          STATE.frames = meta.frames;
          STATE.tileSize = (meta.meta && meta.meta.tileSize) || 64;
          STATE.img = png;
          LOG("Frames vom Asset-Layer übernommen.");
          return true;
        }
      }
    } catch (e) {
      // still try fallback
    }

    // 2) FIX B: selbst laden (JSON + PNG)
    try {
      LOG("FIX B aktiv – lade Tileset JSON selbst:", TILESET_JSON_URL);
      const resp = await fetch(TILESET_JSON_URL, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();

      STATE.frames   = json.frames || null;
      STATE.tileSize = (json.meta && json.meta.tileSize) || 64;

      LOG("FIX B – lade PNG:", TILESET_IMG_URL);
      STATE.img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = TILESET_IMG_URL + `?t=${Date.now()}`; // Cache-Bust
      });

      LOG("Frames verfügbar (Fallback).");
      return !!(STATE.frames && STATE.img);
    } catch (err) {
      console.error("[render] FIX B fehlgeschlagen:", err);
      return false;
    }
  }

  // --- Pattern (Tapete) aus erstem Terrain-Frame bauen ----------------------
  function buildPattern() {
    if (!STATE.frames || !STATE.img) return;
    const first = STATE.frames["terrain_r0_c0"] || Object.values(STATE.frames)[0];
    if (!first) return;

    const tmp = document.createElement("canvas");
    tmp.width  = first.w;
    tmp.height = first.h;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(
      STATE.img,
      first.x, first.y, first.w, first.h,
      0, 0, first.w, first.h
    );
    STATE.pattern = ctx.createPattern(tmp, "repeat");
  }

  // --- Zeichnen -------------------------------------------------------------
  function draw() {
    resizeToViewport();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (STATE.pattern) {
      ctx.fillStyle = STATE.pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Fallback-Hintergrund (dunkel) – sollte kaum noch sichtbar sein
      ctx.fillStyle = "#0e1414";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function loop() {
    STATE.raf = window.requestAnimationFrame(loop);
    draw();
  }

  // --- Start-Sequenz --------------------------------------------------------
  async function startRenderer() {
    if (STATE.started) return;
    STATE.started = true;

    LOG("init() → starte, warte auf Frames/PNG.");
    const ok = await ensureFrames();
    if (!ok) {
      LOG("Frames noch nicht da → Loop erst nach Erhalt starten.");
      // kleiner Poll, falls Asset-Layer die Frames später liefert
      const iv = setInterval(async () => {
        if (await ensureFrames()) {
          clearInterval(iv);
          buildPattern();
          LOG("Frames verfügbar → starte Loop.");
          loop();
        }
      }, 300);
      return;
    }

    buildPattern();
    LOG("Modul bereit (v17.9.4): starte Loop.");
    loop();
  }

  // --- Event-Wiring (früh + spät) ------------------------------------------
  // a) Sofort starten, wenn game bereits lief (z. B. bei Reload)
  if (window.__cb_game_started__) {
    LOG("cb:game-start war schon da → init sofort.");
    startRenderer();
  }

  // b) Normales Ereignis
  window.addEventListener("cb:game-start", () => {
    window.__cb_game_started__ = true;
    LOG("cb:game-start erhalten → init()");
    startRenderer();
  }, { once: true });

  // Falls die Seite den Event auf `document` feuert:
  document.addEventListener("cb:game-start", () => {
    window.__cb_game_started__ = true;
    LOG("cb:game-start(document) → init()");
    startRenderer();
  }, { once: true });

  LOG("Modul geladen (v17.9.4) und window.Render registriert; wartet auf cb:game-start.");
  window.Render = { start: startRenderer, _state: STATE };
})();
