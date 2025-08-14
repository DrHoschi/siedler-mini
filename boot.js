/* Siedler-Mini – Bootstrapping V14.7 (mobil) */

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const wrap   = $('#wrap');
const gameEl = $('#game');
const canvas = $('#canvas');

if (!canvas || typeof canvas.getContext !== 'function') {
  alert('Startfehler: Canvas nicht gefunden (id="canvas").');
  throw new Error('Canvas missing');
}
const ctx = canvas.getContext('2d');

const HUD = {
  Holz:    $('#hudHolz'),
  Stein:   $('#hudStein'),
  Nahrung: $('#hudNahrung'),
  Gold:    $('#hudGold'),
  Traeger: $('#hudTraeger'),
  Tool:    $('#hudTool'),
  Zoom:    $('#hudZoom'),
};

const startCard = $('#startCard');
const btnStart  = $('#btnStart');
const btnFs     = $('#btnFs');
const btnReset  = $('#btnReset');

const btnFull   = $('#btnFull');
const btnCenter = $('#btnCenter');
const btnDebug  = $('#btnDebug');

const state = {
  DPR: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
  zoom: 1,
  panX: 0, panY: 0,
  tool: 'pointer',
  running: false,
  debug: false,
  usingGameModule: false,
};

/* ---------- Fullscreen Helpers (inkl. iOS Safari) ---------- */
const fs = {
  is() {
    return document.fullscreenElement ||
           document.webkitFullscreenElement ||
           document.msFullscreenElement || null;
  },
  async enter(el) {
    const req = el.requestFullscreen
              || el.webkitRequestFullscreen
              || el.msRequestFullscreen;
    if (!req) throw new Error('Fullscreen API nicht verfügbar');
    const p = req.call(el, {navigationUI:'hide'});
    if (p && typeof p.then === 'function') await p;
  },
  async exit() {
    const ex = document.exitFullscreen
            || document.webkitExitFullscreen
            || document.msExitFullscreen;
    if (fs.is() && ex) {
      const p = ex.call(document);
      if (p && typeof p.then === 'function') await p;
    }
  },
  async toggle(el){ return fs.is() ? fs.exit() : fs.enter(el); },
};

function attachFullscreen() {
  const onClick = async (e)=>{
    e.preventDefault();
    try { await fs.toggle(wrap); }
    catch {
      alert('Vollbild wird von diesem Browser/Modus nicht unterstützt.\n' +
            'Tipp: iOS Safari ab iOS 16 oder Seite zum Homescreen hinzufügen.');
    }
  };
  btnFull?.addEventListener('click', onClick);
  btnFs?.addEventListener('click', onClick);

  // Double-Tap auf die Karte: Fullscreen toggle
  let lastTap = 0;
  gameEl.addEventListener('touchend', async ()=>{
    const now = Date.now();
    if (now - lastTap < 300) { try { await fs.toggle(wrap); } catch {} }
    lastTap = now;
  }, {passive:true});
}
attachFullscreen();

/* ---------- Canvas sizing ---------- */
function resizeCanvas() {
  const r = gameEl.getBoundingClientRect();
  const dpr = state.DPR;
  const w = Math.max(1, Math.floor(r.width  * dpr));
  const h = Math.max(1, Math.floor(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
  }
}
window.addEventListener('resize', resizeCanvas, {passive:true});
resizeCanvas();

/* ---------- Grid (für Fallback & Debug) ---------- */
function drawGrid() {
  const {width, height} = canvas;
  ctx.clearRect(0,0,width,height);

  // Hintergrund
  ctx.fillStyle = '#0b1628';
  ctx.fillRect(0,0,width,height);

  const step = Math.max(40, Math.round(80 * state.zoom)) * state.DPR * 0.5;
  ctx.strokeStyle = '#1b2a40';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;

  const ox = (state.panX * state.DPR) % step;
  const oy = (state.panY * state.DPR) % step;

  ctx.beginPath();
  for (let x = ox; x <= width; x += step) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
  for (let y = oy; y <= height; y += step) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
  ctx.stroke();
}

/* ---------- Pointer & Zoom ---------- */
let pointerDown = false;
let lastX = 0, lastY = 0;
let pinchDist = 0;
let twoFinger = false;

function setZoom(next, cx, cy) {
  const zMin = 0.5, zMax = 2.5;
  const prev = state.zoom;
  const z = Math.min(zMax, Math.max(zMin, next));
  if (z === prev) return;
  // Zoomen um Fokuspunkt (cx,cy) – verschiebt Pan so, dass der Punkt stehen bleibt
  const k = z / prev;
  state.panX = cx - (cx - state.panX) * k;
  state.panY = cy - (cy - state.panY) * k;
  state.zoom = z;
  HUD.Zoom.textContent = `${z.toFixed(2)}x`;
  requestFrame();
}

gameEl.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left);
  const cy = (e.clientY - rect.top);
  const delta = Math.sign(e.deltaY) * 0.1;
  setZoom(state.zoom * (1 - delta), cx, cy);
}, {passive:false});

gameEl.addEventListener('pointerdown', (e)=>{
  pointerDown = true;
  lastX = e.clientX; lastY = e.clientY;
  gameEl.setPointerCapture(e.pointerId);
});
gameEl.addEventListener('pointermove', (e)=>{
  if (!pointerDown) return;
  if (state.tool === 'pointer') {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    state.panX += dx;
    state.panY += dy;
    lastX = e.clientX; lastY = e.clientY;
    requestFrame();
  }
});
gameEl.addEventListener('pointerup', (e)=>{
  pointerDown = false;
  gameEl.releasePointerCapture?.(e.pointerId);
});

/* Touch Pinch */
gameEl.addEventListener('touchstart', (e)=>{
  if (e.touches.length === 2) {
    twoFinger = true;
    const [a,b] = e.touches;
    pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
},{passive:true});

gameEl.addEventListener('touchmove', (e)=>{
  if (twoFinger && e.touches.length === 2) {
    e.preventDefault();
    const [a,b] = e.touches;
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const rect = canvas.getBoundingClientRect();
    const cx = ((a.clientX + b.clientX)/2) - rect.left;
    const cy = ((a.clientY + b.clientY)/2) - rect.top;
    if (pinchDist) {
      const factor = d / pinchDist;
      setZoom(state.zoom * factor, cx, cy);
    }
    pinchDist = d;
  }
},{passive:false});

gameEl.addEventListener('touchend', ()=>{
  if (twoFinger && event.touches?.length < 2) twoFinger = false;
},{passive:true});

/* ---------- Tool Switching ---------- */
function applyTool(name) {
  state.tool = name;
  HUD.Tool.textContent = (
    name==='pointer' ? 'Zeiger' :
    name==='road' ? 'Straße' :
    name==='hq' ? 'HQ' :
    name==='woodcutter' ? 'Holzfäller' :
    name==='depot' ? 'Depot' :
    name==='erase' ? 'Abriss' : name
  );
  if (gameApi?.setTool) gameApi.setTool(name);
}
$('#tools')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-tool]');
  if (!btn) return;
  applyTool(btn.getAttribute('data-tool'));
});

/* ---------- Center, Debug, Reset ---------- */
btnCenter?.addEventListener('click', ()=>{
  state.panX = 0; state.panY = 0; state.zoom = 1;
  HUD.Zoom.textContent = '1.00x';
  if (gameApi?.center) gameApi.center();
  requestFrame();
});
btnDebug?.addEventListener('click', ()=>{
  state.debug = !state.debug;
  if (gameApi?.setDebug) gameApi.setDebug(state.debug);
  requestFrame();
});
btnReset?.addEventListener('click', ()=>{
  if (gameApi?.reset) { gameApi.reset(); }
  else { location.reload(); }
});

/* ---------- Start ---------- */
let needFrame = false;
function requestFrame(){ if (!needFrame){ needFrame=true; requestAnimationFrame(frame); } }

function frame(){
  needFrame = false;
  if (!state.usingGameModule) {
    drawGrid();
    // Platzhalter-HQ als visuelles Feedback
    const {width, height} = canvas;
    const cx = width/2 + state.panX*state.DPR;
    const cy = height/2 + state.panY*state.DPR;
    const w = 360*state.DPR*state.zoom, h = 220*state.DPR*state.zoom;

    ctx.fillStyle = '#2aa351';
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
    ctx.fillStyle = '#cfe3ff';
    ctx.font = `${Math.max(14, 48*state.DPR*state.zoom)}px system-ui`;
    ctx.textBaseline = 'top';
    ctx.fillText('HQ (Platzhalter)', cx - w/2 + 16*state.DPR, cy - h/2 + 12*state.DPR);
  } else {
    // Wenn das Game-Modul selbst rendert, kümmern wir uns nur optional ums Raster im Debug
    if (state.debug) { drawGrid(); }
  }
}

function showError(msg){
  alert('Startfehler: ' + msg);
}

let gameApi = null;

async function start(){
  try {
    // Versuche game.js zu laden (optional)
    const mod = await import('./game.js?v=147m1').catch(()=>null);
    const api = mod && (mod.default || mod);
    const hasStart = api && typeof api.startGame === 'function';

    // Canvas-Größe/DPR ins Spiel geben
    const opts = {
      canvas,
      DPR: state.DPR,
      onHUD: (k,v)=>{
        const el = HUD[k];
        if (el) el.textContent = String(v);
      },
      getView: () => ({ panX: state.panX, panY: state.panY, zoom: state.zoom }),
      setView: (p)=>{ if (!p) return; if (p.panX!=null) state.panX=p.panX; if (p.panY!=null) state.panY=p.panY;
                       if (p.zoom!=null){ state.zoom=p.zoom; HUD.Zoom.textContent = `${state.zoom.toFixed(2)}x`; }
                       requestFrame(); },
    };

    if (hasStart) {
      state.usingGameModule = true;
      gameApi = api;
      api.startGame(opts);
    } else {
      state.usingGameModule = false; // Fallback
    }

    state.running = true;
    startCard?.remove();
    requestFrame();
  } catch (err) {
    showError(err?.message || String(err));
  }
}

btnStart?.addEventListener('click', start);

/* Start auch bei Doppeltipp auf den Start-Dialog-Bereich */
startCard?.addEventListener('dblclick', start);

/* Initiales Redraw */
requestFrame();
