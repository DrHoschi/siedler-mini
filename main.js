// main.js
// Einstiegspunkt: Canvas, Kamera, Bau-Flow, Rendering

import { ASSETS } from "./assets.js";
import { TERRAIN } from "./terrain.js";
import { UI } from "./js/ui.js";

// ======= Canvas / DPI =======
const TILE = 40;                 // Tile-Größe in px bei Zoom 1.0
const DPR  = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

// Canvas aus index.html (#gameCanvas) oder erzeugen
const canvas = document.querySelector("#gameCanvas") || (() => {
  const c = document.createElement("canvas");
  c.id = "gameCanvas";
  document.body.appendChild(c);
  return c;
})();
const ctx = canvas.getContext("2d");

const state = {
  // Kamera
  camX: 0,
  camY: 0,
  zoom: 1,
  minZoom: 0.5,
  maxZoom: 3,

  // Eingabe
  panning: false,
  panStartX: 0,
  panStartY: 0,
  camStartX: 0,
  camStartY: 0,
  pinch: null, // {d0, zoom0}

  // Welt
  width: 80,   // Tiles in X (logisch)
  height: 60,  // Tiles in Y (logisch)
  terrain: [], // 2D Array mit Keys aus TERRAIN (optional)
  buildings: [], // {id,key,x,y,img}

  // Bau-Vorschau
  buildSel: null,    // "hq" | "depot" | ...
  ghost: { active:false, x:0, y:0, can:true, img:null }
};

// ======= Assets-Helfer =======
const imageCache = new Map();
function getImage(src) {
  if (!src) return null;
  if (imageCache.has(src)) return imageCache.get(src);
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
}

// Gebäude-Key -> Bildquelle (aus deinen neuen Texturen)
// Du kannst die Zuweisungen jederzeit anpassen/erweitern.
const BUILD_IMG = {
  hq:          ASSETS.building.hq,           // assets/tex/building/wood/hq_wood.PNG
  depot:       ASSETS.building.depot,        // assets/tex/building/wood/depot_wood.PNG
  farm:        ASSETS.building.farm,         // ...
  lumberjack:  ASSETS.building.lumberjack,
  fischer:     ASSETS.building.fischer,
  haeuser1:    ASSETS.building.haeuser1,
  haeuser2:    ASSETS.building.haeuser2,
  stonebraker: ASSETS.building.stonebraker,
  wassermuehle:ASSETS.building.wassermuehle,
  windmuehle:  ASSETS.building.windmuehle,
  baeckerei:   ASSETS.building.baeckerei
};

// ======= Größe/Resize =======
function resize() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width  * DPR));
  const h = Math.max(1, Math.floor(rect.height * DPR));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 200));

// ======= Koordinaten‑Helfer =======
function toWorld(sx, sy) {
  // sx/sy in CSS‑Pixel → auf DPR umrechnen → in Welt
  const x = (sx * DPR - canvas.width/2)  / state.zoom + state.camX;
  const y = (sy * DPR - canvas.height/2) / state.zoom + state.camY;
  return { x, y };
}
function toScreen(wx, wy) {
  const sx = (wx - state.camX) * state.zoom + canvas.width/2;
  const sy = (wy - state.camY) * state.zoom + canvas.height/2;
  return { sx, sy };
}
function snap(v) { return Math.round(v / TILE) * TILE; }

// ======= Terrain (optional zeichnen) =======
function drawTerrain() {
  // Wenn du fertige Karten hast, kannst du hier über state.terrain laufen.
  // Vorerst: Raster-Hintergrund aus TERRAIN.default (z.B. Gras)
  const img = getImage(TERRAIN.default);
  if (!img || !img.complete) {
    drawGrid(); // Fallback nur Grid
    return;
  }
  const step = TILE * state.zoom; // logical tile * zoom (aber wir zeichnen in Weltmaß!)
  // Kachelweise zeichnen – nur Sichtbereich
  const left   = Math.floor((state.camX - canvas.width/2  / state.zoom) / TILE) - 1;
  const right  = Math.ceil ((state.camX + canvas.width/2  / state.zoom) / TILE) + 1;
  const top    = Math.floor((state.camY - canvas.height/2 / state.zoom) / TILE) - 1;
  const bottom = Math.ceil ((state.camY + canvas.height/2 / state.zoom) / TILE) + 1;

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      const wx = tx * TILE + TILE/2;
      const wy = ty * TILE + TILE/2;
      const { sx, sy } = toScreen(wx, wy);
      const size = TILE * state.zoom;
      ctx.drawImage(
        img,
        0, 0, img.naturalWidth, img.naturalHeight,
        Math.round(sx - size/2), Math.round(sy - size/2),
        Math.round(size), Math.round(size)
      );
    }
  }
}

// ======= Grid (dezentes Hilfsraster) =======
function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  const step = TILE * state.zoom;
  // Offset so, dass Grid mit Welt koordiniert
  const ox = (canvas.width/2  - (state.camX*state.zoom)) % step;
  const oy = (canvas.height/2 - (state.camY*state.zoom)) % step;

  ctx.beginPath();
  for (let x = ox; x <= canvas.width; x += step) {
    ctx.moveTo(Math.round(x), 0);
    ctx.lineTo(Math.round(x), canvas.height);
  }
  for (let y = oy; y <= canvas.height; y += step) {
    ctx.moveTo(0, Math.round(y));
    ctx.lineTo(canvas.width, Math.round(y));
  }
  ctx.stroke();
  ctx.restore();
}

// ======= Gebäude‑Render =======
function drawBuildings() {
  for (const b of state.buildings) {
    const img = b.img || getImage(BUILD_IMG[b.key]);
    if (!img) continue;
    const { sx, sy } = toScreen(b.x + TILE/2, b.y + TILE/2);
    const size = TILE * state.zoom; // 1x1 Tile; wenn 2x2 → *2
    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      Math.round(sx - size/2), Math.round(sy - size/2),
      Math.round(size), Math.round(size)
    );
  }
}

// ======= Ghost‑Vorschau =======
function drawGhost() {
  if (!state.ghost.active || !state.ghost.img) return;
  const { sx, sy } = toScreen(state.ghost.x + TILE/2, state.ghost.y + TILE/2);
  const size = TILE * state.zoom;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(
    state.ghost.img,
    0, 0, state.ghost.img.naturalWidth, state.ghost.img.naturalHeight,
    Math.round(sx - size/2), Math.round(sy - size/2),
    Math.round(size), Math.round(size)
  );
  // Overlay: grün/rot Rahmen
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = state.ghost.can ? "rgba(80,220,120,0.9)" : "rgba(255,80,80,0.9)";
  ctx.lineWidth = Math.max(1, Math.floor(2 * state.zoom));
  ctx.strokeRect(
    Math.round(sx - size/2),
    Math.round(sy - size/2),
    Math.round(size),
    Math.round(size)
  );
  ctx.restore();
}

// ======= Baubarkeit prüfen (einfach: frei + im Feld) =======
function canPlaceAt(xSnap, ySnap) {
  // Im Sichtfeld / erlaubte Map
  // (Hier nur triviale Prüfung: keine Überlappung mit bestehenden 1x1)
  for (const b of state.buildings) {
    if (b.x === xSnap && b.y === ySnap) return false;
  }
  return true;
}

// ======= Input =======
function onWheel(e) {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY) * 0.1;
  const before = state.zoom;
  state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.zoom + delta));
  if (before !== state.zoom) {/*optional HUD*/ }
}
function onPointerDown(e) {
  if (e.pointerType === "touch" && e.isPrimary === false) {
    // zweiter Finger → Pinch Handling im move
    return;
  }
  canvas.setPointerCapture?.(e.pointerId);
  state.panning = true;
  state.panStartX = e.clientX;
  state.panStartY = e.clientY;
  state.camStartX = state.camX;
  state.camStartY = state.camY;

  // Klick zum Bauen
  if (state.buildSel) {
    const { x, y } = toWorld(e.clientX, e.clientY);
    const xs = snap(x - TILE/2) + TILE/2; // auf Zentrierung achten
    const ys = snap(y - TILE/2) + TILE/2;

    const gx = snap(xs - TILE/2);
    const gy = snap(ys - TILE/2);

    const ok = canPlaceAt(gx, gy);
    if (ok) {
      state.buildings.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),
        key: state.buildSel,
        x: gx,
        y: gy,
        img: getImage(BUILD_IMG[state.buildSel])
      });
    }
  }
}
function onPointerMove(e) {
  // Pinch auf Touch: 2 Pointer → über event nicht zuverlässig; iOS Safari hat eigene Gesten.
  // Für Einfachheit hier nur Pan bei 1 Finger:
  if (state.panning && (!state.buildSel)) {
    const dx = (e.clientX - state.panStartX) / state.zoom;
    const dy = (e.clientY - state.panStartY) / state.zoom;
    state.camX = state.camStartX - dx;
    state.camY = state.camStartY - dy;
    return;
  }

  // Ghost-Vorschau aktualisieren, wenn ein Bau-Tool aktiv ist
  if (state.buildSel) {
    const { x, y } = toWorld(e.clientX, e.clientY);
    const gx = snap(x);
    const gy = snap(y);
    const img = getImage(BUILD_IMG[state.buildSel]);
    state.ghost.active = true;
    state.ghost.x = gx;
    state.ghost.y = gy;
    state.ghost.can = canPlaceAt(gx, gy);
    state.ghost.img = img;
  } else {
    state.ghost.active = false;
  }
}
function onPointerUp(e) {
  state.panning = false;
  canvas.releasePointerCapture?.(e.pointerId);
}

// ======= Buttons/Utility =======
function centerOn(x = 0, y = 0) {
  state.camX = x;
  state.camY = y;
}

function hookInputs() {
  canvas.addEventListener("wheel", onWheel, { passive:false });
  canvas.addEventListener("pointerdown", onPointerDown, { passive:false });
  canvas.addEventListener("pointermove", onPointerMove, { passive:false });
  canvas.addEventListener("pointerup", onPointerUp, { passive:false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive:false });
}

// ======= UI (Bau-Menü) =======
const ui = new UI(/* gameRef falls nötig */);
function pollUISelection() {
  // Hole ausgewähltes Gebäude aus dem Menü
  const sel = ui.getSelectedBuilding?.();
  if (sel !== state.buildSel) {
    state.buildSel = sel;
    // Ghost sofort ausblenden, bis Maus bewegt wird
    state.ghost.active = false;
  }
}

// ======= Loop =======
function tick() {
  pollUISelection();

  // Clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Terrain & Grid
  drawTerrain();
  drawGrid();

  // Buildings & Ghost
  drawBuildings();
  drawGhost();

  requestAnimationFrame(tick);
}

// ======= Start =======
function boot() {
  hookInputs();
  centerOn(0, 0);

  // Optional: Start-HQ in Mitte setzen
  const startX = snap(-TILE/2);
  const startY = snap(-TILE/2);
  state.buildings.push({
    id: "hq_start",
    key: "hq",
    x: startX,
    y: startY,
    img: getImage(BUILD_IMG.hq)
  });

  tick();
}

boot();
