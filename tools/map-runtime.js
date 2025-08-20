/* tools/map-runtime.js
 * Siedler 2020 — Minimalistischer Tile-Renderer mit Alias- & Animations-Support
 * -------------------------------------------------------------------------------------------------
 * Öffentliche API (Beispiel):
 *   import { SiedlerMap } from './tools/map-runtime.js';
 *   const world = new SiedlerMap({ tileResolver: n => './assets/' + n, onReady: () => {} });
 *   await world.loadFromObject(worldJson);           // worldJson kann Atlas-URLs oder -Objekte enthalten
 *   world.draw(ctx, { x: cam.x, y: cam.y, w: vw, h: vh, zoom: cam.zoom }, elapsedMs);
 *
 * Map-Struktur (flexibel):
 *   {
 *     tileSize?: number,
 *     width?: number,
 *     height?: number,
 *     tiles?: string[][],                  // [y][x]  – einfache Karte (ein Layer)
 *     layers?: [{ tiles:string[][], visible?:boolean }],
 *     background?: string,                 // CSS-Farbe (optional)
 *     atlas?: {
 *       json: string|object,               // URL oder bereits geparstes Objekt
 *       image: string|HTMLImageElement|ImageBitmap
 *     }
 *   }
 *
 * Atlas-Struktur (erwartet):
 *   {
 *     frames: { [key:string]: { x:number,y:number,w:number,h:number } },
 *     animations?: { [base:string]: { fps?:number, frames:string[] } },
 *     aliases?: { [from:string]: string },           // z.B. "water" -> "water_0"
 *     meta?: { tileSize?: number }
 *   }
 *
 * Projekt‑Präferenzen:
 *   (1) Debug/Checker bleiben drin   (2) Kommentare ausführlich   (3) Dateiname bleibt tools/map-runtime.js
 *   (4) Startfenster-Steuerung liegt in index.html (hier nur Renderer)
 *   (5) Farbschema wird nur im HUD/Overlay genutzt (hier nicht nötig)
 *   (6) Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
 */

// =================================================================================================
// Imports (keine externen benötigt)
// =================================================================================================

// (leer)

// =================================================================================================
// Konstanten
// =================================================================================================

const DEFAULT_TILE = 64;
const DEFAULT_FPS   = 6;   // Standard-FPS für implizite Animationen (name_0,name_1,...)

// =================================================================================================
// Helpers
// =================================================================================================

/**
 * JSON laden: URL oder direkt ein bereits vorhandenes Objekt durchreichen.
 */
async function loadJSON(maybeUrlOrObj) {
  if (typeof maybeUrlOrObj === 'object' && maybeUrlOrObj !== null) return maybeUrlOrObj;
  const res = await fetch(maybeUrlOrObj);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${maybeUrlOrObj}`);
  return await res.json();
}

/**
 * Image laden:
 *  - Falls bereits ein ImageBitmap oder HTMLImageElement, direkt zurückgeben
 *  - Sonst via fetch → blob → createImageBitmap|Image
 */
async function loadImage(src) {
  // Schon ein fertiges Bildobjekt?
  if (src && (src instanceof ImageBitmap || (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement))) {
    return src;
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
  const blob = await res.blob();
  if ('createImageBitmap' in self) {
    return await createImageBitmap(blob, { imageOrientation: 'from-image', premultiplyAlpha: 'none' });
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Alias-Auflösung: atlas.aliases[name] → targetName
 */
function resolveAlias(atlas, name) {
  if (!atlas || !name) return name;
  const aliases = atlas.aliases || {};
  return aliases[name] || name;
}

/**
 * Erkenne Keys im Format "base_0", "base_1", ...
 */
function splitNumericSuffix(key) {
  const m = /^(.+)_([0-9]+)$/.exec(key);
  if (!m) return null;
  return { base: m[1], index: parseInt(m[2], 10) };
}

/**
 * Ermittle zum Basis‑Key den aktuell zu zeichnenden Frame‑Key.
 * Reihenfolge:
 *   1) Explizite Animation in atlas.animations[base]
 *   2) Implizite Sequenz name_0, name_1, ...
 *   3) Fallback: statischer Key (base)
 */
function currentFrameKey(atlas, baseName, elapsedMs) {
  if (!atlas) return baseName;

  // 1) Explizite Animation
  const anim = atlas.animations && atlas.animations[baseName];
  if (anim && Array.isArray(anim.frames) && anim.frames.length > 0) {
    const fps = anim.fps || DEFAULT_FPS;
    const idx = Math.floor((elapsedMs / 1000) * fps) % anim.frames.length;
    return anim.frames[idx];
  }

  // 2) Implizite Frames base_0, base_1, ...
  const frames = [];
  const keys = Object.keys(atlas.frames || {});
  const prefix = baseName + '_';
  for (const k of keys) {
    if (k.startsWith(prefix)) {
      const s = splitNumericSuffix(k);
      if (s) frames.push({ k, i: s.index });
    }
  }
  if (frames.length > 0) {
    frames.sort((a, b) => a.i - b.i);
    const fps = DEFAULT_FPS;
    const idx = Math.floor((elapsedMs / 1000) * fps) % frames.length;
    return frames[idx].k;
  }

  // 3) Statisch
  return baseName;
}

/**
 * Zeichne einen (ggf. animierten) Tile‑Frame aus dem Atlas.
 */
function drawTileFromAtlas(ctx, atlas, atlasImage, baseOrKey, dx, dy, size, elapsedMs = 0) {
  if (!atlas || !atlasImage || !baseOrKey) return;
  const resolved = resolveAlias(atlas, baseOrKey);
  const key = currentFrameKey(atlas, resolved, elapsedMs);
  const f = atlas.frames && atlas.frames[key];
  if (!f) return;
  ctx.drawImage(atlasImage, f.x, f.y, f.w, f.h, dx, dy, size, size);
}

// =================================================================================================
// Klassen
// =================================================================================================

/**
 * SiedlerMap – verwaltet Atlas + Map‑Daten und zeichnet einen Sichtbereich.
 */
export class SiedlerMap {
  /**
   * @param {{ tileResolver?:(name:string)=>string, onReady?:()=>void }} opts
   */
  constructor(opts = {}) {
    // Pfad‑Resolver für Assets (derzeit optional; vorgesehen für erweiterte Loader)
    this.tileResolver = opts.tileResolver || (n => n);
    this.onReady = opts.onReady || (() => {});

    // Atlas
    this.atlas = null;        // { frames, animations?, aliases?, meta? }
    this.atlasImage = null;   // ImageBitmap | HTMLImageElement

    // Map‑Daten
    this.tileSize = DEFAULT_TILE; // kann durch atlas.meta.tileSize überschrieben werden
    this.width = 0;               // in Tiles
    this.height = 0;              // in Tiles

    // Karte: EINFACH (tiles) ODER mehrere Layer
    this.tiles = null;       // string[][] oder null
    this.layers = null;      // { tiles:string[][], visible?:boolean }[] oder null

    // Optionaler Hintergrund
    this.background = '#000000';
  }

  /**
   * Optionaler direkter Atlas‑Anschluss (wenn der Aufrufer bereits geladen hat).
   */
  attachAtlas(atlasJson, atlasImage) {
    this.atlas = atlasJson || null;
    this.atlasImage = atlasImage || null;
    if (this.atlas && this.atlas.meta && this.atlas.meta.tileSize) {
      this.tileSize = (this.atlas.meta.tileSize | 0) || this.tileSize;
    }
  }

  /**
   * Map/Welt aus einem Objekt laden. Das Objekt kann Atlas‑URLs oder fertige Objekte enthalten.
   * @param {object} worldObj
   */
  async loadFromObject(worldObj = {}) {
    // 1) Grundlegende Struktur übernehmen
    this.tileSize = (worldObj.tileSize | 0) || this.tileSize;

    this.width  = (worldObj.width  | 0) || this.width  || (worldObj.tiles ? (worldObj.tiles[0]?.length || 0) : 0);
    this.height = (worldObj.height | 0) || this.height || (worldObj.tiles ? worldObj.tiles.length : 0);

    this.tiles  = Array.isArray(worldObj.tiles)  ? worldObj.tiles  : null;
    this.layers = Array.isArray(worldObj.layers) ? worldObj.layers : (this.tiles ? [{ tiles: this.tiles, visible: true }] : null);

    if (worldObj.background) this.background = worldObj.background;

    // 2) Atlas laden (nur wenn noch keiner gesetzt ist)
    if (!this.atlas && worldObj.atlas) {
      // Varianten: { json:'url|obj', image:'url|img|bitmap' }
      const atlasJson = await loadJSON(worldObj.atlas.json);
      const atlasImg  = await loadImage(worldObj.atlas.image);
      this.attachAtlas(atlasJson, atlasImg);
    }

    // 3) Tilegröße ggf. aus Atlas übernehmen
    if (this.atlas && this.atlas.meta && this.atlas.meta.tileSize) {
      this.tileSize = (this.atlas.meta.tileSize | 0) || this.tileSize;
    }

    // 4) Ready-Callback
    try { this.onReady(); } catch (e) { console.error('SiedlerMap.onReady Fehler:', e); }
  }

  /**
   * Zeichne die Karte in den Sichtbereich.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x:number,y:number,w:number,h:number,zoom?:number}} view - Welt‑Koordinaten (x,y in px)
   * @param {number} elapsedMs
   */
  draw(ctx, view, elapsedMs = 0) {
    if (!ctx) return;

    const t = this.tileSize || DEFAULT_TILE;

    // View-Werte + Zoom
    const vx = (view?.x | 0) || 0;
    const vy = (view?.y | 0) || 0;
    const vw_screen = (view?.w | 0) || ctx.canvas.width;   // Breite des Zeichenbereichs in Bildschirm‑px
    const vh_screen = (view?.h | 0) || ctx.canvas.height;  // Höhe
    const zoom = Number.isFinite(view?.zoom) && view.zoom > 0 ? view.zoom : 1;

    // Für Culling rechnen wir in Welt‑px → Bildschirmgröße / Zoom = Welt‑Sichtfenster
    const vw_world = vw_screen / zoom;
    const vh_world = vh_screen / zoom;

    // Sichtbares Tile‑Fenster ermitteln (Welt‑Koords → Tile‑Koords)
    const minTX = Math.max(0, Math.floor(vx / t));
    const minTY = Math.max(0, Math.floor(vy / t));
    const maxTX = Math.min(this.width,  Math.ceil((vx + vw_world) / t) + 1);
    const maxTY = Math.min(this.height, Math.ceil((vy + vh_world) / t) + 1);

    // Hintergrund zeichnen (im Screen‑Space)
    if (this.background) {
      ctx.save();
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, vw_screen, vh_screen);
      ctx.restore();
    }

    // Layer iterieren
    const layers = this.layers || [];
    for (const layer of layers) {
      if (layer.visible === false) continue;
      const grid = layer.tiles;
      if (!Array.isArray(grid)) continue;

      for (let ty = minTY; ty < maxTY; ty++) {
        const row = grid[ty];
        if (!row) continue;
        for (let tx = minTX; tx < maxTX; tx++) {
          const name = row[tx];
          if (!name) continue;

          // Welt‑Position (oben‑links) dieses Tiles
          const worldX = tx * t;
          const worldY = ty * t;

          // In Screen‑Koords (Zoom & View anwenden)
          const dx = Math.floor((worldX - vx) * zoom);
          const dy = Math.floor((worldY - vy) * zoom);
          const size = Math.ceil(t * zoom);

          drawTileFromAtlas(ctx, this.atlas, this.atlasImage, name, dx, dy, size, elapsedMs);
        }
      }
    }
  }
}

// =================================================================================================
// Hauptlogik (keine eigenständige nötig; Klasse stellt API bereit)
// =================================================================================================

// (leer)

// =================================================================================================
// Exports
// =================================================================================================

export { loadJSON, loadImage, resolveAlias, currentFrameKey };
// EOF
