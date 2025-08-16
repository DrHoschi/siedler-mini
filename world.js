// Siedler‑Mini V15 – Welt/Renderer/Bauen
export const world = (() => {
  // --------- State
  const S = {
    // Canvas & Kontext
    canvas: null, ctx: null,
    DPR: 1, width: 0, height: 0,

    // Kamera & Grid
    tileSize: 64,
    camX: 0, camY: 0, zoom: 1, minZoom: 0.5, maxZoom: 2.5,

    // Inhalte
    roads: [], // {x1,y1,x2,y2}
    buildings: [], // {type,x,y,w,h}

    // Tool
    tool: 'pointer',
    roadStart: null,

    // Callbacks
    onHUD: null,
    onDebug: null,

    // Loop
    running: false,
  };

  // --------- Utilities
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const roundTo = (v,step) => Math.round(v/step)*step;

  function setHUD(k,v){ S.onHUD && S.onHUD(k,v); }

  // Canvas Größe / DPR
  function resizeCanvas(){
    if (!S.canvas) return;
    const rect = S.canvas.getBoundingClientRect();
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.floor(rect.width  * S.DPR));
    const h = Math.max(1, Math.floor(rect.height * S.DPR));
    if (S.width !== w || S.height !== h){
      S.width = w; S.height = h;
      S.canvas.width = w; S.canvas.height = h;
    }
  }

  // Screen(client) → World
  function clientToWorldX(cx){
    // Screen‑Center als Ursprung
    const sx = cx * S.DPR;
    const worldX = (sx - S.width/2) / S.zoom + S.camX;
    return worldX;
  }
  function clientToWorldY(cy){
    const sy = cy * S.DPR;
    const worldY = (sy - S.height/2) / S.zoom + S.camY;
    return worldY;
  }
  // World → Screen (ctx‑Koordinaten)
  function worldToScreen(wx, wy){
    const sx = (wx - S.camX) * S.zoom + S.width/2;
    const sy = (wy - S.camY) * S.zoom + S.height/2;
    return { x: sx, y: sy };
  }

  function setZoom(target, anchorClientX, anchorClientY){
    const old = S.zoom;
    S.zoom = clamp(target, S.minZoom, S.maxZoom);
    if (S.zoom === old) return;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    // optional: Zoom zur Maus/Touch verankern (Pivot)
    if (anchorClientX != null && anchorClientY != null){
      // Weltpunkt vor dem Zoom:
      const wxBefore = clientToWorldX(anchorClientX);
      const wyBefore = clientToWorldY(anchorClientY);
      // Nach Zoom Kamera so verschieben, dass derselbe Weltpunkt unter dem Cursor bleibt:
      const sx = anchorClientX * S.DPR, sy = anchorClientY * S.DPR;
      S.camX = wxBefore - (sx - S.width/2) / S.zoom;
      S.camY = wyBefore - (sy - S.height/2) / S.zoom;
    }
  }

  function setCamera(x,y){
    S.camX = x; S.camY = y;
  }

  // ---- Tiles / Snap
  function worldToTile(wx, wy){
    const ts = S.tileSize;
    return {
      tx: Math.floor(wx / ts),
      ty: Math.floor(wy / ts)
    };
  }
  function tileToWorldCenter(tx,ty){
    const ts = S.tileSize;
    return { x: tx*ts + ts/2, y: ty*ts + ts/2 };
  }

  // --------- Render
  function drawGrid(){
    const ctx = S.ctx;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e2a3d';

    const step = S.tileSize * S.zoom;
    const ox = (S.width/2 - S.camX*S.zoom) % step;
    const oy = (S.height/2 - S.camY*S.zoom) % step;

    ctx.beginPath();
    for (let x=ox; x<=S.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,S.height); }
    for (let y=oy; y<=S.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(S.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawRoad(r){
    const ctx = S.ctx;
    const a = worldToScreen(r.x1, r.y1);
    const b = worldToScreen(r.x2, r.y2);
    ctx.save();
    ctx.strokeStyle = '#78d9a8';
    ctx.lineWidth = 3 * S.zoom;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBuilding(b){
    const ctx = S.ctx;
    const p = worldToScreen(b.x, b.y);
    const w = b.w * S.zoom;
    const h = b.h * S.zoom;
    ctx.save();
    ctx.fillStyle =
      b.type==='hq' ? '#43aa62' :
      b.type==='woodcutter' ? '#3f8cff' :
      b.type==='depot' ? '#d55384' :
      b.type==='farm' ? '#f5c15b' :
      '#9aa7b3';

    ctx.fillRect(p.x - w/2, p.y - h/2, w, h);

    ctx.fillStyle = '#cfe3ff';
    ctx.font = `${Math.round(12*S.zoom)}px system-ui, -apple-system, Segoe UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      b.type==='hq' ? 'HQ' :
      b.type==='woodcutter' ? 'Holzfäller' :
      b.type==='depot' ? 'Depot' :
      b.type==='farm' ? 'Farm' : b.type,
      p.x, p.y - h/2 - 4*S.zoom
    );
    ctx.restore();
  }

  function render(){
    const ctx = S.ctx;
    ctx.save();
    ctx.clearRect(0,0,S.width,S.height);

    drawGrid();

    for (const r of S.roads) drawRoad(r);
    for (const b of S.buildings) drawBuilding(b);

    ctx.restore();
  }

  function tick(){
    if (!S.running) { render(); requestAnimationFrame(tick); return; }
    // (später: Carrier/Animationen)
    render();
    S.onDebug && S.onDebug();
    requestAnimationFrame(tick);
  }

  // --------- Build‑/Erase‑Logik
  function setTool(name){
    S.tool = name;
    if (name !== 'road') S.roadStart = null;
    setHUD('Tool',
      name==='pointer' ? 'Zeiger' :
      name==='road' ? 'Straße' :
      name==='hq' ? 'HQ' :
      name==='woodcutter' ? 'Holzfäller' :
      name==='depot' ? 'Depot' : 'Abriss'
    );
  }

  function placeBuilding(type, tx, ty){
    const ts = S.tileSize;
    const w = (type==='hq' ? 3 : 2) * ts;
    const h = (type==='hq' ? 3 : 2) * ts;
    const c = tileToWorldCenter(tx,ty);
    S.buildings.push({ type, x:c.x, y:c.y, w, h });
  }

  function pointSegDist(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot = A*C + B*D;
    const len2= C*C + D*D;
    let t = len2 ? dot/len2 : 0;
    t = clamp(t,0,1);
    const x = x1 + t*C, y = y1 + t*D;
    return Math.hypot(px-x, py-y);
  }

  function tryErase(wx, wy){
    // Gebäude
    for (let i=S.buildings.length-1; i>=0; i--){
      const b=S.buildings[i], x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ S.buildings.splice(i,1); return true; }
    }
    // Straßen (Hit 6px)
    const hit = 6 / S.zoom;
    for (let i=S.roads.length-1; i>=0; i--){
      const r=S.roads[i];
      if (pointSegDist(wx,wy, r.x1,r.y1,r.x2,r.y2) <= hit){ S.roads.splice(i,1); return true; }
    }
    return false;
  }

  function placeOrFinishRoad(tx,ty){
    const ts = S.tileSize;
    const c = tileToWorldCenter(tx,ty);
    if (!S.roadStart){ S.roadStart = {x:c.x, y:c.y}; return; }
    const seg = { x1:S.roadStart.x, y1:S.roadStart.y, x2:c.x, y2:c.y };
    if (Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1) S.roads.push(seg);
    S.roadStart = null;
  }

  // Tap‑Dispatcher: bekommt **Weltkoordinaten**
  function tap(wx, wy){
    switch (S.tool){
      case 'road': {
        const {tx,ty} = worldToTile(wx,wy);
        placeOrFinishRoad(tx,ty);
        break;
      }
      case 'hq': {
        const {tx,ty} = worldToTile(wx,wy);
        placeBuilding('hq',tx,ty);
        break;
      }
      case 'woodcutter': {
        const {tx,ty} = worldToTile(wx,wy);
        placeBuilding('woodcutter',tx,ty);
        break;
      }
      case 'depot': {
        const {tx,ty} = worldToTile(wx,wy);
        placeBuilding('depot',tx,ty);
        break;
      }
      case 'erase': {
        tryErase(wx,wy);
        break;
      }
      default: /* pointer */ break;
    }
  }

  // --------- Public Helpers für Input
  function start({canvas, onHUD, onDebug}){
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    S.onHUD = onHUD || null;
    S.onDebug = onDebug || null;
    resizeCanvas();
    S.zoom = 1.0;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    setTool('pointer');

    S.running = true;
  }

  // nur Grid/Platzhalter schon vor Start zeigen
  function bootstrap(canvas, onHUD){
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    S.onHUD = onHUD || null;
    resizeCanvas();
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    S.running = true;
    requestAnimationFrame(tick);
  }

  function softReset(){
    S.roads.length = 0;
    S.buildings.length = 0;
    S.camX = 0; S.camY = 0; S.zoom = 1.0;
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    setTool('pointer');
    resizeCanvas();
  }

  function centerOnContent(){
    if (S.buildings.length === 0) { S.camX=0; S.camY=0; return; }
    // Auf erstes HQ/falls nicht vorhanden erstes Gebäude zentrieren
    const hq = S.buildings.find(b=>b.type==='hq') || S.buildings[0];
    S.camX = hq.x; S.camY = hq.y;
  }

  function placeInitialHQ(){
    // HQ (Stein) mittig auf den Bildschirm‑Weltkoordinaten
    const cx = S.camX, cy = S.camY;
    const {tx,ty} = worldToTile(cx,cy);
    placeBuilding('hq', tx, ty);
  }

  // Exporte für Input
  function state(){
    return {
      DPR:S.DPR, width:S.width, height:S.height,
      camX:S.camX, camY:S.camY, zoom:S.zoom, tileSize:S.tileSize,
      roads:S.roads, buildings:S.buildings, tool:S.tool
    };
  }

  return {
    // Lifecycle
    bootstrap, start, softReset,
    // Camera/Zoom
    resizeCanvas, setZoom, setCamera, centerOnContent,
    // Build
    setTool, tap, placeInitialHQ,
    // Coord helpers for input
    clientToWorldX, clientToWorldY,
    // State (readonly snapshot)
    state
  };
})();
