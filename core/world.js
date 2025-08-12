// core/world.js – Weltlogik & Rendering für V13 Mobile
import { IM } from './assets.js';
import { requestDraw } from './render.js';

export const TILE_W = 64; // Breite einer Kachel in px
export const TILE_H = 32; // Höhe einer Kachel in px

let world = [];
let worldWidth = 0;
let worldHeight = 0;

/** Welt erstellen: width x height Tiles */
export function createWorld(width, height) {
  worldWidth = width;
  worldHeight = height;
  world = new Array(height).fill(null).map(() => new Array(width).fill({
    type: 'grass',
    building: null
  }));
  requestDraw();
}

/** Setzt Tile-Typ */
export function setTile(x, y, type) {
  if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return;
  world[y][x] = { ...world[y][x], type };
  requestDraw();
}

/** Setzt Gebäude auf ein Tile */
export function setBuilding(x, y, buildingType) {
  if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return;
  world[y][x] = { ...world[y][x], building: buildingType };
  requestDraw();
}

/** Entfernt Gebäude */
export function removeBuilding(x, y) {
  if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return;
  world[y][x] = { ...world[y][x], building: null };
  requestDraw();
}

/** Wandelt Weltkoordinaten → Bildschirmposition (isometrisch) */
function isoToScreen(ix, iy) {
  const sx = (ix - iy) * (TILE_W / 2);
  const sy = (ix + iy) * (TILE_H / 2);
  return { x: sx, y: sy };
}

/** Rendert nur sichtbare Tiles */
export function drawWorld(ctx, cam) {
  const startCol = Math.max(0, Math.floor(cam.x / TILE_W) - 2);
  const endCol = Math.min(worldWidth, Math.ceil((cam.x + cam.width) / TILE_W) + 2);
  const startRow = Math.max(0, Math.floor(cam.y / TILE_H) - 2);
  const endRow = Math.min(worldHeight, Math.ceil((cam.y + cam.height) / TILE_H) + 2);

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const tile = world[y][x];
      const { x: sx, y: sy } = isoToScreen(x, y);

      // Bild auswählen
      let img = IM[tile.type] || null;
      if (!img) {
        ctx.fillStyle = '#2a2';
        ctx.fillRect(sx - TILE_W / 2 - cam.x, sy - TILE_H / 2 - cam.y, TILE_W, TILE_H);
      } else {
        ctx.drawImage(img, sx - TILE_W / 2 - cam.x, sy - TILE_H / 2 - cam.y, TILE_W, TILE_H);
      }

      // Gebäude zeichnen
      if (tile.building) {
        let bImg = IM[tile.building];
        if (bImg) {
          ctx.drawImage(bImg, sx - TILE_W / 2 - cam.x, sy - TILE_H - cam.y, TILE_W, TILE_H * 2);
        }
      }
    }
  }
}
