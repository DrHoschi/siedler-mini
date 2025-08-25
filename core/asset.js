/*
 * Siedler‑Mini — Assets (mit PathIndex)
 * - JSON/Image Loader mit resolve über /filelist.json
 * - toleriert Case-Mismatch und .png/.PNG
 */

import { PathIndex } from "./path-index.js";

const cache = new Map();

function bust(u){ return u + (u.includes("?") ? "&" : "?") + "v=" + Date.now(); }

async function resolveOrThrow(path) {
  await PathIndex.ready;
  const real = PathIndex.resolve(path);
  if (real) return real;
  const hint = PathIndex.suggest(path.split("/").slice(0, -1).join("/") + "/", 5);
  throw new Error(`Asset nicht gefunden: ${path}\nVorschläge:\n- ${hint.join("\n- ")}`);
}

export const Assets = {
  async json(path) {
    const key = "json:" + path;
    if (cache.has(key)) return cache.get(key);
    const real = await resolveOrThrow(path);
    const res = await fetch(bust("/" + real), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${real}`);
    const data = await res.json();
    cache.set(key, data);
    return data;
  },

  async image(path) {
    const key = "img:" + path;
    if (cache.has(key)) return cache.get(key);
    const real = await resolveOrThrow(path);

    const img = await new Promise((resolve, reject)=>{
      const el = new Image();
      el.onload = ()=> resolve(el);
      el.onerror = ()=> reject(new Error("Bild-Load fehlgeschlagen: " + real));
      el.src = bust("/" + real);
    });

    cache.set(key, img);
    return img;
  },

  set(k, v){ cache.set(k, v); },
  get(k){ return cache.get(k); },
  has(k){ return cache.has(k); },
  clear(){ cache.clear(); },
};
