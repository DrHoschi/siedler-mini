/*
 * Siedler‑Mini — Assets (Loader + Registry)
 * Version: v1.3 (2025‑08‑25)
 * Features:
 *  - loadJSON / loadImage mit Fallback .png ⇄ .PNG
 *  - einfache Registry (Assets.get / set / has)
 *  - kleine Helper: resolvePNGCase(url)
 * Hinweise:
 *  - Keine externen Abhängigkeiten, nur fetch() / Image()
 *  - Alle Pfade relativ zum HTML (Root), wie in deiner filelist.txt
 */

const state = {
  opts: {},
  registry: new Map(),
};

function delay(ms){ return new Promise(r=>setTimeout(r, ms)); }

// --- PNG Case-Fallback -------------------------------------------------------
async function fetchWithCase(url) {
  // 1) erster Versuch: wie angegeben
  let res = await fetch(url, { cache: "no-cache" });
  if (res.ok) return res;

  // 2) Fallback .png ⇄ .PNG (nur wenn Pfad nach PNG aussieht)
  const isPNG = url.toLowerCase().endsWith(".png");
  if (isPNG) {
    const flip = url.endsWith(".PNG") ? url.slice(0, -4) + ".png"
                                      : url.slice(0, -4) + ".PNG";
    res = await fetch(flip, { cache: "no-cache" });
    if (res.ok) return res;
  }
  // 3) letzter Versuch: kleine Wartezeit (CDN/Cache) und nochmal originär
  await delay(50);
  res = await fetch(url, { cache: "no-cache" });
  return res;
}

async function loadJSON(url) {
  const res = await fetchWithCase(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return res.json();
}

function loadImage(url) {
  return new Promise(async (resolve, reject)=>{
    const tryLoad = (u) => {
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error("Image load failed: "+u));
      img.src = u + (u.includes("?") ? "&" : "?") + "v=" + Date.now(); // cache-bust
    };

    // 1) normal
    let res = await fetch(url, { method:"HEAD", cache:"no-cache" });
    if (res.ok) { tryLoad(url); return; }

    // 2) Fallback Case
    if (url.toLowerCase().endsWith(".png")) {
      const alt = url.endsWith(".PNG") ? url.slice(0,-4)+".png" : url.slice(0,-4)+".PNG";
      res = await fetch(alt, { method:"HEAD", cache:"no-cache" });
      if (res.ok) { tryLoad(alt); return; }
    }

    // 3) Letzter Versuch originär
    tryLoad(url);
  });
}

// --- Public API --------------------------------------------------------------
export const Assets = {
  setOptions(opts){ Object.assign(state.opts, opts||{}); },
  async json(path) {
    const key = "json:" + path;
    if (state.registry.has(key)) return state.registry.get(key);
    const data = await loadJSON(path);
    state.registry.set(key, data);
    return data;
  },
  async image(path) {
    const key = "img:" + path;
    if (state.registry.has(key)) return state.registry.get(key);
    const img = await loadImage(path);
    state.registry.set(key, img);
    return img;
  },
  set(key, val){ state.registry.set(key, val); },
  get(key){ return state.registry.get(key); },
  has(key){ return state.registry.has(key); },
  clear(){ state.registry.clear(); }
};
