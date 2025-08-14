/* game.js — Siedler‑Mini V14.7 (Mobile)
   - Top‑Down Draufsicht
   - Punkt‑zu‑Punkt-Straßenbau (neuer Start, wenn Tap weit genug weg vom letzten Endpunkt ist)
   - Abriss für Straßen + Gebäude
   - Träger-„Animation“: kleine Kreise bewegen sich auf Pfaden zwischen verb. Gebäuden
   - Öffentliche API auf window.game
*/
(function () {
  'use strict';

  // ====== Util ======
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const keyXY = (x, y) => `${x},${y}`;
  const dist2 = (a, b) => {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
  };

  // Bresenham rasterisiertes Linien‑Raster (inkl. Endpunkt)
  function rasterLine(x0, y0, x1, y1) {
    const pts = [];
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      pts.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      let e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return pts;
  }

  // Einfache Queue für BFS
  class Queue {
    constructor(){ this.a=[]; this.b=0; }
    push(v){ this.a.push(v); }
    shift(){ return this.a[this.b++]; }
    get length(){ return this.a.length - this.b; }
  }

  // ====== Welt / State ======
  const TILE = 40;                 // Kachelgröße in px (vor Zoom)
  const WORLD_W = 128, WORLD_H = 128;

  const Tools = {
    POINTER: 'pointer',
    ROAD: 'road',
    HQ: 'hq',
    WOOD: 'woodcutter',
    DEPOT: 'depot',
    ERASE: 'erase',
  };

  const Colors = {
    bg:  '#0b1628',
    grid:'#172436',
    grid2:'#0f1b2a',
    road:'#6ed39a',
    roadOff:'#3b6b59',
    hq:'#39b36a',
    wood:'#4d86ff',
    depot:'#e04586',
    text:'#cfe3ff',
    muted:'#9fb3cc',
    carrier:'#ffe08a',
    carrierShadow:'rgba(0,0,0,.25)'
  };

  const state = {
    canvas: null, ctx: null, DPR: 1,
    onHUD: (k,v)=>{},
    // Kamera
    cam: { x: WORLD_W/2, y: WORLD_H/2, z: 1 },
    // Eingabe
    tool: Tools.POINTER,
    dragging: false,
    dragStart: {x:0,y:0},
    camAtDrag: {x:0,y:0},
    pinchDist0: 0, camZ0: 1,
    // Welt
    buildings: [],         // {id,type,x,y,w,h}
    roads: new Set(),      // Set "x,y" (Kacheln)
    roadChainStart: null,  // {x,y} – letzter Straßen-Endpunkt (für Kettenbau)
    // Simulation / Träger
    carriers: [],          // {path:[{x,y}], t(0..1 zwischen Kacheln), segIndex, speed}
    tick: 0,
    debug: false,
  };

  // ====== API‑Hooks Update HUD ======
  function hudUpdateTool(){
    state.onHUD('Tool', toolLabel(state.tool));
  }
  function hudUpdateZoom(){
    state.onHUD('Zoom', state.cam.z.toFixed(2)+'x');
  }
  function hudAdd(key, delta){
    state[key] = (state[key]||0) + delta;
    state.onHUD(capitalize(key), state[key]);
  }
  function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function toolLabel(t){
    switch(t){
      case Tools.POINTER: return 'Zeiger';
      case Tools.ROAD: return 'Straße';
      case Tools.HQ: return 'HQ';
      case Tools.WOOD: return 'Holzfäller';
      case Tools.DEPOT: return 'Depot';
      case Tools.ERASE: return 'Abriss';
      default: return t;
    }
  }

  // ====== Welt‑Helpers ======
  function worldToScreen(x, y) {
    const { cam } = state;
    const px = (x - cam.x) * (TILE*cam.z) + state.canvas.width/2;
    const py = (y - cam.y) * (TILE*cam.z) + state.canvas.height/2;
    return { x: px, y: py };
  }
  function screenToWorld(px, py) {
    const { cam } = state;
    const x = (px - state.canvas.width/2) / (TILE*cam.z) + cam.x;
    const y = (py - state.canvas.height/2) / (TILE*cam.z) + cam.y;
    return { x, y };
  }
  function screenToTile(px, py) {
    const w = screenToWorld(px, py);
    return { x: Math.round(w.x), y: Math.round(w.y) };
  }

  function placeHQ(x, y){
    const id = cryptoRandomId();
    state.buildings.push({ id, type:'hq', x, y, w:3, h:2 });
    return id;
  }
  function placeBuilding(type, x, y){
    const id = cryptoRandomId();
    const w = type==='hq'?3:2, h = type==='hq'?2:2;
    state.buildings.push({ id, type, x, y, w, h });
    return id;
  }
  function buildingAtTile(tx, ty){
    return state.buildings.find(b => tx>=b.x && tx<b.x+b.w && ty>=b.y && ty<b.y+b.h);
  }

  function addRoadLine(a, b){
    rasterLine(a.x, a.y, b.x, b.y).forEach(p => state.roads.add(keyXY(p.x, p.y)));
  }
  function removeRoadAt(tx, ty){
    const k = keyXY(tx,ty);
    if (state.roads.has(k)){ state.roads.delete(k); return true; }
    return false;
  }

  function cryptoRandomId(){
    // kurzer, stabiler Random‑ID‑Helfer
    return Math.random().toString(36).slice(2,10);
  }

  // ====== Pfade / Konnektivität ======
  function neighbors(x,y){
    // 4‑Nachbarn (nur Straßen‑Kacheln sind erlaubt)
    const nb = [];
    const opts = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx,dy] of opts){
      const k = keyXY(x+dx,y+dy);
      if (state.roads.has(k)) nb.push({x:x+dx,y:y+dy});
    }
    return nb;
  }
  function nearestRoadTileNearRect(b){
    // nimm die Mitte der Gebäudefront und suche die nächste Straßenkachel im 2‑Kachel‑Radius
    const cx = Math.round(b.x + b.w/2);
    const cy = Math.round(b.y + Math.floor(b.h/2));
    let best = null, bestD = 1e9;
    for (let r = 0; r <= 3; r++){
      for (let dx=-r; dx<=r; dx++){
        for (let dy=-r; dy<=r; dy++){
          const k = keyXY(cx+dx, cy+dy);
          if (state.roads.has(k)) {
            const d = Math.abs(dx)+Math.abs(dy);
            if (d<bestD){ bestD = d; best = {x:cx+dx,y:cy+dy}; }
          }
        }
      }
      if (best) break;
    }
    return best;
  }
  function bfsPath(start, goal){
    // beide müssen Straßen‑Kacheln sein
    if (!start || !goal) return null;
    const startK = keyXY(start.x,start.y);
    const goalK  = keyXY(goal.x,goal.y);
    if (!state.roads.has(startK) || !state.roads.has(goalK)) return null;

    const came = new Map();
    const q = new Queue();
    q.push(startK);
    came.set(startK, null);

    while (q.length){
      const k = q.shift();
      const [xStr,yStr] = k.split(',');
      const x = +xStr, y = +yStr;
      if (k===goalK) break;
      for (const n of neighbors(x,y)){
        const nk = keyXY(n.x,n.y);
        if (!came.has(nk)){
          came.set(nk,k);
          q.push(nk);
        }
      }
    }
    if (!came.has(goalK)) return null;

    // rekonstruieren
    const path = [];
    let ck = goalK;
    while (ck){
      const [xStr,yStr] = ck.split(',');
      path.push({x:+xStr, y:+yStr});
      ck = came.get(ck);
    }
    path.reverse();
    return path;
  }

  // Erzeuge/synchronisiere Träger je nach vorhandenen Verbindungen
  function rebuildCarriers(){
    state.carriers.length = 0;

    const HQs   = state.buildings.filter(b=>b.type==='hq');
    const woods = state.buildings.filter(b=>b.type==='woodcutter');
    const depots= state.buildings.filter(b=>b.type==='depot');
    if (!HQs.length || !depots.length || !woods.length) return;

    const hq = HQs[0];
    const hqRoad = nearestRoadTileNearRect(hq);
    if (!hqRoad) return;

    for (const wc of woods){
      const wcRoad = nearestRoadTileNearRect(wc);
      const dp = depots[0];
      const dpRoad = nearestRoadTileNearRect(dp);
      if (!wcRoad || !dpRoad) continue;

      // Pfad HQ -> Wood, Wood -> Depot (einfaches Beispiel)
      const p1 = bfsPath(hqRoad, wcRoad);
      const p2 = bfsPath(wcRoad, dpRoad);
      if (p1 && p2){
        const pathForward = p1.concat(p2.slice(1)); // zusammenhängen
        const carrierA = { path: pathForward, seg:0, t:0, speed: 1.5 };
        const carrierB = { path: pathForward.slice().reverse(), seg:0, t:0, speed: 1.5 };
        state.carriers.push(carrierA, carrierB);
      }
    }
  }

  // ====== Render ======
  function drawGrid(ctx, w, h){
    const { cam } = state;
    const sz = TILE*cam.z;
    // Start versetzt so, dass Linien an den Kachelzentren ausgerichtet sind
    const startX = ( (Math.floor((0 - w/2)/sz) * sz) % sz );
    const startY = ( (Math.floor((0 - h/2)/sz) * sz) % sz );

    ctx.save();
    ctx.translate(w/2 - (cam.x*sz % sz), h/2 - (cam.y*sz % sz));

    ctx.lineWidth = 1;
    ctx.strokeStyle = Colors.grid2;

    // Vertikal
    for (let x = startX - 20000; x <= w+20000; x += sz){
      ctx.beginPath(); ctx.moveTo(x, -20000); ctx.lineTo(x, h+20000); ctx.stroke();
    }
    // Horizontal
    for (let y = startY - 20000; y <= h+20000; y += sz){
      ctx.beginPath(); ctx.moveTo(-20000, y); ctx.lineTo(w+20000, y); ctx.stroke();
    }

    ctx.restore();
  }

  function drawRoads(ctx){
    ctx.save();
    ctx.lineWidth = Math.max(2, 4*state.cam.z);
    ctx.strokeStyle = Colors.road;
    // zeichne einzelne Kacheln als kurze Segmente (optisch zusammenhängend)
    for (const k of state.roads){
      const [tx,ty]=k.split(',').map(Number);
      const p = worldToScreen(tx,ty);
      const s = TILE*state.cam.z;
      ctx.beginPath();
      ctx.moveTo(p.x - s*0.45, p.y);
      ctx.lineTo(p.x + s*0.45, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuildings(ctx){
    const s = TILE*state.cam.z;
    for (const b of state.buildings){
      const p = worldToScreen(b.x, b.y);
      const w = b.w*s, h = b.h*s;
      ctx.save();
      ctx.fillStyle = (b.type==='hq')?Colors.hq : (b.type==='woodcutter'?Colors.wood:Colors.depot);
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, w, h, 8*state.cam.z);
      ctx.fill();

      // Label
      ctx.fillStyle = Colors.text;
      ctx.font = `${Math.max(10, 14*state.cam.z)}px system-ui, -apple-system, Segoe UI`;
      ctx.fillText(b.type==='woodcutter'?'Holzfäller':b.type.toUpperCase(), p.x + 8*state.cam.z, p.y + 18*state.cam.z);
      ctx.restore();
    }
  }

  function drawCarriers(ctx){
    const s = TILE*state.cam.z;
    for (const c of state.carriers){
      if (!c.path || c.path.length<2) continue;
      const a = c.path[c.seg];
      const b = c.path[c.seg+1];
      if (!a || !b) continue;
      const x = lerp(a.x, b.x, c.t);
      const y = lerp(a.y, b.y, c.t);
      const p = worldToScreen(x, y);

      ctx.save();
      ctx.fillStyle = Colors.carrierShadow;
      ctx.beginPath(); ctx.arc(p.x+2, p.y+2, Math.max(2.5, 4*state.cam.z), 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = Colors.carrier;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, 3.5*state.cam.z), 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  function render(){
    const { ctx, canvas } = state;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = Colors.bg;
    ctx.fillRect(0,0,canvas.width, canvas.height);

    drawGrid(ctx, canvas.width, canvas.height);
    drawRoads(ctx);
    drawBuildings(ctx);
    drawCarriers(ctx);

    // Preview für Straßenbau
    if (state.tool===Tools.ROAD && state.roadChainStart && state.previewTile){
      const a = state.roadChainStart, b = state.previewTile;
      const pts = rasterLine(a.x,a.y,b.x,b.y);
      ctx.save();
      ctx.strokeStyle = '#9cdcc0';
      ctx.lineWidth = Math.max(1, 2*state.cam.z);
      for (const p of pts){
        const sp = worldToScreen(p.x,p.y);
        const s = TILE*state.cam.z;
        ctx.beginPath(); ctx.moveTo(sp.x - s*0.45, sp.y); ctx.lineTo(sp.x + s*0.45, sp.y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ====== Simulation Loop ======
  function step(dt){
    state.tick += dt;

    // Träger vorwärts bewegen
    for (const c of state.carriers){
      if (!c.path || c.path.length<2) continue;
      c.t += (c.speed * dt) / 60; // dt ~ 1 pro Frame; „60“ ≈ Kacheln pro Zyklus
      while (c.t >= 1){
        c.t -= 1;
        c.seg++;
        if (c.seg >= c.path.length-1){
          c.seg = 0;
          c.t = 0;
        }
      }
    }
  }

  let raf = 0, lastTS = 0;
  function loop(ts){
    raf = requestAnimationFrame(loop);
    const dt = (ts - lastTS) / 16.6667 || 1;
    lastTS = ts;
    step(dt);
    render();
  }

  // ====== Eingabe ======
  function onPointerDown(ev){
    const rect = state.canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * state.DPR;
    const py = (ev.clientY - rect.top) * state.DPR;
    const t = screenToTile(px, py);

    if (state.tool === Tools.POINTER){
      state.dragging = true;
      state.dragStart = { x: px, y: py };
      state.camAtDrag = { x: state.cam.x, y: state.cam.y };
      return;
    }

    if (state.tool === Tools.ROAD){
      // neuer Start wenn weit weg vom letzten Endpunkt
      if (!state.roadChainStart || dist2(t, state.roadChainStart) > 2){
        state.roadChainStart = t;
        state.previewTile = t;
      } else {
        // gleich committen
        addRoadLine(state.roadChainStart, t);
        state.roadChainStart = t;  // Kettenbau: Endpunkt wird neuer Start
        state.previewTile = null;
        rebuildCarriers();
      }
      return;
    }

    if (state.tool === Tools.ERASE){
      // erst Straßen‑Hit, dann Gebäude
      if (removeRoadAt(t.x, t.y)){
        rebuildCarriers();
        return;
      }
      const b = buildingAtTile(t.x, t.y);
      if (b){
        // löschen (alle Straßen bleiben)
        state.buildings = state.buildings.filter(x=>x!==b);
        rebuildCarriers();
      }
      return;
    }

    // Gebäude bauen
    if (state.tool===Tools.HQ || state.tool===Tools.WOOD || state.tool===Tools.DEPOT){
      const exists = buildingAtTile(t.x, t.y);
      if (exists) return;
      placeBuilding(
        state.tool===Tools.HQ ? 'hq' :
        state.tool===Tools.WOOD ? 'woodcutter' : 'depot',
        t.x, t.y
      );
      rebuildCarriers();
    }
  }
  function onPointerMove(ev){
    const rect = state.canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * state.DPR;
    const py = (ev.clientY - rect.top) * state.DPR;

    if (state.tool===Tools.POINTER && state.dragging){
      const dx = (px - state.dragStart.x) / (TILE*state.cam.z);
      const dy = (py - state.dragStart.y) / (TILE*state.cam.z);
      state.cam.x = state.camAtDrag.x - dx;
      state.cam.y = state.camAtDrag.y - dy;
      return;
    }

    if (state.tool===Tools.ROAD && state.roadChainStart){
      state.previewTile = screenToTile(px, py);
    }
  }
  function onPointerUp(){
    state.dragging = false;
  }

  // Wheel‑Zoom (Maus) – mobil zoomen wir via Pinch in boot.js/Browser (falls aktiv)
  function onWheel(ev){
    ev.preventDefault();
    const dz = ev.deltaY < 0 ? 1.1 : 1/1.1;
    setZoom(state.cam.z * dz);
  }

  // ====== Öffentliche API ======
  function startGame(opts){
    // opts: {canvas, DPR, onHUD}
    if (!opts || !opts.canvas || !opts.canvas.getContext) throw new Error('canvas missing');
    state.canvas = opts.canvas;
    state.ctx = state.canvas.getContext('2d');
    state.DPR = opts.DPR || (window.devicePixelRatio || 1);
    state.onHUD = typeof opts.onHUD === 'function' ? opts.onHUD : ()=>{};

    // Canvas Größe & DPR
    function resize(){
      const rect = state.canvas.getBoundingClientRect();
      state.canvas.width  = Math.max(2, Math.floor(rect.width  * state.DPR));
      state.canvas.height = Math.max(2, Math.floor(rect.height * state.DPR));
    }
    resize();
    window.addEventListener('resize', resize);

    // Start‑Welt
    reset(false); // false = nicht automatisch HQ setzen -> hier setzen wir eins:
    const cx = Math.floor(WORLD_W/2), cy = Math.floor(WORLD_H/2);
    placeHQ(cx-2, cy-1);
    // Kleine Startstraße vor HQ
    addRoadLine({x:cx-1,y:cy}, {x:cx+5,y:cy});
    rebuildCarriers();

    // Eingabe
    const c = state.canvas;
    c.addEventListener('pointerdown', onPointerDown);
    c.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    c.addEventListener('wheel', onWheel, {passive:false});

    hudUpdateTool(); hudUpdateZoom();
    if (!raf) loop(performance.now());
  }

  function setTool(name){
    switch(name){
      case 'pointer': case 'road': case 'hq': case 'woodcutter': case 'depot': case 'erase':
        state.tool = name; break;
      default: state.tool = Tools.POINTER;
    }
    state.previewTile = null;
    hudUpdateTool();
  }

  function center(){
    // auf erstes HQ zentrieren, sonst Weltmitte
    const hq = state.buildings.find(b=>b.type==='hq');
    const target = hq ? {x:hq.x+1, y:hq.y+1} : {x:WORLD_W/2, y:WORLD_H/2};
    state.cam.x = target.x; state.cam.y = target.y;
  }

  function setZoom(z){
    state.cam.z = clamp(z, 0.4, 2.5);
    hudUpdateZoom();
  }

  function reset(placeHq = true){
    state.buildings = [];
    state.roads.clear();
    state.carriers = [];
    state.roadChainStart = null;
    if (placeHq){
      const cx = Math.floor(WORLD_W/2), cy = Math.floor(WORLD_H/2);
      placeHQ(cx-2, cy-1);
      addRoadLine({x:cx-1,y:cy},{x:cx+3,y:cy});
      rebuildCarriers();
    }
    center();
  }

  function toggleDebug(){
    state.debug = !state.debug;
  }

  // Exports
  window.game = {
    startGame,
    setTool,
    center,
    setZoom,
    reset,
    toggleDebug,
  };
})();
