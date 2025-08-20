// ============================================================================
// 📦 core/asset.js  — v1.1 (robust, cache-busting, default export)
// ----------------------------------------------------------------------------
// Zweck
//   Kleiner, robuster Asset-Loader für Images & JSON mit Cache.
//   - Crisp-Pixel-Rendering (pixelated)
//   - ImageBitmap (optional) oder <img>-Fallback
//   - Gemeinsamer Cache für wiederholte Zugriffe
//   - Manifest-Preload (images/json)
//   - Debug-Logs (optional)
//   - Cache-Busting: Version-Suffix & Fetch-Cache-Mode
//   - Default-Export + Named Exports (kompatibel zu unterschiedlichen Imports)
// ============================================================================



// -----------------------------------------------------------------------------
// 1) IMPORTS
// -----------------------------------------------------------------------------
// (keine externen Imports)



// -----------------------------------------------------------------------------
// 2) KONSTANTEN & KONFIG
// -----------------------------------------------------------------------------

/** Debug-Schalter */
const DEBUG_ASSETS = false;

/** Standard-Optionen für ImageBitmap */
const IMAGEBITMAP_OPTS = {
  imageOrientation: 'from-image',
  premultiplyAlpha: 'none'
};



// -----------------------------------------------------------------------------
// 3) HILFSFUNKTIONEN
// -----------------------------------------------------------------------------

/** Crispes Pixel-Scaling (nearest-neighbor) für Canvas */
export function imageRenderingCrisp(ctxOrCanvas) {
  const c = ctxOrCanvas?.canvas || ctxOrCanvas;
  if (!c) return;
  c.style.imageRendering = 'pixelated';
}

/** URL-Auflösung mit optionalem Base-Pfad */
function resolveURL(base, url) {
  if (!base) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

/** Zeitmessung für Async-Operationen (nur Debug) */
async function timeAsync(label, fn) {
  if (!DEBUG_ASSETS) return fn();
  const t0 = performance.now();
  try {
    const out = await fn();
    const t1 = performance.now();
    console.info(`[ASSETS] ${label} in ${(t1 - t0).toFixed(1)}ms`);
    return out;
  } catch (e) {
    const t1 = performance.now();
    console.warn(`[ASSETS] ${label} failed after ${(t1 - t0).toFixed(1)}ms`);
    throw e;
  }
}

/** hängt ?v=... an (oder &v=...), falls version gesetzt ist */
function withVersion(url, version) {
  if (!version) return url;
  return url + (url.includes('?') ? `&v=${encodeURIComponent(version)}` : `?v=${encodeURIComponent(version)}`);
}



// -----------------------------------------------------------------------------
// 4) KLASSE: AssetStore
// -----------------------------------------------------------------------------

class AssetStore {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.basePath]            - Basis-Pfad für relative URLs
   * @param {string} [opts.version]             - Version-Suffix für Cache-Busting (z. B. Build-Hash)
   * @param {RequestCache} [opts.cacheMode]     - fetch cache mode ('default' | 'reload' | 'no-store' | ...)
   * @param {boolean} [opts.useImageBitmap]     - true = bevorzugt ImageBitmap, false = erzwinge <img>-Fallback
   * @param {boolean} [opts.trackObjectURLs]    - Object-URLs sammeln und später freigeben
   */
  constructor(opts = {}) {
    /** @type {Map<string, Promise<any>>} */
    this.cache = new Map();

    this.basePath = opts.basePath || '';
    this.version  = opts.version  || '';          // z. B. globaler BUILD_HASH
    this.cacheMode = opts.cacheMode || 'default'; // 'default' | 'reload' | 'no-store' ...
    this.useImageBitmap = (opts.useImageBitmap !== undefined)
      ? !!opts.useImageBitmap
      : ('createImageBitmap' in window);

    this._trackObjectURLs = opts.trackObjectURLs !== false; // default: true
    this._objectURLs = new Set();
  }

  // ------------------------------
  // Konfiguration
  // ------------------------------

  setBasePath(base) { this.basePath = base || ''; }
  setVersion(v)     { this.version  = v || ''; }
  setCacheMode(m)   { this.cacheMode = m || 'default'; }
  setUseImageBitmap(flag) { this.useImageBitmap = !!flag; }

  clear() {
    this.cache.clear();
    this._revokeAllObjectURLs();
  }

  // ------------------------------
  // Kern-Loader
  // ------------------------------

  async loadImage(url) {
    const resolved = resolveURL(this.basePath, url);
    const withVer  = withVersion(resolved, this.version);
    const key = withVer;

    if (this.cache.has(key)) return this.cache.get(key);

    const task = timeAsync(`image ${key}`, async () => {
      const res = await fetch(withVer, { cache: this.cacheMode });
      if (!res.ok) throw new Error(`Image load failed: ${withVer} (${res.status})`);
      const blob = await res.blob();

      if (this.useImageBitmap) {
        // Moderner Weg: ImageBitmap
        return await createImageBitmap(blob, IMAGEBITMAP_OPTS);
      }

      // Fallback: HTMLImageElement
      return await new Promise((resolve, reject) => {
        const urlObj = URL.createObjectURL(blob);
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          resolve(img);
          if (this._trackObjectURLs) this._objectURLs.add(urlObj);
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(urlObj);
          reject(e);
        };
        img.src = urlObj;
      });
    });

    this.cache.set(key, task);
    return task;
  }

  async loadJSON(url) {
    const resolved = resolveURL(this.basePath, url);
    const withVer  = withVersion(resolved, this.version);
    const key = withVer;

    if (this.cache.has(key)) return this.cache.get(key);

    const task = timeAsync(`json ${key}`, async () => {
      const res = await fetch(withVer, { cache: this.cacheMode });
      if (!res.ok) throw new Error(`JSON load failed: ${withVer} (${res.status})`);
      return res.json();
    });

    this.cache.set(key, task);
    return task;
  }

  async loadAll(manifest = {}) {
    const tasks = [];
    (manifest.images || []).forEach(u => tasks.push(this.loadImage(u)));
    (manifest.json   || []).forEach(u => tasks.push(this.loadJSON(u)));
    await Promise.all(tasks);
  }

  // ------------------------------
  // Cache-Helfer
  // ------------------------------

  get(url) {
    const resolved = resolveURL(this.basePath, url);
    const withVer  = withVersion(resolved, this.version);
    return this.cache.get(withVer);
  }

  has(url) {
    const resolved = resolveURL(this.basePath, url);
    const withVer  = withVersion(resolved, this.version);
    return this.cache.has(withVer);
  }

  put(url, value) {
    const resolved = resolveURL(this.basePath, url);
    const withVer  = withVersion(resolved, this.version);
    this.cache.set(withVer, Promise.resolve(value));
  }

  // ------------------------------
  // Aufräumen (nur für <img>-Fallback relevant)
  // ------------------------------

  _revokeAllObjectURLs() {
    if (!this._objectURLs.size) return;
    for (const u of this._objectURLs) {
      try { URL.revokeObjectURL(u); } catch {}
    }
    this._objectURLs.clear();
  }

  // ------------------------------
  // Debug / Stats
  // ------------------------------

  stats() { return { entries: this.cache.size }; }
}



// -----------------------------------------------------------------------------
// 5) INITIALISIERUNG (Default-Instanz)
// -----------------------------------------------------------------------------

const Assets = new AssetStore();



// -----------------------------------------------------------------------------
// 6) EXPORTS (Named + Default)
// -----------------------------------------------------------------------------

export { AssetStore, Assets };

// Backwards-Compat: Direkt-Funktionen an die Default-Instanz gebunden
export async function loadImage(url)    { return Assets.loadImage(url); }
export async function loadJSON(url)     { return Assets.loadJSON(url); }
export async function loadAll(manifest) { return Assets.loadAll(manifest); }
export function get(url)                { return Assets.get(url); }

// Default-Export (falls irgendwo `import Assets from '...'`)
export default Assets;
