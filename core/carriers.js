// core/carriers.js — V13 carriers: Wegfindung, Mehrfachladung, Zeichnen

import { IM } from './assets.js';
import { worldToScreen } from './camera.js';

/* ========= internes Modell ========= */
const key = (x,y)=>`${x},${y}`;

let worldAPI = null;   // erwartet: isRoad(x,y), inBounds(x,y)
let drawCtx = null;    // wird von world.js beim Zeichnen übergeben (nur für Fallback ok)

export const carriers = [];  // {x,y,posX,posY,speed,path:[],t, cargo,cargoType,cap, anim}
const sources = new Map();   // id -> {x,y,type, stock,batch,cooldown}
const sinks   = new Map();   // id -> {x,y,acceptType, amount,capacity, prio}

let lastRoadVersion = 0;     // wenn Straßen geändert, Pfade neu planen

/* ========= Public API ========= */

export function initCarriers(api){
  worldAPI = api; // { isRoad, inBounds }
  carriers.length = 0;
  sources.clear(); sinks.clear();
  lastRoadVersion = 0;
}

export function onRoadChanged(){
  lastRoadVersion++; // signalisiert: alte Pfade ggf. veraltet
}

export function registerSource({id,x,y,type,batch=1,cooldownTime=4, stock=0}){
  sources.set(id, {id,x,y,type,batch,cooldownTime,stock,cooldown:0});
}
export function removeSource(id){ sources.delete(id); }

export function registerSink({id,x,y,acceptType,capacity=Infinity,amount=0, prio=0}){
  sinks.set(id, {id,x,y,acceptType,capacity,amount, prio});
}
export function removeSink(id){ sinks.delete(id); }

export function spawnCarrierAt(x,y){
  carriers.push({
    x, y, posX:x+0.5, posY:y+0.5,
    speed: 2.2, path:[], t:0,
    cargo:0, cargoType:null, cap:3,
    roadVersionAtPlan: lastRoadVersion,
    anim:0
  });
}

/* ========= Sim‑Tick ========= */
export function tickCarriers(dt){
  // Produktion bei Quellen
  for(const s of sources.values()){
    s.cooldown -= dt;
    if(s.cooldown<=0){
      s.stock += s.batch;
      s.cooldown = s.cooldownTime;
    }
  }

  // Jobs erzeugen, wenn Lager da
  planJobsIfNeeded();

  // Bewegung
  for(const c of carriers){
    // falls Straßen geändert: Pfad verwerfen
    if (c.path && c.path.length>0 && c.roadVersionAtPlan!==lastRoadVersion){
      c.path.length = 0;
    }

    // kein Pfad? idle
    if(!c.path || c.path.length<2){
      c.anim += dt;
      continue;
    }

    const a = c.path[0], b = c.path[1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx,dy) || 1;
    const vx = (dx/dist) * c.speed * dt;
    const vy = (dy/dist) * c.speed * dt;
    c.posX += vx; c.posY += vy;
    c.anim += dt;

    // Segmentende?
    const along = ((c.posX - (a.x+0.5))*dx + (c.posY - (a.y+0.5))*dy) / (dist*dist);
    if(along >= 1){
      // nächsten Knoten
      c.posX = b.x+0.5; c.posY = b.y+0.5;
      c.x = b.x; c.y = b.y;
      c.path.shift();

      // am Quell‑ oder Ziel‑Tile angekommen?
      if(c.path.length<2){
        arriveAtNode(c, b.x, b.y);
      }
    }
  }
}

/* ========= Zeichnen ========= */
export function drawCarriers(ctx){
  drawCtx = ctx;
  for(const c of carriers){
    const p = worldToScreen(c.posX, c.posY);
    const img = IM.carrier;
    if(img){
      // 4‑Frame‑Strip
      const frames = 4;
      const fw = img.width/frames;
      const fh = img.height;
      const frame = Math.floor((c.anim*8)%frames);
      ctx.drawImage(img, frame*fw, 0, fw, fh, p[0]-fw*0.5, p[1]-fh*0.9, fw, fh);
    }else{
      // Fallback: Kreis + Zahl für Fracht
      ctx.beginPath();
      ctx.arc(p[0], p[1]-8, 6, 0, Math.PI*2);
      ctx.fillStyle = '#ffcc66';
      ctx.fill();
      if(c.cargo>0){
        ctx.fillStyle='#000'; ctx.font='10px system-ui';
        ctx.fillText(String(c.cargo), p[0]-3, p[1]-16);
      }
    }
  }
}

/* ========= Planungslogik ========= */
function planJobsIfNeeded(){
  // Für jede Quelle mit Lager >0: bestes Ziel suchen, Carrier in der Nähe nehmen
  for(const s of sources.values()){
    if(s.stock<=0) continue;

    // passende Senken
    const candidates = [...sinks.values()].filter(k=>k.acceptType===s.type && k.amount < k.capacity);
    if(!candidates.length) continue;

    // simple Bewertung: Luftlinie - PrioBonus
    candidates.sort((A,B)=>{
      const da = Math.hypot(A.x-s.x, A.y-s.y) - (A.prio||0);
      const db = Math.hypot(B.x-s.x, B.y-s.y) - (B.prio||0);
      return da - db;
    });
    const target = candidates[0];

    // freien Carrier suchen
    const c = pickIdleCarrierNear(s.x, s.y) || pickIdleCarrierNear(target.x, target.y);
    if(!c) continue;

    // Pfade berechnen
    const p1 = roadPath({x:c.x,y:c.y},{x:s.x,y:s.y});
    if(!p1) continue;
    const p2 = roadPath({x:s.x,y:s.y},{x:target.x,y:target.y});
    if(!p2) continue;

    // Laden/Entladen planen
    const take = Math.min(s.stock, c.cap);
    s.stock -= take;
    c.cargo = take;
    c.cargoType = s.type;

    c.path = p1.concat(p2.slice(1));  // zusammengehängt
    c.roadVersionAtPlan = lastRoadVersion;
  }
}

function pickIdleCarrierNear(x,y){
  let best=null, bd=1e9;
  for(const c of carriers){
    // idle wenn kein Pfad
    if(c.path && c.path.length>1) continue;
    const d = Math.hypot((c.posX)-(x+0.5),(c.posY)-(y+0.5));
    if(d<bd){ bd=d; best=c; }
  }
  return best;
}

function arriveAtNode(c, x, y){
  // Ankunft: wenn am Senken‑Tile mit passendem Typ → abladen
  // (wir erkennen Senke/Quelle per Koordinate; „bleibt wo er ist“)
  for(const k of sinks.values()){
    if(k.x===x && k.y===y && k.acceptType===c.cargoType && c.cargo>0){
      const put = Math.min(c.cargo, k.capacity - k.amount);
      if(put>0){ k.amount += put; c.cargo -= put; }
      c.path = []; // idle bleiben
      return;
    }
  }
  // Wenn am Quell‑Tile gelandet, aber kein Cargo gesetzt war (sollte selten vorkommen) → sofort weiter
  for(const s of sources.values()){
    if(s.x===x && s.y===y && c.cargo===0 && s.stock>0){
      const take = Math.min(s.stock, c.cap);
      s.stock -= take;
      c.cargo = take; c.cargoType = s.type;
      return;
    }
  }
}

/* ========= Wegsuche (BFS auf Straßen) ========= */
function roadPath(a,b, limit=20000){
  if(a.x===b.x && a.y===b.y) return [{x:a.x,y:a.y}];
  const q=[a], seen=new Set([key(a.x,a.y)]), parent=new Map();
  let visited=0;
  while(q.length && visited<limit){
    const cur=q.shift(); visited++;
    for(const n of neighbors(cur.x,cur.y)){
      const k=key(n.x,n.y); if(seen.has(k)) continue;
      seen.add(k); parent.set(k,cur);
      if(n.x===b.x && n.y===b.y){
        const path=[{x:n.x,y:n.y}]; let p=cur;
        while(p){ path.push({x:p.x,y:p.y}); p=parent.get(key(p.x,p.y)); }
        path.reverse(); return path;
      }
      q.push(n);
    }
  }
  return null;
}
function neighbors(x,y){
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const out=[];
  for(const d of dirs){
    const nx=x+d[0], ny=y+d[1];
    if(worldAPI?.inBounds(nx,ny) && worldAPI?.isRoad(nx,ny)) out.push({x:nx,y:ny});
  }
  // auch die Startzelle selbst ist befahrbar, wenn Road:
  if(worldAPI?.isRoad(x,y) && !out.some(n=>n.x===x&&n.y===y)) out.unshift({x,y});
  return out;
}
