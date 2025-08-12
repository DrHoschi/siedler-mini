import { Renderer } from './core/render.js';
import { Game } from './core/game.js';

const canvas = document.getElementById('canvas');
const r = new Renderer(canvas);
const game = new Game(r);

// Doppeltipp = Vollbild (und wieder raus)
async function toggleFullscreen(){
  const el = document.documentElement;
  if(!document.fullscreenElement){
    await el.requestFullscreen?.();
  }else{
    await document.exitFullscreen?.();
  }
}
document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);

// iOS: Doppeltipp aufs Canvas -> Vollbild (Default-Zoom unterbinden)
canvas.addEventListener('dblclick', (e)=>{ e.preventDefault(); toggleFullscreen(); }, {passive:false});
document.addEventListener('dblclick', (e)=>{ e.preventDefault(); }, {passive:false});

// Debug Umschalter
document.getElementById('debugToggle')?.addEventListener('click', ()=>{
  const d = document.getElementById('debug');
  d.style.display = (d.style.display==='none'||!d.style.display)?'block':'none';
});

// Toolbar -> an Game delegiert
document.querySelectorAll('#sidebar .btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#sidebar .btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    game.setTool(btn.dataset.tool);
  });
});

// Start-Button FIX
document.getElementById('startBtn')?.addEventListener('click', async ()=>{
  document.getElementById('start').style.display='none';
  // erst init (Assets laden), dann start
  await game.init();
  game.start();
});

// Schon mal initialisieren, damit bei sehr schneller Eingabe nichts schiefgeht:
(async ()=>{ await game.init(); })();
