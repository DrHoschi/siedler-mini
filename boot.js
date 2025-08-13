// boot.js – verdrahtet Start/Vollbild/Reset und ruft game.startGame()

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function isFull() { return document.fullscreenElement || document.webkitFullscreenElement; }
async function reqFS() {
  const el = document.documentElement;
  if (!el.requestFullscreen) return el.webkitRequestFullscreen?.();
  return el.requestFullscreen();
}
async function exitFS() {
  if (document.exitFullscreen) return document.exitFullscreen();
  return document.webkitExitFullscreen?.();
}
function toggleFS(){ isFull() ? exitFS() : reqFS(); }

function showHUD(show){
  $('#uiBar').style.opacity = show ? '0.95' : '0';
}

function drawPlaceholder(ctx, canvas){
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.width, h = canvas.height;
  ctx.save();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);

  // dezentes Raster
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  const step = 64;
  for(let y = 0; y < h; y += step){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }

  // "HQ (Platzhalter)"
  ctx.fillStyle = '#2ea043';
  const rw = 240, rh = 140;
  ctx.fillRect((w/DPR - rw)/2, (h/DPR - rh)/2, rw, rh);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 40px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('HQ (Platzhalter)', (w/DPR)/2 - 240, (h/DPR)/2 - 100);
  ctx.restore();
}

// --- Buttons & Start ---
window.addEventListener('DOMContentLoaded', () => {
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  // erstes Bild (vor Start)
  const resize = () => {
    const DPR = window.devicePixelRatio || 1;
    canvas.width  = Math.floor(canvas.clientWidth  * DPR);
    canvas.height = Math.floor(canvas.clientHeight * DPR);
    drawPlaceholder(ctx, canvas);
  };
  resize(); window.addEventListener('resize', resize);

  $('#fsBtn').addEventListener('click', toggleFS);
  $('#fsBtnTop').addEventListener('click', toggleFS);
  $('#resetBtn').addEventListener('click', () => location.reload());

  $('#startBtn').addEventListener('click', async () => {
    try{
      showHUD(true);
      $('#startOverlay').style.display = 'none';
      // dynamisch laden, damit vorher garantiert keine Module nötig sind
      const game = await import('./game.js?v=14.3-safe3');
      await game.startGame({
        canvas,
        DPR: window.devicePixelRatio || 1,
        onHUD: (key, val) => {
          const el = document.querySelector('#hud'+key);
          if (el) el.textContent = String(val);
        }
      });
    }catch(err){
      // Overlay wieder zeigen & Fehler melden
      $('#startOverlay').style.display = '';
      showHUD(false);
      alert('Startfehler: ' + (err?.message || err));
      console.error(err);
    }
  });
});
