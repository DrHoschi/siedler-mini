// boot.js (V15)
import { game } from './game.js?v=1500';

const $ = s => document.querySelector(s);
const ui = {
  canvas: $('#canvas'),
  startCard: $('#startCard'),
  btnStart: $('#btnStart'),
  btnFs:    $('#btnFs'),
  btnReset: $('#btnReset'),
  btnFull:  $('#btnFull'),
  btnCenter:$('#btnCenter'),
  btnDebug: $('#btnDebug'),
  tools:    document.querySelectorAll('#tools .btn'),
  hud: {
    wood: $('#hudWood'), stone: $('#hudStone'), food: $('#hudFood'), gold: $('#hudGold'),
    car:  $('#hudCar'), tool: $('#hudTool'), zoom: $('#hudZoom'), err: $('#hudErr'),
  }
};

// Fehler sichtbar machen
function showError(msg){
  ui.hud.err.textContent = msg;
  ui.hud.err.classList.remove('hide');
  // nach 6s automatisch ausblenden
  clearTimeout(showError._t);
  showError._t = setTimeout(()=> ui.hud.err.classList.add('hide'), 6000);
}
window.addEventListener('error', (e)=>{
  showError(`Fehler: ${String(e.message||e.error||'unbekannt')}`);
});

// HUD Callback
function onHUD(k,v){
  if (k==='wood') ui.hud.wood.textContent = v|0;
  if (k==='stone')ui.hud.stone.textContent= v|0;
  if (k==='food') ui.hud.food.textContent = v|0;
  if (k==='gold') ui.hud.gold.textContent = v|0;
  if (k==='car')  ui.hud.car.textContent  = v|0;
  if (k==='Tool') ui.hud.tool.textContent = v;
  if (k==='Zoom') ui.hud.zoom.textContent = v;
}

// Start
ui.btnStart.addEventListener('click', ()=>{
  ui.startCard.style.display='none';
  game.startGame({ canvas: ui.canvas, onHUD, showError });
});

// Reset
ui.btnReset.addEventListener('click', ()=>{
  localStorage.removeItem('sm_v15_save');
  location.reload();
});

// Vollbild (Fallback iOS: nur „Pseudo“)
function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  // Fallback: nix, HUD bleibt sichtbar
}
ui.btnFs.addEventListener('click', enterFullscreen);
ui.btnFull.addEventListener('click', enterFullscreen);

// Zentrieren
ui.btnCenter.addEventListener('click', ()=> game.center());

// Debug
ui.btnDebug.addEventListener('click', ()=> game.toggleDebug());

// Tools
ui.tools.forEach(b=>{
  b.addEventListener('click', ()=>{
    ui.tools.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    game.setTool(b.dataset.tool);
  });
});

// Doppeltipp → Vollbild (nur im Start-Overlay sinnvoll)
document.addEventListener('dblclick', ()=>{
  if (ui.startCard.style.display!=='none') enterFullscreen();
});
