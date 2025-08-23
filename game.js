// ============================================================================
// game.js – Hauptlogik für Siedler-Mini
// Version: v11.1r6 (angepasst 2025-08-22)
// -----------------------------------------------------------------------------
// Wichtige Änderungen:
//  • Doppeltes "bereit"-Log entfernt (jetzt nur 1× beim Initialisieren)
//  • Konsistente Debug-Logs in Start/Reload
//  • Cache-Busting an Map-URL für Reload
//  • Public API (window.GameLoader, window.GameCamera) für Boot/UI
//  • Kommentare ausführlich belassen für spätere Wartung
// ============================================================================

// -----------------------------
// Globale Konstanten & Logger
// -----------------------------
const VERSION = "v11.1r6";              // Spielversion
const L = {
  log:  (...a) => console.log("[game]", ...a),
  warn: (...a) => console.warn("[game]", ...a),
  err:  (...a) => console.error("[game]", ...a)
};

// -----------------------------
// Game-State Container
// -----------------------------
window.game = {
  state: {},        // aktueller Status (Zoom, Kamera, Entities)
  camera: null,     // Kameraobjekt
  map: null,        // geladene Karte
  canvas: null,     // Canvas-Referenz
  ctx: null,        // 2D-Kontext
  running: false,   // ob Spiel-Loop läuft
};

// -----------------------------
// Hilfsfunktionen
// -----------------------------

// Dummy: Kamera erstellen
function createCamera() {
  return {
    x: 0, y: 0, zoom: 1,
    setZoom(z) {
      this.zoom = Math.max(0.5, Math.min(3.5, z)); // Zoom begrenzen
      L.log("Zoom gesetzt:", this.zoom.toFixed(2));
    },
    setPosition(x, y) {
      this.x = x; this.y = y;
      L.log("Kamera bewegt:", x, y);
    }
  };
}

// Dummy: Map laden (Simulation)
async function loadMap(url) {
  L.log("Lade Map:", url);
  // JSON laden
  const res = await fetch(url);
  const json = await res.json();
  return json; // Rückgabe Map-Daten
}

// -----------------------------
// Game-Start
// -----------------------------
async function startGame(mapUrl) {
  try {
    L.log("Starte Karte:", mapUrl);

    // Kamera erstellen
    window.game.camera = createCamera();
    window.game.state = { zoom: 1, camX: 0, camY: 0 };

    // Canvas-Setup
    const canvas = document.querySelector("canvas#game");
    if (!canvas) throw new Error("Kein Canvas gefunden (#game).");
    window.game.canvas = canvas;
    window.game.ctx = canvas.getContext("2d");

    // Map laden
    const data = await loadMap(mapUrl + "?v=" + Date.now());
    window.game.map = data;

    L.log("Map OK:", data);
    L.log("gestartet •", mapUrl);

    window.game.running = true;
    gameLoop();
  } catch (err) {
    L.err("Fehler beim Start:", err);
  }
}

// -----------------------------
// Game-Reload
// -----------------------------
async function reloadGame(mapUrl) {
  try {
    const bustUrl = mapUrl + "?v=" + Date.now();
    L.log("Reload Karte:", bustUrl);

    const data = await loadMap(bustUrl);
    window.game.map = data;

    L.log("Reload OK •", bustUrl);
  } catch (err) {
    L.err("Reload-Fehler:", err);
  }
}

// -----------------------------
// Game-Loop
// -----------------------------
function gameLoop() {
  if (!window.game.running) return;

  const ctx = window.game.ctx;
  const cam = window.game.camera;
  const canvas = window.game.canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Beispiel: Raster zeichnen, um Zoom zu prüfen
  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  ctx.strokeStyle = "#333";
  for (let x = 0; x < canvas.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  ctx.restore();

  requestAnimationFrame(gameLoop);
}

// -----------------------------
// Public API für Boot.js / UI
// -----------------------------
window.GameLoader = {
  start: (mapUrl) => startGame(mapUrl),
  reload: (mapUrl) => reloadGame(mapUrl),
};
window.GameCamera = {
  setZoom: (z) => window.game?.camera?.setZoom?.(z),
  setPosition: (x, y) => window.game?.camera?.setPosition?.(x, y),
};

// -----------------------------
// Initialmeldung (nur 1x!)
// -----------------------------
L.log("bereit •", VERSION);
