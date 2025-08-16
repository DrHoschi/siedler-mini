// boot.js V15.3.1
import { game } from './game.js?v=15.3.1';

const $ = sel => document.querySelector(sel);
const on = (el, ev, fn, opt) => el.addEventListener(ev, fn, opt);

const ui = {
  canvas: $('#canvas'),
  startCard: $('#startCard'),
  btnStart: $('#btnStart'),
  btnFs: $('#btnFs'),
  btnReset: $('#btnReset'),
  btnFull: $('#btnFull'),
  btnCenter: $('#btnCenter'),
  btnDebug: $('#btnDebug'),
  hudZoom: $('#hudZoom'),
  hudTool: $('#hudTool'),
  hudHolz: $('#hudHolz'),
  dbg: $('#dbg'),
  dbgOut: $('#dbgOut'),
  dbgMove: $('#dbgMove'),
  buildBtn: $('#buildBtn'),
  buildPanel: $('#buildPanel'),
  buildBackdrop: $('#buildBackdrop'),
  buildClose: $('#buildClose'),
  buildDone: $('#buildDone'),
};

let dbgEnabled = false;
let buildOpen = false;
let buildCloseUntil = 0; // kurzer Cooldown nach Panel-Schließen

/* ---------------- Debug ---------------- */
function setDebug(onOff){
  dbgEnabled = onOff;
  ui.dbg.style.display = onOff ? 'block' : 'none';
}
function writeDebug(){
  if (!dbgEnabled) return;
  const s = game.state;
  ui.dbgOut.textContent =
`cam=(${s.camX.toFixed(1)}, ${s.camY.toFixed(1)})  zoom=${s.zoom.toFixed(2)}
tool=${s.pointerTool}  running=${s.running}  buildOpen=${s.buildMenuOpen}
buildings=${s.buildings.length}  carriers=${s.carriers.length}`;
}
let dbgDrag=false, dbgDX=0, dbgDY=0;
on(ui.dbgMove,'pointerdown',e=>{
  dbgDrag=true; dbgDX=e.clientX - ui.dbg.offsetLeft; dbgDY=e.clientY - ui.dbg.offsetTop;
  e.preventDefault();
});
on(document,'pointermove',e=>{
  if(!dbgDrag) return;
  ui.dbg.style.left = (e.clientX - dbgDX)+'px';
  ui.dbg.style.top  = (e.clientY - dbgDY)+'px';
});
on(document,'pointerup',()=> dbgDrag=false);

/* --------------- Vollbild --------------- */
async function reqFullscreen(node){
  const el = node || document.documentElement;
  try{
    if (document.fullscreenElement || document.webkitFullscreenElement){
      await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    }else{
      await (el.requestFullscreen?.({navigationUI:'hide'}) || el.webkitRequestFullscreen?.());
    }
  }catch(e){ /* iOS iPhone kann ablehnen */ }
}

/* ------------- Bau-Panel Logic ---------- */
function reallyCloseBuildPanel(){
  buildOpen = false;
  ui.buildPanel.style.display = 'none';
  ui.buildBackdrop.classList.remove('show');
  // Hart: Menü zu => sofort Pointer + Build sperren
  game.setTool('pointer');
  game.setBuildMenuOpen(false);
  buildCloseUntil = performance.now() + 200; // 200ms Tap-Sperre
}
function openBuildPanel(){
  buildOpen = true;
  ui.buildPanel.style.display = 'block';
  ui.buildBackdrop.classList.add('show');
  game.setBuildMenuOpen(true);
}
function toggleBuild(){
  if (buildOpen) reallyCloseBuildPanel(); else openBuildPanel();
}
on(ui.buildBtn, 'click', toggleBuild);
on(ui.buildClose,'click', reallyCloseBuildPanel);
on(ui.buildDone,'click', reallyCloseBuildPanel);
// Klick außerhalb schließt auch
on(ui.buildBackdrop,'click', (e)=>{ if (e.target === ui.buildBackdrop) reallyCloseBuildPanel(); });

// Tool-Buttons im Panel
ui.buildPanel.addEventListener('click', (e)=>{
  const btn = e.target.closest('.tool');
  if (!btn) return;
  const tool = btn.getAttribute('data-tool');
  ui.buildPanel.querySelectorAll('.tool').forEach(t=>t.classList.toggle('active', t===btn));
  game.setTool(tool);
  // Panel bleibt offen — bauen ist nur solange offen möglich
});

/* -------- Start / Reset / Center / Debug -------- */
on(ui.btnStart,'click', ()=>{
  ui.startCard.style.display = 'none';
  game.startGame({
    canvas: ui.canvas,
    onHUD: (k,v)=>{
      if (k==='Zoom') ui.hudZoom.textContent = v;
      if (k==='Tool') ui.hudTool.textContent = v;
      writeDebug();
    }
  });
  game.center();
  game.placeInitialHQ();
  writeDebug();
});

on(ui.btnFs,'click', ()=> reqFullscreen(document.documentElement));
on(ui.btnFull,'click', ()=> reqFullscreen(document.documentElement));

on(ui.btnReset,'click', ()=>{ location.href = location.pathname + '?v=' + Date.now(); });

on(ui.btnCenter,'click', ()=>{ game.center(); writeDebug(); });
on(ui.btnDebug,'click', ()=>{ setDebug(!dbgEnabled); writeDebug(); });

/* -------- Kleinzeug -------- */
setInterval(()=> {
  // kleine Schutzschicht: wenn Panel zu und Tool != pointer, erzwinge pointer
  if (!buildOpen && game.state.pointerTool !== 'pointer'){
    game.setTool('pointer');
  }
  writeDebug();
}, 400);

// Exponiere Cooldown, damit game ihn berücksichtigen kann
export function isBuildCooldown(){
  return performance.now() < buildCloseUntil;
}

setDebug(false);
reallyCloseBuildPanel(); // beim Laden: zu + pointer
