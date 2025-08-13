// boot.js – verdrahtet Start/Vollbild/Reset und ruft main.run()

const $ = (sel) => document.querySelector(sel);

function isFS(){ return document.fullscreenElement || document.webkitFullscreenElement; }
async function reqFS(){
  const el = document.documentElement;
  if (!el.requestFullscreen) return el.webkitRequestFullscreen?.();
  return el.requestFullscreen();
}
async function exitFS(){
  if (document.exitFullscreen) return document.exitFullscreen();
  return document.webkitExitFullscreen?.();
}
function toggleFS(){ return isFS() ? exitFS() : reqFS(); }

function showHUD(show){
  $('#uiBar').style.opacity = show ? '0.95' : '0';
}

// Platzhalter (bis main.run das Spiel übernimmt)
function drawPlaceholder(canvas){
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.clientWidth * DPR;
  const h = canvas.clientHeight * DPR;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,w,h);

  // Grid
  const step = 96 * DPR;
  ctx.globalAlpha = .18;
  ctx.strokeStyle = '#2b3b53';
  for (let x = (w%step); x < w; x += step){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
  }
  for (let y = (h%step); y < h; y += step){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // HQ Platzhalter
  const rw = Math.min(420*DPR, w*0.4), rh = Math.min(220*DPR, h*0.22);
  const cx = w/2 - rw/2, cy = h/2 - rh/2 + 40*DPR;
  ctx.fillStyle = '#2ba14a';
  ctx.fillRect(cx, cy, rw, rh);

  // Text
  ctx.fillStyle = '#cfe3ff';
  ctx.font = `${Math.max(28*DPR, 24*DPR)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillText('HQ (Platzhalter)', Math.max(16*DPR, cx - 80*DPR), cy - 18*DPR);
}

// einfache Resize-Schleife (auch im Overlay)
(function keepAlive(){
  const canvas = $('#game');
  const onResize = () => drawPlaceholder(canvas);
  window.addEventListener('resize', onResize, { passive:true });
  onResize();
})();

async function start(){
  try{
    showHUD(true);
    const mod = await import('./main.js?v=14.4');
    if (!mod?.default?.run) throw new Error('main.run() wurde nicht gefunden (Export fehlt?).');
    await mod.default.run();
    // Overlay weg
    $('#startOverlay').style.display = 'none';
  }catch(err){
    $('#startOverlay').style.display = ''; // sichtbar lassen
    alert('Startfehler: ' + (err?.message || err));
    console.error(err);
  }
}

// Buttons
$('#startBtn').onclick = start;
$('#fsBtn').onclick = toggleFS;
$('#btnFS').onclick = toggleFS;
$('#resetBtn').onclick = () => location.reload();

// Doppeltipp => Vollbild
{
  let last = 0;
  $('#game').addEventListener('pointerdown', () => {
    const t = performance.now();
    if (t - last < 350) toggleFS();
    last = t;
  }, {passive:true});
}
