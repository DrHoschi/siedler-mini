// main.js — V13.7
import { Renderer } from './core/render.js';
import { Game } from './core/game.js';

const cv = document.getElementById('game');
const r = new Renderer(cv);
const game = new Game(r);

// ---- UI ----
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const resEls = {
  wood: $('#rWood'), stone: $('#rStone'), food: $('#rFood'), gold: $('#rGold'), carriers: $('#rCar'),
};
const zoomLbl = $('#zoomLbl');
const overlay = $('#overlayStart');

let tool='pointer'; // pointer|road|lumber|depot|hq|bulldoze
function setTool(t){
  tool=t;
  $$('#tools button').forEach(b=>b.classList.toggle('active', b.dataset.tool===t));
  $('#viewLbl').textContent = `Tool: ${t==='pointer'?'Zeiger':(t==='road'?'Straße':t)}`;
}
$$('#tools button').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));

$('#btnStart').onclick= async ()=>{
  overlay.style.display='none';
  await ensureInitAndStart();
};
$('#btnFs').onclick=()=>toggleFull();

$('#btnDebug').onclick=()=>{
  const on = document.body.classList.toggle('dbg');
  console.log('Debug', on);
};
$('#btnCenter').onclick=()=>{ game.centerCam(); };

$('#btnFull').onclick=()=>toggleFull();

function toggleFull(){
  if(document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(()=>{});
}

// ---- Init/Loop ----
let loopId=0;
async function ensureInitAndStart(){
  if(!game.world){ await game.init(); }
  game.start();
  cancelAnimationFrame(loopId);
  const step=()=>{ game.step(); drawHud(); zoomLbl.textContent=`Zoom ${r.cam.zoom.toFixed(2)}×`; loopId=requestAnimationFrame(step); };
  step();
}
function drawHud(){
  resEls.wood.textContent=game.resources.wood|0;
  resEls.stone.textContent=game.resources.stone|0;
  resEls.food.textContent=game.resources.food|0;
  resEls.gold.textContent=game.resources.gold|0;
  resEls.carriers.textContent=game.resources.carriers|0;
}

// ---- Input (Touch/Maus) ----
let dragging=false, lastX=0,lastY=0;
let pinch=false, lastDist=0, lastCenter=[0,0];

function screenToTile(px,py){
  const pt = r.cam.screenToWorld(px,py, cv.width, cv.height);
  return {x:Math.round(pt.x), y:Math.round(pt.y)};
}

cv.addEventListener('pointerdown', (e)=>{
  cv.setPointerCapture(e.pointerId);
  lastX=e.clientX; lastY=e.clientY; dragging=true;
  if(tool!=='pointer'){ /* kurzes Tippen baut */ }
});

cv.addEventListener('pointermove', (e)=>{
  if(!dragging) return;
  if(tool==='pointer'){
    const dx=(e.clientX-lastX)/(r.cam.tile*r.cam.zoom);
    const dy=(e.clientY-lastY)/(r.cam.tile*r.cam.zoom*0.5);
    // verschiebe Kamera in Iso‑System „gegenläufig“
    r.cam.x -= (dx - dy)*0.5;
    r.cam.y -= (dx + dy)*0.5;
    lastX=e.clientX; lastY=e.clientY;
  }
});

cv.addEventListener('pointerup', (e)=>{
  dragging=false; cv.releasePointerCapture(e.pointerId);
  if(tool!=='pointer'){
    // Bauen auf Tap
    const rect=cv.getBoundingClientRect();
    const px=e.clientX-rect.left, py=e.clientY-rect.top;
    const {x,y}=screenToTile(px,py);
    buildAt(tool,x,y);
  }
});

cv.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const dz = Math.sign(e.deltaY)*-0.1;
  r.cam.setZoom(r.cam.zoom*(1+dz));
}, {passive:false});

// Pinch (2‑Finger Zoom)
cv.addEventListener('touchstart', (ev)=>{
  if(ev.touches.length===2){
    pinch=true; const [a,b]=ev.touches;
    lastDist = Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY);
    lastCenter=[ (a.clientX+b.clientX)/2, (a.clientY+b.clientY)/2 ];
  }
},{passive:true});
cv.addEventListener('touchmove', (ev)=>{
  if(pinch && ev.touches.length===2){
    const [a,b]=ev.touches;
    const dist=Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY);
    const scale=dist/lastDist;
    r.cam.setZoom(r.cam.zoom*scale);
    lastDist=dist; lastCenter=[ (a.clientX+b.clientX)/2, (a.clientY+b.clientY)/2 ];
  }
},{passive:true});
cv.addEventListener('touchend', ()=>{ pinch=false; }, {passive:true});

// ---- Bauen / Abriss ----
function buildAt(kind,x,y){
  if(!game.canInBounds(x,y)) return;
  let ok=false;
  if(kind==='road') ok=game.build('road',x,y);
  else if(kind==='lumber') ok=game.build('lumber',x,y);
  else if(kind==='depot') ok=game.build('depot',x,y);
  else if(kind==='hq') ok=game.build('hq',x,y);
  else if(kind==='bulldoze') ok=game.build('bulldoze',x,y);
  if(ok) { r.attachBuildings(game.buildings); r.attachRoads(game.roads); }
}

// ---- Start sofort sicht-/testbar ----
addEventListener('DOMContentLoaded', ()=>{
  setTool('pointer');
  drawHud();
});

// Overlay Start via Doppeltipp Vollbild erlauben
document.addEventListener('dblclick', ()=>{
  if(overlay.style.display!=='none') toggleFull();
});

// Cache‑Bust‑Reload Tipp: ?v=13.7 an URL hängen, falls sich altes JS hält
