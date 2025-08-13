import { initInput, setToolButtonHandlers, setTool, getTool } from './core/input.js';
import { camera, centerOnHQ, setCanvas } from './core/camera.js';
import { loadAllAssets } from './core/assets.js';
import { initWorld, drawWorld, tryBuildAtScreen, worldTick, resources, HQ_POS } from './world.js';
import { startCarriers, carriers, tickCarriers } from './core/carriers.js';

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
const toolInfo = document.getElementById('toolInfo');
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
  initWorld();                // legt Karte + HQ fest
  initInput(canvas, onTapBuild); // Gesten / Pan / Zoom
  setToolButtonHandlers(updateToolUI);
  updateToolUI();
  centerOnHQ();               // Kamera auf HQ ausrichten
  startCarriers();            // Träger‑System starten
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
  tryBuildAtScreen(screenX, screenY, t);
}

/* ---------- UI helpers ---------- */
function updateToolUI(){
  const t = getTool();
  toolInfo.textContent = `Tool: ${t==='pointer'?'Zeiger':t==='road'?'Straße':t==='lumber'?'Holzfäller':t==='hq'?'HQ':t==='depot'?'Depot':'Abriss'}`;
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
