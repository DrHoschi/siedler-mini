// render.js
// V14.2 – kleinere Grundkacheln + skalierte Gebäude + klares ClearRect

import { IM } from './core/assets.js';

export const TILE_W = 64;   // Pixelbreite Isokachel
export const TILE_H = 32;   // Pixelhöhe Isokachel
export const GRID_W = 64;   // Anzahl Tiles X
export const GRID_H = 64;   // Anzahl Tiles Y

// Gebäudeskalen (damit nichts riesig wird)
const SCALE = {
  hq_stone: 0.66,
  hq_wood : 0.66,
  lumberjack: 0.70,
  depot: 0.66
};

export function worldPixelSize() {
  // isometrische Breite/Höhe der gesamten Karte (ungefährer Rahmen)
  const w = (GRID_W + GRID_H) * (TILE_W / 2);
  const h = (GRID_W + GRID_H) * (TILE_H / 2);
  return {w, h};
}

export function clear(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

export function drawTiles(ctx, camera, tiles) {
  // tiles: function(y,x) → key ('grass' etc.) – oder vorgerendert
  const {w:worldW, h:worldH} = worldPixelSize();

  // grobe Sichtfenster‑Schleife (einfach & ausreichend schnell für Mobile)
  const pad = 2;
  for (let gy = -pad; gy < GRID_H + pad; gy++) {
    for (let gx = -pad; gx < GRID_W + pad; gx++) {
      const center = isoToWorld(gx, gy);
      const s = camera.toScreen(center.x, center.y);
      // schnell raus, wenn weit außerhalb
      if (s.x < -TILE_W || s.y < -TILE_H || s.x > camera.viewW + TILE_W || s.y > camera.viewH + TILE_H) continue;

      const k = tiles(gx, gy) || 'grass';
      const img = IM[k];
      if (img) {
        ctx.drawImage(img, s.x - TILE_W/2, s.y - TILE_H/2, TILE_W, TILE_H);
      } else {
        // Fallback
        ctx.fillStyle = '#2a4';
        ctx.beginPath();
        diamond(ctx, s.x, s.y, TILE_W, TILE_H);
        ctx.fill();
      }
    }
  }
}

export function drawBuilding(ctx, camera, kind, wx, wy) {
  const img = IM[kind];
  const s = SCALE[kind] ?? 0.7;

  const sc = camera.toScreen(wx, wy);
  if (!img) {
    ctx.fillStyle = '#933';
    ctx.fillRect(sc.x - 24, sc.y - 24, 48, 48);
    return;
  }
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, sc.x - w * 0.5, sc.y - h + 18, w, h);
}

// ----- Helfer

export function isoToWorld(gx, gy) {
  // Diamond‑Iso: (gx,gy) Mitte der Kachel
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2)
  };
}

export function worldToIso(wx, wy) {
  const gx = (wx / (TILE_W/2) + wy / (TILE_H/2)) * 0.5;
  const gy = (wy / (TILE_H/2) - wx / (TILE_W/2)) * 0.5;
  return {gx, gy};
}

function diamond(ctx, cx, cy, w, h) {
  ctx.moveTo(cx, cy - h/2);
  ctx.lineTo(cx + w/2, cy);
  ctx.lineTo(cx, cy + h/2);
  ctx.lineTo(cx - w/2, cy);
  ctx.closePath();
}
