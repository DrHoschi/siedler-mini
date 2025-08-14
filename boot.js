// --------- DOM ---------
const canvas = document.getElementById('game');
const startOverlay = document.getElementById('startOverlay');

// HUD helpers
const hud = {
  wood:  document.querySelector('#hud-wood span'),
  stone: document.querySelector('#hud-stone span'),
  food:  document.querySelector('#hud-food span'),
  gold:  document.querySelector('#hud-gold span'),
  carrier: document.querySelector('#hud-carrier span'),
  tool:  document.querySelector('#hud-tool span'),
  zoom:  document.querySelector('#hud-zoom span'),
};

// Tool buttons
const btns = {
  pointer: document.getElementById('btnPointer'),
  road:    document.getElementById('btnRoad'),
  hq:      document.getElementById('btnHQ'),
  lumber:  document.getElementById('btnLumber'),
  depot:   document.getElementById('btnDepot'),
  erase:   document.getElementById('btnErase'),
};

// Utils
const centerBtn = document.getElementById('centerBtn');
const debugBtn  = document.getElementById('debugBtn');
const fsBtn     = document.getElementById('fsBtn');
const fsBtn2    = document.getElementById('fsBtn2');
const startBtn  = document.getElementById('startBtn');
const resetBtn  = document.getElementById('resetBtn');

// --------- Mobile / iOS Fixes ---------
function applyVhFix(){
  document.documentElement.style.setProperty('--vh-px', `${window.innerHeight}px`);
}
applyVhFix();
window.addEventListener('resize', applyVhFix);

// Safari: Pinch-/Gesten dem Browser verbieten, damit das Spiel sie bekommt
document.addEventListener('gesturestart',  e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend',    e => e.preventDefault());
canvas.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive:false });

// Doppel-Tap toggelt Vollbild
function toggleFullscreen(){
  if (document.fullscreenElement) { document.exitFullscreen(); }
  else { (document.documentElement.requestFullscreen?.call(document.documentElement)); }
}
let lastTap = 0;
canvas.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTap < 300) toggleFullscreen();
  lastTap = now;
}, { passive:true });

fsBtn?.addEventListener('click', toggleFullscreen);
fsBtn2?.addEventListener('click', toggleFullscreen);

// --------- Spiel-Integration ---------
// Wir versuchen flexibel, die Spiel-API zu finden (ESM oder global window.game).
let gameAPI = null;
let startGameFn = null;

async function loadGameModule(){
  try {
    // Versuche ESM ./game.js zu laden
    const mod = await import('./game.js');
    // mögliche Varianten: export function startGame, export default { startGame }, window.game.startGame
    startGameFn = mod.startGame || mod.default?.startGame || window.game?.startGame;
    gameAPI     = mod.game || mod.default || window.game || null;
  } catch (err) {
    // Fallback: global
    startGameFn = window.game?.startGame;
    gameAPI     = window.game || null;
  }
}

function setActiveTool(name){
  Object.values(btns).forEach(b => b.classList.remove('active'));
  const map = { pointer:'pointer', road:'road', hq:'hq', lumber:'lumber', depot:'depot', erase:'erase' };
  const id = ({pointer:'btnPointer', road:'btnRoad', hq:'btnHQ', lumber:'btnLumber', depot:'btnDepot', erase:'btnErase'})[name];
  document.getElementById(id)?.classList.add('active');
  hud.tool.textContent = ({
    pointer:'Zeiger', road:'Straße', hq:'HQ', lumber:'Holzfäller', depot:'Depot', erase:'Abriss'
  })[name] || name;
  try { (gameAPI?.setTool || window.game?.setTool)?.(map[name] || name); } catch {}
}

// HUD-Update, das vom Spiel aufgerufen werden kann
function onHUD(key, val){
  const k = String(key).toLowerCase();
  if (hud[k]) hud[k].textContent = String(val);
  if (k === 'zoom') hud.zoom.textContent = `${Number(val).toFixed(2)}x`;
}

// Start-Logik
async function start(){
  if (!startGameFn) await loadGameModule();

  const opts = {
    canvas,
    DPR: window.devicePixelRatio || 1,
    onHUD, // Spiel ruft z.B. onHUD('wood', 12)
  };

  if (typeof startGameFn !== 'function'){
    alert("Startfehler: game.startGame(opts) fehlt oder ist keine Funktion.");
    return;
  }

  try {
    await startGameFn(opts);
    window.dispatchEvent(new Event('game-started')); // für externe Hooks
  } catch (err){
    console.error(err);
    alert("Startfehler: " + (err?.message || err));
    return;
  }

  // Overlay aus & Defaults setzen
  startOverlay.style.display = 'none';
  setActiveTool('pointer');

  // Karte sicher zentrieren, falls die Kamera off-screen startet
  try { (gameAPI?.center || window.game?.center)?.(); } catch {}
}

// --------- Events verdrahten ---------
startBtn?.addEventListener('click', start);

resetBtn?.addEventListener('click', () => {
  try { localStorage.clear(); } catch {}
  location.reload();
});

centerBtn?.addEventListener('click', () => {
  try { (gameAPI?.center || window.game?.center)?.(); } catch {}
});

debugBtn?.addEventListener('click', () => {
  try { (gameAPI?.toggleDebug || window.game?.toggleDebug)?.(); } catch {}
});

// Tools
btns.pointer?.addEventListener('click', () => setActiveTool('pointer'));
btns.road?.addEventListener('click',    () => setActiveTool('road'));
btns.hq?.addEventListener('click',      () => setActiveTool('hq'));
btns.lumber?.addEventListener('click',  () => setActiveTool('lumber'));
btns.depot?.addEventListener('click',   () => setActiveTool('depot'));
btns.erase?.addEventListener('click',   () => setActiveTool('erase'));

// Kleines QoL: beim echten Spielstart Tool sicher auf Zeiger
window.addEventListener('game-started', () => {
  setActiveTool('pointer');
});
