// Siedler‑Mini V15.1 – Boot/DOM/Wireup
import { game } from './game.js?v=15.1';

const els = {
  canvas: document.getElementById('game'),
  startOverlay: document.getElementById('startOverlay'),
  startBtn: document.getElementById('startBtn'),
  fsBtn: document.getElementById('fsBtn'),
  fsBtnTop: document.getElementById('fsBtnTop'),
  resetBtn: document.getElementById('resetBtn'),
  centerBtn: document.getElementById('centerBtn'),
  dbgBtn: document.getElementById('dbgBtn'),
  dbg: document.getElementById('dbg'),
  dbgOut: document.getElementById('dbgOut'),
  hudZoom: document.getElementById('hudZoom'),
  hudTool: document.getElementById('hudTool'),
  tools: document.getElementById('tools'),
};

function logDbg(obj){
  els.dbgOut.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

function toggleDebug(){
  const s = getComputedStyle(els.dbg).display;
  els.dbg.style.display = (s === 'none') ? 'block' : 'none';
}

// Draggable Debug
(() => {
  let dragging = false, sx=0, sy=0, left=10, bottom=10;
  const el = els.dbg;
  const header = el.querySelector('header');
  header.addEventListener('pointerdown', (e)=>{
    dragging = true; sx = e.clientX; sy = e.clientY;
    el.setPointerCapture?.(e.pointerId);
  });
  window.addEventListener('pointermove', (e)=>{
    if (!dragging) return;
    left += (e.clientX - sx);
    bottom -= (e.clientY - sy); // invert y
    sx = e.clientX; sy = e.clientY;
    el.style.left = `${Math.max(0,left)}px`;
    el.style.right = 'auto';
    el.style.bottom = `${Math.max(0,bottom)}px`;
    el.style.top = 'auto';
  });
  window.addEventListener('pointerup', ()=> dragging=false);
})();

// HUD bridge
function onHUD(k,v){
  if (k === 'Zoom' && els.hudZoom) els.hudZoom.textContent = v;
  if (k === 'Tool' && els.hudTool) els.hudTool.textContent = v;
}

// Fullscreen helper (iOS/Android/Desktop)
async function toggleFullscreen(){
  const d = document;
  const el = d.documentElement;
  try {
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch?.(()=>{});
    } else {
      (d.exitFullscreen?.() || d.webkitExitFullscreen?.())?.catch?.(()=>{});
    }
  } catch {}
}

els.fsBtn.addEventListener('click', toggleFullscreen);
els.fsBtnTop.addEventListener('click', toggleFullscreen);

els.resetBtn.addEventListener('click', ()=>{
  // simple reset = Seite neu laden (damit Cache‑State gleich bleibt)
  location.reload();
});

els.centerBtn.addEventListener('click', ()=>{
  game.center();
});

els.dbgBtn.addEventListener('click', ()=>{
  toggleDebug();
  logDbg(game.debugSnapshot());
});

// Tools wählen
els.tools.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-tool]');
  if (!btn) return;
  for (const b of els.tools.querySelectorAll('.btn')) b.classList.remove('active');
  btn.classList.add('active');
  game.setTool(btn.dataset.tool);
});

els.startBtn.addEventListener('click', ()=>{
  els.startOverlay.style.display = 'none';
  game.startGame({
    canvas: els.canvas,
    onHUD,
    onDebug: logDbg
  });
});

// Direkt DOM‑ready: nichts weiter – Start erst nach Klick
