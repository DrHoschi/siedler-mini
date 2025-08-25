/*
 * Siedler‑Mini — PathIndex
 * Liest /filelist.json und bietet schnelles Resolve/Exists auf echte Repo-Pfade.
 * Handhabt:
 *  - exakte Pfade
 *  - case-insensitive Match (lowercase-Map)
 *  - PNG-Case-Alias (.png <-> .PNG)
 */

const state = {
  loaded: false,
  entries: [],
  files: new Set(),          // exakte Pfade
  lowerToReal: new Map(),    // lowercase -> real
};

async function load() {
  if (state.loaded) return;
  const res = await fetch("/filelist.json", { cache: "no-store" });
  if (!res.ok) throw new Error("filelist.json nicht gefunden");
  const data = await res.json();
  const entries = Array.isArray(data.entries) ? data.entries : [];

  state.entries = entries;
  for (const e of entries) {
    if (e.type !== "file") continue;
    const p = e.path;                 // z.B. 'assets/tex/terrain/topdown_grass.PNG'
    state.files.add(p);
    state.lowerToReal.set(p.toLowerCase(), p);
  }
  state.loaded = true;
}

function flipPngCase(p) {
  if (!p.toLowerCase().endsWith(".png")) return null;
  return p.endsWith(".PNG") ? p.slice(0, -4) + ".png" : p.slice(0, -4) + ".PNG";
}

function tryResolve(raw) {
  // 1) exakt?
  if (state.files.has(raw)) return raw;
  // 2) lower-case?
  const lc = raw.toLowerCase();
  const real = state.lowerToReal.get(lc);
  if (real) return real;
  // 3) PNG-Flip?
  const flip = flipPngCase(raw);
  if (flip && state.files.has(flip)) return flip;
  if (flip) {
    const lf = flip.toLowerCase();
    const rf = state.lowerToReal.get(lf);
    if (rf) return rf;
  }
  return null;
}

function suggestions(prefix, limit = 5) {
  const pfx = prefix.toLowerCase();
  const hits = [];
  for (const [lc, real] of state.lowerToReal) {
    if (lc.startsWith(pfx)) {
      hits.push(real);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

export const PathIndex = {
  /** Promise, resolved wenn der Index gebaut wurde */
  ready: (async ()=> { await load(); })(),

  /** true/false, ob Pfad (mit Case-Fallback) existiert */
  exists(path) {
    if (!state.loaded) throw new Error("PathIndex not ready");
    return !!tryResolve(path);
  },

  /** liefert den realen Repo-Pfad (oder null) */
  resolve(path) {
    if (!state.loaded) throw new Error("PathIndex not ready");
    return tryResolve(path);
  },

  /** Liste alle Dateien unter Präfix (z.B. "assets/tiles/") */
  list(prefix = "") {
    if (!state.loaded) throw new Error("PathIndex not ready");
    const pfx = prefix.toLowerCase();
    const out = [];
    for (const [lc, real] of state.lowerToReal) {
      if (lc.startsWith(pfx)) out.push(real);
    }
    return out;
  },

  /** Vorschläge, wenn ein Pfad nicht gefunden wurde */
  suggest(prefix, limit = 5) {
    if (!state.loaded) throw new Error("PathIndex not ready");
    return suggestions(prefix, limit);
  }
};
