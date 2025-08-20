/* tools/map-runtime.js — Tile/Atlas-Renderer mit Alias & Animation */

const DEFAULT_TILE=64, DEFAULT_FPS=6;

async function loadJSON(v){ if(typeof v==='object' && v) return v; const r=await fetch(v); if(!r.ok) throw new Error(`HTTP ${r.status} for ${v}`); return await r.json(); }
async function loadImage(src){
  if(src && (src instanceof ImageBitmap || (typeof HTMLImageElement!=='undefined' && src instanceof HTMLImageElement))) return src;
  const r=await fetch(src); if(!r.ok) throw new Error(`HTTP ${r.status} for ${src}`); const b=await r.blob();
  if('createImageBitmap' in self) return await createImageBitmap(b,{imageOrientation:'from-image',premultiplyAlpha:'none'});
  return await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(b); });
}
function resolveAlias(atlas,name){ if(!atlas||!name) return name; return (atlas.aliases||{})[name] || name; }
function splitNumericSuffix(key){ const m=/^(.+)_([0-9]+)$/.exec(key); return m?{base:m[1],index:parseInt(m[2],10)}:null; }
function currentFrameKey(atlas, base, elapsedMs){
  if(!atlas) return base;
  const anim=atlas.animations && atlas.animations[base];
  if(anim && Array.isArray(anim.frames) && anim.frames.length){ const fps=anim.fps||DEFAULT_FPS; const i=Math.floor((elapsedMs/1000)*fps)%anim.frames.length; return anim.frames[i]; }
  const frames=[]; const keys=Object.keys(atlas.frames||{}); const pref=base+'_';
  for(const k of keys){ if(k.startsWith(pref)){ const s=splitNumericSuffix(k); if(s) frames.push({k,i:s.index}); } }
  if(frames.length){ frames.sort((a,b)=>a.i-b.i); const fps=DEFAULT_FPS; const i=Math.floor((elapsedMs/1000)*fps)%frames.length; return frames[i].k; }
  return base;
}
function drawTileFromAtlas(ctx, atlas, img, baseOrKey, dx, dy, size, elapsedMs=0){
  if(!atlas||!img||!baseOrKey) return;
  const resolved=resolveAlias(atlas, baseOrKey); const key=currentFrameKey(atlas, resolved, elapsedMs);
  const f=atlas.frames && atlas.frames[key]; if(!f) return;
  // Guard gegen ungültige Maße/NaN (behebt „string did not match…“/DOMMatrix Fehler)
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(size)||size<=0){ console.warn('drawTileFromAtlas: invalid draw rect', {dx,dy,size,key}); return; }
  ctx.drawImage(img, f.x,f.y,f.w,f.h, dx,dy, size,size);
}

export class SiedlerMap{
  constructor(opts={}){
    this.tileResolver=opts.tileResolver||(n=>n); this.onReady=opts.onReady||(()=>{});
    this.atlas=null; this.atlasImage=null; this.tileSize=DEFAULT_TILE;
    this.width=0; this.height=0; this.tiles=null; this.layers=null; this.background='#000000';
  }
  attachAtlas(atlasJson, atlasImage){ this.atlas=atlasJson||null; this.atlasImage=atlasImage||null;
    if(this.atlas && this.atlas.meta && this.atlas.meta.tileSize){ this.tileSize=(this.atlas.meta.tileSize|0)||this.tileSize; } }
  async loadFromObject(world={}){
    this.tileSize=(world.tileSize|0)||this.tileSize;
    this.width=(world.width|0)||this.width||(world.tiles?(world.tiles[0]?.length||0):0);
    this.height=(world.height|0)||this.height||(world.tiles?world.tiles.length:0);
    this.tiles=Array.isArray(world.tiles)?world.tiles:null;
    this.layers=Array.isArray(world.layers)?world.layers:(this.tiles?[{tiles:this.tiles,visible:true}]:null);
    if(world.background) this.background=world.background;

    if(!this.atlas && world.atlas){
      const atlasJson=await loadJSON(world.atlas.json);
      const atlasImg =await loadImage(world.atlas.image);
      this.attachAtlas(atlasJson, atlasImg);
    }
    if(this.atlas && this.atlas.meta && this.atlas.meta.tileSize){ this.tileSize=(this.atlas.meta.tileSize|0)||this.tileSize; }
    try{ this.onReady(); }catch(e){ console.error('SiedlerMap.onReady Fehler:', e); }
  }
  draw(ctx, view, elapsedMs=0){
    if(!ctx) return;
    const t=this.tileSize||DEFAULT_TILE;
    const vx=(view?.x|0)||0, vy=(view?.y|0)||0;
    const vw_screen=(view?.w|0)||ctx.canvas.width, vh_screen=(view?.h|0)||ctx.canvas.height;
    const zoom=(Number.isFinite(view?.zoom)&&view.zoom>0)?view.zoom:1;
    const vw_world=vw_screen/zoom, vh_world=vh_screen/zoom;

    const minTX=Math.max(0, Math.floor(vx/t)), minTY=Math.max(0, Math.floor(vy/t));
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

export { loadJSON, loadImage, resolveAlias, currentFrameKey };
