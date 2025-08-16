// Siedler‑Mini V15.0 (Mobile)
// Fixes: korrekte World-Koords (kein DPR-Doppel), Pan nur im Zeiger-Tool, sanftere Pan-Geschw.,
// Pinch+Wheel Zoom fokusiert auf Zeiger/Finger, iOS Fullscreen-Fallback, HQ mittig, Road ohne Versatz.

export const game = (() => {
  // --- Konstante ---
  const TILE = 40;
  const GRID_COLOR = "#1e2a3d";
  const ROAD_COLOR = "#78d9a8";
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";

  // --- State ---
  const S = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.6, maxZoom:2.8,
    pointerTool:"pointer",
    // Pan
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    panSpeed:1.0, // 1.0 = direkt; <1 = langsamer
    // Pinch
    pointers:new Map(), // id -> {x,y}
    // Welt
    roads:[],         // {x1,y1,x2,y2}
    buildings:[],     // {type,x,y,w,h}
    // HUD/Debug
    onHUD:(k,v)=>{}, onDebug:(s)=>{},
    showDebug:false,
    dbgText:"",
  };

  // --- Utils ---
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const roundTile = (v)=>Math.round(v/TILE)*TILE;

  function toWorld(cssX, cssY){ // css px rein!
    // Screen‑Mitte → Welt (kein DPR hier!)
    const x = (cssX - S.width/(2*S.DPR)) / (S.zoom) + S.camX;
    const y = (cssY - S.height/(2*S.DPR)) / (S.zoom) + S.camY;
    return {x,y};
  }
  function toScreen(wx,wy){
    const sx = (wx - S.camX) * S.zoom + S.width/(2*S.DPR);
    const sy = (wy - S.camY) * S.zoom + S.height/(2*S.DPR);
    return {x:sx, y:sy};
  }

  function setHUD(k,v){ S.onHUD?.(k,v); }
  function setDebug(str){ S.dbgText = str; if (S.showDebug) S.onDebug?.(str); }

  // --- Canvas/Resize ---
  function attachCanvas(canvas){
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    resizeCanvas();
    S.zoom = 1.0;
    S.camX = 0; S.camY = 0;
    writeZoom();
    requestAnimationFrame(loop);
  }
  function resizeCanvas(){
    const r = S.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width * S.DPR));
    const h = Math.max(1, Math.floor(r.height* S.DPR));
    if (w!==S.width || h!==S.height){
      S.width = w; S.height = h;
      S.canvas.width = w; S.canvas.height = h;
    }
  }

  // --- Zeichnen ---
  function drawGrid(){
    const ctx = S.ctx;
    ctx.save();
    ctx.clearRect(0,0,S.width,S.height);
    // Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const step = TILE * S.zoom * S.DPR;
    const ox = (S.width/2 - (S.camX*S.zoom)*S.DPR) % step;
    const oy = (S.height/2 - (S.camY*S.zoom)*S.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=S.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,S.height); }
    for (let y=oy; y<=S.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(S.width,y); }
    ctx.stroke();

    // Roads
    ctx.lineCap="round";
    ctx.strokeStyle = ROAD_COLOR;
    ctx.lineWidth = 3 * S.zoom * S.DPR;
    for (const r of S.roads){
      const a = toScreen(r.x1,r.y1), b = toScreen(r.x2,r.y2);
      ctx.beginPath();
      ctx.moveTo(a.x*S.DPR, a.y*S.DPR);
      ctx.lineTo(b.x*S.DPR, b.y*S.DPR);
      ctx.stroke();
    }

    // Buildings
    for (const b of S.buildings){
      const col = b.type==='hq'?HQ_COLOR: b.type==='woodcutter'?WC_COLOR: DEPOT_COLOR;
      drawRectWorld(b.x,b.y,b.w,b.h,col, b.type==='hq'?'HQ':b.type==='woodcutter'?'Holzfäller':'Depot');
    }

    // Debug
    if (S.showDebug){
      setDebug(
        `DPR ${S.DPR.toFixed(2)}\n`+
        `W ${Math.round(S.width/S.DPR)}×${Math.round(S.height/S.DPR)} css\n`+
        `cam (${S.camX.toFixed(1)}, ${S.camY.toFixed(1)}) z=${S.zoom.toFixed(2)}\n`+
        `roads ${S.roads.length} buildings ${S.buildings.length}`
      );
    }
    ctx.restore();
  }

  function drawRectWorld(cx,cy,w,h,color,label){
    const ctx = S.ctx;
    const p = toScreen(cx,cy);
    const ww = w*S.zoom*S.DPR, hh = h*S.zoom*S.DPR;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect((p.x*S.DPR)-ww/2, (p.y*S.DPR)-hh/2, ww, hh);
    if (label){
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*S.DPR*S.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(label, p.x*S.DPR, (p.y*S.DPR)-4*S.DPR);
    }
    ctx.restore();
  }

  function loop(){
    if (!S.running){ drawGrid(); return requestAnimationFrame(loop); }
    drawGrid();
    requestAnimationFrame(loop);
  }

  // --- Build & Erase ---
  let roadStart = null;
  function placeOrFinishRoad(wx,wy){
    const gx = roundTile(wx), gy = roundTile(wy);
    if (!roadStart){ roadStart = {x:gx,y:gy}; return; }
    const seg = {x1:roadStart.x,y1:roadStart.y,x2:gx,y2:gy};
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) S.roads.push(seg);
    roadStart = null;
  }

  function placeBuilding(type, wx,wy){
    const x = roundTile(wx), y = roundTile(wy);
    S.buildings.push({type, x, y, w:TILE*2, h:TILE*2});
  }

  function tryErase(wx,wy){
    // Gebäude
    for (let i=S.buildings.length-1;i>=0;i--){
      const b=S.buildings[i], x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ S.buildings.splice(i,1); return true; }
    }
    // Straßen (Schlauch-Hitbox)
    const hit = 6 / S.zoom; // ~6px
    for (let i=S.roads.length-1;i>=0;i--){
      const r=S.roads[i];
      if (distPointSeg(wx,wy,r.x1,r.y1,r.x2,r.y2)<=hit){ S.roads.splice(i,1); return true; }
    }
    return false;
  }
  function distPointSeg(px,py,x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot=A*C+B*D, len2=C*C+D*D; let t=len2?(dot/len2):-1; t=clamp(t,0,1);
    const x=x1+t*C, y=y1+t*D; return Math.hypot(px-x,py-y);
  }

  // --- Input ---
  function addInput(){
    const el = S.canvas;
    // Pointer
    el.addEventListener('pointerdown', onPointerDown, {passive:false});
    el.addEventListener('pointermove', onPointerMove, {passive:false});
    el.addEventListener('pointerup', onPointerUp, {passive:false});
    el.addEventListener('pointercancel', onPointerUp, {passive:false});
    // Wheel
    el.addEventListener('wheel', onWheel, {passive:false});
    // Resize / Orientation / FS
    window.addEventListener('resize', ()=>{ resizeCanvas(); });
    window.addEventListener('orientationchange', ()=>setTimeout(resizeCanvas, 250));
    document.addEventListener('fullscreenchange', resizeCanvas);
    document.addEventListener('webkitfullscreenchange', resizeCanvas);
  }

  function onWheel(e){
    e.preventDefault();
    const pointer = { x:e.clientX, y:e.clientY };
    const beforeWorld = toWorld(pointer.x, pointer.y);
    const delta = -Math.sign(e.deltaY) * 0.1;
    const old = S.zoom;
    S.zoom = clamp(S.zoom + delta, S.minZoom, S.maxZoom);
    if (S.zoom !== old){
      const afterWorld = toWorld(pointer.x, pointer.y);
      S.camX += (beforeWorld.x - afterWorld.x);
      S.camY += (beforeWorld.y - afterWorld.y);
      writeZoom();
    }
  }

  function writeZoom(){ setHUD('Zoom', `${S.zoom.toFixed(2)}x`); }

  function isPrimary(e){ return (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==='touch'); }

  function onPointerDown(e){
    if (!isPrimary(e)) return;
    try{ S.canvas.setPointerCapture(e.pointerId); }catch{}
    S.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    if (S.pointers.size>=2){
      // Pinch start: nichts setzen, live im move berechnen
      return;
    }

    // Single‑Pointer
    const {x,y} = toWorld(e.clientX, e.clientY);
    if (S.pointerTool==='pointer'){
      S.isPanning = true;
      S.panStartX = e.clientX; S.panStartY = e.clientY;
      S.camStartX = S.camX; S.camStartY = S.camY;
    } else if (S.pointerTool==='road'){
      placeOrFinishRoad(x,y);
    } else if (S.pointerTool==='hq'){
      placeBuilding('hq', x,y);
    } else if (S.pointerTool==='woodcutter'){
      placeBuilding('woodcutter', x,y);
    } else if (S.pointerTool==='depot'){
      placeBuilding('depot', x,y);
    } else if (S.pointerTool==='erase'){
      tryErase(x,y);
    }
  }

  function onPointerMove(e){
    if (!S.pointers.has(e.pointerId)) return;
    S.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    // Pinch?
    if (S.pointers.size>=2){
      const pts = Array.from(S.pointers.values());
      const c0=pts[0], c1=pts[1];
      const cx = (c0.x + c1.x)/2, cy=(c0.y + c1.y)/2;
      const d = Math.hypot(c1.x-c0.x, c1.y-c0.y);
      if (!S._pinchPrev){
        S._pinchPrev = {d, cx, cy};
        return;
      }
      const dd = d - S._pinchPrev.d;
      if (Math.abs(dd)>0){
        const before = toWorld(cx,cy);
        const old = S.zoom;
        S.zoom = clamp(S.zoom + (dd/300), S.minZoom, S.maxZoom);
        if (S.zoom !== old){
          const after = toWorld(cx,cy);
          S.camX += (before.x - after.x);
          S.camY += (before.y - after.y);
          writeZoom();
        }
      }
      S._pinchPrev = {d, cx, cy};
      return;
    }

    // Pan nur im Zeiger‑Tool
    if (S.isPanning && S.pointerTool==='pointer'){
      e.preventDefault();
      const dx = (e.clientX - S.panStartX) / S.zoom;
      const dy = (e.clientY - S.panStartY) / S.zoom;
      const f = 0.9*S.panSpeed; // etwas sanfter
      S.camX = S.camStartX - dx*f;
      S.camY = S.camStartY - dy*f;
    }
  }

  function onPointerUp(e){
    try{ S.canvas.releasePointerCapture(e.pointerId); }catch{}
    S.pointers.delete(e.pointerId);
    if (S.pointers.size<2) S._pinchPrev = null;
    S.isPanning = false;
  }

  // --- API ---
  function setTool(name){
    S.pointerTool = name;
    if (name!=='road') roadStart = null;
    setHUD('Tool', name==='pointer'?'Zeiger':
                 name==='road'?'Straße':
                 name==='hq'?'HQ':
                 name==='woodcutter'?'Holzfäller':
                 name==='depot'?'Depot':'Abriss');
  }

  function center(){
    // Auf erstes HQ zentrieren, sonst 0/0
    const hq = S.buildings.find(b=>b.type==='hq');
    if (hq){ S.camX = hq.x; S.camY = hq.y; }
    else { S.camX=0; S.camY=0; }
  }

  function toggleDebug(){
    S.showDebug = !S.showDebug;
    if (!S.showDebug) S.onDebug?.('');
    else setDebug(S.dbgText);
  }

  function startGame(opts){
    if (S.running) return;
    if (opts?.onHUD) S.onHUD = opts.onHUD;
    if (opts?.onDebug) S.onDebug = opts.onDebug;

    attachCanvas(opts.canvas);
    addInput();

    // Welt initialisieren: 1 HQ in der Mitte
    S.buildings.length = 0;
    S.roads.length = 0;
    S.buildings.push({type:'hq', x:0, y:0, w:TILE*2, h:TILE*2});
    center();

    setTool('pointer');
    writeZoom();
    S.running = true;
  }

  return {
    startGame,
    setTool,
    center,
    toggleDebug,
    get state(){ return S; }
  };
})();
