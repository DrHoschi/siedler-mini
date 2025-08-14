// boot.js  (V14.7g) — passend zu game.js (V14.7g)
const $ = (q) => document.querySelector(q);

// HUD-Refs
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

// Buttons/UI
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

// ---------- HUD ----------
function onHUD(key, value){
  switch (key){
    case 'Tool':
      hud.tool.textContent = value;
      pills.tool.innerHTML = `☝️ Tool: <span id="hudTool">${value}</span>`;
      break;
    case 'Zoom':
      hud.zoom.textContent = value;
      pills.zoom.innerHTML = `🔎 Zoom <span id="hudZoom">${value}</span>`;
      break;
    default:
      // Ressourcen-Keys optional: Wood/Stone/Food/Gold/Carrier
      const map = {Wood:'wood',Stone:'stone,',Food:'food',Gold:'gold',Carrier:'carry'};
      // falls gebraucht, hier befüllen
      break;
  }
}

// ---------- Fullscreen ----------
function canFS(){
  const d=document;
  return !!(d.fullscreenEnabled||d.webkitFullscreenEnabled||d.documentElement.requestFullscreen||d.documentElement.webkitRequestFullscreen);
}
async function enterFS(){
  try{
    const el=document.documentElement;
    if(el.requestFullscreen) await el.requestFullscreen();
    else if(el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  }catch(e){ alert('Vollbild nicht verfügbar.'); }
}
async function exitFS(){
  try{
    if(document.exitFullscreen) await document.exitFullscreen();
    else if(document.webkitExitFullscreen) await document.webkitExitFullscreen();
  }catch{}
}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>{
  document.addEventListener(ev, ()=>{
    // Canvasgröße wird von game intern gehandhabt (on resize)
    // hier nur HUD refreshen
  });
});

// Doppel-Tipp auf Karte → Vollbild
gameWrap.addEventListener('dblclick', ()=>{ if (canFS()) enterFS(); });

// ---------- Start/Reset ----------
btn.start.addEventListener('click', ()=>{
  if (started) return;
  started = true;
  startCard.style.display='none';
  const DPR = window.devicePixelRatio || 1;
  // Übergabe an neue API:
  window.game.startGame({
    canvas,
    DPR,
    onHUD,
  });
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

// ---------- Tools ----------
toolsEl.addEventListener('click', (e)=>{
  const b = e.target.closest('button[data-tool]'); if(!b) return;
  [...toolsEl.querySelectorAll('.btn')].forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const t = b.getAttribute('data-tool');
  window.game.setTool && window.game.setTool(t);
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

// Initial HUD
pills.tool.innerHTML = `☝️ Tool: <span id="hudTool">Zeiger</span>`;
pills.zoom.innerHTML = `🔎 Zoom <span id="hudZoom">1.00x</span>`;
