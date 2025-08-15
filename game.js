/* Siedler-Mini V15-hf2
   Fixes: Debug-API, Autocenter, robustes Touch-Pan/Pinch, Resize in FS
*/
export const game = (() => {
  // ====== Konstante Welt/Tile-Größe ======
  const TILE = 40; // px bei Zoom 1.0

  // ====== State ======
  const state = {
    running: false,
    debug: false,

    // Canvas
    canvas: null, ctx: null,
    DPR: 1, sw: 0, sh: 0, // screen px (device)

    // Kamera
    camX: 0, camY: 0, zoom: 1,
    minZoom: 0.5, maxZoom: 2.5,

    // Eingabe
    tool: "pointer",
    panning: false, panSX:0, panSY:0, panCX:0, panCY:0,
    pointers: new Map(), pinchStartZoom: 1,

    // Welt
    world: { wTiles: 64, hTiles: 48 }, // anpassbar
    roads: [],
    buildings: [],

    // HUD hook
    onHUD: null,
  };

  // ====== Utils ======
  const setHUD = (k,v)=> state.onHUD && state.onHUD(k,v);
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));

  const toWorld = (clientX, clientY) => {
    // client → device px
    const dx = clientX * state.DPR;
    const dy = clientY * state.DPR;
    // device → screen css px
    const sx = dx/state.DPR, sy = dy/state.DPR;
    return {
      x: (sx - state.sw/2)/state.zoom + state.camX,
      y: (sy - state.sh/2)/state.zoom + state.camY
    };
  };
  const toScreen = (wx,wy) => ({
    x: (wx - state.camX) * state.zoom + state.sw/2,
    y: (wy - state.camY) * state.zoom + state.sh/2
  });
  const snap = v => Math.round(v / TILE) * TILE;

  // ====== Canvas/Resize ======
  function initCanvas(canvas, opts={}){
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d", { alpha: true });
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    state.onHUD = opts.onHUD || null;

    // für iOS Touch
    canvas.style.touchAction = "none";

    resizeCanvas(); // setzt sw/sh und Canvasgröße
    generateDemoTerrain();  // provisorisch

    writeZoom();
    drawFrame();

    addInput();
    // auf Orientation/FS reagieren
    window.addEventListener("resize", () => { resizeCanvas(); center(); });
    document.addEventListener("fullscreenchange", ()=> { resizeCanvas(); center(); });
    document.addEventListener("webkitfullscreenchange", ()=> { resizeCanvas(); center(); });
  }

  function resizeCanvas(){
    const rect = state.canvas.getBoundingClientRect();
    state.sw = Math.max(1, Math.floor(rect.width));
    state.sh = Math.max(1, Math.floor(rect.height));
    // physische Pixel auf DPR
    state.canvas.width  = Math.floor(state.sw * state.DPR);
    state.canvas.height = Math.floor(state.sh * state.DPR);
  }

  // ====== Demo-Terrain + Autocenter ======
  // nutzt deine assets/tex/*.PNG (Case-insensitive)
  const tex = {};
  function loadTex(name, path){
    return new Promise((res,rej)=>{
      const img = new Image();
      img.onload = () => { tex[name]=img; res(); };
      img.onerror = rej;
      img.src = path;
    });
  }

  async function ensureTextures(){
    if (tex._ready) return;
    const base = "./assets/tex/";
    await Promise.all([
      loadTex("grass", base+"topdown_grass.PNG"),
      loadTex("dirt",  base+"topdown_dirt.PNG"),
      loadTex("forest",base+"topdown_forest.PNG"),
      loadTex("water", base+"topdown_water.PNG"),
      loadTex("r_straight", base+"topdown_road_straight.PNG"),
      loadTex("r_corner",   base+"topdown_road_corner.PNG"),
      loadTex("r_t",        base+"topdown_road_t.PNG"),
      loadTex("r_cross",    base+"topdown_road_cross.PNG"),
    ]).catch(()=>{/* wenn was fehlt, malen wir fallback */});
    tex._ready = true;
  }

  function generateDemoTerrain(){
    // Weltgröße kann später mit Mapgen kommen
    // Autocenter direkt hier: Kamera auf Weltmitte
    center();
  }

  // ====== Zeichnen ======
  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#1e2a3d";
    const step = TILE * state.zoom;
    // Ursprung so wählen, dass Linien „am Grid“ liegen
    const ox = (state.sw/2 - state.camX*state.zoom) % step;
    const oy = (state.sh/2 - state.camY*state.zoom) % step;
    ctx.beginPath();
    for (let x=ox; x<=state.sw; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.sh); }
    for (let y=oy; y<=state.sh; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.sw,y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawTerrain(ctx){
    // sehr einfache Kachelzeichnung: nur Gras als Teppich
    // (deine hochgeladenen Tiles werden genutzt, wenn geladen)
    const cols = Math.ceil(state.sw/(TILE*state.zoom))+2;
    const rows = Math.ceil(state.sh/(TILE*state.zoom))+2;

    const startWX = state.camX - state.sw/(2*state.zoom);
    const startWY = state.camY - state.sh/(2*state.zoom);

    const startCol = Math.floor(startWX / TILE);
    const startRow = Math.floor(startWY / TILE);

    for (let r=0; r<rows; r++){
      for (let c=0; c<cols; c++){
        const wx = (startCol + c) * TILE;
        const wy = (startRow + r) * TILE;
        const p = toScreen(wx,wy);
        const size = TILE * state.zoom;

        const img = tex.grass;
        if (img) {
          state.ctx.drawImage(
            img, 
            Math.round(p.x), Math.round(p.y),
            Math.ceil(size), Math.ceil(size)
          );
        } else {
          state.ctx.fillStyle = "#1c2a20";
          state.ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(size), Math.ceil(size));
        }
      }
    }
  }

  function drawRoad(r){
    const a = toScreen(r.x1,r.y1), b = toScreen(r.x2,r.y2);
    const ctx = state.ctx;
    ctx.save();
    ctx.lineWidth = 6 * state.zoom;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#b6864e"; // Basisfarbe, wird später per Tile ersetzt
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBuildings(){
    const ctx = state.ctx;
    for (const b of state.buildings){
      const p = toScreen(b.x,b.y);
      const w = b.w*state.zoom, h=b.h*state.zoom;
      ctx.save();
      ctx.fillStyle = b.type==="hq" ? "#43aa62" : b.type==="woodcutter" ? "#3f8cff" : "#d55384";
      ctx.fillRect(p.x - w/2, p.y - h/2, w, h);
      ctx.fillStyle = "#cfe3ff";
      ctx.font = `${Math.max(10, 12*state.zoom)}px system-ui, -apple-system`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(
        b.type==="hq" ? "HQ" : b.type==="woodcutter" ? "Holzfäller" : "Depot",
        p.x, p.y - h/2 - 4
      );
      ctx.restore();
    }
  }

  function drawDebug(){
    if (!state.debug) return;
    const ctx = state.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(20,30,60,.7)";
    ctx.fillRect(10, 10, 280, 110);
    ctx.fillStyle = "#cfe3ff";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    const lines = [
      `DPR: ${state.DPR.toFixed(2)}`,
      `Screen: ${state.sw}x${state.sh}`,
      `Zoom: ${state.zoom.toFixed(2)}`,
      `Cam: ${state.camX.toFixed(1)}, ${state.camY.toFixed(1)}`,
      `Pointers: ${state.pointers.size}`,
      `Tool: ${state.tool}`
    ];
    lines.forEach((t,i)=> ctx.fillText(t, 18, 34+i*16) );
    ctx.restore();
  }

  function drawFrame(){
    const ctx = state.ctx;
    ctx.save();
    ctx.scale(state.DPR, state.DPR);
    ctx.clearRect(0,0,state.sw, state.sh);

    drawTerrain(ctx);
    drawGrid(ctx);
    state.roads.forEach(drawRoad);
    drawBuildings();
    drawDebug();

    ctx.restore();
    requestAnimationFrame(drawFrame);
  }

  // ====== Build basics ======
  let roadStart = null;
  function placeOrFinishRoad(wx,wy){
    const gx = snap(wx), gy = snap(wy);
    if (!roadStart){ roadStart = {x:gx,y:gy}; return; }
    const seg = { x1: roadStart.x, y1: roadStart.y, x2: gx, y2: gy };
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) state.roads.push(seg);
    roadStart = null;
  }

  function placeBuilding(type, x,y){
    state.buildings.push({ type, x:snap(x), y:snap(y), w:TILE*2, h:TILE*2 });
  }

  function tryErase(wx,wy){
    // Gebäude
    for (let i=state.buildings.length-1; i>=0; i--){
      const b = state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ state.buildings.splice(i,1); return; }
    }
    // Straßen (Distanzschwellwert ~6px)
    const hit = 6 / state.zoom;
    for (let i=state.roads.length-1; i>=0; i--){
      const r = state.roads[i];
      const d = pointToSegmentDist(wx,wy, r.x1,r.y1, r.x2,r.y2);
      if (d <= hit){ state.roads.splice(i,1); return; }
    }
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

  // ====== Input ======
  function addInput(){
    const el = state.canvas;

    el.addEventListener("pointerdown", onPD, {passive:false});
    el.addEventListener("pointermove", onPM, {passive:false});
    el.addEventListener("pointerup",   onPU, {passive:false});
    el.addEventListener("pointercancel", onPU, {passive:false});

    el.addEventListener("wheel", onWheel, {passive:false});
  }

  function onWheel(e){
    e.preventDefault();
    if (state.tool !== "pointer") return;
    const delta = -Math.sign(e.deltaY) * 0.1;
    setZoom(state.zoom + delta);
  }

  function onPD(e){
    // Pointer registrieren (für Pinch)
    state.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    try { state.canvas.setPointerCapture(e.pointerId); } catch{}

    if (state.pointers.size >= 2 && state.tool === "pointer"){
      // Pinch setup
      state.pinchStartZoom = state.zoom;
      return;
    }

    const {x,y} = toWorld(e.clientX, e.clientY);

    if (state.tool === "pointer"){
      state.panning = true;
      state.panSX = e.clientX; state.panSY = e.clientY;
      state.panCX = state.camX; state.panCY = state.camY;
    } else if (state.tool === "road"){
      placeOrFinishRoad(x,y);
    } else if (state.tool === "hq"){
      placeBuilding("hq", x,y);
    } else if (state.tool === "woodcutter"){
      placeBuilding("woodcutter", x,y);
    } else if (state.tool === "depot"){
      placeBuilding("depot", x,y);
    } else if (state.tool === "erase"){
      tryErase(x,y);
    }
  }

  function onPM(e){
    const p = state.pointers.get(e.pointerId);
    if (p){ p.x = e.clientX; p.y = e.clientY; }

    // Pinch?
    if (state.pointers.size >= 2 && state.tool === "pointer"){
      const pts = [...state.pointers.values()];
      const d = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
      // einfache relative Änderung
      const base = 180; // „Gefühl“
      const factor = clamp(d / base, 0.3, 3);
      setZoom( clamp(1 * factor, state.minZoom, state.maxZoom) );
      return;
    }

    // Pan?
    if (state.panning && state.tool === "pointer"){
      const dx = (e.clientX - state.panSX) / state.zoom;
      const dy = (e.clientY - state.panSY) / state.zoom;
      state.camX = state.panCX - dx;
      state.camY = state.panCY - dy;
      e.preventDefault();
    }
  }

  function onPU(e){
    try { state.canvas.releasePointerCapture(e.pointerId); } catch{}
    state.pointers.delete(e.pointerId);
    state.panning = false;
  }

  function setZoom(z){
    const before = state.zoom;
    state.zoom = clamp(z, state.minZoom, state.maxZoom);
    if (state.zoom !== before) writeZoom();
  }
  function writeZoom(){ setHUD("Zoom", `${state.zoom.toFixed(2)}x`); }

  // ====== API ======
  function setTool(name){
    state.tool = name;
    if (name !== "road") roadStart = null;
    setHUD("Tool", name==='pointer' ? 'Zeiger' :
                   name==='road' ? 'Straße' :
                   name==='hq' ? 'HQ' :
                   name==='woodcutter' ? 'Holzfäller' :
                   name==='depot' ? 'Depot' : 'Abriss');
  }

  function center(){
    // Kamera in die geometrische Mitte der Welt
    const wx = (state.world.wTiles * TILE) / 2;
    const wy = (state.world.hTiles * TILE) / 2;
    state.camX = wx;
    state.camY = wy;
  }

  function toggleDebug(){
    state.debug = !state.debug;
  }

  function startGame(opts){
    if (state.running) return;
    if (opts?.onHUD) state.onHUD = opts.onHUD;
    state.running = true;

    // Texte laden, Terrain egal wenn fehlschlägt
    ensureTextures().then(()=>{/*noop*/});

    // Startwerte
    setTool("pointer");
    writeZoom();
    center();
  }

  return {
    // Lifecycle
    initCanvas,
    startGame,

    // Controls
    setTool,
    center,
    toggleDebug,

    // Debug Zugriff
    get state(){ return state; }
  };
})();
