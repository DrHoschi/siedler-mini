// Siedler‑Mini V15.2 – Kernspiel: stabile Eingabe, FS‑Reset, saubere Canvas‑Guards
export const game = (() => {
  const TILE = 40;
  const GRID_COLOR="#1e2a3d", ROAD_COLOR="#78d9a8", HQ_COLOR="#43aa62",
        WC_COLOR="#3f8cff", DEPOT_COLOR="#d55384", TEXT_COLOR="#cfe3ff";

  const S = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5,
    tool:'pointer',
    // Pointer/Pinch
    pointers:new Map(), isPanning:false,
    panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    pinchStartDist:0, pinchStartZoom:1, pinchCenter:{x:0,y:0},
    // Welt
    roads:[], buildings:[],
    // Callbacks
    onHUD:null, onDebug:null,
    // Profil
    profile:{ios:false,android:false,desktop:true}
  };

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const snap  = v => Math.round(v/40)*40;
  const setHUD = (k,v)=> S.onHUD && S.onHUD(k,v);
  const dbg = (o)=> S.onDebug && S.onDebug(o);

  function toWorld(sx,sy){
    const px = sx/S.DPR, py=sy/S.DPR;
    return { x:(px - S.width/2)/S.zoom + S.camX, y:(py - S.height/2)/S.zoom + S.camY };
  }
  function toScreen(wx,wy){ return { x:(wx-S.camX)*S.zoom + S.width/2, y:(wy-S.camY)*S.zoom + S.height/2 }; }

  function attachCanvas(canvas){
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d', {alpha:true, desynchronized:true});
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    resizeNow();
    S.zoom = 1; S.camX=0; S.camY=0;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    ensureInitialHQ();
    requestAnimationFrame(tick);
  }
  function resizeNow(){
    const r = S.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width*S.DPR));
    const h = Math.max(1, Math.floor(r.height*S.DPR));
    if (S.canvas.width!==w || S.canvas.height!==h){ S.canvas.width=w; S.canvas.height=h; }
    S.width=w; S.height=h;
  }
  function ensureInitialHQ(){
    if (!S.buildings.some(b=>b.type==='hq')){
      S.buildings.push({type:'hq', x:0, y:0, w:TILE*2, h:TILE*2});
    }
  }

  // Zeichnen
  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth=1; ctx.strokeStyle=GRID_COLOR;
    const step=TILE*S.zoom*S.DPR;
    const ox = (S.width/2  - (S.camX*S.zoom)*S.DPR) % step;
    const oy = (S.height/2 - (S.camY*S.zoom)*S.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=S.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,S.height); }
    for (let y=oy; y<=S.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(S.width,y); }
    ctx.stroke();
    ctx.restore();
  }
  function fillRectWorld(ctx,x,y,w,h,color,label){
    const p=toScreen(x,y); const pw=w*S.zoom*S.DPR, ph=h*S.zoom*S.DPR;
    ctx.save();
    ctx.fillStyle=color;
    ctx.fillRect(p.x*S.DPR - pw/2, p.y*S.DPR - ph/2, pw, ph);
    if (label){
      ctx.fillStyle=TEXT_COLOR;
      ctx.font = `${Math.round(12*S.DPR*S.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(label, p.x*S.DPR, p.y*S.DPR - 4*S.DPR);
    }
    ctx.restore();
  }
  function drawRoad(ctx,r){
    const a=toScreen(r.x1,r.y1), b=toScreen(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle=ROAD_COLOR; ctx.lineWidth=3*S.zoom*S.DPR; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(a.x*S.DPR,a.y*S.DPR); ctx.lineTo(b.x*S.DPR,b.y*S.DPR); ctx.stroke();
    ctx.restore();
  }
  function drawWorld(){
    const ctx=S.ctx;
    ctx.clearRect(0,0,S.width,S.height);
    drawGrid(ctx);
    for (const r of S.roads) drawRoad(ctx,r);
    for (const b of S.buildings){
      const color = b.type==='hq'?HQ_COLOR : b.type==='woodcutter'?WC_COLOR : DEPOT_COLOR;
      const label = b.type==='hq'?'HQ' : b.type==='woodcutter'?'Holzfäller':'Depot';
      fillRectWorld(ctx,b.x,b.y,b.w,b.h,color,label);
    }
  }
  function tick(){ drawWorld(); requestAnimationFrame(tick); }

  // Build/Eraser
  function placeBuilding(type, wx,wy){ S.buildings.push({type, x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2}); }
  function pointToSegmentDist(px,py,x1,y1,x2,y2){
    const A=px-x1,B=py-y1,C=x2-x1,D=y2-y1, dot=A*C+B*D, len2=C*C+D*D;
    let t = len2 ? (dot/len2) : 0; t = clamp(t,0,1);
    const x=x1+t*C, y=y1+t*D; return Math.hypot(px-x,py-y);
  }
  function tryErase(wx,wy){
    for (let i=S.buildings.length-1;i>=0;i--){
      const b=S.buildings[i], x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ S.buildings.splice(i,1); return true; }
    }
    const hit=6/S.zoom;
    for (let i=S.roads.length-1;i>=0;i--){
      const r=S.roads[i]; if (pointToSegmentDist(wx,wy,r.x1,r.y1,r.x2,r.y2)<=hit){ S.roads.splice(i,1); return true; }
    }
    return false;
  }
  let roadStart=null;
  function placeOrFinishRoad(wx,wy){
    const gx=snap(wx), gy=snap(wy);
    if (!roadStart){ roadStart={x:gx,y:gy}; return; }
    const seg={x1:roadStart.x,y1:roadStart.y,x2:gx,y2:gy};
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1)>1) S.roads.push(seg);
    roadStart=null;
  }

  // Eingabe
  function addInput(){
    const el=S.canvas;
    const opts={passive:false};

    el.addEventListener('pointerdown', onPointerDown, opts);
    el.addEventListener('pointermove', onPointerMove, opts);
    el.addEventListener('pointerup',   onPointerUp,   opts);
    el.addEventListener('pointercancel', onPointerUp, opts);
    el.addEventListener('wheel', onWheel, opts);

    window.addEventListener('resize', ()=>setTimeout(resizeNow,0));
    window.addEventListener('orientationchange', ()=>setTimeout(resizeNow,250));
  }
  function wheelPoint(e){ return { sx:e.clientX*S.DPR, sy:e.clientY*S.DPR }; }
  function onWheel(e){
    // Desktop‑Zoom
    if (e.target !== S.canvas) return;
    e.preventDefault();
    const {sx,sy} = wheelPoint(e);
    zoomAtScreenPoint(sx,sy, -Math.sign(e.deltaY)*0.12);
  }

  function onPointerDown(e){
    if (e.target !== S.canvas) return;      // UI bleibt klickbar
    e.preventDefault();
    S.canvas.setPointerCapture?.(e.pointerId);
    S.pointers.set(e.pointerId, {x:e.clientX*S.DPR, y:e.clientY*S.DPR});

    if (S.pointers.size === 1){
      const {x,y}=toWorld(e.clientX*S.DPR,e.clientY*S.DPR);
      if (S.tool==='pointer'){
        S.isPanning=true;
        S.panStartX=e.clientX; S.panStartY=e.clientY;
        S.camStartX=S.camX; S.camStartY=S.camY;
      } else if (S.tool==='road'){ placeOrFinishRoad(x,y); }
        else if (S.tool==='hq'){ placeBuilding('hq',x,y); }
        else if (S.tool==='woodcutter'){ placeBuilding('woodcutter',x,y); }
        else if (S.tool==='depot'){ placeBuilding('depot',x,y); }
        else if (S.tool==='erase'){ tryErase(x,y); }
    } else if (S.pointers.size === 2){
      const pts=[...S.pointers.values()];
      S.pinchStartDist = dist(pts[0],pts[1]);
      S.pinchStartZoom = S.zoom;
      S.pinchCenter = { x:(pts[0].x+pts[1].x)/2, y:(pts[0].y+pts[1].y)/2 };
    }
  }
  function onPointerMove(e){
    const p=S.pointers.get(e.pointerId);
    if (p){ p.x=e.clientX*S.DPR; p.y=e.clientY*S.DPR; }

    if (S.pointers.size===2){
      const pts=[...S.pointers.values()];
      const d=dist(pts[0],pts[1]);
      if (S.pinchStartDist>0){
        const factor=d/S.pinchStartDist;
        pinchZoomAround(S.pinchCenter.x,S.pinchCenter.y, S.pinchStartZoom*factor);
      }
      return;
    }
    if (S.isPanning && S.tool==='pointer'){
      e.preventDefault();
      const dx=(e.clientX-S.panStartX)/S.zoom;
      const dy=(e.clientY-S.panStartY)/S.zoom;
      S.camX=S.camStartX - dx;
      S.camY=S.camStartY - dy;
    }
  }
  function onPointerUp(e){
    S.pointers.delete(e.pointerId);
    if (S.pointers.size<2) S.pinchStartDist=0;
    S.isPanning=false;
    try{ S.canvas.releasePointerCapture(e.pointerId); }catch{}
  }
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

  function pinchZoomAround(cx,cy,targetZoom){
    const nz = clamp(targetZoom, S.minZoom, S.maxZoom);
    const before = toWorld(cx,cy);
    S.zoom = nz;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    const after = toWorld(cx,cy);
    S.camX += (before.x - after.x);
    S.camY += (before.y - after.y);
  }
  function zoomAtScreenPoint(sx,sy,delta){
    pinchZoomAround(sx,sy, S.zoom + delta);
  }

  // API
  function setTool(name){
    S.tool=name; if (name!=='road') roadStart=null;
    setHUD('Tool', name==='pointer'?'Zeiger':name==='road'?'Straße':name==='hq'?'HQ':name==='woodcutter'?'Holzfäller':name==='depot'?'Depot':'Abriss');
  }
  function center(){
    const hq=S.buildings.find(b=>b.type==='hq'); const x=hq?hq.x:0, y=hq?hq.y:0;
    S.camX=x; S.camY=y;
  }
  function viewportReset(){
    // Bei FS‑Wechsel oder Orientation: Captures & Gesten sauber beenden
    try{
      for (const id of S.pointers.keys()) S.canvas.releasePointerCapture?.(id);
    }catch{}
    S.pointers.clear();
    S.isPanning=false;
    S.pinchStartDist=0;
  }
  function startGame(opts){
    if (S.running) return;
    S.onHUD = opts?.onHUD || null;
    S.onDebug = opts?.onDebug || null;
    S.profile = opts?.profile || S.profile;
    attachCanvas(opts.canvas);
    addInput();
    setTool('pointer');
    S.running=true;
    dbg({msg:'startGame', profile:S.profile, DPR:S.DPR});
  }
  function debugSnapshot(){
    return {running:S.running, DPR:S.DPR, size:{w:S.width,h:S.height}, cam:{x:S.camX,y:S.camY,zoom:S.zoom},
            tool:S.tool, roads:S.roads.length, buildings:S.buildings.length, pointers:[...S.pointers.keys()]};
  }

  return { startGame, setTool, center, debugSnapshot, viewportReset, resizeNow };
})();
