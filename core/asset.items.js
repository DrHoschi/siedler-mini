/**
 * core/asset.items.js
 * -----------------------------------------------------------------------------
 * Items‑Master‑Sprite (PNG) + Atlas (JSON) Loader mit bequemen Aliassen.
 * Projektstil: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Raster: 128x128 pro Zelle (laut erzeugtem Atlas)
 * Debug‑Tools bleiben unberührt.
 * -----------------------------------------------------------------------------
 */

/* ===================== Imports ===================== */
// keine externen Imports nötig

/* ===================== Konstanten ===================== */
export const DEFAULT_ITEMS_IMAGE_PATH = '/assets/items/items_master_sprite.png';
export const DEFAULT_ITEMS_ATLAS_PATH = '/assets/items/items_master_sprite.json';

const ITEM_ALIASES = {
  log: 'item_log',
  stone: 'item_stone',
  crate: 'item_crate',
  sack: 'item_sack',
  barrel: 'item_barrel',
  basket: 'item_basket',
  rope: 'item_rope',
  planks: 'item_planks',
  brick: 'item_brick',
  bread: 'item_food_bread',
  cheese: 'item_food_cheese',
  fish: 'item_food_fish',
  meat: 'item_food_meat',
  grain: 'item_food_grain',
  food: 'item_food_bundle',
  bucket: 'item_bucket_full',
  bucket_full: 'item_bucket_full',
  bucket_empty: 'item_bucket_empty', // wenn später ergänzt
  sword: 'item_weapon_short_sword',
  bow: 'item_weapon_bow',
  arrows: 'item_weapon_arrows',
  shield: 'item_shield_round',
  coins: 'item_coins_pouch',
  gems: 'item_gems',
};

/* ===================== Hilfsfunktionen ===================== */
function loadJSON(url) {
  return fetch(url, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error(`Items-Atlas: HTTP ${r.status} – ${r.statusText}`);
    return r.json();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Items-Image fehlgeschlagen: ${src}`));
    img.src = src;
  });
}

export function resolveItemKey(key) {
  return ITEM_ALIASES[key] || key;
}

/* ===================== Klassen ===================== */
export class ItemAtlas {
  constructor(image, frames, meta) {
    this.image = image;   // HTMLImageElement
    this.frames = frames; // { [key]: { frame:{x,y,w,h}, ... } }
    this.meta = meta || {};
  }

  has(key) {
    return !!this.frames[resolveItemKey(key)];
  }

  getFrame(key) {
    const k = resolveItemKey(key);
    const f = this.frames[k];
    if (!f) throw new Error(`ItemAtlas: unbekannter Key "${key}" (resolved: "${k}")`);
    return f.frame; // {x,y,w,h}
  }

  /**
   * Zeichnet ein Item ins Canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} key - Atlas-Key oder Alias
   * @param {number} dx - Ziel X
   * @param {number} dy - Ziel Y
   * @param {object} [opt]
   * @param {number} [opt.scale=1] - Skalierung (1 = 128px)
   * @param {number} [opt.dw] - Zielbreite (überschreibt scale)
   * @param {number} [opt.dh] - Zielhöhe (überschreibt scale)
   * @param {boolean} [opt.pixelSnap=true] - ganzzahlige Pixel
   * @param {number} [opt.alpha=1] - Alpha 0..1
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
/** Lädt Bild + Atlas und liefert eine ItemAtlas-Instanz. */
export async function initItemsAtlas({
  imagePath = DEFAULT_ITEMS_IMAGE_PATH,
  atlasPath = DEFAULT_ITEMS_ATLAS_PATH
} = {}) {
  const [atlas, image] = await Promise.all([loadJSON(atlasPath), loadImage(imagePath)]);
  if (!atlas || !atlas.frames) throw new Error('Items-Atlas: frames fehlen im JSON.');
  return new ItemAtlas(image, atlas.frames, atlas.meta);
}

/* ===================== Exports ===================== */
// (oben bereits exportiert)
