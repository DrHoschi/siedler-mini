// boot.js — V14.7‑hf1 wiring
import { game } from './game.js?v=147hf1';

const $ = (s)=>document.querySelector(s);

// --- DOM refs ---
const canvas     = $('#canvas');
const startCard  = $('#startCard');

const btnStart   = $('#btnStart');
const btnFsCard  = $('#btnFs');
const btnReset   = $('#btnReset');

const btnFull    = $('#btnFull');
const btnCenter  = $('#btnCenter');

const pillsTool  = $('#hudTool');
const pillsZoom  = $('#hudZoom');

// linkes Bau-Menü
document.querySelectorAll('#tools .btn').forEach(btn=>{
  btn.addEventListener('click', ()=> game.setTool(btn.dataset.tool));
});

// HUD updater vom Spiel
function onHUD(key, val){
  if (key === 'Tool' && pillsTool) pillsTool.textContent = val;
  if (key === 'Zoom' && pillsZoom) pillsZoom.textContent = val;
}

// Start
btnStart.addEventListener('click', ()=>{
  startCard.style.display = 'none';
  game.startGame({ canvas, onHUD });
});

// Reset (einfach & robust)
btnReset.addEventListener('click', ()=>{
  // Fürs schnelle Testen reicht ein Reload
  location.reload();
});

// Zentrieren
btnCenter.addEventListener('click', ()=> game.center());

// Vollbild (Top‑Button + Karte)
function toggleFullscreen(){
  const el = document.documentElement;
  const req  = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;

  if (!document.fullscreenElement && req){
    req.call(el).catch(()=>alert('Vollbild wird in diesem Browser/Modus nicht unterstützt.\nTipp: In iOS Safari ab iOS 16 oder "Zum Homescreen hinzufügen".'));
  } else if (exit){
    exit.call(document);
  } else {
    alert('Vollbild wird in diesem Browser/Modus nicht unterstützt.');
  }
}
btnFull.addEventListener('click', toggleFullscreen);
btnFsCard.addEventListener('click', toggleFullscreen);

// Optional: Beim Wechsel der FS-/Orientation die Canvasgröße aktualisieren
['resize','orientationchange','fullscreenchange','webkitfullscreenchange'].forEach(ev=>{
  window.addEventListener(ev, ()=> {
    // game.js hört bereits auf resize und passt die Canvas an
  });
});
