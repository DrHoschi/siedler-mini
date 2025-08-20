// ============================================================================
// 📦 core/asset.js
// ----------------------------------------------------------------------------
// Zweck
//   Kleiner, robuster Asset-Loader für Images & JSON mit Cache.
//   - Crisp-Pixel-Rendering (pixelated)
//   - ImageBitmap-Fallback auf <img>
//   - Gemeinsamer Cache für wiederholte Zugriffe
//   - Manifest-Preload (images/json)
//   - Debug-Statistiken (optional)
//
// Struktur
//   1) IMPORTS
//   2) KONSTANTEN & KONFIG
//   3) HILFSFUNKTIONEN (intern/extern)
//   4) KLASSE: AssetStore
//   5) INITIALISIERUNG (Default-Instanz)
//   6) EXPORTS (inkl. Backwards-Compat zu deiner alten API)
// ============================================================================



// -----------------------------------------------------------------------------
// 1) IMPORTS
// -----------------------------------------------------------------------------
// (Derzeit keine externen Imports nötig)



// -----------------------------------------------------------------------------
// 2) KONSTANTEN & KONFIG
// -----------------------------------------------------------------------------

/**
 * Debug-Schalter:
 * - true  → Konsolen-Logs & Metriken (Ladezeiten) aktiv
 * - false → still
 */
const DEBUG_ASSETS = false;

/**
 * Standard-Optionen für ImageBitmap-Erzeugung (wenn verfügbar).
 * (Konservativ gewählt, ändert Alpha nicht und respektiert EXIF-Orientation.)
 */
const IMAGEBITMAP_OPTS = {
  imageOrientation: 'from-image',
  premultiplyAlpha: 'none'
};



// -----------------------------------------------------------------------------
// 3) HILFSFUNKTIONEN
// -----------------------------------------------------------------------------

/**
 * Sorgt für knackige Pixel-Darstellung (z. B. für Retro/Sprite-Grafik).
 * Kann mit Canvas-Element ODER 2D-Context aufgerufen werden.
 *
 * @param {HTMLCanvasElement|CanvasRenderingContext2D} ctxOrCanvas
 */
export function imageRenderingCrisp(ctxOrCanvas) {
  const c = ctxOrCanvas?.canvas || ctxOrCanvas;
  if (!c) return;
  // CSS-Eigenschaft für nearest-neighbor Scaling
  c.style.imageRendering = 'pixelated';
}

/**
 * Baut aus Basis-Pfad und Teil-URL eine nutzbare URL.
 * @param {string} base - Basis-Pfad (kann leer sein)
 * @param {string} url  - relative oder absolute URL
 */
function resolveURL(base, url) {
  if (!base) return url;
  // Keine doppelte Slash-Seuche
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

/**
 * Hilfsfunktion: misst eine asynchrone Operation (nur für Debug).
 */
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



// -----------------------------------------------------------------------------
// 4) KLASSE: AssetStore
// -----------------------------------------------------------------------------

/**
 * Zentraler Asset-Loader mit Cache.
 * - Lädt Bilder als ImageBitmap (wenn unterstützt) oder <img> Fallback
 * - Lädt JSON und cached die Promise-Ergebnisse
 * - Manifest-Preload: { images: [url], json: [url] }
 * - Optionaler Basis-Pfad (basePath) für alle relativen URLs
 */
class AssetStore {
  constructor() {
    /** @type {Map<string, Promise<any>>} */
    this.cache = new Map();

    /** @type {string} Basis-Pfad für relative URLs */
    this.basePath = '';

    /** @type {boolean} Ob Objekt-URLs für <img>-Fallback aufgehoben werden sollen */
    this._trackObjectURLs = true;
    /** @type {Set<string>} Gesammelte Object-URLs zum späteren Aufräumen */
    this._objectURLs = new Set();
  }

  // ------------------------------
  // Konfiguration
  // ------------------------------

  /**
   * Setzt einen Basis-Pfad, der vor alle relativen URLs gesetzt wird.
   * @param {string} base
   */
  setBasePath(base) {
    this.basePath = base || '';
  }

  /**
   * Löscht den gesamten Cache (und gibt ggf. Object-URLs frei).
   * Achtung: Referenzen auf bereits geladene Bitmaps/<img> bleiben bestehen.
   */
  clear() {
    this.cache.clear();
    this._revokeAllObjectURLs();
  }

  // ------------------------------
  // Kern-Loader
  // ------------------------------

  /**
   * Lädt ein Bild (ImageBitmap oder HTMLImageElement, je nach Support) und cached es.
   * @param {string} url
   * @returns {Promise<ImageBitmap|HTMLImageElement>}
   */
  async loadImage(url) {
    const key = resolveURL(this.basePath, url);
    if (this.cache.has(key)) return this.cache.get(key);

    const task = timeAsync(`image ${key}`, async () => {
      const res = await fetch(key);
      if (!res.ok) throw new Error(`Image load failed: ${key} (${res.status})`);
      const blob = await res.blob();

      // Moderner Weg: ImageBitmap
      if ('createImageBitmap' in window) {
        return await createImageBitmap(blob, IMAGEBITMAP_OPTS);
      }

      // Fallback: HTMLImageElement mit Object-URL
      return await new Promise((resolve, reject) => {
        const urlObj = URL.createObjectURL(blob);
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          resolve(img);
          // Object-URL kann jetzt aufgehoben werden (optional verzögert)
          if (this._trackObjectURLs) {
            this._objectURLs.add(urlObj);
            // Direkt freigeben → weniger Speicher, aber im Fehlerfall erneut nötig.
            // Wir geben hier NICHT sofort frei, damit Re-Layout/Draw sicher ist.
            // Aufräumen übernehmen _revokeAllObjectURLs() / clear().
          }
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

  /**
   * Lädt JSON-Daten und cached sie.
   * @param {string} url
   * @returns {Promise<any>}
   */
  async loadJSON(url) {
    const key = resolveURL(this.basePath, url);
    if (this.cache.has(key)) return this.cache.get(key);

    const task = timeAsync(`json ${key}`, async () => {
      const res = await fetch(key);
      if (!res.ok) throw new Error(`JSON load failed: ${key} (${res.status})`);
      return res.json();
    });

    this.cache.set(key, task);
    return task;
  }

  /**
   * Lädt mehrere Assets gemäß Manifest.
   * @param {{images?: string[], json?: string[]}} manifest
   */
  async loadAll(manifest = {}) {
    const tasks = [];
    (manifest.images || []).forEach(u => tasks.push(this.loadImage(u)));
    (manifest.json || []).forEach(u => tasks.push(this.loadJSON(u)));
    await Promise.all(tasks);
  }

  // ------------------------------
  // Cache-Helfer
  // ------------------------------

  /**
   * Gibt die (Promise auf die) Ressource zurück, falls vorhanden.
   * @param {string} url
   */
  get(url) {
    const key = resolveURL(this.basePath, url);
    return this.cache.get(key);
  }

  /**
   * Prüft, ob eine Ressource bereits im Cache ist.
   * @param {string} url
   */
  has(url) {
    const key = resolveURL(this.basePath, url);
    return this.cache.has(key);
  }

  /**
   * Legt manuell einen bereits vorliegenden Wert in den Cache.
   * @param {string} url
   * @param {any|Promise<any>} value
   */
  put(url, value) {
    const key = resolveURL(this.basePath, url);
    this.cache.set(key, Promise.resolve(value));
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

  /**
   * Liefert eine kleine Übersicht über den Cache-Status.
   */
  stats() {
    return {
      entries: this.cache.size
    };
  }
}



// -----------------------------------------------------------------------------
// 5) INITIALISIERUNG (Default-Instanz)
// -----------------------------------------------------------------------------

/**
 * Gemeinsame Standard-Instanz für bequeme Nutzung im Projekt.
 * Beispiel:
 *   import { Assets } from './core/asset.js';
 *   await Assets.loadImage('sprites/player.png');
 */
const Assets = new AssetStore();



// -----------------------------------------------------------------------------
// 6) EXPORTS
// -----------------------------------------------------------------------------
//
// - Primär: AssetStore-Klasse + Standardinstanz `Assets`
// - Backwards-Compatibility: gleichnamige Funktions-Exports wie in deiner alten
//   IIFE-Version (loadImage, loadJSON, loadAll, get, imageRenderingCrisp).
//

export { AssetStore, Assets };

// Backwards-Compat: Direkt-Funktionen, verweisen auf die Default-Instanz
export async function loadImage(url)   { return Assets.loadImage(url); }
export async function loadJSON(url)    { return Assets.loadJSON(url); }
export async function loadAll(manifest){ return Assets.loadAll(manifest); }
export function get(url)               { return Assets.get(url); }
