import { cam, resizeCanvas } from './core/camera.js';
import { loadAllAssets } from './core/assets.js';
import { createWorld, buildAt, screenToCell, setTool, TOOLS } from './core/world.js';
import { setMainCanvas, requestDraw } from './core/render.js';
import { setupInput } from './core/input.js';

const canvas = document.getElementById('canvas');
setMainCanvas(canvas);

// UI
const overlay = document.getElementById('overlay');
const hint = document.getElementById('hint');
const toolBtns = [...document.querySelectorAll('#left .btn')];
toolBtns.forEach(b=>{
  b.addEventListener('click', ()=>{
    toolBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    setTool(b.dataset.tool);
    hint.textContent = b.textContent;
  });
});

// Start
document.getElementById('startBtn').onclick = start;
async function start(){
  overlay.style.display='none';
  await loadAllAssets();
  createWorld(120, 120); // Mapgröße
  resizeCanvas(canvas);
  requestDraw();
}

// Input (Touch‑Pan / Pinch‑Zoom / Tap‑Build)
setupInput(canvas, cam, {
  onTap: (sx,sy)=>{
    const cell = screenToCell(sx,sy);
    if(cell) { buildAt(cell.x, cell.y); requestDraw(); }
  },
  onChange: ()=> requestDraw()
});

addEventListener('resize', ()=>{ resizeCanvas(canvas); requestDraw(); }, {passive:true});
