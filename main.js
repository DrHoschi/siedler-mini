// main.js  v14.2
import { IM, loadAllAssets }        from './core/assets.js?v=14.2';
import { attachInput, detachInput } from './core/input.js?v=14.2';
import { Camera }                   from './core/camera.js?v=14.2';
import { Carriers }                 from './core/carriers.js?v=14.2';
import { createWorld }              from './world.js?v=14.2';
import { createRenderer }           from './render.js?v=14.2';
import { createGameState }          from './game.js?v=14.2';

const $ = (s) => document.querySelector(s);
let canvas, ctx, renderer, camera, world, state, carriers, rafId=0, running=false, lastT=0;

function ensureCanvas() {
  canvas = $('#game');
  if (!canvas) throw new Error('#game Canvas fehlt (index.html)');
  const c = canvas.getContext('2d', { alpha:false, desynchronized:true });
  if (!c) throw new Error('2D Kontext nicht verfügbar');
  ctx = c; resizeCanvas(); window.addEventListener('resize', resizeCanvas, {passive:true});
}
function resizeCanvas() {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio||1, 2));
  const w = Math.floor(innerWidth*dpr), h = Math.floor(innerHeight*dpr);
  if (canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
  canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
  renderer?.setViewport(w,h,dpr);
}
function hideStartOverlay(){ const ov=$('#startOverlay'); if(ov) ov.style.display='none'; }
function showUI(){ const ui=$('#uiBar'); if(ui) ui.style.opacity='1'; }

function updateHUD(){
  if(!state) return;
  const R=state.resources;
  $('#hudWood')?.replaceChildren(String(R.wood));
  $('#hudStone')?.replaceChildren(String(R.stone));
  $('#hudFood')?.replaceChildren(String(R.food));
  $('#hudGold')?.replaceChildren(String(R.gold));
  $('#hudCar')?.replaceChildren(String(R.carriers));
  $('#hudTool')?.replaceChildren(state.toolName||'Zeiger');
  $('#hudZoom')?.replaceChildren(`${camera.zoom.toFixed(2)}x`);
}

async function initGame(){
  ensureCanvas();
  await loadAllAssets();
  world    = createWorld({ size: 40 }); // kleine Karte für Mobile
  state    = createGameState({ placeStartHQ:true });
  camera   = new Camera();
  renderer = createRenderer();
  carriers = new Carriers({ sprite: IM.carrier });

  // Kamera auf HQ ausrichten
  camera.centerOn(world.hq.pixelX, world.hq.pixelY);
  camera.minZoom=0.55; camera.maxZoom=2.0;

  attachInput(canvas, camera, state, world, renderer, () => updateHUD());
  showUI(); updateHUD();
}

function step(dt){
  state.time += dt;
  carriers.update(dt, world, state);
  renderer.render(ctx, world, state, camera, carriers);
  updateHUD();
}

function loop(t){
  if(!running) return;
  const dt=Math.min(0.05,(t-lastT)/1000)||0.016; lastT=t;
  step(dt);
  rafId=requestAnimationFrame(loop);
}
function stop(){
  running=false; if(rafId) cancelAnimationFrame(rafId);
  detachInput(canvas);
  removeEventListener('resize', resizeCanvas);
}

export async function run(){
  if(running) return;
  try{
    await initGame();
    hideStartOverlay();
    running=true; lastT=performance.now(); rafId=requestAnimationFrame(loop);
  }catch(e){
    alert(`Startfehler in main.run()\n${e.message}`);
    console.error(e); stop(); throw e;
  }
}

// kleine Helfer für HUD-Buttons
function center(){ camera?.centerOn(world.hq.pixelX, world.hq.pixelY); }
function toggleDebug(){ renderer.debug = !renderer.debug; }

window.main = { run, center, toggleDebug };
