// main.js (V14)
import { loadAllAssets } from './core/assets.js';
import { Camera } from './core/camera.js';
import { installMobileInput, installMouseInput } from './core/input.js';
import { Renderer } from './render.js';
import { World } from './game.js';

const qs = s=>document.querySelector(s);
const cv = qs('#stage');
const cx = cv.getContext('2d');
const ui = {
  overlay: qs('#overlay'),
  btnStart: qs('#btnStart'),
  btnOverFull: qs('#btnOverlayFull'),
  btnFull: qs('#btnFull'),
  btnCenter: qs('#btnCenter'),
  btnDebug: qs('#btnDebug'),
  r: {
    wood: qs('#rWood'), stone: qs('#rStone'), food: qs('#rFood'), gold: qs('#rGold'), car: qs('#rCar')
  },
  toolName: qs('#toolName'),
  tools: [...document.querySelectorAll('#leftTools .btn')],
};

let world, camera, renderer;
let activeTool = 'pointer';
let running = false;
let debug = false;

function resize(){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
  cv.width = Math.floor(cv.clientWidth * dpr);
  cv.height= Math.floor(cv.clientHeight* dpr);
  cx.setTransform(1,0,0,1,0,0);
  cx.scale(1,1);
  camera.setViewport(cv.width, cv.height);
}
window.addEventListener('resize', resize);

function setTool(t){
  activeTool = t;
  ui.toolName.textContent = ({
    pointer:'Zeiger', road:'Straße', hq:'HQ', lumberjack:'Holzfäller', depot:'Depot', bulldoze:'Abriss'
  })[t] || t;
}
ui.tools.forEach(b=> b.addEventListener('click', ()=> setTool(b.dataset.tool)));

ui.btnCenter.addEventListener('click', ()=>{
  // auf HQ zentrieren
  const hq = world.buildings.find(b=>b.type==='hq');
  const wpos = renderer.isoToWorld(hq.i, hq.j);
  camera.centerOn(wpos.x, wpos.y-8);
});
ui.btnDebug.addEventListener('click', ()=> debug=!debug);

function toggleFullscreen(){
  const el = document.documentElement;
  if(!document.fullscreenElement){
    el.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}
ui.btnFull.addEventListener('click', toggleFullscreen);
ui.btnOverFull.addEventListener('click', toggleFullscreen);
qs('#card').addEventListener('dblclick', toggleFullscreen);

// ====== Eingabe ======
function installInput(){
  installMobileInput(cv, {
    onTap: (sx,sy)=> tryBuildAtScreen(sx,sy),
    onPan: (dx,dy)=>{ if(activeTool==='pointer') camera.pan(-dx,-dy); },
    onPinch: (cx,cy,delta)=> camera.zoomAround(cx,cy, delta)
  });
  installMouseInput(cv, {
    onTap: (sx,sy)=> tryBuildAtScreen(sx,sy),
    onPan: (dx,dy)=>{ if(activeTool==='pointer') camera.pan(-dx,-dy); },
    onWheel: (sx,sy,dy)=> camera.zoomAround(sx,sy, dy)
  });
}

function tryBuildAtScreen(sx,sy){
  if(!running) return;
  // Nur bauen, wenn Bau‑Tool aktiv
  if(!['road','hq','lumberjack','depot','bulldoze'].includes(activeTool)) return;

  const wpt = camera.screenToWorld(sx,sy);
  // Screen -> Iso Tile (ungefähr passend)
  const {i,j} = renderer.worldToIso(wpt.x, wpt.y);
  if(!world.inside(i,j)) return;

  if(world.build(activeTool, i,j)){
    pumpTopBar();
  }
}

function pumpTopBar(){
  ui.r.wood.textContent = world.res.wood;
  ui.r.stone.textContent= world.res.stone;
  ui.r.food.textContent = world.res.food;
  ui.r.gold.textContent = world.res.gold;
  ui.r.car.textContent  = world.res.carriers;
}

// ====== Game Loop ======
let last=0;
function frame(ts){
  if(!running){ requestAnimationFrame(frame); return; }
  const dt = Math.min(.033, (ts-last)/1000||0); last=ts;
  world.update(dt);
  renderer.draw();
  if(debug){
    cx.fillStyle='#fff8'; cx.font='12px system-ui'; cx.fillText(`scale=${camera.scale.toFixed(2)} cam=(${camera.x.toFixed(1)}, ${camera.y.toFixed(1)})`, 12, cv.height-16);
  }
  requestAnimationFrame(frame);
}

// ====== Start/Boot ======
async function boot(){
  camera = new Camera();
  renderer = new Renderer(cv, camera, null); // world später
  installInput();
  resize();
  await loadAllAssets();

  // Welt
  world = new World(64);
  renderer.world = world;

  // Kamera grob auf HQ
  const hq = world.buildings.find(b=>b.type==='hq');
  const wpos = renderer.isoToWorld(hq.i, hq.j);
  camera.scale = 1;
  camera.centerOn(wpos.x, wpos.y-6);
  pumpTopBar();
}
boot().catch(err=>{
  alert('Startfehler beim Boot:\n'+(err?.message||err));
});

// Start‑Knöpfe — ACHTUNG: kein Re‑Assign auf readonly Objekte mehr
function startGame(){
  if(running) return;
  running = true;
  ui.overlay.style.display='none';
  requestAnimationFrame(ts=>{ last=ts; frame(ts); });
}
ui.btnStart.addEventListener('click', startGame);

// für Testzwecke auch global (optional)
window.SM = { start: startGame };
