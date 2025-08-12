// main.js — V13.6 Mobile

import { loadAllAssets, IM } from './core/assets.js';
import {
  createWorld, updateWorld, drawWorldLayered,
  buildAt, setTool, TOOLS,
  screenToCell, startPos,
  resources, carriersCount
} from './core/world.js';
import { cam, setCanvasSize, setZoom, setCamCenter } from './core/camera.js';

// ---------- Canvas / Context ----------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });
let DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

function resize(){
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * DPR);
  canvas.height= Math.round(r.height* DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  setCanvasSize(r.width, r.height);
  requestDraw();
}
window.addEventListener('resize', resize, {passive:true});

// ---------- UI / HUD ----------
const ui = {
  wood: document.getElementById('uiWood'),
  stone:document.getElementById('uiStone'),
  food: document.getElementById('uiFood'),
  gold: document.getElementById('uiGold'),
  car:  document.getElementById('uiCar'),
  hint: document.getElementById('hint'),
};
function setHint(txt){ if(ui.hint) ui.hint.textContent = txt; }

// Tool-Buttons (linke Leiste)
const toolBtns = {
  pointer: document.getElementById('btnPointer'),
  road:    document.getElementById('btnRoad'),
  hq:      document.getElementById('btnHQ'),
  lumber:  document.getElementById('btnLumber'),
  depot:   document.getElementById('btnDepot'),
  bull:    document.getElementById('btnBull'),
};
function activateBtn(id){
  Object.values(toolBtns).forEach(b=> b && b.classList.remove('active'));
  if(toolBtns[id]) toolBtns[id].classList.add('active');
}
function pickTool(id, label){
  setTool(TOOLS[id.toUpperCase()]);
  activateBtn(id);
  setHint(label);
}
if(toolBtns.pointer) toolBtns.pointer.onclick = ()=> pickTool('pointer','Zeiger');
if(toolBtns.road)    toolBtns.road.onclick    = ()=> pickTool('road','Straße');
if(toolBtns.hq)      toolBtns.hq.onclick      = ()=> pickTool('hq','HQ');
if(toolBtns.lumber)  toolBtns.lumber.onclick  = ()=> pickTool('lumber','Holzfäller');
if(toolBtns.depot)   toolBtns.depot.onclick   = ()=> pickTool('depot','Depot');
if(toolBtns.bull)    toolBtns.bull.onclick    = ()=> pickTool('bull','Abriss');

activateBtn('pointer'); setHint('Zeiger');

// ---------- Eingabe: Touch / Maus ----------
let touches = new Map();
let lastMid=null, lastDist=0;
let tapTimer=0, tapPos=null, tapped=false;

function getMid(a,b){ return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }
function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

canvas.addEventListener('touchstart', (e)=>{
  for(const t of e.changedTouches){
    touches.set(t.identifier, {x:t.clientX, y:t.clientY});
  }
  if(touches.size===1){
    const t=[...touches.values()][0];
    tapTimer = performance.now();
    tapPos = {x:t.x, y:t.y};
    tapped = true;
  }else{
    tapped = false;
  }
},{passive:true});

canvas.addEventListener('touchmove', (e)=>{
  if(touches.size===0) return;
  e.preventDefault();

  // update positions
  for(const t of e.changedTouches){
    if(touches.has(t.identifier)) touches.set(t.identifier, {x:t.clientX, y:t.clientY});
  }
  const list=[...touches.values()];

  if(list.length===1){
    // 1-Finger: Pan
    const cur=list[0];
    if(lastMid){
      const dx=(cur.x-lastMid.x)/cam.z;
      const dy=(cur.y-lastMid.y)/cam.z;
      cam.x -= dx; cam.y -= dy;
      requestDraw();
    }
    lastMid = {x:cur.x,y:cur.y};
  }else if(list.length===2){
    // 2-Finger: Pinch + Pan
    const a=list[0], b=list[1];
    const mid=getMid(a,b);
    const d=dist(a,b);
    if(lastMid){
      // Pan
      cam.x -= (mid.x-lastMid.x)/cam.z;
      cam.y -= (mid.y-lastMid.y)/cam.z;
    }
    if(lastDist){
      const scale = d/lastDist;
      zoomToPoint(scale, mid.x, mid.y);
    }
    lastMid=mid; lastDist=d; requestDraw();
  }
},{passive:false});

canvas.addEventListener('touchend', (e)=>{
  // Tap zum Bauen (kurz & wenig Bewegung)
  if(tapped){
    const now=performance.now();
    const dt = now - tapTimer;
    const list=[...touches.values()];
    if(dt<250 && tapPos){
      const moved = list.length? Math.hypot(list[0].x-tapPos.x, list[0].y-tapPos.y):0;
      if(moved<12){
        tryBuildAt(tapPos.x, tapPos.y);
      }
    }
  }
  for(const t of e.changedTouches){ touches.delete(t.identifier); }
  if(touches.size<2){ lastDist=0; }
  if(touches.size===0){ lastMid=null; }
  tapped=false;
},{passive:true});

// Maus (für Desktop-Tests)
let mouseDown=false, lastMouse=null;
canvas.addEventListener('mousedown', (e)=>{
  mouseDown=true; lastMouse={x:e.clientX,y:e.clientY};
  // linker Klick baut (wenn Tool != Zeiger)
  if(e.button===0) tryBuildAt(e.clientX, e.clientY);
});
window.addEventListener('mousemove', (e)=>{
  if(!mouseDown||!lastMouse) return;
  if(e.buttons&1){
    cam.x -= (e.clientX-lastMouse.x)/cam.z;
    cam.y -= (e.clientY-lastMouse.y)/cam.z;
    lastMouse={x:e.clientX,y:e.clientY}; requestDraw();
  }
});
window.addEventListener('mouseup', ()=>{ mouseDown=false; lastMouse=null; });

canvas.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const scale = e.deltaY>0 ? 0.9 : 1.1;
  zoomToPoint(scale, e.clientX, e.clientY);
  requestDraw();
},{passive:false});

function zoomToPoint(scale, sx, sy){
  const prevZ = cam.z;
  const nz = Math.max(0.6, Math.min(3.0, cam.z * scale));
  const rect = canvas.getBoundingClientRect();
  const wx = cam.x + (sx-rect.left)/prevZ;
  const wy = cam.y + (sy-rect.top)/prevZ;
  cam.z = nz;
  cam.x = wx - (sx-rect.left)/cam.z;
  cam.y = wy - (sy-rect.top)/cam.z;
}

// Bauen-Helfer
function tryBuildAt(sx,sy){
  // Nur bauen, wenn nicht im Zeiger-Modus
  if(ui.hint && ui.hint.textContent==='Zeiger') return;
  const rect = canvas.getBoundingClientRect();
  const cell = screenToCell((sx-rect.left), (sy-rect.top));
  if(!cell) return;
  if(buildAt(cell.x, cell.y)) requestDraw();
}

// ---------- Draw Loop ----------
let needsDraw=true; function requestDraw(){ needsDraw=true; }
let last=0;

function drawFrame(){
  if(needsDraw){
    // Update
    const now=performance.now();
    const dt = Math.min(0.05, (now-last)/1000 || 0); last=now;
    updateWorld(dt);

    // Clear
    ctx.fillStyle='#0e1116'; ctx.fillRect(0,0,canvas.width,canvas.height);

    // Welt
    drawWorldLayered(ctx, {x:cam.x, y:cam.y, z:cam.z, width:canvas.width/DPR, height:canvas.height/DPR});

    // HUD Werte
    if(ui.wood)  ui.wood.textContent  = Math.floor(resources.wood);
    if(ui.stone) ui.stone.textContent = Math.floor(resources.stone);
    if(ui.food)  ui.food.textContent  = Math.floor(resources.food);
    if(ui.gold)  ui.gold.textContent  = Math.floor(resources.gold);
    if(ui.car)   ui.car.textContent   = carriersCount();

    needsDraw=false;
  }
  requestAnimationFrame(drawFrame);
}

// ---------- Boot ----------
(async function boot(){
  resize();
  await loadAllAssets();
  createWorld(96, 96);

  // Kamera zur Startposition (Mitte HQ)
  const p = startPos;
  // leichte Schräge, damit man was sieht
  setCamCenter( (p.x - p.y) * (64/2), (p.x + p.y) * (32/2) );
  setZoom(1.0);

  // Start-Tool = Zeiger
  pickTool('pointer','Zeiger');

  requestDraw();
  requestAnimationFrame(drawFrame);
})();

// Optional: Sichtbare Version unten rechts (klein)
(function versionBadge(){
  const el=document.getElementById('ver');
  if(!el) return; el.textContent='JS V13.6';
})();
