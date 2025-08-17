/* terrain.js — Terrain-Renderer (Top‑Down), nutzt Assets.getTerrain(...)
   - Zeichnet sichtbares Rechteck als Tile‑Map
   - Unterstützt Zufallsvarianten je Prefix (grass_0..7)
   - Wasser & Ufer werden leicht "unter" allem gezeichnet
*/

import { ASSETS } from "./assets.js";

export const TILE_PX = 64;  // deine neuen Shapes sind 64×64

// Eine einfache, deterministische Variante-Map (damit beim Scrollen nichts "springt")
function pseudoVariant(x, y, max) {
  // kleine Hash-Funktion
  let n = (x * 73856093) ^ (y * 19349663);
  n = ((n << 13) ^ n) >>> 0;
  return (n % max) | 0;
}

export class Terrain {
  constructor(widthTiles = 128, heightTiles = 128) {
    this.w = widthTiles;
    this.h = heightTiles;
    // simple Biome-Generierung (du kannst später eine echte Noise-Map einsetzen)
    this.tiles = new Array(this.h);
    for (let y=0; y<this.h; y++) {
      this.tiles[y] = new Array(this.w);
      for (let x=0; x<this.w; x++) {
        // grobes Muster: Wasser am Rand, Sand am Ufer, innen Gras/Dir t/ Rock
        const edge = Math.min(x, y, this.w-1-x, this.h-1-y);
        let type = "grass";
        if (edge < 3) type = "water";
        else if (edge < 4) type = "sand";
        else {
          const r = ((x*31 + y*17) % 10);
          if (r < 2) type = "dirt";
          else if (r === 9) type = "rock";
          else type = "grass";
        }
        this.tiles[y][x] = type;
      }
    }
  }

  /** zeichnet nur das Sichtfenster */
  draw(ctx, camX, camY, zoom, DPR, screenW, screenH) {
    const scaled = TILE_PX * zoom * DPR;
    if (scaled <= 0.5) return;

    // Bildschirmfenster → Tile-Range
    const worldLeft   = camX - (screenW / (2*zoom*DPR));
    const worldTop    = camY - (screenH / (2*zoom*DPR));
    const startX = Math.floor(worldLeft / TILE_PX) - 1;
    const startY = Math.floor(worldTop  / TILE_PX) - 1;

    const tilesX = Math.ceil(screenW / (scaled)) + 3;
    const tilesY = Math.ceil(screenH / (scaled)) + 3;

    // Erst Wasser/Sand (unten), dann Land drüber
    this._drawLayer(ctx, camX, camY, zoom, DPR, startX, startY, tilesX, tilesY, (t)=> t==="water" || t==="sand");
    this._drawLayer(ctx, camX, camY, zoom, DPR, startX, startY, tilesX, tilesY, (t)=> t!=="water" && t!=="sand");
  }

  _drawLayer(ctx, camX, camY, zoom, DPR, startX, startY, tilesX, tilesY, filterFn) {
    for (let ty=0; ty<tilesY; ty++) {
      const y = startY + ty;
      if (y < 0 || y >= this.h) continue;
      for (let tx=0; tx<tilesX; tx++) {
        const x = startX + tx;
        if (x < 0 || x >= this.w) continue;

        const type = this.tiles[y][x];
        if (!filterFn(type)) continue;

        const variant = pseudoVariant(x, y, 8); // bis _7
        const frame = ASSETS.getTerrain(type, variant);
        if (!frame) continue;

        // Welt → Screen
        const wx = x * TILE_PX, wy = y * TILE_PX;
        const sx = ((wx - camX) * zoom + (screenW(ctx) / (2*zoom))) * DPR;
        const sy = ((wy - camY) * zoom + (screenH(ctx) / (2*zoom))) * DPR;
        const size = TILE_PX * zoom * DPR;

        ctx.drawImage(frame.img, frame.x, frame.y, frame.w, frame.h, sx, sy, size, size);
      }
    }
  }
}

// kleine Helfer (aus Canvas nehmen, damit wir keine „width/height“ global mitschleppen)
function screenW(ctx){ return ctx.canvas.width; }
function screenH(ctx){ return ctx.canvas.height; }
