/* ================================================================================================
   tools/map-runtime.js — Tile/Atlas-Renderer (robuste Version)
   - Base-URL aware (alle Pfade relativ zum Speicherort der Map)
   - Guards gegen fehlende/ungültige Pfade (kein new URL auf undefined)
   ================================================================================================ */

const DEFAULT_TILE = 64;
const DEFAULT_FPS  = 6;

/** Versucht eine URL relativ zu 'base' zu erzeugen. Liefert null, wenn 'u' fehlt/ungültig. */
function ensureUrl(u, base){
  if (!u || typeof u !== 'string') return null;
  try { return new URL(u, base || document.baseURI).href; }
  catch { return null; }
}

export async function loadJSON(u){
  if (!u) throw new Error('loadJSON: URL fehlt/undefined');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
  return await res.json();
}

export async function loadImage(u){
  if (!u) throw new Error('loadImage: URL fehlt/undefined');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
  const b = await res.blob();
  if ('createImageBitmap' in self) return await createImageBitmap(b,{imageOrientation:'from-image',premultiplyAlpha:'none'});
  return await new Promise((ok,err)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=err; i.src=URL.createObjectURL(b); });
}

function splitNumericSuffix(key){ const m=/^(.+)_([0-9]+)$/.exec(key); return m?{base:m[1],i:parseInt(m[2],10)}:null; }
function currentFrameKey(atlas, base, elapsedMs){
  if (!atlas) return base;
  const anim = atlas.animations && atlas.animations[base];
  if (anim && Array.isArray(anim.frames) && anim.frames.length){
    const fps=anim.fps||DEFAULT_FPS, i=Math.floor((elapsedMs/1000)*fps)%anim.frames.length;
    return anim.frames[i];
  }
  const pref=base+'_', frames=[];
  for(const k of Object.keys(atlas.frames||{})){ if(k.startsWith(pref)){ const s=splitNumericSuffix(k); if(s) frames.push({k,i:s.i}); } }
  if(frames.length){ frames.sort((a,b)=>a.i-b.i); const i=Math.floor((elapsedMs/1000)*DEFAULT_FPS)%frames.length; return frames[i].k; }
  return base;
}

function drawTileFromAtlas(ctx, atlas, img, baseOrKey, dx, dy, size, elapsedMs=0){
  if(!atlas || !img || !baseOrKey) return;
  const key = currentFrameKey(atlas, baseOrKey, elapsedMs);
  const f = atlas.frames && atlas.frames[key]; if(!f) return;
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(size)||size<=0) return;
  ctx.drawImage(img, f.x,f.y,f.w,f.h, dx,dy, size,size);
}

export class SiedlerMap{
  /**
   * @param {{ tileResolver?:(n:string)=>string, onReady?:()=>void, dbg?:(m:string,e?:string)=>void, baseUrl?:string }} opts
   */
  constructor(opts={}){
    this.tileResolver = opts.tileResolver || (n=>n);
    this.onReady = opts.onReady || (()=>{});
    this.dbg = typeof opts.dbg==='function' ? opts.dbg : null;
    this.baseUrl = opts.baseUrl || document.baseURI;

    this.atlas=null; this.atlasImage=null;
    this.tileSize=DEFAULT_TILE; this.width=0; this.height=0;
    this.layers=null; this.background='#000';
  }

  attachAtlas(atlasJson, atlasImage){
    this.atlas = atlasJson || null;
    this.atlasImage = atlasImage || null;
    if(this.atlas?.meta?.tileSize) this.tileSize = (this.atlas.meta.tileSize|0) || this.tileSize;
  }

  /**
   * Lädt Map aus Objekt. Pfade relativ zu this.baseUrl (Ordner der Map-Datei).
   * @param {any} worldObj
   * @param {{baseUrl?:string}} [opts]
   */
  async loadFromObject(worldObj={}, opts={}){
    if(opts.baseUrl) this.baseUrl = opts.baseUrl;

    // Basiswerte
    this.tileSize = (worldObj.tileSize|0) || this.tileSize;
    this.background = worldObj.background || this.background;
    const layers = Array.isArray(worldObj.layers) ? worldObj.layers : [];
    this.layers = layers;

    // Größe
    const firstGrid = layers.find(l=>Array.isArray(l.grid))?.grid;
    if (firstGrid){
      this.height = firstGrid.length;
      this.width  = firstGrid[0]?.length || 0;
    }

    // Atlas laden (robust)
    if(!this.atlas && worldObj.atlas){
      const a = worldObj.atlas;
      const jsonUrl  = ensureUrl(a.json,  this.baseUrl);
      const imageUrl = ensureUrl(a.image, this.baseUrl);

      if(!jsonUrl)  this.dbg?.('Atlas-JSON-Pfad fehlt/ungültig — überspringe Atlas.');
      if(!imageUrl) this.dbg?.('Atlas-IMAGE-Pfad fehlt/ungültig — überspringe Atlas.');

      if(jsonUrl && imageUrl){
        const atlasJson = await loadJSON(jsonUrl);
        const atlasImg  = await loadImage(imageUrl);
        this.attachAtlas(atlasJson, atlasImg);
      }
    }

    try{ this.onReady(); }catch(e){ console.error('SiedlerMap.onReady Fehler:', e); }
  }

  draw(ctx, view, elapsedMs=0){
    if(!ctx) return;
    const t=this.tileSize||DEFAULT_TILE;

    const vx=(view?.x|0)||0, vy=(view?.y|0)||0;
    const vw=(view?.w|0)||ctx.canvas.width, vh=(view?.h|0)||ctx.canvas.height;
    const zoom=(Number.isFinite(view?.zoom)&&view.zoom>0)?view.zoom:1;

    const vwWorld=vw/zoom, vhWorld=vh/zoom;
    const minTX=Math.max(0, Math.floor(vx/t));
    const minTY=Math.max(0, Math.floor(vy/t));
    const maxTX=Math.ceil((vx+vwWorld)/t)+1;
    const maxTY=Math.ceil((vy+vhWorld)/t)+1;

    const layers=this.layers||[];
    if(this.background){ ctx.save(); ctx.fillStyle=this.background; ctx.fillRect(0,0,vw,vh); ctx.restore(); }

    for(const layer of layers){
      const grid=layer.grid; if(!Array.isArray(grid)) continue;
      for(let ty=minTY; ty<Math.min(this.height||grid.length, maxTY); ty++){
        const row=grid[ty]; if(!row) continue;
        for(let tx=minTX; tx<Math.min(this.width||row.length, maxTX); tx++){
          const name=row[tx]; if(!name) continue;
          const worldX=tx*t, worldY=ty*t;
          const dx=Math.floor((worldX - vx)*zoom), dy=Math.floor((worldY - vy)*zoom), size=Math.ceil(t*zoom);
          drawTileFromAtlas(ctx, this.atlas, this.atlasImage, name, dx, dy, size, elapsedMs);
        }
      }
    }
  }
}
