// game.js (V14.7 mobile) — cache-bust: v=147f2

// --- State ---
const S = {
  res: { wood:30, stone:20, food:0, gold:0, carry:0 },
  tool: 'pointer',
  cam: { x:0, y:0, z:1, vw:1, vh:1, dpr:1 },
  dragging: false,
  dragStart: {x:0,y:0}, camStart:{x:0,y:0},
  debug:false,
  buildings: [], // {type:'hq'|'woodcutter'|'depot', x,y,w,h}
  roads: [],     // [{x1,y1,x2,y2}]
  onChange: ()=>{},
  ctx: null,
  canvas: null,
  logical: { w: 2000, h: 1200 }, // Spielfeld (logisch)
};
const SIZE = {
  grid: 64,
  hq: {w: 360, h: 220},
  wc: {w: 160, h: 160},
  dp: {w: 160, h: 160},
};

// --- API exposed to boot.js ---
export function init(opts){
  S.canvas = opts.canvas;
  S.ctx = S.canvas.getContext('2d');
  S.onChange = opts.onChange || (()=>{});
  draw();
}
export function state(){ return {
  res: S.res, tool:S.tool, cam:S.cam
};}
export function resize(pxW, pxH, dpr){
  S.cam.vw = pxW; S.cam.vh = pxH; S.cam.dpr = dpr||1;
  S.canvas.width  = Math.max(1, Math.round(pxW * S.cam.dpr));
  S.canvas.height = Math.max(1, Math.round(pxH * S.cam.dpr));
  draw();
}
export function setTool(t){ S.tool = t; S.onChange(state()); }
export function center(){
  // Falls HQ existiert → darauf fokussieren
  const hq = S.buildings.find(b=>b.type==='hq');
  const target = hq ? { x: hq.x + hq.w/2, y: hq.y + hq.h/2 } : { x: 0, y:0 };
  S.cam.x = target.x; S.cam.y = target.y;
  draw(); S.onChange(state());
}
export function toggleDebug(){ S.debug=!S.debug; draw(); return S.debug; }
export function reset(){
  S.res = { wood:30, stone:20, food:0, gold:0, carry:0 };
  S.tool='pointer';
  S.buildings.length=0;
  S.roads.length=0;
  S.cam.x=0; S.cam.y=0; S.cam.z=1;
  draw(); S.onChange(state());
}

// --- Input from boot.js ---
export function pointerDown(cx,cy){
  if (S.tool!=='pointer') return; // Panning nur im Zeiger
  S.dragging=true;
  S.dragStart.x = cx; S.dragStart.y = cy;
  S.camStart.x = S.cam.x; S.camStart.y = S.cam.y;
}
export function pointerMove(cx,cy){
  if (!S.dragging) return;
  const dx = (cx - S.dragStart.x) / S.cam.z;
  const dy = (cy - S.dragStart.y) / S.cam.z;
  S.cam.x = S.camStart.x - dx;
  S.cam.y = S.camStart.y - dy;
  draw();
}
export function pointerUp(){ S.dragging=false; }

export function zoomAt(cx, cy, factor){
  const oldZ = S.cam.z;
  let z = oldZ * factor;
  z = Math.min(2.5, Math.max(0.5, z));
  if (z===oldZ) return;

  // Zoom um Bildschirmpunkt (cx,cy)
  const wxOld = screenToWorldX(cx);
  const wyOld = screenToWorldY(cy);
  S.cam.z = z;
  const wxNew = screenToWorldX(cx);
  const wyNew = screenToWorldY(cy);
  S.cam.x += (wxOld - wxNew);
  S.cam.y += (wyOld - wyNew);

  draw(); S.onChange(state());
}

export function clickBuild(cx,cy){
  if (S.tool==='pointer') return false;
  const wx = screenToWorldX(cx), wy = screenToWorldY(cy);

  if (S.tool==='hq'){
    const w=SIZE.hq.w, h=SIZE.hq.h;
    S.buildings.push({type:'hq', x:wx-w/2, y:wy-h/2, w, h});
    draw(); return true;
  }
  if (S.tool==='woodcutter'){
    const w=SIZE.wc.w, h=SIZE.wc.h;
    S.buildings.push({type:'woodcutter', x:wx-w/2, y:wy-h/2, w, h});
    draw(); return true;
  }
  if (S.tool==='depot'){
    const w=SIZE.dp.w, h=SIZE.dp.h;
    S.buildings.push({type:'depot', x:wx-w/2, y:wy-h/2, w, h});
    draw(); return true;
  }
  if (S.tool==='road'){
    // einfache Raster‑Straße: auf Grid schnappen
    const x = Math.round(wx / SIZE.grid) * SIZE.grid;
    const y = Math.round(wy / SIZE.grid) * SIZE.grid;
    const last = S.roads.at(-1);
    if (!last || last.x2!==x || last.y2!==y){
      if (!last) S.roads.push({x1:x,y1:y,x2:x,y2:y});
      else S.roads.push({x1:last.x2,y1:last.y2,x2:x,y2:y});
    }
    draw(); return true;
  }
  if (S.tool==='erase'){
    // grob löschen: Gebäude unter Cursor
    const i = S.buildings.findIndex(b=> wx>=b.x && wx<=b.x+b.w && wy>=b.y && wy<=b.y+b.h );
    if (i>=0){ S.buildings.splice(i,1); draw(); return true; }
  }
  return false;
}

// --- Rendering ---
function draw(){
  const ctx = S.ctx; if (!ctx) return;
  const { dpr } = S.cam;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  // clear
  ctx.clearRect(0,0,S.canvas.width, S.canvas.height);

  // Hintergrund
  ctx.fillStyle = '#0b1628';
  ctx.fillRect(0,0,S.cam.vw, S.cam.vh);

  // Welt transformieren
  ctx.save();
  const ox = S.cam.vw/2 - S.cam.x*S.cam.z;
  const oy = S.cam.vh/2 - S.cam.y*S.cam.z;
  ctx.translate(ox, oy);
  ctx.scale(S.cam.z, S.cam.z);

  // Grid
  drawGrid(ctx);

  // Roads
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#63c28a';
  ctx.setLineDash([24,16]);
  ctx.lineCap='round';
  ctx.beginPath();
  for (const r of S.roads){
    ctx.moveTo(r.x1, r.y1);
    ctx.lineTo(r.x2, r.y2);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Buildings
  for (const b of S.buildings){
    drawBuilding(ctx, b);
  }

  ctx.restore();

  // Debug
  if (S.debug){
    ctx.fillStyle='#9fb3cc';
    ctx.font='12px system-ui';
    ctx.fillText(`cam: (${S.cam.x.toFixed(1)}, ${S.cam.y.toFixed(1)}) z=${S.cam.z.toFixed(2)}`, 10, S.cam.vh-12);
  }
}

function drawGrid(ctx){
  const step = SIZE.grid;
  const left   = worldLeft();
  const top    = worldTop();
  const right  = worldRight();
  const bottom = worldBottom();

  ctx.strokeStyle = '#213248';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.floor(left/step)*step; x <= right; x+=step){
    ctx.moveTo(x, top); ctx.lineTo(x, bottom);
  }
  for (let y = Math.floor(top/step)*step; y <= bottom; y+=step){
    ctx.moveTo(left, y); ctx.lineTo(right, y);
  }
  ctx.stroke();
}

function drawBuilding(ctx, b){
  const colors = {
    hq:'#27ae60',
    woodcutter:'#3b82f6',
    depot:'#e91e63',
  };
  ctx.fillStyle = colors[b.type] || '#666';
  ctx.strokeStyle = '#0a0a0a55';
  ctx.lineWidth = 2;

  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = '#e6f2ff';
  ctx.font='28px system-ui';
  const label = (b.type==='woodcutter'?'Holzfäller': b.type.toUpperCase());
  ctx.fillText(label, b.x+12, b.y+34);
}

// --- World/screen helpers ---
function screenToWorldX(cx){
  return (cx - (S.cam.vw/2 - S.cam.x*S.cam.z)) / S.cam.z;
}
function screenToWorldY(cy){
  return (cy - (S.cam.vh/2 - S.cam.y*S.cam.z)) / S.cam.z;
}
function worldLeft(){   return S.cam.x - (S.cam.vw/2)/S.cam.z; }
function worldRight(){  return S.cam.x + (S.cam.vw/2)/S.cam.z; }
function worldTop(){    return S.cam.y - (S.cam.vh/2)/S.cam.z; }
function worldBottom(){ return S.cam.y + (S.cam.vh/2)/S.cam.z; }
