/* Siedler‑Mini V15 (mobile)
   - Stabiles Pan/Zoom (DPR‑korrekt), iOS‑freundlich (PointerEvents)
   - Draggable Debug, Fullscreen‑Hint
   - Bau‑Palette (ein Button „Bauen“)
   - Tiles & Platzhalter‑Buildings aus /assets/tex/… (PNG mit Großbuchstaben)
   - Straßen-Code vorbereitet, aber auskommentiert
*/
export const game = (() => {

  // ---- Kachelgröße & Farben ----
  const TILE = 64; // wir nutzen deine 64x64 Texturen
  const GRID_COLOR = "#1a2740";
  const LABEL = "#cfe3ff";

  // ---- Asset-Liste (Dateinamen wie in deinem Repo, mit .PNG) ----
  const ASSETS = {
    tex: {
      grass:  "assets/tex/topdown_grass.PNG",
      dirt:   "assets/tex/topdown_dirt.PNG",
      forest: "assets/tex/topdown_forest.PNG",
      water:  "assets/tex/topdown_water.PNG",
      // Straßen – aktuell nicht benutzt (Feature auskommentiert)
      road_straight: "assets/tex/topdown_road_straight.PNG",
      road_corner:   "assets/tex/topdown_road_corner.PNG",
      road_t:        "assets/tex/topdown_road_t.PNG",
      road_cross:    "assets/tex/topdown_road_cross.PNG",
      // Gebäude (Platzhalter)
      hq_wood: "assets/tex/hq_wood.PNG"
    }
  };

  // ---- Spielzustand ----
  const S = {
    running:false,
    canvas:null, ctx:null, DPR:1,
    width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:3,
    pointerTool:"pointer",
    panning:false, panSX:0, panSY:0, camSX:0, camSY:0,
    lastTapTime:0,

    // Welt
    mapW: 40, mapH: 30,                 // 40x30 Tiles
    tiles: [],                          // Uint16 per Tile-ID
    buildings: [],                      // {type,x,y,w,h,label}
    // roads: [],                       // vorbereitet

    // Rendering
    imgs: new Map(),

    // HUD callback
    onHUD: (k,v)=>{},
    // Debug
    dbgEnabled:false
  };

  // ---- Hilfen ----
  const $hudZoom = typeof document !== 'undefined' ? document.querySelector('#hudZoom') : null;
  const setHUD = (k,v)=> S.onHUD?.(k,v);

  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));

  // Screen -> World (DPR & Canvas‑Rect korrekt!)
  function toWorld(clientX, clientY){
    const r = S.canvas.getBoundingClientRect();
    const sx = (clientX - r.left);
    const sy = (clientY - r.top);
    const nx = (sx * S.DPR - S.width/2) / S.zoom + S.camX;
    const ny = (sy * S.DPR - S.height/2) / S.zoom + S.camY;
    return {x:nx, y:ny};
  }

  function log(...a){ if (S.dbgEnabled && typeof window !== 'undefined') window?.game?.debug?.log?.(...a); }

  // ---- Asset-Loading ----
  async function loadImage(url){
    return new Promise((res,rej)=>{
      const img = new Image();
      img.onload = ()=> res(img);
      img.onerror = e => rej(e);
      img.src = url + (url.includes('?')?'':'') ; // no-cache optional
    });
  }

  async function loadAssets(){
    const entries = Object.entries(ASSETS.tex);
    for (const [key, url] of entries){
      try{
        const img = await loadImage(url);
        S.imgs.set(key, img);
      }catch(e){
        log('Asset fehlgeschlagen:', key, url);
      }
    }
  }

  // ---- Welt initialisieren ----
  function initTiles(){
    // 0=grass,1=dirt,2=forest,3=water
    S.tiles = new Uint16Array(S.mapW*S.mapH);
    S.tiles.fill(0);
    // bisschen Muster
    for (let y=10; y< S.mapH; y++){
      const idx = y*S.mapW + 12;
      if (idx>=0 && idx<S.tiles.length) S.tiles[idx] = 1; // dirt Patch
    }
    for (let y=3; y< 6; y++){
      for (let x=26; x< 38; x++){
        S.tiles[y*S.mapW + x] = 2; // forest top right
      }
    }
    for (let x=2; x< 8; x++){
      S.tiles[(S.mapH-3)*S.mapW + x] = 3; // water bottom-left
    }

    // Startgebäude (HQ mittig, Depot rechts, Holzfäller links unten)
    const cx = Math.floor(S.mapW/2), cy = Math.floor(S.mapH/2);
    S.buildings.push({type:'hq', x:cx*TILE, y:cy*TILE, w:TILE, h:TILE, label:'HQ'});
    S.buildings.push({type:'depot', x:(cx+2)*TILE, y:cy*TILE, w:TILE, h:TILE, label:'Depot'});
    S.buildings.push({type:'woodcutter', x:(cx-3)*TILE, y:(cy+4)*TILE, w:TILE, h:TILE, label:'Holzfäller'});
  }

  // ---- Canvas/Resize ----
  function attachCanvas(canvas){
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    S.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resize();
  }
  function resize(){
    const r = S.canvas.getBoundingClientRect();
    S.width  = Math.max(1, Math.floor(r.width  * S.DPR));
    S.height = Math.max(1, Math.floor(r.height * S.DPR));
    if (S.canvas.width !== S.width)  S.canvas.width = S.width;
    if (S.canvas.height!== S.height) S.canvas.height= S.height;
  }

  // ---- Zeichnen ----
  function drawGrid(){
    const g = S.ctx;
    g.save();
    g.strokeStyle = GRID_COLOR;
    g.lineWidth = 1;
    const step = TILE * S.zoom;
    // Startposition der Linien relativ zur Kamera berechnen (ohne DPR)
    const ox = ((S.width/2)/S.DPR - (S.camX*S.zoom)) % step;
    const oy = ((S.height/2)/S.DPR - (S.camY*S.zoom)) % step;

    g.beginPath();
    for (let x = ox; x <= S.width/S.DPR; x += step){ g.moveTo(x,0); g.lineTo(x,S.height/S.DPR); }
    for (let y = oy; y <= S.height/S.DPR; y += step){ g.moveTo(0,y); g.lineTo(S.width/S.DPR,y); }
    g.scale(S.DPR, S.DPR);
    g.stroke();
    g.restore();
  }

  function worldToScreen(wx,wy){
    return {
      x: (wx - S.camX) * S.zoom + (S.width/2)/S.DPR,
      y: (wy - S.camY) * S.zoom + (S.height/2)/S.DPR
    };
  }

  function drawTiles(){
    const g = S.ctx;
    const tileSize = TILE * S.zoom;
    const startX = Math.floor((S.camX - (S.width/2)/S.DPR/S.zoom) / TILE) - 1;
    const startY = Math.floor((S.camY - (S.height/2)/S.DPR/S.zoom) / TILE) - 1;
    const endX   = Math.ceil((S.camX + (S.width/2)/S.DPR/S.zoom) / TILE) + 1;
    const endY   = Math.ceil((S.camY + (S.height/2)/S.DPR/S.zoom) / TILE) + 1;

    for (let gy = startY; gy<=endY; gy++){
      if (gy<0 || gy>=S.mapH) continue;
      for (let gx = startX; gx<=endX; gx++){
        if (gx<0 || gx>=S.mapW) continue;
        const id = S.tiles[gy*S.mapW + gx];
        const key = id===0?'grass' : id===1?'dirt' : id===2?'forest' : 'water';
        const img = S.imgs.get(key);
        if (!img) continue;

        const sc = worldToScreen(gx*TILE, gy*TILE);
        S.ctx.drawImage(img, sc.x, sc.y, tileSize, tileSize);
      }
    }
  }

  function drawBuildings(){
    for (const b of S.buildings){
      const sc = worldToScreen(b.x, b.y);
      const size = TILE * S.zoom;
      if (b.type==='hq'){
        const icon = S.imgs.get('hq_wood'); // dein HQ‑Platzhalter
        if (icon) S.ctx.drawImage(icon, sc.x, sc.y, size, size);
        else fillBox(sc.x, sc.y, size, size, '#43aa62', b.label);
      } else if (b.type==='depot'){
        fillBox(sc.x, sc.y, size, size, '#d55384', b.label);
      } else if (b.type==='woodcutter'){
        fillBox(sc.x, sc.y, size, size, '#3f8cff', b.label);
      }
    }
  }

  function fillBox(x,y,w,h,color,label){
    const g = S.ctx;
    g.save();
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
    if (S.zoom >= .9){
      g.fillStyle = LABEL;
      g.font = `${Math.round(12*S.zoom)}px system-ui,-apple-system,Segoe UI`;
      g.textAlign='center'; g.textBaseline='middle';
      g.fillText(label, x+w/2, y+h/2);
    }
    g.restore();
  }

  function tick(){
    // Clear
    S.ctx.clearRect(0,0,S.width, S.height);
    drawTiles();
    drawGrid();
    drawBuildings();
    requestAnimationFrame(tick);
  }

  // ---- Eingabe ----
  function addInput(){
    const el = S.canvas;

    el.addEventListener('pointerdown', onPD, {passive:false});
    el.addEventListener('pointermove', onPM, {passive:false});
    el.addEventListener('pointerup',   onPU, {passive:false});
    el.addEventListener('pointercancel', onPU, {passive:false});
    el.addEventListener('wheel', onWheel, {passive:false});

    // Doppeltipp Zoom (mobil)
    el.addEventListener('pointerdown', onDoubleTap, {passive:false});

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', ()=> setTimeout(resize, 200));
    document.addEventListener('fullscreenchange', resize);
    document.addEventListener('webkitfullscreenchange', resize);
  }

  function onWheel(e){
    e.preventDefault();
    const step = (e.deltaY>0 ? -0.1 : 0.1);
    setZoom(S.zoom + step, {anchor:{x:e.clientX,y:e.clientY}});
  }

  function onDoubleTap(e){
    const now = performance.now();
    if (now - S.lastTapTime < 280){
      setZoom(S.zoom * 1.25, {anchor:{x:e.clientX,y:e.clientY}});
    }
    S.lastTapTime = now;
  }

  function onPD(e){
    // Pinch: wir verwenden native Page‑Zoom nicht; wir pan/zoom selbst
    if (S.pointerTool === 'pointer'){
      S.panning = true; S.panSX = e.clientX; S.panSY = e.clientY;
      S.camSX = S.camX; S.camSY = S.camY;
      S.canvas.setPointerCapture?.(e.pointerId);
    } else {
      // Bauen / Abriss
      const w = toWorld(e.clientX, e.clientY);
      if (S.pointerTool==='erase'){
        tryErase(w.x, w.y);
      }
      else if (S.pointerTool==='hq') placeBuilding('hq', w.x, w.y);
      else if (S.pointerTool==='depot') placeBuilding('depot', w.x, w.y);
      else if (S.pointerTool==='woodcutter') placeBuilding('woodcutter', w.x, w.y);
      // else if (S.pointerTool==='road') ... (deaktiviert)
    }
  }
  function onPM(e){
    if (S.panning && S.pointerTool==='pointer'){
      e.preventDefault();
      const dx = (e.clientX - S.panSX) / S.zoom;
      const dy = (e.clientY - S.panSY) / S.zoom;
      // Direkte 1:1‑Abbildung: Fingerweg = Kameraweg (kein „Kriechen“)
      S.camX = S.camSX - dx;
      S.camY = S.camSY - dy;
    }
  }
  function onPU(e){
    S.panning=false;
    S.canvas.releasePointerCapture?.(e.pointerId);
  }

  // Pinch‑Zoom für iOS/Android (zwei Finger) – einfacher Ansatz über GestureEvent fehlt auf iOS,
  // deshalb kleiner Workaround: wir lassen natives Browser‑Pinch NICHT zu (touch-action:none)
  // und bieten Doppel‑Tap bzw. UI‑Zoom. (Das Rad/Pinch‑Erlebnis war in deinen Tests bereits okay.)

  function setZoom(next, opts={}){
    const before = S.zoom;
    const z = clamp(next, S.minZoom, S.maxZoom);
    if (Math.abs(z-before) < 1e-6) return;
    // Zoom um Ankerpunkt (Screen‑Koordinate)
    if (opts.anchor){
      const r = S.canvas.getBoundingClientRect();
      const ax = opts.anchor.x - r.left;
      const ay = opts.anchor.y - r.top;
      // Weltkoordinate vor dem Zoom
      const wxBefore = (ax*S.DPR - S.width/2)/S.zoom + S.camX;
      const wyBefore = (ay*S.DPR - S.height/2)/S.zoom + S.camY;
      S.zoom = z;
      // Nach Zoom: Kamera so anpassen, dass Anker „klebt“
      const wxAfter  = (ax*S.DPR - S.width/2)/S.zoom + S.camX;
      const wyAfter  = (ay*S.DPR - S.height/2)/S.zoom + S.camY;
      S.camX += (wxBefore - wxAfter);
      S.camY += (wyBefore - wyAfter);
    } else {
      S.zoom = z;
    }
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
  }

  // ---- Bauen / Abriss ----
  function snap(val){ return Math.round(val / TILE) * TILE; }

  function placeBuilding(type, wx, wy){
    const gx = snap(wx), gy = snap(wy);
    // einfache Kollisionsprüfung: kein Überlappen anderer Gebäude
    for (const b of S.buildings){
      if (Math.abs(b.x-gx)<TILE && Math.abs(b.y-gy)<TILE){
        log('Bau verweigert: belegt.');
        return;
      }
    }
    const label = type==='hq'?'HQ' : type==='depot'?'Depot' : 'Holzfäller';
    S.buildings.push({type, x:gx, y:gy, w:TILE, h:TILE, label});
  }

  function tryErase(wx,wy){
    for (let i=S.buildings.length-1; i>=0; i--){
      const b=S.buildings[i];
      if (Math.abs(b.x-wx)<TILE/2 && Math.abs(b.y-wy)<TILE/2){
        S.buildings.splice(i,1); return true;
      }
    }
    return false;
  }

  // ---- API / Public ----
  function setTool(name){
    S.pointerTool = name;
    setHUD('Tool', name==='pointer'?'Zeiger':
                   name==='hq'?'HQ':
                   name==='depot'?'Depot':
                   name==='woodcutter'?'Holzfäller':
                   name==='erase'?'Abriss': name);
  }

  function centerOnContent(){
    // Auf vorhandene Gebäude zentrieren; fallback = Kartenmitte
    if (S.buildings.length){
      let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
      for (const b of S.buildings){
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x+TILE);
        maxY = Math.max(maxY, b.y+TILE);
      }
      const cx = (minX+maxX)/2;
      const cy = (minY+maxY)/2;
      S.camX = cx;
      S.camY = cy;
    } else {
      S.camX = (S.mapW*TILE)/2;
      S.camY = (S.mapH*TILE)/2;
    }
  }

  async function startGame(opts){
    if (S.running) return;
    S.onHUD = opts?.onHUD ?? S.onHUD;

    attachCanvas(opts.canvas);
    await loadAssets();
    initTiles();

    // Startkamera: auf Kartenmitte (sichtbar, nicht „außerhalb“)
    S.zoom = 1;
    centerOnContent();
    setHUD('Zoom', `${S.zoom.toFixed(2)}x`);
    setTool('pointer');

    addInput();
    S.running = true;

    // Start‑Overlay ausblenden
    const overlay = document.getElementById('startOverlay');
    overlay && (overlay.style.display='none');

    // Tick
    requestAnimationFrame(tick);

    // Ein paar Debug‑Zeilen
    log('Start ✓', 'DPR=', S.DPR, 'Canvas=', S.width+'x'+S.height);
  }

  function setDebug(on){ S.dbgEnabled = !!on; if (on) log('Debug: an'); }

  return {
    startGame, setTool, centerOnContent, setDebug,
    debug:null, // wird in index verdrahtet
  };
})();
