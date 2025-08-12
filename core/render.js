// core/render.js — V13.7
export class Camera {
  constructor(){
    this.x=0; this.y=0; this.zoom=1; this.tile=64;
  }
  setCenter(x,y){ this.x=x; this.y=y; }
  setZoom(z){ this.zoom=Math.max(0.35, Math.min(2.8, z)); }
  worldToScreen(wx,wy,w,h){
    const s=this.tile*this.zoom, cx=w*0.5, cy=h*0.5;
    const ix=(wx-wy)*s, iy=(wx+wy)*s*0.5;
    return {x:cx+ix, y:cy+iy};
  }
  screenToWorld(px,py,w,h){
    const s=this.tile*this.zoom, cx=w*0.5, cy=h*0.5;
    const dx=(px-cx)/s, dy=(py-cy)/(s*0.5);
    // isoX = (wx - wy) = dx, isoY = (wx + wy) = dy  => löse:
    const wx = (dx + dy)*0.5 + this.x;
    const wy = (dy - dx)*0.5 + this.y;
    return {x:wx, y:wy};
  }
}

export class Renderer{
  constructor(canvas){
    this.cv=canvas; this.ctx=canvas.getContext('2d');
    this.cam=new Camera();
    this.images={}; this.map=null; this.buildings=[]; this.roads=new Set();
    this.carriers=[]; // {x,y,px,py,frame}
    this._raf=0;
    this._resize=this._resize.bind(this); this._loop=this._loop.bind(this);
    addEventListener('resize', this._resize, {passive:true});
    this._resize();
  }
  attachAssets(imgs){ this.images=imgs||{}; }
  attachMap(map){ this.map=map; }
  attachBuildings(arr){ this.buildings=arr; }
  attachRoads(set){ this.roads=set; }
  attachCarriers(arr){ this.carriers=arr; }
  _resize(){
    const dpr=Math.max(1, devicePixelRatio||1);
    const w=innerWidth|0, h=innerHeight|0;
    if (this.cv.width!==w*dpr || this.cv.height!==h*dpr){
      this.cv.width=w*dpr; this.cv.height=h*dpr; this.cv.style.width=w+'px'; this.cv.style.height=h+'px';
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }
  }
  start(){ cancelAnimationFrame(this._raf); this._raf=requestAnimationFrame(this._loop); }
  stop(){ cancelAnimationFrame(this._raf); this._raf=0; }
  clear(){ this.ctx.fillStyle='#0c1117'; this.ctx.fillRect(0,0,this.cv.width,this.cv.height); }

  _visibleBounds(){
    const s=this.cam.tile*this.cam.zoom, w=this.cv.width, h=this.cv.height;
    const tilesX=Math.ceil(w/s)+6, tilesY=Math.ceil(h/(s*0.5))+6;
    return {tilesX,tilesY};
  }

  drawTiles(){
    if(!this.map) return;
    const {ctx,cv,cam,map}=this;
    const {tilesX,tilesY} = this._visibleBounds();
    const cx=Math.floor(cam.x), cy=Math.floor(cam.y);
    const minX=Math.max(0,cx-tilesX), maxX=Math.min(map.w-1,cx+tilesX);
    const minY=Math.max(0,cy-tilesY), maxY=Math.min(map.h-1,cy+tilesY);
    for(let y=minY;y<=maxY;y++){
      for(let x=minX;x<=maxX;x++){
        const t=map.tiles[y][x];
        const pos=cam.worldToScreen(x,y,cv.width,cv.height);
        const img=this.images[t];
        if(img && img.complete){
          const base=128; const s=cam.tile*cam.zoom;
          const sc=s/base, w=img.naturalWidth*sc, h=img.naturalHeight*sc;
          this.ctx.drawImage(img, pos.x-w*0.5, pos.y-h*0.75, w, h);
        }else{
          const s=cam.tile*cam.zoom; ctx.fillStyle=(t==='water')?'#1b6a8c':'#2a3f24';
          ctx.beginPath(); ctx.moveTo(pos.x, pos.y-s*.25); ctx.lineTo(pos.x+s*.5,pos.y);
          ctx.lineTo(pos.x, pos.y+s*.25); ctx.lineTo(pos.x-s*.5, pos.y); ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  drawRoads(){
    if(!this.roads || this.roads.size===0) return;
    const {ctx,cv,cam}=this;
    const s=cam.tile*cam.zoom;
    for(const key of this.roads){
      const [x,y]=key.split(',').map(n=>+n);
      const p=cam.worldToScreen(x,y,cv.width,cv.height);
      const img=this.images.road_straight||this.images.road||null;
      if(img){
        const base=128, w=img.naturalWidth*(s/base), h=img.naturalHeight*(s/base);
        ctx.drawImage(img, p.x-w*0.5, p.y-h*0.75, w, h);
      }else{
        ctx.fillStyle='#6b5034';
        ctx.beginPath(); ctx.arc(p.x,p.y, s*0.18, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  drawBuildings(){
    if(!this.buildings) return;
    const {ctx,cv,cam}=this; const s=cam.tile*cam.zoom;
    for(const b of this.buildings){
      const img=this.images[b.kind] || this.images.hq;
      const p=cam.worldToScreen(b.x,b.y,cv.width,cv.height);
      if(img){
        const base=128, w=img.naturalWidth*(s/base), h=img.naturalHeight*(s/base);
        ctx.drawImage(img, p.x-w*0.5, p.y-h*0.9, w, h);
      }else{
        ctx.fillStyle='#c93'; ctx.fillRect(p.x-s*.25, p.y-s*.5, s*.5, s*.5);
      }
    }
  }

  drawCarriers(t){
    if(!this.carriers) return;
    const {ctx,cv,cam}=this; const s=cam.tile*cam.zoom;
    const img=this.images.carrier;
    for(const c of this.carriers){
      const p=cam.worldToScreen(c.x, c.y, cv.width, cv.height);
      if(img){
        const base=64, w=img.naturalWidth*(s/base), h=img.naturalHeight*(s/base);
        const sx = (Math.floor((t/120)+c.seed)%4)*base; // simple 4‑Frame walk
        ctx.drawImage(img, sx, 0, base, base, p.x-w*0.5, p.y-h*0.8, w, h);
      }else{
        ctx.fillStyle='#ffd46a'; ctx.beginPath(); ctx.arc(p.x,p.y-s*0.15, s*0.12, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  drawGrid(){
    const {ctx,cv,cam}=this; const s=cam.tile*cam.zoom;
    ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,.06)';
    ctx.beginPath();
    for(let x=-cv.width; x<cv.width*2; x+=s){ ctx.moveTo(x,0); ctx.lineTo(x+cv.height,cv.height); }
    ctx.stroke(); ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.beginPath();
    for(let x=-cv.width; x<cv.width*2; x+=s){ ctx.moveTo(x,cv.height); ctx.lineTo(x+cv.height,0); }
    ctx.stroke();
  }

  _loop(ts){
    this.clear();
    this.drawTiles();
    this.drawRoads();
    this.drawBuildings();
    this.drawCarriers(ts||0);
    this.drawGrid();
    this._raf=requestAnimationFrame(this._loop);
  }
}
