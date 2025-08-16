// Siedler-Mini V15.4-pm2 — Engine/Renderer/Input/Bau-Ghost+Bestätigung UX
export const game = (() => {
  // --- Konstanten ---
  const TILE = 64;
  const GRID_COLOR = "#1e2a3d";
  const TEXT_COLOR = "#cfe3ff";
  const COLOR_ROAD = "#78d9a8";
  const COLOR_HQ   = "#43aa62";
  const COLOR_WC   = "#3f8cff";
  const COLOR_DEP  = "#d55384";

  // --- State ---
  const state = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1,
    minZoom:0.75, maxZoom:1.75,
    pan:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    tool:'pointer',            // 'pointer' | 'erase' | 'build'
    buildType:null,            // 'hq' | 'woodcutter' | 'depot'
    ghost:null,                // {x,y,w,h, valid, sx,sy}
    roads:[],
    buildings:[],              // {type,x,y,w,h}
    onHUD:()=>{},
    onDebug:()=>{},
    uiPlaceShow:()=>{},
    uiPlaceHide:()=>{},
  };

  // --- Utils ---
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const snap  = v => Math.round(v/TILE)*TILE;
  const toWorld = (sx,sy)=>({
    x: (sx/state.DPR - state.width/2)/state.zoom + state.camX,
    y: (sy/state.DPR - state.height/2)/state.zoom + state.camY
  });
  const toScreen = (wx,wy)=>({
    x: (wx - state.camX)*state.zoom + state.width/2,
    y: (wy - state.camY)*state.zoom + state.height/2
  });

  function setHUD(k,v){ state.onHUD?.(k,v); }
  function dbg(obj){
    state.onDebug?.({
      tool: state.tool,
      zoom: +state.zoom.toFixed(2),
      cam: {x:+state.camX.toFixed(1), y:+state.camY.toFixed(1)},
      ghost: state.ghost ? {...state.ghost} : null,
      ...obj
    });
  }

  // --- Canvas/Resize ---
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.DPR = Math.max(1, Math.min(3, devicePixelRatio||1));
    resize();
    state.zoom = 1.0;
    center();
    setHUD('Zoom', `${state.zoom.toFixed(2)}x`);
    requestAnimationFrame(tick);
  }
  function resize(){
    const rect = state.canvas.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(rect.width  * state.DPR));
    state.height = Math.max(1, Math.floor(rect.height * state.DPR));
    if (state.canvas.width!==state.width || state.canvas.height!==state.height){
      state.canvas.width  = state.width;
      state.canvas.height = state.height;
    }
  }

  // --- Zeichnen ---
  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const step = TILE*state.zoom*state.DPR;
    const ox = (state.width/2 - (state.camX*state.zoom)*state.DPR) % step;
    const oy = (state.height/2 - (state.camY*state.zoom)*state.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=state.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.height); }
    for (let y=oy; y<=state.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.width,y); }
    ctx.stroke();
    ctx.restore();
  }
  function drawRectWorld(ctx,x,y,w,h, color, label){
    const p = toScreen(x,y);
    const pw = w*state.zoom*state.DPR;
    const ph = h*state.zoom*state.DPR;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(p.x*state.DPR - pw/2, p.y*state.DPR - ph/2, pw, ph);
    if (label){
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*state.DPR*state.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(label, p.x*state.DPR, p.y*state.DPR + ph/2 + 4*state.DPR);
    }
    ctx.restore();
  }
  function drawRoad(ctx,r){
    const a = toScreen(r.x1,r.y1);
    const b = toScreen(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle = COLOR_ROAD;
    ctx.lineWidth = 4*state.zoom*state.DPR;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x*state.DPR, a.y*state.DPR);
    ctx.lineTo(b.x*state.DPR, b.y*state.DPR);
    ctx.stroke();
    ctx.restore();
  }
  function drawGhost(ctx,g){
    const p = toScreen(g.x,g.y);
    const pw = g.w*state.zoom*state.DPR;
    const ph = g.h*state.zoom*state.DPR;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = g.valid ? '#32cd32' : '#cd3232';
    ctx.fillRect(p.x*state.DPR - pw/2, p.y*state.DPR - ph/2, pw, ph);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = g.valid ? '#28a828' : '#b82828';
    ctx.lineWidth = 2*state.zoom*state.DPR;
    ctx.strokeRect(p.x*state.DPR - pw/2, p.y*state.DPR - ph/2, pw, ph);
    ctx.restore();
  }

  function render(){
    const ctx = state.ctx;
    ctx.clearRect(0,0,state.width,state.height);
    drawGrid(ctx);

    for (const r of state.roads) drawRoad(ctx,r);
    for (const b of state.buildings){
      const color = b.type==='hq'?COLOR_HQ : b.type==='woodcutter'?COLOR_WC : COLOR_DEP;
      const label = b.type==='hq'?'HQ' : b.type==='woodcutter'?'Holzfäller' : 'Depot';
      drawRectWorld(ctx, b.x,b.y, b.w,b.h, color, label);
    }
    if (state.ghost) drawGhost(ctx, state.ghost);
  }

  function tick(){
    render();
    requestAnimationFrame(tick);
  }

  // --- Platzierung / Validierung ---
  function intersects(a,b){
    return !(a.x+a.w/2 <= b.x-b.w/2 ||
             a.x-a.w/2 >= b.x+b.w/2 ||
             a.y+a.h/2 <= b.y-b.h/2 ||
             a.y-a.h/2 >= b.y+b.h/2);
  }
  function canPlace(box){
    for (const b of state.buildings) if (intersects(box,b)) return false;
    return true;
  }
  function ghostSizeFor(type){
    return { w:TILE*2, h:TILE*2 };
  }
  function ghostContains(wx,wy){
    const g = state.ghost; if (!g) return false;
    return (wx>=g.x-g.w/2 && wx<=g.x+g.w/2 && wy>=g.y-g.h/2 && wy<=g.y+g.h/2);
  }

  function makeGhostAtWorld(wx,wy){
    const gx = snap(wx), gy = snap(wy);
    const {w,h} = ghostSizeFor(state.buildType||'hq');
    const box = {x:gx, y:gy, w, h};
    const valid = canPlace(box);
    // merke für UI die letzte Screen-Position
    const s = toScreen(gx,gy);
    state.ghost = { ...box, valid, sx: s.x*state.DPR, sy: s.y*state.DPR };
    state.uiPlaceShow?.(state.ghost.sx, state.ghost.sy, valid);
    dbg({hint:'ghost-set', world:{x:gx,y:gy}, valid});
  }
  function updateGhostAtScreen(sx,sy){
    const w = toWorld(sx,sy);
    const gx = snap(w.x), gy = snap(w.y);
    const {w:gw,h:gh} = ghostSizeFor(state.buildType||'hq');
    const box = {x:gx, y:gy, w:gw, h:gh};
    const valid = canPlace(box);
    state.ghost = { ...box, valid, sx, sy };
    state.uiPlaceShow?.(sx, sy, valid);
    dbg({hint:'ghost-move', world:{x:gx,y:gy}, valid});
  }

  function confirmBuild(){
    if (!state.ghost || !state.ghost.valid || !state.buildType) return;
    const g = state.ghost;
    state.buildings.push({type: state.buildType, x:g.x, y:g.y, w:g.w, h:g.h});
    cancelBuild();
  }
  function cancelBuild(){
    state.ghost = null;
    state.buildType = null;
    state.tool = 'pointer';
    setHUD('Tool','Zeiger');
    state.uiPlaceHide?.();
    dbg({hint:'build-cancel'});
  }

  // --- Eingabe ---
  function onPointerDown(e){
    const sx = e.clientX*state.DPR, sy = e.clientY*state.DPR;
    const w = toWorld(sx,sy);

    if (state.tool==='pointer'){
      state.pan = true;
      state.panStartX = e.clientX; state.panStartY = e.clientY;
      state.camStartX = state.camX; state.camStartY = state.camY;
    } else if (state.tool==='erase'){
      eraseAt(w.x,w.y);
    } else if (state.tool==='build'){
      // Tap auf Ghost → sofort bestätigen (wenn gültig)
      if (state.ghost && ghostContains(w.x,w.y) && state.ghost.valid){
        confirmBuild();
        return;
      }
      // sonst Ghost an die Tap-Position setzen und UI anzeigen
      updateGhostAtScreen(sx,sy);
    }
  }
  function onPointerMove(e){
    if (state.tool==='pointer' && state.pan){
      const dx = (e.clientX - state.panStartX) / state.zoom;
      const dy = (e.clientY - state.panStartY) / state.zoom;
      state.camX = state.camStartX - dx;
      state.camY = state.camStartY - dy;
    } else if (state.tool==='build'){
      updateGhostAtScreen(e.clientX*state.DPR, e.clientY*state.DPR);
    }
  }
  function onPointerUp(){ state.pan = false; }
  function onWheel(e){
    e.preventDefault();
    const delta = -Math.sign(e.deltaY)*0.1;
    const before = state.zoom;
    state.zoom = clamp(state.zoom + delta, state.minZoom, state.maxZoom);
    if (state.zoom!==before) setHUD('Zoom', `${state.zoom.toFixed(2)}x`);
  }

  // --- Erase ---
  function eraseAt(wx,wy){
    for (let i=state.buildings.length-1;i>=0;i--){
      const b=state.buildings[i];
      if (wx>=b.x-b.w/2 && wx<=b.x+b.w/2 && wy>=b.y-b.h/2 && wy<=b.y+b.h/2){
        state.buildings.splice(i,1);
        dbg({hint:'erase-building', at:{x:wx,y:wy}});
        return;
      }
    }
  }

  // --- API ---
  function setTool(name){
    state.tool = name;
    if (name!=='build'){ state.buildType=null; state.ghost=null; state.uiPlaceHide?.(); }
    setHUD('Tool', name==='pointer'?'Zeiger' : name==='erase'?'Abriss' : 'Bauen');
  }

  function setBuildMode(type){
    state.tool = 'build';
    state.buildType = type;
    setHUD('Tool', `Bauen: ${type==='hq'?'HQ':type==='woodcutter'?'Holzfäller':'Depot'}`);
    // Sofort einen Ghost in der Bildschirmmitte anzeigen:
    const midSx = (state.width/2);   // schon in Canvas-Pixeln
    const midSy = (state.height/2);
    // makeGhostAtWorld erwartet Weltkoordinaten → Screen -> World:
    const midWorld = toWorld(midSx, midSy);
    makeGhostAtWorld(midWorld.x, midWorld.y);
  }

  function center(){ state.camX = 0; state.camY = 0; }

  function startGame(opts){
    if (state.running) return;
    state.onHUD = opts?.onHUD;
    state.onDebug = opts?.onDebug;
    state.uiPlaceShow = opts?.uiPlaceShow;
    state.uiPlaceHide = opts?.uiPlaceHide;

    attachCanvas(opts.canvas);

    state.canvas.addEventListener('pointerdown', onPointerDown, {passive:false});
    state.canvas.addEventListener('pointermove', onPointerMove, {passive:false});
    state.canvas.addEventListener('pointerup',   onPointerUp,   {passive:false});
    state.canvas.addEventListener('pointercancel', onPointerUp, {passive:false});
    state.canvas.addEventListener('wheel', onWheel, {passive:false});

    // Ein Start-HQ mittig:
    state.buildings.push({type:'hq', x:0, y:0, w:TILE*2, h:TILE*2});

    state.running = true;
  }

  return {
    startGame,
    setTool,
    setBuildMode,
    confirmBuild,
    cancelBuild,
    center,
    resize,
    get state(){ return state; }
  };
})();
