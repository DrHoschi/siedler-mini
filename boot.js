// V15 boot – verbindet DOM mit Spielmodulen
import { createGame } from './main.js';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const ui = {
  canvas: $('#gameCanvas'),
  startCard: $('#startCard'),
  btnStart: $('#btnStart'),
  btnReset: $('#btnReset'),
  btnFsTop: $('#btnFull'),
  btnFsMid: $('#btnFs'),
  btnCenter: $('#btnCenter'),
  btnDebug: $('#btnDebug'),
  tools: $$('#tools .btn'),
  hud: {
    wood: $('#hudWood'),
    stone: $('#hudStone'),
    food: $('#hudFood'),
    gold: $('#hudGold'),
    car:  $('#hudCar'),
    tool: $('#hudTool'),
    zoom: $('#hudZoom'),
  },
  debugBox: $('#debug'),
};

const game = createGame({
  canvas: ui.canvas,
  onHUD: (k,v) => {
    if (k==='Zoom') ui.hud.zoom.textContent = v;
    else if (k==='Tool') ui.hud.tool.textContent = v;
    else if (k==='Wood') ui.hud.wood.textContent = v|0;
    else if (k==='Stone') ui.hud.stone.textContent = v|0;
    else if (k==='Food') ui.hud.food.textContent = v|0;
    else if (k==='Gold') ui.hud.gold.textContent = v|0;
    else if (k==='Car') ui.hud.car.textContent = v|0;
  },
  onLog: (msg) => log(msg),
  onError: (msg) => log('❌ '+msg, true),
});

// Tools
ui.tools.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    ui.tools.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tool = btn.getAttribute('data-tool');
    game.setTool(tool);
  });
});

// Buttons rechts
ui.btnCenter.addEventListener('click', ()=>game.center());
ui.btnDebug.addEventListener('click', ()=>{
  ui.debugBox.style.display = ui.debugBox.style.display==='none' ? 'block' : 'none';
});
ui.btnFsTop.addEventListener('click', tryFullscreen);
ui.btnFsMid?.addEventListener('click', tryFullscreen);

ui.btnReset.addEventListener('click', ()=>{
  game.resetSave();
  location.reload();
});

ui.btnStart.addEventListener('click', startGame);

// Doppeltipp → FS (iOS freundlich)
ui.canvas.addEventListener('dblclick', tryFullscreen, {passive:true});

function startGame(){
  game.start();
  ui.startCard.style.display = 'none';
}

async function tryFullscreen(){
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (!req){
    log('⚠️ Vollbild nicht unterstützt.');
    return;
  }
  try { await req.call(el); }
  catch(e){ log('⚠️ Vollbild abgelehnt: '+e.message); }
}

function log(text, isErr=false){
  const t = new Date().toLocaleTimeString();
  ui.debugBox.style.display = 'block';
  ui.debugBox.textContent = `[${t}] ${text}\n` + ui.debugBox.textContent;
  if (isErr) console.error(text); else console.log(text);
}

// Fehler global abfangen
window.addEventListener('error', (e)=>log('JS-Error: '+e.message, true));
window.addEventListener('unhandledrejection', (e)=>log('Promise: '+(e.reason?.message||e.reason), true));
