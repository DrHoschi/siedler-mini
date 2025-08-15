// V15 world – Logik, Ressourcen, Wege, Träger-Spawning
const TILE = 40;

export function createWorld({ onHUD=()=>{}, log=()=>{}, err=()=>{} }={}){
  // Tile-Typen
  const T = { GRASS:0, WATER:1, DIRT:2, FOREST:3 };

  const world = {
    w: 100, h: 100,
    tiles: [],           // 2D
    roads: [],           // {x1,y1,x2,y2} (welt-Koords, grid-snap)
    nodes: new Map(),    // key "x,y" -> Set(neighborKey)
    buildings: [],       // {id,type,x,y,w,h,footprint:[{gx,gy}], stock:{}}
    carriers: [],        // {x,y,speed,path:[{x,y}], t, frame}
    center: {x:0,y:0},
    res: { wood:0, stone:0, food:0, gold:0 },
    _roadStart: null,
    _nextId: 1,
  };

  // ===== Utilities =====
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const gSnap = v => Math.round(v/TILE)*TILE;
  const key = (gx,gy)=> `${gx},${gy}`;
  const addEdge = (a,b) => {
    if (!world.nodes.has(a)) world.nodes.set(a, new Set());
    if (!world.nodes.has(b)) world.nodes.set(b, new Set());
    world.nodes.get(a).add(b);
    world.nodes.get(b).add(a);
  };

  function hudPush(){
    onHUD('Wood', world.res.wood);
    onHUD('Stone', world.res.stone);
    onHUD('Food', world.res.food);
    onHUD('Gold', world.res.gold);
    onHUD('Car', world.carriers.length|0);
  }

  // ===== Map erzeugen =====
  function generate(){
    world.tiles = Array.from({length:world.h}, (_,y)=>
      Array.from({length:world.w}, (_,x)=>{
        // Wasser am Rand, innen Gras, Flecken DIRT/FOREST
        const m = 6;
        if (x<m||y<m||x>world.w-m-1||y>world.h-m-1) return T.WATER;
        let v = T.GRASS;
        if ((x+y)%17===0) v=T.DIRT;
        if ((x*31+y*7)%29===0) v=T.FOREST;
        return v;
      })
    );
    world.center = { x:(world.w*TILE)/2, y:(world.h*TILE)/2 };
  }

  // ===== Gebäude =====
  const FOOT = {
    hq:         { w:2, h:2 },
    woodcutter: { w:2, h:2 },
    depot:      { w:2, h:2 },
  };
  function footprintCells(type, wx,wy){
    const f = FOOT[type]||{w:2,h:2};
    const gx0 = Math.round((wx - (f.w*TILE)/2)/TILE);
    const gy0 = Math.round((wy - (f.h*TILE)/2)/TILE);
    const cells=[];
    for (let dy=0; dy<f.h; dy++)
      for (let dx=0; dx<f.w; dx++)
        cells.push({gx:gx0+dx, gy:gy0+dy});
    return cells;
  }
  function canBuild(type, wx, wy){
    const cells = footprintCells(type, wx, wy);
    for(const c of cells){
      if (c.gx<0||c.gy<0||c.gx>=world.w||c.gy>=world.h) return false;
      const tt = world.tiles[c.gy][c.gx];
      if (tt===T.WATER) return false;
      // kollisionscheck
      for (const b of world.buildings){
        for (const f of b.footprint) if (f.gx===c.gx && f.gy===c.gy) return false;
      }
    }
    return true;
  }
  function placeBuilding(type, pos){
    const x = gSnap(pos.x), y=gSnap(pos.y);
    if (!canBuild(type,x,y)) return false;
    const fp = footprintCells(type,x,y);
    const id = world._nextId++;
    const b = { id, type, x, y, w:FOOT[type]?.w*TILE||TILE*2, h:FOOT[type]?.h*TILE||TILE*2,
      footprint:fp, stock:{} };
    world.buildings.push(b);
    log(`🏗️ ${type} gebaut @ ${x},${y}`);
    // Produktions-Timer für Holzfäller
    if (type==='woodcutter'){
      b._prod=0;      // Sekunden-Akkumulator
      b._prodTime= 7 + Math.random()*3; // 7–10s
    }
    hudPush();
    return true;
  }

  function eraseAt(pos){
    // Gebäude?
    for (let i=world.buildings.length-1; i>=0; i--){
      const b=world.buildings[i];
      const x0=b.x-b.w/2, y0=b.y-b.h/2, x1=x0+b.w, y1=y0+b.h;
      if (pos.x>=x0 && pos.x<=x1 && pos.y>=y0 && pos.y<=y1){
        world.buildings.splice(i,1);
        log('🧹 Gebäude entfernt');
        return true;
      }
    }
    // Straße?
    const hit = 6;
    for (let i=world.roads.length-1; i>=0; i--){
      const r=world.roads[i];
      const d = pointToSegmentDist(pos.x,pos.y, r.x1,r.y1, r.x2,r.y2);
      if (d<=hit){ world.roads.splice(i,1); rebuildGraph(); log('🧹 Straße entfernt'); return true; }
    }
    return false;
  }
  function pointToSegmentDist(px,py,x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot=A*C+B*D, len2=C*C+D*D;
    let t = len2 ? (dot/len2) : -1; t= clamp(t,0,1);
    const x=x1+t*C, y=y1+t*D;
    return Math.hypot(px-x,py-y);
  }

  // ===== Straßen =====
  function addRoad(seg){
    const s = {
      x1: gSnap(seg.x1), y1: gSnap(seg.y1),
      x2: gSnap(seg.x2), y2: gSnap(seg.y2)
    };
    if (Math.hypot(s.x2-s.x1, s.y2-s.y1) < 2) return false;
    world.roads.push(s);
    rebuildGraph();
    log(`🛣️ Straße: ${s.x1},${s.y1} → ${s.x2},${s.y2}`);
    return true;
  }
  function cancelRoadStart(){ world._roadStart=null; }
  function rebuildGraph(){
    world.nodes.clear();
    for (const r of world.roads){
      const a = key(r.x1,r.y1), b = key(r.x2,r.y2);
      addEdge(a,b);
    }
  }

  // ===== Wegfindung über Road‑Graph =====
  function nearestNode(wx,wy){
    if (world.roads.length===0) return null;
    let best=null, bd=1e9;
    for (const r of world.roads){
      const pts = [{x:r.x1,y:r.y1},{x:r.x2,y:r.y2}];
      for (const p of pts){
        const d=Math.hypot(wx-p.x, wy-p.y);
        if (d<bd){bd=d;best=p;}
      }
    }
    return best ? key(best.x,best.y) : null;
  }
  function bfsPath(fromKey, toKey){
    if (!fromKey||!toKey) return null;
    const q=[fromKey], prev=new Map([[fromKey,null]]); let hit=null;
    while(q.length){
      const u=q.shift();
      if (u===toKey){ hit=u; break; }
      for (const v of (world.nodes.get(u)||[])){
        if (!prev.has(v)){ prev.set(v,u); q.push(v); }
      }
    }
    if (!hit) return null;
    // rückwärts
    const path=[];
    for (let k=hit; k!==null; k = prev.get(k)){
      const [sx,sy]=k.split(',').map(n=>+n);
      path.push({x:+sx, y:+sy});
    }
    path.reverse();
    return path;
  }

  // ===== Carrier / Transport =====
  function requestCarry(fromB, toB){
    // finde Pfad von nächster Road-Node nahe fromB→toB
    const a = nearestNode(fromB.x, fromB.y);
    const b = nearestNode(toB.x, toB.y);
    const nodesPath = bfsPath(a,b);
    if (!nodesPath) return false;
    // startpunkt auf Gebäude-Position ergänzen (optisch)
    const path = [{x:fromB.x, y:fromB.y}, ...nodesPath.map(p=>({x:p.x,y:p.y})), {x:toB.x,y:toB.y}];
    const c = { x: path[0].x, y:path[0].y, path, t:0, seg:0, speed: 55, frame:0 };
    world.carriers.push(c);
    onHUD('Car', world.carriers.length);
    return true;
  }

  function updateCarriers(dt){
    for (const c of world.carriers){
      if (c.seg >= c.path.length-1) continue;
      const a=c.path[c.seg], b=c.path[c.seg+1];
      const dx=b.x-c.x, dy=b.y-c.y, dist=Math.hypot(dx,dy)||1;
      const step = c.speed*dt;
      if (step>=dist){ c.x=b.x; c.y=b.y; c.seg++; }
      else { c.x+=dx/dist*step; c.y+=dy/dist*step; }
      c.frame = (c.frame + dt*8) % 4; // 8 fps anim
    }
    // Fertige löschen (optional nach kurzer Pause)
    for (let i=world.carriers.length-1;i>=0;i--){
      const c=world.carriers[i];
      if (c.seg>=c.path.length-1) world.carriers.splice(i,1);
    }
  }

  // ===== Produktion / Logik =====
  function nearestByType(type, from){
    let best=null, bd=1e9;
    for (const b of world.buildings){
      if (b.type!==type) continue;
      const d = Math.hypot(b.x-from.x, b.y-from.y);
      if (d<bd){ bd=d; best=b; }
    }
    return best;
  }
  function anyHQ(){ return world.buildings.find(b=>b.type==='hq'); }
  function anyDepot(){ return world.buildings.find(b=>b.type==='depot'); }

  function updateProduction(dt){
    for (const b of world.buildings){
      if (b.type==='woodcutter'){
        b._prod += dt;
        if (b._prod >= b._prodTime){
          b._prod = 0;
          // Rohholz erzeugt → Transportauftrag
          const depot = nearestByType('depot', b);
          const hq    = nearestByType('hq', b) || anyHQ();
          if (!hq){ continue; }
          // „kürzerer Weg“ zählt: Distanz Gebäude→Ziel
          let target = hq;
          if (depot){
            const dhq = Math.hypot(hq.x-b.x, hq.y-b.y);
            const dpt = Math.hypot(depot.x-b.x, depot.y-b.y);
            target = (dpt<dhq) ? depot : hq;
          }
          if (requestCarry(b, target)){
            // Ankunft erhöht Ressourcen – vereinfachte, sofortige Gutschrift:
            // (Eleganter wäre: erst bei Arrive. Für jetzt: direkt buchen.)
            world.res.wood += 1;
            onHUD('Wood', world.res.wood);
          }
        }
      }
    }
  }

  // ===== API =====
  function newGame(){
    generate();
    // Start-HQ mittig
    placeBuilding('hq', world.center);
  }

  function update(dt){
    updateProduction(dt);
    updateCarriers(dt);
  }

  function cancelRoadStart(){ world._roadStart=null; }

  function eraseAt(pos){ return eraseAt_impl(pos); }
  const eraseAt_impl = eraseAt; // rename for export consistency

  function toJSON(){
    return {
      w:world.w, h:world.h,
      tiles: world.tiles,
      roads: world.roads,
      buildings: world.buildings.map(b=>({id:b.id,type:b.type,x:b.x,y:b.y,w:b.w,h:b.h,footprint:b.footprint})),
      res: world.res,
    };
  }
  function fromJSON(data){
    world.w=data.w; world.h=data.h;
    world.tiles=data.tiles;
    world.roads=data.roads; rebuildGraph();
    world.buildings = data.buildings;
    world.res = data.res||world.res;
    // reposition center
    world.center = { x:(world.w*TILE)/2, y:(world.h*TILE)/2 };
  }

  return {
    T, TILE,
    get tiles(){ return world.tiles; },
    get roads(){ return world.roads; },
    get buildings(){ return world.buildings; },
    get carriers(){ return world.carriers; },
    get center(){ return world.center; },
    newGame, update,
    addRoad, cancelRoadStart,
    placeBuilding, eraseAt: eraseAt_impl,
    toJSON, fromJSON,
  };
}
