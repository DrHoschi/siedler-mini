// main.js  — V13.6.1
import { Renderer } from './core/render.js';
import { Game } from './core/game.js';

const canvas = document.getElementById('canvas');
const r = new Renderer(canvas);
const game = new Game(r);

let started = false;           // läuft das Spiel?
let dblHandler = null;         // Referenz zum Doppeltipp-Handler

// Vollbild toggeln
async function toggleFullscreen(){
  const el = document.documentElement;
  if(!document.fullscreenElement){
    await el.requestFullscreen?.();
  }else{
    await document.exitFullscreen?.();
  }
}

// Button oben rechts bleibt immer verfügbar
document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);

// --- Doppeltipp NUR im Startscreen aktivieren ---
function enableStartDblclick(){
  disableStartDblclick(); // sicherheitshalber
  dblHandler = (e)=>{
    // Nur vor Spielstart: Doppeltipp = Vollbild
    e.preventDefault();
    toggleFullscreen();
  };
  // Nur auf dem Start-Overlay bzw. global – aber eben nur solange !started
  document.addEventListener('dblclick', dblHandler, { passive:false });
}
function disableStartDblclick(){
  if(dblHandler){
    document.removeEventListener('dblclick', dblHandler, { passive:false });
    dblHandler = null;
  }
}
enableStartDblclick();

// Debug-Umschalter
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

// Start-Button
document.getElementById('startBtn')?.addEventListener('click', async ()=>{
  // Startscreen weg
  document.getElementById('start').style.display='none';
  // Doppeltipp für Vollbild im Spiel deaktivieren (damit Gesten frei sind)
  disableStartDblclick();
  started = true;

  // Init -> Start
  await game.init();
  game.start();
});

// Vorladen (falls Netz langsam ist); Start erfolgt trotzdem erst über Button
(async ()=>{ await game.init(); })();
