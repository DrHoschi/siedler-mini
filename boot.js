// Siedler‑Mini V15.2 – Boot/DOM/Wireup + Device Profile + FS‑Stabilisierung
import { game } from './game.js?v=15.2';

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
const body = document.body;

function detectProfile(){
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints>1);
  const android = /Android/.test(ua);
  body.classList.toggle('ios', ios);
  body.classList.toggle('android', android);
  body.classList.toggle('desktop', !ios && !android);
  return { ios, android, desktop: !ios && !android };
}
const profile = detectProfile();

function onHUD(k,v){
  if (k === 'Zoom' && els.hudZoom) els.hudZoom.textContent = v;
  if (k === 'Tool' && els.hudTool) els.hudTool.textContent = v;
}
function logDbg(obj){
  els.dbgOut.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}
function toggleDebug(){
  const s = getComputedStyle(els.dbg).display;
  els.dbg.style.display = (s === 'none') ? 'block' : 'none';
}

// Debug verschiebbar
(()=> {
  let dragging=false, sx=0, sy=0, left=10, bottom=10;
  const panel = els.dbg, header = panel.querySelector('header');
  header.addEventListener('pointerdown', (e)=>{
    dragging=true; sx=e.clientX; sy=e.clientY; panel.setPointerCapture?.(e.pointerId);
  }, {passive:false});
  window.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    left += (e.clientX - sx);
    bottom -= (e.clientY - sy);
    sx=e.clientX; sy=e.clientY;
    panel.style.left = `${Math.max(0,left)}px`;
    panel.style.right = 'auto';
    panel.style.bottom = `${Math.max(0,bottom)}px`;
    panel.style.top = 'auto';
  }, {passive:false});
  window.addEventListener('pointerup', ()=> dragging=false, {passive:true});
})();

// Buttons: defaultPrevent, damit kein „falscher“ Browser‑Zoom o.ä.
function bindButton(el, fn){
  el?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); fn(); }, {passive:false});
  el?.addEventListener('pointerdown', (e)=>{ e.preventDefault(); e.stopPropagation(); }, {passive:false});
}

async function toggleFullscreen(){
  const d = document, el = d.documentElement;
  try{
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
    } else {
      await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
    }
  }catch{}
}

// Fullscreen‑Zustand verfolgen → Klasse + Game resetten (Captures/Gesten)
function onFullscreenChange(){
  const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  body.classList.toggle('fullscreen', fs);
  game.viewportReset();               // <— wichtig: Captures & Pointer leeren
  setTimeout(()=> game.resizeNow?.(), 0);
}

document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

// Wire Buttons
bindButton(els.fsBtn, toggleFullscreen);
bindButton(els.fsBtnTop, toggleFullscreen);
bindButton(els.resetBtn, ()=> location.reload());
bindButton(els.centerBtn, ()=> game.center());
bindButton(els.dbgBtn, ()=> { toggleDebug(); logDbg(game.debugSnapshot()); });

// Tools
els.tools.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-tool]');
  if (!btn) return;
  for (const b of els.tools.querySelectorAll('.btn')) b.classList.remove('active');
  btn.classList.add('active');
  game.setTool(btn.dataset.tool);
}, {passive:false});

// Start
bindButton(els.startBtn, ()=>{
  els.startOverlay.style.display = 'none';
  game.startGame({
    canvas: els.canvas,
    onHUD,
    onDebug: logDbg,
    profile
  });
});

// Beim Laden kurz Profil loggen
logDbg({profile});
