/* main.js – Siedler Mini V12.4.1
   - Iso-Renderer mit exakter Klick-Zuordnung (inverse Iso + Rhombus-Test)
   - Zoom zum Maus-/Pinch-Mittelpunkt, sauberes Canvas-Clear
   - Panning (Zeiger: Linksdrag; immer: Rechts/Mitte; Touch: 1 Finger)
   - Tap-to-Build (Touch) im Bau-Tool
   - Ghost-Vorschau im Bau-Tool
   - Straßen-Autotiling (Basis)
   - Produktion Holzfäller → Jobs, Träger mit Mehrfachladung & Priorität, bleiben am Ziel
   - Ressourcen-HUD + Kostenprüfung
   - Save/Load via localStorage (+ Neues Spiel optional)
*/

'use strict';

// ===== Canvas/CTX =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha:false });
const mini = document.getElementById('miniMap');
const mctx = mini.getContext('2d');

// ===== Size / Resize =====
function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', ()=>{ resize(); drawAll(); });
resize();

// ===== Kamera / Zoom =====
const ZMIN=0.5, ZMAX=2.5;
let cam = { x:0, y:0, z:1.2 };

// ===== Iso =====
const TILE_W = 96;
const TILE_H = 54;
function cellToIso(x,y){ return { x:(x - y)*(TILE_W/2), y:(x + y)*(TILE_H/2) }; }
function rectForTile(x,y){ const p=cellToIso(x,y); return { x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H }; }

// ===== Welt =====
const MAP = { W:44, H:32 };
const grid = Array.from({length:MAP.H},()=>Array.from({length:MAP.W},()=>({
  ground:'grass', road:false, roadMask:0, building:null, node:null, stock:0
})));

let HQ = { x:(MAP.W/2)|0, y:(MAP.H/2)|0 };
grid[HQ.y][HQ.x].building='hq';

// ===== Assets =====
const IM={};
function load(key,src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>{IM[key]=i;r();}; i.onerror=()=>{IM[key]=null; console.warn('[assets]',src,'fehlte'); r();}; i.src=src; }); }
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

// ===== Ressourcen & Kosten =====
const res = { wood:20, stone:10, food:10, gold:0, pop:3 };
const costs = {
  road:       { wood:1 },
  hq:         { wood:0, stone:0 },
  lumberjack: { wood:5 },
  depot:      { wood:8, stone:2 }
};
function canPay(cost){ for(const k in cost){ if((res[k]||0) < cost[k]) return false; } return true; }
function pay(cost){ for(const k in cost){ res[k]-=cost[k]||0; } hud(); }
function hud(){ ['wood','stone','food','gold','pop'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=Math.floor(res[id]); }); }

// ===== Werkzeuge =====
let currentTool='pointer';
let ghost = {x:null,y:null};
function bindToolbar(){
  const set=(t)=>{ currentTool=t; ghost.x=ghost.y=null; };
  document.getElementById('selectTool')?.addEventListener('click', ()=>set('pointer'));
  document.getElementById('buildRoad')?.addEventListener('click', ()=>set('road'));
  document.getElementById('buildHQ')?.addEventListener('click', ()=>set('hq'));
  document.getElementById('buildLumberjack')?.addEventListener('click', ()=>set('lumberjack'));
  document.getElementById('buildDepot')?.addEventListener('click', ()=>set('depot'));
  document.getElementById('newGameBtn')?.addEventListener('click', newGame);
  window.addEventListener('keydown', e=>{ if(e.key==='Escape') set('pointer'); });
}

// ===== Welt generieren =====
function genWorld(){
  // See
  for(let y=18;y<28;y++) for(let x=3;x<14;x++) grid[y][x].ground='water';
  // Ufer
  const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let y=1;y<MAP.H-1;y++)for(let x=1;x<MAP.W-1;x++){
    if(grid[y][x].ground==='water') continue;
    const near=N8.some(([dx,dy])=> grid[y+dy]?.[x+dx]?.ground==='water');
    if(near) grid[y][x].ground='shore';
  }
  // Waldknoten
  function blob(cx,cy,r){ for(let y=Math.max(1,cy-r);y<=Math.min(MAP.H-2,cy+r);y++)for(let x=Math.max(1,cx-r);x<=Math.min(MAP.W-2,cx+r);x++){ const dx=x-cx,dy=y-cy; if(dx*dx+dy*dy<=r*r && grid[y][x].ground==='grass') grid[y][x].node='forest'; } }
  blob(22,12,3); blob(28,8,2); blob(34,18,4);
}

// ===== Straßen-Autotiling =====
function computeRoadMasks(){
  const dirs = [[0,-1],[1,0],[0,1],[-1,0]]; // N,E,S,W
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    if(!grid[y][x].road){ grid[y][x].roadMask=0; continue; }
    let m=0;
    dirs.forEach(([dx,dy],i)=>{ const nx=x+dx, ny=y+dy; if(grid[ny]?.[nx]?.road) m|=(1<<i); });
    grid[y][x].roadMask=m;
  }
}
function pickRoadTexture(mask){
  const opp = (mask===0b0101 || mask===0b1010); // N+S oder E+W
  if(opp) return IM.road_straight||IM.road_curve;
  return IM.road_curve||IM.road_straight;       // Fallback
}

// ===== Klickumrechnung (exakt) =====
function screenToCell(sx, sy){
  const wx = sx/cam.z + cam.x, wy = sy/cam.z + cam.y;
  const fx = (wy/(TILE_H/2) + wx/(TILE_W/2))/2;
  const fy = (wy/(TILE_H/2) - wx/(TILE_W/2))/2;
  let x=Math.floor(fx), y=Math.floor(fy);
  if(x<0||y<0||x>=MAP.W||y>=MAP.H) return null;
  const cx=(x-y)*(TILE_W/2), cy=(x+y)*(TILE_H/2);
  const dx=(wx-cx)/(TILE_W/2)-0.5, dy=(wy-cy)/(TILE_H/2)-0.5;
  if(Math.abs(dx)+Math.abs(dy)>0.5){
    if(dy>Math.abs(dx)) y++; else if(-dy>Math.abs(dx)) y--;
    else if(dx>0) x++; else x--;
    if(x<0||y<0||x>=MAP.W||y>=MAP.H) return null;
  }
  return {x,y};
}
function centerOn(x,y){
  const r=rectForTile(x,y);
  cam.x = r.x + r.w/2 - (canvas.width/cam.z)/2;
  cam.y = r.y + r.h/2 - (canvas.height/cam.z)/2;
}

// ===== Produktion & Träger =====
const JOBS=[];         // {x,y,type:'wood', qty}
const CARRIERS=[];     // {x,y,px,py,path:[],cap,maxCap,load:{},speed,state}
const PRIORITY=['food','wood','stone','gold'];

function spawnCarrier(x,y){
  CARRIERS.push({ x, y, px:x, py:y, path:[], cap:0, maxCap:3, load:{}, speed:3.0, state:'idle' });
}

const prodTimers = {}; // "x,y" -> t
function tickProduction(dt){
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    if(grid[y][x].building!=='lumber') continue;
    const key=x+','+y;
    prodTimers[key]=(prodTimers[key]||0)+dt;
    const EVERY=6;
    if(prodTimers[key] >= EVERY){
      prodTimers[key]-=EVERY;
      // braucht angrenzend forest
      const N4=[[1,0],[-1,0],[0,1],[0,-1]];
      const hasForest = N4.some(([dx,dy])=> grid[y+dy]?.[x+dx]?.node==='forest');
      if(hasForest) JOBS.push({x,y,type:'wood',qty:1});
    }
  }
}

// Wegfindung über Straßen/Buildings
function passable(x,y){
  if(x<0||y<0||x>=MAP.W||y>=MAP.H) return false;
  if(grid[y][x].road) return true;
  if(grid[y][x].building) return true;
  return false;
}
function neighbors(x,y){ return [{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}].filter(p=>passable(p.x,p.y)); }

function bfsPath(sx,sy, tx,ty){
  const q=[{x:sx,y:sy}], prev=new Map(); const key=(x,y)=>x+','+y;
  const seen=new Set([key(sx,sy)]);
  while(q.length){
    const p=q.shift();
    if(p.x===tx && p.y===ty) break;
    neighbors(p.x,p.y).forEach(n=>{
      const k=key(n.x,n.y); if(seen.has(k)) return;
      seen.add(k); prev.set(k,p); q.push(n);
    });
  }
  const endKey=key(tx,ty); if(!prev.has(endKey) && !(sx===tx&&sy===ty)) return null;
  const path=[]; let cur={x:tx,y:ty};
  while(!(cur.x===sx && cur.y===sy)){ path.push(cur); cur=prev.get(key(cur.x,cur.y)); if(!cur) return null; }
  path.reverse(); return path;
}

function nearestStorage(x,y){
  let best=null, bestD=1e9;
  for(let yy=0; yy<MAP.H; yy++) for(let xx=0; xx<MAP.W; xx++){
    const b=grid[yy][xx].building;
    if(b==='hq' || b==='depot'){
      const d=Math.abs(xx-x)+Math.abs(yy-y);
      if(d<bestD){ bestD=d; best={x:xx,y:yy}; }
    }
  }
  return best;
}

function onArrive(c){
  if(c.state==='toPickup'){
    const j=JOBS[c.jobIndex];
    if(!j){ c.state='idle'; return; }
    const room=c.maxCap - c.cap;
    const take=Math.max(0, Math.min(room, j.qty));
    if(take>0){
      c.cap += take;
      c.load[j.type]=(c.load[j.type]||0)+take;
      j.qty-=take;
      if(j.qty<=0) JOBS.splice(c.jobIndex,1);
    }
    const st=nearestStorage(c.x,c.y) || {x:HQ.x,y:HQ.y};
    const path=bfsPath(c.x,c.y, st.x, st.y);
    if(path){ c.state='toStore'; c.path=path; } else { c.state='idle'; }
  }else if(c.state==='toStore'){
    // abladen
    for(const k in c.load){ res[k]=(res[k]||0) + c.load[k]; c.cap-=c.load[k]; c.load[k]=0; }
    hud();
    c.state='idle'; // bleibt wo er ist
  }
}

function tickCarriers(dt){
  CARRIERS.forEach(c=>{
    if(c.path && c.path.length){
      const next=c.path[0];
      const speed=c.speed*dt;
      // einfache gleitende Bewegung
      if(Math.abs(c.px-next.x) > 0.001) c.px += Math.sign(next.x - c.px)*speed;
      if(Math.abs(c.py-next.y) > 0.001) c.py += Math.sign(next.y - c.py)*speed;
      if(Math.abs(c.px-next.x)<0.05 && Math.abs(c.py-next.y)<0.05){
        c.px=next.x; c.py=next.y; c.x=next.x; c.y=next.y; c.path.shift();
        if(c.path.length===0) onArrive(c);
      }
      return;
    }
    if(c.state==='idle'){
      // Job mit Priorität & Distanz
      let best=null, bestP=99, bestD=1e9, bestIdx=-1;
      for(let i=0;i<JOBS.length;i++){
        const j=JOBS[i];
        const pr = Math.max(0, PRIORITY.indexOf(j.type)); // kleiner besser
        const d = Math.abs(j.x-c.x)+Math.abs(j.y-c.y);
        if(pr<bestP || (pr===bestP && d<bestD)){ bestP=pr; bestD=d; best=j; bestIdx=i; }
      }
      if(best){
        const path=bfsPath(c.x,c.y, best.x, best.y);
        if(path){ c.state='toPickup'; c.target=best; c.jobIndex=bestIdx; c.path=path; }
      }
    }
  });
}

// ===== Interaktion: Pan/Zoom/Bauen =====
let panning=false, panStart={x:0,y:0}, camStart={x:0,y:0};

// Maus
canvas.addEventListener('mousedown', e=>{
  const rect=canvas.getBoundingClientRect();
  if(currentTool==='pointer' || e.button!==0){
    panning=true; panStart={x:e.clientX,y:e.clientY}; camStart={...cam};
    canvas.setPointerCapture?.(e.pointerId||0);
  }else{
    buildAt(e.clientX-rect.left, e.clientY-rect.top);
  }
});
canvas.addEventListener('mousemove', e=>{
  const rect=canvas.getBoundingClientRect();
  if(panning){
    const dx=(e.clientX-panStart.x)/cam.z, dy=(e.clientY-panStart.y)/cam.z;
    cam.x = camStart.x - dx; cam.y = camStart.y - dy;
  }else{
    if(currentTool!=='pointer'){
      const cell=screenToCell(e.clientX-rect.left, e.clientY-rect.top);
      if(cell){ ghost.x=cell.x; ghost.y=cell.y; } else { ghost.x=ghost.y=null; }
    }else ghost.x=ghost.y=null;
  }
});
window.addEventListener('mouseup', ()=>{ panning=false; });
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// Wheel-Zoom (zum Mauspunkt)
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const rect=canvas.getBoundingClientRect();
  const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
  const wx=sx/cam.z + cam.x, wy=sy/cam.z + cam.y;
  cam.z=Math.max(ZMIN,Math.min(ZMAX, cam.z*(e.deltaY>0?0.9:1.1)));
  cam.x=wx - sx/cam.z; cam.y=wy - sy/cam.z;
},{passive:false});

// Touch – Tap-to-Build, Pan, Pinch
let pinch = null;
let tapStart = null;      // {x,y,t}
let tapMoved = false;

canvas.addEventListener('touchstart', (e)=>{
  if (e.touches.length===1){
    const t = e.touches[0];
    tapStart = { x:t.clientX, y:t.clientY, t:performance.now() };
    tapMoved = false;

    if (currentTool==='pointer'){
      panning = true;
      panStart = { x:t.clientX, y:t.clientY };
      camStart = { ...cam };
    }
  } else if (e.touches.length===2){
    const a=e.touches[0], b=e.touches[1];
    pinch = {
      d: Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY),
      z: cam.z,
      mid:{ x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 }
    };
  }
}, {passive:true});

canvas.addEventListener('touchmove', (e)=>{
  if (e.touches.length===1){
    const t = e.touches[0];
    if (tapStart){
      const dx=t.clientX - tapStart.x, dy=t.clientY - tapStart.y;
      if (Math.hypot(dx,dy) > 8) tapMoved = true;
    }
    if (panning && currentTool==='pointer'){
      const dx=(t.clientX-panStart.x)/cam.z, dy=(t.clientY-panStart.y)/cam.z;
      cam.x = camStart.x - dx; cam.y = camStart.y - dy;
    }
    // Ghost für Touch im Bau-Tool
    if (!panning && currentTool!=='pointer'){
      const r=canvas.getBoundingClientRect();
      const cell=screenToCell(t.clientX-r.left, t.clientY-r.top);
      if(cell){ ghost.x=cell.x; ghost.y=cell.y; } else { ghost.x=ghost.y=null; }
    }
  } else if (e.touches.length===2 && pinch){
    e.preventDefault();
    const a=e.touches[0], b=e.touches[1];
    const factor = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY) / pinch.d;
    const rect=canvas.getBoundingClientRect();
    const sx=pinch.mid.x-rect.left, sy=pinch.mid.y-rect.top;
    const wx=sx/cam.z + cam.x, wy=sy/cam.z + cam.y;
    cam.z = Math.max(ZMIN, Math.min(ZMAX, pinch.z * factor));
    cam.x = wx - sx/cam.z; cam.y = wy - sy/cam.z;
  }
}, {passive:false});

canvas.addEventListener('touchend', (e)=>{
  if (e.touches.length===0) { pinch=null; panning=false; }
  // kurzer Tap → bauen
  if (tapStart && !tapMoved && currentTool!=='pointer'){
    const dt = performance.now() - tapStart.t;
    if (dt < 400){
      const rect=canvas.getBoundingClientRect();
      buildAt(tapStart.x-rect.left, tapStart.y-rect.top);
    }
  }
  tapStart = null;
}, {passive:true});

// ===== Bauen / Abriss =====
function buildAt(sx,sy){
  const c=screenToCell(sx,sy); if(!c) return;
  const {x,y}=c;
  if(grid[y][x].ground==='water') return;

  if(currentTool==='road'){
    if(!canPay(costs.road)) return;
    if(!grid[y][x].building){ grid[y][x].road=true; computeRoadMasks(); pay(costs.road); }
  }else if(currentTool==='hq'){
    if(!canPay(costs.hq)) return;
    grid[HQ.y][HQ.x].building=null; HQ={x,y}; grid[y][x].building='hq'; pay(costs.hq);
    if(!CARRIERS.length) spawnCarrier(x,y); // Starter-Träger
  }else if(currentTool==='lumberjack'){
    if(!canPay(costs.lumberjack)) return;
    if(!grid[y][x].road && !grid[y][x].building){ grid[y][x].building='lumber'; pay(costs.lumberjack); }
  }else if(currentTool==='depot'){
    if(!canPay(costs.depot)) return;
    if(!grid[y][x].road && !grid[y][x].building){ grid[y][x].building='depot'; pay(costs.depot); }
  }
  ghost.x=ghost.y=null;
}

// ===== Zeichnen =====
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
      const img= grid[y][x].ground==='water'?IM.water : grid[y][x].ground==='shore'?IM.shore : IM.grass;
      if(img) ctx.drawImage(img, r.x-1, r.y-1, r.w+2, r.h+2); else { ctx.fillStyle='#223'; ctx.fillRect(r.x,r.y,r.w,r.h); }
      ctx.restore();
      ctx.strokeStyle='rgba(255,255,255,.03)'; ctx.strokeRect(r.x,r.y,r.w,r.h);
    }
  }
}
function drawRoads(){
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    if(!grid[y][x].road) continue;
    const r=rectForTile(x,y);
    const tex=pickRoadTexture(grid[y][x].roadMask);
    ctx.save(); pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
    if(tex) ctx.drawImage(tex, r.x-1, r.y-1, r.w+2, r.h+2);
    else { ctx.fillStyle='#6b6f7a'; ctx.fillRect(r.x+r.w*.18, r.y+r.h*.36, r.w*.64, r.h*.28); }
    ctx.restore();
  }
}
function drawBuildings(){
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    const b=grid[y][x].building; if(!b) continue;
    const r=rectForTile(x,y);
    let img = b==='hq'?IM.hq : b==='lumber'?IM.lumber : b==='depot'?IM.depot : null;
    if(img){
      const w=r.w*1.05, h=img.height*(w/img.width);
      ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h - h + r.h*0.10, w, h);
    }else{
      ctx.fillStyle=b==='hq'?'#6a4':(b==='depot'?'#bfa':'#4aa45a');
      ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
    }
  }
}
function drawGhost(){
  if(ghost.x==null) return;
  const r=rectForTile(ghost.x,ghost.y);
  ctx.save(); pathDiamond(r.x,r.y,r.w,r.h); ctx.clip();
  ctx.globalAlpha=0.35;
  if(currentTool==='road'){
    ctx.fillStyle='#9aa0aa'; ctx.fillRect(r.x+r.w*.18, r.y+r.h*.36, r.w*.64, r.h*.28);
  }else{
    ctx.fillStyle='#7db3ff'; ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
  }
  ctx.restore(); ctx.globalAlpha=1;
}
function drawCarriers(){
  CARRIERS.forEach(c=>{
    const r=rectForTile(c.px, c.py);
    ctx.fillStyle='#f0c674';
    ctx.beginPath(); ctx.ellipse(r.x+r.w*0.5, r.y+r.h*0.55, 6, 8, 0, 0, Math.PI*2); ctx.fill();
    const n=c.cap|0;
    for(let i=0;i<n;i++){ ctx.fillStyle='#8a5'; ctx.fillRect(r.x+r.w*0.35+i*6, r.y+r.h*0.40, 5,4); }
  });
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
    if(grid[y][x].building==='depot'){ mctx.fillStyle='#d9c28f'; mctx.fillRect(x*sx,y*sy,sx,sy); }
  }
  CARRIERS.forEach(c=>{
    const sx_=c.x*sx+sx*0.5, sy_=c.y*sy+sy*0.5;
    mctx.fillStyle='#fff'; mctx.fillRect(sx_,sy_,2,2);
  });
}

// Alles zeichnen (sauberes Clear)
function drawAll(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled = true;

  ctx.save();
  ctx.scale(cam.z, cam.z);
  ctx.fillStyle='#0b0e13';
  ctx.fillRect(0,0, canvas.width/cam.z, canvas.height/cam.z);

  drawGround();
  computeRoadMasks();
  drawRoads();
  drawBuildings();
  drawGhost();
  drawCarriers();

  ctx.restore();
  drawMini();
}

// ===== Loop & Zeit =====
let last=performance.now();
function loop(ts){
  const dt=Math.min(0.05,(ts-last)/1000); last=ts;
  tickProduction(dt);
  tickCarriers(dt);
  drawAll();
  requestAnimationFrame(loop);
}

// ===== Save/Load =====
const SAVE_KEY='siedler_v1241';
function save(){
  const data={
    res, cam,
    grid: grid.map(row=>row.map(c=>({ g:c.ground, r:c.road, m:c.roadMask, b:c.building, n:c.node, s:c.stock }))),
    HQ,
    carriers: CARRIERS.map(c=>({x:c.x,y:c.y,px:c.px,py:c.py,cap:c.cap,load:c.load})),
    jobs: JOBS
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
function load(){
  const s=localStorage.getItem(SAVE_KEY); if(!s) return false;
  try{
    const d=JSON.parse(s);
    if(d.grid){
      for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
        const c=d.grid[y][x]; const g=grid[y][x];
        g.ground=c.g; g.road=c.r; g.roadMask=c.m||0; g.building=c.b; g.node=c.n; g.stock=c.s||0;
      }
    }
    if(d.res) Object.assign(res, d.res);
    if(d.cam) Object.assign(cam, d.cam);
    if(d.HQ) HQ=d.HQ;
    CARRIERS.length=0; (d.carriers||[]).forEach(k=> CARRIERS.push({ x:k.x,y:k.y,px:k.px,py:k.py, path:[], cap:k.cap||0, maxCap:3, load:k.load||{}, speed:3, state:'idle' }));
    JOBS.length=0; (d.jobs||[]).forEach(j=>JOBS.push(j));
    return true;
  }catch(e){ console.warn('Load fail',e); return false; }
}
function newGame(){
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

// ===== Start/Boot =====
function startGame(){
  document.getElementById('startScreen')?.style.setProperty('display','none');
}
window.startGame = startGame;

Promise.all(toLoad.map(([k,s])=>load(k,s))).then(()=>{
  if(!load()){ genWorld(); centerOn(HQ.x,HQ.y); spawnCarrier(HQ.x,HQ.y); }
  bindToolbar(); hud();
  drawAll();
  requestAnimationFrame(loop);
  setInterval(save, 5000);
});
