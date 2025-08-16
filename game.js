/* Siedler‑Mini • game.js
   Enthält:
   - Texture-Loader (probiert .png & .PNG)
   - Kamera/Zoom/Pan
   - World/Bauen/Abriss
   - Debug-Hooks
   - Fit-Center nach Texturladung
*/

export const game = (() => {
  // ======= Konfig & Konstanten =======
  // GitHub Pages Pfadpräfix – hier liegt deine Seite:
  const BASE = "/siedler-mini";

  const TILE = 40;                 // Tilegröße (Weltkoordinaten)
  const GRID_COLOR = "#1e2a3d";
  const ROAD_COLOR = "#78d9a8";    // (nur falls du Linienstraße wieder aktivierst)
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";

  // ======= State =======
  const S = {
    running:false,
    // Canvas/CTX
    canvas:null, ctx:null, DPR:1, width:0, height:0,
    // Kamera
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:3,
    // Eingabe
    tool:"pointer",
    panning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Welt
    mapWidth:48, mapHeight:32,         // einfache Kartenabmessung in Tiles
    roads:[],                          // falls Linienstraßen wieder gewünscht
    buildings:[],                      // {type, x, y, w, h}
    carriers:[],                       // (Platzhalter für Träger)
    // Texturen
    tex:{},
    // UI-Hooks
    onHUD:(k,v)=>{},
    log:(s)=>{},
  };

  // ======= Utilities =======
  const clamp = (v,a,b)=>Math.max(a, Math.min(b,v));
  const setHUD = (k,v)=> S.onHUD?.(k,v);

  const toWorld = (sx,sy)=>({
    // Screen -> Welt, berücksichtigt DPR & zoom
    x: (sx/S.DPR - S.width/2)/S.zoom + S.camX,
    y: (sy/S.DPR - S.height/2)/S.zoom + S.camY
  });
  const toScreen = (wx,wy)=>({
    x: (wx - S.camX) * S.zoom + S.width/2,
    y: (wy - S.camY) * S.zoom + S.height/2
  });

  const snap = v => Math.round(v / TILE) * TILE;

  // ======= Texture-Loader (robust .png/.PNG) =======
  function loadImageAuto(urlBase) {
    return new Promise((resolve, reject) => {
      const i1 = new Image();
      i1.onload = ()=>resolve(i1);
      i1.onerror = ()=>{
        const i2 = new Image();
        i2.onload = ()=>resolve(i2);
        i2.onerror = reject;
        i2.src = urlBase + ".PNG";
      };
      i1.src = urlBase + ".png";
    });
  }

  async function loadTextures() {
    const t = {};
    // Böden
    t.grass  = await loadImageAuto(`${BASE}/assets/tex/topdown_grass`);
    t.dirt   = await loadImageAuto(`${BASE}/assets/tex/topdown_dirt`);
    t.forest = await loadImageAuto(`${BASE}/assets/tex/topdown_forest`);
    t.water  = await loadImageAuto(`${BASE}/assets/tex/topdown_water`);

    // Wege‑Erosion Tiles (optional genutzt)
    t.paths = [];
    for (let i=0;i<=9;i++){
      try { t.paths[i] = await loadImageAuto(`${BASE}/assets/tex/topdown_path${i}`); }
      catch { t.paths[i] = null; }
    }

    // (Optional) klassische Straßen‑Tiles
    t.road_straight = await loadImageAuto(`${BASE}/assets/tex/topdown_road_straight`).catch(()=>null);
    t.road_corner   = await loadImageAuto(`${BASE}/assets/tex/topdown_road_corner`).catch(()=>null);
    t.road_t        = await loadImageAuto(`${BASE}/assets/tex/topdown_road_t`).catch(()=>null);
    t.road_cross    = await loadImageAuto(`${BASE}/assets/tex/topdown_road_cross`).catch(()=>null);

    // Gebäude (mind. HQ Holz)
    t.hq_wood = await loadImageAuto(`${BASE}/assets/tex/hq_wood`).catch(()=>null);

    S.tex = t;
  }

  // ======= Canvas Setup =======
  function attachCanvas(canvas) {
    S.canvas = canvas;
    S.ctx = canvas.getContext("2d");
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();
    S.log("Canvas attached · DPR="+S.DPR);
  }

  function resizeCanvas() {
    const rect = S.canvas.getBoundingClientRect();
    S.width  = Math.max(1, Math.floor(rect.width  * S.DPR));
    S.height = Math.max(1, Math.floor(rect.height * S.DPR));
    if (S.canvas.width !== S.width)   S.canvas.width  = S.width;
    if (S.canvas.height!== S.height)  S.canvas.height = S.height;
  }

  // ======= Welt & Zeichnen =======
  function getWorldBounds(){
    const W = S.mapWidth*TILE, H = S.mapHeight*TILE;
    return {minX:0, minY:0, maxX:W, maxY:H};
  }

  function center(opts={fit:false, padding:0}){
    const b = getWorldBounds();
    const cx = (b.minX+b.maxX)/2, cy=(b.minY+b.maxY)/2;
    S.camX = cx; S.camY = cy;

    if (opts.fit) {
      const w=(b.maxX-b.minX)+2*opts.padding;
      const h=(b.maxY-b.minY)+2*opts.padding;
      const zx = S.width  /(w*S.DPR);
      const zy = S.height /(h*S.DPR);
      S.zoom = clamp(Math.min(zx,zy), S.minZoom, S.maxZoom);
      setHUD("Zoom", S.zoom.toFixed(2)+"x");
    }
  }

  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const step = TILE * S.zoom * S.DPR;
    const ox = (S.width/2  - (S.camX*S.zoom)*S.DPR) % step;
    const oy = (S.height/2 - (S.camY*S.zoom)*S.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=S.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,S.height); }
    for (let y=oy; y<=S.height;y+=step){ ctx.moveTo(0,y); ctx.lineTo(S.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  // einfache Tile‑Hintergrundzeichnung (Grass überall, plus Demo‑Patches)
  function drawTerrain(ctx){
    const {tex}=S;
    if (!tex.grass) return;

    // wie viele Tiles passen auf den Screen? (einfach bruteforce über Map laufen)
    for (let gy=0; gy<S.mapHeight; gy++){
      for (let gx=0; gx<S.mapWidth; gx++){
        const wx = gx*TILE + TILE/2, wy= gy*TILE + TILE/2;
        const p  = toScreen(wx,wy);

        const size = TILE*S.zoom*S.DPR;
        // Basis: Grass
        ctx.drawImage(tex.grass, Math.round(p.x*S.DPR - size/2), Math.round(p.y*S.DPR - size/2), Math.round(size), Math.round(size));

        // Demo‑Patches (links oben etwas Dirt)
        if (gx<10 && gy<8 && tex.dirt){
          ctx.drawImage(tex.dirt, Math.round(p.x*S.DPR - size/2), Math.round(p.y*S.DPR - size/2), Math.round(size), Math.round(size));
        }
        // kleiner Wald‑Fleck (rechts oben)
        if (gx>30 && gy<6 && tex.forest){
          ctx.drawImage(tex.forest, Math.round(p.x*S.DPR - size/2), Math.round(p.y*S.DPR - size/2), Math.round(size), Math.round(size));
        }
      }
    }
  }

  function fillRectWorld(ctx, x,y,w,h, color, label){
    const p = toScreen(x,y);
    const pw = w*S.zoom, ph=h*S.zoom;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect((p.x*S.DPR)-pw/2*S.DPR, (p.y*S.DPR)-ph/2*S.DPR, pw*S.DPR, ph*S.DPR);
    if (label){
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*S.DPR*S.zoom)}px system-ui,-apple-system`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(label, p.x*S.DPR, (p.y*S.DPR)-4*S.DPR);
    }
    ctx.restore();
  }

  function drawRoadSegment(ctx, r){
    const a = toScreen(r.x1,r.y1), b = toScreen(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle=ROAD_COLOR; ctx.lineWidth=3*S.zoom*S.DPR; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(a.x*S.DPR, a.y*S.DPR); ctx.lineTo(b.x*S.DPR, b.y*S.DPR); ctx.stroke();
    ctx.restore();
  }

  function drawWorld(){
    const ctx=S.ctx;
    ctx.clearRect(0,0,S.width,S.height);

    // Terrain zuerst
    drawTerrain(ctx);

    // Grid drüber (damit sieht man Ausrichtung)
    drawGrid(ctx);

    // Straßen (falls reaktiviert)
    // for (const r of S.roads) drawRoadSegment(ctx,r);

    // Gebäude
    for (const b of S.buildings){
      // Wenn Textur vorhanden, zeichnet sie sich schöner als die Box
      if (b.type==="hq" && S.tex.hq_wood){
        const p=toScreen(b.x,b.y);
        const size = Math.max(b.w,b.h)*S.zoom*S.DPR;
        S.ctx.drawImage(S.tex.hq_wood,
          Math.round(p.x*S.DPR - size/2), Math.round(p.y*S.DPR - size/2),
          Math.round(size), Math.round(size));
      } else {
        const col = b.type==="hq"?HQ_COLOR : b.type==="woodcutter"?WC_COLOR : DEPOT_COLOR;
        const lbl = b.type==="hq"?"HQ" : b.type==="woodcutter"?"Holzfäller":"Depot";
        fillRectWorld(ctx, b.x,b.y,b.w,b.h,col,lbl);
      }
    }
  }

  function tick(){
    if (!S.running){ drawWorld(); return requestAnimationFrame(tick); }
    drawWorld();
    requestAnimationFrame(tick);
  }

  // ======= Bauen / Abriss =======
  function placeBuilding(type, wx,wy){
    const b = {type, x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2};
    S.buildings.push(b);
  }

  function pointToSegmentDist(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot=A*C+B*D, len2=C*C+D*D;
    let t = len2? (dot/len2) : -1; t = clamp(t,0,1);
    const x=x1+t*C, y=y1+t*D;
    return Math.hypot(px-x, py-y);
  }

  function tryErase(wx,wy){
    // Gebäude
    for (let i=S.buildings.length-1;i>=0;i--){
      const b=S.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){
        S.buildings.splice(i,1); return true;
      }
    }
    // Straßen (falls aktiv)
    for (let i=S.roads.length-1;i>=0;i--){
      const r=S.roads[i];
      if (pointToSegmentDist(wx,wy,r.x1,r.y1,r.x2,r.y2) <= (6/S.zoom)) { S.roads.splice(i,1); return true; }
    }
    return false;
  }

  // ======= Eingabe =======
  function addInput(){
    const el=S.canvas;

    el.addEventListener("pointerdown", onDown, {passive:false});
    el.addEventListener("pointermove", onMove, {passive:false});
    el.addEventListener("pointerup",   onUp,   {passive:false});
    el.addEventListener("pointercancel",onUp,  {passive:false});
    el.addEventListener("wheel", onWheel, {passive:false});

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", ()=>setTimeout(resizeCanvas,250));

    // Doppel-Tap -> Vollbild (falls möglich)
    let lastTap=0;
    el.addEventListener("touchend", ()=>{
      const now=Date.now();
      if (now-lastTap<300) { toggleFullscreen(); }
      lastTap=now;
    }, {passive:true});
  }

  function isPrimary(e){ return (e.button===0 || e.button===undefined || e.button===-1 || e.pointerType==="touch"); }

  function onDown(e){
    if (!isPrimary(e)) return;
    try { S.canvas.setPointerCapture(e.pointerId); } catch{}

    const {x,y} = toWorld(e.clientX*S.DPR, e.clientY*S.DPR);

    if (S.tool==="pointer"){
      S.panning=true;
      S.panStartX = e.clientX; S.panStartY = e.clientY;
      S.camStartX = S.camX;    S.camStartY = S.camY;
    }
    else if (S.tool==="erase"){
      tryErase(x,y);
    }
    else if (S.tool==="hq" || S.tool==="woodcutter" || S.tool==="depot"){
      placeBuilding(S.tool, x,y);
    }
  }

  function onMove(e){
    if (S.panning && S.tool==="pointer"){
      e.preventDefault();
      const dx = (e.clientX - S.panStartX) / S.zoom;
      const dy = (e.clientY - S.panStartY) / S.zoom;
      S.camX = S.camStartX - dx;
      S.camY = S.camStartY - dy;
    }
  }
  function onUp(e){
    S.panning=false;
    try { S.canvas.releasePointerCapture(e.pointerId); } catch{}
  }

  function onWheel(e){
    e.preventDefault();
    const delta = -Math.sign(e.deltaY)*0.1;
    const before=S.zoom;
    S.zoom = clamp(S.zoom + delta, S.minZoom, S.maxZoom);
    if (S.zoom!==before) setHUD("Zoom", S.zoom.toFixed(2)+"x");
  }

  // ======= Public API =======
  function setTool(name){
    S.tool=name;
    setHUD("Tool",
      name==='pointer'?'Zeiger':
      name==='hq'?'HQ':
      name==='woodcutter'?'Holzfäller':
      name==='depot'?'Depot':'Abriss');
  }

  function toggleDebug(){
    // UI steuert Sichtbarkeit, hier nur Log-Ping
    S.log("Debug toggled");
  }

  async function startGame(opts){
    if (S.running) return;

    S.onHUD = (k,v)=> {
      if (opts && typeof opts.onHUD==="function") opts.onHUD(k,v);
      if (k==="Zoom"){ const el=document.querySelector("#hudZoom"); if (el) el.textContent=v; }
      if (k==="Tool"){ const el=document.querySelector("#hudTool"); if (el) el.textContent=v; }
    };
    S.log = (s)=> { if (opts && typeof opts.log==="function") opts.log(s); };

    attachCanvas(opts.canvas);
    await loadTextures();                 // <— Texturen laden
    addInput();

    // Startzustand
    setTool("pointer");
    S.zoom=1; setHUD("Zoom","1.00x");

    // Wichtig: nach Texture‑Load auf Inhalt fitten & zentrieren
    center({fit:true, padding: 2*TILE});

    S.running=true;
    requestAnimationFrame(tick);
  }

  // Vollbild mit WebKit‑Fallback
  function toggleFullscreen(){
    const el = document.documentElement;
    const inFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (!inFS){
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el).catch(()=>{}); else {
        const warn=document.getElementById("fullWarn"); if (warn) warn.style.display="block";
      }
    } else {
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) ex.call(document).catch(()=>{});
    }
    // nach FS-Change bitte neu layouten
    setTimeout(()=>{ resizeCanvas(); }, 200);
  }

  return {
    startGame,
    setTool,
    center,
    toggleDebug,
    toggleFullscreen,
    get state(){ return S; },
  };
})();
