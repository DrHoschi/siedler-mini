// Siedler‑Mini V14.7‑hf2 – Boot/DOM‑Verdrahtung
import { game } from './game.js?v=147hf2';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const err = $('#err');

function showErr(msg){
  if (!err) return;
  err.textContent = msg;
  err.classList.add('show');
  clearTimeout(showErr._t);
  showErr._t = setTimeout(()=>err.classList.remove('show'), 4000);
}

// HUD Callback in DOM schreiben
function onHUD(k,v){
  if (k === 'Zoom')  $('#hudZoom').textContent = v;
  if (k === 'Tool')  $('#hudTool').textContent = v;
  if (k === 'Holz')  $('#hudHolz').textContent = v;
  if (k === 'Stein') $('#hudStein').textContent = v;
  if (k === 'Nahrung') $('#hudNahrung').textContent = v;
  if (k === 'Gold') $('#hudGold').textContent = v;
  if (k === 'Traeger') $('#hudTraeger').textContent = v;
}

// Start
const canvas = $('#canvas');
const startCard = $('#startCard');

$('#btnStart').addEventListener('click', ()=>{
  try{
    game.startGame({ canvas, onHUD });
    startCard.style.display = 'none';
  }catch(e){ showErr('STARTFEHLER: '+e.message); }
});

$('#btnReset').addEventListener('click', ()=>{
  location.reload();
});

function canFullscreen(){
  return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}
async function enterFullscreen(el){
  try{
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  }catch(e){ showErr('Vollbild nicht erlaubt: '+e.message); }
}

$('#btnFs').addEventListener('click', ()=>{
  if (!canFullscreen()) return showErr('Vollbild wird nicht unterstützt (Browser/Modus).');
  enterFullscreen(document.documentElement);
});
$('#btnFull').addEventListener('click', ()=>{
  if (!canFullscreen()) return showErr('Vollbild wird nicht unterstützt (Browser/Modus).');
  enterFullscreen(document.documentElement);
});

// Tools
$('#tools').addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-tool]');
  if (!btn) return;
  $$('#tools .btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  game.setTool(btn.dataset.tool);
});

$('#btnCenter').addEventListener('click', ()=> game.center());
$('#btnDebug').addEventListener('click', ()=> showErr('Debug: ok'));

// Doppeltipp auf Canvas → Vollbild
let lastTap=0;
canvas.addEventListener('pointerdown', ()=>{
  const now = performance.now();
  if (now - lastTap < 300){
    if (!canFullscreen()) return showErr('Vollbild wird nicht unterstützt (Browser/Modus).');
    enterFullscreen(document.documentElement);
  }
  lastTap = now;
});
