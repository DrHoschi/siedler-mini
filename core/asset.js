/* ================================================================================================
   Siedler‑Mini V14.7‑hf2 — core/asset.js
   Zweck: Kleine, robuste Helfer rund um Canvas, Loading & Assets.
   Enthält u. a. imageRenderingCrisp(), ensure2DContext(), simple Loader, kleinen AssetManager.
   Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
   ================================================================================================ */

const IMG_RENDER_PIXELATED = 'pixelated';   // gut unterstützt (inkl. Safari/iOS)
const IMG_RENDER_AUTO      = 'auto';

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
  const w = width  ?? (innerWidth || document.documentElement.clientWidth  || cv.clientWidth  || 800);
  const h = height ?? (innerHeight|| document.documentElement.clientHeight || cv.clientHeight || 600);
  cv.width  = Math.floor(w * dpr);
  cv.height = Math.floor(h * dpr);
  cv.style.width  = w + 'px';
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
    const img = new Image(); img.onload=()=>resolve(img); img.onerror=reject;
    img.src = URL.createObjectURL(blob);
  });
}

/** Sehr einfacher Asset‑Manager (Cache + Basis‑Pfad). */
export class AssetManager{
  constructor({ base = './assets/' } = {}){ this.base = base; this.cache = new Map(); }
  async getImage(name){
    if(this.cache.has(name)) return this.cache.get(name);
    const img = await loadImage(this.base + name);
    this.cache.set(name, img);
    return img;
  }
  async warmup(){ /* optionaler Preload‑Hook */ }
}

/** Export‑Bündel (Default + named). */
const Assets = {
  setupHiDPICanvas,
  imageRenderingCrisp,
  imageRenderingSmooth,
  ensure2DContext,
  loadJSON,
  loadImage,
  AssetManager,
};
export default Assets;
