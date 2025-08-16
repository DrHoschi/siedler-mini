/* Siedler‑Mini • ui.js
   Koppelt DOM <-> game.js. Enthält:
   - Start/Reset/Fullscreen Buttons
   - Bau-Menü (Pointer/HQ/Holzfäller/Depot/Abriss)
   - Debug-Panel (beweglich)
*/

import { game } from './game.js';

const $ = sel => document.querySelector(sel);

// Debug-Log in Panel ausgeben
function logger() {
  const logEl = $("#debugLog");
  return (msg) => {
    if (!logEl) return;
    const ts = new Date().toISOString().replace('T',' ').slice(0,19);
    logEl.textContent = `[${ts}] ${msg}\n` + logEl.textContent;
  };
}

const log = logger();

// ===== Start / Reset / FS =====
$("#btnStart").addEventListener("click", async ()=>{
  await start(true);
});
$("#btnStartFS").addEventListener("click", async ()=>{
  await tryFS();
  await start(true);
});
$("#btnReset").addEventListener("click", ()=>{
  location.reload();
});

async function start(hideOverlay){
  const canvas = $("#game");
  await game.startGame({
    canvas,
    onHUD:(k,v)=>{},  // HUD wird im game selbst gesetzt
    log
  });
  if (hideOverlay) $("#startOverlay").style.display="none";
}

async function tryFS(){
  game.toggleFullscreen();
}

// ===== HUD Buttons rechts =====
$("#btnCenter").addEventListener("click", ()=>{
  game.center({fit:true, padding: 80});
});
$("#btnFS").addEventListener("click", tryFS);

const dbg = $("#debug");
$("#btnDebug").addEventListener("click", ()=>{
  if (dbg.style.display==="none"){ dbg.style.display="block"; } else { dbg.style.display="none"; }
  game.toggleDebug();
});

// ===== Bau‑Menü =====
const tools = document.querySelectorAll("#buildMenu .tool");
tools.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    tools.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    game.setTool(btn.dataset.tool);
  });
});
// Zeiger initial aktiv markieren
$("#toolPointer").classList.add("active");

// ===== Debug Panel drag =====
(function makeDebugDraggable(){
  let dragging=false, sx=0, sy=0, startL=0, startT=0;

  const onDown = (e)=>{
    dragging=true; dbg.classList.add("dragging");
    sx = ("touches" in e)? e.touches[0].clientX : e.clientX;
    sy = ("touches" in e)? e.touches[0].clientY : e.clientY;
    // aktuelle Position lesen
    const rect = dbg.getBoundingClientRect();
    startL = rect.left; startT = rect.top;
  };
  const onMove = (e)=>{
    if (!dragging) return;
    const cx = ("touches" in e)? e.touches[0].clientX : e.clientX;
    const cy = ("touches" in e)? e.touches[0].clientY : e.clientY;
    const dx = cx - sx, dy = cy - sy;
    dbg.style.left = Math.max(6, startL + dx) + "px";
    dbg.style.top  = Math.max(6, startT + dy) + "px";
  };
  const onUp = ()=>{
    dragging=false; dbg.classList.remove("dragging");
  };

  dbg.addEventListener("mousedown", onDown);
  dbg.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);

  dbg.addEventListener("touchstart", onDown, {passive:true});
  dbg.addEventListener("touchmove", onMove, {passive:false});
  window.addEventListener("touchend", onUp, {passive:true});
})();

// ===== Doppel‑Tap auf Canvas für FS =====
$("#game").addEventListener("dblclick", ()=> tryFS());

// ===== Autostart: nur Overlay zeigen, bis Start gedrückt wurde =====
// (bewusst kein Autostart, damit iOS Touch/Audio/FS‑Policies eingehalten werden)
