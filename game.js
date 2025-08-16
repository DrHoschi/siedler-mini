// Siedler‑Mini V15.1 – Kernspiel (Touch‑first, Pinch‑Zoom, Pan im Zeiger‑Tool)
export const game = (() => {
  // ====== Konstanten ======
  const TILE = 40;                   // Basis‑Tilegröße (Weltkoordinate)
  const GRID_COLOR  = "#1e2a3d";
  const ROAD_COLOR  = "#78d9a8";
  const HQ_COLOR    = "#43aa62";
  const WC_COLOR    = "#3f8cff";
  const DEPOT_COLOR = "#d55384";
  const TEXT_COLOR  = "#cfe3ff";

  // ====== State ======
  const S = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    // Kamera
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5,
    // Eingabe
    tool:"pointer",
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Pinch
    pointers:new Map(), pinchStartDist:0, pinchStartZoom:1, pinchCenter={x:0,y:0},
    // Welt
    roads:[],             // {x1,y1,x2,y2}
    buildings:[],         // {type,x,y,w,h}
    // Callbacks
    onHUD:null,
    onDebug:null,
  };

  // ====== Utils ======
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const snap  = v => Math.round(v/TILE)*TILE;

  function setHUD(k,v){ S.onHUD && S.onHUD(k,v); }
  function dbg(obj){ S.onDebug && S.onDebug(obj); }

  // Screen<->World
  function toWorld(sx,sy){
    const px = sx/S.DPR, py = sy/S.DPR;
    return {
      x: (px - S.width/2)/S.zoom + S.camX,
      y: (py - S.height/2)/S.zoom + S.camY
    };
  }
  function toScreen(wx,wy){
    return {
      x: (wx - S.camX)*S.zoom + S.width/2,
      y: (wy - S.camY)*S.zoom + S.height/2
    };
  }

  // ====== Setup/Resize ======
  function attachCanvas(canvas){
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    resizeCanvas();
    // Startzustand Kamera
    S.zoom = 1.0;
    S.camX = 0; S.camY = 0;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    // Erstes HQ setzen
    ensureInitialHQ();
    requestAnimationFrame(tick);
  }

  function resizeCanvas(){
    const rect = S.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width  * S.DPR));
    const h = Math.max(1, Math.floor(rect.height * S.DPR));
    if (S.canvas.width !== w || S.canvas.height !== h){
      S.canvas.width = w; S.canvas.height = h;
    }
    S.width = w; S.height = h;
  }

  function ensureInitialHQ(){
    if (!S.buildings.some(b=>b.type==='hq')){
      S.buildings.push({type:'hq', x:0, y:0, w:TILE*2, h:TILE*2});
    }
  }

  // ====== Zeichnen ======
  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const step = TILE * S.zoom * S.DPR;
    const ox = (S.width/2  - (S.camX*S.zoom)*S.DPR) % step;
    const oy = (S.height/2 - (S.camY*S.zoom)*S.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=S.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,S.height); }
    for (let y=oy; y<=S.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(S.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function fillRectWorld(ctx, x,y,w,h, color, label){
    const p = toScreen(x,y);
    const pw = w*S.zoom*S.DPR, ph = h*S.zoom*S.DPR;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(p.x*S.DPR - pw/2, p.y*S.DPR - ph/2, pw, ph);
    if (label){
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*S.DPR*S.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(label, p.x*S.DPR, p.y*S.DPR - 4*S.DPR);
    }
    ctx.restore();
  }

  function drawRoad(ctx, r){
    const a = toScreen(r.x1,r.y1), b = toScreen(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle = ROAD_COLOR;
    ctx.lineWidth = 3*S.zoom*S.DPR;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x*S.DPR, a.y*S.DPR);
    ctx.lineTo(b.x*S.DPR, b.y*S.DPR);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorld(){
    const ctx = S.ctx;
    ctx.save();
    ctx.clearRect(0,0,S.width,S.height);
    drawGrid(ctx);
    for (const r of S.roads) drawRoad(ctx,r);
    for (const b of S.buildings){
      const color = b.type==='hq' ? HQ_COLOR : b.type==='woodcutter' ? WC_COLOR : DEPOT_COLOR;
      const label = b.type==='hq' ? 'HQ' : b.type==='woodcutter' ? 'Holzfäller' : 'Depot';
      fillRectWorld(ctx, b.x,b.y,b.w,b.h, color, label);
    }
    ctx.restore();
  }

  function tick(){
    drawWorld();
    requestAnimationFrame(tick);
  }

  // ====== Build / Erase ======
  function placeBuilding(type, wx, wy){
    S.buildings.push({ type, x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2 });
  }
  function pointToSegmentDist(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot = A*C + B*D, len2 = C*C + D*D;
    let t = len2 ? (dot/len2) : -1; t = clamp(t,0,1);
    const x = x1 + t*C, y = y1 + t*D;
    return Math.hypot(px-x,py-y);
  }
  function tryErase(wx,wy){
    // Gebäude
    for (let i=S.buildings.length-1;i>=0;i--){
      const b=S.buildings[i], x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ S.buildings.splice(i,1); return true; }
    }
    // Straßen
    const hit = 6 / S.zoom;
    for (let i=S.roads.length-1;i>=0;i--){
      const r=S.roads[i]; if (pointToSegmentDist(wx,wy,r.x1,r.y1,r.x2,r.y2)<=hit){ S.roads.splice(i,1); return true; }
    }
    return false;
  }
  let roadStart = null;
  function placeOrFinishRoad(wx,wy){
    const gx=snap(wx), gy=snap(wy);
    if (!roadStart){ roadStart={x:gx,y:gy}; return; }
    const seg={x1:roadStart.x,y1:roadStart.y,x2:gx,y2:gy};
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) S.roads.push(seg);
    roadStart=null;
  }

  // ====== Eingabe ======
  function addInput(){
    const el = S.canvas;

    el.addEventListener('pointerdown', onPointerDown, {passive:false});
    el.addEventListener('pointermove', onPointerMove, {passive:false});
    el.addEventListener('pointerup', onPointerUp, {passive:false});
    el.addEventListener('pointercancel', onPointerUp, {passive:false});
    el.addEventListener('wheel', onWheel, {passive:false});

    // Resize & Orientation & FS
    window.addEventListener('resize', ()=>setTimeout(resizeCanvas,0));
    window.addEventListener('orientationchange', ()=>setTimeout(resizeCanvas,250));
    document.addEventListener('fullscreenchange', ()=>setTimeout(resizeCanvas,0));
    document.addEventListener('webkitfullscreenchange', ()=>setTimeout(resizeCanvas,0));
  }

  function onWheel(e){
    // Desktop-Scroll‑Zoom
    e.preventDefault();
    const mx = e.clientX*S.DPR, my = e.clientY*S.DPR;
    zoomAtScreenPoint(mx,my, -Math.sign(e.deltaY)*0.1);
  }

  function onPointerDown(e){
    e.preventDefault();
    S.canvas.setPointerCapture?.(e.pointerId);
    S.pointers.set(e.pointerId, {x:e.clientX*S.DPR, y:e.clientY*S.DPR});

    if (S.pointers.size === 1){
      const {x,y} = toWorld(e.clientX*S.DPR, e.clientY*S.DPR);
      if (S.tool === 'pointer'){
        S.isPanning = true;
        S.panStartX = e.clientX; S.panStartY = e.clientY;
        S.camStartX = S.camX; S.camStartY = S.camY;
      } else if (S.tool === 'road'){
        placeOrFinishRoad(x,y);
      } else if (S.tool === 'hq'){
        placeBuilding('hq', x,y);
      } else if (S.tool === 'woodcutter'){
        placeBuilding('woodcutter', x,y);
      } else if (S.tool === 'depot'){
        placeBuilding('depot', x,y);
      } else if (S.tool === 'erase'){
        tryErase(x,y);
      }
    } else if (S.pointers.size === 2){
      // Pinch Start
      const pts = [...S.pointers.values()];
      S.pinchStartDist = dist(pts[0], pts[1]);
      S.pinchStartZoom = S.zoom;
      S.pinchCenter = {
        x:(pts[0].x+pts[1].x)/2,
        y:(pts[0].y+pts[1].y)/2
      };
    }
  }

  function onPointerMove(e){
    const p = S.pointers.get(e.pointerId);
    if (p){ p.x = e.clientX*S.DPR; p.y = e.clientY*S.DPR; }

    if (S.pointers.size === 2){
      // Pinch Update
      const pts = [...S.pointers.values()];
      const d = dist(pts[0],pts[1]);
      if (S.pinchStartDist > 0){
        const factor = d / S.pinchStartDist;
        // Zoom um Mittelpunkt der Finger
        pinchZoomAround(S.pinchCenter.x, S.pinchCenter.y, S.pinchStartZoom * factor);
      }
      return;
    }

    if (S.isPanning && S.tool==='pointer'){
      e.preventDefault();
      const dx = (e.clientX - S.panStartX) / S.zoom;
      const dy = (e.clientY - S.panStartY) / S.zoom;
      // „1:1“ Gefühl → Bewegungen nicht dämpfen
      S.camX = S.camStartX - dx;
      S.camY = S.camStartY - dy;
    }
  }

  function onPointerUp(e){
    S.pointers.delete(e.pointerId);
    if (S.pointers.size < 2){
      // Pinch Ende
      S.pinchStartDist = 0;
    }
    S.isPanning = false;
    try{ S.canvas.releasePointerCapture(e.pointerId); }catch{}
  }

  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

  function pinchZoomAround(cx,cy, targetZoom){
    const beforeZoom = clamp(targetZoom, S.minZoom, S.maxZoom);
    const worldBefore = toWorld(cx,cy);
    S.zoom = beforeZoom;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    const worldAfter  = toWorld(cx,cy);
    // Kamera so korrigieren, dass der Punkt unter den Fingern „stehen bleibt“
    S.camX += (worldBefore.x - worldAfter.x);
    S.camY += (worldBefore.y - worldAfter.y);
  }

  function zoomAtScreenPoint(sx,sy, delta){
    const target = clamp(S.zoom + delta, S.minZoom, S.maxZoom);
    pinchZoomAround(sx,sy,target);
  }

  // ====== API ======
  function setTool(name){
    S.tool = name;
    if (name !== 'road') roadStart = null;
    setHUD('Tool',
      name==='pointer' ? 'Zeiger':
      name==='road' ? 'Straße':
      name==='hq' ? 'HQ':
      name==='woodcutter' ? 'Holzfäller':
      name==='depot' ? 'Depot' : 'Abriss'
    );
  }

  function center(){
    // Auf erstes HQ zentrieren, sonst (0,0)
    const hq = S.buildings.find(b=>b.type==='hq');
    const x = hq ? hq.x : 0;
    const y = hq ? hq.y : 0;
    S.camX = x; S.camY = y;
  }

  function startGame(opts){
    if (S.running) return;
    S.onHUD = opts?.onHUD || null;
    S.onDebug = opts?.onDebug || null;
    attachCanvas(opts.canvas);
    addInput();
    setTool('pointer');
    S.running = true;
    dbg({msg:'startGame', zoom:S.zoom, cam:{x:S.camX,y:S.camY}, DPR:S.DPR});
  }

  function debugSnapshot(){
    return {
      running:S.running,
      DPR:S.DPR, size:{w:S.width,h:S.height},
      cam:{x:S.camX,y:S.camY,zoom:S.zoom},
      tool:S.tool,
      roads:S.roads.length,
      buildings:S.buildings.length,
      pointers:[...S.pointers.keys()]
    };
  }

  return { startGame, setTool, center, debugSnapshot };
})();
