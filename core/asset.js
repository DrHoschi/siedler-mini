/**
 * Siedler‑Mini — Assets (mit PathIndex)
 * Version: v16.0.0 (Baseline, 2025‑08‑25)
 * Zweck:
 *   - Robuste Ladefunktionen für JSON & Bilder mit Pfad-Resolve
 *     über ./filelist.json (siehe PathIndex).
 *   - Cache pro Ressource (Basis-Optimierung für Mobile).
 *
 * Public API:
 *   await Assets.json("assets/maps/map-mini.json")
 *   await Assets.image("assets/tiles/tileset.terrain.png")
 *   Assets.get/set/has/clear
 */

import { PathIndex } from "./path-index.js";

const cache = new Map();
const bust = (u) => u + (u.includes("?") ? "&" : "?") + "v=" + Date.now(); // leichter Cache-Buster

async function resolveOrExplain(requestedPath) {
  await PathIndex.ready;
  const real = PathIndex.resolve(requestedPath);
  if (real) return real;

  const base = requestedPath.includes("/") ? requestedPath.split("/").slice(0, -1).join("/") + "/" : "";
  const tips = PathIndex.suggest(base, 6);
  throw new Error(
    `Asset nicht gefunden: ${requestedPath}\n` +
    (tips.length ? `Meintest du:\n- ${tips.join("\n- ")}` : "Kein ähnlicher Pfad in filelist.json.")
  );
}

export const Assets = {
  async json(path) {
    const key = "json:" + path;
    if (cache.has(key)) return cache.get(key);

    const real = await resolveOrExplain(path);
    const res = await fetch(bust("./" + real), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${real}`);
    const data = await res.json();
    cache.set(key, data);
    return data;
  },

  async image(path) {
    const key = "img:" + path;
    if (cache.has(key)) return cache.get(key);

    const real = await resolveOrExplain(path);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Bild-Load fehlgeschlagen: " + real));
      el.src = bust("./" + real);
    });
    cache.set(key, img);
    return img;
  },

  set(k,v){ cache.set(k,v); },
  get(k){ return cache.get(k); },
  has(k){ return cache.has(k); },
  clear(){ cache.clear(); }
};
