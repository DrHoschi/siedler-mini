/* Siedler‑Mini V14.7 (mobile) — sprite-preload
   – Pinch‑Zoom (nur Zeiger) + Pan
   – Bauen/Abriss + Straßen
   – Träger (Carrier) Holzfäller -> Depot -> HQ
   – HUD‑Updates
   – Lädt vor Spielstart: assets/carrier_topdown_v2.json + .png
   – Fallback: Punkt‑Animation, wenn Sprite nicht verfügbar
*/
export const game = (() => {
  // ===== Darstellung / Welt =====
  const TILE = 40;
  const GRID_COLOR = "#1e2a3d";
  const ROAD_COLOR = "#78d9a8";
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";

  // ===== Träger‑Parameter (etwas langsamer, 3–4s Start) =====
  const CARRIER = {
    START_DELAY_MS: 3200,
    TURN_DELAY_MS:  400,
    RESPAWN_MS:     3800,
    SPEED:          48,          // px/s (langsamer)
    DOT_R:          4
  };

  // ===== Sprite‑Setup (Assets‑Pfad) =====
  // Erwartet:
  //   assets/carrier_topdown_v2.png
  //   assets/carrier_topdown_v2.json
  // JSON kann (optional) so aussehen:
  // { "frameW":64,"frameH":64,"fps":8,"framesPerDir":4,"scale":0.6,
  //   "order": ["DOWN","LEFT","RIGHT","UP"], "carryRowOffset":4 }
  const SPRITE_DEFAULT = {
    enabled: true,
    urlPNG:  "assets/carrier_topdown_v2.png",
    urlJSON: "assets/carrier_topdown_v2.json",
    frameW: 64, frameH: 64,
    framesPerDir: 4,
    fps: 8,
    scale: 0.6,
    order: ["DOWN","LEFT","RIGHT","UP"],
    carryRowOffset: 4
  };

  // ===== State =====
  const state = {
    running:false,
    canvas:null, ctx:null, DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5,
    pointerTool:"pointer",
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    activePointers:new Map(), pinchActive:false, pinchLastDist:0,
    pinchCenter:{x:0,y:0}, tapBlockUntil:0,

    roads:[],             // {x1,y1,x2,y2}
    buildings:[],         // {id,type,x,y,w,h,_node}
    stock:{ wood:0, stone:0, food:0, gold:0, carrier:0 },
    onHUD:(k,v)=>{},

    graph:{ nodes:[], edges:new Map() },
    carriers:[],
    _lastTS:0,

    // Sprite‑Runtime
    sprite:{
      ready:false,
      cfg: {...SPRITE_DEFAULT},
      img:null, cols:0, rows:0
    },

    // Preload‑Status
    preload: { started:false, done:false, ok:false, message:"" }
  };

  let _idSeq=1;

  // ===== Utilities =====
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
  const setHUD = (k,v)=> state.onHUD?.(k,v);
  const isPrimary = (e)=> (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==="touch");

  const toWorld = (sx,sy)=>({ x:(sx/state.DPR - state.width/2)/state.zoom + state.camX,
                               y:(sy/state.DPR - state.height/2)/state.zoom + state.camY });
  const toScreen= (wx,wy)=>({ x:(wx - state.camX)*state.zoom + state.width/2,
                               y:(wy - state.camY)*state.zoom + state.height/2 });

  function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }
  const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
  function screenMid(a,b){ return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }

  function zoomAroundScreen(sx,sy,newZoom){
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
    setHUD("Holz", String(state.stock.wood));
    setHUD("Stein",String(state.stock.stone));
    setHUD("Nahrung",String(state.stock.food));
    setHUD("Gold", String(state.stock.gold));
    setHUD("Traeger", String(state.stock.carrier));
  }

  // ===== Initial / Resize =====
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();

    state.zoom=1; state.camX=0; state.camY=0;
    writeZoomHUD(); writeStockHUD();

    // Preload anstoßen; Spiel beginnt erst nach Preload (oder Fallback)
    if (!state.preload.started) {
      preloadSprites().finally(()=>{
        state.preload.done = true;
        state.preload.ok   = state.sprite.ready;
        state.preload.message = state.sprite.ready ? "Sprites OK" : "Sprites Fallback";
      });
      state.preload.started = true;
    }

    state._lastTS = performance.now();
    requestAnimationFrame(tick);
  }
  function resizeCanvas(){
    const rect = state.canvas.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(rect.width  * state.DPR));
    state.height = Math.max(1, Math.floor(rect.height * state.DPR));
    if (state.canvas.width  !== state.width ) state.canvas.width  = state.width;
    if (state.canvas.height !== state.height) state.canvas.height = state.height;
  }

  // ===== Sprite‑Preload (JSON + PNG) =====
  async function preloadSprites(){
    // 1) JSON laden (optional, aber bevorzugt)
    let cfg = {...SPRITE_DEFAULT};
    try{
      const res = await fetch(cfg.urlJSON, {cache:"no-store"});
      if (!res.ok) throw new Error("JSON HTTP "+res.status);
      const meta = await res.json();
      if (meta.frameW) cfg.frameW = meta.frameW;
      if (meta.frameH) cfg.frameH = meta.frameH;
      if (meta.fps) cfg.fps = meta.fps;
      if (meta.framesPerDir) cfg.framesPerDir = meta.framesPerDir;
      if (meta.scale) cfg.scale = meta.scale;
      if (Array.isArray(meta.order) && meta.order.length>=4) cfg.order = meta.order.slice(0,4);
      if (typeof meta.carryRowOffset === "number") cfg.carryRowOffset = meta.carryRowOffset;
    } catch(e){
      // JSON optional → wenn weg, dann mit Default weitermachen
    }

    // 2) PNG laden
    const okPNG = await new Promise(resolve=>{
      const img = new Image();
      img.onload = ()=>{
        state.sprite.img = img;
        state.sprite.cols = Math.floor(img.width / cfg.frameW);
        state.sprite.rows = Math.floor(img.height / cfg.frameH);
        resolve(true);
      };
      img.onerror = ()=> resolve(false);
      img.src = cfg.urlPNG + "?v=147sp";
    });

    if (okPNG){
      state.sprite.cfg = cfg;
      state.sprite.ready = true;
    } else {
      // Fallback → Punkte
      state.sprite.ready = false;
    }
  }

  // ===== Zeichnen =====
  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth=1; ctx.strokeStyle=GRID_COLOR;
    const step=TILE*state.zoom*state.DPR;
    const ox=(state.width/2-(state.camX*state.zoom)*state.DPR)%step;
    const oy=(state.height/2-(state.camY*state.zoom)*state.DPR)%step;
    ctx.beginPath();
    for(let x=ox;x<=state.width;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,state.height);}
    for(let y=oy;y<=state.height;y+=step){ctx.moveTo(0,y);ctx.lineTo(state.width,y);}
    ctx.stroke(); ctx.restore();
  }

  function fillRectWorld(ctx,x,y,w,h,color,label){
    const p=toScreen(x,y); const pw=w*state.zoom, ph=h*state.zoom;
    ctx.save();
    ctx.fillStyle=color;
    ctx.fillRect((p.x*state.DPR)-pw/2*state.DPR,(p.y*state.DPR)-ph/2*state.DPR,pw*state.DPR,ph*state.DPR);
    if(label){
      ctx.fillStyle=TEXT_COLOR;
      ctx.font=`${Math.round(12*state.DPR*state.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(label, p.x*state.DPR, (p.y*state.DPR)-4*state.DPR);
    }
    ctx.restore();
  }

  function drawRoad(ctx,r){
    const a=toScreen(r.x1,r.y1), b=toScreen(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle=ROAD_COLOR; ctx.lineWidth=3*state.zoom*state.DPR; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(a.x*state.DPR,a.y*state.DPR); ctx.lineTo(b.x*state.DPR,b.y*state.DPR); ctx.stroke();
    ctx.restore();
  }

  function facingFromSegment(dx,dy){
    if (Math.abs(dx) >= Math.abs(dy)) return (dx>=0) ? "RIGHT" : "LEFT";
    return (dy>=0) ? "DOWN" : "UP";
  }

  function dirRowIndex(face, hasWood){
    const base = state.sprite.cfg.order.indexOf(face);
    const off  = hasWood ? (state.sprite.cfg.carryRowOffset|0) : 0;
    return (base<0?0:base) + off;
  }

  function drawCarrier(ctx,c){
    const p = toScreen(c.pos.x, c.pos.y);

    if (!state.sprite.ready){
      // Fallback: Punkt
      const r=CARRIER.DOT_R*state.zoom*state.DPR;
      ctx.save();
      ctx.fillStyle="rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.arc(p.x*state.DPR+1.5*r, p.y*state.DPR+1.2*r, 0.9*r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = c.hasWood ? "#f6c571" : "#d6e3ff";
      ctx.beginPath(); ctx.arc(p.x*state.DPR, p.y*state.DPR, r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      return;
    }

    // Sprite
    const img = state.sprite.img;
    // Richtung
    let dx=0, dy=1;
    if (c.seg < c.path.length-1){
      const a=c.pos, b=c.path[c.seg+1];
      dx=b.x-a.x; dy=b.y-a.y;
    }
    const face = facingFromSegment(dx,dy);
    const row  = dirRowIndex(face, c.hasWood);
    const cfg  = state.sprite.cfg;

    const frameIdx = Math.floor(c.animTime * cfg.fps) % cfg.framesPerDir;
    const sx = frameIdx * cfg.frameW;
    const sy = row * cfg.frameH;
    const dw = cfg.frameW * cfg.scale * state.zoom * state.DPR;
    const dh = cfg.frameH * cfg.scale * state.zoom * state.DPR;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx,sy, cfg.frameW,cfg.frameH,
      (p.x*state.DPR) - dw/2, (p.y*state.DPR) - dh*0.9,
      dw, dh);
    ctx.restore();
  }

  function drawWorld(){
    const {ctx}=state;
    ctx.clearRect(0,0,state.width,state.height);
    drawGrid(ctx);
    for (const r of state.roads) drawRoad(ctx,r);
    for (const b of state.buildings){
      const color = b.type==="hq" ? HQ_COLOR : b.type==="woodcutter" ? WC_COLOR : DEPOT_COLOR;
      const label = b.type==="hq" ? "HQ" : b.type==="woodcutter" ? "Holzfäller" : "Depot";
      fillRectWorld(ctx, b.x,b.y, b.w,b.h, color, label);
    }
    for (const c of state.carriers) drawCarrier(ctx,c);

    // dezentes Preload‑Badge (nur bis fertig)
    if (!state.preload.done){
      ctx.save();
      ctx.fillStyle="rgba(0,0,0,0.35)";
      ctx.fillRect(10, 10, 160, 46);
      ctx.fillStyle="#cfe3ff";
      ctx.font = `${12*state.DPR}px system-ui,-apple-system`;
      ctx.fillText("Lade Träger‑Sprites…", 20, 30);
      ctx.restore();
    }
  }

  // ===== Graph / Wege =====
  function rebuildGraph(){
    const nodes=[]; const edges=new Map(); const idxByKey=new Map();
    const key=(x,y)=>`${x}|${y}`;
    function addNode(x,y,tag=null){
      const k=key(x,y); if (idxByKey.has(k)) return idxByKey.get(k);
      const i=nodes.length; nodes.push({x,y,tag}); idxByKey.set(k,i); edges.set(i,new Set()); return i;
    }
    function addEdge(a,b){ if (a===b) return; edges.get(a).add(b); edges.get(b).add(a); }

    for (const r of state.roads){ const a=addNode(r.x1,r.y1), b=addNode(r.x2,r.y2); addEdge(a,b); }
    for (const b of state.buildings){ b._node = addNode(b.x,b.y,{type:b.type,id:b.id}); }

    const SNAP2=(TILE*0.75)*(TILE*0.75);
    for (const b of state.buildings){
      const bn=b._node;
      for (let i=0;i<nodes.length;i++){
        if (i===bn) continue;
        const n=nodes[i];
        if (dist2(n,nodes[bn])<=SNAP2) addEdge(bn,i);
      }
    }
    state.graph={nodes,edges};
  }

  function shortestPath(aIdx,bIdx){
    const {nodes,edges}=state.graph;
    if (!nodes.length) return null;
    const q=[aIdx]; const prev=new Array(nodes.length).fill(-1); prev[aIdx]=aIdx;
    while(q.length){
      const v=q.shift(); if (v===bIdx) break;
      for (const w of edges.get(v) || []) if (prev[w]===-1){ prev[w]=v; q.push(w); }
    }
    if (prev[bIdx]===-1) return null;
    const pathIdx=[]; for (let v=bIdx; v!==aIdx; v=prev[v]) pathIdx.push(v); pathIdx.push(aIdx); pathIdx.reverse();
    return pathIdx.map(i=>({x:state.graph.nodes[i].x, y:state.graph.nodes[i].y}));
  }

  // ===== Carrier =====
  function createCarrier(fromWC, viaDepot, toHQ){
    const pA = shortestPath(fromWC._node, viaDepot._node);
    const pB = pA ? shortestPath(viaDepot._node, toHQ._node) : null;
    if (!pA || !pB) return null;
    const c = {
      phase:"waitStart",
      pos:{x:pA[0].x, y:pA[0].y},
      path:pA.slice(0), seg:0,
      hasWood:false,
      tWaitUntil: performance.now() + CARRIER.START_DELAY_MS,
      animTime: 0
    };
    state.carriers.push(c);
    state.stock.carrier++; writeStockHUD();
    return c;
  }

  function advanceOnPath(c, dt){
    const speed=CARRIER.SPEED;
    let remaining = speed*dt;
    while (remaining>0 && c.seg < c.path.length-1){
      const a=c.pos, b=c.path[c.seg+1];
      const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy);
      if (d<0.0001){ c.seg++; continue; }
      if (remaining>=d){ c.pos.x=b.x; c.pos.y=b.y; c.seg++; remaining-=d; }
      else { const f=remaining/d; c.pos.x+=dx*f; c.pos.y+=dy*f; remaining=0; }
    }
    c.animTime += dt;
    return (c.seg >= c.path.length-1 && Math.hypot(c.pos.x - c.path.at(-1).x, c.pos.y - c.path.at(-1).y) < 0.5);
  }

  function nearestNode(pt){
    let best=-1, bestD=Infinity;
    for (let i=0;i<state.graph.nodes.length;i++){
      const n=state.graph.nodes[i]; const d2=dist2(pt,n);
      if (d2<bestD){bestD=d2;best=i;}
    }
    return best<0?0:best;
  }

  function updateCarriers(dt, now){
    // erst starten, wenn Preload abgeschlossen (Fehler vermeiden)
    if (!state.preload.done) return;

    if (!state.graph.nodes.length) rebuildGraph();
    const wcs = state.buildings.filter(b=>b.type==="woodcutter");
    const dps = state.buildings.filter(b=>b.type==="depot");
    const hqs = state.buildings.filter(b=>b.type==="hq");
    if (!wcs.length || !dps.length || !hqs.length) return;

    // je Holzfäller mind. ein Carrier
    for (const wc of wcs){
      const exists = state.carriers.some(c => dist(c.pos,{x:wc.x,y:wc.y}) < 1.3*TILE);
      if (!exists){
        for (const d of dps){
          const pA = shortestPath(wc._node, d._node);
          if (!pA) continue;
          for (const h of hqs){
            const pB = shortestPath(d._node, h._node);
            if (pB){ createCarrier(wc,d,h); break; }
          }
          break;
        }
      }
    }

    for (const c of state.carriers){
      switch (c.phase){
        case "waitStart":
          if (now >= c.tWaitUntil){
            c.phase="toDepot";
            const d = dps[0];
            const nFrom = nearestNode(c.pos);
            const p = shortestPath(nFrom, d._node);
            if (p){ c.path=p; c.seg=0; }
          }
          break;

        case "toDepot":
          if (advanceOnPath(c, dt)){
            c.hasWood = true;
            c.phase="turn"; c.tWaitUntil=now + CARRIER.TURN_DELAY_MS;
            const h=hqs[0], nFrom=nearestNode(c.pos), p=shortestPath(nFrom, h._node);
            if (p){ c.path=p; c.seg=0; }
          }
          break;

        case "turn":
          if (now >= c.tWaitUntil) c.phase="toHQ";
          break;

        case "toHQ":
          if (advanceOnPath(c, dt)){
            if (c.hasWood){ state.stock.wood++; writeStockHUD(); }
            c.hasWood=false;
            c.phase="backToWood";
            const wc=wcs[0], nFrom=nearestNode(c.pos), p=shortestPath(nFrom, wc._node);
            if (p){ c.path=p; c.seg=0; }
          }
          break;

        case "backToWood":
          if (advanceOnPath(c, dt)){
            c.phase="waitRespawn"; c.tWaitUntil=now + CARRIER.RESPAWN_MS;
          }
          break;

        case "waitRespawn":
          if (now >= c.tWaitUntil){
            const d=dps[0], nFrom=nearestNode(c.pos), p=shortestPath(nFrom, d._node);
            if (p){ c.path=p; c.seg=0; c.phase="toDepot"; }
            else { c.tWaitUntil = now + 1000; } // warten & nochmal probieren
          }
          break;
      }
    }
  }

  // ===== Build‑Logik =====
  const snap = v => Math.round(v / TILE) * TILE;

  function placeBuilding(type, wx, wy){
    const b = { id:_idSeq++, type, x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2, _node:-1 };
    state.buildings.push(b);
    rebuildGraph();
  }

  function pointToSegmentDist(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot=A*C+B*D; const len2=C*C+D*D; let t=len2?(dot/len2):-1; t=clamp(t,0,1);
    const x=x1+t*C, y=y1+t*D; return Math.hypot(px-x, py-y);
  }

  function tryErase(wx,wy){
    for (let i=state.buildings.length-1;i>=0;i--){
      const b=state.buildings[i]; const x0=b.x-b.w/2,x1=b.x+b.w/2,y0=b.y-b.h/2,y1=b.y+b.h/2;
      if (wx>=x0&&wx<=x1&&wy>=y0&&wy<=y1){ state.buildings.splice(i,1); rebuildGraph(); return true; }
    }
    const hit=6/state.zoom;
    for (let i=state.roads.length-1;i>=0;i--){
      const r=state.roads[i];
      if (pointToSegmentDist(wx,wy,r.x1,r.y1,r.x2,r.y2)<=hit){ state.roads.splice(i,1); rebuildGraph(); return true; }
    }
    return false;
  }

  let roadStart=null;
  function placeOrFinishRoad(wx,wy){
    const gx=snap(wx), gy=snap(wy);
    if (!roadStart){ roadStart={x:gx,y:gy}; return; }
    const seg={x1:roadStart.x,y1:roadStart.y,x2:gx,y2:gy};
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1)>1){ state.roads.push(seg); rebuildGraph(); }
    roadStart=null;
  }

  // ===== Input =====
  function addInput(){
    const el=state.canvas;
    el.addEventListener("pointerdown", onPointerDown, {passive:false});
    el.addEventListener("pointermove", onPointerMove, {passive:false});
    el.addEventListener("pointerup",   onPointerUp,   {passive:false});
    el.addEventListener("pointercancel", onPointerUp, {passive:false});
    el.addEventListener("wheel", onWheel, {passive:false});
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", ()=>setTimeout(resizeCanvas,250));
    document.addEventListener("fullscreenchange", resizeCanvas);
    document.addEventListener("webkitfullscreenchange", resizeCanvas);
  }

  function onWheel(e){
    e.preventDefault();
    if (state.pointerTool!=="pointer") return;
    const delta = -Math.sign(e.deltaY)*0.1;
    zoomAroundScreen(e.clientX,e.clientY,state.zoom+delta);
  }

  function onPointerDown(e){
    if (!isPrimary(e)) return;
    try{ state.canvas.setPointerCapture(e.pointerId); }catch{}
    state.activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

    if (state.pointerTool==="pointer" && state.activePointers.size===2){
      const [p1,p2]=[...state.activePointers.values()];
      state.pinchActive=true; state.pinchLastDist=dist(p1,p2);
      const mid=screenMid(p1,p2); state.pinchCenter=toWorld(mid.x*state.DPR, mid.y*state.DPR);
      e.preventDefault(); return;
    }

    const now=performance.now();
    const {x,y}=toWorld(e.clientX*state.DPR, e.clientY*state.DPR);

    if (state.pointerTool==="pointer"){
      state.isPanning=true; state.panStartX=e.clientX; state.panStartY=e.clientY; state.camStartX=state.camX; state.camStartY=state.camY;
      return;
    }

    if (now < state.tapBlockUntil) return;

    if (state.pointerTool==="road") placeOrFinishRoad(x,y);
    else if (state.pointerTool==="hq") placeBuilding("hq",x,y);
    else if (state.pointerTool==="woodcutter") placeBuilding("woodcutter",x,y);
    else if (state.pointerTool==="depot") placeBuilding("depot",x,y);
    else if (state.pointerTool==="erase") tryErase(x,y);
  }

  function onPointerMove(e){
    const p=state.activePointers.get(e.pointerId); if (p){p.x=e.clientX;p.y=e.clientY;}

    if (state.pinchActive && state.pointerTool==="pointer" && state.activePointers.size>=2){
      const [a,b]=[...state.activePointers.values()];
      const d=dist(a,b);
      if (d>0 && state.pinchLastDist>0){
        const mid=screenMid(a,b);
        const factor=d/state.pinchLastDist;
        zoomAroundScreen(mid.x,mid.y,clamp(state.zoom*factor,state.minZoom,state.maxZoom));
        state.pinchLastDist=d;
      }
      e.preventDefault(); return;
    }

    if (state.isPanning && state.pointerTool==="pointer"){
      e.preventDefault();
      const dx=(e.clientX-state.panStartX)/state.zoom, dy=(e.clientY-state.panStartY)/state.zoom;
      state.camX=state.camStartX-dx; state.camY=state.camStartY-dy;
    }
  }

  function onPointerUp(e){
    state.activePointers.delete(e.pointerId);
    if (state.pinchActive && state.activePointers.size<2){
      state.pinchActive=false; state.pinchLastDist=0; state.tapBlockUntil=performance.now()+150;
    }
    state.isPanning=false;
    try{ state.canvas.releasePointerCapture(e.pointerId); }catch{}
  }

  // ===== Loop =====
  function tick(ts){
    const dt=Math.min(0.05,(ts-state._lastTS)/1000);
    state._lastTS=ts;

    if (state.running){
      updateCarriers(dt, ts);
      drawWorld();
    } else {
      // erst laufen lassen, wenn Preload durch (oder Fallback) → weniger Fehler
      drawWorld();
      if (state.preload.done) {
        state.running = true;
      }
    }

    requestAnimationFrame(tick);
  }

  // ===== API =====
  function setTool(name){
    state.pointerTool=name;
    if (name!=="road") roadStart=null;
    setHUD("Tool",
      name==="pointer"?"Zeiger":
      name==="road"?"Straße":
      name==="hq"?"HQ":
      name==="woodcutter"?"Holzfäller":
      name==="depot"?"Depot":"Abriss"
    );
  }
  function center(){ state.camX=0; state.camY=0; }

  function startGame(opts){
    if (state.running) return;
    state.onHUD = opts?.onHUD || (()=>{});
    attachCanvas(opts.canvas);
    addInput();
    setTool("pointer");
    writeZoomHUD(); writeStockHUD();
    rebuildGraph();
    // Hinweis in HUD (optional)
    setHUD("Tool", "Zeiger");
    if (!state.preload.done) setHUD("Note", "Lade Sprites…");
  }

  return { startGame, setTool, center, get state(){return state;} };
})();
