// core/carriers.js  — V13 full
// Öffentliche API unten am Ende (Carriers.init, .registerSource, .registerSink, .spawnIfNeeded, .onRoadChanged, .step, .draw)

// ---------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const key = (x,y)=>`${x},${y}`;

function bfsPath(start, goal, getNei, maxNodes=5000){
  if(start.x===goal.x && start.y===goal.y) return [{x:start.x,y:start.y}];
  const q=[start], seen=new Set([key(start.x,start.y)]), parent=new Map();
  let visited=0;
  while(q.length && visited<maxNodes){
    const cur=q.shift(); visited++;
    const nei=getNei(cur.x,cur.y);
    for(const n of nei){
      const k=key(n.x,n.y);
      if(seen.has(k)) continue;
      seen.add(k); parent.set(k,cur);
      if(n.x===goal.x && n.y===goal.y){
        const path=[{x:n.x,y:n.y}];
        let p=cur;
        while(p){ path.push({x:p.x,y:p.y}); p=parent.get(key(p.x,p.y)); }
        path.reverse();
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

// ---------------------------------------------------------
// Datenmodelle
// ---------------------------------------------------------

class Source {
  constructor(id,x,y,type,opts={}){
    this.id=id; this.x=x; this.y=y; this.type=type;
    this.stock=opts.stock??0;         // aktuelle Lagerzahl
    this.batch=opts.batch??1;         // Produktionsbatch pro Abholung
    this.cooldown=0;
    this.cooldownTime=opts.cooldownTime??3; // Sekunden bis neuer Batch bereit
    this.enabled=true;
  }
  tick(dt){
    if(!this.enabled) return;
    this.cooldown -= dt;
    if(this.cooldown<=0){
      this.stock += this.batch;
      this.cooldown = this.cooldownTime;
    }
  }
}

class Sink {
  constructor(id,x,y,acceptType,opts={}){
    this.id=id; this.x=x; this.y=y;
    this.acceptType=acceptType;       // z. B. 'wood'
    this.capacity=opts.capacity??Infinity;
    this.amount=opts.amount??0;       // was bereits liegt
    this.priorityBias=opts.priorityBias??0; // >0 ⇒ etwas bevorzugt
    this.enabled=true;
  }
  canAccept(qty){ return this.enabled && (this.amount+qty)<=this.capacity; }
  put(qty){ this.amount += qty; }
}

class Carrier {
  constructor(id, tile, sprite){
    this.id=id;
    this.tile = {x:tile.x, y:tile.y};   // aktueller Tile (integer)
    this.pos  = {x:tile.x+0.5, y:tile.y+0.5}; // gleitend für Animation
    this.speed = 2.2;                   // tiles/s
    this.path = [];                     // verbleibende Wegpunkte (Tiles)
    this.progress = 0;                  // 0..1 zwischen Wegknoten
    this.cargoType = null;
    this.cargo = 0;
    this.capacity = 3;                  // Mehrfachladung
    this.idle = true;
    this.sprite = sprite || null;
    this.animTime = 0;
    this.facing = 0;                    // 0..5 (Hex) / 0..3 (Diag) – hier nur optisch
  }

  setPath(path){
    this.path = path ? path.slice(0) : [];
    this.progress = 0;
    this.idle = !this.path || this.path.length<2;
  }

  atTile(){ return {x:Math.floor(this.pos.x), y:Math.floor(this.pos.y)}; }

  step(dt){
    if(!this.path || this.path.length<2){
      this.idle=true; return;
    }
    const a=this.path[0], b=this.path[1];
    const dx=b.x-a.x, dy=b.y-a.y;
    const dist = Math.hypot(dx,dy);
    const vx = (dx/dist) * this.speed * dt;
    const vy = (dy/dist) * this.speed * dt;
    this.pos.x += vx;
    this.pos.y += vy;
    // Fortschritt schätzen:
    const tdx=(this.pos.x-(a.x+0.5));
    const tdy=(this.pos.y-(a.y+0.5));
    const along = (tdx*dx + tdy*dy) / (dist||1);
    this.progress = clamp(along, 0, 1);

    // Richtung (nur optik)
    if(Math.abs(dx)>=Math.abs(dy)){
      this.facing = dx>0 ? 0 : 3;
    }else{
      this.facing = dy>0 ? 2 : 1;
    }

    this.animTime += dt;

    // Knoten erreicht?
    if(this.progress>=0.99){
      this.pos.x = b.x+0.5; this.pos.y = b.y+0.5;
      this.path.shift();
      this.progress = 0;
      this.tile = {x:b.x, y:b.y};
      if(this.path.length<2){ this.idle=true; }
    }
  }
}

// ---------------------------------------------------------
// Carriers-System
// ---------------------------------------------------------
export const Carriers = (() =>{
  // Abhängigkeiten
  let world=null, render=null, assets=null;

  // Straßen-Nachbarn (4 Richtungen auf dem Iso‑Raster)
  function roadNeighbors(x,y){
    const dirs = [
      {x: 1,y: 0},{x:-1,y: 0},
      {x: 0,y: 1},{x: 0,y:-1},
    ];
    const out=[];
    for(const d of dirs){
      const nx=x+d.x, ny=y+d.y;
      if(world.isRoad(nx,ny)) out.push({x:nx,y:ny});
    }
    return out;
  }

  // Daten
  const carriers=[];
  const sources=new Map(); // id -> Source
  const sinks=new Map();   // id -> Sink
  const roadCache = new Set(); // verwendbar falls nötig

  // Jobs
  class Job {
    constructor(srcId, snkId, type, qty, priority=0){
      this.srcId=srcId; this.snkId=snkId;
      this.type=type; this.qty=qty;
      this.priority=priority;
      this.assigned=false;
      this.pathToSrc=null;
      this.pathToSnk=null;
    }
  }
  const jobQueue = [];

  function pushJob(j){
    jobQueue.push(j);
    jobQueue.sort((a,b)=> b.priority - a.priority); // absteigend
  }

  // Tie-breaker: Ziel mit hohem Bestand leicht bevorzugen
  function sinkBias(id){
    const s=sinks.get(id); if(!s) return 0;
    return (s.amount||0)*0.01 + (s.priorityBias||0);
  }

  // passenden Carrier finden (idle + in der Nähe)
  function pickCarrierNear(tile){
    let best=null, bestDist=Infinity;
    for(const c of carriers){
      if(!c.idle) continue;
      const d = Math.hypot(c.pos.x - (tile.x+0.5), c.pos.y - (tile.y+0.5));
      if(d<bestDist){ bestDist=d; best=c; }
    }
    return best;
  }

  // Pfad holen
  function pathBetween(a,b){
    return bfsPath(a,b, roadNeighbors, 12000);
  }

  // -------------- Öffentliche API-Implementierung --------------

  function init(deps){
    world   = deps.world;   // erwartet: isRoad(x,y), tick(dt) ruft später .step auf, usw.
    render  = deps.render;  // erwartet: worldToScreen(tileX,tileY) -> {x,y}, draw helper
    assets  = deps.assets||{};
    // Falls du bereits Assets mitlädst:
    // assets.carrier (HTMLImageElement) optional
    // Einen Default-Carrier an Startposition platzieren (beim HQ)
    carriers.length = 0;
  }

  function createCarrierAt(tile){
    const img = assets.carrier instanceof Image ? assets.carrier : null;
    const c = new Carrier(`C${Date.now()}${Math.random().toString(16).slice(2)}`, tile, img);
    carriers.push(c);
    return c;
  }

  function registerSource({id,x,y,type,stock=0,batch=1,cooldownTime=3}){
    sources.set(id, new Source(id,x,y,type,{stock,batch,cooldownTime}));
  }

  function registerSink({id,x,y,acceptType,capacity=Infinity,amount=0,priorityBias=0}){
    sinks.set(id, new Sink(id,x,y,acceptType,{capacity,amount,priorityBias}));
  }

  // erzeugt Jobs, wenn Lager > 0 (Quelle) und Senken existieren
  function spawnIfNeeded(){
    // Quellen prüfen
    const srcList=[...sources.values()].filter(s=>s.enabled && s.stock>0);
    if(!srcList.length) return;

    // für jeden Quellentyp passende Senken
    for(const s of srcList){
      // nächste Senke mit Bias bevorzugen
      const candidates=[...sinks.values()].filter(sk=>sk.enabled && sk.acceptType===s.type && sk.canAccept(1));
      if(!candidates.length) continue;

      candidates.sort((A,B)=>{
        // grobe Luftlinie + Bias
        const da=Math.hypot(A.x-s.x, A.y-s.y) - sinkBias(A.id);
        const db=Math.hypot(B.x-s.x, B.y-s.y) - sinkBias(B.id);
        return da - db;
      });
      const target=candidates[0];
      // Menge = min(Quelle, CarrierKapazität) — der Carrier füllt beim Laden bis zur Kapazität
      pushJob(new Job(s.id, target.id, s.type, Math.min(s.stock, 3), /*priority*/ priorityForType(s.type)));
    }
  }

  function priorityForType(t){
    // Nahrung > Holz > Stein > Rest (nur Beispiel)
    if(t==='food') return 50;
    if(t==='wood') return 20;
    if(t==='stone') return 10;
    return 0;
  }

  function onRoadChanged(){
    // Für die einfache BFS brauchen wir nur isRoad, also nichts weiter cachen.
    // Könntest du hier auch pending Jobs neu bewerten / Wege neu planen.
  }

  function step(dt){
    // 1) Quellen tick (Produktion)
    for(const s of sources.values()) s.tick(dt);

    // 2) Neue Jobs generieren (Backlogs/Depots)
    spawnIfNeeded();

    // 3) Jobs → Carrier zuweisen
    for(const j of jobQueue){
      if(j.assigned) continue;
      const s = sources.get(j.srcId);
      const k = sinks.get(j.snkId);
      if(!s || !k) { j.assigned=true; continue; }

      // Träger in der Nähe der Quelle bevorzugen
      const carrier = pickCarrierNear({x:s.x,y:s.y}) || pickCarrierNear({x:k.x,y:k.y});
      if(!carrier) continue;

      // Wege berechnen
      const a = {x: Math.floor(carrier.pos.x), y: Math.floor(carrier.pos.y)};
      const p1 = pathBetween(a, {x:s.x,y:s.y});
      if(!p1) continue; // keine Strecke
      const p2 = pathBetween({x:s.x,y:s.y}, {x:k.x,y:k.y});
      if(!p2) continue;

      j.pathToSrc = p1;
      j.pathToSnk = p2;
      j.assigned  = true;

      // Job an Carrier „montieren“
      carrier.job = j;
      // zuerst zur Quelle
      carrier.setPath(p1);
    }

    // 4) Carrier bewegen / laden / liefern
    for(const c of carriers){
      // Bewegung
      c.step(dt);

      // Logik
      if(!c.job) continue;
      const s = sources.get(c.job.srcId);
      const k = sinks.get(c.job.snkId);

      // A) am Quell-Tile ankommen → laden (bis Kapazität oder Quelle leer)
      if(c.idle && c.cargo===0 && s && c.tile.x===s.x && c.tile.y===s.y){
        if(s.stock>0){
          const take = Math.min(s.stock, c.capacity);
          s.stock -= take;
          c.cargo = take;
          c.cargoType = s.type;
          // zur Senke
          c.setPath(c.job.pathToSnk);
        }else{
          // Quelle leer → Job abwerfen
          c.job=null;
        }
      }
      // B) an Senke ankommen → abladen
      if(c.idle && c.cargo>0 && k && c.tile.x===k.x && c.tile.y===k.y){
        if(k.acceptType===c.cargoType && k.canAccept(c.cargo)){
          k.put(c.cargo);
          c.cargo=0; c.cargoType=null;
          // Job fertig
          c.job=null;
          // bleibt wo er ist (Idle an Ort)
        }else{
          // notfalls: leichte Wartezeit oder neue Senke suchen
          c.job=null;
        }
      }
    }
  }

  function draw(ctx){
    // Carrier
    for(const c of carriers){
      const scr = render.worldToScreen(c.pos.x, c.pos.y);
      if(assets.carrier instanceof Image){
        // Spritebreite/ ‑höhe (einfacher Strip 4 Frames)
        const fw = assets.carrier.width/4;
        const fh = assets.carrier.height;
        const frame = Math.floor((c.animTime*8)%4);
        ctx.drawImage(assets.carrier, frame*fw, 0, fw, fh, scr.x - fw*0.5, scr.y - fh*0.9, fw, fh);
      }else{
        // Fallback: kleiner farbiger Kreis + Cargo-Anzeige
        ctx.beginPath();
        ctx.arc(scr.x, scr.y-6, 6, 0, Math.PI*2);
        ctx.fillStyle = '#ffcc66';
        ctx.fill();
        if(c.cargo>0){
          ctx.fillStyle='#fff';
          ctx.font='10px sans-serif';
          ctx.fillText(`${c.cargo}`, scr.x-3, scr.y-12);
        }
      }
    }
  }

  // Debug: einen Carrier spawnen (z. B. bei Spielstart beim HQ)
  function spawnCarrierAt(x,y){ return createCarrierAt({x,y}); }

  return {
    init, registerSource, registerSink,
    spawnIfNeeded, onRoadChanged, step, draw,
    spawnCarrierAt
  };
})();
