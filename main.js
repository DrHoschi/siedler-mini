// main.js  — Referenz V13.8.2
// ------------------------------------------------------------
// Öffentliche API für boot.js:
export async function init({ canvas, version }) { return _game.init(canvas, version); }
export async function run() { return _game.run(); }
export function setTool(name) { return _game.setTool(name); }
export function centerOnMap() { return _game.centerOnMap(); }
export function toggleDebug(){ _game.debug = !_game.debug; }
export let onToolChanged = () => {};
export let onZoomChanged = () => {};
// ------------------------------------------------------------

const _game = (() => {
  // ======= Grund-Setup =======
  const state = {
    version: 'V13.8.2',
    canvas: null, ctx: null,
    // Welt
    mapW: 96, mapH: 96,
    tiles: [], // {ground:'grass|water|shore|rocky|sand|dirt', road:0/1, b:'hq|lumber|depot|'}
    // Kamera
    zoom: 1.00, minZ: 0.35, maxZ: 2.2,
    camX: 0, camY: 0, // Screen-Offset
    // Iso-Basis
    tw: 64, th: 32,   // Logische Kachelgröße
    // Interaktion
    tool: 'pointer', dragging:false,
    lastX: 0, lastY: 0,
    touch: {pinch:false, d0:0, kz:1},
    // Bilder
    img: {},
    // Ressourcen
    res: { wood:20, stone:10, food:10, gold:0, carriers:0 },
    debug:false,
  };

  // ======= Hilfen =======
  const lerp=(a,b,t)=>a+(b-a)*t;

  function isoToScreen(tx,ty){
    const {tw,th,camX,camY,zoom} = state;
    const sx = ((tx - ty) * (tw/2)) * zoom + camX;
    const sy = ((tx + ty) * (th/2)) * zoom + camY;
    return [sx,sy];
  }
  function screenToIso(sx,sy){
    const {tw,th,camX,camY,zoom} = state;
    const x = (sx - camX)/zoom;
    const y = (sy - camY)/zoom;
    const tx = Math.floor((x/(tw/2) + y/(th/2))/2);
    const ty = Math.floor((y/(th/2) - x/(tw/2))/2);
    return [tx,ty];
  }
  function inMap(x,y){ return x>=0 && y>=0 && x<state.mapW && y<state.mapH; }

  // ======= Assets laden =======
  const IMG_LIST = {
    grass:'assets/grass.png',
    water:'assets/water.png',
    shore:'assets/shore.png',
    rocky:'assets/rocky.png',
    sand:'assets/sand.png',
    dirt:'assets/dirt.png',
    road:'assets/road.png',
    road_straight:'assets/road_straight.png',
    road_curve:'assets/road_curve.png',
    hq_stone:'assets/hq_stone.png',
    hq_wood:'assets/hq_wood.png',
    lumber:'assets/lumberjack.png',
    depot:'assets/depot.png',
    carrier:'assets/carrier.png'
  };
  function loadImage(src){
    return new Promise((res,rej)=>{
      const im=new Image();
      im.onload=()=>res(im);
      im.onerror=()=>rej(new Error('Bild fehlt: '+src));
      im.src=src;
    });
  }
  async function loadAssets(){
    const names = Object.keys(IMG_LIST);
    for(const n of names){
      try{
        state.img[n] = await loadImage(IMG_LIST[n]);
      }catch(e){
        // Fallback: Platzhalter zeichnen wir später einfach als farbige Rhomben
        console.warn('[assets]', e.message);
        state.img[n] = null;
      }
    }
  }

  // ======= Welt erzeugen =======
  function makeMap(){
    const {mapW,mapH} = state;
    state.tiles = new Array(mapW*mapH);
    const idx=(x,y)=>y*mapW+x;

    // Grund: viel Gras
    for(let y=0;y<mapH;y++){
      for(let x=0;x<mapW;x++){
        state.tiles[idx(x,y)] = { g:'grass', road:0, b:'' };
      }
    }
    // Ein See in der Nähe der Mitte
    const cx = Math.floor(mapW*0.62), cy = Math.floor(mapH*0.37);
    const rw = 14, rh = 10;
    for(let y=-rh;y<=rh;y++){
      for(let x=-rw;x<=rw;x++){
        const tx=cx+x, ty=cy+y;
        if(!inMap(tx,ty)) continue;
        const d = Math.abs(x)*0.8 + Math.abs(y);
        if(d<9) state.tiles[idx(tx,ty)].g='water';
        else if(d<11 && state.tiles[idx(tx,ty)].g!=='water') state.tiles[idx(tx,ty)].g='shore';
      }
    }
    // Start-HQ Stein exakt zentriert
    const hx = Math.floor(mapW/2), hy = Math.floor(mapH/2);
    state.tiles[idx(hx,hy)].b='hq_stone';
  }

  // ======= Rendering =======
  function clear(){
    const {ctx, canvas} = state;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // dezentes diagonales Muster
    const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    g.addColorStop(0,'#0d1526');
    g.addColorStop(1,'#0b1220');
    ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  function drawTile(tx,ty){
    const {ctx, img, tw, th, zoom} = state;
    const t = getTile(tx,ty);
    if(!t) return;
    const [sx,sy] = isoToScreen(tx,ty);

    const W = tw*zoom, H = th*zoom;

    // Boden
    const groundImg = img[t.g] || null;
    if(groundImg){
      ctx.drawImage(groundImg, sx - W/2, sy - H*0.75, W, H*1.5);
    }else{
      // Platzhalter: Rhombus
      ctx.fillStyle = t.g==='water' ? '#1f6aa3' :
                      t.g==='shore' ? '#e5d59a' :
                      t.g==='rocky' ? '#65707f' :
                      t.g==='sand'  ? '#c2a36d' :
                      t.g==='dirt'  ? '#6b4d36' : '#2a6d2f';
      drawDiamond(sx,sy,W,H);
    }

    // Straße
    if(t.road){
      const rimg = img.road || null;
      if(rimg) ctx.drawImage(rimg, sx - W/2, sy - H*0.75, W, H*1.5);
      else { ctx.strokeStyle='#c39464'; ctx.lineWidth=2*zoom; ctx.beginPath();
             ctx.moveTo(sx - W*0.28, sy); ctx.lineTo(sx + W*0.28, sy); ctx.stroke(); }
    }

    // Gebäude
    if(t.b){
      const key = t.b; // 'hq_stone'|'hq_wood'|'lumber'|'depot'
      const bim = state.img[key] || null;
      const BW = W*1.6, BH = H*2.1;
      if(bim) ctx.drawImage(bim, sx - BW*0.5, sy - BH*0.9, BW, BH);
      else { ctx.fillStyle='#7aa357'; drawDiamond(sx, sy - H*0.25, W*1.2, H*1.2); }
    }
  }
  function drawDiamond(cx,cy,w,h){
    const d=h/2;
    const ctx=state.ctx;
    ctx.beginPath();
    ctx.moveTo(cx, cy - d);
    ctx.lineTo(cx + w/2, cy);
    ctx.lineTo(cx, cy + d);
    ctx.lineTo(cx - w/2, cy);
    ctx.closePath();
    ctx.fill();
  }

  function getTile(x,y){
    if(!inMap(x,y)) return null;
    return state.tiles[y*state.mapW + x];
  }

  function render(){
    clear();
    const {ctx, canvas, mapW, mapH, tw, th, zoom} = state;

    // Sichtfenster heuristisch bestimmen (etwas Puffer)
    const margin = 3;
    const leftTop = screenToIso(-tw*zoom, -th*zoom);
    const rightBottom = screenToIso(canvas.width + tw*zoom, canvas.height + th*zoom);
    const x0 = Math.max(0, leftTop[0]-margin);
    const y0 = Math.max(0, leftTop[1]-margin);
    const x1 = Math.min(mapW-1, rightBottom[0]+margin);
    const y1 = Math.min(mapH-1, rightBottom[1]+margin);

    // Reihenfolge: nach (tx+ty) sortiert -> „Painter’s algorithm“
    for(let sum=(x0+y0); sum<= (x1+y1); sum++){
      for(let ty=y0; ty<=y1; ty++){
        const tx = sum - ty;
        if(tx < x0 || tx > x1) continue;
        drawTile(tx,ty);
      }
    }

    if(state.debug){
      ctx.fillStyle='rgba(255,255,255,.1)';
      ctx.fillRect(0,0,140,64);
      ctx.fillStyle='#9fb0d0';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`zoom: ${zoom.toFixed(2)}`, 8, 18);
      ctx.fillText(`cam: ${Math.round(state.camX)}, ${Math.round(state.camY)}`, 8, 34);
    }
  }

  // ======= Interaktion =======
  function setTool(name){
    state.tool = name;
    onToolChanged?.(name);
  }

  function placeAt(tx,ty){
    if(!inMap(tx,ty)) return;
    const t = getTile(tx,ty);
    switch(state.tool){
      case 'road':
        t.road = 1;
        break;
      case 'hq':
        t.b = 'hq_wood';
        break;
      case 'lumber':
        t.b = 'lumber';
        break;
      case 'depot':
        t.b = 'depot';
        break;
      case 'bulldoze':
        t.road = 0; if(t.b) t.b='';
        break;
      default:
        // Zeiger: nichts
        break;
    }
  }

  // Maus / Touch
  function onPointerDown(ev){
    state.canvas.setPointerCapture?.(ev.pointerId || 1);
    state.lastX = ev.clientX; state.lastY = ev.clientY;
    state.dragging = true;

    if(state.tool !== 'pointer'){
      // kurzer Tap -> bauen
      // (wir entscheiden beim Up anhand der Bewegung)
    }
  }
  function onPointerMove(ev){
    const dx = ev.clientX - state.lastX;
    const dy = ev.clientY - state.lastY;
    state.lastX = ev.clientX; state.lastY = ev.clientY;

    if(state.dragging && state.tool==='pointer'){
      state.camX += dx;
      state.camY += dy;
    }
  }
  function onPointerUp(ev){
    const moved = Math.hypot(ev.clientX - state.lastX, ev.clientY - state.lastY);
    state.dragging = false;

    if(state.tool!=='pointer' && moved < 8){
      // Klick‑/Tap‑Position in Tile umrechnen
      const rect = state.canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const [tx,ty] = screenToIso(sx,sy);
      placeAt(tx,ty);
    }
  }

  // Touch‑Zoom (Pinch)
  function onTouchStart(ev){
    if(ev.touches.length===2){
      state.touch.pinch = true;
      const a=ev.touches[0], b=ev.touches[1];
      const d = Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY);
      state.touch.d0 = d; state.touch.kz = state.zoom;
    }
  }
  function onTouchMove(ev){
    if(state.touch.pinch && ev.touches.length===2){
      const a=ev.touches[0], b=ev.touches[1];
      const d = Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY);
      const k = d / Math.max(1,state.touch.d0);
      setZoom(state.touch.kz * k, (a.clientX+b.clientX)/2, (a.clientY+b.clientY)/2);
      ev.preventDefault();
    }
  }
  function onTouchEnd(){
    state.touch.pinch = false;
  }

  function setZoom(z, cx, cy){
    const {minZ,maxZ,zoom} = state;
    const nz = Math.max(minZ, Math.min(maxZ, z));
    if(nz===zoom) return;

    // Zoomen zum Cursor: Weltpunkt unter (cx,cy) halten
    const [wx, wy] = screenToIso(cx, cy);
    const [sx0, sy0] = isoToScreen(wx, wy);
    state.zoom = nz;
    const [sx1, sy1] = isoToScreen(wx, wy);
    state.camX += (cx - (sx1));
    state.camY += (cy - (sy1));

    onZoomChanged?.(state.zoom);
  }

  function onWheel(ev){
    const dir = ev.deltaY>0 ? -1 : 1;
    const z = state.zoom * (1 + dir*0.08);
    const rect = state.canvas.getBoundingClientRect();
    setZoom(z, ev.clientX - rect.left, ev.clientY - rect.top);
  }

  function centerOnMap(){
    // Mitte der Karte optisch zentrieren
    const {mapW,mapH, canvas} = state;
    const cx = Math.floor(mapW/2), cy = Math.floor(mapH/2);
    const [sx,sy] = isoToScreen(cx,cy);
    state.camX += (canvas.width/2 - sx);
    state.camY += (canvas.height/2 - sy);
  }

  // ======= Loop =======
  let rafId=0, lastT=0;
  function loop(ts){
    const dt = Math.min(50, ts - lastT); lastT = ts;
    // (später: Carrier‑Animation, Wegfindung etc.)
    render();
    rafId = requestAnimationFrame(loop);
  }

  // ======= Init & Run =======
  async function init(canvas, version){
    state.version = version || state.version;
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');

    // Canvas auf Gerätegröße anpassen
    const resize = ()=>{
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; }
    };
    new ResizeObserver(resize).observe(canvas);
    resize();

    await loadAssets();
    makeMap();

    // Start‑Kamera: auf Mitte
    centerOnMap();

    // Events
    canvas.addEventListener('pointerdown', onPointerDown, {passive:true});
    canvas.addEventListener('pointermove', onPointerMove, {passive:true});
    canvas.addEventListener('pointerup', onPointerUp, {passive:true});
    canvas.addEventListener('wheel', onWheel, {passive:false});
    canvas.addEventListener('touchstart', onTouchStart, {passive:false});
    canvas.addEventListener('touchmove', onTouchMove, {passive:false});
    canvas.addEventListener('touchend', onTouchEnd, {passive:true});

    // Default‑Tool
    setTool('pointer');
    onZoomChanged?.(state.zoom);
  }

  async function run(){
    cancelAnimationFrame(rafId);
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  // ======= Exposed =======
  return {
    init, run, setTool, centerOnMap,
    get debug(){ return state.debug; },
    set debug(v){ state.debug=v; },
  };
})();

// Ende main.js
