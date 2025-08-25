/*
 * Siedler-Mini — game.js (Hotfix)
 * Version: v1.0 (2025-08-25)
 * Zweck:
 *   - Stellt eine startGame(opts) Funktion bereit (wird von boot.js aufgerufen)
 *   - Lädt Map-JSON, Tileset und zeichnet einfache Karte ins Canvas
 */

import { Assets } from "./core/asset.js";

export async function startGame({ canvas, mapUrl, onReady }) {
  const ctx = canvas.getContext("2d");

  console.log("[game] startGame", mapUrl);

  // 1) Map laden
  const map = await Assets.json(mapUrl);

  // 2) Tileset laden (lt. deiner filelist: assets/tiles/tileset.terrain.png + tileset.terrain.json)
  const atlas = await Assets.json("assets/tiles/tileset.terrain.json");
  const img = await Assets.image("assets/tiles/tileset.terrain.png");

  // 3) Test: gesamte Map zeichnen
  // Erwartet: map.layers[0].data enthält tile-IDs (falls Tiled-Export)
  // → sonst Dummy-Gitter mit Atlas-Frames
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const tileSize = atlas.meta.tileSize || 64;
  let drawn = 0;

  if (map.layers && map.layers[0] && map.layers[0].data) {
    const w = map.width, h = map.height;
    const data = map.layers[0].data;
    data.forEach((tileId, i)=>{
      if (tileId === 0) return;
      const sx = (tileId-1) % atlas.meta.grid.cols;
      const sy = Math.floor((tileId-1) / atlas.meta.grid.cols);
      const dx = (i % w) * tileSize;
      const dy = Math.floor(i / w) * tileSize;
      ctx.drawImage(img, sx*tileSize, sy*tileSize, tileSize, tileSize, dx, dy, tileSize, tileSize);
      drawn++;
    });
  } else {
    // Fallback: alle Frames aus atlas nebeneinander zeichnen
    const keys = Object.keys(atlas.frames);
    keys.forEach((k, i)=>{
      const f = atlas.frames[k];
      const dx = (i % 10) * tileSize;
      const dy = Math.floor(i / 10) * tileSize;
      ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
      drawn++;
    });
  }

  console.log(`[game] Tiles gezeichnet: ${drawn}`);
  if (typeof onReady === "function") onReady();
}
