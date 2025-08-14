// game.js (V14.7 mobile) — Straßen: Punkt-zu-Punkt mit Kette + Abriss-HitTest

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
  roadDraft: null, // {x,y} akt. Startpunkt der Kette
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
export function setTool(t){
  S.tool = t;
  if (t !== 'road') S.roadDraft = null;   // Kette automatisch beenden beim Toolwechsel
  S.onChange(state());
}
export function center(){
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
  S.roadDraft=null;
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
    // Raster-Snap
    const x = Math.round(wx / SIZE.grid) * SIZE.grid;
    const y = Math.round(wy / SIZE.grid) * SIZE.grid;

    // 1) Neuer Start, wenn noch keiner existiert
    if (!S.roadDraft){
      S.roadDraft = {x,y};
      draw(); return true;
    }

    // Distanz zum aktuellen Startpunkt
    const dx = x - S.roadDraft.x, dy = y - S.roadDraft.y;
    const dist2 = dx*dx + dy*dy;

    // 2) Gleicher Punkt: Kette beenden
    if (dist2 === 0){
      S.roadDraft = null;
      draw(); return true;
    }

    // 3) Sehr weit weg (neuer Bereich): neue Kette starten
    const far = (SIZE.grid*3)*(SIZE.grid*3);
    if (dist2 > far){
      S.roadDraft = {x,y};
      draw(); return true;
    }

    // 4) Reguläres Segment: vom Draft zum neuen Punkt
    S.roads.push({x1:S.roadDraft.x, y1:S.roadDraft.y, x2:x, y2:y});
    // Kette fortsetzen
    S.roadDraft = {x,y};
    draw(); return true;
  }

  if (S.tool==='erase'){
    // Gebäude unter Cursor löschen
    const bi = S.buildings.findIndex(b=> wx>=b.x && wx<=b.x+b.w && wy>=b.y && wy<=b.y+b.h );
    if (bi>=0){ S.buildings.splice(bi,1); draw(); return true; }

    // Straße in der Nähe löschen (Abstand Linie–Punkt)
    const hitIndex = hitRoadIndexNear(wx, wy, 12); // 12px Toleranz
    if (hitIndex>=0){
      S.roads.splice(hitIndex,1);
      draw(); return true;
    }
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

  // Draft-Startpunkt
  if (S.tool==='road' && S.roadDraft){
    ctx.fillStyle='#8ee0b0';
    ctx.beginPath();
    ctx.arc(S.roadDraft.x, S.roadDraft.y, 6, 0, Math.PI*2);
    ctx.fill();
  }

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

// --- Hit-Test für Straßen ---
function hitRoadIndexNear(px, py, tolPx){
  // tolPx in Weltkoordinaten umrechnen (ungefähr)
  const tol = tolPx; // Welt ~= px bei z≈1; passt für UI-Zwecke
  let bestI = -1, bestD = Infinity;
  for (let i=0; i<S.roads.length; i++){
    const r = S.roads[i];
    const d = pointSegDist(px,py, r.x1,r.y1, r.x2,r.y2);
    if (d < tol && d < bestD){ bestD = d; bestI = i; }
  }
  return bestI;
}
function pointSegDist(px,py, x1,y1,x2,y2){
  const vx = x2-x1, vy=y2-y1;
  const wx = px-x1, wy=py-y1;
  const c1 = vx*wx + vy*wy;
  if (c1 <= 0) return Math.hypot(px-x1, py-y1);
  const c2 = vx*vx + vy*vy;
  if (c2 <= c1) return Math.hypot(px-x2, py-y2);
  const t = c1 / c2;
  const projx = x1 + t*vx, projy = y1 + t*vy;
  return Math.hypot(px-projx, py-projy);
}
