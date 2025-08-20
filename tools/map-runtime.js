/* ================================================================================================
   tools/map-runtime.js — minimalistischer Tile/Atlas‑Renderer
   Features:
     • Atlas (frames, aliases, animations), implizite Frames name_0..n
     • Mehrere Layer, Hintergrundfarbe, Zoom‑Culling
     • drawImage‑Guard (verhindert „string did not match…“/DOMMatrix‑Fehler bei NaN/negativen Größen)
   Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
   ================================================================================================ */

const DEFAULT_TILE = 64;
const DEFAULT_FPS  = 6;

// — Loader‑Helpers —
export async function loadJSON(v){
  if(typeof v==='object' && v) return v;
  const res = await fetch(v);
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${v}`);
  return await res.json();
}
export async function loadImage(src){
  if(src && (src instanceof ImageBitmap || (typeof HTMLImageElement!=='undefined' && src instanceof HTMLImageElement)))
    return src;
  const res = await fetch(src);
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${src}`);
  const blob = await res.blob();
  if('createImageBitmap' in self) return await createImageBitmap(blob,{imageOrientation:'from-image',premultiplyAlpha:'none'});
  return await new Promise((resolve,reject)=>{
    const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=URL.createObjectURL(blob);
  });
}

// — Atlas‑Helpers —
export function resolveAlias(atlas, name){ if(!atlas||!name) return name; return (atlas.aliases||{})[name] || name; }
function splitNumericSuffix(key){ const m=/^(.+)_([0-9]+)$/.exec(key); return m?{base:m[1], index:parseInt(m[2],10)}:null; }
export function currentFrameKey(atlas, baseName, elapsedMs){
  if(!atlas) return baseName;
  const anim = atlas.animations && atlas.animations[baseName];
  if(anim && Array.isArray(anim.frames) && anim.frames.length){
    const fps = anim.fps || DEFAULT_FPS;
    const idx = Math.floor((elapsedMs/1000) * fps) % anim.frames.length;
    return anim.frames[idx];
  }
  const frames=[]; const keys=Object.keys(atlas.frames||{}); const pref=baseName+'_';
  for(const k of keys){ if(k.startsWith(pref)){ const s=splitNumericSuffix(k); if(s) frames.push({k,i:s.index}); } }
  if(frames.length){
    frames.sort((a,b)=>a.i-b.i);
    const fps=DEFAULT_FPS; const idx=Math.floor((elapsedMs/1000)*fps)%frames.length;
    return frames[idx].k;
  }
  return baseName;
}

/** Sicheres Zeichnen eines (ggf. animierten) Frames aus dem Atlas. */
function drawTileFromAtlas(ctx, atlas, atlasImage, baseOrKey, dx, dy, size, elapsedMs=0){
  if(!atlas || !atlasImage || !baseOrKey) return;
  const resolved = resolveAlias(atlas, baseOrKey);
  const key = currentFrameKey(atlas, resolved, elapsedMs);
  const f = atlas.frames && atlas.frames[key]; if(!f) return;

  // GUARD: ungültige Maße vermeiden (behebt DOMMatrix/SyntaxError in Canvas)
  if(!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(size) || size <= 0){
    console.warn('drawTileFromAtlas: invalid draw rect', {dx,dy,size,key});
    return;
  }
  ctx.drawImage(atlasImage, f.x, f.y, f.w, f.h, dx, dy, size, size);
}

// — Map‑Klasse —
export class SiedlerMap{
  /**
   * @param {{ tileResolver?:(n:string)=>string, onReady?:()=>void }} opts
   */
  constructor(opts = {}){
    this.tileResolver = opts.tileResolver || (n=>n);
    this.onReady = opts.onReady || (()=>{});

    this.atlas = null;
    this.atlasImage = null;

    this.tileSize = DEFAULT_TILE;
    this.width = 0; this.height = 0;

    this.tiles = null;    // einfacher Modus
    this.layers = null;   // {tiles,visible}[]

    this.background = '#000000';
  }

  /** Optional bereits geladenen Atlas anheften. */
  attachAtlas(atlasJson, atlasImage){
    this.atlas = atlasJson || null;
    this.atlasImage = atlasImage || null;
    if(this.atlas && this.atlas.meta && this.atlas.meta.tileSize){
      this.tileSize = (this.atlas.meta.tileSize|0) || this.tileSize;
    }
  }

  /** Welt/Map aus einem Objekt laden. */
  async loadFromObject(worldObj = {}){
    // Grundwerte
    this.tileSize = (worldObj.tileSize|0) || this.tileSize;

    this.width  = (worldObj.width |0) || this.width  || (worldObj.tiles ? (worldObj.tiles[0]?.length || 0) : 0);
    this.height = (worldObj.height|0) || this.height || (worldObj.tiles ? worldObj.tiles.length : 0);

    this.tiles  = Array.isArray(worldObj.tiles)  ? worldObj.tiles  : null;
    this.layers = Array.isArray(worldObj.layers) ? worldObj.layers : (this.tiles ? [{ tiles:this.tiles, visible:true }] : null);

    if (worldObj.background) this.background = worldObj.background;

    // Atlas laden (falls nötig)
    if(!this.atlas && worldObj.atlas){
      const atlasJson = await loadJSON(worldObj.atlas.json);
      const atlasImg  = await loadImage(worldObj.atlas.image);
      this.attachAtlas(atlasJson, atlasImg);
    }
    if(this.atlas && this.atlas.meta && this.atlas.meta.tileSize){
      this.tileSize = (this.atlas.meta.tileSize|0) || this.tileSize;
    }

    // Ready-Callback
    try{ this.onReady(); }catch(e){ console.error('SiedlerMap.onReady Fehler:', e); }
  }

  /**
   * Karte zeichnen.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x:number,y:number,w:number,h:number,zoom?:number}} view  Welt‑Koordinaten + Zoom
   * @param {number} elapsedMs  Laufzeit‑Millis für Animationen
   */
  draw(ctx, view, elapsedMs = 0){
    if(!ctx) return;
    const t = this.tileSize || DEFAULT_TILE;

    // View + Zoom
    const vx = (view?.x|0) || 0;
    const vy = (view?.y|0) || 0;
    const vw_screen = (view?.w|0) || ctx.canvas.width;
    const vh_screen = (view?.h|0) || ctx.canvas.height;
    const zoom = (Number.isFinite(view?.zoom) && view.zoom>0) ? view.zoom : 1;

    // Für Culling Bildschirm‑→Weltgröße
    const vw_world = vw_screen/zoom;
    const vh_world = vh_screen/zoom;

    // Sichtbarer Tile‑Bereich
    const minTX = Math.max(0, Math.floor(vx / t));
    const minTY = Math.max(0, Math.floor(vy / t));
    const maxTX = Math.min(this.width,  Math.ceil((vx + vw_world) / t) + 1);
    const maxTY = Math.min(this.height, Math.ceil((vy + vh_world) / t) + 1);

    // Hintergrund (Screen‑Space)
    if (this.background){
      ctx.save(); ctx.fillStyle=this.background; ctx.fillRect(0,0,vw_screen,vh_screen); ctx.restore();
    }

    // Layer zeichnen
    const layers = this.layers || [];
    for (const layer of layers){
      if (layer.visible === false) continue;
      const grid = layer.tiles;
      if (!Array.isArray(grid)) continue;

      for (let ty=minTY; ty<maxTY; ty++){
        const row = grid[ty]; if(!row) continue;
        for (let tx=minTX; tx<maxTX; tx++){
          const name = row[tx]; if(!name) continue;

          // Welt→Screen
          const worldX = tx * t, worldY = ty * t;
          const dx = Math.floor((worldX - vx) * zoom);
          const dy = Math.floor((worldY - vy) * zoom);
          const size = Math.ceil(t * zoom);

          drawTileFromAtlas(ctx, this.atlas, this.atlasImage, name, dx, dy, size, elapsedMs);
        }
      }
    }
  }
}
