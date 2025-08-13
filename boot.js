// boot.js — Start/Vollbild/Reset verdrahten und main.run() aufrufen

function $(sel){ return document.querySelector(sel); }

function isFull(){ return document.fullscreenElement || document.webkitFullscreenElement; }
async function reqFS(){
  const el = document.documentElement;
  if (!el.requestFullscreen) return el.webkitRequestFullscreen?.();
  return el.requestFullscreen();
}
async function exitFS(){
  if (document.exitFullscreen) return document.exitFullscreen();
  return document.webkitExitFullscreen?.();
}
async function toggleFS(){ return isFull() ? exitFS() : reqFS(); }

function showHUD(show){
  $('#uiBar').style.opacity = show ? '0.95' : '0';
}

// Platzhalter falls game nicht lädt
function drawPlaceholder(ctx, DPR){
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.save();
  ctx.scale(DPR, DPR);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  const step = 64;
  for (let y=-step; y<h+step; y+=step){
    for (let x=-step; x<w+step; x+=step){
      ctx.beginPath();
      ctx.moveTo(x, y+step/2);
      ctx.lineTo(x+step/2, y);
      ctx.lineTo(x+step, y+step/2);
      ctx.lineTo(x+step/2, y+step);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#9bb7ff';
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('Warte auf Start …', 16, 28);
  ctx.restore();
}

function getDPR(){ return Math.min(3, window.devicePixelRatio || 1); }
function resizeCanvas(canvas){
  const DPR = getDPR();
  const w = Math.floor(canvas.clientWidth  * DPR);
  const h = Math.floor(canvas.clientHeight * DPR);
  if (canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    drawPlaceholder(ctx, DPR);
  }
}

async function run(){
  const canvas = $('#game');
  if (!canvas){ alert('Startfehler: Canvas fehlt.'); return; }

  // Initial zeichnen
  resizeCanvas(canvas);

  // Buttons
  $('#fsBtn')?.addEventListener('click', toggleFS);
  $('#fsBtnTop')?.addEventListener('click', toggleFS);
  $('#resetBtn')?.addEventListener('click', () => location.reload());

  // START
  $('#startBtn')?.addEventListener('click', async () => {
    try{
      const DPR = getDPR();
      // dynamisch laden – kein weiterer Import in game.js nötig
      const mod = await import('./game.js?v=14.3-safe');
      if (typeof mod.startGame !== 'function') throw new Error('game.startGame(opts) fehlt oder ist keine Funktion');
      // HUD sichtbar
      showHUD(true);
      // Overlay ausblenden
      $('#startOverlay').style.display = 'none';
      // Spiel starten
      await mod.startGame({
        canvas,
        DPR,
        onHUD: (k,v)=>{ const el = document.querySelector('#hud'+k); if (el) el.textContent = v; },
      });
    }catch(err){
      // Overlay wieder zeigen, Fehler popup
      $('#startOverlay').style.display = '';
      showHUD(false);
      alert(`Startfehler: ${err.message || err}`);
      console.error(err);
    }
  });

  // Resize
  window.addEventListener('resize', () => resizeCanvas(canvas));
}

window.main = { run };
