// Siedler‑Mini V15.0.4 – boot.js
// Verdrahtet UI ↔ game.js: Start, Tools, Debug, Vollbild, Zentrieren, HUD-Updates.

import { game } from './game.js?v=1503'; // deine aktuelle game.js; Querystring als Cache-Buster

const q = (sel) => document.querySelector(sel);
const qa = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  canvas:    q('#canvas'),
  startCard: q('#startCard'),
  btnStart:  q('#btnStart'),
  btnFs:     q('#btnFs'),
  btnReset:  q('#btnReset'),
  btnFull:   q('#btnFull'),
  btnCenter: q('#btnCenter'),
  btnDebug:  q('#btnDebug'),

  hudTool: q('#hudTool'),
  hudZoom: q('#hudZoom'),

  toolButtons: qa('.tool-btn'),

  dbgPanel:  q('#debugPanel'),
  dbgHeader: q('#debugHeader'),
  dbgClose:  q('#debugClose'),
  dbgBody:   q('#debugBody'),
};

let debugOn = false;

// ---------- Debug ----------
function dbg(...args){
  if (!debugOn) return;
  const line = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  els.dbgBody.textContent += line + '\n';
  els.dbgBody.scrollTop = els.dbgBody.scrollHeight;
}
function setDebug(on){
  debugOn = on;
  els.dbgPanel.classList.toggle('show', on);
  dbg('Debug aktiviert:', on);
}
// Drag des Debug-Fensters
(() => {
  let dragging = false, sx=0, sy=0, startLeft=0, startTop=0;
  els.dbgHeader.addEventListener('pointerdown', (e)=>{
    dragging = true; els.dbgHeader.setPointerCapture(e.pointerId);
    const r = els.dbgPanel.getBoundingClientRect();
    startLeft = r.left; startTop = r.top; sx = e.clientX; sy = e.clientY;
    els.dbgHeader.style.cursor='grabbing';
  });
  els.dbgHeader.addEventListener('pointermove', (e)=>{
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    els.dbgPanel.style.left = Math.max(0, startLeft + dx) + 'px';
    els.dbgPanel.style.top  = Math.max(0, startTop + dy) + 'px';
    els.dbgPanel.style.bottom = 'auto';
  });
  const finish = (e)=>{ if(!dragging) return; dragging=false; try{els.dbgHeader.releasePointerCapture(e.pointerId);}catch{} els.dbgHeader.style.cursor='grab'; };
  els.dbgHeader.addEventListener('pointerup', finish);
  els.dbgHeader.addEventListener('pointercancel', finish);
  els.dbgClose.addEventListener('click', ()=>setDebug(false));
})();

// ---------- HUD Bridge ----------
function onHUD(key, value){
  if (key === 'Tool' && els.hudTool) els.hudTool.textContent = value;
  if (key === 'Zoom' && els.hudZoom) els.hudZoom.textContent = value;
  dbg('[HUD]', key, value);
}

// ---------- Tool-Auswahl ----------
function selectTool(tool){
  // optisch kennzeichnen
  els.toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  // an Spiel melden
  game.setTool(tool);
}

function wireTools(){
  els.toolButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectTool(btn.dataset.tool);
    }, {passive:true});
  });
}

// ---------- Vollbild ----------
async function enterFullscreen(){
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else throw new Error('Fullscreen wird auf diesem Gerät/Browser nicht unterstützt.');
    dbg('Fullscreen: ok');
  } catch(err){
    alert('Vollbild nicht möglich: ' + err.message);
    dbg('Fullscreen error:', err.message);
  }
}

// ---------- Start / Reset / Center / Debug ----------
function wireTopButtons(){
  els.btnFull?.addEventListener('click', enterFullscreen, {passive:true});
  els.btnFs?.addEventListener('click', enterFullscreen, {passive:true});

  els.btnCenter?.addEventListener('click', ()=>{
    game.center();
    dbg('center()');
  }, {passive:true});

  els.btnDebug?.addEventListener('click', ()=>{
    setDebug(!debugOn);
  }, {passive:true});

  els.btnReset?.addEventListener('click', ()=>{
    // einfache Seite neu laden (Cache-Buster hilft)
    location.href = location.pathname + '?r=' + Date.now();
  }, {passive:true});

  els.btnStart?.addEventListener('click', async ()=>{
    els.startCard.style.display = 'none';
    await game.startGame({ canvas: els.canvas, onHUD });
    game.placeInitialHQ();
    game.center();
    selectTool('pointer'); // Zeiger ist Standard
    dbg('startGame() → HQ gesetzt → center()');
  }, {passive:true});
}

// ---------- iOS Scroll-Pinch verhindern auf Canvas ----------
function lockTouchDefaults(){
  // Canvas: kein Browser-Scroll/Pinch
  els.canvas.addEventListener('touchstart', e=>e.preventDefault(), {passive:false});
  els.canvas.addEventListener('touchmove',  e=>e.preventDefault(), {passive:false});
}

// ---------- Boot ----------
function boot(){
  wireTools();
  wireTopButtons();
  lockTouchDefaults();
  // Debug am Anfang optional sichtbar machen:
  // setDebug(true);
  // HUD initial
  onHUD('Tool','Zeiger');
  onHUD('Zoom','1.00x');
  dbg('boot ok');
}
boot();
