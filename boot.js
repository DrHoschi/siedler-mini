// boot.js — V14.7h (für iOS/Safari robust)
const $ = (q) => document.querySelector(q);

// HUD
const hud = {
  tool:  $('#hudTool'),
  zoom:  $('#hudZoom'),
};
const pills = {
  tool:  $('#hudtool'),
  zoom:  $('#hudzoom'),
};

// UI
const btn = {
  start:  $('#btnStart'),
  fs:     $('#btnFs'),
  reset:  '#btnReset' in window ? $('#btnReset') : document.getElementById('btnReset'),
  center: $('#btnCenter'),
  debug:  $('#btnDebug'),
  full:   $('#btnFull'),
};
const toolsEl = $('#tools');
const canvas  = $('#canvas');
const startCard = $('#startCard');
const gameWrap = $('#game');

let started = false;

// --------- HUD callback aus game.js ----------
function onHUD(key, value){
  if (key === 'Tool'){
    hud.tool.textContent = value;
    pills.tool.innerHTML = `☝️ Tool: <span id="hudTool">${value}</span>`;
  } else if (key === 'Zoom'){
    hud.zoom.textContent = value;
    pills.zoom.innerHTML = `🔎 Zoom <span id="hudZoom">${value}</span>`;
  }
}

// --------- Fullscreen ----------
function canFS(){
  const d=document;
  return !!(d.fullscreenEnabled||d.webkitFullscreenEnabled||d.documentElement.requestFullscreen||d.documentElement.webkitRequestFullscreen);
}
async function enterFS(){
  try{
    const el=document.documentElement;
    if(el.requestFullscreen) await el.requestFullscreen();
    else if(el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  }catch{ /* ignore */ }
}
function fsChanged(){
  // Canvas-Resize triggert game intern; hier nur CSS fixen
  lockViewport();
}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev, fsChanged));
gameWrap.addEventListener('dblclick', ()=>{ if (canFS()) enterFS(); });

// --------- Viewport/Canvas helpers ----------
function lockViewport(){
  // verhindert Scrollen/Pinch-Zoom außerhalb des Canvas
  document.documentElement.style.overscrollBehavior = 'none';
  document.body.style.overscrollBehavior = 'none';
  document.body.style.margin = '0';
  document.body.style.touchAction = 'none';
}
function unlockViewport(){
  document.body.style.touchAction = 'auto';
}
function sizeCanvas(){
  // CSS Pixel → echte Pixel übernimmt game.startGame via DPR
  // Wir sorgen nur dafür, dass das Canvas wirklich sichtbar Fläche hat.
  const rect = gameWrap.getBoundingClientRect();
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
}

// --------- Start/Reset ----------
btn.start.addEventListener('click', ()=>{
  if (started) return;
  started = true;
  startCard.style.display='none';

  lockViewport();
  sizeCanvas(); // WICHTIG vor Start
  const DPR = window.devicePixelRatio || 1;

  window.game.startGame({
    canvas,
    DPR,
    onHUD,
  });

  // Standardtool: Zeiger
  activateToolButton('pointer');
  window.game.setTool('pointer');
});

btn.reset.addEventListener('click', ()=>{
  try{ window.game.reset(true); }catch{}
  started = false;
  startCard.style.display='';
});

btn.fs.addEventListener('click', ()=>{ if (canFS()) enterFS(); });
btn.full.addEventListener('click', ()=>{ if (canFS()) enterFS(); });
btn.debug.addEventListener('click', ()=> window.game.toggleDebug && window.game.toggleDebug());
btn.center.addEventListener('click', ()=> window.game.center && window.game.center());

// --------- Tools ----------
function activateToolButton(name){
  [...toolsEl.querySelectorAll('.btn')].forEach(x=>x.classList.remove('active'));
  const b = toolsEl.querySelector(`[data-tool="${name}"]`);
  if (b) b.classList.add('active');
}
toolsEl.addEventListener('click', (e)=>{
  const b = e.target.closest('button[data-tool]'); if(!b) return;
  const t = b.getAttribute('data-tool');
  activateToolButton(t);
  if (window.game && window.game.setTool){ window.game.setTool(t); }
  onHUD('Tool', labelTool(t));
});
function labelTool(t){
  switch(t){
    case 'pointer': return 'Zeiger';
    case 'road': return 'Straße';
    case 'hq': return 'HQ';
    case 'woodcutter': return 'Holzfäller';
    case 'depot': return 'Depot';
    case 'erase': return 'Abriss';
    default: return t;
  }
}

// --------- Initial UI ----------
pills.tool.innerHTML = `☝️ Tool: <span id="hudTool">Zeiger</span>`;
pills.zoom.innerHTML = `🔎 Zoom <span id="hudZoom">1.00x</span>`;

// Größen/Orientierung beobachten
new ResizeObserver(sizeCanvas).observe(gameWrap);
window.addEventListener('orientationchange', ()=>setTimeout(sizeCanvas, 250));
window.addEventListener('resize', ()=>setTimeout(sizeCanvas, 100));
sizeCanvas();
