// Siedler‑Mini V15 boot.js (robuste Start-Logik + iOS-Fullscreen-Fallback)
import { game } from './game.js?v=15.0.3';

const $ = s => document.querySelector(s);

const els = {
  canvas: $('#canvas') || $('#game canvas') || document.getElementById('game'),
  startCard: $('#startCard'),
  btnStart:  $('#btnStart'),
  btnFs:     $('#btnFs'),
  btnReset:  $('#btnReset'),
  btnFullHUD:  $('#btnFull'),     // HUD rechts
  btnCenter: $('#btnCenter'),
  btnDebug:  $('#btnDebug'),
  hudTool:   $('#hudTool'),
  hudZoom:   $('#hudZoom'),
};

function canFullscreen() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen);
}
async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) await el.msRequestFullscreen();
  } catch {}
}
function exitFullscreen() {
  const d = document;
  if (d.exitFullscreen) d.exitFullscreen();
  else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
}

// Debug Overlay beweglich halten
const dbg = {
  root: document.getElementById('dbgOverlay'),
  btn:  document.getElementById('dbgToggle'),
};
if (dbg.btn && dbg.root) {
  let dragging = false, sx=0, sy=0, ox=0, oy=0;
  dbg.btn.addEventListener('click', () => dbg.root.classList.toggle('open'));
  dbg.root.addEventListener('pointerdown', (e)=>{
    if (!e.target.closest('.drag')) return;
    dragging = true; sx=e.clientX; sy=e.clientY;
    const r = dbg.root.getBoundingClientRect(); ox=r.left; oy=r.top;
    dbg.root.setPointerCapture(e.pointerId);
  });
  dbg.root.addEventListener('pointermove', (e)=>{
    if (!dragging) return;
    const x = ox + (e.clientX - sx);
    const y = oy + (e.clientY - sy);
    dbg.root.style.left = Math.max(8, x) + 'px';
    dbg.root.style.top  = Math.max(8, y) + 'px';
  });
  dbg.root.addEventListener('pointerup', ()=>{ dragging=false; });
}

// Start-Button verdrahten (mit einmaliger Initialisierung)
let started = false;
async function startGame() {
  if (started) return;
  started = true;

  // Start Overlay schließen
  els.startCard?.remove();

  // Game starten
  await game.startGame({
    canvas: els.canvas,
    onHUD: (k,v)=>{
      if (k === 'Tool' && els.hudTool) els.hudTool.textContent = v;
      if (k === 'Zoom' && els.hudZoom) els.hudZoom.textContent = v;
    }
  });

  // Erstes HQ mittig platzieren & Kamera zentrieren (nur ein Mal)
  if (game.placeInitialHQ) game.placeInitialHQ();
  if (game.center) game.center();
}

// Buttons
els.btnStart?.addEventListener('click', startGame);
els.btnReset?.addEventListener('click', ()=>location.reload());
els.btnFs?.addEventListener('click', async ()=>{
  if (!canFullscreen()) return; // iOS iPhone in Safari: oft nicht erlaubt
  await enterFullscreen();
});
els.btnFullHUD?.addEventListener('click', async ()=>{
  if (!canFullscreen()) return;
  await enterFullscreen();
});
els.btnCenter?.addEventListener('click', ()=> game.center && game.center());
els.btnDebug?.addEventListener('click', ()=>{
  document.getElementById('dbgOverlay')?.classList.toggle('open');
});

// Doppeltipp auf Karte -> Fullscreen (falls erlaubt)
document.getElementById('game')?.addEventListener('dblclick', async ()=>{
  if (!canFullscreen()) return;
  await enterFullscreen();
});

// Sichtbare Version unten links loggen
console.log('Siedler‑Mini Boot', window.__SM_VER__ || '');
