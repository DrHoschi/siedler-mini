/* main.js – Siedler Mini V12.3 (angepasst zur geposteten index.html)
   - Iso-Renderer mit exakter Klick-Zuordnung (inverse Iso + Rhombus-Test)
   - Zoom zum Mauszeiger, Pinch-Zoom (Touch)
   - Panning (Zeiger-Tool: Linksdrag; immer: Rechts/Mitte; Touch: 1 Finger)
   - Ghost-Vorschau im Bau-Tool
   - Straßen-Autotiling (Basis)
   - Mini-Map
*/

'use strict';

// === Canvas/CTX ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha:false });
const mini = document.getElementById('miniMap');
const mctx = mini.getContext('2d');

// === Größe/Resize ===
function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', ()=>{ resize(); drawAll(); });
resize();

// === Kamera / Zoom ===
const ZMIN=0.5, ZMAX=2.5;
let cam = { x:0, y:0, z:1.2 };

// === Iso-Geom. ===
const TILE_W = 96;   // sichtbare Rhombus-Breite
const TILE_H = 54;   // sichtbare Rhombus-Höhe

// === Welt ===
const MAP = { W:44, H:32 };
const grid = Array.from({length:MAP.H},()=>Array.from({length:MAP.W},()=>({
  ground:'grass', road:false, roadMask:0, building:null, node:null, stock:0
})));
let HQ = { x:(MAP.W/2)|0, y:(MAP.H/2)|0 };
grid[HQ.y][HQ.x].building='hq';

// === Assets laden (mit Fallback) ===
const IM={};
function load(key, src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>{IM[key]=i; r();}; i.onerror=()=>{IM[key]=null; r();}; i.src=src; }); }
const toLoad = [
  ['grass','assets/grass.png'],
  ['water','assets/water.png'],
  ['shore','assets/shore.png'],
  ['road_straight','assets/road_straight.png'],
  ['road_curve','assets/road_curve.png'],
  ['hq','assets/hq_wood.png'],
  ['lumber','assets/lumberjack.png'],
  ['depot','assets/depot.png']
];

// === Werkzeuge/Status ===
let currentTool = 'pointer'; // 'pointer' | 'road' | 'hq' | 'lumberjack' | 'depot' | 'bulldoze'
let ghost = {x:null, y:null, tex:null};

// Buttons binden
function bindToolbar(){
  const set = (tool)=>{ currentTool=tool; ghost.x=ghost.y=null; };
  document.getElementById('selectTool')?.addEventListener('click', ()=>set('pointer'));
  document.getElementById('buildRoad')?.addEventListener('click', ()=>set('road'));
  document.getElementById('buildHQ')?.addEventListener('click', ()=>set('hq'));
  document.getElementById('buildLumberjack')?.addEventListener('click', ()=>set('lumberjack'));
  document.getElementById('buildDepot')?.addEventListener('click', ()=>set('depot'));
  // ESC → Zeiger
  window.addEventListener('keydown', e=>{ if(e.key==='Escape'){ set('pointer'); } });
}

// === Welt generieren (einfacher See + Shore + Waldknoten) ===
function genWorld(){
  // See
  for(let y=18;y<28;y++) for(let x=3;x<14;x++) grid[y][x].ground='water';
  // Ufer (8er Nachbarn)
  const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let y=1;y<MAP.H-1;y++)for(let x=1;x<MAP.W-1;x++){
    if(grid[y][x].ground==='water') continue;
    const near = N8.some(([dx,dy])=> grid[y+dy]?.[x+dx]?.ground==='water');
    if(near) grid[y][x].ground='shore';
  }
  // Waldknoten
  function blob(cx,cy,r){
    for(let y=Math.max(1,cy-r); y<=Math.min(MAP.H-2,cy+r); y++)
      for(let x=Math.max(1,cx-r); x<=Math.min(MAP.W-2,cx+r); x++){
        const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy<=r*r && grid[y][x].ground==='grass') grid[y][x].node='forest';
      }
  }
  blob(22,12,3); blob(28,8,2); blob(34,18,4);
}

// === Projektion/Umrechnung ===
function cellToIso(x,y){ return { x:(x - y)*(TILE_W/2), y:(x + y)*(TILE_H/2) }; }
function rectForTile(x,y){ const p=cellToIso(x,y); return { x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H }; }

// Bildschirm -> Tile (exakt, mit Rhombus-Test)
function screenToCell(sx, sy){
  const wx = sx/cam.z + cam.x;
  const wy = sy/cam.z + cam.y;

  const fx = (wy/(TILE_H/2) + wx/(TILE_W/2)) / 2;
  const fy = (wy/(TILE_H/2) - wx/(TILE_W/2)) / 2;

  let x = Math.floor(fx);
  let y = Math.floor(fy);
  if (x<0 || y<0 || x>=MAP.W || y>=MAP.H) return null;

  const cx = (x - y)*(TILE_W/2);
  const cy = (x + y)*(TILE_H/2);
  const dx = (wx - cx)/(TILE_W/2) - 0.5;
  const dy = (wy - cy)/(TILE_H/2) - 0.5;

  if (Math.abs(dx) + Math.abs(dy) > 0.5){
    if (dy > Math.abs(dx)) y += 1;
    else if (-dy > Math.abs(dx)) y -= 1;
    else if (dx > 0) x += 1;
    else x -= 1;
    if (x<0 || y<0 || x>=MAP.W || y>=MAP.H) return null;
  }
  return {x,y};
}

function centerOn(x,y){
  const r=rectForTile(x,y);
  cam.x = r.x + r.w/2 - (canvas.width/cam.z)/2;
  cam.y = r.y + r.h/2 - (canvas.height/cam.z)/2;
}

// === Straßen-Autotiling (Basis: gerade/kurve) ===
function computeRoadMasks(){
  const dirs = [[0,-1],[1,0],[0,1],[-1,0]]; // N,E,S,W → Bits 1,2,4,8
  for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
    if (!grid[y][x].road){ grid[y][x].roadMask=0; continue; }
    let m=0;
    dirs.forEach(([dx,dy],i)=>{ const nx=x+dx, ny=y+dy; if(grid[ny]?.[nx]?.road) m|=(1<<i); });
    grid[y][x].roadMask=m;
  }
}
function pickRoadTexture(mask){
  // 0/1/2‑Verbindungen → wir nehmen grob: 2-opposite = straight, sonst curve, 3/4 = curve als Fallback
  if (mask===0) return IM.road_straight||null;
  const opp = (mask===5 || mask===10); // N+S oder E+W
  if (opp) return IM.road_straight || IM.road_curve;
  return IM.road_curve || IM.road_straight;
}

// === Interaktion: Pan/Zoom/Bauen ===
let panning=false, panStart={x:0,y:0}, camStart={x:0,y:0};

// Maus-Down
canvas.addEventListener('mousedown', e=>{
  const rect=canvas.getBoundingClientRect();
  if (currentTool==='pointer' || e.button!==0){
    // Pan starten
    panning=true; panStart={x:e.clientX,y:e.clientY}; camStart={...cam};
    canvas.setPointerCapture?.(e.pointerId||0);
  } else {
    // Bauen
    buildAt(e.clientX - rect.left, e.clientY - rect.top);
  }
});
// Maus-Move
canvas.addEventListener('mousemove', e=>{
  const rect=canvas.getBoundingClientRect();
  if (panning){
    const dx=(e.clientX-panStart.x)/cam.z, dy=(e.clientY-panStart.y)/cam.z;
    cam.x = camStart.x - dx; cam.y = camStart.y - dy;
  } else {
    // Ghost im Bau-Tool
    if (currentTool!=='pointer' && currentTool!=='bulldoze'){
      const cell=screenToCell(e.clientX-rect.left, e.clientY-rect.top);
      if (cell){ ghost.x=cell.x; ghost.y=cell.y; ghost.tex = (currentTool==='road'?'road_straight':'hq'); }
      else { ghost.x=ghost.y=null; }
    } else { ghost.x=ghost.y=null; }
  }
});
window.addEventListener('mouseup', ()=>{ panning=false; });
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// Wheel-Zoom zum Mauspunkt
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const rect=canvas.getBoundingClientRect();
  const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
  const wx=sx/cam.z + cam.x, wy=sy/cam.z + cam.y;
  cam.z = Math.max(ZMIN, Math.min(ZMAX, cam.z * (e.deltaY>0?0.9:1.1)));
  cam.x = wx - sx/cam.z; cam.y = wy - sy/cam.z;
},{passive:false});

// Touch: 1 Finger Pan, 2 Finger Pinch
let pinch=null;
canvas.addEventListener('touchstart', e=>{
  if (e.touches.length===1){
    panning=true; panStart={x:e.touches[0].clientX,y:e.touches[0].clientY}; camStart={...cam};
  } else if (e.touches.length===2){
    pinch={ d:dist(e.touches[0],e.touches[1]), z:cam.z,
            mid:{ x:(e.touches[0].clientX+e.touches[1].clientX)/2,
                  y:(e.touches[0].clientY+e.touches[1].clientY)/2 } };
  }
},{passive:true});
canvas.addEventListener('touchmove', e=>{
  if (e.touches.length===1 && panning){
    const dx=(e.touches[0].clientX-panStart.x)/cam.z, dy=(e.touches[0].clientY-panStart.y)/cam.z;
    cam.x = camStart.x - dx; cam.y = camStart.y - dy;
  } else if (e.touches.length===2 && pinch){
    e.preventDefault();
    const d=dist(e.touches[0],e.touches[1]); const factor=d/pinch.d;
    const rect=canvas.getBoundingClientRect(); const sx=pinch.mid.x-rect.left, sy=pinch.mid.y-rect.top;
    const wx=sx/cam.z + cam.x, wy=sy/cam.z + cam.y;
    cam.z = Math.max(ZMIN, Math.min(ZMAX, pinch.z*factor));
    cam.x = wx - sx/cam.z; cam.y = wy - sy/cam.z;
  }
},{passive:false});
canvas.addEventListener('touchend', ()=>{ if(event.touches?.length===0){ panning=false; pinch=null; } }, {passive:true});
function dist(a,b){ return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); }

// Bauen/Abriss
function buildAt(sx,sy){
  const cell = screenToCell(sx,sy); if (!cell) return;
  const {x,y} = cell;
  if (currentTool==='bulldoze'){
    if (x===HQ.x && y===HQ.y) return;
    grid[y][x].road=false; grid[y][x].roadMask=0; grid[y][x].building=null; grid[y][x].stock=0;
  } else if (currentTool==='road'){
    if (!grid[y][x].building){ grid[y][x].road=true; computeRoadMasks(); }
  } else if (currentTool==='hq'){
    // Nur eins: versetzen erlaubt
    grid[HQ.y][HQ.x].building=null;
    HQ={x,y}; grid[y][x].building='hq';
  } else if (currentTool==='lumberjack'){
    if (!grid[y][x].road && !grid[y][x].building) grid[y][x].building='lumber';
  } else if (currentTool==='depot'){
    if (!grid[y][x].road && !grid[y][x].building) grid[y][x].building='depot';
  }
}

// === Zeichnen ===
function pathDiamond(x,y,w,h){
  ctx.beginPath();
  ctx.moveTo(x + w*0.5, y);
  ctx.lineTo(x + w,     y + h*0.5);
  ctx.lineTo(x + w*0.5, y + h);
  ctx.lineTo(x,         y + h*0.5);
  ctx.closePath();
}

function drawGround(){
  for(let y=0;y<MAP.H;y++){
    for(let x=0;x<MAP.W;x++){
      const r=rectForTile(x,y);
      ctx.save(); pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
      const img = (grid[y][x].ground==='water'?IM.water:(grid[y][x].ground==='shore'?IM.shore:IM.grass));
      if (img) ctx.drawImage(img, r.x-1, r.y-1, r.w+2, r.h+2); else { ctx.fillStyle='#223'; ctx.fillRect(r.x,r.y,r.w,r.h); }
      ctx.restore();
      // zartes Gitter
      ctx.strokeStyle='rgba(255,255,255,.03)'; ctx.strokeRect(r.x,r.y,r.w,r.h);
    }
  }
}

function drawRoads(){
  for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
    if (!grid[y][x].road) continue;
    const r=rectForTile(x,y);
    const tex = pickRoadTexture(grid[y][x].roadMask);
    ctx.save(); pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
    if (tex) ctx.drawImage(tex, r.x-1, r.y-1, r.w+2, r.h+2);
    else { ctx.fillStyle='#6b6f7a'; ctx.fillRect(r.x+r.w*.18, r.y+r.h*.36, r.w*.64, r.h*.28); }
    ctx.restore();
  }
}

function drawBuildings(){
  for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
    const b=grid[y][x].building; if(!b) continue;
    const r=rectForTile(x,y);
    let img=null;
    if (b==='hq') img=IM.hq;
    else if (b==='lumber') img=IM.lumber;
    else if (b==='depot') img=IM.depot;

    if (img){
      const w=r.w*1.05, h=img.height*(w/img.width);
      ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h - h + r.h*0.10, w, h);
    } else {
      ctx.fillStyle= b==='hq'?'#6a4' : (b==='depot'?'#bfa':'#4aa45a');
      ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
    }
  }
}

function drawGhost(){
  if (ghost.x==null || ghost.y==null) return;
  const r=rectForTile(ghost.x,ghost.y);
  ctx.save(); pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
  ctx.globalAlpha=0.35;
  if (currentTool==='road'){
    ctx.fillStyle='#9aa0aa'; ctx.fillRect(r.x+r.w*.18, r.y+r.h*.36, r.w*.64, r.h*.28);
  } else {
    ctx.fillStyle='#7db3ff'; ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
  }
  ctx.restore();
  ctx.globalAlpha=1;
}

function drawMini(){
  const w=mini.width, h=mini.height, sx=w/MAP.W, sy=h/MAP.H;
  mctx.clearRect(0,0,w,h);
  for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
    const g=grid[y][x].ground;
    mctx.fillStyle = g==='water' ? '#1a3a55' : (g==='shore' ? '#2c4d2c' : '#244a21');
    mctx.fillRect(x*sx,y*sy,sx,sy);
    if (grid[y][x].road){ mctx.fillStyle='#888'; mctx.fillRect(x*sx,y*sy,sx,sy); }
    if (grid[y][x].building==='hq'){ mctx.fillStyle='#6ee7a9'; mctx.fillRect(x*sx,y*sy,sx,sy); }
    if (grid[y][x].building==='lumber'){ mctx.fillStyle='#9ad17a'; mctx.fillRect(x*sx,y*sy,sx,sy); }
    if (grid[y][x].building==='depot'){ mctx.fillStyle='#d9c28f'; mctx.fillRect(x*sx,y*sy,sx,sy); }
  }
}

// Alles zeichnen (mit sauberem Clear)
function drawAll(){
  // 1) komplettes Canvas leeren (ohne Transform)
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled = true;

  // 2) Zoomen
  ctx.save();
  ctx.scale(cam.z, cam.z);

  // 3) Hintergrund (optional)
  ctx.fillStyle='#0b0e13';
  ctx.fillRect(0,0, canvas.width/cam.z, canvas.height/cam.z);

  // 4) Ebenen
  drawGround();
  computeRoadMasks();
  drawRoads();
  drawBuildings();
  drawGhost();

  ctx.restore();
  drawMini();
}

// === Loop ===
function loop(){
  drawAll();
  requestAnimationFrame(loop);
}

// === Start/Reset (vom Startscreen) ===
function startGame(){
  document.getElementById('startScreen')?.style.setProperty('display','none');
  // (hier könntest du später Ressourcen/Produktion/Träger starten)
}
window.startGame = startGame; // für index.html Button

// === Boot ===
Promise.all(toLoad.map(([k,s])=>load(k,s))).then(()=>{
  genWorld();
  bindToolbar();
  centerOn(HQ.x,HQ.y);
  drawAll();        // Karte sichtbar hinter Overlay
  requestAnimationFrame(loop);
});
