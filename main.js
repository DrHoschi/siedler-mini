// main.js — V13 Mobile Full

import { loadAllAssets } from './core/assets.js';
import { cam, setCanvasSize, setZoom, setCamCenter } from './core/camera.js';
import {
  createWorld, updateWorld, getRenderData, // Daten fürs Rendern
  buildAt, setTool, TOOLS, screenToCell,
  startPos, resources, carriersCount
} from './core/world.js';
import { drawWorldLayered } from './core/render.js';

// ---------- Canvas ----------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true, willReadFrequently:false });
let DPR = Math.max(1, Math.min(window.devicePixelRatio||1, 2));

function resize(){
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * DPR);
  canvas.height= Math.round(r.height* DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  setCanvasSize(r.width, r.height);
  requestDraw();
}
addEventListener('resize', resize, {passive:true});

// ---------- HUD ----------
const ui = {
  wood: document.getElementById('uiWood'),
  stone:document.getElementById('uiStone'),
  food: document.getElementById('uiFood'),
  gold: document.getElementById('uiGold'),
  car:  document.getElementById('uiCar'),
  hint: document.getElementById('hint'),
};
function setHint(t){ if(ui.hint) ui.hint.textContent=t; }

// Tools
const toolBtns = {
  pointer: document.getElementById('btnPointer'),
  road:    document.getElementById('btnRoad'),
  hq:      document.getElementById('btnHQ'),
  lumber:  document.getElementById('btnLumber'),
  depot:   document.getElementById('btnDepot'),
  bull:    document.getElementById('btnBull'),
};
function activateBtn(id){
  Object.values(toolBtns).forEach(b=> b&&b.classList.remove('active'));
  if(toolBtns[id]) toolBtns[id].classList.add('active');
}
function pickTool(id,label){
  setTool(TOOLS[id.toUpperCase()]);
  activateBtn(id); setHint(label);
}
toolBtns.pointer.onclick=()=>pickTool('pointer','Zeiger');
toolBtns.road.onclick   =()=>pickTool('road','Straße');
toolBtns.hq.onclick     =()=>pickTool('hq','HQ');
toolBtns.lumber.onclick =()=>pickTool('lumber','Holzfäller');
toolBtns.depot.onclick  =()=>pickTool('depot','Depot');
toolBtns.bull.onclick   =()=>pickTool('bull','Abriss');
activateBtn('pointer'); setHint('Zeiger');

// ---------- Touch & Maus ----------
let touches=new Map(), lastMid=null, lastDist=0;
let tapped=false, tapT=0, tapPos=null;

const rectOf = ()=> canvas.getBoundingClientRect();
const mid = (a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

canvas.addEventListener('touchstart', (e)=>{
  for(const t of e.changedTouches) touches.set(t.identifier,{x:t.clientX,y:t.clientY});
  if(touches.size===1){ const t=[...touches.values()][0]; tapped=true; tapT=performance.now(); tapPos={x:t.x,y:t.y}; }
},{passive:true});
canvas.addEventListener('touchmove', (e)=>{
  if(!touches.size) return; e.preventDefault();
  for(const t of e.changedTouches) if(touches.has(t.identifier)) touches.set(t.identifier,{x:t.clientX,y:t.clientY});
  const list=[...touches.values()];
  if(list.length===1){
    const cur=list[0]; if(lastMid){ cam.x-=(cur.x-lastMid.x)/cam.z; cam.y-=(cur.y-lastMid.y)/cam.z; requestDraw(); }
    lastMid={x:cur.x,y:cur.y};
  }else if(list.length===2){
    const a=list[0], b=list[1]; const m=mid(a,b); const d=dist(a,b);
    if(lastMid){ cam.x-=(m.x-lastMid.x)/cam.z; cam.y-=(m.y-lastMid.y)/cam.z; }
    if(lastDist){ const s=d/lastDist; zoomToPoint(s,m.x,m.y); }
    lastMid=m; lastDist=d; requestDraw();
  }
},{passive:false});
canvas.addEventListener('touchend', (e)=>{
  if(tapped){
    const dt=performance.now()-tapT; if(dt<250 && tapPos){
      const r=rectOf();
      tryBuildAt(tapPos.x-r.left, tapPos.y-r.top);
    }
  }
  for(const t of e.changedTouches) touches.delete(t.identifier);
  if(touches.size<2) lastDist=0;
  if(!touches.size) lastMid=null;
  tapped=false;
},{passive:true});

// Maus (zum Testen)
let dragging=false, lastM=null;
canvas.addEventListener('mousedown', e=>{ dragging=true; lastM={x:e.clientX,y:e.clientY}; if(e.button===0){ const r=rectOf(); tryBuildAt(e.clientX-r.left, e.clientY-r.top);} });
addEventListener('mousemove', e=>{ if(!dragging||!lastM) return; cam.x-=(e.clientX-lastM.x)/cam.z; cam.y-=(e.clientY-lastM.y)/cam.z; lastM={x:e.clientX,y:e.clientY}; requestDraw(); });
addEventListener('mouseup', ()=>{ dragging=false; lastM=null; });
canvas.addEventListener('wheel', e=>{ e.preventDefault(); const s=e.deltaY>0?0.9:1.1; zoomToPoint(s,e.clientX,e.clientY); requestDraw(); }, {passive:false});

function zoomToPoint(scale, sx, sy){
  const prev=cam.z, nz=Math.max(0.6,Math.min(3,prev*scale));
  const r=rectOf(); const wx=cam.x+(sx-r.left)/prev; const wy=cam.y+(sy-r.top)/prev;
  cam.z=nz; cam.x=wx-(sx-r.left)/nz; cam.y=wy-(sy-r.top)/nz;
}

function tryBuildAt(sx,sy){
  // nur bauen, wenn NICHT Zeiger
  if(ui.hint && ui.hint.textContent==='Zeiger') return;
  const c=screenToCell(sx,sy); if(!c) return;
  if(buildAt(c.x,c.y)) requestDraw();
}

// ---------- Loop ----------
let needsDraw=true; function requestDraw(){ needsDraw=true; }
let last=0;
function frame(){
  if(needsDraw){
    const now=performance.now(); const dt=Math.min(0.05, (now-last)/1000 || 0); last=now;
    updateWorld(dt);

    // Clear vollflächig (verhindert „schwarze Ecke“)
    ctx.fillStyle='#0d1a12'; ctx.fillRect(0,0,canvas.width,canvas.height);

    // Render
    drawWorldLayered(ctx, cam, getRenderData(), {screenW:canvas.width/DPR, screenH:canvas.height/DPR});

    // HUD
    ui.wood.textContent = Math.floor(resources.wood);
    ui.stone.textContent= Math.floor(resources.stone);
    ui.food.textContent = Math.floor(resources.food);
    ui.gold.textContent = Math.floor(resources.gold);
    ui.car.textContent  = carriersCount();

    needsDraw=false;
  }
  requestAnimationFrame(frame);
}

// ---------- Boot ----------
window.addEventListener('game-start', ()=>{ requestDraw(); }); // Overlay schließt – dann läuft’s
(async function boot(){
  resize();
  await loadAllAssets();
  createWorld(96,96); // feste Kartengröße

  // Kamera Mitte (zum HQ)
  const p=startPos; setCamCenter( (p.x - p.y) * 48, (p.x + p.y) * 24 ); setZoom(1.0);

  pickTool('pointer','Zeiger');
  requestDraw(); requestAnimationFrame(frame);
})();
