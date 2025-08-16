// Siedler‑Mini V15.0.3 – game.js
// - Stabiles Screen<->World Mapping (ohne Versatz, mit DPR & BoundingClientRect)
// - Panning nur im Zeiger-Tool, sanft & zoom-korrekt
// - Zoom (Wheel, Pinch-kompatibel), HUD-Updates (Tool/Zoom)
// - Raster-Snap fürs Bauen, Abriss mit Trefferprüfung
// - placeInitialHQ() & center() für sicheren Start

export const game = (() => {
  // --- Konstante ---
  const TILE = 40;                     // Rastergröße (px bei Zoom 1)
  const GRID_COLOR = "#1e2a3d";
  const TEXT_COLOR = "#cfe3ff";

  // --- State ---
  const S = {
    running:false,
    canvas:null, ctx:null, DPR:1,
    width:0, height:0,                 // Canvas-Pixel (DPR-skalierte Werte)
    camX:0, camY:0, zoom:1,            // Kamera + Zoom
    minZoom:0.5, maxZoom:2.5,

    tool:'pointer',                    // 'pointer' | 'hq' | 'woodcutter' | 'depot' | 'erase'
    panning:false, sx:0, sy:0, scx:0, scy:0,

    // Weltobjekte
    roads:[],                          // (derzeit deaktiviert; behalten für später)
    buildings:[],                      // {type, x,y,w,h}

    // HUD-Bridge
    onHUD: (k,v)=>{},
  };

  // ---------- Initialisierung ----------
  function attachCanvas(canvas){
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resize();
    requestAnimationFrame(loop);
  }

  function resize(){
    if (!S.canvas) return;
    const r = S.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width  * S.DPR));
    const h = Math.max(1, Math.floor(r.height * S.DPR));
    if (S.canvas.width  !== w) S.canvas.width  = w;
    if (S.canvas.height !== h) S.canvas.height = h;
    S.width = w; S.height = h;
  }

  // ---------- Koordinaten: Screen -> World / World -> Screen ----------
  function toWorld(clientX, clientY){
    const rect = S.canvas.getBoundingClientRect();
    // Canvas-Pixel (mit DPR)
    const cx = (clientX - rect.left) * S.DPR;
    const cy = (clientY - rect.top)  * S.DPR;
    // Mittelpunkt als (0,0), dann Zoom & Kamera anwenden
    const wx = (cx - S.width/2)  / S.zoom + S.camX;
    const wy = (cy - S.height/2) / S.zoom + S.camY;
    return {x:wx, y:wy};
  }
  function toScreen(wx, wy){
    return {
      x: (wx - S.camX) * S.zoom + S.width/2,
      y: (wy - S.camY) * S.zoom + S.height/2
    };
  }

  // ---------- Zeichnen ----------
  function drawGrid(){
    const ctx = S.ctx;
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    const step = TILE * S.zoom;
    const ox = (S.width/2  - S.camX * S.zoom) % step;
    const oy = (S.height/2 - S.camY * S.zoom) % step;

    ctx.beginPath();
    for (let x = ox; x <= S.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, S.height); }
    for (let y = oy; y <= S.height; y += step){ ctx.moveTo(0, y); ctx.lineTo(S.width, y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawBuildings(){
    const ctx = S.ctx;
    for (const b of S.buildings){
      const p = toScreen(b.x, b.y);
      const w = b.w * S.zoom, h = b.h * S.zoom;
      ctx.save();
      ctx.fillStyle =
        b.type==='hq' ? '#43aa62' :
        b.type==='woodcutter' ? '#3f8cff' :
        '#d55384'; // depot
      ctx.fillRect(p.x - w/2, p.y - h/2, w, h);

      // Label
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12 * S.zoom)}px system-ui, -apple-system, Segoe UI`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const label =
        b.type==='hq' ? 'HQ' :
        b.type==='woodcutter' ? 'Holzfäller' : 'Depot';
      ctx.fillText(label, p.x, p.y - h/2 - 4);
      ctx.restore();
    }
  }

  function render(){
    const ctx = S.ctx;
    ctx.clearRect(0,0,S.width,S.height);
    drawGrid();
    // Straßen für später: for (const r of S.roads) drawRoad(r)
    drawBuildings();
  }

  function loop(){
    render();
    requestAnimationFrame(loop);
  }

  // ---------- Eingabe ----------
  function addInput(){
    const el = S.canvas;
    el.addEventListener('pointerdown', onDown, {passive:false});
    el.addEventListener('pointermove', onMove,  {passive:false});
    el.addEventListener('pointerup',   onUp,    {passive:false});
    el.addEventListener('pointercancel', onUp,  {passive:false});
    el.addEventListener('wheel', onWheel, {passive:false});

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', ()=>setTimeout(resize,200));
    document.addEventListener('fullscreenchange', resize);
    document.addEventListener('webkitfullscreenchange', resize);
  }

  function onWheel(e){
    e.preventDefault();
    const before = S.zoom;
    S.zoom = clamp(S.zoom + (-Math.sign(e.deltaY)*0.1), S.minZoom, S.maxZoom);
    if (S.zoom !== before) S.onHUD?.('Zoom', `${S.zoom.toFixed(2)}x`);
  }

  function onDown(e){
    // Primärpointer (Links/Tap)
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    try { S.canvas.setPointerCapture(e.pointerId); } catch {}

    if (S.tool === 'pointer'){
      S.panning = true;
      S.sx = e.clientX; S.sy = e.clientY;
      S.scx = S.camX;   S.scy = S.camY;
      return;
    }

    // Bauen/Abriss
    const w = toWorld(e.clientX, e.clientY);
    if (S.tool === 'hq')          place('hq', w.x, w.y);
    else if (S.tool === 'woodcutter') place('woodcutter', w.x, w.y);
    else if (S.tool === 'depot')  place('depot', w.x, w.y);
    else if (S.tool === 'erase')  eraseAt(w.x, w.y);
  }

  function onMove(e){
    if (!S.panning || S.tool !== 'pointer') return;
    e.preventDefault();
    // Pan im World-Space (wegen Zoom)
    const dx = (e.clientX - S.sx) / S.zoom;
    const dy = (e.clientY - S.sy) / S.zoom;
    S.camX = S.scx - dx;
    S.camY = S.scy - dy;
  }

  function onUp(e){
    S.panning = false;
    try { S.canvas.releasePointerCapture(e.pointerId); } catch {}
  }

  // ---------- Welt-Operationen ----------
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
  const SNAP  = v => Math.round(v / TILE) * TILE;

  function place(type, x, y){
    S.buildings.push({ type, x: SNAP(x), y: SNAP(y), w: TILE*2, h: TILE*2 });
  }

  function eraseAt(x,y){
    for (let i=S.buildings.length-1;i>=0;i--){
      const b = S.buildings[i];
      if (x>=b.x-b.w/2 && x<=b.x+b.w/2 && y>=b.y-b.h/2 && y<=b.y+b.h/2){
        S.buildings.splice(i,1);
        return;
      }
    }
  }

  // ---------- API ----------
  function setTool(t){
    S.tool = t;
    S.onHUD?.('Tool', t==='pointer' ? 'Zeiger' : t);
  }

  function center(){
    S.camX = 0; S.camY = 0;
  }

  function placeInitialHQ(){
    // nur ein Mal – falls noch keins existiert
    if (!S.buildings.some(b=>b.type==='hq')){
      place('hq', 0, 0);
    }
  }

  async function startGame(opts){
    if (S.running) return;
    S.onHUD = opts?.onHUD || (()=>{});
    attachCanvas(opts.canvas);
    addInput();
    setTool('pointer');
    S.onHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    S.running = true;
  }

  // öffentliche API
  return {
    startGame,
    setTool,
    center,
    placeInitialHQ,
    get state(){ return S; }
  };
})();
