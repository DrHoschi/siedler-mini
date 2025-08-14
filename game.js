/* Siedler‑Mini V14.7‑hf3 (mobile)
   – Pinch‑Zoom (nur Zeiger‑Tool) + Pan
   – Bauen/Abriss wie gehabt
   – NEU: einfache Träger (Carrier) mit Ressourcenkette
          Holzfäller -> Depot -> HQ  (nur wenn über Straßen verbunden)
   – Startverzögerung & langsamer Lauf konfigurierbar
*/
export const game = (() => {
  // ===== Konstante Welt / Darstellung =====
  const TILE = 40;
  const GRID_COLOR = "#1e2a3d";
  const ROAD_COLOR = "#78d9a8";
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";

  // Träger-Parametrisierung
  const CARRIER = {
    START_DELAY_MS: 3500,     // ~3–4 s bis zum ersten Loslaufen
    TURN_DELAY_MS:  400,      // kleine Pause beim Ankommen/Umdrehen
    RESPAWN_MS:     4000,     // Pause am Holzfäller bis zur nächsten Runde
    SPEED:          55,       // px/s (langsam)
    DOT_R:          4         // Fallback-Darstellung (kleiner Punkt)
  };

  // ===== State =====
  const state = {
    running:false,
    // Canvas
    canvas:null, ctx:null, DPR:1, width:0, height:0,
    // Kamera
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5,
    // Eingabe
    pointerTool:"pointer",
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    activePointers:new Map(), pinchActive:false, pinchLastDist:0,
    pinchCenter:{x:0,y:0}, tapBlockUntil:0,
    // Welt
    roads:[],        // {x1,y1,x2,y2}
    buildings:[],    // {id,type:"hq"|"woodcutter"|"depot", x,y,w,h}
    // Economy / HUD
    stock:{ wood:0, stone:0, food:0, gold:0, carrier:0 },
    onHUD:(k,v)=>{},
    // Graph (für Wege)
    graph:{ nodes:[], edges:new Map() }, // nodes: [{x,y,tag?}]  edges: Map(index -> Set(index))
    // Träger
    carriers:[],     // siehe createCarrier()
    // Loop
    _lastTS:0
  };

  let _idSeq = 1;      // building ids

  // ===== Utilities =====
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
  const setHUD = (k,v)=> state.onHUD?.(k,v);
  const isPrimary = (e)=> (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==="touch");

  const toWorld = (sx,sy)=>({
    x: (sx/state.DPR - state.width/2)/state.zoom + state.camX,
    y: (sy/state.DPR - state.height/2)/state.zoom + state.camY
  });
  const toScreen = (wx,wy)=>({
    x: (wx - state.camX) * state.zoom + state.width/2,
    y: (wy - state.camY) * state.zoom + state.height/2
  });

  function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }
  const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
  function screenMid(a,b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }

  function zoomAroundScreen(sx, sy, newZoom){
    newZoom = clamp(newZoom, state.minZoom, state.maxZoom);
    const before = toWorld(sx*state.DPR, sy*state.DPR);
    state.zoom = newZoom;
    const after  = toWorld(sx*state.DPR, sy*state.DPR);
    state.camX += (before.x - after.x);
    state.camY += (before.y - after.y);
    writeZoomHUD();
  }

  function writeZoomHUD(){ setHUD("Zoom", `${state.zoom.toFixed(2)}x`); }
  function writeStockHUD(){
    setHUD("Holz",  String(state.stock.wood));
    setHUD("Stein", String(state.stock.stone));
    setHUD("Nahrung", String(state.stock.food));
    setHUD("Gold",  String(state.stock.gold));
    setHUD("Traeger", String(state.stock.carrier));
  }

  // ===== Initial / Resize =====
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();

    state.zoom = 1.0; state.camX = 0; state.camY = 0;
    writeZoomHUD(); writeStockHUD();

    state._lastTS = performance.now();
    requestAnimationFrame(tick);
  }
  function resizeCanvas(){
    const {canvas} = state;
    const rect = canvas.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(rect.width  * state.DPR));
    state.height = Math.max(1, Math.floor(rect.height * state.DPR));
    if (canvas.width !== state.width) canvas.width = state.width;
    if (canvas.height!== state.height) canvas.height= state.height;
  }

  // ===== Zeichnen =====
  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const step = TILE * state.zoom * state.DPR;
    const ox = (state.width/2  - (state.camX*state.zoom)*state.DPR) % step;
    const oy = (state.height/2 - (state.camY*state.zoom)*state.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=state.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.height); }
    for (let y=oy; y<=state.height;y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function fillRectWorld(ctx, x,y,w,h, color, label){
    const p = toScreen(x,y);
    const pw = w * state.zoom, ph = h * state.zoom;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect((p.x*state.DPR)-pw/2*state.DPR, (p.y*state.DPR)-ph/2*state.DPR, pw*state.DPR, ph*state.DPR);
    if (label){
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*state.DPR*state.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(label, p.x*state.DPR, (p.y*state.DPR)-4*state.DPR);
    }
    ctx.restore();
  }

  function drawRoad(ctx, r){
    const a = toScreen(r.x1,r.y1), b = toScreen(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle = ROAD_COLOR;
    ctx.lineWidth = 3 * state.zoom * state.DPR;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x*state.DPR, a.y*state.DPR);
    ctx.lineTo(b.x*state.DPR, b.y*state.DPR);
    ctx.stroke();
    ctx.restore();
  }

  function drawCarrier(ctx, c){
    // Fallback: kleiner gelber „Träger“-Punkt mit Schatten
    const p = toScreen(c.pos.x, c.pos.y);
    const r = CARRIER.DOT_R * state.zoom * state.DPR;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.arc(p.x*state.DPR+1.5*r, p.y*state.DPR+1.2*r, 0.9*r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = c.hasWood ? "#f6c571" : "#d6e3ff";       // mit/ohne Holzladung
    ctx.beginPath(); ctx.arc(p.x*state.DPR, p.y*state.DPR, r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawWorld(){
    const {ctx} = state;
    ctx.clearRect(0,0,state.width,state.height);
    drawGrid(ctx);
    for (const r of state.roads) drawRoad(ctx,r);
    for (const b of state.buildings){
      const color = b.type==="hq" ? HQ_COLOR : b.type==="woodcutter" ? WC_COLOR : DEPOT_COLOR;
      const label = b.type==="hq" ? "HQ" : b.type==="woodcutter" ? "Holzfäller" : "Depot";
      fillRectWorld(ctx, b.x,b.y, b.w,b.h, color, label);
    }
    // Carrier zuletzt
    for (const c of state.carriers) drawCarrier(ctx,c);
  }

  // ===== Graph / Wege =====
  function rebuildGraph(){
    const nodes = [];               // [{x,y,tag}]
    const keyOf = (x,y)=> `${x}|${y}`;
    const nodeIndex = new Map();
    const edges = new Map();

    function addNode(x,y,tag=null){
      const k = keyOf(x,y);
      if (nodeIndex.has(k)) return nodeIndex.get(k);
      const idx = nodes.length;
      nodes.push({x,y,tag});
      nodeIndex.set(k, idx);
      edges.set(idx, new Set());
      return idx;
    }
    function addEdge(a,b){ if (a===b) return; edges.get(a).add(b); edges.get(b).add(a); }

    // Road endpoints => Nodes + Edge
    for (const r of state.roads){
      const a = addNode(r.x1, r.y1);
      const b = addNode(r.x2, r.y2);
      addEdge(a,b);
    }

    // Buildings => Node
    for (const b of state.buildings){
      b._node = addNode(b.x, b.y, {type:b.type, id:b.id});
    }

    // Snap Building zu Road-Endpunkt wenn nahe
    const SNAP2 = (TILE*0.75)*(TILE*0.75);
    for (const b of state.buildings){
      const bn = b._node;
      // verbinde zu allen Road-Nodes in der Nähe
      for (let i=0;i<nodes.length;i++){
        const n = nodes[i];
        if (n===nodes[bn]) continue;
        if (dist2(n, nodes[bn]) <= SNAP2){
          addEdge(bn, i);
        }
      }
    }

    state.graph = {nodes, edges};
  }

  function shortestPath(fromNode, toNode){
    // BFS auf ungewichteten Edges → Liste von Punkten (Weltkoords)
    const {nodes, edges} = state.graph;
    if (!nodes.length) return null;
    const q = [fromNode];
    const prev = new Array(nodes.length).fill(-1);
    prev[fromNode] = fromNode;
    while (q.length){
      const v = q.shift();
      if (v === toNode) break;
      for (const w of edges.get(v) || []){
        if (prev[w] !== -1) continue;
        prev[w] = v; q.push(w);
      }
    }
    if (prev[toNode] === -1) return null;
    const pathIdx = [];
    for (let v=toNode; v!==fromNode; v=prev[v]) pathIdx.push(v);
    pathIdx.push(fromNode); pathIdx.reverse();
    return pathIdx.map(i => ({ x: state.graph.nodes[i].x, y: state.graph.nodes[i].y }));
  }

  // ===== Carrier‑Logic =====
  function createCarrier(fromWoodcutter, viaDepot, toHQ){
    const pathA = shortestPath(fromWoodcutter._node, viaDepot._node);
    const pathB = shortestPath(viaDepot._node, toHQ._node);
    if (!pathA || !pathB) return null;

    const c = {
      phase:"waitStart",              // waitStart -> toDepot -> turn -> toHQ -> deliver -> backToWood -> waitRespawn
      pos:{ x: pathA[0].x, y: pathA[0].y },
      path: pathA.slice(0),          // aktuelle Polyline
      seg: 0,                        // segment index
      hasWood:false,
      tWaitUntil: performance.now() + CARRIER.START_DELAY_MS
    };
    state.carriers.push(c);
    state.stock.carrier++; writeStockHUD();
    return c;
  }

  function advanceOnPath(c, dt){
    const speed = CARRIER.SPEED; // px/s
    let remaining = speed * dt;
    while (remaining > 0 && c.seg < c.path.length-1){
      const a = c.path[c.seg], b = c.path[c.seg+1];
      const dx = b.x - c.pos.x, dy = b.y - c.pos.y;
      const d = Math.hypot(dx,dy);
      if (d < 0.0001){ c.seg++; continue; }
      if (remaining >= d){
        c.pos.x = b.x; c.pos.y = b.y; c.seg++; remaining -= d;
      }else{
        const f = remaining / d;
        c.pos.x += dx*f; c.pos.y += dy*f;
        remaining = 0;
      }
    }
    return (c.seg >= c.path.length-1 && Math.hypot(c.pos.x - c.path.at(-1).x, c.pos.y - c.path.at(-1).y) < 0.5);
  }

  function updateCarriers(dt, now){
    // Vorbedingung: Graph aktuell halten
    if (!state.graph.nodes.length) rebuildGraph();

    const woodcutters = state.buildings.filter(b=>b.type==="woodcutter");
    const depots      = state.buildings.filter(b=>b.type==="depot");
    const hqs         = state.buildings.filter(b=>b.type==="hq");
    if (!woodcutters.length || !depots.length || !hqs.length) return;

    // Falls noch keine Carrier zu einem Holzfäller existieren → anlegen
    // (max 1 Carrier pro Holzfäller gleichzeitig – simpel)
    for (const wc of woodcutters){
      const has = state.carriers.some(c => dist(c.pos, {x:wc.x,y:wc.y}) < 1.5*TILE);
      if (!has){
        // suche „nächstes“ Depot/HQ mit erreichbarem Pfad
        let created = false;
        for (const d of depots){
          for (const h of hqs){
            rebuildGraph(); // sicherstellen, dass _node existiert
            const tryA = shortestPath(wc._node, d._node);
            const tryB = tryA ? shortestPath(d._node, h._node) : null;
            if (tryA && tryB){ createCarrier(wc, d, h); created = true; break; }
          }
          if (created) break;
        }
      }
    }

    // Update existierender Carrier
    for (const c of state.carriers){
      switch (c.phase){
        case "waitStart":
          if (now >= c.tWaitUntil){
            // setze Ziel Depot
            c.phase = "toDepot";
            // Pfad neu berechnen (falls sich was geändert hat)
            const wcNode = nearestNode(c.pos);
            const d = depots[0], h = hqs[0];
            const pA = shortestPath(wcNode, d._node);
            c.path = pA || c.path; c.seg = 0;
          }
          break;

        case "toDepot":{
          const arrived = advanceOnPath(c, dt);
          if (arrived){
            c.hasWood = true;
            c.phase = "turn";
            c.tWaitUntil = now + CARRIER.TURN_DELAY_MS;
            // neuen Pfad Depot -> HQ
            const d = depots[0], h = hqs[0];
            const nFrom = nearestNode(c.pos);
            const p = shortestPath(nFrom, h._node);
            if (p){ c.path = p; c.seg = 0; }
          }
        } break;

        case "turn":
          if (now >= c.tWaitUntil) c.phase = "toHQ";
          break;

        case "toHQ":{
          const arrived = advanceOnPath(c, dt);
          if (arrived){
            // Holz abliefern
            if (c.hasWood){ state.stock.wood++; writeStockHUD(); }
            c.hasWood = false;
            c.phase = "backToWood";
            // zurück zum Holzfäller
            const wc = woodcutters[0];
            const nFrom = nearestNode(c.pos);
            const pBack = shortestPath(nFrom, wc._node);
            if (pBack){ c.path = pBack; c.seg = 0; }
          }
        } break;

        case "backToWood":{
          const arrived = advanceOnPath(c, dt);
          if (arrived){
            c.phase = "waitRespawn";
            c.tWaitUntil = now + CARRIER.RESPAWN_MS;
          }
        } break;

        case "waitRespawn":
          if (now >= c.tWaitUntil){
            // neue Runde Depot -> HQ
            const wc = woodcutters[0], d = depots[0], h = hqs[0];
            const nFrom = nearestNode(c.pos);
            const pA = shortestPath(nFrom, d._node);
            if (pA){ c.path = pA; c.seg = 0; c.phase = "toDepot"; }
            else { c.tWaitUntil = now + 1000; } // warte & versuche später
          }
          break;
      }
    }
  }

  function nearestNode(pt){
    let best=-1, bestD=Infinity;
    for (let i=0;i<state.graph.nodes.length;i++){
      const n = state.graph.nodes[i];
      const d2 = dist2(pt, n);
      if (d2 < bestD){ bestD=d2; best=i; }
    }
    return best<0 ? 0 : best;
  }

  // ===== Build-Logik =====
  const snap = v => Math.round(v / TILE) * TILE;

  function placeBuilding(type, wx, wy){
    const b = { id:_idSeq++, type, x: snap(wx), y: snap(wy), w: TILE*2, h: TILE*2, _node:-1 };
    state.buildings.push(b);
    rebuildGraph(); // Graph aktualisieren (für Wege)
  }

  function pointToSegmentDist(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot = A*C + B*D;
    const len2 = C*C + D*D;
    let t = len2 ? (dot/len2) : -1;
    t = clamp(t,0,1);
    const x = x1 + t*C, y = y1 + t*D;
    return Math.hypot(px-x, py-y);
  }

  function tryErase(wx,wy){
    // Gebäude
    for (let i=state.buildings.length-1;i>=0;i--){
      const b = state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){
        state.buildings.splice(i,1);
        rebuildGraph();
        return true;
      }
    }
    // Straßen (Hitbox ~6px)
    const hitDist = 6 / state.zoom;
    for (let i=state.roads.length-1;i>=0;i--){
      const r = state.roads[i];
      if (pointToSegmentDist(wx,wy,r.x1,r.y1,r.x2,r.y2) <= hitDist){
        state.roads.splice(i,1);
        rebuildGraph();
        return true;
      }
    }
    return false;
  }

  // Straßenbau: Klick=Start, Klick=Ende
  let roadStart=null;
  function placeOrFinishRoad(wx,wy){
    const gx = snap(wx), gy = snap(wy);
    if (!roadStart){ roadStart = {x:gx,y:gy}; return; }
    const seg = { x1:roadStart.x, y1:roadStart.y, x2:gx, y2:gy };
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1){
      state.roads.push(seg);
      rebuildGraph();
    }
    roadStart=null;
  }

  // ===== Input =====
  function addInput(){
    const el = state.canvas;
    el.addEventListener("pointerdown", onPointerDown,  {passive:false});
    el.addEventListener("pointermove", onPointerMove,  {passive:false});
    el.addEventListener("pointerup",   onPointerUp,    {passive:false});
    el.addEventListener("pointercancel", onPointerUp,  {passive:false});
    el.addEventListener("wheel", onWheel, {passive:false});
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", ()=>setTimeout(resizeCanvas, 250));
    document.addEventListener("fullscreenchange", resizeCanvas);
    document.addEventListener("webkitfullscreenchange", resizeCanvas);
  }

  function onWheel(e){
    e.preventDefault();
    if (state.pointerTool !== "pointer") return;
    const delta = -Math.sign(e.deltaY) * 0.1;
    zoomAroundScreen(e.clientX, e.clientY, state.zoom + delta);
  }

  function onPointerDown(e){
    if (!isPrimary(e)) return;
    try{ state.canvas.setPointerCapture(e.pointerId); }catch{}
    state.activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    // Pinch‑Start (nur Zeiger)
    if (state.pointerTool === "pointer" && state.activePointers.size === 2){
      const [p1,p2] = [...state.activePointers.values()];
      state.pinchActive = true;
      state.pinchLastDist = dist(p1,p2);
      const mid = screenMid(p1,p2);
      state.pinchCenter = toWorld(mid.x*state.DPR, mid.y*state.DPR);
      e.preventDefault();
      return;
    }

    // 1‑Finger
    const now = performance.now();
    const {x,y} = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);

    if (state.pointerTool === "pointer"){
      state.isPanning = true;
      state.panStartX = e.clientX; state.panStartY = e.clientY;
      state.camStartX = state.camX; state.camStartY = state.camY;
      return;
    }

    if (now < state.tapBlockUntil) return;

    if (state.pointerTool === "road") placeOrFinishRoad(x,y);
    else if (state.pointerTool === "hq") placeBuilding("hq",x,y);
    else if (state.pointerTool === "woodcutter") placeBuilding("woodcutter",x,y);
    else if (state.pointerTool === "depot") placeBuilding("depot",x,y);
    else if (state.pointerTool === "erase") tryErase(x,y);
  }

  function onPointerMove(e){
    const p = state.activePointers.get(e.pointerId);
    if (p){ p.x = e.clientX; p.y = e.clientY; }

    // Pinch aktiv?
    if (state.pinchActive && state.pointerTool === "pointer" && state.activePointers.size >= 2){
      const [a,b] = [...state.activePointers.values()];
      const d = dist(a,b);
      if (d > 0 && state.pinchLastDist > 0){
        const mid = screenMid(a,b);
        const factor = d / state.pinchLastDist;
        zoomAroundScreen(mid.x, mid.y, clamp(state.zoom * factor, state.minZoom, state.maxZoom));
        state.pinchLastDist = d;
      }
      e.preventDefault();
      return;
    }

    // Pan
    if (state.isPanning && state.pointerTool === "pointer"){
      e.preventDefault();
      const dx = (e.clientX - state.panStartX) / state.zoom;
      const dy = (e.clientY - state.panStartY) / state.zoom;
      state.camX = state.camStartX - dx;
      state.camY = state.camStartY - dy;
    }
  }

  function onPointerUp(e){
    state.activePointers.delete(e.pointerId);
    if (state.pinchActive){
      if (state.activePointers.size < 2){
        state.pinchActive = false;
        state.pinchLastDist = 0;
        state.tapBlockUntil = performance.now() + 150; // 150ms Tap‑Block gegen Geistertaps
      }
    }
    state.isPanning = false;
    try{ state.canvas.releasePointerCapture(e.pointerId); }catch{}
  }

  // ===== Loop =====
  function tick(ts){
    const dt = Math.min(0.05, (ts - state._lastTS)/1000); // clamp dt
    state._lastTS = ts;

    if (state.running){
      updateCarriers(dt, ts);
      drawWorld();
    }else{
      drawWorld();
    }
    requestAnimationFrame(tick);
  }

  // ===== API =====
  function setTool(name){
    state.pointerTool = name;
    if (name !== "road") roadStart = null;
    setHUD('Tool',
      name==='pointer' ? 'Zeiger' :
      name==='road' ? 'Straße' :
      name==='hq' ? 'HQ' :
      name==='woodcutter' ? 'Holzfäller' :
      name==='depot' ? 'Depot' : 'Abriss'
    );
  }

  function center(){ state.camX=0; state.camY=0; }

  function startGame(opts){
    if (state.running) return;
    state.onHUD = opts?.onHUD || (()=>{});
    attachCanvas(opts.canvas);
    addInput();
    setTool('pointer');
    writeZoomHUD(); writeStockHUD();
    rebuildGraph();
    state.running = true;
  }

  return { startGame, setTool, center, get state(){ return state; } };
})();
