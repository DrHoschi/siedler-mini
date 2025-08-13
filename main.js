import { initInput, setToolButtonHandlers, getTool } from './core/input.js';
import { camera, centerOnHQ, setCanvas } from './core/camera.js';
import { loadAllAssets } from './core/assets.js';
import {
  initWorld, drawWorld, tryBuildAtScreen, worldTick, resources,
  getBuildingsOfType, getHQ, isRoad, inBounds
} from './world.js';
import {
  initCarriers, onRoadChanged, registerSource, registerSink,
  spawnCarrierAt, carriers, tickCarriers
} from './core/carriers.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha:false });
setCanvas(canvas);

// --- UI
const startOverlay = document.getElementById('startOverlay');
const card = document.getElementById('card');
const startBtn = document.getElementById('startBtn');
const fsPreBtn = document.getElementById('fsPreBtn');
const fsBtn = document.getElementById('fsBtn');
const dbgBtn = document.getElementById('dbgBtn');
const centerBtn = document.getElementById('centerBtn');
const zoomInfo = document.getElementById('zoomInfo');

// Solange Overlay sichtbar ist, darf das Canvas keine Events fangen:
setCanvasPointerEnabled(false);

// Buttons + Doppelklick fürs Overlay
startBtn.addEventListener('click', handleStart, {passive:true});
fsPreBtn.addEventListener('click', toggleFullscreen, {passive:true});
fsBtn.addEventListener('click', toggleFullscreen, {passive:true});
dbgBtn.addEventListener('click',()=>{debug=!debug;}, {passive:true});
centerBtn.addEventListener('click',()=>centerOnHQ(), {passive:true});

// Doppeltipp/Doppelklick auf Overlay → Vollbild
['dblclick','touchend'].forEach(type=>{
  card.addEventListener(type, (e)=>{
    // Doppeltipp-Heuristik mobil
    if(type==='touchend'){
      const now=Date.now();
      if(card._lastTap && now-card._lastTap<300){ toggleFullscreen(); }
      card._lastTap=now;
    } else {
      toggleFullscreen();
    }
  }, {passive:true});
});

let running=false, debug=false, last=performance.now();

// Boot
async function handleStart(e){
  e.stopPropagation();
  startBtn.disabled = true;
  await bootGame();
  // Overlay weg und Canvas wieder klickbar machen
  startOverlay.style.display='none';
  setCanvasPointerEnabled(true);

  running = true;
  requestAnimationFrame(loop);
}

async function bootGame(){
  await loadAllAssets();
  initWorld();

  // Carriers initialisieren (Road/InBounds API)
  initCarriers({ isRoad, inBounds });

  // Input/Gesten erst NACH Overlay-Start aktivieren:
  initInput(canvas, onTapBuild);
  setToolButtonHandlers(updateToolUI);
  updateToolUI();

  // HQ registrieren + Carrier spawnen
  const HQ = getHQ();
  registerSink({ id:'snk_hq', x:HQ.x, y:HQ.y, acceptType:'wood', capacity:9999, amount:0, prio:2 });
  spawnCarrierAt(HQ.x, HQ.y);
  spawnCarrierAt(HQ.x, HQ.y+1);

  // vorhandene Gebäude (falls via Startsave) synchronisieren
  syncCarriersRegistrations();

  centerOnHQ();

  // erste Zeichnung, falls User noch nicht im Loop ist
  drawFrame();
}

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

function setCanvasPointerEnabled(on){
  canvas.style.pointerEvents = on ? 'auto' : 'none';
}

// Loop
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;

  worldTick(dt);
  tickCarriers(dt);

  drawFrame();

  if(running) requestAnimationFrame(loop);
}

function drawFrame(){
  ctx.fillStyle = '#0b1117';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawWorld(ctx, debug);

  document.getElementById('resWood').textContent = `🌲 Holz ${resources.wood}`;
  document.getElementById('resStone').textContent= `🪨 Stein ${resources.stone}`;
  document.getElementById('resFood').textContent = `🌿 Nahrung ${resources.food}`;
  document.getElementById('resGold').textContent  = `🪙 Gold ${resources.gold}`;
  document.getElementById('resCarriers').textContent = `👣 Träger ${carriers.length}`;
  zoomInfo.textContent = `Zoom ${camera.zoom.toFixed(2)}×`;
}

// Build/Tap
function onTapBuild(screenX, screenY){
  const t = getTool();
  if (t === 'pointer') return;
  const res = tryBuildAtScreen(screenX, screenY, t);
  if (res.kind === 'roadChanged') onRoadChanged();
  else if (res.kind === 'building' && res.building){
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

// Vollbild
function toggleFullscreen(){
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.().catch(()=>{});
}

// Resize
function resize(){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width  = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight* dpr);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
}
window.addEventListener('resize', resize);
resize();
