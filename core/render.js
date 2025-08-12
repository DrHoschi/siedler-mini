// core/render.js
// Isometrischer Renderer + korrekte Projektion

export const TILE = 64;           // Kantenlänge der „Quadrat“-Basis (vor Iso)
export const TILE_W = TILE;       // Breite in Weltkoordinaten
export const TILE_H = TILE / 2;   // projizierte Höhe in Iso (Diamant)
export const PAD_TILES = 2;       // zusätzliche Kacheln um den View, gegen schwarze Ränder

export class Camera {
  constructor(w, h) {
    this.x = 0;   // Weltkoordinate (px, isometrische Leinwand)
    this.y = 0;
    this.z = 1;   // Zoom
    this.vw = w;  // viewport pixel
    this.vh = h;
  }
  resize(w, h) { this.vw = w; this.vh = h; }
}

export function makeCanvas() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  return { canvas, ctx };
}

export function resizeCanvas(cam, canvas) {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cam.resize(rect.width, rect.height);
  return dpr;
}

// ---------- Projektion

// Welt(px, „iso‑Leinwand“) → Bildschirm(px)
export function worldToScreen(cam, wx, wy) {
  // Kamera anwenden
  const sx = (wx - cam.x) * cam.z + cam.vw * 0.5;
  const sy = (wy - cam.y) * cam.z + cam.vh * 0.5;
  return { sx, sy };
}

// Bildschirm(px) → Welt(px)
export function screenToWorld(cam, sx, sy) {
  const wx = (sx - cam.vw * 0.5) / cam.z + cam.x;
  const wy = (sy - cam.vh * 0.5) / cam.z + cam.y;
  return { wx, wy };
}

// Tile( i,j ) → Welt(px)
export function cellToWorld(i, j) {
  // „Diamant“: Basisformel
  const wx = (i - j) * (TILE_W * 0.5);
  const wy = (i + j) * (TILE_H * 0.5);
  return { wx, wy };
}

// Welt(px) → Tile( i,j )  (das ist der wichtige Fix!)
export function worldToCell(wx, wy) {
  // Inverse zu cellToWorld:
  // i = wy/TILE_H + wx/TILE_W
  // j = wy/TILE_H - wx/TILE_W
  const iFloat = (wy / (TILE_H * 0.5) + wx / (TILE_W * 0.5)) * 0.5;
  const jFloat = (wy / (TILE_H * 0.5) - wx / (TILE_W * 0.5)) * 0.5;
  // zu Kachel runden
  const i = Math.floor(iFloat);
  const j = Math.floor(jFloat);
  return { i, j, iFloat, jFloat };
}

// Client‑Koord. (PointerEvent) sicher in Canvas‑Space holen
export function clientToCanvasXY(canvas, ev) {
  const rect = canvas.getBoundingClientRect();
  // Touch: wir nehmen den ersten Finger
  const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
  const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
  return { cx, cy };
}

// Sichtbares Kachelrechteck bestimmen + Polster
export function visibleTileBounds(cam) {
  // vier View‑Ecken in Welt
  const corners = [
    screenToWorld(cam, 0, 0),
    screenToWorld(cam, cam.vw, 0),
    screenToWorld(cam, 0, cam.vh),
    screenToWorld(cam, cam.vw, cam.vh),
  ];
  // in Tile‑Space umrechnen und Min/Max bestimmen
  let imin = +Infinity, jmin = +Infinity, imax = -Infinity, jmax = -Infinity;
  for (const c of corners) {
    const { iFloat, jFloat } = worldToCell(c.wx, c.wy);
    imin = Math.min(imin, iFloat); imax = Math.max(imax, iFloat);
    jmin = Math.min(jmin, jFloat); jmax = Math.max(jmax, jFloat);
  }
  imin = Math.floor(imin) - PAD_TILES;
  jmin = Math.floor(jmin) - PAD_TILES;
  imax = Math.ceil(imax) + PAD_TILES;
  jmax = Math.ceil(jmax) + PAD_TILES;
  return { imin, imax, jmin, jmax };
}

// Zeichnet Map‑Tiles
export function drawMap(ctx, cam, world, IM) {
  // Hintergrund
  ctx.fillStyle = '#0e1416';
  ctx.fillRect(0, 0, cam.vw, cam.vh);

  const { imin, imax, jmin, jmax } = visibleTileBounds(cam);

  for (let j = jmin; j <= jmax; j++) {
    for (let i = imin; i <= imax; i++) {
      if (i < 0 || j < 0 || i >= world.W || j >= world.H) continue;
      const t = world.tile[i + j * world.W];
      const { wx, wy } = cellToWorld(i, j);
      const { sx, sy } = worldToScreen(cam, wx, wy);

      const img = pickTileImage(t, IM);
      // center auf Diamant legen
      const iw = TILE_W;          // Bild darf breiter sein – wird skaliert
      const ih = TILE_H * 2;      // volle „Rauten‑Höhe“
      ctx.drawImage(img, sx - iw / 2, sy - ih / 2, iw, ih);
    }
  }
}

function pickTileImage(t, IM) {
  // 0=grass,1=water,2=shore,3=rocky,4=sand,5=dirt
  switch (t) {
    case 1: return IM.water || fallback('#457b9d');
    case 2: return IM.shore || fallback('#d6b36a');
    case 3: return IM.rocky || fallback('#6b6f7a');
    case 4: return IM.sand || fallback('#c2a766');
    case 5: return IM.dirt || fallback('#7a5b3a');
    default: return IM.grass || fallback('#355e3b');
  }
}

// einfacher Solid‑Color‑Fallback
const _cache = new Map();
function fallback(color) {
  if (_cache.has(color)) return _cache.get(color);
  const c = document.createElement('canvas'); c.width = TILE_W; c.height = TILE_H * 2;
  const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  _cache.set(color, c);
  return c;
}
