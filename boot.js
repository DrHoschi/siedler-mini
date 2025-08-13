// verdrahtet Start/Vollbild/Reset und ruft main.run()

const $ = (sel) => document.querySelector(sel);

function isFS() { return document.fullscreenElement || document.webkitFullscreenElement }
async function reqFS() {
  const el = document.documentElement;
  if (!el.requestFullscreen) return el.webkitRequestFullscreen?.();
  return el.requestFullscreen();
}
async function exitFS() {
  if (document.exitFullscreen) return document.exitFullscreen();
  return document.webkitExitFullscreen?.();
}
function toggleFS(){ isFS() ? exitFS() : reqFS() }

function showHUD(show) { $('#uiBar').style.opacity = show ? '0.95' : '0' }

function resizeCanvas(canvas){
  const DPR = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * DPR);
  const h = Math.floor(canvas.clientHeight * DPR);
  if (canvas.width !== w)  canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

function drawPlaceholder(ctx){
  const { width:w, height:h } = ctx.canvas;
  ctx.save();
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);

  // dezentes Raster
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  for (let y=0; y<h; y+=64) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke() }
  for (let x=0; x<w; x+=64) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke() }

  // Platzhalter HQ
  const s = Math.min(w,h)*0.28;
  const cx = (w-s)/2, cy = (h-s)/2;
  ctx.fillStyle = '#2f924a';
  ctx.fillRect(cx, cy, s, s*0.55);
  ctx.font = `${Math.max(18,s*0.22)}px system-ui, sans-serif`;
  ctx.fillStyle = '#e9f1ff';
  ctx.fillText('HQ (Platzhalter)', Math.max(16,cx-40), Math.max(40,cy-20));
  ctx.restore();
}

function wireTools(){
  const bar = $('#toolBar');
  bar?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn'); if (!btn) return;
    bar.querySelectorAll('.btn').forEach(b=>b.classList.toggle('active', b===btn));
    $('#hudTool').textContent = btn.dataset.tool;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  resizeCanvas(canvas);
  drawPlaceholder(ctx);

  // Buttons
  $('#fsBtn').onclick = toggleFS;
  $('#btnFS2').onclick = toggleFS;

  $('#resetBtn').onclick = () => {
    showHUD(false);
    resizeCanvas(canvas);
    drawPlaceholder(ctx);
  };

  $('#btnCenter').onclick = () => window.main?.centerMap?.();

  $('#startBtn').onclick = async () => {
    try{
      // Overlay zu & HUD an
      $('#startOverlay').style.display = 'none';
      showHUD(true);

      // Start
      await window.main.run({
        canvas,
        DPR: window.devicePixelRatio || 1,
        onHUD: (key,val)=>{
          const el = document.querySelector('#hud'+key);
          if (el) el.textContent = String(val);
        }
      });
    } catch(err){
      $('#startOverlay').style.display = '';
      showHUD(false);
      alert('Startfehler: ' + (err?.message || err));
      console.error(err);
    }
  };

  // Canvas‑Resize
  window.addEventListener('resize', () => {
    resizeCanvas(canvas);
    // beim Start zeichnet main.js selbst; davor: Platzhalter
    if ($('#startOverlay').style.display !== 'none') {
      const c = $('#game').getContext('2d');
      drawPlaceholder(c);
    }
  });

  // Tools aktivierbar
  wireTools();
});
