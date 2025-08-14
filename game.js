/* Siedler‑Mini V14.7 (mobile) — Carriers + Frame-Array-Sprites
   - Pan nur im Zeiger-Tool, Wheel-Zoom
   - Raster, Gebäude (HQ, Holzfäller, Depot), Straßen (Punkt→Punkt), Abriss
   - Produktion: Holzfäller alle 3.5s → 1 Holz (wenn via Straße mit HQ/Depot verbunden)
   - Träger mit Sprite-Animation (Frame-Array JSON). Fallback: gelber Punkt.
*/

export const game = (() => {
  // ====== Welt-Konstanten ======
  const TILE = 40;
  const GRID_COLOR  = "#1e2a3d";
  const ROAD_COLOR  = "#78d9a8";
  const HQ_COLOR    = "#43aa62";
  const WC_COLOR    = "#3f8cff";
  const DEPOT_COLOR = "#d55384";
  const TEXT_COLOR  = "#cfe3ff";

  // Träger-Sprite (Frame-Array)
  const SPRITE_IMG  = "assets/carrier_topdown_v2.png";   // <- PNG
  const SPRITE_JSON = "assets/carrier_topdown_v2.json";

  // Produktion & Laufgeschwindigkeit
  const WOOD_INTERVAL_MS = 3500;                    // 3.5 s bis Output
  const CARR_TILES_PER_SEC = 0.8;                   // deutlich langsamer
  const CARR_SPEED_PX_PER_MS = (TILE * CARR_TILES_PER_SEC) / 1000;

  // ====== State ======
  const state = {
    running: false,
    // Canvas
    canvas: null, ctx: null, DPR: 1, width: 0, height: 0,
    // Kamera
    camX: 0, camY: 0, zoom: 1, minZoom: 0.5, maxZoom: 2.5,
    // Eingabe
    pointerTool: "pointer",
    isPanning: false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Welt
    roads: [],                 // {x1,y1,x2,y2}
    buildings: [],             // {type,x,y,w,h,nextWoodTime?}
    carriers: [],              // siehe createCarrier()
    // Ressourcen
    res: { Holz:0, Stein:0, Nahrung:0, Gold:0, Traeger:0 },
    // HUD
    onHUD: (k,v)=>{},
    // Sprite
    carrierSprite: null        // {img, fw, fh, rows, cols, anim:{up,down,left,right}, frameDur}
  };

  // ====== Utils ======
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const now = ()=>performance.now();
  const snap = v => Math.round(v/TILE)*TILE;

  const setHUD = (k,v)=>state.onHUD?.(k,v);
  function syncHUD(){
    const map = {
      Holz: state.res.Holz,
      Stein: state.res.Stein,
      Nahrung: state.res.Nahrung,
      Gold: state.res.Gold,
      Traeger: state.res.Traeger,
      Tool: toolLabel(state.pointerTool),
      Zoom: `${state.zoom.toFixed(2)}x`,
    };
    for (const [k,v] of Object.entries(map)){
      setHUD(k,v);
      const el = document.querySelector(`#hud${k}`);
      if (el) el.textContent = String(v);
    }
  }

  const toWorld=(sx,sy)=>({ x:(sx/state.DPR - state.width/2)/state.zoom + state.camX,
                            y:(sy/state.DPR - state.height/2)/state.zoom + state.camY });
  const toScreen=(wx,wy)=>({ x:(wx-state.camX)*state.zoom + state.width/2,
                             y:(wy-state.camY)*state.zoom + state.height/2 });

  const isPrimary = (e)=> (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==="touch");

  function toolLabel(name){
    return name==='pointer'?'Zeiger' : name==='road'?'Straße' : name==='hq'?'HQ'
         : name==='woodcutter'?'Holzfäller' : name==='depot'?'Depot' : 'Abriss';
  }

  // ====== Canvas / Resize ======
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();
    state.zoom = 1;
    state.camX = 0; state.camY = 0;
    syncHUD();
    requestAnimationFrame(tick);
  }
  function resizeCanvas(){
    const r = state.canvas.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(r.width  * state.DPR));
    state.height = Math.max(1, Math.floor(r.height * state.DPR));
    if (state.canvas.width  !== state.width)  state.canvas.width  = state.width;
    if (state.canvas.height !== state.height) state.canvas.height = state.height;
  }

  // ====== Sprite Loader (Frame-Array bevorzugt, aber robust für andere JSONs) ======
  async function loadCarrierSprite(){
    try{
      const [img, meta] = await Promise.all([ loadImage(SPRITE_IMG), fetchJSON(SPRITE_JSON) ]);
      let fw, fh, rows=1, cols=1, frameDur=120, anim={};
      if ('frameWidth' in meta && 'frameHeight' in meta){
        fw = meta.frameWidth; fh = meta.frameHeight;
        rows = meta.rows ?? 1; cols = meta.cols ?? Math.floor(img.width/fw);
        frameDur = meta.frameDuration ?? 120;
        anim = meta.animations ?? {};
      } else if (meta.frames){ // TexturePacker-ähnlich (Fallback)
        const firstKey = Object.keys(meta.frames)[0];
        const fr = meta.frames[firstKey];
        fw = fr.frame?.w || fr.w || fr.width || 32;
        fh = fr.frame?.h || fr.h || fr.height || 32;
        cols = Math.floor(img.width / fw);
        rows = Math.floor(img.height/ fh);
        frameDur = 120;
        anim = {
          down:  range(0,cols-1).map(i=>({x:i,y:0})),
          left:  range(0,cols-1).map(i=>({x:i,y:1})),
          right: range(0,cols-1).map(i=>({x:i,y:2})),
          up:    range(0,cols-1).map(i=>({x:i,y:3}))
        };
      } else {
        // rohes Gitter
        cols = 4; rows = 4; fw = Math.floor(img.width/cols); fh = Math.floor(img.height/rows);
        frameDur = 120;
        anim = {
          down:  range(0,cols-1).map(i=>({x:i,y:0})),
          left:  range(0,cols-1).map(i=>({x:i,y:1})),
          right: range(0,cols-1).map(i=>({x:i,y:2})),
          up:    range(0,cols-1).map(i=>({x:i,y:3}))
        };
      }
      state.carrierSprite = { img, fw, fh, rows, cols, anim, frameDur };
    }catch(err){
      console.warn("Carrier‑Sprite konnte nicht geladen werden. Fallback auf Punkte.", err);
      state.carrierSprite = null;
    }
  }
  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src = src + '?v=' + Date.now(); // Cache-Buster
    });
  }
  async function fetchJSON(url){
    const r = await fetch(url+'?v='+Date.now());
    if (!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }
  const range=(a,b)=>{const v=[];for(let i=a;i<=b;i++)v.push(i);return v;};

  // ====== Zeichnen ======
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
  function fillRectWorld(ctx, x,y,w,h, color, label){
    const p  = toScreen(x,y);
    const pw = w*state.zoom, ph = h*state.zoom;
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
  function drawCarriers(ctx, dt){
    if (!state.carriers.length) return;
    const spr = state.carrierSprite;
    if (!spr){
      ctx.save(); ctx.fillStyle="#ffcc00";
      for (const c of state.carriers){
        const p=toScreen(c.x,c.y);
        ctx.beginPath();
        ctx.arc(p.x*state.DPR, p.y*state.DPR, 5*state.zoom*state.DPR, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    const {img, fw, fh, anim, frameDur} = spr;
    for (const c of state.carriers){
      // Richtung wählen
      const vx = c.tx - c.x, vy = c.ty - c.y;
      const ax = Math.abs(vx), ay = Math.abs(vy);
      let dir = "down";
      if (ax > ay) dir = vx >= 0 ? "right" : "left";
      else         dir = vy >= 0 ? "down"  : "up";
      // Animation
      c.animTime = (c.animTime||0) + dt;
      if (!c.animFrame) c.animFrame = 0;
      if (c.animTime >= frameDur){
        c.animTime -= frameDur;
        const len = (anim[dir]?.length)||1;
        c.animFrame = (c.animFrame+1) % len;
      }
      const fr = (anim[dir] && anim[dir][c.animFrame]) || {x:0,y:0};
      const sx = fr.x*fw, sy = fr.y*fh;
      const p  = toScreen(c.x,c.y);
      const scale = Math.max(0.9, state.zoom);
      const dw = fw*scale, dh=fh*scale;
      state.ctx.drawImage(img, sx,sy,fw,fh,
        (p.x - dw/2)*state.DPR, (p.y - dh/2)*state.DPR, dw*state.DPR, dh*state.DPR);
    }
  }
  function drawWorld(dt){
    const ctx = state.ctx;
    ctx.clearRect(0,0,state.width, state.height);
    drawGrid(ctx);
    for (const r of state.roads) drawRoad(ctx,r);
    for (const b of state.buildings){
      const color = b.type==="hq"?HQ_COLOR : b.type==="woodcutter"?WC_COLOR : DEPOT_COLOR;
      const label = b.type==="hq"?"HQ" : b.type==="woodcutter"?"Holzfäller" : "Depot";
      fillRectWorld(ctx, b.x,b.y, b.w,b.h, color, label);
    }
    drawCarriers(ctx, dt);
  }

  // ====== Straße & Abriss ======
  let roadStart = null;
  function placeOrFinishRoad(wx,wy){
    const gx = snap(wx), gy = snap(wy);
    if (!roadStart){ roadStart = {x:gx,y:gy}; return; }
    const seg = { x1: roadStart.x, y1: roadStart.y, x2: gx, y2: gy };
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) state.roads.push(seg);
    roadStart = null;
  }
  function tryErase(wx,wy){
    for (let i=state.buildings.length-1;i>=0;i--){
      const b = state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ state.buildings.splice(i,1); return true; }
    }
    const hit = 6 / state.zoom;
    for (let i=state.roads.length-1;i>=0;i--){
      const r=state.roads[i];
      if (pointToSegmentDist(wx,wy, r.x1,r.y1,r.x2,r.y2) <= hit){ state.roads.splice(i,1); return true; }
    }
    return false;
  }
  function pointToSegmentDist(px,py,x1,y1,x2,y2){
    const A=px-x1,B=py-y1,C=x2-x1,D=y2-y1;
    const dot=A*C+B*D,len2=C*C+D*D;
    let t=len2?(dot/len2):0; t=clamp(t,0,1);
    const x=x1+t*C,y=y1+t*D;
    return Math.hypot(px-x,py-y);
  }

  // ====== Gebäude ======
  function placeBuilding(type, wx, wy){
    const b={ type, x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2 };
    if (type==="woodcutter") b.nextWoodTime = now() + WOOD_INTERVAL_MS;
    state.buildings.push(b);
  }

  // ====== Straßen-Graph / Konnektivität ======
  const gKey=(x,y)=>`${x}|${y}`;
  function buildRoadGraph(){
    const g=new Map();
    const add=(x,y)=>{const k=gKey(x,y); if(!g.has(k)) g.set(k,new Set()); return k;};
    const link=(a,b)=>{g.get(a).add(b); g.get(b).add(a);};
    for (const r of state.roads){
      const x1=snap(r.x1),y1=snap(r.y1),x2=snap(r.x2),y2=snap(r.y2);
      const a=add(x1,y1), b=add(x2,y2); link(a,b);
    }
    return g;
  }
  function hasRoadPath(ax,ay,bx,by){
    const g=buildRoadGraph();
    const s=gKey(snap(ax),snap(ay)), t=gKey(snap(bx),snap(by));
    if(!g.has(s)||!g.has(t)) return false;
    const q=[s], seen=new Set([s]);
    while(q.length){
      const k=q.shift();
      if(k===t) return true;
      for(const n of g.get(k)) if(!seen.has(n)){seen.add(n); q.push(n);}
    }
    return false;
  }

  // ====== Träger / Produktion ======
  function createCarrier(from,to){
    return {
      x: from.x, y: from.y,
      tx: to.x,  ty: to.y,
      speed: CARR_SPEED_PX_PER_MS,
      hasWood: true,
      origin: {x:from.x,y:from.y},
      alive: true,
      animTime: 0,
      animFrame: 0
    };
  }
  function spawnCarrier(from,to){
    state.carriers.push(createCarrier(from,to));
    state.res.Traeger = Math.max(1, state.carriers.length);
    syncHUD();
  }
  function updateCarriers(dt){
    for (const c of state.carriers){
      if (!c.alive) continue;
      const dx=c.tx-c.x, dy=c.ty-c.y;
      const dist=Math.hypot(dx,dy);
      const step=c.speed*dt;
      if (dist<=step){
        c.x=c.tx; c.y=c.ty;
        if (c.hasWood){ // abliefern → Holz++
          state.res.Holz += 1;
          syncHUD();
          c.hasWood=false;
          c.tx=c.origin.x; c.ty=c.origin.y; // zurück
        } else {
          c.alive=false; // fertig
        }
      } else {
        c.x += (dx/dist)*step;
        c.y += (dy/dist)*step;
      }
    }
    state.carriers = state.carriers.filter(c=>c.alive);
    state.res.Traeger = state.carriers.length;
  }
  function updateProduction(){
    const sinks = state.buildings.filter(b=>b.type==="hq"||b.type==="depot");
    if (!sinks.length) return;
    for (const b of state.buildings){
      if (b.type!=="woodcutter") continue;
      if (!b.nextWoodTime) b.nextWoodTime = now() + WOOD_INTERVAL_MS;
      if (now() >= b.nextWoodTime){
        // erstes verbundenes HQ/Depot ansteuern
        let target=null;
        for (const t of sinks){ if (hasRoadPath(b.x,b.y,t.x,t.y)){ target=t; break; } }
        if (target) spawnCarrier(b,target);
        b.nextWoodTime = now() + WOOD_INTERVAL_MS;
      }
    }
  }

  // ====== Input ======
  function addInput(){
    const el = state.canvas;
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
    const delta = -Math.sign(e.deltaY)*0.10;
    const before = state.zoom;
    state.zoom = clamp(state.zoom + delta, state.minZoom, state.maxZoom);
    if (state.zoom !== before) syncHUD();
  }
  function onPointerDown(e){
    if (!isPrimary(e)) return;
    try{ state.canvas.setPointerCapture(e.pointerId); }catch{}
    const {x,y} = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);
    if (state.pointerTool==="pointer"){
      state.isPanning=true;
      state.panStartX=e.clientX; state.panStartY=e.clientY;
      state.camStartX=state.camX; state.camStartY=state.camY;
    } else if (state.pointerTool==="road"){
      placeOrFinishRoad(x,y);
    } else if (state.pointerTool==="hq"){
      placeBuilding("hq",x,y);
    } else if (state.pointerTool==="woodcutter"){
      placeBuilding("woodcutter",x,y);
    } else if (state.pointerTool==="depot"){
      placeBuilding("depot",x,y);
    } else if (state.pointerTool==="erase"){
      tryErase(x,y);
    }
  }
  function onPointerMove(e){
    if (state.isPanning && state.pointerTool==="pointer"){
      e.preventDefault();
      const dx=(e.clientX-state.panStartX)/state.zoom;
      const dy=(e.clientY-state.panStartY)/state.zoom;
      state.camX=state.camStartX - dx;
      state.camY=state.camStartY - dy;
    }
  }
  function onPointerUp(e){
    state.isPanning=false;
    try{ state.canvas.releasePointerCapture(e.pointerId); }catch{}
  }

  // ====== Loop ======
  let lastT=0;
  function tick(t){
    if (!lastT) lastT=t;
    const dt=t-lastT; lastT=t;
    if (state.running){
      updateProduction();
      updateCarriers(dt);
    }
    drawWorld(dt);
    requestAnimationFrame(tick);
  }

  // ====== API ======
  function setTool(name){
    state.pointerTool=name;
    if (name!=="road") roadStart=null;
    syncHUD();
  }
  function center(){ state.camX=0; state.camY=0; }
  async function startGame(opts){
    if (state.running) return;
    state.onHUD = (k,v)=>{ if (opts && typeof opts.onHUD==="function") opts.onHUD(k,v); };
    attachCanvas(opts.canvas);
    addInput();
    setTool("pointer");
    syncHUD();
    loadCarrierSprite(); // asynchron, Spiel läuft weiter
    state.running=true;
  }

  return { startGame, setTool, center, get state(){ return state; } };
})();
