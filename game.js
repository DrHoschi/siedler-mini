// game.js (V15) – alles in einer Datei gehalten (Rendering, Eingabe, Logik)
export const game = (() => {
  // ====== Konstanten & State ======
  const TILE = 40;
  const GRID_COLOR = "#1e2a3d";
  const ROAD_COLOR = "#78d9a8";
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";
  const BG_COLOR   = "#0b1320";

  const B = { HQ:'hq', WC:'woodcutter', DEPOT:'depot' };

  const state = {
    running:false,
    canvas:null, ctx:null, DPR:1, sw:0, sh:0,
    camX:0, camY:0, zoom:1, minZoom:0.6, maxZoom:2.5,
    tool:'pointer',
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Geometrie
    roads: [],                    // Segmente: {x1,y1,x2,y2}
    buildings: [],                // {type, x,y,w,h, stock?}
    carriers: [],                 // {path:[{x,y},...], t, speed}
    roadStart: null,              // Klick-Startpunkt für neue Straße
    // Ressourcen
    res: { wood:0, stone:0, food:0, gold:0 },
    // Zeiten
    last:0, acc:0,
    // HUD/Error
    onHUD:(k,v)=>{}, showError:(m)=>{},
    // Debug
    debug:false,
  };

  // ====== Utils ======
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const snap=(v)=>Math.round(v/TILE)*TILE;
  const toWorld = (sx,sy)=>({
    x:(sx/state.DPR - state.sw/2)/state.zoom + state.camX,
    y:(sy/state.DPR - state.sh/2)/state.zoom + state.camY
  });
  const toScreen=(wx,wy)=>({
    x:(wx - state.camX)*state.zoom + state.sw/2,
    y:(wy - state.camY)*state.zoom + state.sh/2
  });

  // ====== Canvas ======
  function attachCanvas(canvas){
    state.canvas=canvas;
    state.ctx=canvas.getContext('2d',{alpha:false});
    state.DPR=Math.max(1, Math.min(3, window.devicePixelRatio||1));
    resize();
    // Kamera initial
    state.zoom=1.0;
    center();
    writeHUD('Zoom', state.zoom.toFixed(2)+'x');
  }
  function resize(){
    const r = state.canvas.getBoundingClientRect();
    state.sw = Math.max(1, (r.width*state.DPR)|0);
    state.sh = Math.max(1, (r.height*state.DPR)|0);
    if (state.canvas.width!==state.sw || state.canvas.height!==state.sh){
      state.canvas.width=state.sw; state.canvas.height=state.sh;
    }
  }

  // ====== Weltzeichnen ======
  function clear(){ state.ctx.fillStyle=BG_COLOR; state.ctx.fillRect(0,0,state.sw,state.sh); }
  function drawGrid(){
    const ctx=state.ctx;
    ctx.save(); ctx.strokeStyle=GRID_COLOR; ctx.lineWidth=1;
    const step = TILE*state.zoom*state.DPR;
    const ox = (state.sw/2 - (state.camX*state.zoom)*state.DPR) % step;
    const oy = (state.sh/2 - (state.camY*state.zoom)*state.DPR) % step;
    ctx.beginPath();
    for(let x=ox; x<=state.sw; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.sh); }
    for(let y=oy; y<=state.sh; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.sw,y); }
    ctx.stroke(); ctx.restore();
  }
  function fillRectWorld(x,y,w,h,color,label){
    const ctx=state.ctx;
    const p=toScreen(x,y);
    const pw=w*state.zoom*state.DPR, ph=h*state.zoom*state.DPR;
    ctx.save();
    ctx.fillStyle=color;
    ctx.fillRect(p.x*state.DPR-pw/2, p.y*state.DPR-ph/2, pw, ph);
    if(label){
      ctx.fillStyle=TEXT_COLOR;
      ctx.font=`${Math.round(12*state.DPR*state.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(label, p.x*state.DPR, p.y*state.DPR-4*state.DPR);
    }
    ctx.restore();
  }
  function drawRoad(r){
    const ctx=state.ctx;
    const a=toScreen(r.x1,r.y1), b=toScreen(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle=ROAD_COLOR; ctx.lineWidth=3*state.zoom*state.DPR; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(a.x*state.DPR,a.y*state.DPR); ctx.lineTo(b.x*state.DPR,b.y*state.DPR); ctx.stroke();
    ctx.restore();
  }
  function drawCarrier(c){
    const ctx=state.ctx;
    const p=toScreen(c.x, c.y);
    ctx.save();
    ctx.fillStyle = c.color || '#ffd86b';
    const r = Math.max(2, 3*state.zoom);
    ctx.beginPath(); ctx.arc(p.x*state.DPR, p.y*state.DPR, r*state.DPR, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawWorld(){
    clear(); drawGrid();
    // Straßen
    for(const r of state.roads) drawRoad(r);
    // Gebäude
    for(const b of state.buildings){
      const col = b.type===B.HQ?HQ_COLOR : b.type===B.WC?WC_COLOR : DEPOT_COLOR;
      const label = b.type===B.HQ?'HQ' : b.type===B.WC?'Holzfäller':'Depot';
      fillRectWorld(b.x,b.y,b.w,b.h,col,label);
    }
    // Träger
    for(const c of state.carriers) drawCarrier(c);

    if(state.debug){
      state.ctx.save();
      state.ctx.fillStyle='#8fd1ff';
      state.ctx.font=`${12*state.DPR}px monospace`;
      state.ctx.fillText(`roads:${state.roads.length} blds:${state.buildings.length} car:${state.carriers.length}`, 8, 16*state.DPR);
      state.ctx.restore();
    }
  }

  // ====== Spielschleife ======
  function loop(ts){
    if(!state.running){ drawWorld(); requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (ts-(state.last||ts))/1000); state.last=ts; state.acc+=dt;

    // Produktion (alle 0.25s prüfen)
    while(state.acc>0.25){ tickProduction(0.25); state.acc-=0.25; }

    // Carrier bewegen
    updateCarriers(dt);

    drawWorld();
    requestAnimationFrame(loop);
  }

  // ====== Datenstruktur Gebäude / Straßen ======
  function addBuilding(type, x,y){
    const b={ type, x:snap(x), y:snap(y), w:TILE*2, h:TILE*2, stock:{wood:0} };
    // keine Überlappung erlauben
    if (hitBuilding(b.x,b.y,b.w,b.h)) { state.showError('Platz belegt.'); return false; }
    state.buildings.push(b);
    if(type===B.HQ) b.stock={ wood:0, stone:0, food:0, gold:0 };
    return true;
  }
  function hitBuilding(x,y,w,h){
    const x0=x-w/2, x1=x+w/2, y0=y-h/2, y1=y+h/2;
    for(const b of state.buildings){
      const bx0=b.x-b.w/2, bx1=b.x+b.w/2, by0=b.y-b.h/2, by1=b.y+b.h/2;
      if(!(x1<bx0 || x0>bx1 || y1<by0 || y0>by1)) return true;
    }
    return false;
  }
  function tryErase(wx,wy){
    // Gebäude zuerst
    for(let i=state.buildings.length-1;i>=0;i--){
      const b=state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if(wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ state.buildings.splice(i,1); return true; }
    }
    // Straße: Distanz zu Segment
    const hitDist = 6/state.zoom;
    for(let i=state.roads.length-1;i>=0;i--){
      if(pointToSegDist(wx,wy,state.roads[i])<=hitDist){ state.roads.splice(i,1); return true; }
    }
    return false;
  }
  function pointToSegDist(px,py,seg){
    const {x1,y1,x2,y2}=seg;
    const A=px-x1,B=py-y1,C=x2-x1,D=y2-y1;
    const dot=A*C+B*D, len2=C*C+D*D; let t=len2?(dot/len2):-1; t=clamp(t,0,1);
    const x=x1+t*C, y=y1+t*D; return Math.hypot(px-x,py-y);
  }

  // ========== Straßenbau ==========
  function startRoad(x,y){ state.roadStart={x:snap(x),y:snap(y)}; }
  function finishRoad(x,y){
    if(!state.roadStart) return;
    const gx=snap(x), gy=snap(y);
    const a=state.roadStart, b={x:gx,y:gy};
    if (Math.hypot(b.x-a.x,b.y-a.y) < 1){ state.roadStart=null; return; }
    state.roads.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y});
    state.roadStart=null;
  }

  // ========== Pathfinding über Straßennetz ==========
  function nodesFromRoads(){
    // Knoten sind Straßenendpunkte + Gebäude-Andockpunkte (Mitte)
    const key=(x,y)=>`${x}|${y}`;
    const nodes=new Map();
    function addNode(x,y){
      const k=key(x,y); if(!nodes.has(k)) nodes.set(k,{x,y,edges:[]}); return nodes.get(k);
    }
    for(const r of state.roads){
      const a=addNode(r.x1,r.y1), b=addNode(r.x2,r.y2);
      a.edges.push(b); b.edges.push(a);
    }
    // Gebäude-Ports
    for(const b of state.buildings){
      const n=addNode(b.x,b.y);
      // "Nächstes" Straßensnap – kleinste Distanz
      let best=null, bd=1e9;
      for(const r of state.roads){
        const d=pointToSegDist(b.x,b.y,r);
        if(d<bd){ bd=d; best=r; }
      }
      if(best && bd<=TILE*0.75){
        const a=addNode(best.x1,best.y1), c=addNode(best.x2,best.y2);
        n.edges.push(a); a.edges.push(n); n.edges.push(c); c.edges.push(n);
      }
    }
    return nodes;
  }
  function findPath(ax,ay,bx,by){
    const nodes=nodesFromRoads();
    const key=(x,y)=>`${x}|${y}`;
    const start=nodes.get(key(snap(ax),snap(ay)));
    const goal =nodes.get(key(snap(bx),snap(by)));
    if(!start || !goal) return null;
    // BFS
    const q=[start], prev=new Map(); prev.set(start,null);
    while(q.length){
      const n=q.shift(); if(n===goal) break;
      for(const m of n.edges) if(!prev.has(m)){ prev.set(m,n); q.push(m); }
    }
    if(!prev.has(goal)) return null;
    const path=[]; let cur=goal; while(cur){ path.push({x:cur.x,y:cur.y}); cur=prev.get(cur); }
    path.reverse(); return path;
  }

  // ========== Produktion & Träger ==========
  const PROD_WC_INTERVAL = 6.0;       // Holzerzeugung am Holzfäller (Sek.)
  const CARRIER_DELAY    = 3.5;       // Verzögerung bis Träger losläuft (Sek.)
  const CARRIER_SPEED    = 60;        // px/Sek.

  function tickProduction(dt){
    // Holzfäller produzieren Holz in Eigenlager; wenn Pfad zum HQ vorhanden → Trägerauftrag
    const hq = state.buildings.find(b=>b.type===B.HQ);
    if(!hq) return;

    for(const b of state.buildings){
      if(b.type!==B.WC) continue;
      b._t = (b._t||0) + dt;
      if (b._t >= PROD_WC_INTERVAL){
        b._t -= PROD_WC_INTERVAL;
        b.stock.wood = (b.stock.wood||0) + 1;

        // Pfad zum HQ?
        const path = findPath(b.x,b.y, hq.x,hq.y);
        if(path && path.length>=2){
          // Träger nach kurzer Verzögerung starten
          spawnCarrier(path, 'wood');
        }
      }
    }
  }

  function spawnCarrier(path, cargo){
    // Startverzögerung → Carrier an den Startknoten „warten lassen“
    const c = {
      path: path.map(p=>({x:p.x, y:p.y})),
      seg:0, t:0, x:path[0].x, y:path[0].y,
      speed: CARRIER_SPEED, cargo, color:'#ffd86b',
      delay: CARRIER_DELAY,
    };
    state.carriers.push(c);
    writeHUD('car', state.carriers.length|0);
  }

  function updateCarriers(dt){
    for(let i=state.carriers.length-1;i>=0;i--){
      const c=state.carriers[i];
      if(c.delay>0){ c.delay-=dt; continue; }
      // Zwischen Knoten bewegen
      const a=c.path[c.seg], b=c.path[c.seg+1];
      if(!b){ // Ziel erreicht
        deliver(c);
        state.carriers.splice(i,1);
        writeHUD('car', state.carriers.length|0);
        continue;
      }
      const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
      c.t += (c.speed*dt)/len;
      if (c.t>=1){ c.seg++; c.t=0; c.x=b.x; c.y=b.y; }
      else { c.x=a.x+dx*c.t; c.y=a.y+dy*c.t; }
    }
  }

  function deliver(c){
    // Wenn Zielknoten HQ-Position ist → in HQ-Lager buchen
    const hq = state.buildings.find(b=>b.type===B.HQ);
    if(!hq) return;
    const atHQ = (Math.hypot(c.x-hq.x, c.y-hq.y) < TILE*0.6);
    if(atHQ && c.cargo==='wood'){
      state.res.wood += 1;
      writeHUD('wood', state.res.wood|0);
    }
  }

  // ====== Eingabe ======
  function addInput(){
    const el=state.canvas;
    el.addEventListener('pointerdown', onPointerDown, {passive:false});
    el.addEventListener('pointermove', onPointerMove, {passive:false});
    el.addEventListener('pointerup',   onPointerUp,   {passive:false});
    el.addEventListener('pointercancel', onPointerUp, {passive:false});
    el.addEventListener('wheel', onWheel, {passive:false});

    window.addEventListener('resize', ()=>setTimeout(resize,50));
    window.addEventListener('orientationchange', ()=>setTimeout(resize,150));
  }
  function isPrimary(e){ return e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==='touch'; }
  function onWheel(e){
    e.preventDefault();
    const dz = -Math.sign(e.deltaY)*0.1;
    const before=state.zoom;
    state.zoom = clamp(state.zoom + dz, state.minZoom, state.maxZoom);
    if(state.zoom!==before) writeHUD('Zoom', state.zoom.toFixed(2)+'x');
  }
  function onPointerDown(e){
    if(!isPrimary(e)) return;
    try{ state.canvas.setPointerCapture(e.pointerId); }catch{}
    const {x,y}=toWorld(e.clientX*state.DPR, e.clientY*state.DPR);

    if(state.tool==='pointer'){
      state.isPanning=true; state.panStartX=e.clientX; state.panStartY=e.clientY;
      state.camStartX=state.camX; state.camStartY=state.camY;
    } else if(state.tool==='road'){
      if(!state.roadStart) startRoad(x,y); else finishRoad(x,y);
    } else if(state.tool==='hq'){
      addBuilding(B.HQ, x,y);
    } else if(state.tool==='woodcutter'){
      addBuilding(B.WC, x,y);
    } else if(state.tool==='depot'){
      addBuilding(B.DEPOT, x,y);
    } else if(state.tool==='erase'){
      tryErase(x,y);
    }
  }
  function onPointerMove(e){
    if(state.isPanning && state.tool==='pointer'){
      e.preventDefault();
      const dx=(e.clientX-state.panStartX)/state.zoom, dy=(e.clientY-state.panStartY)/state.zoom;
      state.camX = state.camStartX - dx;
      state.camY = state.camStartY - dy;
    }
  }
  function onPointerUp(e){
    state.isPanning=false;
    try{ state.canvas.releasePointerCapture(e.pointerId); }catch{}
  }

  // ====== HUD / API ======
  function writeHUD(k,v){ state.onHUD?.(k,v); }
  function setTool(name){
    state.tool=name;
    writeHUD('Tool',
      name==='pointer'?'Zeiger': name==='road'?'Straße': name==='hq'?'HQ':
      name==='woodcutter'?'Holzfäller': name==='depot'?'Depot':'Abriss'
    );
    if(name!=='road') state.roadStart=null;
  }
  function center(){ state.camX=0; state.camY=0; }
  function toggleDebug(){ state.debug=!state.debug; }

  // ====== Start / Save ======
  function startGame({canvas,onHUD,showError}){
    if(state.running) return;
    state.onHUD = onHUD || state.onHUD;
    state.showError = showError || state.showError;

    attachCanvas(canvas);
    addInput();

    // Start HQ mittig setzen
    addBuilding(B.HQ, 0, 0);

    // Erste Zahlen in HUD
    writeHUD('wood', state.res.wood|0);
    writeHUD('stone', state.res.stone|0);
    writeHUD('food', state.res.food|0);
    writeHUD('gold', state.res.gold|0);
    writeHUD('car', state.carriers.length|0);
    writeHUD('Tool','Zeiger');
    writeHUD('Zoom', state.zoom.toFixed(2)+'x');

    state.running=true;
    requestAnimationFrame(loop);
  }

  return {
    startGame,
    setTool, center, toggleDebug,
    get state(){ return state; },
  };
})();
