// V15 game.js – korrektes Screen→World Mapping, Pan/Zoom, Bauen ohne Versatz
export const game = (() => {
  const TILE = 64;

  const state = {
    running:false,
    // Canvas/Context
    canvas:null, ctx:null,
    dpr:1, width:0, height:0,
    // Kamera (World-Koordinaten)
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5,
    // Eingabe
    tool:'pointer',
    panning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Welt
    roads:[], // Segmente: {x1,y1,x2,y2}
    buildings:[], // {type,x,y,w,h}
    // HUD Callback
    onHUD: (k,v)=>{},
  };

  // ----- API -----
  function start(canvas, opts){
    if (state.running) return;
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    if (opts && typeof opts.onHUD === 'function') state.onHUD = opts.onHUD;

    // Startkamera/Zoom
    state.zoom = 1.0;
    writeHUD('Zoom', `${state.zoom.toFixed(2)}x`);

    addInput();
    // Erstes HQ mittig
    center();
    placeBuilding('hq', 0, 0);

    state.running = true;
    requestAnimationFrame(tick);
  }

  function resize(w,h,dpr){
    state.width = w; state.height = h; state.dpr = dpr || 1;
  }

  function center(){
    state.camX = 0;
    state.camY = 0;
  }

  function setTool(name){
    state.tool = name;
    writeHUD('Tool',
      name==='pointer' ? 'Zeiger' :
      name==='road' ? 'Straße' :
      name==='hq' ? 'HQ' :
      name==='woodcutter' ? 'Holzfäller' :
      name==='depot' ? 'Depot' : 'Abriss'
    );
  }

  // ----- Drawing -----
  function clear(){
    state.ctx.clearRect(0,0,state.width, state.height);
  }

  function drawGrid(){
    const ctx = state.ctx;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e2a3d';

    // Abstand im Screenraum:
    const step = TILE * state.zoom * state.dpr;

    // Offset: wo liegt Welt (0,0) im Screen?
    // ScreenX = (worldX - camX) * zoom + width/2   → in DPR multiplizieren
    const originX = ( - state.camX) * state.zoom * state.dpr + state.width/2;
    const originY = ( - state.camY) * state.zoom * state.dpr + state.height/2;

    // Modulo auf step
    let ox = originX % step; if (ox<0) ox += step;
    let oy = originY % step; if (oy<0) oy += step;

    ctx.beginPath();
    for (let x=ox; x<=state.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.height); }
    for (let y=oy; y<=state.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function worldToScreen(wx, wy){
    // Screen ohne DPR: s = (w - cam)*zoom + size/2
    const sx = (wx - state.camX) * state.zoom + (state.width/state.dpr)/2;
    const sy = (wy - state.camY) * state.zoom + (state.height/state.dpr)/2;
    // Danach auf DPR hochskalieren für Canvas-Pixel
    return { x: sx*state.dpr, y: sy*state.dpr };
  }

  function screenToWorld(clientX, clientY){
    // clientX/Y → CSS‑Pixel im Canvas. Erst in Canvas‑Pixel (DPR) umrechnen:
    const rect = state.canvas.getBoundingClientRect();
    const xCSS = clientX - rect.left;
    const yCSS = clientY - rect.top;

    // zurück nach „unskaliert“ (wir malen intern in DPR‑Pixeln, Koords hier in Welt):
    const sx = xCSS; // in CSS‑Pixel
    const sy = yCSS;

    // invert: wx = ((sx/dpr) - width/dpr/2)/zoom + camX
    const wx = ((sx) - (state.width/state.dpr)/2) / state.zoom + state.camX;
    const wy = ((sy) - (state.height/state.dpr)/2) / state.zoom + state.camY;

    return { wx, wy };
  }

  function drawRoad(r){
    const ctx = state.ctx;
    const a = worldToScreen(r.x1, r.y1);
    const b = worldToScreen(r.x2, r.y2);
    ctx.save();
    ctx.strokeStyle = '#78d9a8';
    ctx.lineWidth = 3 * state.zoom * state.dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function fillRectWorld(wx, wy, w, h, color, label){
    const ctx = state.ctx;
    const p = worldToScreen(wx, wy);
    const ww = w * state.zoom * state.dpr;
    const hh = h * state.zoom * state.dpr;

    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(p.x - ww/2, p.y - hh/2, ww, hh);

    if (label){
      ctx.fillStyle = '#cfe3ff';
      ctx.font = `${Math.round(12*state.dpr*state.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, p.x, p.y - hh/2 - 4*state.dpr);
    }
    ctx.restore();
  }

  function draw(){
    clear();
    drawGrid();
    // Straßen
    for (const r of state.roads) drawRoad(r);
    // Gebäude
    for (const b of state.buildings){
      const color =
        b.type==='hq' ? '#43aa62' :
        b.type==='woodcutter' ? '#3f8cff' :
        b.type==='depot' ? '#d55384' : '#888';
      const label =
        b.type==='hq' ? 'HQ' :
        b.type==='woodcutter' ? 'Holzfäller' :
        b.type==='depot' ? 'Depot' : b.type;
      fillRectWorld(b.x, b.y, b.w, b.h, color, label);
    }
  }

  function tick(){
    if (!state.running) return;
    draw();
    requestAnimationFrame(tick);
  }

  // ----- Build -----
  const snap = (v)=>Math.round(v / TILE) * TILE;

  function placeBuilding(type, wx, wy){
    const b = { type, x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2 };
    state.buildings.push(b);
  }

  let roadStart = null;
  function placeOrFinishRoad(wx, wy){
    const gx = snap(wx), gy = snap(wy);
    if (!roadStart){ roadStart = {x:gx,y:gy}; return; }
    const seg = { x1: roadStart.x, y1: roadStart.y, x2: gx, y2: gy };
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) state.roads.push(seg);
    roadStart = null;
  }

  function tryErase(wx, wy){
    // Gebäude hit
    for (let i=state.buildings.length-1;i>=0;i--){
      const b=state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ state.buildings.splice(i,1); return true; }
    }
    // Straßen hit (Abstand zur Strecke)
    const hit = 6 / state.zoom;
    for (let i=state.roads.length-1;i>=0;i--){
      const r=state.roads[i];
      if (pointSegDist(wx,wy,r.x1,r.y1,r.x2,r.y2) <= hit){ state.roads.splice(i,1); return true; }
    }
    return false;
  }

  function pointSegDist(px,py,x1,y1,x2,y2){
    const A=px-x1,B=py-y1,C=x2-x1,D=y2-y1;
    const dot=A*C+B*D, len=C*C+D*D;
    let t=len?dot/len:0; t=Math.max(0,Math.min(1,t));
    const x=x1+t*C,y=y1+t*D; return Math.hypot(px-x,py-y);
  }

  // ----- Input -----
  function addInput(){
    const el = state.canvas;
    el.addEventListener('pointerdown', onPointerDown, {passive:false});
    el.addEventListener('pointermove', onPointerMove, {passive:false});
    el.addEventListener('pointerup', onPointerUp, {passive:false});
    el.addEventListener('pointercancel', onPointerUp, {passive:false});
    el.addEventListener('wheel', onWheel, {passive:false});
  }

  function onWheel(e){
    e.preventDefault();
    const d = -Math.sign(e.deltaY) * 0.1;
    const before = state.zoom;
    state.zoom = clamp(state.zoom + d, state.minZoom, state.maxZoom);
    if (state.zoom !== before) writeHUD('Zoom', `${state.zoom.toFixed(2)}x`);
  }

  function onPointerDown(e){
    // Pointer capture
    try { state.canvas.setPointerCapture(e.pointerId); } catch {}
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);

    if (state.tool === 'pointer'){
      state.panning = true;
      state.panStartX = e.clientX;
      state.panStartY = e.clientY;
      state.camStartX = state.camX;
      state.camStartY = state.camY;
    } else if (state.tool === 'road'){
      placeOrFinishRoad(wx, wy);
    } else if (state.tool === 'hq'){
      placeBuilding('hq', wx, wy);
    } else if (state.tool === 'woodcutter'){
      placeBuilding('woodcutter', wx, wy);
    } else if (state.tool === 'depot'){
      placeBuilding('depot', wx, wy);
    } else if (state.tool === 'erase'){
      tryErase(wx, wy);
    }
  }

  function onPointerMove(e){
    if (!state.panning) return;
    if (state.tool !== 'pointer') return;
    e.preventDefault();
    const dxCSS = (e.clientX - state.panStartX);
    const dyCSS = (e.clientY - state.panStartY);
    // pro Zoom bewegen
    state.camX = state.camStartX - (dxCSS / state.zoom);
    state.camY = state.camStartY - (dyCSS / state.zoom);
  }

  function onPointerUp(e){
    state.panning = false;
    try { state.canvas.releasePointerCapture(e.pointerId); } catch {}
  }

  // ----- Util -----
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  function writeHUD(k,v){ state.onHUD?.(k,v); }

  // ----- Exports -----
  return {
    start, resize, center, setTool
  };
})();
