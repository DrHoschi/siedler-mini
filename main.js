import { cam, resizeCanvas } from './core/camera.js';
import { loadAllAssets } from './core/assets.js';
import { setMainCanvas, requestDraw } from './core/render.js';
import { setupInput } from './core/input.js';
import {
  createWorld, screenToCell, buildAt, setTool, TOOLS,
  startPos, cellToIso, TILE_W, TILE_H, updateWorld
} from './core/world.js';

const canvas = document.getElementById('canvas');
setMainCanvas(canvas);

// UI
const overlay = document.getElementById('overlay');
const hint = document.getElementById('hint');
const buttons = [...document.querySelectorAll('#left .btn')];
buttons.forEach(b=>{
  b.addEventListener('click', ()=>{
    buttons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    setTool(b.dataset.tool);
    hint.textContent = b.textContent;
  });
});

document.getElementById('startBtn').onclick = start;

async function start(){
  overlay.style.display='none';
  await loadAllAssets();
  createWorld(140, 120); // feste Größe
  resizeCanvas(canvas);

  // Kamera exakt aufs Start‑HQ zentrieren
  const iso = cellToIso(startPos.x, startPos.y);
  const z = cam.z || 1;
  cam.x = iso.x - (canvas.width / z) * 0.5 + TILE_W * 0.5;
  cam.y = iso.y - (canvas.height/ z) * 0.5 + TILE_H * 0.5;

  requestDraw();
  run();
}

// Touchsteuerung
setupInput(canvas, cam, {
  onTap: (sx,sy)=>{
    const c = screenToCell(sx,sy);
    if(c){ buildAt(c.x, c.y); requestDraw(); }
  },
  onChange: ()=> requestDraw()
});

addEventListener('resize', ()=>{ resizeCanvas(canvas); requestDraw(); }, {passive:true});

// Game‑Loop (Produktion + Trägeranimation)
let last=0;
function run(ts=performance.now()){
  const dt = Math.min(0.05, (ts-last)/1000 || 0); last = ts;
  updateWorld(dt);  // Produktion, Jobs, Carrier bewegen
  requestDraw();
  requestAnimationFrame(run);
}
