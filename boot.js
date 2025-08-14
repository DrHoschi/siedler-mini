// boot.js  (V14.7 mobile)  — cache-bust: v=147f2
import * as game from './game.js?v=147f2';

const $ = (q) => document.querySelector(q);
const hud = {
  wood:  $('#hudHolz'),
  stone: $('#hudStein'),
  food:  $('#hudNahrung'),
  gold:  $('#hudGold'),
  carry: $('#hudTraeger'),
  tool:  $('#hudTool'),
  zoom:  $('#hudZoom'),
};
const pills = {
  tool:  $('#hudtool'),
  zoom:  $('#hudzoom'),
};
const btn = {
  start:  $('#btnStart'),
  fs:     $('#btnFs'),
  reset:  $('#btnReset'),
  center: $('#btnCenter'),
  debug:  $('#btnDebug'),
  full:   $('#btnFull'),
};
const toolsEl = $('#tools');
const canvas  = $('#canvas');
const startCard = $('#startCard');
const gameWrap = $('#game');

let started = false;
let fsWanted = false;

// ---------- Helpers ----------
function showAlert(msg){
  alert(msg);
}
function updateHUD(state){
  hud.wood.textContent  = state.res.wood;
  hud.stone.textContent = state.res.stone;
  hud.food.textContent  = state.res.food;
  hud.gold.textContent  = state.res.gold;
  hud.carry.textContent = state.res.carry;
  hud.zoom.textContent  = `${state.cam.z.toFixed(2)}x`;
  hud.tool.textContent  = toolLabel(state.tool);
  // kleine Icons
  pills.tool.firstChild && (pills.tool.firstChild.nodeType===3);
  pills.tool.innerHTML = `☝️ Tool: <span id="hudTool">${hud.tool.textContent}</span>`;
  pills.zoom.innerHTML = `🔎 Zoom <span id="hudZoom">${hud.zoom.textContent}</span>`;
}
function toolLabel(t){
  switch(t){
    case 'pointer':   return 'Zeiger';
    case 'road':      return 'Straße';
    case 'hq':        return 'HQ';
    case 'woodcutter':return 'Holzfäller';
    case 'depot':     return 'Depot';
    case 'erase':     return 'Abriss';
    default:          return String(t);
  }
}

// Fullscreen – iOS‑sicher(ish)
function canFullscreen(){
  const d = document;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled || d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen);
}
async function requestFullscreenSafe(el){
  try{
    if (el.requestFullscreen)      await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else throw new Error('no FS');
    fsWanted = true;
  }catch(e){
    showAlert('Vollbild wird von diesem Browser/Modus nicht unterstützt.\n\nTipp: iOS Safari (iOS 16+) oder Seite zum Homescreen hinzufügen.');
  }
}
async function exitFullscreenSafe(){
  try{
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
  }catch{}
  fsWanted = false;
}

document.addEventListener('fullscreenchange',  handleFSChange);
document.addEventListener('webkitfullscreenchange', handleFSChange);
function handleFSChange(){
  // Nach FS-Wechsel Canvas neu dimensionieren & Events neu binden
  resizeCanvas();
  if (started) bindGameInput(); // sicherstellen, dass Listener aktiv sind
}

// iOS Safari: natives Pinch‑Zoom im Vollbild unterdrücken
['gesturestart','gesturechange','gestureend'].forEach(ev=>{
  document.addEventListener(ev, e=>{
    if (fsWanted) e.preventDefault();
  }, {passive:false});
});

// ---------- Größenänderung ----------
function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  const r = gameWrap.getBoundingClientRect();
  canvas.width  = Math.max(1, Math.round(r.width  * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  game.resize(r.width, r.height, dpr);
  updateHUD(game.state());
}
window.addEventListener('resize', resizeCanvas);

// ---------- Input ----------
let bound = false;
function bindGameInput(){
  if (bound) return;
  bound = true;

  // Pointer für Pan (nur im Zeiger-Tool)
  canvas.addEventListener('pointerdown', (e)=>{
    game.pointerDown(e.clientX, e.clientY);
  }, {passive:true});
  canvas.addEventListener('pointermove', (e)=>{
    game.pointerMove(e.clientX, e.clientY);
    updateHUD(game.state());
  }, {passive:true});
  canvas.addEventListener('pointerup', ()=>{
    game.pointerUp();
  }, {passive:true});
  canvas.addEventListener('pointercancel', ()=>{
    game.pointerUp();
  }, {passive:true});

  // 2‑Finger Zoom (Touch)
  let lastDist = null;
  canvas.addEventListener('touchstart', (e)=>{
    if (e.touches.length===2){
      lastDist = dist(e.touches[0], e.touches[1]);
    }else{
      lastDist = null;
    }
  }, {passive:true});
  canvas.addEventListener('touchmove', (e)=>{
    if (e.touches.length===2 && lastDist){
      const d = dist(e.touches[0], e.touches[1]);
      const factor = d / lastDist;
      const cx = (e.touches[0].clientX + e.touches[1].clientX)/2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY)/2;
      game.zoomAt(cx, cy, factor);
      lastDist = d;
      updateHUD(game.state());
    }
  }, {passive:true});
  canvas.addEventListener('touchend', ()=>{ lastDist=null; }, {passive:true});

  function dist(a,b){
    const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY;
    return Math.hypot(dx,dy);
  }

  // Klick zum Bauen (wenn Bau‑Tool)
  canvas.addEventListener('click', (e)=>{
    // Startkarte blockiert Eingaben, solange sichtbar.
    if (startCard && startCard.style.display!=='none') return;
    const built = game.clickBuild(e.clientX, e.clientY);
    if (built) updateHUD(game.state());
  });
}

function unbindGameInput(){
  if (!bound) return;
  bound = false;
  const clone = canvas.cloneNode(true);
  canvas.replaceWith(clone);
  clone.id = 'canvas';
  // DOM‑Referenz aktualisieren
  const newCanvas = $('#canvas');
  // swap var
  (function(){ Object.assign(canvas, newCanvas); })(); // no-op to keep name
}

// ---------- Toolbuttons ----------
toolsEl.addEventListener('click', (e)=>{
  const t = e.target.closest('button[data-tool]');
  if (!t) return;
  const tool = t.getAttribute('data-tool');
  game.setTool(tool);
  updateHUD(game.state());
});

// ---------- Buttons rechts ----------
btn.center.addEventListener('click', ()=>{
  game.center();
  updateHUD(game.state());
});
btn.debug.addEventListener('click', ()=>{
  const dbg = game.toggleDebug();
  showAlert('Debug: ' + (dbg ? 'AN' : 'AUS'));
});
btn.full.addEventListener('click', ()=>requestFullscreenSafe(document.documentElement));

// ---------- Startkarte ----------
btn.fs.addEventListener('click', ()=>requestFullscreenSafe(document.documentElement));
btn.reset.addEventListener('click', ()=>{
  started=false;
  unbindGameInput();
  game.reset();
  startCard.style.display='';
  updateHUD(game.state());
});
btn.start.addEventListener('click', ()=>{
  start();
});

// Doppel‑Tap auf Karte → Vollbild
gameWrap.addEventListener('dblclick', ()=>{
  requestFullscreenSafe(document.documentElement);
});

// Blockiere Canvas‑Eingaben bis Start
function start(){
  if (!started){
    started = true;
    startCard.style.display='none';
    bindGameInput();
  }
}

// ---------- Init ----------
game.init({
  onChange: (state)=> updateHUD(state),
  canvas,
});
resizeCanvas();
updateHUD(game.state());
