// Siedler-Mini V15.4-pm — Boot/DOM/Fullscreen/Build-Sheet
import { game } from './game.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const el = {
  canvas: $('#canvas'),
  start:  $('#btnStart'),
  fsTop:  $('#btnFull'),
  fsMid:  $('#btnFs'),
  reset:  $('#btnReset'),
  center: $('#btnCenter'),
  debug:  $('#btnDebug'),
  hudZoom: $('#hudZoom'),
  hudTool: $('#hudTool'),
  startCard: $('#startCard'),
  buildSheet: $('#buildSheet'),
  buildOpen: $('#btnBuildOpen'),
  buildClose: $('#btnBuildClose'),
  buildTiles: $$('#buildGrid .tileBtn'),
  toolsSidebar: $('#toolsSidebar'),
  pointerBtn: document.querySelector('[data-tool="pointer"]'),
  eraseBtn: document.querySelector('[data-tool="erase"]'),
  dbg: $('#dbg'), dbgText: $('#dbgText'),
  placeUI: $('#placeUI'),
  placeOk: $('#btnPlaceOk'),
  placeCancel: $('#btnPlaceCancel'),
};

let isDebug = false;

// ---------- Fullscreen ----------
async function requestFS() {
  const root = document.documentElement;
  try {
    if (root.requestFullscreen) await root.requestFullscreen();
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
  } catch (e) { /* iOS kann ablehnen */ }
}
function exitFS(){
  if (document.fullscreenElement) document.exitFullscreen?.();
  else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
}

// ---------- Build Sheet ----------
function openBuildSheet(){ el.buildSheet.classList.add('open'); }
function closeBuildSheet(){
  el.buildSheet.classList.remove('open');
  // Beim Schließen standardmäßig auf Zeiger zurück
  game.setTool('pointer');
  markTool('pointer');
}

function markTool(name){
  // Sidebar
  $$('#toolsSidebar .btn').forEach(b=>b.classList.remove('active'));
  if (name==='pointer') el.pointerBtn?.classList.add('active');
  if (name==='erase')   el.eraseBtn?.classList.add('active');
}

// ---------- Debug ----------
function setDebug(on){
  isDebug = on;
  el.dbg.style.display = isDebug ? 'block' : 'none';
}
function updateDebug(msgObj){
  if (!isDebug) return;
  el.dbgText.textContent = JSON.stringify(msgObj, null, 2);
}

// ---------- Start / Reset ----------
function doStart(){
  el.startCard.style.display='none';
  game.startGame({
    canvas: el.canvas,
    onHUD: (k,v)=>{
      if (k==='Zoom') el.hudZoom.textContent = v;
      if (k==='Tool') el.hudTool.textContent = v;
    },
    onDebug: updateDebug,
    uiPlaceShow: (sx,sy,valid)=>{
      // Position der ✔/✖ UI – leicht rechts oben vom Finger
      el.placeUI.style.display='flex';
      el.placeUI.style.left = Math.round(sx+12)+'px';
      el.placeUI.style.top  = Math.round(sy-12)+'px';
      el.placeOk.disabled = !valid;
    },
    uiPlaceHide: ()=>{
      el.placeUI.style.display='none';
    }
  });
}
function doReset(){
  location.reload();
}

// ---------- Wire UI ----------
el.start?.addEventListener('click', doStart);
el.reset?.addEventListener('click', doReset);
el.fsTop?.addEventListener('click', requestFS);
el.fsMid?.addEventListener('click', requestFS);
el.center?.addEventListener('click', ()=>game.center());
el.debug?.addEventListener('click', ()=>setDebug(!isDebug));

// Tools (Sidebar)
el.pointerBtn?.addEventListener('click', ()=>{ game.setTool('pointer'); markTool('pointer'); });
el.eraseBtn?.addEventListener('click',   ()=>{ game.setTool('erase');   markTool('erase'); });

// Build-Sheet open/close
el.buildOpen?.addEventListener('click', openBuildSheet);
el.buildClose?.addEventListener('click', closeBuildSheet);

// Build-Tiles → setzen das Build-Tool + Objekt-Typ
el.buildTiles.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const type = btn.getAttribute('data-build');
    // Schließen wir das Sheet, wechseln ins "build(type)"-Tool
    closeBuildSheet();
    game.setBuildMode(type); // zeigt Ghost, wartet auf ✔/✖
    markTool(null);
  });
});

// ✔/✖ (Platzierung bestätigen/abbrechen)
el.placeOk.addEventListener('click', ()=>game.confirmBuild());
el.placeCancel.addEventListener('click', ()=>game.cancelBuild());

// Doppeltipp auf Startkarte → Vollbild
$('#startCard')?.addEventListener('dblclick', requestFS);

// Resize passt Canvas an
addEventListener('resize', ()=>game.resize?.());
addEventListener('orientationchange', ()=>setTimeout(()=>game.resize?.(), 250));
document.addEventListener('fullscreenchange', ()=>game.resize?.());
document.addEventListener('webkitfullscreenchange', ()=>game.resize?.());
