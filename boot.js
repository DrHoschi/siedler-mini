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
  zoom: 1, panX: 0, panY: 0,
  tool: 'pointer',
  running: false, debug: false,
  usingGameModule: false,
  pseudoFS: false,
};

/* ---------- Fullscreen Helpers (inkl. iOS Fallback) ---------- */
const fs = {
  supported(el = document.body){
    return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen);
  },
  async enter(el){
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!req) throw new Error('no fs api');
    const p = req.call(el, {navigationUI:'hide'});
    if (p && p.then) await p;
  },
  async exit(){
    const ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (ex) {
      const p = ex.call(document);
      if (p && p.then) await p;
    }
  },
  current(){
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  },
  async toggle(el){
    if (fs.current()) return fs.exit();
    return fs.enter(el);
  }
};

function togglePseudoFS(){
  state.pseudoFS = !state.pseudoFS;
  wrap.classList.toggle('pseudo-fs', state.pseudoFS);
  resizeCanvas(); requestFrame();
}

function attachFullscreen(){
  const handler = async (e)=>{
    e.preventDefault();
    if (fs.supported(wrap)) {
      try { await fs.toggle(wrap); }
      catch { alert('Vollbild konnte nicht gestartet werden.'); }
    } else {
      // iPhone-Fallback: Pseudo-Fullscreen
      togglePseudoFS();
    }
  };
  btnFull?.addEventListener('click', handler);
  btnFs?.addEventListener('click', handler);

  // Doppel-Tap auf Spielfläche toggelt ebenfalls
  let lastTap = 0;
  gameEl.addEventListener('touchend', ()=>{
    const now = Date.now();
    if (now - lastTap < 300) {
      if (fs.supported(wrap)) { fs.toggle(wrap).catch(()=>{}); }
      else { togglePseudoFS(); }
    }
    lastTap = now;
  }, {passive:true});
}
attachFullscreen();

/* ---------- Canvas sizing ---------- */
function resizeCanvas(){
  const r = gameEl.getBoundingClientRect();
  const dpr = state.DPR;
  const w = Math.max(1, Math.floor(r.width  * dpr));
  const h = Math.max(1, Math.floor(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
}
addEventListener('resize', resizeCanvas, {passive:true});
resizeCanvas();

/* ---------- Fallback Grid / Placeholder ---------- */
function drawGrid(){
  const {width, height} = canvas;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle = '#0b1628';
  ctx.fillRect(0,0,width,height);

  const step = Math.max(40, Math.round(80 * state.zoom)) * state.DPR * 0.5;
  ctx.strokeStyle = '#1b2a40';
  ctx.lineWidth = 1;

  const ox = (state.panX * state.DPR) % step;
  const oy = (state.panY * state.DPR) % step;

  ctx.beginPath();
  for (let x = ox; x <= width; x += step) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
  for (let y = oy; y <= height; y += step) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
  ctx.stroke();
}

/* ---------- Zoom & Pan ---------- */
function setZoom(next, cx, cy){
  const zMin = 0.5, zMax = 2.5;
  const prev = state.zoom;
  const z = Math.min(zMax, Math.max(zMin, next));
  if (z === prev) return;
  const k = z / prev;
  state.panX = cx - (cx - state.panX) * k;
  state.panY = cy - (cy - state.panY) * k;
  state.zoom = z;
  HUD.Zoom.textContent = `${z.toFixed(2)}x`;
  requestFrame();
}

let pointerDown=false, lastX=0, lastY=0, twoFinger=false, pinchDist=0;

gameEl.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const delta = Math.sign(e.deltaY) * 0.1;
  setZoom(state.zoom * (1 - delta), cx, cy);
}, {passive:false});

gameEl.addEventListener('pointerdown', (e)=>{
  pointerDown = true; lastX = e.clientX; lastY = e.clientY;
  gameEl.setPointerCapture?.(e.pointerId);
});
gameEl.addEventListener('pointermove', (e)=>{
  if (!pointerDown) return;
  if (state.tool === 'pointer') {
    state.panX += e.clientX - lastX;
    state.panY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    requestFrame();
  }
});
gameEl.addEventListener('pointerup', (e)=>{
  pointerDown = false; gameEl.releasePointerCapture?.(e.pointerId);
});

gameEl.addEventListener('touchstart', (e)=>{
  if (e.touches.length === 2) {
    twoFinger = true;
    const [a,b] = e.touches;
    pinchDist = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
  }
},{passive:true});
gameEl.addEventListener('touchmove', (e)=>{
  if (twoFinger && e.touches.length === 2) {
    e.preventDefault();
    const [a,b] = e.touches;
    const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const rect = canvas.getBoundingClientRect();
    const cx = ((a.clientX+b.clientX)/2) - rect.left;
    const cy = ((a.clientY+b.clientY)/2) - rect.top;
    if (pinchDist) setZoom(state.zoom * (d/pinchDist), cx, cy);
    pinchDist = d;
  }
},{passive:false});
gameEl.addEventListener('touchend', ()=>{
  if (twoFinger && event.touches?.length < 2) twoFinger = false;
},{passive:true});

/* ---------- Tool switching & actions ---------- */
function applyTool(name){
  state.tool = name;
  HUD.Tool.textContent =
    name==='pointer' ? 'Zeiger' :
    name==='road' ? 'Straße' :
    name==='hq' ? 'HQ' :
    name==='woodcutter' ? 'Holzfäller' :
    name==='depot' ? 'Depot' :
    name==='erase' ? 'Abriss' : name;
  gameApi?.setTool?.(name);
}
$('#tools')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-tool]');
  if (!btn) return;
  applyTool(btn.getAttribute('data-tool'));
});

btnCenter?.addEventListener('click', ()=>{
  state.panX = 0; state.panY = 0; state.zoom = 1;
  HUD.Zoom.textContent = '1.00x';
  gameApi?.center?.();
  requestFrame();
});
btnDebug?.addEventListener('click', ()=>{
  state.debug = !state.debug;
  gameApi?.setDebug?.(state.debug);
  requestFrame();
});
btnReset?.addEventListener('click', ()=>{
  if (gameApi?.reset) gameApi.reset();
  else location.reload();
});

/* ---------- Render-Loop ---------- */
let needFrame=false;
function requestFrame(){ if (!needFrame){ needFrame=true; requestAnimationFrame(frame); } }

function frame(){
  needFrame=false;
  if (!state.usingGameModule) {
    drawGrid();
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
    if (state.debug) drawGrid(); // Modul kann drüberzeichnen
  }
}

/* ---------- Start ---------- */
let gameApi=null;

async function start(){
  try {
    // Optionales Modul laden
    const mod = await import('./game.js?v=147m2').catch(()=>null);
    const api = mod && (mod.default || mod);
    if (api && typeof api.startGame === 'function') {
      state.usingGameModule = true;
      gameApi = api;
      api.startGame({
        canvas,
        DPR: state.DPR,
        onHUD: (k,v)=>{ const el = HUD[k]; if (el) el.textContent = String(v); },
        getView: ()=>({panX:state.panX, panY:state.panY, zoom:state.zoom}),
        setView: (p)=>{
          if (!p) return;
          if (p.panX!=null) state.panX=p.panX;
          if (p.panY!=null) state.panY=p.panY;
          if (p.zoom!=null){ state.zoom=p.zoom; HUD.Zoom.textContent=`${state.zoom.toFixed(2)}x`; }
          requestFrame();
        },
      });
    } else {
      state.usingGameModule = false; // Fallback
    }
    state.running = true;
    startCard?.remove();
    requestFrame();
  } catch (err) {
    alert('Startfehler: ' + (err?.message || String(err)));
  }
}

btnStart?.addEventListener('click', start);
startCard?.addEventListener('dblclick', start);

requestFrame();
