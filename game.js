// game.js
import { Carrier } from './core/carriers.js';

export class World {
  constructor(size=64){
    this.size=size;
    this.tiles = new Array(size*size).fill('grass'); // ground kind
    this.roads = new Set();                         // key "i,j"
    this.buildings = [];                            // {type,i,j}
    this.carriers = [];
    this.res = {wood:20, stone:10, food:10, gold:0, carriers:0};
    // HQ mittig (Stein)
    const mid = Math.floor(size/2);
    this.buildings.push({type:'hq', i:mid, j:mid});
  }
  key(i,j){ return `${i},${j}`; }
  inside(i,j){ return i>=0 && j>=0 && i<this.size && j<this.size; }
  setRoad(i,j){ if(this.inside(i,j)) this.roads.add(this.key(i,j)); }
  hasRoad(i,j){ return this.roads.has(this.key(i,j)); }

  groundImg(i,j){
    // simple Wasser/Strand Insel links‑unten: Beispiel
    if(i>2 && j>2 && i<18 && j<18){
      if(i===3||j===3||i===17||j===17) return null; // shore -> Renderer nimmt Platzhalter/shore wenn vorhanden
    }
    return null; // Renderer nimmt grass wenn null -> assets.js IM.grass
  }

  eachRoad(cb){
    for(const k of this.roads){
      const [i,j]=k.split(',').map(Number);
      cb(i,j,'straight');
    }
  }
  eachBuilding(cb){ for(const b of this.buildings) cb(b); }

  build(type,i,j){
    if(!this.inside(i,j)) return false;
    if(type==='road'){ this.setRoad(i,j); return true; }
    if(type==='lumberjack' || type==='depot' || type==='hq'){
      // blockiere Doppeltbelegung
      if(this.buildings.some(b=>b.i===i && b.j===j)) return false;
      this.buildings.push({type,i,j});
      // bei Holzfäller: sofort ein Träger‑Job, falls Straße zum HQ existiert
      if(type==='lumberjack'){
        const hq = this.buildings.find(b=>b.type==='hq');
        const path = this.findPath(i,j, hq.i,hq.j);
        if(path.length>1){
          const px = path.map(p=>this.isoCenterToWorld(p.i,p.j));
          this.carriers.push(new Carrier(px));
          this.res.carriers++;
        }
      }
      return true;
    }
    if(type==='bulldoze'){
      this.roads.delete(this.key(i,j));
      const idx = this.buildings.findIndex(b=>b.i===i&&b.j===j);
      if(idx>=0) this.buildings.splice(idx,1);
      return true;
    }
    return false;
  }

  isoCenterToWorld(i,j){ // isometrischer Centerpunkt (Pixel)
    const x = (i - j) * 32;
    const y = (i + j) * 16;
    return {x,y};
  }

  update(dt){ for(const c of this.carriers) c.update(dt); this.carriers = this.carriers.filter(c=>!c.dead); }

  findPath(si,sj, ti,tj){
    // BFS über Straßen + Start/Ziel dürfen Gebäude‑Tiles sein, der Rest braucht Straße
    const Q=[[si,sj]], seen=new Set([this.key(si,sj)]), prev=new Map();
    const N=[[1,0],[-1,0],[0,1],[0,-1]];
    const can = (i,j)=> (i===ti&&j===tj) || (i===si&&j===sj) || this.hasRoad(i,j);
    while(Q.length){
      const [i,j]=Q.shift();
      if(i===ti && j===tj) break;
      for(const [dx,dy] of N){
        const ni=i+dx, nj=j+dy, k=this.key(ni,nj);
        if(!this.inside(ni,nj) || seen.has(k) || !can(ni,nj)) continue;
        seen.add(k); prev.set(k,[i,j]); Q.push([ni,nj]);
      }
    }
    // Rekonstruieren
    const out=[];
    let cur=[ti,tj], kk=this.key(ti,tj);
    if(!prev.has(kk) && !(si===ti && sj===tj)) return out;
    while(cur){
      out.push({i:cur[0],j:cur[1]});
      const p = prev.get(this.key(cur[0],cur[1]));
      cur = p|| null;
    }
    return out.reverse();
  }
}
