// V13 Mobile – Boot & Wiring
import { cam, resizeCanvas } from './core/camera.js';
import { loadAllAssets }     from './core/assets.js';
import { initWorld, setTool } from './core/world.js';
import { drawAll, setMainCanvas, requestDraw, prerenderGround } from './core/render.js';
import { setupInput }        from './core/input.js';

const canvas  = document.getElementById('canvas');
const startEl = document.getElementById('start');
const btnStart= document.getElementById('startBtn');

setMainCanvas(canvas);

function resize() {
  resizeCanvas(canvas);
  // Offscreen neu aufbauen, da Pixelgröße sich geändert hat
  prerenderGround();
  requestDraw();
}
window.addEventListener('resize', resize, {passive:true});

btnStart.addEventListener('click', async ()=>{
  startEl.style.display='none';

  await loadAllAssets();        // Texturen laden (mit Fallbacks)
  initWorld();                  // Map generieren
  prerenderGround();            // Boden in Offscreen vorzeichnen
  setupInput(canvas, cam, { onTap: buildTap, onChange: requestDraw }); // Pan/Pinch/ Tap
  resize();                     // initiales Sizing
  requestDraw();                // 1x zeichnen
});

// Toolbar
const buttons = {
  pointer: document.getElementById('tool-pointer'),
  road:    document.getElementById('tool-road'),
  hq:      document.getElementById('tool-hq'),
  lumber:  document.getElementById('tool-lumber'),
  depot:   document.getElementById('tool-depot'),
  bulldoze:document.getElementById('tool-bulldoze')
};
Object.entries(buttons).forEach(([tool,btn])=>{
  btn.addEventListener('click', ()=>{
    Object.values(buttons).forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    setTool(tool);
  });
});

import { buildAtScreen } from './core/world.js';
function buildTap(sx,sy){
  // kurzer Tap → bauen (nur wenn Tool ≠ pointer)
  if(buildAtScreen(sx,sy)){ prerenderGround(); } // falls Straßen/Untergrund wirken
  requestDraw();
}
