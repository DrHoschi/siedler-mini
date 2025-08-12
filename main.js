// V13 Mobile – Bootstrapping
import { cam, resizeCanvas } from './core/camera.js';
import { loadAllAssets }     from './core/assets.js';
import { initWorld, MAP }    from './core/world.js';
import { drawAll, setMiniMapCanvas, setMainCanvas } from './core/render.js';
import { setupInput }        from './core/input.js';

const canvas  = document.getElementById('canvas');
const mini    = document.getElementById('minimap');
const startEl = document.getElementById('start');
const btnStart= document.getElementById('startBtn');

setMainCanvas(canvas);
setMiniMapCanvas(mini);

function resize() {
  resizeCanvas(canvas);
  drawAll();
}
window.addEventListener('resize', resize, {passive:true});

btnStart.addEventListener('click', async ()=>{
  startEl.style.display='none';

  await loadAllAssets();    // lädt Texturen (mit Fallbacks)
  initWorld();              // generiert Map, setzt Kamera ungefähr mittig
  setupInput(canvas, cam, drawAll); // 1-Finger Pan, 2-Finger Pinch

  resize();
  requestAnimationFrame(loop);
});

let last=performance.now();
function loop(ts){
  const dt=Math.min(0.05,(ts-last)/1000); last=ts;
  // (hier später: Produktion/Träger etc.)
  drawAll();
  requestAnimationFrame(loop);
}
