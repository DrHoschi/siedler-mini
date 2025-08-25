/*
 * Siedler‑Mini — game.js (Adapter + Fallback)
 * Version: v1.1 (2025‑08‑25)
 *
 * Zweck:
 *  1) Adapter: nutzt deine vorhandenen Einstiege (main.js, app-v11.1r6.js …)
 *     und ruft eine der üblichen Startfunktionen auf:
 *       - startGame(opts), start(opts), init(opts), run(opts), main(opts), default(opts)
 *       - oder global: window.gameStart?.(opts), window.startGame?.(opts), window.start?.(opts)
 *  2) Fallback: Wenn nichts davon existiert/klappt, rendert eine einfache Karte
 *     mit deinem Tileset (assets/tiles/tileset.terrain.{json,png}).
 */

import { Assets } from "./core/asset.js";

// ---- 1) Try existing entry points -------------------------------------------------
async function tryExistingEntrypoints(opts) {
  // Kandidaten-Module in deiner Repo-Root (siehe filelist)
  const modulePaths = ["./main.js", "./app-v11.1r6.js"];
  const fnNames = ["startGame", "start", "init", "run", "main", "default"];

  for (const p of modulePaths) {
    try {
      const m = await import(/* @vite-ignore */ p);
      for (const fn of fnNames) {
        if (typeof m?.[fn] === "function") {
          console.log(`[adapter] Using ${p} -> ${fn}()`);
          // Viele ältere Starts erwarten (canvas, mapUrl) oder nur (opts):
          try {
            // Versuch 1: (opts)
            await m[fn](opts);
          } catch {
            // Versuch 2: (canvas, mapUrl)
            await m[fn](opts.canvas, opts.mapUrl);
          }
          return true;
        }
      }
    } catch (e) {
      // Ignorieren, wenn Modul kein ES‑Module ist o.ä.
      console.debug(`[adapter] Import failed for ${p}:`, e?.message);
    }
  }

  // Fallback: globale Funktionen (falls alte Skripte global arbeiten)
  const g = globalThis;
  const globals = [
    "gameStart", "startGame", "start", "init", "run", "main"
  ].filter(n => typeof g[n] === "function");

  if (globals.length) {
    const name = globals[0];
    console.log(`[adapter] Using global ${name}()`);
    try {
      await g[name](opts);
    } catch {
      await g[name](opts.canvas, opts.mapUrl);
    }
    return true;
  }

  return false;
}

// ---- 2) Minimaler Fallback‑Renderer ---------------------------------------------
async function fallbackRender(opts) {
  const { canvas, mapUrl } = opts;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Hintergrund
  ctx.fillStyle = "#0b0e12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#8fb";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Fallback-Renderer aktiv (Adapter hat keinen bestehenden Start gefunden).", 16, 24);

  // Map + Tileset laden (dein Terrain-Set)
  const atlas = await Assets.json("assets/tiles/tileset.terrain.json");
  const img   = await Assets.image("assets/tiles/tileset.terrain.png");

  // Versuche Tiled-Map (layers[0].data) – sonst zeichne einfach ein 20x12‑Demo‑Pattern
  let gridW = 20, gridH = 12, tiles = null;
  try {
    const map = await Assets.json(mapUrl);
    if (map?.layers?.[0]?.data && Number.isInteger(map.width) && Number.isInteger(map.height)) {
      tiles = map.layers[0].data;
      gridW = map.width; gridH = map.height;
    }
  } catch (_) {}

  const tileSize = atlas?.meta?.tileSize || 64;
  const cols = atlas?.meta?.grid?.cols || Math.max(1, Math.floor((img.width||tileSize) / tileSize));

  const drawTile = (tileId, dx, dy) => {
    if (!tileId) return;
    const t = (tileId - 1);
    const sx = t % cols;
    const sy = Math.floor(t / cols);
    ctx.drawImage(img, sx*tileSize, sy*tileSize, tileSize, tileSize, dx, dy, tileSize, tileSize);
  };

  // Daten vorbereiten
  if (!tiles) {
    // Dummy: paar verschiedene Tiles (1..N) im Schachbrett
    const count = (atlas?.meta?.grid?.rows || 16) * cols;
    tiles = Array.from({ length: gridW * gridH }, (_, i) => 1 + ((i + Math.floor(i/gridW)) % Math.min(count, 64)));
  }

  // Render
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      drawTile(tiles[y*gridW + x], x*tileSize, y*tileSize);
    }
  }

  ctx.fillStyle = "#9ad";
  ctx.fillText(`Tileset: tileset.terrain.png  |  Tile: ${tileSize}px`, 16, canvas.height - 32);
  ctx.fillText(`Map: ${mapUrl}  |  ${gridW}×${gridH}`, 16, canvas.height - 12);
}

// ---- Public API ------------------------------------------------------------------
export async function startGame(opts) {
  // 1) Erst die bestehende Game-Logik versuchen
  const usedExisting = await tryExistingEntrypoints(opts);
  if (usedExisting) {
    opts?.onReady?.();
    return;
  }

  // 2) Wenn nichts existiert / ES‑Module fehlt → Fallback zeigen
  console.warn("[adapter] Kein bekannter Start gefunden – Fallback aktiv.");
  await fallbackRender(opts);
  opts?.onReady?.();
}
