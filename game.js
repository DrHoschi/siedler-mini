/**
 * Siedler‑Mini — game.js (Adapter + Fallback)
 * Version: v16.0.0 (Baseline, 2025‑08‑25)
 * Idee:
 *   - Wir nutzen DEINE bestehende Start-Logik, wenn vorhanden.
 *   - Der Adapter probiert zuerst deine bekannten Einstiege:
 *       Module in der Root: ./main.js, ./app-v11.1r6.js
 *       Funktionsnamen: startGame, start, init, run, main, default
 *       Aufrufversuche: (opts) → (canvas, mapUrl)
 *   - Wenn nix greift: Minimal-Fallback, der Tiles zeichnet.
 */

import { Assets } from "./core/asset.js";

async function tryExistingEntrypoints(opts) {
  const modules = ["./main.js", "./app-v11.1r6.js"];
  const names   = ["startGame","start","init","run","main","default"];

  for (const mPath of modules) {
    try {
      const m = await import(/* @vite-ignore */ mPath);
      for (const fn of names) {
        if (typeof m?.[fn] === "function") {
          console.log(`[adapter] benutze ${mPath} -> ${fn}()`);
          try { await m[fn](opts); }              // moderne Signatur
          catch { await m[fn](opts.canvas, opts.mapUrl); } // ältere Signatur
          return true;
        }
      }
    } catch (e) {
      console.debug(`[adapter] Import fehlgeschlagen für ${mPath}:`, e?.message);
    }
  }

  // Globale Fallbacks (falls alte Skripte globale Funktionen setzen)
  const g = globalThis;
  for (const fn of ["gameStart","startGame","start","init","run","main"]) {
    if (typeof g[fn] === "function") {
      console.log(`[adapter] benutze global ${fn}()`);
      try { await g[fn](opts); }
      catch { await g[fn](opts.canvas, opts.mapUrl); }
      return true;
    }
  }
  return false;
}

async function fallbackRender({ canvas, mapUrl }) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Hinweisfläche
  ctx.fillStyle = "#0b0e12"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#9ad"; ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Fallback aktiv: kein bestehender Einstieg gefunden – Tiles werden angezeigt.", 16, 24);

  // Terrain-Tileset + (optional) Map laden
  const atlas = await Assets.json("assets/tiles/tileset.terrain.json");
  const img   = await Assets.image("assets/tiles/tileset.terrain.png");

  let gridW = 20, gridH = 12, tiles = null;
  try {
    const map = await Assets.json(mapUrl);
    if (map?.layers?.[0]?.data && Number.isInteger(map.width) && Number.isInteger(map.height)) {
      tiles = map.layers[0].data; gridW = map.width; gridH = map.height;
    }
  } catch {}

  const tile = atlas?.meta?.tileSize || 64;
  const cols = atlas?.meta?.grid?.cols || Math.max(1, Math.floor(img.width / tile));

  const draw = (id, dx, dy) => {
    if (!id) return;
    const t = id - 1, sx = t % cols, sy = (t / cols) | 0;
    ctx.drawImage(img, sx*tile, sy*tile, tile, tile, dx, dy, tile, tile);
  };

  if (!tiles) {
    // kleinen Demo‑Pattern zeichnen, damit sofort „etwas“ sichtbar ist
    tiles = Array.from({ length: gridW*gridH }, (_, i) => 1 + (i % (cols * (atlas?.meta?.grid?.rows || 16))));
  }

  for (let y=0; y<gridH; y++) {
    for (let x=0; x<gridW; x++) draw(tiles[y*gridW+x], x*tile, y*tile);
  }

  ctx.fillStyle = "#8fb";
  ctx.fillText(`Tileset: tileset.terrain.png • Tile: ${tile}px • Map: ${mapUrl}`, 16, canvas.height - 14);
}

export async function startGame(opts) {
  const ok = await tryExistingEntrypoints(opts);
  if (ok) { opts?.onReady?.(); return; }

  await fallbackRender(opts);
  opts?.onReady?.();
}
