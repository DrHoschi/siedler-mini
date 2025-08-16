// boot.js V15.3
import { game } from './game.js?v=15.3';

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
  buildClose: $('#buildClose'),
  buildDone: $('#buildDone'),
};

let dbgEnabled = false;
let buildOpen = false;

// ---------- Debug ----------
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
buildings=${s.buildings.length}  carriers=${s.carriers.length}
wood=${document.querySelector('#hudHolz')?.textContent || '0'}`;
}

// kleiner Drag für Debug-Fenster
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

// ---------- Vollbild ----------
async function reqFullscreen(node){
  const el = node || document.documentElement;
  try{
    if (document.fullscreenElement || document.webkitFullscreenElement){
      await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    }else{
      await (el.requestFullscreen?.({navigationUI:'hide'}) || el.webkitRequestFullscreen?.());
    }
  }catch(e){ /* iOS iPhone kann ablehnen; ignorieren */ }
}

// ---------- Bau-Panel ----------
function openBuildPanel(){
  buildOpen = true;
  ui.buildPanel.style.display = 'block';
  game.setBuildMenuOpen(true);
  // default: zuletzt gewähltes Tool wird angezeigt, aber bauen nur solange Panel offen ist
}
function closeBuildPanel(){
  buildOpen = false;
  ui.buildPanel.style.display = 'none';
  game.setBuildMenuOpen(false); // schaltet faktisch auf Zeiger/Pan
}

// Buttons im Panel
ui.buildPanel.addEventListener('click', (e)=>{
  const btn = e.target.closest('.tool');
  if (!btn) return;
  const tool = btn.getAttribute('data-tool');
  // Tool optisch markieren
  ui.buildPanel.querySelectorAll('.tool').forEach(t=>t.classList.toggle('active', t===btn));
  // Ins Spiel setzen
  game.setTool(tool);
  // Panel BLEIBT offen, damit bauen nur aktiv ist solange Panel offen
});
on(ui.buildClose,'click', closeBuildPanel);
on(ui.buildDone,'click', closeBuildPanel);

// Launcher
on(ui.buildBtn,'click', ()=>{
  if (buildOpen) closeBuildPanel(); else openBuildPanel();
});

// ---------- Start / Reset / Center / Debug ----------
on(ui.btnStart,'click', ()=>{
  ui.startCard.style.display = 'none';
  game.startGame({
    canvas: ui.canvas,
    onHUD: (k,v)=>{
      if (k==='Zoom') ui.hudZoom.textContent = v;
      if (k==='Tool') ui.hudTool.textContent = v;
      if (k==='Holz') ui.hudHolz.textContent = v;
      writeDebug();
    }
  });
  // initial ausrichten + erstes HQ
  game.center();
  game.placeInitialHQ();
  writeDebug();
});

on(ui.btnFs,'click', ()=> reqFullscreen(document.documentElement));
on(ui.btnFull,'click', ()=> reqFullscreen(document.documentElement));

on(ui.btnReset,'click', ()=>{
  location.href = location.pathname + '?v=' + Date.now();
});

on(ui.btnCenter,'click', ()=>{ game.center(); writeDebug(); });
on(ui.btnDebug,'click', ()=>{
  setDebug(!dbgEnabled);
  writeDebug();
});

// zyklisch Debug updaten
setInterval(writeDebug, 500);

// Bei Seitenstart: Debug aus, Bau-Panel zu
setDebug(false);
closeBuildPanel();
