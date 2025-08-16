// boot.js – V15.0.2: FS-Fallback + sanftere Pan/Zoom + Debug
import { createGame } from './main.js';
import { Fullscreen } from './fullscreen.js';

const $ = sel => document.querySelector(sel);

// DOM refs
const canvas   = $('#canvas');
const btnStart = $('#btnStart');
const btnFs    = $('#btnFs');
const btnReset = $('#btnReset');
const btnCenter= $('#btnCenter');
const btnDebug = $('#btnDebug');
const hudZoom  = $('#hudZoom');
const hudTool  = $('#hudTool');
const dbgWrap  = $('#dbg');
const dbgPre   = $('#dbgPre');

// Debug helper
const log = (m)=>{ dbgPre.textContent = `[${new Date().toLocaleTimeString()}] ${m}\n` + dbgPre.textContent; };
const err = (m)=>{ log('❌ ' + m); };

// Game erstellen
const game = createGame({
  canvas,
  onHUD: (k,v)=>{
    if (k==='Zoom') hudZoom.textContent = v;
    if (k==='Tool') hudTool.textContent = v;
  },
  onLog: log,
  onError: err
});

// Werkzeuge
document.querySelectorAll('#tools .btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('#tools .btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    game.setTool(b.dataset.tool);
  });
});

// Buttons
btnCenter.addEventListener('click', ()=>game.center());
btnDebug.addEventListener('click', ()=>{
  const vis = dbgWrap.style.display !== 'none';
  dbgWrap.style.display = vis ? 'none' : 'block';
  if (!vis) {
    log(`DPR=${window.devicePixelRatio || 1}, FS=${Fullscreen.activeMode()}, nativeFS=${Fullscreen.isNativeSupported()}`);
  }
});

// Fullscreen Handler (native oder Pseudo)
async function toggleFullscreen(){
  const mode = Fullscreen.activeMode();
  if (mode==='none'){
    const res = await Fullscreen.enter('#wrap');
    log(`Fullscreen enter: ${res.mode}`);
  } else {
    const res = await Fullscreen.exit();
    log(`Fullscreen exit: ${res.mode}`);
  }
}
btnFs.addEventListener('click', toggleFullscreen);

// Start / Reset
btnStart.addEventListener('click', ()=>{
  document.getElementById('startCard')?.remove();
  game.start();
  log('Spiel gestartet');
});
btnReset.addEventListener('click', ()=>{
  // Lokalen Save löschen und Seite neu laden
  try { localStorage.removeItem('siedler_v15'); } catch{}
  location.reload();
});

// Taste für schnelle Tests (optional)
window.addEventListener('keydown', (e)=>{
  if (e.key==='f') toggleFullscreen();
});

// iOS-Hinweis (nur Info)
const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
if (isiOS && !Fullscreen.isNativeSupported()){
  log('iOS erkannt: nutze Pseudo‑Fullscreen. Safari erlaubt kein echtes Fullscreen für Canvas/Div.');
}

// Kleinigkeit: Safari „pull to refresh“ vermeiden
window.addEventListener('touchmove', e=>{
  if (Fullscreen.activeMode()!=='none') e.preventDefault();
}, {passive:false});
