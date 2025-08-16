// Siedler‑Mini V15 boot.js
// Verkabelt UI ↔ Spiel, Debug, Vollbild, Start/Reset

import { game } from './game.js?v=1500';

const $ = sel => document.querySelector(sel);
const canvas = $('#canvas');

// ---------- Debug ----------
const dbgBox = $('#debugBox');
const dbgHead = $('#debugHead');
const dbgBody = $('#debugBody');
const dbgClose = $('#dbgClose');

function dbg(msg) {
  const time = new Date().toLocaleTimeString();
  dbgBody.textContent = `[${time}] ${msg}\n` + dbgBody.textContent;
}
function toggleDebug(show) {
  dbgBox.style.display = show ? 'block' : 'none';
}
dbgClose.addEventListener('click', ()=> toggleDebug(false));
// Drag debug panel
(function enableDrag(){
  let dragging=false, sx=0, sy=0, left=12, bottom=12;
  dbgHead.addEventListener('pointerdown', e=>{
    dragging=true; sx=e.clientX; sy=e.clientY;
    dbgHead.setPointerCapture(e.pointerId);
  });
  dbgHead.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    dbgBox.style.left = (left+dx)+'px';
    dbgBox.style.bottom = (bottom-dy)+'px';
    dbgBox.style.right = 'auto';
  });
  dbgHead.addEventListener('pointerup', e=>{
    dragging=false;
    const rect = dbgBox.getBoundingClientRect();
    left = rect.left; bottom = window.innerHeight - rect.bottom;
  });
})();

// ---------- Buttons / HUD ----------
const hud = {
  tool: $('#hudTool'),
  zoom: $('#hudZoom'),
  holz: $('#hudHolz'),
  stein: $('#hudStein'),
  nahr: $('#hudNahrung'),
  gold: $('#hudGold')
};
function setHUD(key, value){
  if (key === 'Tool') hud.tool.textContent = value;
  if (key === 'Zoom') hud.zoom.textContent = value;
  if (key === 'Holz') hud.holz.textContent = value;
  if (key === 'Stein') hud.stein.textContent = value;
  if (key === 'Nahrung') hud.nahr.textContent = value;
  if (key === 'Gold') hud.gold.textContent = value;
}

function bindTools(){
  document.querySelectorAll('#tools .btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tool = btn.dataset.tool;
      game.setTool(tool);
      document.querySelectorAll('#tools .btn').forEach(b=>b.classList.toggle('active', b===btn));
      setHUD('Tool',
        tool==='pointer' ? 'Zeiger' :
        tool==='road' ? 'Straße' :
        tool==='hq' ? 'HQ' :
        tool==='woodcutter' ? 'Holzfäller' :
        tool==='depot' ? 'Depot' : 'Abriss');
    });
  });
}
bindTools();

$('#btnCenter').addEventListener('click', ()=>{
  game.center();
  dbg('Zentrieren');
});

$('#btnDebug').addEventListener('click', ()=>{
  toggleDebug(dbgBox.style.display==='none');
});

async function goFullscreen() {
  const el = document.documentElement; // ganze Seite
  try{
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      dbg('Fullscreen aus');
    } else {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else dbg('Fullscreen: nicht unterstützt');
      dbg('Fullscreen an (falls erlaubt)');
    }
  } catch(err){
    dbg('Fullscreen blockiert: ' + (err?.message || err));
  }
}
$('#btnFull').addEventListener('click', goFullscreen);
$('#btnFs').addEventListener('click', goFullscreen);

// ---------- Start/Reset ----------
function startGame() {
  document.getElementById('startCard').style.display = 'none';
  game.startGame({
    canvas,
    onHUD: setHUD,
    onDebug: dbg
  });
  dbg('Spiel gestartet');
}
$('#btnStart').addEventListener('click', startGame);

$('#btnReset').addEventListener('click', ()=>{
  location.reload();
});

// Doppeltipp auf Canvas → Fullscreen
canvas.addEventListener('dblclick', goFullscreen);

// ---------- Erste Meldung ----------
dbg('Boot ok. Warte auf Start…');
