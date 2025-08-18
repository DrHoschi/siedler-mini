// map-runtime.js (ES Module) — Siedler 2020
// Lädt JSON aus dem PRO-Editor, lädt Tiles, rendert Layer, stellt Kollision/Meta bereit.

export class SiedlerMap {
  constructor(opts={}){
    this.tileSize = 32;
    this.mapW = 0;
    this.mapH = 0;
    this.layers = [];   // {name, visible, data:Int32Array}
    this.tiles = [];    // {name, img:HTMLImageElement}
    this.collisions = new Uint8Array(0);
    this.meta = {};     // { index:string -> object }
    this.stamps = [];   // optional
    this.camera = { x:0, y:0, zoom:1 };
    this.onReady = opts.onReady || (()=>{});
    this.onProgress = opts.onProgress || (()=>{});
    this._tileResolver = opts.tileResolver || ((name)=>name); // map name->URL
  }

  async loadFromObject(json){
    this.tileSize = json.tileSize ?? 32;
    this.mapW = json.mapW|0;
    this.mapH = json.mapH|0;
    this.layers = (json.layers||[]).map(L=>({ name:String(L.name||''), visible:!!L.visible, data:Int32Array.from(L.data||[]) }));
    this.collisions = Uint8Array.from(json.collisions||new Array(this.mapW*this.mapH).fill(0));
    this.meta = json.meta||{};
    this.stamps = (json.stamps||[]).map(s=>({ w:s.w|0, h:s.h|0, data:Int32Array.from(s.data||[]) }));

    const tileNames = (json.tiles||[]).map(t=>t.name);
    this.tiles = new Array(tileNames.length);
    let done=0;
    await Promise.all(tileNames.map((name, i)=> new Promise((resolve)=>{
      const url = this._tileResolver(name);
      const img = new Image();
      img.onload = ()=>{ this.tiles[i] = {name, img}; done++; this.onProgress(done, tileNames.length); resolve(); };
      img.onerror = ()=>{ console.warn('Tile failed to load', name, url); this.tiles[i] = {name, img:null}; done++; this.onProgress(done, tileNames.length); resolve(); };
      img.src = url;
    })));
    this.onReady();
  }

  index(x,y){ return y*this.mapW + x; }
  inBounds(x,y){ return x>=0 && y>=0 && x<this.mapW && y<this.mapH; }

  isBlocked(x,y){ if(!this.inBounds(x,y)) return true; return !!this.collisions[this.index(x,y)]; }
  getMeta(x,y){ return this.meta[String(this.index(x,y))] || null; }
  getTile(layerIndex, x,y){
    const L = this.layers[layerIndex]; if(!L) return -1;
    return L.data[this.index(x,y)] ?? -1;
  }
  setTile(layerIndex, x,y, v){
    const L = this.layers[layerIndex]; if(!L) return;
    if(this.inBounds(x,y)) L.data[this.index(x,y)] = v;
  }

  draw(ctx, view={x:0,y:0,w:0,h:0}, options={}){
    const cam = this.camera;
    const ts = this.tileSize * cam.zoom;
    const startX = Math.floor((view.x - cam.x)/ts);
    const startY = Math.floor((view.y - cam.y)/ts);
    const endX = Math.ceil((view.x + view.w - cam.x)/ts);
    const endY = Math.ceil((view.y + view.h - cam.y)/ts);
    ctx.save();
    if(options.clear!==false){ ctx.clearRect(0,0,view.w,view.h); }
    for(let li=0; li<this.layers.length; li++){
      const L = this.layers[li];
      if(!L.visible) continue;
      for(let y=startY; y<endY; y++){
        if(y<0||y>=this.mapH) continue;
        for(let x=startX; x<endX; x++){
          if(x<0||x>=this.mapW) continue;
          const v = L.data[this.index(x,y)];
          if(v>=0){
            const t = this.tiles[v];
            if(t && t.img){
              const sx = cam.x + x*ts;
              const sy = cam.y + y*ts;
              ctx.drawImage(t.img, sx, sy, ts, ts);
            }
          }
        }
      }
    }
    if(options.drawCollisions){
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ff5757';
      for(let y=startY; y<endY; y++){
        if(y<0||y>=this.mapH) continue;
        for(let x=startX; x<endX; x++){
          if(x<0||x>=this.mapW) continue;
          if(this.collisions[this.index(x,y)]){
            const sx = cam.x + x*ts;
            const sy = cam.y + y*ts;
            ctx.fillRect(sx, sy, ts, ts);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
