// tools/map-runtime.js
// SiedlerMap – minimalistischer Tile-Renderer mit Alias- und Animations-Support
// -----------------------------------------------------------
// Features:
// - Atlas (frames + animations) + Bild
// - Aliases aus atlas.aliases werden automatisch aufgelöst
// - Animations-Frames über atlas.animations[base] (fps, frames[]) oder Keys *_0,_1,_2...
// - Sichtbares Fenster rendern (view{x,y,w,h})
// - Flexible Map-Struktur: { tileSize?, width?, height?, tiles?[][], layers?[], atlas?{json|image} }
//
// Erwartete Pfade (typisch):
//   assets/tiles/tileset.terrain.json
//   assets/tiles/tileset.terrain.png
//
// Öffentliche API:
//   const world = new SiedlerMap({ tileResolver: (n)=>'./assets/'+n, onReady:()=>{} });
//   await world.loadFromObject(worldJson);
//   // optional: world.attachAtlas(atlasJsonObj, atlasImageBitmapOrImg);
//   world.draw(ctx, viewRect, elapsedMs);
//
// -----------------------------------------------------------

/** Canvas-Image loader (HTMLImageElement bevorzugt; ImageBitmap optional) */
async function loadImage(src) {
  // Wenn bereits ein ImageBitmap oder <img> übergeben wurde, zurückgeben
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

/** JSON loader (URL oder Objekt durchreichen) */
async function loadJSON(maybeUrlOrObj) {
  if (typeof maybeUrlOrObj === 'object' && maybeUrlOrObj !== null) return maybeUrlOrObj;
  const res = await fetch(maybeUrlOrObj);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${maybeUrlOrObj}`);
  return await res.json();
}

/** Alias-Auflösung */
function resolveAlias(atlas, name) {
  if (!atlas || !name) return name;
  const aliases = atlas.aliases || {};
  return aliases[name] || name;
}

/** Prüft, ob ein Key wie foo_0, foo_1, ... ist */
function splitNumericSuffix(key) {
  const m = /^(.+)_([0-9]+)$/.exec(key);
  if (!m) return null;
  return { base: m[1], index: parseInt(m[2], 10) };
}

/** Liefert den Animations-Frame-Key zu einer Basis (oder Name selbst, wenn statisch) */
function currentFrameKey(atlas, baseName, elapsedMs) {
  if (!atlas) return baseName;

  // 1) Explizite Animationseinträge bevorzugen
  const anim = atlas.animations && atlas.animations[baseName];
  if (anim && anim.frames && anim.frames.length) {
    const fps = anim.fps || 6;
    const idx = Math.floor((elapsedMs / 1000) * fps) % anim.frames.length;
    return anim.frames[idx];
  }

  // 2) Implizite *_0,_1,_2 ... Frames
  //    Wir sammeln alle Frames, die wie baseName_# heißen
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
    const fps = 6;
    const idx = Math.floor((elapsedMs / 1000) * fps) % frames.length;
    return frames[idx].k;
  }

  // 3) Fallback: statisch
  return baseName;
}

/** Zeichnet einen Frame oder eine Animation an (dx,dy) in Zielgröße size (px) */
function drawTileFromAtlas(ctx, atlas, atlasImage, baseOrKey, dx, dy, size, elapsedMs = 0) {
  if (!atlas || !atlasImage || !baseOrKey) return;
  const resolved = resolveAlias(atlas, baseOrKey);
  const key = currentFrameKey(atlas, resolved, elapsedMs);
  const f = atlas.frames && atlas.frames[key];
  if (!f) return;
  ctx.drawImage(atlasImage, f.x, f.y, f.w, f.h, dx, dy, size, size);
}

export class SiedlerMap {
  constructor(opts = {}) {
    this.tileResolver = opts.tileResolver || (n => n);
    this.onReady = opts.onReady || (() => {});

    // Atlas
    this.atlas = null;          // { frames, animations, aliases?, meta? }
    this.atlasImage = null;     // ImageBitmap|HTMLImageElement

    // Map-Daten
    this.tileSize = 64;         // Default; kann von atlas.meta.tileSize überschrieben werden
    this.width = 0;             // in Tiles
    this.height = 0;            // in Tiles

    // Einfache Kartenformen:
    // - tiles: 2D Array [y][x] -> string key
    // - layers: [{ tiles: 2D array, visible:true }]
    this.tiles = null;
    this.layers = null;

    // Optional: Hintergrundfarbe
    this.background = '#000000';
  }

  /** Optionaler direkter Atlas-Anschluss (wenn der Aufrufer schon alles geladen hat) */
  attachAtlas(atlasJson, atlasImage) {
    this.atlas = atlasJson || null;
    this.atlasImage = atlasImage || null;
    if (this.atlas && this.atlas.meta && this.atlas.meta.tileSize) {
      this.tileSize = this.atlas.meta.tileSize | 0 || this.tileSize;
    }
  }

  /** World/Map laden. worldObj kann Atlas-URLs enthalten oder bereits geladene Daten. */
  async loadFromObject(worldObj = {}) {
    // 1) Kartenstruktur übernehmen
    this.tileSize = worldObj.tileSize | 0 || this.tileSize;
    this.width = worldObj.width | 0 || this.width || (worldObj.tiles ? (worldObj.tiles[0]?.length || 0) : 0);
    this.height = worldObj.height | 0 || this.height || (worldObj.tiles ? worldObj.tiles.length : 0);
    this.tiles = Array.isArray(worldObj.tiles) ? worldObj.tiles : null;
    this.layers = Array.isArray(worldObj.layers) ? worldObj.layers : (this.tiles ? [{ tiles: this.tiles, visible: true }] : null);
    if (worldObj.background) this.background = worldObj.background;

    // 2) Atlas laden (wenn in der Map angegeben), sonst warten wir auf attachAtlas()
    if (!this.atlas && worldObj.atlas) {
      // Varianten: atlas:{ json:'url', image:'url' }  ODER bereits Objekte
      const atlasJson = await loadJSON(worldObj.atlas.json);
      const atlasImg = await loadImage(worldObj.atlas.image);
      this.attachAtlas(atlasJson, atlasImg);
    }

    // 3) Tilegröße ggf. aus Atlas übernehmen
    if (this.atlas && this.atlas.meta && this.atlas.meta.tileSize) {
      this.tileSize = this.atlas.meta.tileSize | 0 || this.tileSize;
    }

    // 4) Ready-Callback
    this.onReady();
  }

  /** Zeichnet die Karte in den angegebenen Sichtbereich */
  draw(ctx, view, elapsedMs = 0) {
    if (!ctx) return;
    const t = this.tileSize || 64;

    // Sichtfenster in Tile-Koordinaten bestimmen
    const vx = view?.x | 0 || 0;
    const vy = view?.y | 0 || 0;
    const vw = view?.w | 0 || ctx.canvas.width;
    const vh = view?.h | 0 || ctx.canvas.height;

    const minTX = Math.max(0, Math.floor(vx / t));
    const minTY = Math.max(0, Math.floor(vy / t));
    const maxTX = Math.min(this.width, Math.ceil((vx + vw) / t) + 1);
    const maxTY = Math.min(this.height, Math.ceil((vy + vh) / t) + 1);

    // Hintergrund (optional)
    if (this.background) {
      ctx.save();
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, vw, vh);
      ctx.restore();
    }

    // Layers iterieren
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

          const dx = (tx * t) - vx;
          const dy = (ty * t) - vy;

          drawTileFromAtlas(ctx, this.atlas, this.atlasImage, name, dx, dy, t, elapsedMs);
        }
      }
    }
  }
}
