import { initInput, setToolButtonHandlers, getTool } from './core/input.js';
import { camera, centerOnHQ, setCanvas } from './core/camera.js';
import { loadAllAssets } from './core/assets.js';
import { initWorld, drawWorld, tryBuildAtScreen, worldTick, resources, getBuildingsOfType, getHQ, isRoad, inBounds } from './world.js';
import { initCarriers, onRoadChanged, registerSource, registerSink, spawnCarrierAt, carriers, tickCarriers } from './core/carriers.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha:false });

/* ---------- Boot ---------- */
setCanvas(canvas);
resize();
window.addEventListener('resize', resize);

let running = false;
let debug = false;
let last = performance.now();

/* UI refs */
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');
const fsPreBtn = document.getElementById('fsPreBtn');
const fsBtn = document.getElementById('fsBtn');
const dbgBtn = document.getElementById('dbgBtn');
const centerBtn = document.getElementById('centerBtn');
const zoomInfo = document.getElementById('zoomInfo');

fsPreBtn.addEventListener('click', toggleFullscreen);
fsBtn.addEventListener('click', toggleFullscreen);
dbgBtn.addEventListener('click',()=>{debug=!debug;});
centerBtn.addEventListener('click',()=>centerOnHQ());

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  await bootGame();
  startOverlay.style.display = 'none';
  running = true;
  requestAnimationFrame(loop);
});

/* ---------- Boot pipeline ---------- */
async function bootGame(){
  await loadAllAssets();
  initWorld();

  // Carriers initialisieren (zugriff auf Roads/InBounds)
  initCarriers({ isRoad, inBounds });

  // Input / Tools
  initInput(canvas, onTapBuild);
  setToolButtonHandlers(updateToolUI);
  updateToolUI();

  // HQ finden → als Senke registrieren + Träger spawnen
  const HQ = getHQ();
  registerSink({ id:'snk_hq', x:HQ.x, y:HQ.y, acceptType:'wood', capacity:9999, amount:0, prio:2 });
  spawnCarrierAt(HQ.x, HQ.y);
  spawnCarrierAt(HQ.x, HQ.y+1);

  // Vorhandene Holzfäller/Depots als Quellen/Senken registrieren
  syncCarriersRegistrations();

  centerOnHQ();
}

/* Quellen/Senken für alle Gebäude im Weltzustand synchronisieren */
function syncCarriersRegistrations(){
  const ljs = getBuildingsOfType('lumberjack');
  for(const lj of ljs){
    registerSource({ id:`src_${lj.x}_${lj.y}`, x:lj.x, y:lj.y, type:'wood', batch:1, cooldownTime:4, stock:0 });
  }
  const deps = getBuildingsOfType('depot');
  for(const d of deps){
    registerSink({ id:`snk_${d.x}_${d.y}`, x:d.x, y:d.y, acceptType:'wood', capacity:200, amount:0, prio:1 });
  }
}

/* ---------- Loop ---------- */
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;

  // Sim
  worldTick(dt);
  tickCarriers(dt);

  // Draw
  ctx.fillStyle = '#0b1117';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawWorld(ctx, debug);

  // HUD
  document.getElementById('resWood').textContent = `🌲 Holz ${resources.wood}`;
  document.getElementById('resStone').textContent= `🪨 Stein ${resources.stone}`;
  document.getElementById('resFood').textContent = `🌿 Nahrung ${resources.food}`;
  document.getElementById('resGold').textContent  = `🪙 Gold ${resources.gold}`;
  document.getElementById('resCarriers').textContent = `👣 Träger ${carriers.length}`;
  zoomInfo.textContent = `Zoom ${camera.zoom.toFixed(2)}×`;

  if(running) requestAnimationFrame(loop);
}

/* ---------- Build tap ---------- */
function onTapBuild(screenX, screenY){
  const t = getTool();
  if (t === 'pointer') return; // Zeiger baut nix
  const res = tryBuildAtScreen(screenX, screenY, t);

  if (res.kind === 'roadChanged'){
    onRoadChanged();
  } else if (res.kind === 'building' && res.building){
    if (res.building.type === 'lumberjack'){
      registerSource({ id:`src_${res.building.x}_${res.building.y}`, x:res.building.x, y:res.building.y, type:'wood', batch:1, cooldownTime:4, stock:0 });
    } else if (res.building.type === 'depot'){
      registerSink({ id:`snk_${res.building.x}_${res.building.y}`, x:res.building.x, y:res.building.y, acceptType:'wood', capacity:200, amount:0, prio:1 });
    } else if (res.building.type === 'hq_wood' || res.building.type === 'hq_stone'){
      registerSink({ id:`snk_${res.building.x}_${res.building.y}`, x:res.building.x, y:res.building.y, acceptType:'wood', capacity:9999, amount:0, prio:1.5 });
      spawnCarrierAt(res.building.x, res.building.y);
    }
  }
}

/* ---------- UI helpers ---------- */
function updateToolUI(){
  const t = getTool();
  const txt = t==='pointer'?'Zeiger': t==='road'?'Straße': t==='lumber'?'Holzfäller': t==='hq'?'HQ': t==='depot'?'Depot':'Abriss';
  document.getElementById('toolInfo').textContent = `Tool: ${txt}`;
  document.querySelectorAll('#tools .tool').forEach(btn=>{
    btn.classList.toggle('on', btn.dataset.tool===t);
  });
}

function toggleFullscreen(){
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen().catch(()=>{});
  else document.exitFullscreen().catch(()=>{});
}

function resize(){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width  = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight* dpr);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
}
