/* Siedler‑Mini V15.3.1 – game.js
   Fixes & Ergänzungen:
   - Bauen NUR, wenn buildMenuOpen===true UND kein Panel‑Cooldown aktiv
   - Nach Panel‑Schließen (über boot.js) 200ms Tap‑Sperre
   - Boden bevorzugt path0_grass.png (Fallbacks auf topdown_grass.png …)
*/
import { isBuildCooldown } from './boot.js?v=15.3.1';

export const game = (() => {
  const TILE = 64;
  const GRID_COLOR = "#1e2a3d";
  const TEXT_COLOR = "#cfe3ff";

  const PROD_TIME_MS = 8000;
  const CARRIER_DELAY_MS = 3000;
  const CARRIER_SPEED = 60;

  const state = {
    running: false,
    canvas: null, ctx: null,
    DPR: 1, width: 0, height: 0,
    camX: 0, camY: 0, zoom: 1.0,
    minZoom: 0.5, maxZoom: 2.5,

    mapW: 48, mapH: 32,
    tiles: [],
    roads: [],
    buildings: [],
    carriers: [],

    pointerTool: "pointer",
    buildMenuOpen: false,

    isPanning: false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    tapStartTs: 0, tapStartX:0, tapStartY:0,

    onHUD: (k,v)=>{},
    images: new Map(),
    assetsReady: false,

    lastTs: 0
  };

  // bevorzugt path0_grass.* als Hintergrund
  const ASSET_LIST = {
    path0_grass:       ["assets/tex/path0_grass.png","assets/tex/Path0_grass.png","assets/tex/PATH0_GRASS.png"],
    topdown_grass:     ["assets/tex/topdown_grass.png","assets/tex/Topdown_grass.png","assets/tex/GRASS.png"],
    topdown_dirt:      ["assets/tex/topdown_dirt.png","assets/tex/Topdown_dirt.png"],
    topdown_forest:    ["assets/tex/topdown_forest.png","assets/tex/Topdown_forest.png"],
    topdown_water:     ["assets/tex/topdown_water.png","assets/tex/Topdown_water.png"],
    hq_sprite:         ["assets/tex/topdown_hq.png","assets/tex/hq_wood.png","assets/tex/HQ_Wood.png","assets/tex/Hq_wood.png"],
    woodcutter_sprite: ["assets/tex/topdown_woodcutter.png","assets/tex/Topdown_woodcutter.png"],
    depot_sprite:      ["assets/tex/topdown_depot.png","assets/tex/Topdown_depot.png"],
  };

  const setHUD = (k,v)=> state.onHUD?.(k,v);
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
  const toWorld = (sx,sy) => ({
    x: (sx/state.DPR - state.width/2)/state.zoom + state.camX,
    y: (sy/state.DPR - state.height/2)/state.zoom + state.camY
  });
  const toScreen = (wx,wy) => ({
    x: (wx - state.camX) * state.zoom + state.width/2,
    y: (wy - state.camY) * state.zoom + state.height/2
  });
  const snap = v => Math.round(v / TILE) * TILE;

  function loadImageWithFallbacks(paths){
    return new Promise((resolve) => {
      let i = 0;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        i++;
        if (i < paths.length){ img.src = paths[i] + "?r=" + Date.now(); }
        else resolve(null);
      };
      img.src = paths[0] + "?r=" + Date.now();
    });
  }
  async function loadAssets(){
    for (const [key, paths] of Object.entries(ASSET_LIST)){
      const img = await loadImageWithFallbacks(paths);
      if (img) state.images.set(key, img);
    }
    state.assetsReady = true;
  }

  function makeMap(){
    state.tiles = new Array(state.mapW*state.mapH);
    for (let y=0; y<state.mapH; y++){
      for (let x=0; x<state.mapW; x++){
        // simple Mischung: 0 = „Gras“ (pfad0 bevorzugt), 1 = Dirt, 2 = Forest, 3 = Water
        let t = 0;
        if ((x+y)%13===0) t = 1;
        if ((x*37 ^ y*17) % 53 === 0) t = 2;
        if (x<3 || y<3 || x>state.mapW-4 || y>state.mapH-4) t = 0; // Rand neutral
        state.tiles[y*state.mapW+x] = t;
      }
    }
  }

  function drawTiles(ctx){
    if (!state.assetsReady){ drawGrid(ctx); return; }
    const imgPathGrass = state.images.get("path0_grass"); // bevorzugt
    const imgGrass     = state.images.get("topdown_grass");
    const imgDirt      = state.images.get("topdown_dirt");
    const imgForest    = state.images.get("topdown_forest");
    const imgWater     = state.images.get("topdown_water");

    const leftW   = state.camX - (state.width/2)/state.zoom;
    const topW    = state.camY - (state.height/2)/state.zoom;
    const rightW  = state.camX + (state.width/2)/state.zoom;
    const bottomW = state.camY + (state.height/2)/state.zoom;

    const minTX = Math.max(0, Math.floor(leftW / TILE) - 1);
    const maxTX = Math.min(state.mapW-1, Math.floor(rightW / TILE) + 1);
    const minTY = Math.max(0, Math.floor(topW / TILE) - 1);
    const maxTY = Math.min(state.mapH-1, Math.floor(bottomW / TILE) + 1);

    for (let ty=minTY; ty<=maxTY; ty++){
      for (let tx=minTX; tx<=maxTX; tx++){
        const t = state.tiles[ty*state.mapW + tx] || 0;
        const wx = tx*TILE + TILE/2;
        const wy = ty*TILE + TILE/2;
        const p = toScreen(wx,wy);

        const dstX = (p.x*state.DPR) - (TILE*state.zoom*state.DPR)/2;
        const dstY = (p.y*state.DPR) - (TILE*state.zoom*state.DPR)/2;
        const dstS = TILE*state.zoom*state.DPR;

        let img = imgPathGrass || imgGrass; // bevorzugt path0_grass
        if (t===1 && imgDirt)   img = imgDirt;
        if (t===2 && imgForest) img = imgForest;
        if (t===3 && imgWater)  img = imgWater;

        if (img) ctx.drawImage(img, 0,0,img.naturalWidth,img.naturalHeight, dstX, dstY, dstS, dstS);
        else {
          const c = t===0? "#2e6a3a" : t===1? "#7d5a3a" : t===2? "#2f4b30" : "#254564";
          state.ctx.fillStyle = c; state.ctx.fillRect(dstX, dstY, dstS, dstS);
        }
      }
    }
  }

  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const step = TILE * state.zoom * state.DPR;
    const ox = (state.width/2 - (state.camX*state.zoom)*state.DPR) % step;
    const oy = (state.height/2 - (state.camY*state.zoom)*state.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=state.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.height); }
    for (let y=oy; y<=state.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawRoads(ctx){
    ctx.save();
    ctx.strokeStyle = "#a88c5a";
    ctx.lineWidth = 6 * state.zoom * state.DPR;
    ctx.lineCap = "round";
    for (const r of state.roads){
      const a = toScreen(r.x1, r.y1);
      const b = toScreen(r.x2, r.y2);
      ctx.beginPath();
      ctx.moveTo(a.x*state.DPR, a.y*state.DPR);
      ctx.lineTo(b.x*state.DPR, b.y*state.DPR);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuilding(ctx, b){
    const p = toScreen(b.x,b.y);
    const dstX = (p.x*state.DPR) - (b.w*state.zoom*state.DPR)/2;
    const dstY = (p.y*state.DPR) - (b.h*state.zoom*state.DPR)/2;
    const dstW =  b.w*state.zoom*state.DPR;
    const dstH =  b.h*state.zoom*state.DPR;

    const img = state.images.get(b.spriteKey);
    if (img){
      ctx.drawImage(img, 0,0,img.naturalWidth,img.naturalHeight, dstX, dstY, dstW, dstH);
    } else {
      ctx.fillStyle = b.type==="hq" ? "#43aa62" : b.type==="woodcutter" ? "#3f8cff" : "#d55384";
      ctx.fillRect(dstX, dstY, dstW, dstH);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*state.DPR*state.zoom)}px system-ui, -apple-system, Segoe UI`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(b.type, p.x*state.DPR, (p.y*state.DPR)-4*state.DPR);
    }
  }

  function drawCarriers(ctx){
    ctx.save();
    for (const c of state.carriers){
      const p = toScreen(c.x,c.y);
      const r = 4 * state.zoom * state.DPR;
      ctx.beginPath();
      ctx.fillStyle = c.hasWood ? "#ffd04a" : "#e0e6ff";
      ctx.arc(p.x*state.DPR, p.y*state.DPR, r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWorld(){
    const {ctx} = state;
    ctx.clearRect(0,0,state.width, state.height);
    drawTiles(ctx);
    drawRoads(ctx);
    for (const b of state.buildings) drawBuilding(ctx,b);
    drawCarriers(ctx);
  }

  /* -------- Buildings / Production / Carriers -------- */
  let nextId = 1;
  function addBuilding(type, wx, wy){
    const gx = snap(wx), gy = snap(wy);
    const b = {
      id: nextId++, type, x: gx, y: gy, w: TILE, h: TILE,
      spriteKey: type==="hq" ? "hq_sprite" : type==="woodcutter" ? "woodcutter_sprite" : "depot_sprite",
      store: { wood: 0, stone: 0, food: 0, gold: 0 },
      prodTimer: 0
    };
    state.buildings.push(b);
    return b;
  }
  function chooseDeliveryTarget(sx,sy){
    let hq=null, nearestDepot=null, dDepot=Infinity;
    for (const b of state.buildings){
      if (b.type==="hq") hq=b;
      if (b.type==="depot"){
        const d = Math.hypot(sx-b.x, sy-b.y);
        if (d < dDepot){ dDepot=d; nearestDepot=b; }
      }
    }
    if (!hq && !nearestDepot) return null;
    if (!hq) return nearestDepot;
    if (!nearestDepot) return hq;
    const dHQ = Math.hypot(sx-hq.x, sy-hq.y);
    return (dDepot < dHQ) ? nearestDepot : hq;
  }
  function spawnCarrier(x,y,tx,ty, hasWood){
    state.carriers.push({ x, y, tx, ty, speed: CARRIER_SPEED, hasWood });
  }
  function findStorageAt(wx,wy){
    for (const b of state.buildings){
      if ((b.type==="hq" || b.type==="depot") &&
          Math.abs(wx-b.x) <= b.w*0.5 && Math.abs(wy-b.y) <= b.h*0.5){
        return b;
      }
    }
    return null;
  }
  let hudWood = 0;
  function addHudResource(kind, n){
    if (kind === "Holz"){
      hudWood += n;
      setHUD("Holz", String(hudWood));
    }
  }
  function tickProduction(dt){
    for (const b of state.buildings){
      if (b.type!=="woodcutter") continue;
      b.prodTimer += dt;
      if (b.prodTimer >= PROD_TIME_MS){
        b.prodTimer = 0;
        const target = chooseDeliveryTarget(b.x, b.y);
        if (target){
          setTimeout(()=>{ spawnCarrier(b.x, b.y, target.x, target.y, true); }, CARRIER_DELAY_MS);
        }
      }
    }
  }
  function moveCarriers(dt){
    const done = [];
    for (const c of state.carriers){
      const dx = c.tx - c.x, dy = c.ty - c.y;
      const dist = Math.hypot(dx,dy);
      if (dist < 1){
        if (c.hasWood){
          const store = findStorageAt(c.tx, c.ty);
          if (store) store.store.wood = (store.store.wood||0) + 1;
          addHudResource("Holz", 1);
        }
        done.push(c);
      } else {
        const step = (c.speed * dt/1000);
        c.x += (dx/dist)*step;
        c.y += (dy/dist)*step;
      }
    }
    state.carriers = state.carriers.filter(c => !done.includes(c));
  }

  /* ---------------- Input ---------------- */
  function writeZoomHUD(){ setHUD("Zoom", `${state.zoom.toFixed(2)}x`); }
  function onWheel(e){
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    const before = state.zoom;
    state.zoom = clamp(state.zoom + delta, state.minZoom, state.maxZoom);
    if (state.zoom !== before) writeZoomHUD();
  }
  function tryErase(wx,wy){
    for (let i=state.buildings.length-1; i>=0; i--){
      const b = state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){
        state.buildings.splice(i,1);
        return true;
      }
    }
    const hitDist = 6 / state.zoom;
    for (let i=state.roads.length-1; i>=0; i--){
      const r = state.roads[i];
      const d = pointToSegmentDist(wx,wy, r.x1,r.y1, r.x2,r.y2);
      if (d <= hitDist){ state.roads.splice(i,1); return true; }
    }
    return false;
  }
  function pointToSegmentDist(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot = A*C + B*D;
    const len2 = C*C + D*D;
    let t = len2 ? (dot/len2) : -1;
    t = clamp(t,0,1);
    const x = x1 + t*C, y = y1 + t*D;
    const dx = px-x, dy=py-y;
    return Math.hypot(dx,dy);
  }

  function onPointerDown(e){
    const primary = (e.button === 0 || e.button === undefined || e.button === -1 || e.pointerType === "touch");
    if (!primary) return;
    try { state.canvas.setPointerCapture(e.pointerId); } catch{}

    state.tapStartTs = performance.now();
    state.tapStartX = e.clientX; state.tapStartY = e.clientY;

    // Wenn Bau-Menü zu ODER Tool=pointer → Pan
    if (!state.buildMenuOpen || state.pointerTool === "pointer"){
      state.isPanning = true;
      state.panStartX = e.clientX; state.panStartY = e.clientY;
      state.camStartX = state.camX; state.camStartY = state.camY;
      return;
    }
    // Panel offen: bauen erfolgt in onPointerUp (nach Tap-Check & Cooldown)
  }

  function onPointerMove(e){
    if (state.isPanning && (!state.buildMenuOpen || state.pointerTool === "pointer")){
      e.preventDefault();
      const dx = (e.clientX - state.panStartX) / state.zoom;
      const dy = (e.clientY - state.panStartY) / state.zoom;
      state.camX = state.camStartX - dx;
      state.camY = state.camStartY - dy;
    }
  }

  function onPointerUp(e){
    state.isPanning = false;
    try { state.canvas.releasePointerCapture(e.pointerId); } catch{}

    // Bauen nur, wenn Panel offen UND kein Schließ‑Cooldown
    if (!state.buildMenuOpen || isBuildCooldown()) return;

    // Tap-Filter
    const dt = performance.now() - state.tapStartTs;
    const move = Math.hypot(e.clientX - state.tapStartX, e.clientY - state.tapStartY);
    const isTap = (dt < 220 && move < 8);
    if (!isTap) return;

    const w = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);

    if (state.pointerTool === "erase"){
      tryErase(w.x,w.y);
    } else if (state.pointerTool === "hq" || state.pointerTool === "woodcutter" || state.pointerTool === "depot"){
      addBuilding(state.pointerTool, w.x, w.y);
    }
  }

  /* --------------- Tick --------------- */
  function tick(ts){
    if (!state.lastTs) state.lastTs = ts;
    const dt = ts - state.lastTs;
    state.lastTs = ts;

    if (state.running){
      tickProduction(dt);
      moveCarriers(dt);
    }
    drawWorld();
    requestAnimationFrame(tick);
  }

  /* ------------- Canvas / Start ------------- */
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", ()=>setTimeout(resizeCanvas, 250));
    document.addEventListener("fullscreenchange", resizeCanvas);
    document.addEventListener("webkitfullscreenchange", resizeCanvas);

    canvas.addEventListener("pointerdown", onPointerDown, {passive:false});
    canvas.addEventListener("pointermove", onPointerMove, {passive:false});
    canvas.addEventListener("pointerup", onPointerUp, {passive:false});
    canvas.addEventListener("pointercancel", onPointerUp, {passive:false});
    canvas.addEventListener("wheel", onWheel, {passive:false});
  }
  function resizeCanvas(){
    const rect = state.canvas.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(rect.width  * state.DPR));
    state.height = Math.max(1, Math.floor(rect.height * state.DPR));
    if (state.canvas.width !== state.width || state.canvas.height !== state.height){
      state.canvas.width  = state.width;
      state.canvas.height = state.height;
    }
  }

  function startGame(opts){
    if (state.running) return;
    state.onHUD = (k,v)=> {
      if (opts && typeof opts.onHUD === "function") opts.onHUD(k,v);
      if (k === "Zoom"){
        const el = document.querySelector("#hudZoom"); if (el) el.textContent = v;
      }
      if (k === "Tool"){
        const el = document.querySelector("#hudTool"); if (el) el.textContent = v;
      }
    };

    attachCanvas(opts.canvas);
    writeZoomHUD();
    makeMap();
    state.running = true;
    requestAnimationFrame(tick);
  }

  function setTool(name){
    state.pointerTool = name;
    setHUD("Tool", name==='pointer' ? 'Zeiger' :
                   name==='road' ? 'Straße' :
                   name==='hq' ? 'HQ' :
                   name==='woodcutter' ? 'Holzfäller' :
                   name==='depot' ? 'Depot' : 'Abriss');
  }

  function setBuildMenuOpen(open){
    state.buildMenuOpen = !!open;
    if (!state.buildMenuOpen) setTool('pointer'); // hart auf Zeiger
  }

  function center(){
    state.camX = (state.mapW*TILE)/2;
    state.camY = (state.mapH*TILE)/2;
  }
  function placeInitialHQ(){
    const cx = snap((state.mapW*TILE)/2);
    const cy = snap((state.mapH*TILE)/2);
    addBuilding("hq", cx, cy);
  }

  loadAssets();

  return {
    startGame,
    setTool,
    center,
    placeInitialHQ,
    setBuildMenuOpen,
    get state(){ return state; },
  };
})();
