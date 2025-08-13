// boot.js (V14.4) – Start/Overlay/Vollbild/Reset + main.run()

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
async function toggleFS(){ isFullScreen() ? exitFS() : requestFS(); }

function showHUD(show){
  $('#uiBar').style.opacity = show ? '0.95' : '0';
}

// Platzhalter-Rendering (bis main.run übernimmt)
function drawPlaceholder(){
  const canvas = $('#game');
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = canvas.clientWidth|0, h = canvas.clientHeight|0;
  if (w===0 || h===0) return;
  if (canvas.width !== w*DPR || canvas.height !== h*DPR){
    canvas.width = w*DPR; canvas.height = h*DPR;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);

  // dezentes Grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  const step = 64;
  for (let y=0;y<h;y+=step){ ctx.beginPath(); ctx.moveTo(0,y+0.5); ctx.lineTo(w,y+0.5); ctx.stroke(); }
  for (let x=0;x<w;x+=step){ ctx.beginPath(); ctx.moveTo(x+0.5,0); ctx.lineTo(x+0.5,h); ctx.stroke(); }
  ctx.restore();

  // HQ Platzhalter
  ctx.fillStyle = '#2ea24b';
  const rW = Math.min(420, Math.floor(w*0.42));
  const rH = Math.min(180, Math.floor(h*0.22));
  ctx.fillRect((w-rW)/2, (h-rH)/2, rW, rH);

  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 48px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('HQ (Platzhalter)', Math.max(12,(w-rW)/2 - 20), Math.max(60,(h-rH)/2 - 18));
}

// Start-Sequenz
(async function initBoot(){
  const canvas = $('#game');
  drawPlaceholder();

  // Buttons
  $('#fsBtn').addEventListener('click', toggleFS);
  $('#fsStartBtn').addEventListener('click', toggleFS);
  $('#resetBtn').addEventListener('click', () => {
    try{ localStorage.removeItem('siedler-mini-save'); }catch(_){}
    location.reload();
  });

  // Doppeltipp auf Canvas → Vollbild
  let lastTap = 0;
  canvas.addEventListener('pointerup', () => {
    const t = performance.now();
    if (t - lastTap < 280) toggleFS();
    lastTap = t;
  }, {passive:true});

  // Zentrieren-Knopf (wird von main implementiert; hier nur Hook)
  $('#centerBtn').addEventListener('click', () => {
    if (window.main && typeof window.main.centerMap === 'function') {
      window.main.centerMap();
    }
  });

  // Tool-Buttons-UI (reines Styling; Logik macht main.js ebenfalls)
  const toolIds = ['toolPointer','toolRoad','toolHQ','toolLumber','toolDepot','toolBulldoze'];
  toolIds.forEach(id=>{
    $('#'+id).addEventListener('click', () => {
      toolIds.forEach(x => $('#'+x).classList.remove('active'));
      $('#'+id).classList.add('active');
      $('#hudTool').textContent =
        id==='toolPointer' ? 'Zeiger' :
        id==='toolRoad'    ? 'Straße' :
        id==='toolHQ'      ? 'HQ' :
        id==='toolLumber'  ? 'Holzfäller' :
        id==='toolDepot'   ? 'Depot' :
        'Abriss';
    });
  });

  // Debug-Toggle – Übergabe an main (falls vorhanden)
  $('#debugBtn').addEventListener('click', ()=>{
    if (window.main && typeof window.main.toggleDebug==='function'){
      window.main.toggleDebug();
    }
  });

  // Responsive Canvas, solange das Spiel noch nicht läuft
  function resize(){ drawPlaceholder(); }
  window.addEventListener('resize', resize);

  // Start
  $('#startBtn').addEventListener('click', startGame);
  async function startGame(){
    try{
      showHUD(false);
      // main dynamisch laden
      const mod = await import('./main.js?v=14.4');
      if (!mod || typeof mod.run !== 'function') throw new Error('main.run() wurde nicht gefunden (Export fehlt?).');

      window.main = mod; // API für Buttons (center/debug)
      await mod.run({
        canvas,
        DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
        onHUD: (key,val)=>{
          const el = document.querySelector('#hud'+key);
          if (el) el.textContent = (key==='Zoom') ? val : String(val);
        }
      });

      // Overlay aus
      $('#startOverlay').style.display = 'none';
      showHUD(true);
      window.removeEventListener('resize', resize);
    }catch(err){
      console.error(err);
      drawPlaceholder();
      showHUD(true);
      alert('Startfehler: ' + (err?.message || err));
    }
  }
})();
