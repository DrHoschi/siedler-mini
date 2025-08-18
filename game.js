/* Siedler-Mini V14.7 – game.js (mobile/top-down)
   Features:
   - Case-insensitive Asset Loader (Dateiendung egal)
   - Pan/Zoom (Pan nur im Zeiger-Tool; Pinch & Wheel)
   - Bauen (HQ / Holzfäller / Depot / Straße Start→Ende / Abriss)
   - Straßen-Autotiling (straight/corner/T/cross)
   - Konnektivität zu HQ (über Straßen)
   - Produktion Holzfäller + einfache Träger (als Punkt, später Sprite)
*/

/* ==========================
   0) Asset-Loader (robust)
   ========================== */
const Assets = (() => {
  const CACHE = new Map();
  const EXTS = ['.png', '.PNG', '.jpg', '.JPG', '.jpeg', '.JPEG'];

  function tryLoad(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('404: ' + url));
      const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
      img.src = url + bust;
    });
  }

  async function loadImage(basePathWithoutExt) {
    if (CACHE.has(basePathWithoutExt)) return CACHE.get(basePathWithoutExt);
    let lastErr;
    for (const ext of EXTS) {
      const url = basePathWithoutExt + ext;
      try {
        const img = await tryLoad(url);
        CACHE.set(basePathWithoutExt, img);
        return img;
      } catch (e) { lastErr = e; }
    }
    throw lastErr ?? new Error('Asset not found: ' + basePathWithoutExt);
  }

  async function loadFirstAvailable(bases) {
    for (const b of bases) {
      try { return await loadImage(b); } catch {}
    }
    throw new Error('No base found: ' + bases.join(', '));
  }

  return { loadImage, loadFirstAvailable };
})();

/* ==========================
   1) Spiel-State
   ========================== */
export const game = (() => {
  const TILE = 64; // Top-Down-Kachelgröße
  const GRID_COLOR = "#1e2a3d";
  const TEXT_COLOR = "#cfe3ff";

  // Produktion/Carrier
  const WOOD_PROD_EVERY = 4.0;     // Holzfäller produziert alle 4s
  const CARRIER_SPAWN_DELAY = 3.0; // Träger wartet ~3s vor dem Loslaufen
  const CARRIER_SPEED = 50;        // px/s

  // Tools
  const TOOL = { POINTER:'pointer', ROAD:'road', HQ:'hq', WC:'woodcutter', DEPOT:'depot', ERASE:'erase' };

  const state = {
    // Canvas/Kamera
    canvas: null, ctx: null,
    DPR: 1, w: 0, h: 0,
    camX: 0, camY: 0, zoom: 1, minZoom: 0.5, maxZoom: 2.0,

    // Eingabe
    tool: TOOL.POINTER,
    isPanning: false, panSX:0, panSY:0, camSX:0, camSY:0,
    pointers: new Map(), // für Pinch

    // Welt
    running: false,
    roads: [],       // {x1,y1,x2,y2}
    buildings: [],   // {id,type,x,y,w,h, stock?, timer?, connected?}
    carriers: [],    // {x,y, path:[{x,y}..], onNodeIndex, t, speed, carrying, nextWait, targetWC}

    // Ressourcen
    res: { wood:0, stone:0, food:0, gold:0 },

    // Straßen-Texturen
    roadTex: { straight:null, corner:null, t:null, cross:null },

    // Texturen
    tex: { grass:null, dirt:null, hq:null, wc:null, depot:null, placeholder:null },

    // HUD callback
    onHUD: (k,v)=>{},

    // Straßenbau Startpunkt
    roadStart: null,
  };

  const clamp = (v,a,b)=> Math.max(a, Math.min(b,v));
  const snap = v => Math.round(v / TILE) * TILE;

  function setHUD(k,v){ state.onHUD?.(k,v); }
  function setTool(name){
    state.tool = name;
    if (name !== TOOL.ROAD) state.roadStart = null;
    setHUD('Tool', name);
  }

  /* ==========================
     2) Koordinaten / Canvas
     ========================== */
  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    resizeCanvas();
    setHUD('Zoom', state.zoom.toFixed(2)+'x');
  }
  function resizeCanvas(){
    const r = state.canvas.getBoundingClientRect();
    state.w = Math.max(1, Math.floor(r.width * state.DPR));
    state.h = Math.max(1, Math.floor(r.height * state.DPR));
    if (state.canvas.width !== state.w || state.canvas.height !== state.h){
      state.canvas.width = state.w; state.canvas.height = state.h;
    }
  }

  function toWorld(sx,sy){
    const x = (sx/state.DPR - state.w/2)/state.zoom + state.camX;
    const y = (sy/state.DPR - state.h/2)/state.zoom + state.camY;
    return {x,y};
  }
  function toScreen(wx,wy){
    const x = (wx - state.camX)*state.zoom + state.w/2;
    const y = (wy - state.camY)*state.zoom + state.h/2;
    return {x, y};
  }

  /* ==========================
     3) Laden der Texturen
     ========================== */
  async function loadTextures(){
    // Placeholder
    try {
      state.tex.placeholder = await Assets.loadImage('assets/tex/placeholder64');
    } catch {
      const c=document.createElement('canvas'); c.width=c.height=1;
      const i = new Image(); i.src = c.toDataURL(); await i.decode();
      state.tex.placeholder = i;
    }

    async function tryTex(bases){
      try{ return await Assets.loadFirstAvailable(bases); }
      catch{ return state.tex.placeholder; }
    }

    // Boden
    state.tex.grass = await tryTex([
      'assets/tex/terrain/topdown_grass',
      'assets/textures/topdown_grass',
      'assets/tex/grass'
    ]);
    state.tex.dirt = await tryTex([
      'assets/tex/terrain/topdown_dirt',
      'assets/textures/topdown_dirt',
      'assets/tex/dirt'
    ]);

    // Gebäude
    state.tex.hq = await tryTex([
      'assets/tex/building/topdown_hq',
      'assets/textures/topdown_hq',
      'assets/tex/hq_top'
    ]);
    state.tex.wc = await tryTex([
      'assets/tex/building/topdown_woodcutter',
      'assets/textures/topdown_woodcutter',
      'assets/tex/woodcutter_top'
    ]);
    state.tex.depot = await tryTex([
      'assets/tex/building/topdown_depot',
      'assets/textures/topdown_depot',
      'assets/tex/depot_top'
    ]);

    // Straßen (Autotiles)
    state.roadTex.straight = await tryTex([
      'assets/tex/road/topdown_road_straight',
      'assets/textures/topdown_road_straight',
      'assets/tex/road_straight_topdown'
    ]);
    state.roadTex.corner = await tryTex([
      'assets/tex/road/topdown_road_corner',
      'assets/textures/topdown_road_corner',
      'assets/tex/road_corner_topdown'
    ]);
    state.roadTex.t = await tryTex([
      'assets/tex/road/topdown_road_t',
      'assets/textures/topdown_road_t',
      'assets/tex/road_t_topdown'
    ]);
    state.roadTex.cross = await tryTex([
      'assets/tex/road/topdown_road_cross',
      'assets/textures/topdown_road_cross',
      'assets/tex/road_cross_topdown'
    ]);
  }

  /* ==========================
     4) Welt – Helper
     ========================== */
  function addBuilding(type, wx, wy){
    const b = {
      id: Math.random().toString(36).slice(2),
      type,
      x: snap(wx), y: snap(wy),
      w: TILE*2, h: TILE*2,
      stock: 0,          // Holzfällerlager
      timer: 0,          // Produktionsuhr
      connected: false,  // an HQ/Depot via Straßen?
    };
    state.buildings.push(b);
    rebuildConnectivity();
  }
  function addRoad(wx1,wy1, wx2,wy2){
    const x1=snap(wx1), y1=snap(wy1), x2=snap(wx2), y2=snap(wy2);
    if (Math.hypot(x2-x1,y2-y1) < 1) return;
    state.roads.push({x1,y1,x2,y2});
    rebuildConnectivity();
  }
  function eraseAt(wx,wy){
    // Gebäude (oberste zuerst)
    for (let i=state.buildings.length-1; i>=0; i--){
      const b=state.buildings[i];
      const x0=b.x-b.w/2, y0=b.y-b.h/2, x1=b.x+b.w/2, y1=b.y+b.h/2;
      if (wx>=x0&&wx<=x1&&wy>=y0&&wy<=y1){
        const wasHQ = (b.type===TOOL.HQ);
        state.buildings.splice(i,1);
        rebuildConnectivity();
        if (wasHQ) { /* optional: min. 1 HQ erzwingen */ }
        return true;
      }
    }
    // Straßen (Hitdist ~8px im Screen)
    const hit = 8/state.zoom;
    for (let i=state.roads.length-1; i>=0; i--){
      const r = state.roads[i];
      if (distPointSeg(wx,wy, r.x1,r.y1,r.x2,r.y2) <= hit){
        state.roads.splice(i,1);
        rebuildConnectivity();
        return true;
      }
    }
    return false;
  }
  function distPointSeg(px,py, x1,y1,x2,y2){
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const dot=A*C+B*D, len2=C*C+D*D;
    const t = len2 ? clamp(dot/len2,0,1) : 0;
    const x=x1+t*C, y=y1+t*D;
    return Math.hypot(px-x,py-y);
  }

  /* ==========================
     5) Konnektivität & Pfade
     ========================== */
  function rebuildConnectivity(){
    // Graph: Knoten = Road-Endpunkte + Gebäudeknoten
    const nodeKey = (x,y)=>`${x},${y}`;
    const nodes = new Map(); // key -> {x,y, adj:Set(keys)}
    function ensureNode(x,y){
      const k=nodeKey(x,y);
      if(!nodes.has(k)) nodes.set(k,{x,y,adj:new Set()});
      return nodes.get(k);
    }
    function link(a,b){ a.adj.add(nodeKey(b.x,b.y)); b.adj.add(nodeKey(a.x,a.y)); }

    // Straßen-Knoten
    for(const r of state.roads){
      const a = ensureNode(r.x1,r.y1);
      const b = ensureNode(r.x2,r.y2);
      link(a,b);
    }
    // Gebäude-Knoten + Verknüpfung zu nahen Straßennodes (<=TILE)
    const bNode = new Map(); // b.id -> nodeKey
    for(const b of state.buildings){
      const bn = ensureNode(b.x,b.y);
      bNode.set(b.id, nodeKey(b.x,b.y));
      for (const [,n] of nodes){
        const man = Math.abs(n.x-b.x)+Math.abs(n.y-b.y);
        if (man > TILE) continue;
        link(bn, n);
      }
    }

    // BFS von allen HQs
    const hqKeys = state.buildings.filter(b=>b.type===TOOL.HQ).map(b=>bNode.get(b.id));
    const activeKeys = new Set();
    const q=[];
    for(const hqk of hqKeys){ if(!hqk) continue; q.push(hqk); activeKeys.add(hqk); }
    while(q.length){
      const k=q.shift();
      const n = nodes.get(k); if(!n) continue;
      for(const nk of n.adj){ if(!activeKeys.has(nk)){ activeKeys.add(nk); q.push(nk);} }
    }

    // Gebäude aktiv markieren
    for(const b of state.buildings){
      const k = bNode.get(b.id);
      b.connected = k ? activeKeys.has(k) : false;
    }

    state._graph = { nodes, bNode, activeKeys };
  }

  function shortestPath(wx1,wy1, wx2,wy2){
    const G = state._graph; if(!G) return null;
    const startK = `${wx1},${wy1}`, goalK = `${wx2},${wy2}`;
    if (!G.nodes.has(startK) || !G.nodes.has(goalK)) return null;

    const prev = new Map();
    const seen = new Set([startK]);
    const q=[startK];
    while(q.length){
      const k=q.shift();
      if (k===goalK) break;
      const n = G.nodes.get(k);
      for (const nk of n.adj){
        if(!seen.has(nk)){
          seen.add(nk); prev.set(nk,k); q.push(nk);
        }
      }
    }
    if(!prev.has(goalK) && startK!==goalK) return null;

    // Rekonstruiere Weg
    const pathKeys=[];
    let cur=goalK;
    pathKeys.push(cur);
    while(cur!==startK){
      cur = prev.get(cur);
      if(!cur){ return null; }
      pathKeys.push(cur);
    }
    pathKeys.reverse();
    return pathKeys.map(k=>{
      const [x,y] = k.split(',').map(Number);
      return {x,y};
    });
  }

  function nearestHQorDepot(wx,wy){
    const cands = state.buildings.filter(b=> (b.type===TOOL.HQ||b.type===TOOL.DEPOT) && b.connected);
    if (!cands.length) return null;
    let best=null, bestD=1e9;
    for (const b of cands){
      const d = Math.hypot(b.x-wx, b.y-wy);
      if (d<bestD){ best=b; bestD=d; }
    }
    return best;
  }

  /* ==========================
     6) Produktion & Carrier
     ========================== */
  function updateProduction(dt){
    for(const b of state.buildings){
      if (b.type!==TOOL.WC) continue;
      if (!b.connected) continue;
      b.timer += dt;
      if (b.timer >= WOOD_PROD_EVERY){
        b.timer -= WOOD_PROD_EVERY;
        b.stock = (b.stock||0) + 1;
        maybeDispatchCarrier(b);
      }
    }
  }

  function maybeDispatchCarrier(wc){
    const already = state.carriers.some(c=> c.targetWC === wc.id && !c.carrying);
    if (already) return;
    if ((wc.stock||0) <= 0) return;

    const targetBase = nearestHQorDepot(wc.x,wc.y);
    if (!targetBase) return;

    const path = shortestPath(wc.x,wc.y, targetBase.x, targetBase.y);
    if (!path || path.length<2) return;

    state.carriers.push({
      x: wc.x, y: wc.y,
      path,
      onNodeIndex: 0,
      t: 0,
      speed: CARRIER_SPEED,
      nextWait: CARRIER_SPAWN_DELAY, // ~3s warten
      carrying: false,
      targetWC: wc.id
    });
  }

  function updateCarriers(dt){
    for (const c of state.carriers){
      if (c.nextWait>0){ c.nextWait -= dt; continue; }
      if (!c.path || c.path.length<2) continue;

      const idx = c.onNodeIndex;
      const a = c.path[idx], b = c.path[idx+1] || a;
      const dx = b.x - c.x, dy = b.y - c.y;
      const dist = Math.hypot(dx,dy);
      const step = c.speed * dt;

      if (dist <= step){
        c.x = b.x; c.y = b.y;
        c.onNodeIndex++;
        if (c.onNodeIndex >= c.path.length-1){
          if (!c.carrying){
            const wc = state.buildings.find(bb=>bb.id===c.targetWC);
            if (wc && wc.stock>0){
              wc.stock--; c.carrying=true;
              const base = nearestHQorDepot(c.x,c.y);
              const back = base ? shortestPath(c.x,c.y, base.x, base.y) : null;
              c.path = back || c.path.slice().reverse();
              c.onNodeIndex = 0;
              c.nextWait = 0.2;
            } else {
              c._done = true;
            }
          } else {
            state.res.wood += 1;
            setHUD('wood', state.res.wood);
            c._done = true;
          }
        }
      } else {
        const vx = dx/dist, vy = dy/dist;
        c.x += vx * step;
        c.y += vy * step;
      }
    }
    state.carriers = state.carriers.filter(c=>!c._done);
  }

  /* ==========================
     7) Rendering
     ========================== */
  function clear(){ state.ctx.clearRect(0,0,state.w,state.h); }

  function drawGrid(){
    const ctx = state.ctx;
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const step = TILE * state.zoom * state.DPR;
    const ox = (state.w/2 - (state.camX * state.zoom) * state.DPR) % step;
    const oy = (state.h/2 - (state.camY * state.zoom) * state.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=state.w; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.h); }
    for (let y=oy; y<=state.h; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.w,y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawTile(img, wx, wy){
    const {x,y} = toScreen(wx,wy);
    const s = TILE*state.zoom;
    state.ctx.drawImage(
      img,
      Math.round((x - s/2)*state.DPR),
      Math.round((y - s/2)*state.DPR),
      Math.round(s*state.DPR),
      Math.round(s*state.DPR)
    );
  }

  function drawBuilding(b){
    const img =
      b.type===TOOL.HQ ? state.tex.hq :
      b.type===TOOL.WC ? state.tex.wc :
      state.tex.depot;

    // 2×2 Dirt unterlegen
    drawTile(state.tex.dirt, b.x - TILE/2, b.y - TILE/2);
    drawTile(state.tex.dirt, b.x + TILE/2, b.y - TILE/2);
    drawTile(state.tex.dirt, b.x - TILE/2, b.y + TILE/2);
    drawTile(state.tex.dirt, b.x + TILE/2, b.y + TILE/2);

    // Gebäude aufsetzen (skaliert auf 2×2 Tiles)
    const p = toScreen(b.x, b.y);
    const w = 2*TILE*state.zoom, h = 2*TILE*state.zoom;
    state.ctx.drawImage(
      img,
      Math.round((p.x - w/2)*state.DPR),
      Math.round((p.y - h/2)*state.DPR),
      Math.round(w*state.DPR),
      Math.round(h*state.DPR)
    );

    // Debug-Lager
    if (b.type===TOOL.WC && b.stock>0) {
      drawLabel(`Holz x${b.stock}`, b.x, b.y - b.h*0.6);
    }
  }

  function drawLabel(text, wx, wy){
    const p = toScreen(wx,wy);
    const ctx = state.ctx;
    ctx.save();
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${Math.round(12*state.DPR*state.zoom)}px system-ui,-apple-system,Segoe UI`;
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(text, Math.round(p.x*state.DPR), Math.round((p.y-4)*state.DPR));
    ctx.restore();
  }

  // Nachbarschaft für Autotiles
  function roadNeighborsAt(x,y){
    const has = {N:false,E:false,S:false,W:false};
    for (const r of state.roads){
      if (r.x1===x && r.y1===y){
        if (r.x2===x && r.y2===y-TILE) has.N = true;
        if (r.x2===x+TILE && r.y2===y) has.E = true;
        if (r.x2===x && r.y2===y+TILE) has.S = true;
        if (r.x2===x-TILE && r.y2===y) has.W = true;
      } else if (r.x2===x && r.y2===y){
        if (r.x1===x && r.y1===y-TILE) has.N = true;
        if (r.x1===x+TILE && r.y1===y) has.E = true;
        if (r.x1===x && r.y1===y+TILE) has.S = true;
        if (r.x1===x-TILE && r.y1===y) has.W = true;
      }
    }
    return has;
  }

  function drawTileRot(img, wx, wy, deg){
    const p = toScreen(wx,wy);
    const s = TILE * state.zoom;
    const cx = Math.round(p.x*state.DPR), cy = Math.round(p.y*state.DPR);
    const w = Math.round(s*state.DPR), h = Math.round(s*state.DPR);
    const ctx = state.ctx;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(deg * Math.PI/180);
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
  }

  function drawRoadNetwork(){
    const seen = new Set();
    for (const r of state.roads){
      const pts = [{x:r.x1,y:r.y1},{x:r.x2,y:r.y2}];
      for (const p of pts){
        const key = `${p.x},${p.y}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const nb = roadNeighborsAt(p.x,p.y);
        const count = (nb.N?1:0)+(nb.E?1:0)+(nb.S?1:0)+(nb.W?1:0);

        let tex = state.roadTex.straight;
        let rot = 0;
        if (count===4){ tex = state.roadTex.cross; rot=0; }
        else if (count===3){
          tex = state.roadTex.t;
          if (!nb.N) rot=180;
          else if (!nb.E) rot=270;
          else if (!nb.S) rot=0;
          else if (!nb.W) rot=90;
        }
        else if (count===2){
          if ((nb.N && nb.S) || (nb.E && nb.W)){
            tex = state.roadTex.straight;
            rot = (nb.N&&nb.S)?0:90;
          } else {
            tex = state.roadTex.corner;
            if (nb.N && nb.E) rot=0;
            else if (nb.E && nb.S) rot=90;
            else if (nb.S && nb.W) rot=180;
            else if (nb.W && nb.N) rot=270;
          }
        }
        else if (count===1){
          tex = state.roadTex.straight;
          rot = (nb.N||nb.S)?0:90;
        } else {
          tex = state.roadTex.straight; rot=0;
        }

        drawTileRot(tex, p.x, p.y, rot);
      }
    }
  }

  function drawWorld(){
    clear();

    // Sichtbereich-Gras
    const left = Math.floor((state.camX - (state.w/state.DPR)/2/state.zoom)/TILE)-2;
    const right= Math.ceil ((state.camX + (state.w/state.DPR)/2/state.zoom)/TILE)+2;
    const top  = Math.floor((state.camY - (state.h/state.DPR)/2/state.zoom)/TILE)-2;
    const bottom=Math.ceil((state.camY + (state.h/state.DPR)/2/state.zoom)/TILE)+2;

    for (let gy=top; gy<=bottom; gy++){
      for (let gx=left; gx<=right; gx++){
        drawTile(state.tex.grass, gx*TILE, gy*TILE);
      }
    }

    // Straßen
    drawRoadNetwork();

    // Gebäude
    for (const b of state.buildings){
      drawBuilding(b);
    }

    // Carrier (Punkte)
    const ctx = state.ctx;
    ctx.save();
    for (const c of state.carriers){
      const p = toScreen(c.x,c.y);
      ctx.fillStyle = c.carrying ? '#ffd166' : '#4ecdc4';
      const r = Math.max(2, Math.round(3 * state.zoom * state.DPR));
      ctx.beginPath();
      ctx.arc(Math.round(p.x*state.DPR), Math.round(p.y*state.DPR), r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // Grid dezent obenauf
    drawGrid();
  }

  /* ==========================
     8) Input
     ========================== */
  function addInput(){
    const el = state.canvas;
    el.addEventListener('pointerdown', onPD, {passive:false});
    el.addEventListener('pointermove', onPM, {passive:false});
    el.addEventListener('pointerup', onPU, {passive:false});
    el.addEventListener('pointercancel', onPU, {passive:false});
    el.addEventListener('wheel', onWheel, {passive:false});

    window.addEventListener('resize', ()=>{resizeCanvas();});
    window.addEventListener('orientationchange', ()=> setTimeout(resizeCanvas, 250));
    document.addEventListener('fullscreenchange', resizeCanvas);
    document.addEventListener('webkitfullscreenchange', resizeCanvas);
  }

  function onWheel(e){
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    const before = state.zoom;
    state.zoom = clamp(state.zoom + delta, state.minZoom, state.maxZoom);
    if (state.zoom !== before) setHUD('Zoom', state.zoom.toFixed(2)+'x');
  }

  function onPD(e){
    try { state.canvas.setPointerCapture(e.pointerId); } catch{}
    state.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    const {x,y} = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);

    if (state.pointers.size===2){
      state._pinch = startPinch();
      return;
    }

    if (state.tool === TOOL.POINTER){
      state.isPanning = true;
      state.panSX = e.clientX; state.panSY = e.clientY;
      state.camSX = state.camX; state.camSY = state.camY;
    } else if (state.tool === TOOL.ROAD){
      if (!state.roadStart) state.roadStart = {x:snap(x), y:snap(y)};
      else {
        addRoad(state.roadStart.x, state.roadStart.y, x, y);
        state.roadStart = null;
      }
    } else if (state.tool === TOOL.HQ){
      addBuilding(TOOL.HQ, x,y);
    } else if (state.tool === TOOL.WC){
      addBuilding(TOOL.WC, x,y);
    } else if (state.tool === TOOL.DEPOT){
      addBuilding(TOOL.DEPOT, x,y);
    } else if (state.tool === TOOL.ERASE){
      eraseAt(x,y);
    }
  }

  function onPM(e){
    const p = state.pointers.get(e.pointerId);
    if (p){ p.x=e.clientX; p.y=e.clientY; }

    if (state.pointers.size===2){
      doPinch();
      return;
    }

    if (state.isPanning && state.tool === TOOL.POINTER){
      e.preventDefault();
      const dx = (e.clientX - state.panSX)/state.zoom;
      const dy = (e.clientY - state.panSY)/state.zoom;
      state.camX = state.camSX - dx;
      state.camY = state.camSY - dy;
    }
  }

  function onPU(e){
    try { state.canvas.releasePointerCapture(e.pointerId); } catch{}
    state.pointers.delete(e.pointerId);
    state.isPanning = false;
    state._pinch = null;
  }

  function startPinch(){
    const pts = [...state.pointers.values()];
    const d = Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y);
    return { d0:d, z0:state.zoom };
  }
  function doPinch(){
    if (!state._pinch) return;
    const pts = [...state.pointers.values()];
    if (pts.length<2) return;
    const d = Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y);
    const scale = d / (state._pinch.d0 || 1);
    const before = state.zoom;
    state.zoom = clamp(state._pinch.z0 * scale, state.minZoom, state.maxZoom);
    if (state.zoom !== before) setHUD('Zoom', state.zoom.toFixed(2)+'x');
  }

  /* ==========================
     9) Game Loop
     ========================== */
  let last=0;
  function loop(ts){
    if (!state.running){ drawWorld(); requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (ts-last)/1000 || 0); last=ts;

    updateProduction(dt);
    updateCarriers(dt);
    drawWorld();

    requestAnimationFrame(loop);
  }

  /* ==========================
     10) Public API
     ========================== */
  async function startGame(opts={}){
    if (state.running) return;
    attachCanvas(opts.canvas);
    state.onHUD = opts.onHUD || (()=>{});
    await loadTextures();

    // Startzustand
    state.zoom = 1.0;
    state.camX = 0; state.camY = 0;
    setHUD('Zoom', state.zoom.toFixed(2)+'x');

    // Falls kein HQ existiert: eins mittig setzen
    if (!state.buildings.some(b=>b.type===TOOL.HQ)){
      addBuilding(TOOL.HQ, 0, 0);
    }

    addInput();
    state.running = true;
    requestAnimationFrame(loop);
  }

  function center(){
    state.camX = 0; state.camY = 0;
  }

  return {
    startGame,
    setTool,
    center,
    get state(){ return state; },
    TOOL
  };
})();
