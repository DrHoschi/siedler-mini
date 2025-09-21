/**
 * Siedler‑Mini — PathIndex
 * Version: v16.0.0 (Baseline, 2025‑08‑25)
 * Zweck:
 *   - Liest EINMAL die im Repo erzeugte ./filelist.json (dein „Wahrheitsanker“).
 *   - Baut schnelle Nachschlage-Strukturen für Pfade:
 *       • exakte Pfade (Set)
 *       • case‑insensitive Map (lowercase → echter Repo-Pfad)
 *       • PNG‑Case‑Flip (.png ↔ .PNG) als Fallback
 *   - Bietet resolve()/exists()/list()/suggest() an.
 *
 * Wirkung:
 *   Jeder Asset‑Zugriff geht über PathIndex.resolve(rawPath) → realer Pfad.
 *   So tolerieren wir Groß-/Kleinschreibung und .PNG/.png‑Mischungen,
 *   ohne deine Dateien umbennen zu müssen.
 */

const state = {
  loaded: false,
  files: new Set(),          // exakte Repo-Pfade
  lowerToReal: new Map(),    // lowercase -> realer Pfad (wie in filelist.json)
};

/** interner Helper: .png ↔ .PNG umklappen */
function flipPngCase(p) {
  const lc = p.toLowerCase();
  if (!lc.endsWith(".png")) return null;
  return p.endsWith(".PNG") ? p.slice(0, -4) + ".png" : p.slice(0, -4) + ".PNG";
}

/** filelist.json laden und Indexe bauen */
async function load() {
  if (state.loaded) return;
  const res = await fetch("./filelist.json", { cache: "no-store" });
  if (!res.ok) throw new Error("filelist.json nicht gefunden – bitte den Workflow laufen lassen.");
  const data = await res.json();
  const entries = Array.isArray(data.entries) ? data.entries : [];

  for (const e of entries) {
    if (e.type !== "file") continue;
    const real = e.path;                 // z. B. 'assets/tex/terrain/topdown_grass.PNG'
    state.files.add(real);
    state.lowerToReal.set(real.toLowerCase(), real);
  }
  state.loaded = true;
}

/** Resolve mit Fallbacks (exakt → lowercase → PNG‑Flip) */
function tryResolve(raw) {
  if (state.files.has(raw)) return raw;
  const byLower = state.lowerToReal.get(raw.toLowerCase());
  if (byLower) return byLower;

  const flip = flipPngCase(raw);
  if (flip && state.files.has(flip)) return flip;
  if (flip) {
    const byLowerFlip = state.lowerToReal.get(flip.toLowerCase());
    if (byLowerFlip) return byLowerFlip;
  }
  return null;
}

export const PathIndex = {
  /** Promise, resolved sobald Index gebaut ist */
  ready: (async () => { await load(); })(),

  /** echten Repo‑Pfad (oder null) zurückgeben */
  resolve(path) {
    if (!state.loaded) throw new Error("PathIndex not ready");
    return tryResolve(path);
  },

  /** existiert der Pfad (mit Fallbacks)? */
  exists(path) {
    if (!state.loaded) throw new Error("PathIndex not ready");
    return !!tryResolve(path);
  },

  /** alle Dateien unter einem Präfix listen (z. B. "assets/tiles/") */
  list(prefix = "") {
    if (!state.loaded) throw new Error("PathIndex not ready");
    const pfx = prefix.toLowerCase();
    const out = [];
    for (const [lc, real] of state.lowerToReal) {
      if (lc.startsWith(pfx)) out.push(real);
    }
    return out;
  },

  /** Vorschläge (nützlich für Fehlermeldungen) */
  suggest(prefix, limit = 5) {
    if (!state.loaded) throw new Error("PathIndex not ready");
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
};
