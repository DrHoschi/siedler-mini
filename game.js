// core/game.js — V13.7
import './world.js';
import './core/assets.js';
import './core/camera.js';
import './core/carriers.js';

function keyXY(x,y){ return `${x},${y}`; }
function neighbors4(x,y){ return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]; }

export class Game{
  /** @param {Render} r */
  constructor(r){
    this.r=r;
    this.assets={};
    this.world=null;         // {w,h,tiles}
    this.roads=new Set();    // "x,y"
    this.buildings=[];       // {kind:'hq'|'lumber'|'depot', x,y}
    this.carriers=[];        // {x,y,route:[],seed,load}
    this.resources={wood:20, stone:10, food:10, gold:0, carriers:0};
    this.running=false;
  }

  // ----- Assets -----
  async loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; }); }
  async loadAssets(){
    const list = {
      grass:'assets/grass.png', water:'assets/water.png', shore:'assets/shore.png',
      dirt:'assets/dirt.png', rocky:'assets/rocky.png', sand:'assets/sand.png',
      hq:'assets/hq_stone.png', lumber:'assets/lumberjack.png', depot:'assets/depot.png',
      road:'assets/road.png', road_curve:'assets/road_curve.png', road_straight:'assets/road_straight.png',
      carrier:'assets/carrier.png'
    };
    const out={}; await Promise.all(Object.entries(list).map(async([k,src])=>out[k]=await this.loadImage(src)));
    this.assets=out; this.r.attachAssets(out);
  }

  // ----- Welt -----
  makeWorld(){
    const W=140,H=110;
    const tiles=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>{
      let t='grass';
      const wx0=44,wy0=32,wx1=94,wy1=62;
      if(x>=wx0&&x<=wx1&&y>=wy0&&y<=wy1) t='water';
      if(t==='grass'){
        if( (x>=wx0-1&&x<=wx1+1&&y>=wy0-1&&y<=wy1+1) && !(x>=wx0&&x<=wx1&&y>=wy0&&y<=wy1) ) t='shore';
      }
      return t;
    }));
    this.world={w:W,h:H,tiles};
    this.r.attachMap(this.world);
  }

  placeStartHQ(){
    const cx=(this.world.w/2)|0, cy=(this.world.h/2)|0;
    for(let y=cy-1;y<=cy+1;y++) for(let x=cx-1;x<=cx+1;x++) this.world.tiles[y][x]='dirt';
    this.buildings.push({kind:'hq',x:cx,y:cy});
    this.r.attachBuildings(this.buildings);
  }

  centerCam(){ this.r.cam.setCenter(this.world.w*0.5, this.world.h*0.5); this.r.cam.setZoom(1.0); }

  // ----- Straßen / Graph -----
  addRoad(x,y){ this.roads.add(keyXY(x,y)); this.r.attachRoads(this.roads); }
  isRoad(x,y){ return this.roads.has(keyXY(x,y)); }
  roadNeighbors(x,y){ return neighbors4(x,y).filter(([nx,ny])=>this.isRoad(nx,ny)); }

  // BFS auf Straßen zwischen zwei Punkten (Start/Ende sitzen auf Straße)
  findPath(ax,ay, bx,by){
    const start=keyXY(ax,ay), goal=keyXY(bx,by);
    const Q=[start], prev=new Map([[start,null]]); 
    while(Q.length){
      const cur=Q.shift(); if(cur===goal) break;
      const [x,y]=cur.split(',').map(Number);
      for(const [nx,ny] of this.roadNeighbors(x,y)){
        const k=keyXY(nx,ny);
        if(!prev.has(k)){ prev.set(k,cur); Q.push(k); }
      }
    }
    if(!prev.has(goal)) return null;
    const path=[]; let c=goal; while(c){ const [x,y]=c.split(',').map(Number); path.push([x,y]); c=prev.get(c); }
    path.reverse(); return path;
  }

  // ----- Gebäude-Logik -----
  nearestHubOnRoad(x,y){
    // Hubs: HQ + Depots; wähle den, der über Straßen erreichbar ist
    const hubs = this.buildings.filter(b=>b.kind==='hq'||b.kind==='depot');
    // Suche nächsten Hub, der über Straße verbunden ist
    for(const hub of hubs){
      // Finde je eine Straßenkachel in der Nähe von Quelle & Ziel
      const src = neighbors4(x,y).find(([sx,sy])=>this.isRoad(sx,sy));
      const dst = neighbors4(hub.x,hub.y).find(([dx,dy])=>this.isRoad(dx,dy));
      if(!src || !dst) continue;
      const p=this.findPath(src[0],src[1], dst[0],dst[1]);
      if(p) return {hub, path:p};
    }
    return null;
  }

  spawnCarrier(path, load=2){
    const [sx,sy]=path[0];
    this.carriers.push({x:sx,y:sy,route:path.slice(1),seed:(Math.random()*8|0),load});
    this.resources.carriers=this.carriers.length;
    this.r.attachCarriers(this.carriers);
  }

  tickCarriers(){
    for(const c of this.carriers){
      if(!c.route || c.route.length===0) continue;
      const [tx,ty]=c.route[0];
      // sanft bewegen
      const speed=0.08; // Kacheln pro Frame
      const dx=tx-c.x, dy=ty-c.y;
      const dist=Math.hypot(dx,dy);
      if(dist<=speed){ c.x=tx; c.y=ty; c.route.shift(); }
      else { c.x+=dx/dist*speed; c.y+=dy/dist*speed; }
    }
    // Aufräumen: Carrier mit leerer Route angekommen -> entladen u. verschwinden lassen
    this.carriers = this.carriers.filter(c=>{
      if(c.route && c.route.length===0){
        this.resources.wood += c.load;
        return false;
      }
      return true;
    });
    this.resources.carriers=this.carriers.length;
  }

  // Holzfäller produziert „Rohholz“ → sobald Straße & Hub erreichbar, Träger erzeugen
  tickProduction(){
    for(const b of this.buildings){
      if(b.kind!=='lumber') continue;
      b.timer = (b.timer||0) + 1;
      if(b.timer<120) continue; // ~2s
      b.timer=0;
      // ist an Straße & Hub erreichbar?
      const reach=this.nearestHubOnRoad(b.x,b.y);
      if(reach){ this.spawnCarrier(reach.path, 2); }
    }
  }

  // ----- Public API -----
  async init(){ await this.loadAssets(); this.makeWorld(); this.placeStartHQ(); this.centerCam();
    this.r.attachRoads(this.roads); this.r.attachBuildings(this.buildings); this.r.attachCarriers(this.carriers); }

  start(){ if(this.running) return; this.running=true; this.r.start(); }

  step(){ this.tickProduction(); this.tickCarriers(); }

  // Build helpers
  canInBounds(x,y){ return x>=0&&y>=0&&x<this.world.w&&y<this.world.h; }
  build(kind,x,y){
    if(!this.canInBounds(x,y)) return false;
    if(kind==='road'){ this.addRoad(x,y); return true; }
    if(kind==='lumber'||kind==='depot'){
      // kleine Baufläche glätten
      for(let j=y-1;j<=y+1;j++) for(let i=x-1;i<=x+1;i++) if(this.canInBounds(i,j)) this.world.tiles[j][i]='dirt';
      this.buildings.push({kind,x,y});
      return true;
    }
    if(kind==='hq'){
      for(let j=y-1;j<=y+1;j++) for(let i=x-1;i<=x+1;i++) if(this.canInBounds(i,j)) this.world.tiles[j][i]='dirt';
      this.buildings.push({kind:'hq',x,y});
      return true;
    }
    if(kind==='bulldoze'){
      this.roads.delete(keyXY(x,y));
      const idx=this.buildings.findIndex(b=>b.x===x&&b.y===y);
      if(idx>=0) this.buildings.splice(idx,1);
      return true;
    }
    return false;
  }
}
