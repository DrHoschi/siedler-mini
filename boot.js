// boot.js – verdrahtet Start/Vollbild/Reset und ruft main.run()
function $(sel){ return document.querySelector(sel); }

function isFullScreen(){
  return document.fullscreenElement || document.webkitFullscreenElement;
}
async function requestFS(){
  const el = document.documentElement;
  if (!el.requestFullscreen) return el.webkitRequestFullscreen?.();
  return el.requestFullscreen();
}
async function exitFS(){
  if (document.exitFullscreen) return document.exitFullscreen();
  return document.webkitExitFullscreen?.();
}
function toggleFS(){ isFullScreen() ? exitFS() : requestFS(); }

function showHUD(show){
  $('#uiBar').style.opacity = show ? '0.95' : '0';
}

// Platzhalter zeichnen (bis main.run das Spiel übernimmt)
function drawPlaceholder(){
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * DPR);
  const h = Math.floor(canvas.clientHeight * DPR);
  if (w===canvas.width && h===canvas.height) {
    ctx.clearRect(0,0,w,h);
  } else {
    canvas.width = w; canvas.height = h;
  }
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);

  // dezentes Grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  const step = Math.round(96*DPR);
  for (let y=step; y<h; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  for (let x=step; x<w; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  ctx.restore();

  // HQ Platzhalter
  ctx.fillStyle = '#2aa149';
  const rw = Math.min(w*0.35, 560*DPR), rh = Math.min(h*0.20, 300*DPR);
  ctx.fillRect(Math.round(w*0.32), Math.round(h*0.34), rw, rh);
  ctx.fillStyle = '#e5f0ff';
  ctx.font = `${Math.round(64*DPR)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.fillText('HQ (Platzhalter)', Math.round(w*0.18), Math.round(h*0.28));
}

// Start/FS/Reset Buttons
window.addEventListener('DOMContentLoaded', () => {
  drawPlaceholder();

  $('#fsBtn')?.addEventListener('click', toggleFS);
  $('#fsBtnTop')?.addEventListener('click', toggleFS);
  $('#resetBtn')?.addEventListener('click', () => location.reload());

  $('#startBtn')?.addEventListener('click', async () => {
    try{
      if (!window.main || typeof window.main.run!=='function') {
        throw new Error('main.run() wurde nicht gefunden (Export fehlt?).');
      }
      // HUD sichtbar
      showHUD(true);
      // Game starten
      await window.main.run();
      // Overlay schließen
      $('#startOverlay').style.display = 'none';
    }catch(err){
      showHUD(true);
      alert(`Startfehler: ${err.message || err}`);
      console.error(err);
    }
  });

  // Canvas resize/placeholder bis echtes Game übernimmt
  window.addEventListener('resize', drawPlaceholder);
});
