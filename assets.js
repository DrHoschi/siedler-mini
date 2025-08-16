/* assets.js — fehlertoleranter Loader für Siedler‑Mini
   - Probiert .png/.PNG
   - Probiert alternative Basispfade
   - Meldet fehlende Assets ins verschiebbare Debug-Overlay
*/

export const Assets = (() => {
  const cache = new Map();
  const errors = new Set();

  // Pfade, die der Loader nacheinander probiert (relativ zu /)
  // Passe hier gern weitere Basen an, falls du noch Unterordner ergänzt.
  const BASES = [
    "",                                  // wie übergeben
    "assets/tex/",
    "assets/tex/building/wood/",
    "assets/tex/building/",
    "assets/tex/terrain/",
  ];

  const EXT = [".png", ".PNG"];          // beide Endungen unterstützen

  function makeCandidates(path) {
    const list = [];
    const hasExt = path.toLowerCase().endsWith(".png");
    if (hasExt) {
      // mit Basisvarianten
      for (const base of BASES) list.push(base ? base + path : path);
      return list;
    } else {
      // probiere .png/.PNG
      for (const base of BASES) {
        for (const e of EXT) list.push((base ? base : "") + path + e);
      }
      return list;
    }
  }

  async function loadImageOne(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("img load fail: " + url));
      img.decoding = "async";
      img.src = url;
    });
  }

  async function loadImage(path) {
    if (cache.has(path)) return cache.get(path);

    const candidates = makeCandidates(path);
    let lastErr = null;
    for (const url of candidates) {
      try {
        const img = await loadImageOne(url);
        cache.set(path, img);
        return img;
      } catch (e) {
        lastErr = e;
      }
    }
    errors.add(path);
    throw lastErr || new Error("No candidates");
  }

  function get(path) { return cache.get(path) || null; }
  function hadErrors() { return errors.size > 0; }
  function errorList() { return Array.from(errors); }

  async function preload(list, onProgress) {
    let ok = 0;
    for (const key of list) {
      try { await loadImage(key); ok++; }
      catch {}
      onProgress?.(ok, list.length, key);
    }
  }

  // Debug-Overlay (verschiebbar)
  let dbgEl = null;
  function ensureDebugBox() {
    if (dbgEl) return dbgEl;
    dbgEl = document.createElement("div");
    dbgEl.id = "debugBox";
    dbgEl.style.cssText = `
      position:fixed; left:12px; bottom:12px; z-index:99999;
      font: 12px/1.4 -apple-system, system-ui, Segoe UI, Roboto, sans-serif;
      color:#cfe3ff; background:rgba(14,22,33,.9);
      border:1px solid rgba(255,255,255,.12); border-radius:10px;
      padding:10px 12px; backdrop-filter: blur(6px);
      max-width:min(92vw,640px); max-height:40vh; overflow:auto; cursor:grab;
      box-shadow:0 10px 30px rgba(0,0,0,.35);
    `;
    dbgEl.textContent = "Debug (ziehen zum Verschieben)";
    document.body.appendChild(dbgEl);

    // Drag
    let dragging = false, sx=0, sy=0, ox=12, oy=12;
    const onDown = (e) => { dragging=true; dbgEl.style.cursor="grabbing"; sx=e.clientX; sy=e.clientY; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx=e.clientX-sx, dy=e.clientY-sy;
      dbgEl.style.left = (ox+dx) + "px";
      dbgEl.style.bottom = "auto";
      dbgEl.style.top = `calc(100vh - ${(oy+dy)+dbgEl.getBoundingClientRect().height}px)`;
    };
    const onUp = () => { dragging=false; dbgEl.style.cursor="grab";
      const r = dbgEl.getBoundingClientRect();
      ox = r.left; oy = window.innerHeight - (r.top + r.height);
    };
    dbgEl.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return dbgEl;
  }

  function print(line) {
    const el = ensureDebugBox();
    const p = document.createElement("div");
    p.textContent = line;
    el.appendChild(p);
  }

  function printErrors() {
    if (!hadErrors()) return;
    print("❗ Fehlende Texturen:");
    for (const k of errorList()) print("  • " + k + "  (alle Kandidaten fehlgeschlagen)");
  }

  return {
    loadImage, get, preload,
    print, printErrors,
  };
})();
