// core/carriers.js
// Einfache Träger-Logik mit BFS-Wegfindung und Sprite-Animation.

export class CarrierSystem {
  constructor(game){
    this.g = game;
    this.r = game.r;
    this.carriers = [];       // {x,y,path:[],t:0,speed,frame,dir}
    this.jobs = [];           // {from:{x,y}, to:{x,y}, res:'wood', qty:1}
    this.frameTimer = 0;
  }

  // Einen Träger an (nahem) HQ oder Depot spawnen
  spawnNear(x,y){
    const spot = this._findNearestSpot(x,y);
    if(!spot) return null;
    const c = { x:spot.x, y:spot.y, path:[], t:0, speed:3.0, frame:0, dir:1, carrying:null };
    this.carriers.push(c);
    this.g.state.carriers = this.carriers; // für HUD
    return c;
  }

  // Auftrag einstellen
  enqueueJob(fromX,fromY,toX,toY,res='wood',qty=1){
    this.jobs.push({from:{x:fromX,y:fromY}, to:{x:toX,y:toY}, res, qty});
  }

  // Vom Holzfäller aufrufen: produziert Holzpaket und Job anlegen
  produceAndRequestPickup(b){
    // kleines internes Lager am Gebäude
    b.buffer = (b.buffer||0) + 1;
    // nächstes Ziel: HQ oder Depot (egal, nimm das nächste)
    const target = this._nearestBuildingOfType(b.x,b.y,['hq','depot']);
    if(!target) return;
    this.enqueueJob(b.x,b.y,target.x,target.y,'wood',1);
  }

  update(dt){
    // Jobs Trägern zuweisen
    if(this.jobs.length){
      // suche freien Träger (oder spawne einen)
      let c = this.carriers.find(k=>k.path.length===0 && !k.carrying);
      if(!c){
        const firstJob = this.jobs[0];
        c = this.spawnNear(firstJob.from.x, firstJob.from.y);
      }
      if(c){
        const job = this.jobs.shift();
        // path zum Abholort
        const p1 = this._findPath(c.x,c.y, job.from.x, job.from.y);
        const p2 = this._findPath(job.from.x, job.from.y, job.to.x, job.to.y);
        if(p1 && p2){
          c.path = p1.concat(p2.slice(1)); // zusammenhängen (ohne Doppelknoten)
          c.carrying = { res:job.res, qty:job.qty, to:job.to };
        } // sonst Job später neu versuchen
      }
    }

    // Träger bewegen
    for(const c of this.carriers){
      if(c.path.length>1){
        const a=c.path[0], b=c.path[1];
        const dx=b.x-a.x, dy=b.y-a.y;
        const dist = Math.hypot(dx,dy);
        c.t += (c.speed*dt)/dist;
        if(c.t>=1){
          c.path.shift(); c.t=0;
          c.x=b.x; c.y=b.y;
          // am Ende?
          if(c.path.length===1 && c.carrying && c.x===c.carrying.to.x && c.y===c.carrying.to.y){
            // abliefern
            this._deliver(c);
          }
        }
      }
    }

    // einfache Laufanimation
    this.frameTimer += dt;
    if(this.frameTimer>0.12){
      this.frameTimer=0;
      for(const c of this.carriers){ c.frame = (c.frame+1)&3; }
    }
  }

  draw(ctx){
    const img = this.r.img['carrier'];
    if(!img) return;
    const tileW=this.r.TW*this.r.zoom, tileH=this.r.TH*this.r.zoom;
    for(const c of this.carriers){
      // Interpolation
      let cx=c.x, cy=c.y;
      if(c.path.length>1){
        const a=c.path[0], b=c.path[1];
        cx = a.x + (b.x-a.x)*c.t;
        cy = a.y + (b.y-a.y)*c.t;
      }
      const {x:screenX,y:screenY} = this.r.isoToScreen(cx,cy);
      // Sprite: 4 Frames nebeneinander (32x32 je Frame empfohlen)
      const fw = img.width/4, fh = img.height;
      const sx = Math.floor(c.frame)*fw, sy=0;
      const w = Math.round(tileW*0.55), h=Math.round(tileH*0.9);
      ctx.drawImage(img, sx,sy,fw,fh, Math.round(screenX-w/2), Math.round(screenY-h*0.9), w,h);
    }
  }

  // ----- Hilfen -----
  _deliver(c){
    // Ressource in Game‑Lager buchen
    this.g.state.res[c.carrying.res] = (this.g.state.res[c.carrying.res]||0) + c.carrying.qty;
    c.carrying=null;
    c.path=[]; // Träger bleibt stehen (wie gewünscht)
  }

  _nearestBuildingOfType(x,y,types){
    let best=null, bestD=1e9;
    for(const b of this.g.state.buildings){
      if(types.includes(b.type)){
        const d = Math.hypot(b.x-x, b.y-y);
        if(d<bestD){ bestD=d; best=b; }
      }
    }
    return best;
  }

  _findNearestSpot(x,y){
    // Rückgabe irgendeines begehbaren Punktes (Straße/HQ/Depot) nahe (x,y)
    // hier simple: nimm das Tile selbst, wenn begehbar, sonst Nachbarn
    const ok=(tx,ty)=>this._passable(tx,ty);
    if(ok(x,y)) return {x,y};
    const n=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const d of n){ const nx=x+d[0], ny=y+d[1]; if(ok(nx,ny)) return {x:nx,y:ny}; }
    return null;
  }

  _passable(x,y){
    if(!this.g._inb(x,y)) return false;
    const cell = this.g.map[y][x];
    // begehbar: Straße oder Gebäude‑Tiles (HQ/Depot/Lumberjack) gelten als begehbar
    return cell.object==='road' || cell.object==='hq_stone' || cell.object==='hq_wood' || cell.object==='depot' || cell.object==='lumberjack';
  }

  _findPath(sx,sy,tx,ty){
    // BFS auf 4‑Nachbarschaft über _passable
    if(sx===tx && sy===ty) return [{x:sx,y:sy}];
    const q=[{x:sx,y:sy}];
    const key=(x,y)=>x+'|'+y;
    const came=new Map(); came.set(key(sx,sy), null);
    const n4=[[1,0],[-1,0],[0,1],[0,-1]];
    while(q.length){
      const a=q.shift();
      for(const d of n4){
        const nx=a.x+d[0], ny=a.y+d[1];
        const k=key(nx,ny);
        if(!this._passable(nx,ny) && !(nx===tx&&ny===ty)) continue;
        if(!came.has(k)){
          came.set(k, a); q.push({x:nx,y:ny});
          if(nx===tx&&ny===ty){
            // Pfad rekonstruieren
            const path=[{x:tx,y:ty}];
            let cur=a;
            while(cur){ path.unshift({x:cur.x,y:cur.y}); cur=came.get(key(cur.x,cur.y)); }
            return path;
          }
        }
      }
    }
    return null; // kein Weg
  }
}
