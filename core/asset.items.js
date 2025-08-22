/**
 * core/asset.items.js
 * ---------------------------------------------------------------------------
 * Loader + Zugriff für das Items-Master-Sprite (PNG) & Atlas (JSON).
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Abhängigkeiten: keine (nur Fetch + Image)
 * Rendering: Canvas 2D (ctx.drawImage)
 * Raster: 128x128 pro Zelle (laut erzeugtem Atlas)
 * ---------------------------------------------------------------------------
 */

/* ===================== Imports ===================== */
// (keine externen Imports nötig)

/* ===================== Konstanten ===================== */
const ITEMS_IMAGE_PATH = '/assets/items/items_master_sprite.png';
const ITEMS_ATLAS_PATH = '/assets/items/items_master_sprite.json';

// optionale Aliase für bequemere Nutzung im Code
const ITEM_ALIASES = {
  log: 'item_log',
  stone: 'item_stone',
  bucket: 'item_bucket_full',       // Standard = voller Eimer
  bucket_full: 'item_bucket_full',
  bucket_empty: 'item_bucket_empty',// falls später ergänzt
  bread: 'item_food_bread',
  cheese: 'item_food_cheese',
  fish: 'item_food_fish',
  crate: 'item_crate',
  sack: 'item_sack',
  barrel: 'item_barrel',
  sword: 'item_weapon_short_sword',
  bow: 'item_weapon_bow',
  arrows: 'item_weapon_arrows',
  shield: 'item_shield_round',
  coins: 'item_coins_pouch',
  gems: 'item_gems',
  rope: 'item_rope',
  planks: 'item_planks',
  brick: 'item_brick'
};

/* ===================== Hilfsfunktionen ===================== */
function loadJSON(url) {
  return fetch(url, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error(`Atlas-Load failed: ${r.status} ${r.statusText}`);
    return r.json();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image-Load failed: ${src}`));
    img.src = src;
  });
}

function resolveKey(key) {
  // Alias → Atlas-Key auflösen
  return ITEM_ALIASES[key] || key;
}

/* ===================== Klassen ===================== */
class ItemAtlas {
  constructor(image, frames, meta) {
    this.image = image;     // HTMLImageElement
    this.frames = frames;   // { [key]: { frame:{x,y,w,h}, ... } }
    this.meta = meta || {};
  }

  has(key) {
    return !!this.frames[key];
  }

  getFrame(key) {
    const k = resolveKey(key);
    const f = this.frames[k];
    if (!f) throw new Error(`ItemAtlas: Unknown key "${key}" (resolved: "${k}")`);
    return f.frame; // {x,y,w,h}
  }

  /**
   * Zeichnet ein Item auf ein Canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} key - Atlas-Key oder Alias
   * @param {number} dx - Ziel X
   * @param {number} dy - Ziel Y
   * @param {object} [opt]
   * @param {number} [opt.scale=1] - Skalierung (1 = 128px)
   * @param {number} [opt.dw] - Zielbreite (überschreibt scale)
   * @param {number} [opt.dh] - Zielhöhe (überschreibt scale)
   * @param {boolean} [opt.pixelSnap=true] - auf ganzzahlige Pixel runden
   * @param {number} [opt.alpha=1] - globale Alpha
   */
  draw(ctx, key, dx, dy, opt = {}) {
    const { scale = 1, dw, dh, pixelSnap = true, alpha = 1 } = opt;
    const { x, y, w, h } = this.getFrame(key);

    const destW = (dw != null) ? dw : Math.round(w * scale);
    const destH = (dh != null) ? dh : Math.round(h * scale);
    const px = pixelSnap ? Math.round(dx) : dx;
    const py = pixelSnap ? Math.round(dy) : dy;

    const oldAlpha = ctx.globalAlpha;
    if (alpha !== 1) ctx.globalAlpha = oldAlpha * alpha;
    ctx.drawImage(this.image, x, y, w, h, px, py, destW, destH);
    if (alpha !== 1) ctx.globalAlpha = oldAlpha;
  }
}

/* ===================== Hauptlogik ===================== */
/**
 * Lädt Bild + Atlas und gibt eine ItemAtlas-Instanz zurück.
 * Integrierst du später in euren Asset-Init (z. B. in boot.js / core/asset.js).
 */
export async function initItemsAtlas({
  imagePath = ITEMS_IMAGE_PATH,
  atlasPath = ITEMS_ATLAS_PATH
} = {}) {
  const [atlas, image] = await Promise.all([loadJSON(atlasPath), loadImage(imagePath)]);
  if (!atlas || !atlas.frames) {
    throw new Error('Items-Atlas: frames fehlen im JSON.');
  }
  return new ItemAtlas(image, atlas.frames, atlas.meta);
}

/* ===================== Exports ===================== */
// export { ItemAtlas } – falls du die Klasse direkt brauchst
export { ItemAtlas };
