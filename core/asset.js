/* ================================================================================================ 
 Siedler‑Mini V14.7‑hf2 — core/asset.js
 Zweck: Kleine, robuste Helfer rund um Canvas, Loading & Assets. Enthält u. a. imageRenderingCrisp(), ensure2DContext(), 
 simple Loader, kleinen AssetManager.
 Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports 
================================================================================================ */

// ---------------------------------------------------------
// Imports (derzeit keine externen nötig)
// ---------------------------------------------------------
// ➕ NEU: Items‑Atlas‑Loader einbinden (separate Datei)
import { initItemsAtlas, ItemAtlas, DEFAULT_ITEMS_IMAGE_PATH, DEFAULT_ITEMS_ATLAS_PATH, resolveItemKey } from './core/asset.items.js';

// ---------------------------------------------------------
// Konstanten (Rendering & Carry-System)
// ---------------------------------------------------------
const IMG_RENDER_PIXELATED = 'pixelated'; // gut unterstützt (inkl. Safari/iOS)
const IMG_RENDER_AUTO = 'auto';

// Carry-System: unterstützte Trage-Stile
const CARRY_STYLES = /** @type {const} */ (["shoulder","belly","hand"]);

// Defaults für Attach-/Handle-Offsets
const DEFAULT_ATTACH_FALLBACK = { x: 32, y: 32 };
const DEFAULT_HANDLE_FALLBACK = { x: 0, y: 0 };

// ---------------------------------------------------------
// Helpers (Canvas/Context/Loader) — bestehend aus deiner Datei
// ---------------------------------------------------------

/** Aus Canvas ODER Context das Duo {cv,ctx} extrahieren. Nie werfen. */
function coerceCanvasAndCtx(target){
  let cv = null, ctx = null;
  if (!target) return { cv:null, ctx:null };
  try{
    if (typeof HTMLCanvasElement !== 'undefined' && target instanceof HTMLCanvasElement) {
      cv = target; ctx = target.getContext && target.getContext('2d') || null;
    } else if (target && target.canvas) {
      cv = target.canvas; ctx = target;
    }
  }catch{}
  return { cv, ctx };
}

/** HiDPI‑Maße setzen. Gibt den verwendeten DPR zurück. */
export function setupHiDPICanvas(cv, { dpr = Math.max(1, window.devicePixelRatio || 1), width, height } = {}){
  if(!cv) return 1;
  const w = width ?? (innerWidth || document.documentElement.clientWidth || cv.clientWidth || 800);
  const h = height ?? (innerHeight|| document.documentElement.clientHeight || cv.clientHeight || 600);
  cv.width = Math.floor(w * dpr);
  cv.height = Math.floor(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  return dpr;
}

/** Pixel‑Art‑freundliches Rendering (Nearest‑Neighbor). Niemals hart werfen. */
export function imageRenderingCrisp(target){
  const { cv, ctx } = coerceCanvasAndCtx(target);
  try{
    if (ctx){
      ctx.imageSmoothingEnabled = false;
      // @ts-ignore
      if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'low';
    }
    if (cv && cv.style){
      cv.style.setProperty('image-rendering', IMG_RENDER_PIXELATED);
    }
  }catch(e){
    console.warn('imageRenderingCrisp: Hint nicht komplett gesetzt', e);
  }
  return { cv, ctx };
}

/** Weiches Standard‑Rendering. */
export function imageRenderingSmooth(target){
  const { cv, ctx } = coerceCanvasAndCtx(target);
  try{
    if (ctx){
      ctx.imageSmoothingEnabled = true;
      // @ts-ignore
      if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    }
    if (cv && cv.style){
      cv.style.setProperty('image-rendering', IMG_RENDER_AUTO);
    }
  }catch(e){
    console.warn('imageRenderingSmooth: Hint nicht komplett gesetzt', e);
  }
  return { cv, ctx };
}

/** 2D‑Kontext mit brauchbaren Defaults holen. */
export function ensure2DContext(canvas, opts = {}){
  if (!canvas) return null;
  const defaults = { alpha:true, desynchronized:true, willReadFrequently:false };
  try { return canvas.getContext('2d', Object.assign({}, defaults, opts)); }
  catch { return canvas.getContext('2d'); }
}

/** Kleine Loader‑Utilities (können später durch Asset‑Pipeline ersetzt werden). */
export async function loadJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

export async function loadImage(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const blob = await res.blob();
  if ('createImageBitmap' in self) return await createImageBitmap(blob);
  return await new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src = URL.createObjectURL(blob);
  });
}

/** Sehr einfacher Asset‑Manager (Cache + Basis‑Pfad). */
export class AssetManager{
  constructor({ base = './assets/' } = {}){
    this.base = base;
    this.cache = new Map();
  }
  async getImage(name){
    if(this.cache.has(name)) return this.cache.get(name);
    const img = await loadImage(this.base + name);
    this.cache.set(name, img);
    return img;
  }
  async warmup(){ /* optionaler Preload‑Hook */ }
}

// ---------------------------------------------------------
// Helpers (Carry-System) — bestehend
// ---------------------------------------------------------

/**
 * Liefert die Attach-Offsets (pro Frame) für eine Figur, Richtung & Stil.
 * Erwartet porterAtlas.attachPoints[style][dir] = [{x,y}, ...]
 */
function getAttachArray(porterAtlas, style, dir){
  return porterAtlas?.attachPoints?.[style]?.[dir] ?? null;
}

/**
 * Liefert den Handle-Offset des Items für einen Stil.
 * itemsAtlas.items[itemKey].handleOffsetByStyle[style] → bevorzugt
 * fallback: itemsAtlas.items[itemKey].handleOffset → global
 */
function getHandleOffset(itemsAtlas, itemKey, style){
  const itm = itemsAtlas?.items?.[itemKey];
  if (!itm) return DEFAULT_HANDLE_FALLBACK;
  const hs = itm.handleOffsetByStyle?.[style];
  if (hs) return hs;
  return itm.handleOffset ?? DEFAULT_HANDLE_FALLBACK;
}

/**
 * Findet den Trage-Stil:
 * 1) actor.carryStyleOverride (Job erzwingt Stil)
 * 2) items.items[itemKey].preferredStyles (erste gültige)
 * 3) "belly" als neutraler Default
 */
function resolveCarryStyle(actor, itemsAtlas){
  if (actor?.carryStyleOverride && CARRY_STYLES.includes(actor.carryStyleOverride)) return actor.carryStyleOverride;
  const key = actor?.carryItemKey;
  const itm = key && itemsAtlas?.items?.[key];
  const prefs = itm?.preferredStyles;
  if (Array.isArray(prefs)){
    for (const p of prefs) if (CARRY_STYLES.includes(p)) return p;
  }
  return "belly";
}

/** Liefert Z-Order-Regel "front"/"behind" abhängig von Richtung. */
function resolveZOrder(dir, porterAtlas, itemsAtlas){
  const p = porterAtlas?.zOrderCarry?.[dir];
  if (p) return p;
  const i = itemsAtlas?.directionOverrides?.carry?.[dir]?.zOrder;
  if (i) return i;
  return "front";
}

/** Frame-Index für Layout "Richtungen in Reihen" (N=0,E=1,S=2,W=3) */
function frameForDir(f, dir, framesPerRow){
  const row = ({N:0,E:1,S:2,W:3})[dir] ?? 2;
  return row * framesPerRow + f;
}

// ---------------------------------------------------------
// Klassen (Carry-Debug Overlay) — bestehend
// ---------------------------------------------------------

class CarryDebug {
  constructor(){ this.enabled = false; }
  toggle(){ this.enabled = !this.enabled; }
  drawAnchor(ctx, x, y){
    if (!this.enabled || !ctx) return;
    try{
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI*2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#00ffff";
      ctx.stroke();
      ctx.restore();
    }catch{}
  }
}
const carryDebug = new CarryDebug();

// ---------------------------------------------------------
// Hauptlogik (Carry-System) — bestehend
// ---------------------------------------------------------

/**
 * Hängt eine Draw-Funktion für das getragene Item in actor._drawQueue ein.
 * → Wird VOR bzw. NACH der Figur gezeichnet je nach Z-Order.
 *
 * Erwartet:
 * - actor: { pos:{x,y}, anim, frame, dir, carryItemKey, carryStyleOverride? }
 * - porterAtlas: geladene porter.json (Animations + attachPoints + zOrderCarry)
 * - itemsAtlas: geladene items.json (items + handleOffsetByStyle + directionOverrides)
 * - drawFrame(sheetName, frameIndex, x, y)
 * - drawImage(sheetName, x, y)
 */
export function attachQueueForActor(ctx, {actor, porterAtlas, itemsAtlas, drawFrame, drawImage}){
  const key = actor?.carryItemKey;
  if (!key) return;

  const animDef = porterAtlas?.animations?.[actor.anim];
  const frames = animDef?.frames ?? 1;
  const dir = actor?.dir ?? "S";
  const f = (actor?.frame ?? 0) % frames;

  // 1) Stil bestimmen
  const style = resolveCarryStyle(actor, itemsAtlas);

  // 2) Attach-Offset (Figur) & Handle-Offset (Item) holen
  const attaches = getAttachArray(porterAtlas, style, dir);
  const att = attaches?.[f] ?? DEFAULT_ATTACH_FALLBACK;
  const handle = getHandleOffset(itemsAtlas, key, style);

  // 3) Zielposition des Items
  const ix = actor.pos.x + att.x - handle.x;
  const iy = actor.pos.y + att.y - handle.y;

  // 4) Z-Order bestimmen
  const z = resolveZOrder(dir, porterAtlas, itemsAtlas);

  // 5) Draw-Funktion vormerken
  const drawFn = () => {
    // Erwartet sheet‑Name im Items‑Atlas‑Meta (legacy). Fallback: direkter Draw via drawImage(sheetName,...)
    drawImage(itemsAtlas.items[key].sheet, ix, iy);
    // Debug-Visualisierung: Attach-Punkt auf dem Figurenframe
    carryDebug.drawAnchor(ctx, actor.pos.x + att.x, actor.pos.y + att.y);
  };

  actor._drawQueue = actor._drawQueue || [];
  if (z === "behind") actor._drawQueue.unshift(drawFn);
  else actor._drawQueue.push(drawFn);
}

/**
 * Convenience-Renderer: zeichnet (optional) Item hinten → Figur → (optional) Item vorne.
 * Nutze ihn nur, wenn du KEINEN eigenen Actor-Drawpfad hast.
 */
export function drawActorWithCarry(ctx, {actor, porterAtlas, itemsAtlas, drawFrame, drawImage}){
  const animDef = porterAtlas.animations[actor.anim];
  const frames = animDef.frames;
  const dir = actor.dir || "S";
  const f = (actor.frame ?? 0) % frames;

  // 1) hinteres Item
  const z = resolveZOrder(dir, porterAtlas, itemsAtlas);
  if (actor.carryItemKey && z === "behind"){
    attachQueueForActor(ctx, {actor, porterAtlas, itemsAtlas, drawFrame, drawImage});
    while (actor._drawQueue?.length) (actor._drawQueue.shift())();
  }

  // 2) Figur
  const globalIndex = frameForDir(f, dir, frames);
  drawFrame(animDef.sheet, globalIndex, actor.pos.x, actor.pos.y);

  // 3) vorderes Item
  if (actor.carryItemKey && z !== "behind"){
    attachQueueForActor(ctx, {actor, porterAtlas, itemsAtlas, drawFrame, drawImage});
    while (actor._drawQueue?.length) (actor._drawQueue.shift())();
  }
}

// ---------------------------------------------------------
// NEU: Items‑Master‑Sprite Integration (Loader + Draw‑Helper)
// ↳ Kapselt das PNG/JSON‑Duo und stellt Canvas‑Draw bereit,
//   ohne dein bestehendes Carry‑System zu verändern.
// ---------------------------------------------------------

/** @type {ItemAtlas|null} */
let _itemsMaster = null;

/** Lädt die Items‑Master‑Sprite + Atlas einmalig (idempotent). */
export async function initItems({
  imagePath = DEFAULT_ITEMS_IMAGE_PATH,
  atlasPath = DEFAULT_ITEMS_ATLAS_PATH
} = {}){
  if (_itemsMaster) return _itemsMaster;
  _itemsMaster = await initItemsAtlas({ imagePath, atlasPath });
  return _itemsMaster;
}

/** Gibt die geladene ItemAtlas‑Instanz zurück (oder wirft). */
export function getItemsAtlas(){
  if (!_itemsMaster) throw new Error('Items‑Atlas ist noch nicht initialisiert. initItems() zuerst aufrufen.');
  return _itemsMaster;
}

/** True/False ob ein Item‑Key (oder Alias) existiert. */
export function hasItem(key){
  return !!_itemsMaster && _itemsMaster.has(resolveItemKey(key));
}

/** Zeichnet ein Item direkt (Canvas 2D). */
export function drawItem(ctx, key, x, y, opt){
  const m = getItemsAtlas();
  m.draw(ctx, key, x, y, opt);
}

// ---------------------------------------------------------
// Exports (Default-Bündel + named Exports) — bestehend + neu
// ---------------------------------------------------------

const Assets = {
  setupHiDPICanvas,
  imageRenderingCrisp,
  imageRenderingSmooth,
  ensure2DContext,
  loadJSON,
  loadImage,
  AssetManager,

  // Carry‑API
  attachQueueForActor,
  drawActorWithCarry,
  carryDebug,
  CARRY_STYLES,

  // ➕ Items‑API
  initItems,
  getItemsAtlas,
  hasItem,
  drawItem,
};

export default Assets;

// Named Exports für gezielten Import
export { CARRY_STYLES, carryDebug };
