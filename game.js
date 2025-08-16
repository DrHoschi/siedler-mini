// Siedler‑Mini V15.6 — Pfad-Textur (Trampelpfad), Träger, Bau-Ghost, Tiling-Background
export const game = (() => {
  // ====== Konstanten ======
  const TILE = 64;
  const GRID_COLOR = "#1e2a3d";
  const TEXT_COLOR = "#cfe3ff";
  const COLOR_ROAD = "#78d9a8";
  const COLOR_HQ   = "#43aa62";
  const COLOR_WC   = "#3f8cff";
  const COLOR_DEP  = "#d55384";
  const COLOR_CAR  = "#ffd955"; // Träger (Punkt)

  // ====== State ======
  const state = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1,
    minZoom:0.75, maxZoom:1.75,
    pan:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Tools / Bauen
    tool:'pointer',              // 'pointer' | 'erase' | 'build'
    buildType:null,              // 'hq'|'woodcutter'|'depot'
    ghost:null,                  // {x,y,w,h,valid,sx,sy}
    // Welt
    roads:[],
    buildings:[],                // {type,x,y,w,h}
    // Träger
    carriers:[],                 // {x,y, tx,ty, home:{x,y}, work:{x,y}, carrying, speed, lastMarkX,lastMarkY, moveAcc}
    carrierSpawnTimer:0,
    // „getrampelte Wege“: Map<"gx,gy", count>
    pathHeat: new Map(),
    pathHeatCap: 1500,           // Performance-Deckel
    // UI/Callbacks
    onHUD:()=>{},
    onDebug:()=>{},
    uiPlaceShow:()=>{},
    uiPlaceHide:()=>{},
    // Texturen
    tex: {},
    texList: [
      // Hintergrund
      'assets/tex/topdown_grass.png',
      // optionale weitere Hintergründe
      'assets/tex/topdown_dirt.png',
      'assets/tex/topdown_water.png',
      // Wege / Straßen
      'assets/tex/path0.png',
      'assets/tex/topdown_road_straight.png',
      'assets/tex/topdown_road_corner.png',
      'assets/tex/topdown_road_t.png',
      'assets/tex/topdown_road_cross.png',
      // Gebäude
      'assets/tex/topdown_hq.png',
      'assets/tex/topdown_depot.png',
      'assets/tex/topdown_woodcutter.png',
      // von dir erwähnt
      'assets/tex/hq_wood.png'
    ],
    texLoaded:false,
    // intern
    _lastTs:0
  };

  // ====== Utils ======
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const snap  = v => Math.round(v/TILE)*TILE;
  const gx = (x)=>Math.round(x/TILE), gy=(y)=>Math.round(y/TILE);
  const keyOf = (gx,gy)=>`${gx},${gy}`;
  const toWorld = (sx,sy)=>({
    x: (sx/state.DPR - state.width/2)/state.zoom + state.camX,
    y: (sy/state.DPR - state.height/2)/state.zoom + state.camY
  });
  const toScreen = (wx,wy)=>({
    x: (wx - state.camX)*state.zoom + state.width/2,
    y: (wy - state.camY)*state.zoom + state.height/2
  });
  const dist = (ax,ay,bx,by)=>Math.hypot(ax-bx, ay-by);

  function setHUD(k,v){ state.onHUD?.(k,v); }
  function dbg(obj){
    state.onDebug?.({
      tool: state.tool,
      zoom: +state.zoom.toFixed(2),
      cam: {x:+state.camX.toFixed(1), y:+state.camY.toFixed(1)},
      ghost: state.ghost ? {...state.ghost} : null,
      carriers: state.carriers.length,
      heat: state.pathHeat.size,
      ...obj
    });
  }

  // ====== Texture Loader ======
  function loadTextures(list){
    if (!list || !list.length) { state.texLoaded = true; return; }
    let left = list.length, miss = 0;
    for (const url of list){
      const img = new Image();
      img.onload = ()=>{ state.tex[url]=img; if (--left===0){ state.texLoaded=true; dbg({tex:'loaded', ok:list.length, missing:miss}); } };
      img.onerror = ()=>{ state.tex[url]=null; miss++; dbg({tex:'MISSING', url}); if (--left===0){ state.texLoaded=true; dbg({tex:'loaded', ok:list.length-miss, missing:miss}); } };
      img.src = url + '?v=' + Date.now();
    }
  }

  // ====== Canvas / Resize ======
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.DPR = Math.max(1, Math.min(3, devicePixelRatio||1));
    _resize();
    state.zoom = 1.0;
    center();
    setHUD('Zoom', `${state.zoom.toFixed(2)}x`);
    loadTextures(state.texList);
    requestAnimationFrame(tick);
  }
  function _resize(){
    const rect = state.canvas.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(rect.width  * state.DPR));
    state.height = Math.max(1, Math.floor(rect.height * state.DPR));
    if (state.canvas.width!==state.width || state.canvas.height!==state.height){
      state.canvas.width  = state.width;
      state.canvas.height = state.height;
    }
  }

  // ====== Zeichnen ======
  function drawTiled(ctx, imgUrl){
    const img = state.tex[imgUrl];
    if (!img) return false;
    // Größe der Kachel im Screenmaßstab
    const size = TILE*state.zoom*state.DPR;
    if (size <= 1) return true;

    // Errechne linken/oberen Start in Screen-Koords, so dass es nahtlos scrollt
    const worldLeft   = state.camX - (state.width /(2*state.zoom));
    const worldTop    = state.camY - (state.height/(2*state.zoom));
    const startGX = Math.floor(worldLeft / TILE) - 1;
    const startGY = Math.floor(worldTop  / TILE) - 1;
    const endGX   = Math.ceil((worldLeft + state.width / state.zoom) / TILE) + 1;
    const endGY   = Math.ceil((worldTop  + state.height/ state.zoom) / TILE) + 1;

    ctx.save();
    for (let iy=startGY; iy<=endGY; iy++){
      for (let ix=startGX; ix<=endGX; ix++){
        const wx = ix*TILE, wy = iy*TILE;
        const s  = toScreen(wx,wy);
        ctx.drawImage(
          img,
          0,0,img.width,img.height,
          (s.x*state.DPR - size/2),
          (s.y*state.DPR - size/2),
          size, size
        );
      }
    }
    ctx.restore();
    return true;
  }

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

  function drawCarrier(ctx,c){
    const s = toScreen(c.x,c.y);
    ctx.save();
    ctx.fillStyle = COLOR_CAR;
    ctx.beginPath();
    ctx.arc(s.x*state.DPR, s.y*state.DPR, 4*state.zoom*state.DPR, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawPaths(ctx){
    const img = state.tex['assets/tex/path0.png'];
    if (!img || state.pathHeat.size===0) return;
    // Sichtfenster in Grid
    const worldLeft   = state.camX - (state.width /(2*state.zoom));
    const worldTop    = state.camY - (state.height/(2*state.zoom));
    const worldRight  = state.camX + (state.width /(2*state.zoom));
    const worldBottom = state.camY + (state.height/(2*state.zoom));
    const minGX = Math.floor(worldLeft / TILE) - 1;
    const minGY = Math.floor(worldTop  / TILE) - 1;
    const maxGX = Math.ceil (worldRight/ TILE) + 1;
    const maxGY = Math.ceil (worldBottom/TILE) + 1;

    const size = TILE*state.zoom*state.DPR;
    ctx.save();
    for (const [k,count] of state.pathHeat){
      const [ix,iy] = k.split(',').map(n=>parseInt(n,10));
      if (ix<minGX||ix>maxGX||iy<minGY||iy>maxGY) continue;
      const wx = ix*TILE, wy = iy*TILE;
      const s  = toScreen(wx,wy);
      // Alpha je Nutzung (sanft)
      const a = clamp(0.2 + (count/20)*0.6, 0.2, 0.85);
      ctx.globalAlpha = a;
      ctx.drawImage(img, 0,0,img.width,img.height, s.x*state.DPR - size/2, s.y*state.DPR - size/2, size, size);
    }
    ctx.restore();
  }

  function render(){
    const ctx = state.ctx;
    ctx.clearRect(0,0,state.width,state.height);

    // 1) Hintergrund: Gras (falls vorhanden), sonst Grid
    const didGrass = drawTiled(ctx, 'assets/tex/topdown_grass.png');
    if (!didGrass) drawGrid(ctx);

    // 2) Trampelpfade
    drawPaths(ctx);

    // 3) optionale Straßen (falls du sie nutzen willst)
    for (const r of state.roads) drawRoad(ctx,r);

    // 4) Gebäude
    for (const b of state.buildings){
      const color = b.type==='hq'?COLOR_HQ : b.type==='woodcutter'?COLOR_WC : COLOR_DEP;
      const label = b.type==='hq'?'HQ' : b.type==='woodcutter'?'Holzfäller' : 'Depot';
      drawRectWorld(ctx, b.x,b.y, b.w,b.h, color, label);
    }

    // 5) Träger
    for (const c of state.carriers) drawCarrier(ctx,c);

    // 6) Ghost
    if (state.ghost) drawGhost(ctx, state.ghost);
  }

  // ====== Carrier / Produktion (minimal) ======
  function findHQ(){ return state.buildings.find(b=>b.type==='hq') || null; }
  function findWoodcutters(){ return state.buildings.filter(b=>b.type==='woodcutter'); }

  function spawnCarrierBetween(a,b){
    if (!a || !b) return;
    state.carriers.push({
      x:a.x, y:a.y,
      tx:b.x, ty:b.y,
      home:{x:a.x,y:a.y},
      work:{x:b.x,y:b.y},
      carrying:false,
      speed: 38,            // gemütlich
      lastMarkX: gx(a.x),   // Heat-Start
      lastMarkY: gy(a.y),
      moveAcc: 0
    });
  }

  function markPathAt(x,y){
    if (state.pathHeat.size >= state.pathHeatCap) return; // Deckel
    const Gx = gx(x), Gy = gy(y);
    const k = keyOf(Gx,Gy);
    state.pathHeat.set(k, (state.pathHeat.get(k)||0) + 1);
  }

  function updateCarriers(dt){
    for (const c of state.carriers){
      // Bewegen
      const d = Math.max(1, dist(c.x,c.y,c.tx,c.ty));
      const step = c.speed * dt;
      if (d <= step){
        // Ziel erreicht → drehen
        if (c.tx===c.work.x && c.ty===c.work.y){
          c.carrying = true;
          c.tx = c.home.x; c.ty = c.home.y;
        } else {
          c.carrying = false;
          c.tx = c.work.x; c.ty = c.work.y;
        }
      } else {
        const nx = (c.tx - c.x) / d;
        const ny = (c.ty - c.y) / d;
        c.x += nx * step;
        c.y += ny * step;
      }

      // Pfad-Heat setzen: alle ~0.5 Tile Wegstrecke
      c.moveAcc += step;
      if (c.moveAcc >= TILE*0.5){
        c.moveAcc = 0;
        const cgx = gx(c.x), cgy = gy(c.y);
        if (cgx!==c.lastMarkX || cgy!==c.lastMarkY){
          c.lastMarkX = cgx; c.lastMarkY = cgy;
          markPathAt(c.x, c.y);
        }
      }
    }
  }

  function carriersTickSpawn(dt){
    // alle ~3.5s je Holzfäller einen Träger losschicken (wenn HQ existiert)
    state.carrierSpawnTimer += dt;
    if (state.carrierSpawnTimer < 3.5) return;
    state.carrierSpawnTimer = 0;
    const hq = findHQ(); if (!hq) return;
    const wcs = findWoodcutters(); if (!wcs.length) return;
    const wc = wcs[Math.floor(Math.random()*wcs.length)];
    spawnCarrierBetween(hq, wc);
  }

  // ====== Platzierung / Validierung ======
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
  function ghostSizeFor(type){ return { w:TILE*2, h:TILE*2 }; }

  function ghostContains(wx,wy){
    const g = state.ghost; if (!g) return false;
    return (wx>=g.x-g.w/2 && wx<=g.x+g.w/2 && wy>=g.y-g.h/2 && wy<=g.y+g.h/2);
  }

  function makeGhostAtWorld(wx,wy){
    const gxw = snap(wx), gyw = snap(wy);
    const {w,h} = ghostSizeFor(state.buildType||'hq');
    const box = {x:gxw, y:gyw, w, h};
    const valid = canPlace(box);
    const s = toScreen(gxw,gyw);
    state.ghost = { ...box, valid, sx: s.x*state.DPR, sy: s.y*state.DPR };
    state.uiPlaceShow?.(state.ghost.sx, state.ghost.sy, valid);
    dbg({hint:'ghost-set', world:{x:gxw,y:gyw}, valid});
  }

  function updateGhostAtScreen(sx,sy){
    const w = toWorld(sx,sy);
    const gxw = snap(w.x), gyw = snap(w.y);
    const {w:gw,h:gh} = ghostSizeFor(state.buildType||'hq');
    const box = {x:gxw, y:gyw, w:gw, h:gh};
    const valid = canPlace(box);
    state.ghost = { ...box, valid, sx, sy };
    state.uiPlaceShow?.(sx, sy, valid);
    dbg({hint:'ghost-move', world:{x:gxw,y:gyw}, valid});
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

  // ====== Eingabe ======
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
      if (state.ghost && ghostContains(w.x,w.y) && state.ghost.valid){
        confirmBuild();
        return;
      }
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

  // ====== Erase ======
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

  // ====== Main Loop ======
  function tick(ts=0){
    if (!state._lastTs) state._lastTs = ts;
    const dt = Math.min(0.05, (ts - state._lastTs)/1000);
    state._lastTs = ts;

    if (state.running){
      carriersTickSpawn(dt);
      updateCarriers(dt);
    }
    render();
    requestAnimationFrame(tick);
  }

  // ====== API ======
  function setTool(name){
    state.tool = name;
    if (name!=='build'){ state.buildType=null; state.ghost=null; state.uiPlaceHide?.(); }
    setHUD('Tool', name==='pointer'?'Zeiger' : name==='erase'?'Abriss' : 'Bauen');
  }
  function setBuildMode(type){
    state.tool = 'build';
    state.buildType = type;
    setHUD('Tool', `Bauen: ${type==='hq'?'HQ':type==='woodcutter'?'Holzfäller':'Depot'}`);
    const midSx = (state.width/2);
    const midSy = (state.height/2);
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

    // Start-HQ mittig
    state.buildings.push({type:'hq', x:0, y:0, w:TILE*2, h:TILE*2});

    state.running = true;
    dbg({hint:'start', texProbe: state.texList});
  }

  // (public) Resize-Hook für Fullscreen/Rotate
  function resize(){ _resize(); }

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
