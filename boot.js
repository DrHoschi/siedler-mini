// boot.js — verdrahtet Start/Vollbild/Reset und ruft main.run()

function $(sel){ return document.querySelector(sel); }

function isFullscreen(){
  return document.fullscreenElement || document.webkitFullscreenElement;
}
async function requestFS(){
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
}
async function exitFS(){
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
}

function toggleFS(){ isFullscreen() ? exitFS() : requestFS(); }

function showHUD(show){
  $('#uiBar').style.opacity = show ? '0.95' : '0';
}

// Platzhalter zeichnen (bis main.run das Spiel übernimmt)
function drawPlaceholder(){
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = canvas.width = Math.floor(canvas.clientWidth * DPR);
  const h = canvas.height = Math.floor(canvas.clientHeight * DPR);

  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);

  // diagonales Raster – nur als visueller Platzhalter
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#1b2b40';
  const step = Math.round(40 * DPR);
  for (let y = -h; y < h*2; y += step){
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + w*0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#cfe3ff';
  ctx.font = `${Math.round(14*DPR)}px system-ui,-apple-system,Segoe UI,Roboto`;
  ctx.fillText('Platzhalter… (warte auf Start)', 12*DPR, 20*DPR);
}

function wireButtons(){
  // Buttons
  $('#fsBtn')?.addEventListener('click', toggleFS);
  $('#fsBtnTop')?.addEventListener('click', toggleFS);
  $('#resetBtn')?.addEventListener('click', () => {
    try { localStorage.clear(); } catch(e){}
    location.reload();
  });

  // Doppeltipp auf Startkarte -> Vollbild
  const overlay = $('#startOverlay');
  overlay?.addEventListener('dblclick', toggleFS);
  overlay?.addEventListener('touchstart', (ev)=>{
    const t = ev.timeStamp;
    if (!overlay.__lt) { overlay.__lt = t; return; }
    if (t - overlay.__lt < 260) toggleFS();
    overlay.__lt = t;
  }, {passive:true});

  // Start-Klick -> main.run()
  $('#startBtn')?.addEventListener('click', async ()=>{
    try{
      if (!window.main || typeof window.main.run !== 'function') {
        throw new Error("main.run() wurde nicht gefunden (Export fehlt?)");
      }
      await window.main.run();
      // Overlay ausblenden, HUD an
      $('#startOverlay').style.display = 'none';
      showHUD(true);
    }catch(err){
      alert('Startfehler:\n' + (err?.message||err));
      console.error(err);
    }
  });
}

function resizeCanvas(){
  const c = $('#game');
  if (!c) return;
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  c.width = Math.floor(c.clientWidth * DPR);
  c.height = Math.floor(c.clientHeight * DPR);
  drawPlaceholder();
}

window.addEventListener('resize', resizeCanvas, {passive:true});
window.addEventListener('orientationchange', resizeCanvas);

// Init nach DOM bereit
window.addEventListener('DOMContentLoaded', ()=>{
  wireButtons();
  resizeCanvas();
  showHUD(false);
});

// optional: API-Hook für "Zentrieren"-Button, falls main.centerMap bereitstellt
$('#centerBtn')?.addEventListener('click', ()=>{
  if (window.main && typeof window.main.centerMap === 'function') {
    window.main.centerMap();
  }
});
