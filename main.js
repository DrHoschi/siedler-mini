// main.js (V14.4) – keine weiteren Imports, exportiert run() & centerMap()

export async function run(opts){
  const canvas = opts.canvas;
  const DPR = opts.DPR || 1;
  const hud = (k,v)=>opts.onHUD?.(k,v);

  // ---------- Spielfeld/Kamera ----------
  const world = {
    tile: 64,
    width: 200,  // in Tiles
    height: 120,
  };
  const cam = {
    x: (world.width*world.tile)/2,
    y: (world.height*world.tile)/2,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2.0,
  };
  let debug = false;

  // ---------- Spielstand ----------
  const state = {
    res: {Wood:0, Stone:0, Food:0, Gold:0, Carriers:0},
    tool: 'pointer', // pointer|road|hq|lumber|depot|bulldoze
    roads: [],       // [{x1,y1,x2,y2}]
    buildings: [],   // [{type:'hq'|'lumber'|'depot', x,y,w,h}]
  };

  // HQ vorplatzieren (Mitte)
  const HQ = {type:'hq', x: Math.floor(world.width/2)*world.tile, y: Math.floor(world.height/2)*world.tile, w: world.tile*5, h: world.tile*3};
  state.buildings.push(HQ);

  // ---------- Canvas Setup ----------
  function resizeCanvas() {
    const w = canvas.clientWidth|0, h = canvas.clientHeight|0;
    if (!w || !h) return;
    if (canvas.width !== w*DPR || canvas.height !== h*DPR){
      canvas.width = w*DPR; canvas.height = h*DPR;
    }
  }
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(canvas);

  const ctx = canvas.getContext('2d');

  // ---------- Utilities ----------
  function worldToScreen(wx, wy){
    const cx = canvas.width / (2*DPR), cy = canvas.height / (2*DPR);
    return [
      cx + (wx - cam.x) * cam.zoom,
      cy + (wy - cam.y) * cam.zoom
    ];
  }
  function screenToWorld(sx, sy){
    const cx = canvas.width / (2*DPR), cy = canvas.height / (2*DPR);
    return [
      cam.x + (sx - cx) / cam.zoom,
      cam.y + (sy - cy) / cam.zoom
    ];
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function centerMap(){
    cam.x = (world.width*world.tile)/2;
    cam.y = (world.height*world.tile)/2;
    requestRender();
  }
  exportFunction('centerMap', centerMap);

  function toggleDebug(){
    debug = !debug;
    requestRender();
  }
  exportFunction('toggleDebug', toggleDebug);

  // ---------- Input ----------
  let dragging = false;
  let last = {x:0,y:0};
  let pinch = null; // {d,lastZoom}

  canvas.addEventListener('pointerdown', (e)=>{
    canvas.setPointerCapture(e.pointerId);
    last.x = e.clientX; last.y = e.clientY;
    dragging = true;
  });
  canvas.addEventListener('pointerup', (e)=>{
    canvas.releasePointerCapture(e.pointerId);
    if (!dragging) return;
    dragging = false;

    // kurzer Tap → bauen/aktion (nur wenn kaum Bewegung)
    const dx = Math.abs(e.clientX - last.x);
    const dy = Math.abs(e.clientY - last.y);
    if (dx < 6 && dy < 6){
      const [wx,wy] = screenToWorld(e.clientX*1, e.clientY*1);
      handleTap(wx, wy);
    }
  });
  canvas.addEventListener('pointermove', (e)=>{
    if (!dragging) return;
    // Pan nur im Pointer-Tool
    if (state.tool === 'pointer'){
      const dx = (e.clientX - last.x) / cam.zoom;
      const dy = (e.clientY - last.y) / cam.zoom;
      cam.x -= dx; cam.y -= dy;
      last.x = e.clientX; last.y = e.clientY;
      clampCamera();
      requestRender();
    }
  });

  // Pinch-Zoom (2-Finger) via Touch-Events (Safari iOS)
  canvas.addEventListener('touchstart', (e)=>{
    if (e.touches.length===2){
      const d = dist(e.touches[0], e.touches[1]);
      pinch = {d, lastZoom: cam.zoom};
    }
  }, {passive:true});
  canvas.addEventListener('touchmove', (e)=>{
    if (e.touches.length===2 && pinch){
      const d = dist(e.touches[0], e.touches[1]);
      const ratio = (d / Math.max(1,pinch.d));
      cam.zoom = clamp(pinch.lastZoom * ratio, cam.minZoom, cam.maxZoom);
      hud('Zoom', `${cam.zoom.toFixed(2)}x`);
      requestRender();
    }
  }, {passive:true});
  canvas.addEventListener('touchend', ()=>{ pinch = null; }, {passive:true});

  // Wheel-Zoom (Desktop)
  canvas.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    cam.zoom = clamp(cam.zoom * (delta>0? 0.9 : 1.1), cam.minZoom, cam.maxZoom);
    hud('Zoom', `${cam.zoom.toFixed(2)}x`);
    requestRender();
  }, {passive:false});

  // Tool-Buttons (DOM)
  function selectTool(id, name){
    state.tool = id;
    hud('Tool', name);
  }
  $('#toolPointer')?.addEventListener('click', ()=>selectTool('pointer','Zeiger'));
  $('#toolRoad')?.addEventListener('click',   ()=>selectTool('road','Straße'));
  $('#toolHQ')?.addEventListener('click',     ()=>selectTool('hq','HQ'));
  $('#toolLumber')?.addEventListener('click', ()=>selectTool('lumber','Holzfäller'));
  $('#toolDepot')?.addEventListener('click',  ()=>selectTool('depot','Depot'));
  $('#toolBulldoze')?.addEventListener('click',()=>selectTool('bulldoze','Abriss'));

  // ---------- Aktionen ----------
  function handleTap(wx, wy){
    if (state.tool === 'pointer') return; // nichts zu bauen

    if (state.tool === 'hq'){
      placeBuilding('hq', wx, wy, 5, 3);
    } else if (state.tool === 'lumber'){
      placeBuilding('lumber', wx, wy, 3, 2);
    } else if (state.tool === 'depot'){
      placeBuilding('depot', wx, wy, 3, 2);
    } else if (state.tool === 'bulldoze'){
      bulldozeAt(wx, wy);
    } else if (state.tool === 'road'){
      // Straßen-Klick setzt kurzen Abschnitt im Grid
      const t = world.tile;
      const gx = Math.floor(wx/t)*t, gy = Math.floor(wy/t)*t;
      state.roads.push({x1:gx,y1:gy,x2:gx+t,y2:gy});
    }
    requestRender();
  }

  function placeBuilding(type, wx, wy, tw, th){
    const t = world.tile;
    const gx = Math.floor(wx/t)*t, gy = Math.floor(wy/t)*t;
    const w = tw*t, h = th*t;
    // simple Kollisionsprüfung
    for (const b of state.buildings){
      if (rectsOverlap(gx,gy,w,h, b.x,b.y,b.w,b.h)) return;
    }
    state.buildings.push({type, x:gx, y:gy, w, h});
  }

  function bulldozeAt(wx, wy){
    const i = state.buildings.findIndex(b => pointInRect(wx,wy,b.x,b.y,b.w,b.h));
    if (i>=0){ state.buildings.splice(i,1); return; }
    // roads
    for (let r=0;r<state.roads.length;r++){
      const rd = state.roads[r];
      if (pointNearSegment(wx,wy, rd.x1,rd.y1,rd.x2,rd.y2, 10)){
        state.roads.splice(r,1); return;
      }
    }
  }

  // ---------- Render ----------
  let needsRender = true;
  function requestRender(){ needsRender = true; }

  function clampCamera(){
    const w = world.width*world.tile, h = world.height*world.tile;
    const viewW = (canvas.width / DPR) / cam.zoom;
    const viewH = (canvas.height / DPR) / cam.zoom;
    cam.x = clamp(cam.x, viewW*0.5, w - viewW*0.5);
    cam.y = clamp(cam.y, viewH*0.5, h - viewH*0.5);
  }

  function draw(){
    clampCamera();
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,canvas.width/DPR,canvas.height/DPR);

    // Hintergrund
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR);

    // Welt-Transform
    const [cx, cy] = [canvas.width/(2*DPR), canvas.height/(2*DPR)];
    ctx.translate(cx, cy);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // Grid
    drawGrid();

    // Roads
    ctx.strokeStyle = '#657fa8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const r of state.roads){
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.stroke();
    }

    // Buildings
    for (const b of state.buildings){
      drawBuilding(b);
    }

    // Debug crosshair
    if (debug){
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cam.x-2000, cam.y); ctx.lineTo(cam.x+2000, cam.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cam.x, cam.y-2000); ctx.lineTo(cam.x, cam.y+2000); ctx.stroke();
    }
  }

  function drawGrid(){
    const t = world.tile;
    const startX = Math.floor((cam.x - (canvas.width/(2*DPR))/cam.zoom)/t)*t - t;
    const endX   = Math.floor((cam.x + (canvas.width/(2*DPR))/cam.zoom)/t)*t + t;
    const startY = Math.floor((cam.y - (canvas.height/(2*DPR))/cam.zoom)/t)*t - t;
    const endY   = Math.floor((cam.y + (canvas.height/(2*DPR))/cam.zoom)/t)*t + t;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x=startX; x<=endX; x+=t){
      ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
    }
    for (let y=startY; y<=endY; y+=t){
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
    }
  }

  function drawBuilding(b){
    const color =
      b.type==='hq' ? '#2ea24b' :
      b.type==='lumber' ? '#2a7fcf' :
      b.type==='depot' ? '#cfa32a' : '#6a6a6a';

    ctx.fillStyle = color;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = 'bold 36px system-ui,-apple-system,Segoe UI,Roboto,Arial';
    const label =
      b.type==='hq' ? 'HQ (Platzhalter)' :
      b.type==='lumber' ? 'Holzfäller' :
      b.type==='depot' ? 'Depot' : b.type;
    ctx.fillText(label, b.x - 120, b.y - 14);
  }

  // ---------- Helpers ----------
  function dist(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }
  function rectsOverlap(ax,ay,aw,ah, bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }
  function pointInRect(px,py, x,y,w,h){ return px>=x && px<=x+w && py>=y && py<=y+h; }
  function pointNearSegment(px,py, x1,y1,x2,y2, r){
    // Abstand Punkt → Segment
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot = A*C + B*D;
    const lenSq = C*C + D*D;
    let t = lenSq!==0 ? dot/lenSq : -1;
    t = Math.max(0, Math.min(1,t));
    const xx = x1 + t*C, yy = y1 + t*D;
    const dx = px-xx, dy = py-yy;
    return (dx*dx + dy*dy) <= r*r;
  }

  function $(sel){ return document.querySelector(sel); }
  function exportFunction(name, fn){ try{ Object.defineProperty(window,'main',{value:window.main||{}, writable:true}); window.main[name]=fn; }catch(_){} }

  // ---------- Loop ----------
  function frame(){
    if (needsRender){ draw(); needsRender = false; }
    requestAnimationFrame(frame);
  }
  requestRender();
  frame();

  // HUD initial
  hud('Wood', state.res.Wood);
  hud('Stone', state.res.Stone);
  hud('Food', state.res.Food);
  hud('Gold', state.res.Gold);
  hud('Carriers', state.res.Carriers);
  hud('Tool', 'Zeiger');
  hud('Zoom', `${cam.zoom.toFixed(2)}x`);

  // public OK
  return true;
}

// zusätzliche API bereits oben via exportFunction hinterlegt:
export function centerMap(){ /* wird zur Laufzeit ersetzt */ }
export function toggleDebug(){ /* wird zur Laufzeit ersetzt */ }
