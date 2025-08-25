/**
 * Siedler‑Mini — game.js (Adapter + Fallback)
 * Version: v16.0.1 (2025‑08‑25)
 *
 * Ziel:
 *  - NICHTS neu erfinden, sondern deine vorhandene Startlogik nutzen.
 *  - HARTE Priorität: ./main.js  →  start(canvas, mapUrl)   (oder startGame/init/run/main/default)
 *  - Danach weitere Kandidaten (z. B. ./app-v11.1r6.js)
 *  - Falls gar nichts greift: Minimal‑Fallback zeichnet Terrain‑Tiles,
 *    damit du sofort ein Bild siehst (nur als Sicherheitsnetz).
 *
 * Hinweise:
 *  - Boot seite lädt diese Datei und ruft startGame({ canvas, mapUrl }).
 *  - Assets/Path‑Index sorgen dafür, dass Pfade robust aus filelist.json
 *    aufgelöst werden (Case‑Toleranz, .PNG/.png).
 */

import { Assets } from "./core/asset.js";

/** Liste möglicher Funktionsnamen, die wir in den Modulen suchen */
const ENTRY_NAMES = ["startGame", "start", "init", "run", "main", "default"];

/**
 * Versucht, in einem ES‑Modul eine Startfunktion zu finden und aufzurufen.
 * Aufrufreihenfolge:
 *   1) fn(opts)
 *   2) fn(opts.canvas, opts.mapUrl)  (ältere Signatur)
 */
async function tryModule(modulePath, opts) {
  const mod = await import(/* @vite-ignore */ modulePath);
  for (const name of ENTRY_NAMES) {
    if (typeof mod?.[name] === "function") {
      console.log(`[adapter] benutze ${modulePath} -> ${name}()`);
      try {
        await mod[name](opts);                           // moderne Signatur
      } catch {
        await mod[name](opts.canvas, opts.mapUrl);      // ältere Signatur
      }
      return true;
    }
  }
  return false;
}

/** Globale Fallbacks (falls altes Skript Funktionen global ablegt) */
async function tryGlobals(opts) {
  const g = globalThis;
  for (const name of ["gameStart","startGame","start","init","run","main"]) {
    if (typeof g[name] === "function") {
      console.log(`[adapter] benutze global ${name}()`);
      try { await g[name](opts); }
      catch { await g[name](opts.canvas, opts.mapUrl); }
      return true;
    }
  }
  return false;
}

/** Minimaler Sicherheits‑Renderer, falls kein Einstieg gefunden wurde */
async function fallbackRender({ canvas, mapUrl }) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Hinweisfläche
  ctx.fillStyle = "#0b0e12"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#9ad"; ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Fallback aktiv: kein bestehender Einstieg gefunden – Terrain‑Tiles werden angezeigt.", 16, 24);

  // Terrain‑Tileset + (optional) Map laden
  const atlas = await Assets.json("assets/tiles/tileset.terrain.json");
  const img   = await Assets.image("assets/tiles/tileset.terrain.png");

  // Versuche Tiled‑Layout (width/height + layers[0].data); ansonsten Demo‑Pattern
  let gridW = 20, gridH = 12, tiles = null;
  try {
    const map = await Assets.json(mapUrl);
    if (map?.layers?.[0]?.data && Number.isInteger(map.width) && Number.isInteger(map.height)) {
      tiles = map.layers[0].data; gridW = map.width; gridH = map.height;
    }
  } catch {/* Map optional */}

  const tile = atlas?.meta?.tileSize || 64;                             // 64px‑Tiles
  const cols = atlas?.meta?.grid?.cols || Math.max(1, Math.floor(img.width / tile));

  const draw = (id, dx, dy) => {
    if (!id) return;
    const t = id - 1, sx = t % cols, sy = (t / cols) | 0;
    ctx.drawImage(img, sx*tile, sy*tile, tile, tile, dx, dy, tile, tile);
  };

  if (!tiles) {
    // Kleines Pattern, damit sofort „etwas“ zu sehen ist
    const maxTiles = (atlas?.meta?.grid?.rows || 16) * cols;
    tiles = Array.from({ length: gridW*gridH }, (_, i) => 1 + (i % Math.min(maxTiles, 64)));
  }

  for (let y=0; y<gridH; y++) {
    for (let x=0; x<gridW; x++) draw(tiles[y*gridW+x], x*tile, y*tile);
  }

  ctx.fillStyle = "#8fb";
  ctx.fillText(`Tileset: tileset.terrain.png • Tile: ${tile}px • Map: ${mapUrl}`, 16, canvas.height - 14);
}

/** Öffentliche Startfunktion (von boot.js aufgerufen) */
export async function startGame(opts) {
  // 1) HARTE Priorität: ./main.js zuerst
  try {
    const used = await tryModule("./main.js", opts);
    if (used) { opts?.onReady?.(); return; }
  } catch (e) {
    console.debug("[adapter] ./main.js nicht verwendbar:", e?.message);
  }

  // 2) Weitere Kandidaten (z. B. älterer Bundle‑Einstieg)
  const candidates = ["./app-v11.1r6.js"];
  for (const p of candidates) {
    try {
      const used = await tryModule(p, opts);
      if (used) { opts?.onReady?.(); return; }
    } catch (e) {
      console.debug(`[adapter] ${p} nicht verwendbar:`, e?.message);
    }
  }

  // 3) Globale Fallbacks (falls alte Skripte global arbeiten)
  if (await tryGlobals(opts)) { opts?.onReady?.(); return; }

  // 4) Sicherheitsnetz: Minimal‑Renderer
  console.warn("[adapter] Kein bestehender Einstieg gefunden – Fallback‑Renderer wird genutzt.");
  await fallbackRender(opts);
  opts?.onReady?.();
}
