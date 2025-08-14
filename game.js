/* Siedler‑Mini V14.7‑hf2 (mobile)
   – Pinch‑Zoom (nur Zeiger‑Tool) + Pan
   – Klicken zum Bauen (HQ / Holzfäller / Depot / Straße Segment)
   – Abriss für Gebäude/Straßen
*/

export const game = (() => {
  // ===== Konstante Welt/Tile-Größe =====
  const TILE = 40;
  const GRID_COLOR = "#1e2a3d";
  const ROAD_COLOR = "#78d9a8";
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";

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
    buildings:[],    // {type:"hq"|"woodcutter"|"depot", x,y,w,h}
    // HUD callback
    onHUD:(k,v)=>{}
  };

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

  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
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

  // ===== Initial / Resize =====
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();

    // Startkamera
    state.zoom = 1.0; state.camX = 0; state.camY = 0;
    writeZoomHUD();

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
  }

  function tick(){
    if (!state.running){ drawWorld(); return requestAnimationFrame(tick); }
    drawWorld();
    requestAnimationFrame(tick);
  }

  // ===== Build-Logik =====
  const snap = v => Math.round(v / TILE) * TILE;

  function placeBuilding(type, wx, wy){
    const b = { type, x: snap(wx), y: snap(wy), w: TILE*2, h: TILE*2 };
    state.buildings.push(b);
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
        return true;
      }
    }
    // Straßen (Hitbox ~6px)
    const hitDist = 6 / state.zoom;
    for (let i=state.roads.length-1;i>=0;i--){
      const r = state.roads[i];
      if (pointToSegmentDist(wx,wy,r.x1,r.y1,r.x2,r.y2) <= hitDist){
        state.roads.splice(i,1); return true;
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
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) state.roads.push(seg);
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

  function writeZoomHUD(){ setHUD("Zoom", `${state.zoom.toFixed(2)}x`); }

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

    // nach Pinch kurze Blockade gegen „Geister‑Tap“
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
        const factor = d / state.pinchLastDist; // ~1.02 usw.
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
        state.tapBlockUntil = performance.now() + 150; // 150ms Tap‑Block
      }
    }
    state.isPanning = false;
    try{ state.canvas.releasePointerCapture(e.pointerId); }catch{}
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
    writeZoomHUD();
    state.running = true;
  }

  return { startGame, setTool, center, get state(){ return state; } };
})();
