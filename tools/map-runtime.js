/* ================================================================================================
   tools/map-runtime.js — Tile/Atlas-Renderer
   NEU:
     • loadFromObject(world, { baseUrl }) löst relative Pfade (atlas.json / atlas.image)
       zuverlässig relativ zum Speicherort der Map-Aufruf-URL auf.
     • Guards verhindern fetch(undefined) und loggen klare Meldungen.
   ================================================================================================ */

const DEFAULT_TILE = 64;
const DEFAULT_FPS  = 6;

function ensureUrl(u, base){
  if(!u) return null;
  try{ return new URL(u, base || document.baseURI).href; }
  catch{ return null; }
}

export async function loadJSON(u){
  if(!u) throw new Error('loadJSON: URL fehlt/undefined');
  const res = await fetch(u);
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
  return await res.json();
}

export async function loadImage(u){
  if(u && (u instanceof ImageBitmap || (typeof HTMLImageElement!=='undefined' && u instanceof HTMLImageElement))) return u;
  if(!u) throw new Error('loadImage: URL fehlt/undefined');
  const res = await fetch(u);
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
  const b = await res.blob();
  if('createImageBitmap' in self) return await createImageBitmap(b,{imageOrientation:'from-image',premultiplyAlpha:'none'});
  return await new Promise((resv,rej)=>{ const i=new Image(); i.onload=()=>resv(i); i.onerror=rej; i.src=URL.createObjectURL(b); });
}

export function resolveAlias(atlas, name){ if(!atlas||!name) return name; return (atlas.aliases||{})[name] || name; }
function splitNumericSuffix(key){ const m=/^(.+)_([0-9]+)$/.exec(key); return m?{base:m[1], index:parseInt(m[2],10)}:null; }
export function currentFrameKey(atlas, baseName, elapsedMs){
  if(!atlas) return baseName;
  const anim = atlas.animations && atlas.animations[baseName];
  if(anim && Array.isArray(anim.frames) && anim.frames.length){
    const fps=anim.fps||DEFAULT_FPS; const i=Math.floor((elapsedMs/1000)*fps)%anim.frames.length; return anim.frames[i];
  }
  const frames=[], pref=baseName+'_';
  for(const k of Object.keys(atlas.frames||{})){ if(k.startsWith(pref)){ const s=splitNumericSuffix(k); if(s) frames.push({k,i:s.index}); } }
  if(frames.length){ frames.sort((a,b)=>a.i-b.i); const fps=DEFAULT_FPS; const i=Math.floor((elapsedMs/1000)*fps)%frames.length; return frames[i].k; }
  return baseName;
}

function drawTileFromAtlas(ctx, atlas, img, baseOrKey, dx, dy, size, elapsedMs=0){
  if(!atlas||!img||!baseOrKey) return;
  const resolved=resolveAlias(atlas, baseOrKey); const key=currentFrameKey(atlas, resolved, elapsedMs);
  const f=atlas.frames && atlas.frames[key]; if(!f) return;
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(size)||size<=0){ console.warn('drawTileFromAtlas: invalid draw rect', {dx,dy,size,key}); return; }
  ctx.drawImage(img, f.x,f.y,f.w,f.h, dx,dy, size,size);
}

export class SiedlerMap{
  /**
   * @param {{ tileResolver?:(n:string)=>string, onReady?:()=>void, dbg?:(msg:string,extra?:string)=>void, baseUrl?:string }} opts
   */
  constructor(opts={}){
    this.tileResolver = opts.tileResolver || (n=>n);
    this.onReady = opts.onReady || (()=>{});
    this.dbg = typeof opts.dbg==='function' ? opts.dbg : null;

    this.baseUrl = opts.baseUrl || document.baseURI; // Basis für relative Pfade

    this.atlas = null; this.atlasImage = null;
    this.tileSize = DEFAULT_TILE;
    this.width=0; this.height=0;
    this.tiles=null; this.layers=null;
    this.background='#000000';
  }

  attachAtlas(atlasJson, atlasImage){
    this.atlas = atlasJson || null;
    this.atlasImage = atlasImage || null;
    if(this.atlas?.meta?.tileSize){ this.tileSize = (this.atlas.meta.tileSize|0) || this.tileSize; }
  }

  /**
   * Lädt Map aus Objekt.
   * @param {any} worldObj
   * @param {{baseUrl?:string}} [opts]
   */
  async loadFromObject(worldObj={}, opts={}){
    // Basis-URL ggf. aktualisieren (Ordner der Map-Datei)
    if(opts.baseUrl) this.baseUrl = opts.baseUrl;

    this.tileSize = (worldObj.tileSize|0) || this.tileSize;
    this.width  = (worldObj.width |0) || this.width  || (worldObj.tiles ? (worldObj.tiles[0]?.length || 0) : 0);
    this.height = (worldObj.height|0) || this.height || (worldObj.tiles ? worldObj.tiles.length : 0);
    this.tiles  = Array.isArray(worldObj.tiles)  ? worldObj.tiles  : null;
    this.layers = Array.isArray(worldObj.layers) ? worldObj.layers : (this.tiles ? [{tiles:this.tiles,visible:true}] : null);
    if(worldObj.background) this.background = worldObj.background;

    // Atlas laden (robust + baseUrl-aware)
    if(!this.atlas && worldObj.atlas){
      const jsonUrl  = ensureUrl(worldObj.atlas.json,  this.baseUrl);
      const imageUrl = ensureUrl(worldObj.atlas.image, this.baseUrl);

      if(!jsonUrl){ this.dbg?.('Atlas-JSON-Pfad fehlt/ungültig — überspringe Atlas.'); }
      if(!imageUrl){ this.dbg?.('Atlas-IMAGE-Pfad fehlt/ungültig — überspringe Atlas.'); }

      if(jsonUrl && imageUrl){
        const atlasJson = await loadJSON(jsonUrl);
        const atlasImg  = await loadImage(imageUrl);
        this.attachAtlas(atlasJson, atlasImg);
      }
    }

    if(this.atlas?.meta?.tileSize){ this.tileSize = (this.atlas.meta.tileSize|0) || this.tileSize; }

    try{ this.onReady(); }catch(e){ console.error('SiedlerMap.onReady Fehler:', e); }
  }

  draw(ctx, view, elapsedMs=0){
    if(!ctx) return;
    const t=this.tileSize||DEFAULT_TILE;

    const vx=(view?.x|0)||0, vy=(view?.y|0)||0;
    const vw_screen=(view?.w|0)||ctx.canvas.width, vh_screen=(view?.h|0)||ctx.canvas.height;
    const zoom=(Number.isFinite(view?.zoom)&&view.zoom>0)?view.zoom:1;

    const vw_world=vw_screen/zoom, vh_world=vh_screen/zoom;

    const minTX=Math.max(0, Math.floor(vx/t));
    const minTY=Math.max(0, Math.floor(vy/t));
    const maxTX=Math.min(this.width,  Math.ceil((vx+vw_world)/t)+1);
    const maxTY=Math.min(this.height, Math.ceil((vy+vh_world)/t)+1);

    if(this.background){ ctx.save(); ctx.fillStyle=this.background; ctx.fillRect(0,0,vw_screen,vh_screen); ctx.restore(); }

    const layers=this.layers||[];
    for(const layer of layers){
      if(layer.visible===false) continue;
      const grid=layer.tiles; if(!Array.isArray(grid)) continue;
      for(let ty=minTY; ty<maxTY; ty++){
        const row=grid[ty]; if(!row) continue;
        for(let tx=minTX; tx<maxTX; tx++){
          const name=row[tx]; if(!name) continue;
          const worldX=tx*t, worldY=ty*t;
          const dx=Math.floor((worldX - vx)*zoom), dy=Math.floor((worldY - vy)*zoom), size=Math.ceil(t*zoom);
          drawTileFromAtlas(ctx, this.atlas, this.atlasImage, name, dx, dy, size, elapsedMs);
        }
      }
    }
  }
}
