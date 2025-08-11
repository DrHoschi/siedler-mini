/* Siedler‑Mini V12.2fix – Iso + Pan/Zoom + saubere Tiles + Werkzeuge
   passt zur geposteten index.html (V12.2)
*/

'use strict';

// ===== Canvas & Kontext =====
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha:false });
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');

// ===== Kamera / Zoom =====
let cam = { x:0, y:0, z:1 };
const ZMIN=0.5, ZMAX=2.5;

// ===== Iso-Geometrie =====
const TILE_W = 96;   // sichtbare Iso-Breite
const TILE_H = 54;   // sichtbare Iso-Höhe

// ===== Map =====
const MAP = { W:44, H:32 };
const grid = Array.from({length:MAP.H},()=>Array.from({length:MAP.W},()=>({
  ground:'grass', road:false, building:null, node:null, stock:0
})));
let HQ = { x:(MAP.W/2)|0, y:(MAP.H/2)|0 };
grid[HQ.y][HQ.x].building='hq';

// ===== Ressourcen (nur Anzeige) =====
const res = { wood:20, stone:10, food:10, gold:0, pop:3 };
function hud(){ ['wood','stone','food','gold','pop'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=Math.floor(res[id]); }); }

// ===== Werkzeuge =====
let tool='select';
let ghost = {x:null,y:null};

document.querySelectorAll('#toolbar .btn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('#toolbar .btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    tool = b.dataset.tool;           // 'select' | 'road' | 'lumber' | 'bulldoze'
    ghost.x=ghost.y=null;
  });
});

// ===== Texturen =====
const IM={};
function load(key,src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>{IM[key]=i;r();}; i.onerror=()=>{IM[key]=null;r();}; i.src=src; }); }
const toLoad=[
  ['grass','assets/grass.png'], ['water','assets/water.png'], ['shore','assets/shore.png'],
  ['road','assets/road_straight.png'], // Fallback: eine Road-Textur
  ['hq','assets/hq_wood.png'], ['lumber','assets/lumberjack.png']
];

// ===== Welt erzeugen =====
function genWorld(){
  // Wasserblock links unten
  for(let y=18;y<28;y++) for(let x=3;x<14;x++) grid[y][x].ground='water';
  // Ufer (8er Nachbarschaft)
  const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let y=1;y<MAP.H-1;y++)for(let x=1;x<MAP.W-1;x++){
    if(grid[y][x].ground==='water') continue;
    const near = N8.some(([dx,dy])=> grid[y+dy]?.[x+dx]?.ground==='water');
    if(near) grid[y][x].ground='shore';
  }
  // Waldknoten
  function blob(cx,cy,r){ for(let y=Math.max(1,cy-r);y<=Math.min(MAP.H-2,cy+r);y++) for(let x=Math.max(1,cx-r);x<=Math.min(MAP.W-2,cx+r);x++){ const dx=x-cx,dy=y-cy; if(dx*dx+dy*dy<=r*r && grid[y][x].ground==='grass') grid[y][x].node='forest'; } }
  blob(22,12,3); blob(28,8,2); blob(34,18,4);
}

// ===== Projektion / Hilfen =====
function cellToIso(x,y){ return { x:(x - y) * (TILE_W/2), y:(x + y) * (TILE_H/2) }; }
function rectForTile(x,y){ const p=cellToIso(x,y); return { x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H }; }
function screenToCell(sx,sy){
  const wx=sx/cam.z + cam.x, wy=sy/cam.z + cam.y;
  // einfacher Hit: Rechtecktest
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    const r=rectForTile(x,y);
    if(wx>=r.x && wy>=r.y && wx<r.x+r.w && wy<r.y+r.h) return {x,y};
  }
  return null;
}
function centerOn(x,y){ const r=rectForTile(x,y); cam.x=r.x+r.w/2 - (canvas.width/cam.z)/2; cam.y=r.y+r.h/2 - (canvas.height/cam.z)/2; }

// ===== Pan/Zoom Eingabe =====
let panning=false, panLast={x:0,y:0}, panStartCam={x:0,y:0};

canvas.addEventListener('mousedown', e=>{
  if (tool==='select' || e.button!==0){     // Zeiger: Linke Maus = Pan; sonst Rechts/Mitte
    panning=true; panLast={x:e.clientX,y:e.clientY}; panStartCam={...cam};
    canvas.setPointerCapture(e.pointerId||0);
  } else {
    buildAtPointer(e.clientX,e.clientY);
  }
});
canvas.addEventListener('mousemove', e=>{
  if(!panning){
    // Ghost nur im Bau-Tool
    const r=canvas.getBoundingClientRect();
    const c = screenToCell(e.clientX-r.left, e.clientY-r.top);
    if(!c || tool==='select' || tool==='bulldoze'){ ghost.x=ghost.y=null; return; }
    ghost=c;
    return;
  }
  const dx=(e.clientX-panLast.x)/cam.z, dy=(e.clientY-panLast.y)/cam.z;
  cam.x = panStartCam.x - dx; cam.y = panStartCam.y - dy;
});
window.addEventListener('mouseup', ()=>{panning=false;});
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// Wheel → Zoom zum Mauspunkt
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const r=canvas.getBoundingClientRect(); const sx=e.clientX-r.left, sy=e.clientY-r.top;
  const wx=sx/cam.z + cam.x, wy=sy/cam.z + cam.y;              // Welt vor Zoom
  cam.z=Math.max(ZMIN,Math.min(ZMAX, cam.z * (e.deltaY>0?0.9:1.1)));
  cam.x=wx - sx/cam.z; cam.y=wy - sy/cam.z;
},{passive:false});

// Touch: 1 Finger Pan, 2 Finger Pinch
let pinch=null;
canvas.addEventListener('touchstart', e=>{
  if(e.touches.length===1){
    panning=true; panLast={x:e.touches[0].clientX,y:e.touches[0].clientY}; panStartCam={...cam};
  } else if(e.touches.length===2){
    pinch={ d:dist(e.touches[0],e.touches[1]), z:cam.z,
            mid:{ x:(e.touches[0].clientX+e.touches[1].clientX)/2,
                  y:(e.touches[0].clientY+e.touches[1].clientY)/2 } };
  }
},{passive:true});
canvas.addEventListener('touchmove', e=>{
  if(e.touches.length===1 && panning){
    const dx=(e.touches[0].clientX-panLast.x)/cam.z, dy=(e.touches[0].clientY-panLast.y)/cam.z;
    cam.x = panStartCam.x - dx; cam.y = panStartCam.y - dy;
  } else if(e.touches.length===2 && pinch){
    e.preventDefault();
    const d=dist(e.touches[0],e.touches[1]);
    const factor=d/pinch.d;
    const r=canvas.getBoundingClientRect();
    const sx=pinch.mid.x - r.left, sy=pinch.mid.y - r.top;
    const wx=sx/cam.z + cam.x, wy=sy/cam.z + cam.y;
    cam.z=Math.max(ZMIN,Math.min(ZMAX, pinch.z*factor));
    cam.x=wx - sx/cam.z; cam.y=wy - sy/cam.z;
  }
},{passive:false});
canvas.addEventListener('touchend', ()=>{ if(event.touches.length===0){panning=false; pinch=null;} }, {passive:true});
function dist(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

// ESC → Zeiger
window.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    tool='select';
    document.querySelectorAll('#toolbar .btn').forEach(x=>x.classList.toggle('active', x.dataset.tool==='select'));
    ghost.x=ghost.y=null;
  }
});

// ===== Bauen =====
function buildAtPointer(cx,cy){
  const r=canvas.getBoundingClientRect();
  const c=screenToCell(cx-r.left, cy-r.top);
  if(!c) return;
  const {x,y}=c;
  if(tool==='bulldoze'){
    if(x===HQ.x && y===HQ.y) return;
    grid[y][x].road=false; grid[y][x].building=null; grid[y][x].stock=0;
    return;
  }
  if(grid[y][x].ground==='water') return;
  if(tool==='road'){
    if(!grid[y][x].building) grid[y][x].road=true;
  }else if(tool==='lumber'){
    if(!grid[y][x].road && !grid[y][x].building) grid[y][x].building='lumber';
  }
}

// ===== Zeichnen =====
function drawAll(){
  ctx.save(); ctx.scale(cam.z,cam.z);
  // Boden
  for(let y=0;y<MAP.H;y++){
    for(let x=0;x<MAP.W;x++){
      const r=rectForTile(x,y);
      // Rhombus-Clip → keine Lücken; Textur mit 1px Bleed
      ctx.save();
      pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
      const img = (grid[y][x].ground==='water'?IM.water:(grid[y][x].ground==='shore'?IM.shore:IM.grass));
      if(img) ctx.drawImage(img, r.x-1, r.y-1, r.w+2, r.h+2);
      else { ctx.fillStyle='#223'; ctx.fillRect(r.x,r.y,r.w,r.h); }
      ctx.restore();

      // Raster zart
      ctx.strokeStyle='rgba(255,255,255,.03)'; ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }
  // Straßen simpel
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    if(!grid[y][x].road) continue;
    const r=rectForTile(x,y);
    ctx.save(); pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
    if(IM.road) ctx.drawImage(IM.road, r.x-1, r.y-1, r.w+2, r.h+2);
    else { ctx.fillStyle='#6b6f7a'; ctx.fillRect(r.x+r.w*0.18,r.y+r.h*0.36,r.w*0.64,r.h*0.28); }
    ctx.restore();
  }
  // Gebäude
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    const b=grid[y][x].building; if(!b) continue;
    const r=rectForTile(x,y);
    const img = b==='hq'?IM.hq: (b==='lumber'?IM.lumber:null);
    if(img){
      const w=r.w*1.05, h=img.height*(w/img.width);
      ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h-h + r.h*0.10, w, h);
    }else{
      ctx.fillStyle=b==='hq'?'#6a4':'#4aa45a';
      ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
    }
  }
  // Ghost
  if(ghost.x!=null && ghost.y!=null){
    const r=rectForTile(ghost.x,ghost.y);
    ctx.save(); pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
    ctx.globalAlpha=0.35;
    if(tool==='road'){
      ctx.fillStyle='#9aa0aa'; ctx.fillRect(r.x+r.w*0.18,r.y+r.h*0.36,r.w*0.64,r.h*0.28);
    }else if(tool==='lumber'){
      ctx.fillStyle='#4aa45a'; ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
    }
    ctx.restore();
  }

  ctx.restore();
  drawMini();
}

function pathDiamond(x,y,w,h){
  ctx.beginPath();
  ctx.moveTo(x + w*0.5, y);
  ctx.lineTo(x + w, y + h*0.5);
  ctx.lineTo(x + w*0.5, y + h);
  ctx.lineTo(x, y + h*0.5);
  ctx.closePath();
}

function drawMini(){
  const w=mini.width, h=mini.height, sx=w/MAP.W, sy=h/MAP.H;
  mctx.clearRect(0,0,w,h);
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    const g=grid[y][x].ground;
    mctx.fillStyle = g==='water' ? '#1a3a55' : (g==='shore' ? '#2c4d2c' : '#244a21');
    mctx.fillRect(x*sx,y*sy,sx,sy);
    if(grid[y][x].road){ mctx.fillStyle='#888'; mctx.fillRect(x*sx,y*sy,sx,sy); }
    if(grid[y][x].building==='hq'){ mctx.fillStyle='#6ee7a9'; mctx.fillRect(x*sx,y*sy,sx,sy); }
    if(grid[y][x].building==='lumber'){ mctx.fillStyle='#9ad17a'; mctx.fillRect(x*sx,y*sy,sx,sy); }
  }
}

// ===== Loop =====
let last=performance.now();
function loop(ts){
  const dt=Math.min(0.05,(ts-last)/1000); last=ts;
  // (Produktion/Träger später wieder dazu)
  drawAll();
  requestAnimationFrame(loop);
}

// ===== Resize / Boot =====
function resize(){
  const headerH=(document.querySelector('header')?.offsetHeight)||0;
  canvas.width=window.innerWidth; canvas.height=window.innerHeight-headerH;
  canvas.style.width=canvas.width+'px'; canvas.style.height=canvas.height+'px';
}
window.addEventListener('resize', ()=>{ resize(); drawAll(); });

Promise.all(toLoad.map(([k,s])=>load(k,s))).then(()=>{
  genWorld(); hud(); resize(); centerOn(HQ.x,HQ.y); cam.z=1.2;
  // Overlay-Buttons
  document.querySelector('[data-action="start"]').onclick=()=>{ document.getElementById('overlay').style.display='none'; };
  document.querySelector('[data-action="reset"]').onclick=()=>{ location.reload(); };
  requestAnimationFrame(loop);
});
