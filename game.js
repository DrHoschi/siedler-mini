// game.js (V15) – Pan/Zoom fix + Start-HQ + einfache Build/Abriss
export const game = (() => {

  // --- Konstante & Farben ---
  const TILE = 40; // Basis-Kachel in Welt-Einheiten
  const GRID_COLOR = "#203346";
  const ROAD_COLOR = "#78d9a8";
  const HQ_COLOR   = "#43aa62";
  const WC_COLOR   = "#3f8cff";
  const DEPOT_COLOR= "#d55384";
  const TEXT_COLOR = "#cfe3ff";

  // --- State ---
  const S = {
    running: false,
    canvas: null, ctx: null,
    dpr: 1,
    cssW: 0, cssH: 0,         // Canvasgröße in CSS-Pixeln (für Input)
    pxW: 0, pxH: 0,           // echte Canvasgröße in Device-Pixeln (für Render)
    // Kamera
    camX: 0, camY: 0, zoom: 1,
    minZoom: 0.5, maxZoom: 2.5,
    // Eingabe
    tool: 'pointer',
    panning: false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
    // Welt
    roads: [],
    buildings: [],
    // HUD/Debug callbacks
    onHUD: null,
    onDebug: null,
  };

  const setHUD = (k,v)=> S.onHUD && S.onHUD(k,v);
  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));

  // --- Koordinaten (CSS → Welt / Welt → Screen) ---
  function cssToWorld(cssX, cssY) {
    // cssX/cssY: Position relativ zur Canvas (CSS-Pixel)
    const wx = (cssX - S.cssW/2) / S.zoom + S.camX;
    const wy = (cssY - S.cssH/2) / S.zoom + S.camY;
    return {x:wx, y:wy};
  }
  function worldToCss(wx, wy) {
    const x = (wx - S.camX) * S.zoom + S.cssW/2;
    const y = (wy - S.camY) * S.zoom + S.cssH/2;
    return {x, y};
  }
  function clientToCanvasCSS(clientX, clientY){
    const r = S.canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  // --- Canvas Größen ---
  function resizeCanvas() {
    const r = S.canvas.getBoundingClientRect();
    S.cssW = Math.max(1, Math.floor(r.width));
    S.cssH = Math.max(1, Math.floor(r.height));
    S.pxW  = Math.max(1, Math.floor(r.width  * S.dpr));
    S.pxH  = Math.max(1, Math.floor(r.height * S.dpr));
    if (S.canvas.width !== S.pxW || S.canvas.height !== S.pxH) {
      S.canvas.width  = S.pxW;
      S.canvas.height = S.pxH;
    }
  }

  // --- Zeichnen ---
  function clear() {
    S.ctx.clearRect(0,0,S.pxW, S.pxH);
  }
  function drawGrid() {
    const ctx = S.ctx;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const stepPx = TILE * S.zoom * S.dpr;
    const ox = (S.pxW/2 - (S.camX*S.zoom)*S.dpr) % stepPx;
    const oy = (S.pxH/2 - (S.camY*S.zoom)*S.dpr) % stepPx;
    ctx.beginPath();
    for (let x=ox; x<=S.pxW; x+=stepPx){ ctx.moveTo(x,0); ctx.lineTo(x,S.pxH); }
    for (let y=oy; y<=S.pxH; y+=stepPx){ ctx.moveTo(0,y); ctx.lineTo(S.pxW,y); }
    ctx.stroke();
    ctx.restore();
  }
  function fillRectWorld(wx,wy,w,h,color,label){
    const ctx = S.ctx;
    const p = worldToCss(wx,wy);
    const wPx = w * S.zoom * S.dpr;
    const hPx = h * S.zoom * S.dpr;
    const xPx = (p.x * S.dpr) - wPx/2;
    const yPx = (p.y * S.dpr) - hPx/2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(xPx, yPx, wPx, hPx);
    if (label){
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*S.dpr*S.zoom)}px ui-sans-serif, system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, p.x*S.dpr, yPx-3*S.dpr);
    }
    ctx.restore();
  }
  function drawRoad(r){
    const ctx = S.ctx;
    const a = worldToCss(r.x1,r.y1);
    const b = worldToCss(r.x2,r.y2);
    ctx.save();
    ctx.strokeStyle = ROAD_COLOR;
    ctx.lineWidth = 3 * S.zoom * S.dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x*S.dpr, a.y*S.dpr);
    ctx.lineTo(b.x*S.dpr, b.y*S.dpr);
    ctx.stroke();
    ctx.restore();
  }
  function render() {
    clear();
    drawGrid();
    // Straßen
    for (const r of S.roads) drawRoad(r);
    // Gebäude
    for (const b of S.buildings) {
      const color =
        b.type==='hq' ? HQ_COLOR :
        b.type==='woodcutter' ? WC_COLOR : DEPOT_COLOR;
      const label =
        b.type==='hq' ? 'HQ' :
        b.type==='woodcutter' ? 'Holzfäller' : 'Depot';
      fillRectWorld(b.x,b.y, b.w,b.h, color, label);
    }
  }

  // --- Loop ---
  function tick(){
    if (S.onDebug) S.onDebug(debugState());
    render();
    requestAnimationFrame(tick);
  }
  const debugState = () => ({
    zoom:S.zoom, dpr:S.dpr, camX:S.camX, camY:S.camY,
    cssW:S.cssW, cssH:S.cssH,
    roads:S.roads, buildings:S.buildings,
    tool:S.tool, panning:S.panning
  });

  // --- Build/Abriss ---
  const snap = v => Math.round(v / TILE) * TILE;

  function placeBuilding(type, wx, wy){
    const b = { type, x:snap(wx), y:snap(wy), w:TILE*2, h:TILE*2 };
    S.buildings.push(b);
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
  function tryErase(wx, wy){
    // Gebäude
    for (let i=S.buildings.length-1; i>=0; i--){
      const b = S.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){
        S.buildings.splice(i,1);
        return true;
      }
    }
    // Straßen
    const hit = 6 / S.zoom;
    for (let i=S.roads.length-1; i>=0; i--){
      const r=S.roads[i];
      if (pointToSegmentDist(wx,wy, r.x1,r.y1, r.x2,r.y2) <= hit){
        S.roads.splice(i,1);
        return true;
      }
    }
    return false;
  }

  // Straßenbau: Klick Start → Klick Ende
  let roadStart = null;
  function placeOrFinishRoad(wx,wy){
    const gx=snap(wx), gy=snap(wy);
    if (!roadStart){ roadStart = {x:gx,y:gy}; return; }
    const seg = {x1:roadStart.x, y1:roadStart.y, x2:gx, y2:gy};
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) S.roads.push(seg);
    roadStart = null;
  }

  // --- Zoom (zum Zeiger/Touchpunkt) ---
  function zoomAt(factor, cssX, cssY){
    const before = cssToWorld(cssX, cssY);
    const old = S.zoom;
    S.zoom = clamp(S.zoom * factor, S.minZoom, S.maxZoom);
    if (S.zoom !== old){
      const after = cssToWorld(cssX, cssY);
      // schiebe die Kamera so, dass der Punkt unter dem Finger gleich bleibt
      S.camX += (before.x - after.x);
      S.camY += (before.y - after.y);
      setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    }
  }

  // --- Input ---
  function addInput(){
    const el = S.canvas;

    el.addEventListener('pointerdown', onPointerDown, {passive:false});
    el.addEventListener('pointermove', onPointerMove, {passive:false});
    el.addEventListener('pointerup', onPointerUp, {passive:false});
    el.addEventListener('pointercancel', onPointerUp, {passive:false});

    // Mausrad-Zoom
    el.addEventListener('wheel', (e)=>{
      e.preventDefault();
      const dir = -Math.sign(e.deltaY);
      const factor = 1 + dir*0.12;
      const p = clientToCanvasCSS(e.clientX, e.clientY);
      zoomAt(factor, p.x, p.y);
    }, {passive:false});

    // Resize
    window.addEventListener('resize', ()=>{ resizeCanvas(); });
    window.addEventListener('orientationchange', ()=> setTimeout(resizeCanvas,250));
    document.addEventListener('fullscreenchange', ()=> setTimeout(resizeCanvas,50));
    document.addEventListener('webkitfullscreenchange', ()=> setTimeout(resizeCanvas,50));
  }

  function onPointerDown(e){
    // Pointer-Capture
    try { S.canvas.setPointerCapture(e.pointerId); } catch{}
    const pCSS = clientToCanvasCSS(e.clientX, e.clientY);
    const pW = cssToWorld(pCSS.x, pCSS.y);

    if (S.tool === 'pointer') {
      S.panning = true;
      S.panStartX = e.clientX;
      S.panStartY = e.clientY;
      S.camStartX = S.camX;
      S.camStartY = S.camY;
      return;
    }
    if (S.tool === 'hq')       { placeBuilding('hq', pW.x, pW.y); return; }
    if (S.tool === 'woodcutter'){ placeBuilding('woodcutter', pW.x, pW.y); return; }
    if (S.tool === 'depot')    { placeBuilding('depot', pW.x, pW.y); return; }
    if (S.tool === 'erase')    { tryErase(pW.x, pW.y); return; }
  }
  function onPointerMove(e){
    if (!S.panning) return;
    if (S.tool !== 'pointer') return;
    e.preventDefault();
    // *** WICHTIGER FIX: Pan exakt in CSS-Pixeln → Welt ***
    const dxCSS = (e.clientX - S.panStartX);
    const dyCSS = (e.clientY - S.panStartY);
    const dxWorld = dxCSS / (S.zoom);
    const dyWorld = dyCSS / (S.zoom);
    S.camX = S.camStartX - dxWorld;
    S.camY = S.camStartY - dyWorld;
  }
  function onPointerUp(e){
    S.panning = false;
    try { S.canvas.releasePointerCapture(e.pointerId); } catch{}
  }

  // --- Öffentliche API ---
  function setTool(name){
    S.tool = name;
    if (name !== 'road') roadStart = null;
    setHUD('Tool',
      name==='pointer' ? 'Zeiger' :
      name==='hq' ? 'HQ' :
      name==='woodcutter' ? 'Holzfäller' :
      name==='depot' ? 'Depot' : 'Abriss'
    );
  }
  function center(){
    S.camX = 0; S.camY = 0;
  }
  function startGame(opts){
    if (S.running) return;
    S.canvas = opts.canvas;
    S.ctx = S.canvas.getContext('2d');
    S.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    S.onHUD = opts.onHUD || null;
    S.onDebug = opts.onDebug || null;

    resizeCanvas();
    addInput();

    // Start-Zoom & Kamera
    S.zoom = 1.0;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    center();

    // Erstes HQ mittig setzen
    S.buildings.push({type:'hq', x:0, y:0, w:TILE*2, h:TILE*2});

    // Start-Tool
    setTool('pointer');

    S.running = true;
    tick();
  }

  return { startGame, setTool, center };
})();
