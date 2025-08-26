/* ============================================================================
 * game.js — v16.1.0
 * ----------------------------------------------------------------------------
 * Ziele:
 *  - Stabile Initialisierung mit klaren Logs (✅⚠️❌) inkl. Versionsnummern
 *  - Kompatibler Map-Loader (width/height/tileSize, optional layers/tiles)
 *  - Einfache Bau-Tools: "Hütte" & "Straße" (Platzhalter-Rendering)
 *  - Sanfte Fallbacks: Editor/Inspector Hooks sind optional (Warnung statt Fehler)
 * 
 * Tastenkürzel:
 *   B  -> Hütte bauen
 *   R  -> Straße bauen
 *   ESC-> Tool abwählen
 * 
 * Abhängigkeiten:
 *   - Canvas-Element mit id="game"
 *   - (Optional) Buttons können später via data-Attribut gebunden werden
 * 
 * Changelog:
 *   v16.1.0  Erste „Bauen“-Iteration (Tools, Platzieren, Rendern)
 * ========================================================================== */

(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Version + kleines Log-System mit Icons
  // ---------------------------------------------------------------------------
  const GAME_VERSION = "16.1.0";

  const log = {
    ok:    (msg) => console.log(`[${time()}] ✅ (ok) ${msg}`),
    warn:  (msg) => console.warn(`[${time()}] ⚠️ (warn) ${msg}`),
    err:   (msg) => console.error(`[${time()}] ❌ (err) ${msg}`),
    info:  (msg) => console.log(`[${time()}] ℹ️ (info) ${msg}`),
  };
  function time() {
    const d = new Date();
    return d.toTimeString().slice(0,8);
  }

  // Beim Laden einmalig Version melden
  log.ok(`game.js geladen, game.js v${GAME_VERSION}`);

  // ---------------------------------------------------------------------------
  // Globale Game-Struktur auf window, damit index.html und Hooks Zugriff haben
  // ---------------------------------------------------------------------------
  const Game = {
    version: GAME_VERSION,
    canvas: null,
    ctx: null,
    dpr: Math.max(1, window.devicePixelRatio || 1),
    state: {
      map: null,         // {width, height, tileSize}
      running: false,
      tool: null,        // "build:hut" | "build:road" | null
      buildings: [],     // {type:"hut", xTiles, yTiles}
      roads: new Set(),  // Set von "x,y" Strings für Straßen-Tiles
    },
    start,
    setTool,
    clearTool,
    placeAtPixel,
    worldToTile,
    tileToWorld,
    render,
  };
  window.Game = Game;

  // Optional bereitstellen, was der Loader erwartet:
  window.GameLoader = {
    start: start, // bleibt kompatibel: index ruft GameLoader.start(path) auf
  };

  // ---------------------------------------------------------------------------
  // Canvas vorbereiten
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById("game");
  if (!canvas) {
    log.err("Canvas mit id=\"game\" nicht gefunden – bitte index.html prüfen.");
    return;
  }
  Game.canvas = canvas;
  Game.ctx = canvas.getContext("2d");

  function resizeCanvasToDisplaySize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width  * Game.dpr));
    const h = Math.max(1, Math.floor(rect.height * Game.dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
    }
  }

  // ---------------------------------------------------------------------------
  // Input (Tastatur & Maus/Touch)
  // ---------------------------------------------------------------------------
  window.addEventListener("keydown", (e) => {
    if (e.key === "b" || e.key === "B") {
      setTool("build:hut");
    } else if (e.key === "r" || e.key === "R") {
      setTool("build:road");
    } else if (e.key === "Escape") {
      clearTool();
    }
  });

  // Click/Tap: platzieren je nach Tool
  canvas.addEventListener("click", (e) => {
    placeAtPixel(e.clientX, e.clientY);
  }, {passive:true});

  // ---------------------------------------------------------------------------
  // Tools
  // ---------------------------------------------------------------------------
  function setTool(toolName) {
    Game.state.tool = toolName;
    if (toolName === null) {
      log.info("Tool abgewählt.");
    } else {
      log.ok(`Tool aktiv: ${toolName}`);
    }
    // Ein kleines „Ghost“-Render gibt's einfach durch Re-Render (siehe render()).
    render();
  }
  function clearTool() { setTool(null); }

  // Platzieren (entscheidet je nach aktivem Tool)
  function placeAtPixel(clientX, clientY) {
    if (!Game.state.map) { log.warn("Keine Map geladen – Platzieren übersprungen."); return; }
    if (!Game.state.tool) { return; }

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * Game.dpr;
    const y = (clientY - rect.top)  * Game.dpr;

    const { tx, ty } = worldToTile(x, y);
    if (tx < 0 || ty < 0 || tx >= Game.state.map.width || ty >= Game.state.map.height) {
      log.warn("Platzieren außerhalb der Map ignoriert.");
      return;
    }

    if (Game.state.tool === "build:hut") {
      // einfache 1x1-Hütte
      Game.state.buildings.push({ type:"hut", xTiles: tx, yTiles: ty });
      log.ok(`Hütte platziert @ ${tx},${ty}`);
    } else if (Game.state.tool === "build:road") {
      const key = `${tx},${ty}`;
      Game.state.roads.add(key);
      log.ok(`Straße gesetzt @ ${tx},${ty}`);
    }
    render();
  }

  // ---------------------------------------------------------------------------
  // Koordinaten-Helfer
  // ---------------------------------------------------------------------------
  function worldToTile(wx, wy) {
    const { tileSize } = Game.state.map || { tileSize: 64 };
    // Canvas arbeitet in „Geräte-Pixeln“; unsere world coords sind bereits dpr-skalierte Canvas-Pixel
    const tx = Math.floor(wx / (tileSize));
    const ty = Math.floor(wy / (tileSize));
    return { tx, ty };
  }
  function tileToWorld(tx, ty) {
    const { tileSize } = Game.state.map || { tileSize: 64 };
    return { x: tx * tileSize, y: ty * tileSize };
  }

  // ---------------------------------------------------------------------------
  // Start / Loader
  // ---------------------------------------------------------------------------
  async function start(mapPath) {
    // index ruft uns mit dem gewählten Pfad auf
    const chosen = mapPath || "./assets/maps/map-mini.json";
    log.ok(`GameLoader.start ${chosen}`);

    // Map laden
    let mapJson = null;
    try {
      const res = await fetch(chosen, { cache: "no-store" });
      const txt = await res.text();
      mapJson = JSON.parse(txt);
    } catch (err) {
      log.err(`Map LOAD FAIL: ${err?.message || err}`);
      return;
    }

    // Minimal-Validierung
    const width    = mapJson.width  || (mapJson.mapWidth  ?? 0);
    const height   = mapJson.height || (mapJson.mapHeight ?? 0);
    const tileSize = mapJson.tileSize || 64;

    if (!width || !height) {
      log.err("Map: width/height fehlen oder sind 0");
      return;
    }

    Game.state.map = { width, height, tileSize };
    Game.state.buildings = [];
    Game.state.roads.clear();

    // Rendering starten
    Game.state.running = true;
    render();
    log.ok("Game started");
  }

  // ---------------------------------------------------------------------------
  // Rendering (Platzhalter-Grafik)
  // ---------------------------------------------------------------------------
  function render() {
    if (!Game.ctx) return;
    resizeCanvasToDisplaySize();
    const ctx = Game.ctx;
    const { width, height, tileSize } = Game.state.map || { width: 16, height: 10, tileSize: 64 };

    // Hintergrund
    ctx.save();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // Grün wie bisher
    ctx.fillStyle = "#0f7c3a";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Grid zeichnen
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    for (let x=0; x<=width; x++) {
      const px = x * tileSize;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height * tileSize);
      ctx.stroke();
    }
    for (let y=0; y<=height; y++) {
      const py = y * tileSize;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width * tileSize, py);
      ctx.stroke();
    }

    // Straßen (Tiles dunkelgrau)
    ctx.fillStyle = "#444";
    for (const key of Game.state.roads) {
      const [tx, ty] = key.split(",").map(n => parseInt(n, 10));
      const { x, y } = tileToWorld(tx, ty);
      ctx.fillRect(x, y, tileSize, tileSize);
    }

    // Gebäude (Hütte = braun)
    for (const b of Game.state.buildings) {
      const { x, y } = tileToWorld(b.xTiles, b.yTiles);
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
      // kleine „Tür“
      ctx.fillStyle = "#3c2a14";
      ctx.fillRect(x + tileSize/2 - 6, y + tileSize - 16, 12, 12);
    }

    // Ghost-Preview für aktives Tool (snapping zum Maus-Tile)
    if (Game.state.tool) {
      const mouse = lastMouseOnCanvas; // evtl. null
      if (mouse && Game.state.map) {
        const { tx, ty } = worldToTile(mouse.x, mouse.y);
        if (tx>=0 && ty>=0 && tx<width && ty<height) {
          const { x, y } = tileToWorld(tx, ty);
          ctx.globalAlpha = 0.45;
          if (Game.state.tool === "build:hut") {
            ctx.fillStyle = "#8b5a2b";
            ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
          } else if (Game.state.tool === "build:road") {
            ctx.fillStyle = "#444";
            ctx.fillRect(x, y, tileSize, tileSize);
          }
          ctx.globalAlpha = 1;
        }
      }
    }

    ctx.restore();
  }

  // einfache Mausposition-Tracker (in Canvas-Koordinaten, dpr-korrigiert)
  let lastMouseOnCanvas = null;
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    lastMouseOnCanvas = {
      x: (e.clientX - rect.left) * Game.dpr,
      y: (e.clientY - rect.top)  * Game.dpr
    };
    if (Game.state.tool) render(); // für Ghost-Preview
  }, {passive:true});
  canvas.addEventListener("mouseleave", () => {
    lastMouseOnCanvas = null;
    if (Game.state.tool) render();
  }, {passive:true});

  // ---------------------------------------------------------------------------
  // Optionale Hooks (Editor/Inspector) – derzeit Dummy/Warnung
  // ---------------------------------------------------------------------------
  if (!window.GameEditor) {
    window.GameEditor = {
      open: () => log.warn("(Dummy) Editor.open() – echtes Modul noch nicht eingebunden."),
    };
  }
  if (!window.GameInspector) {
    window.GameInspector = {
      toggle: () => log.warn("(Dummy) Inspector.toggle() – echtes Modul noch nicht eingebunden."),
    };
  }

  // Index kann auf diese Funktionsnamen binden, ohne zu crashen:
  window.__openEditor = () => window.GameEditor.open();
  window.__toggleInspector = () => window.GameInspector.toggle();

  // ---------------------------------------------------------------------------
  // Abschlussmeldung
  // ---------------------------------------------------------------------------
  log.ok(`game.js initialisiert (v${GAME_VERSION})`);
})();
