// boot.js – Start/Vollbild/Reset + sicherer Import von main.run()

/* Helpers */
const $ = (s) => document.querySelector(s);

function isFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function requestFS(){
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
}
function exitFS(){
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
}
function toggleFS(){ isFullscreen() ? exitFS() : requestFS(); }

function showHUD(v){
  const bar = $('#uiBar');
  if (bar) bar.style.opacity = v ? '0.95' : '0';
}

/* Placeholder bis main.run übernimmt */
function drawPlaceholder(){
  const canvas = $('#game');
  if (!canvas) return;

  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);

  // kleines Muster
  ctx.fillStyle = '#122b3d';
  const s = 42, sz = 2;
  for (let y = -s; y < h + s; y += s){
    for (let x = -s; x < w + s; x += s){ ctx.fillRect(x,y,sz,sz); }
  }
  ctx.fillStyle = '#3fc3ff';
  ctx.font = '14px system-ui,-apple-system,Segoe UI,Roboto,Arial';
  ctx.fillText('Warte auf Start …', 16, 22);
}

/* UI verdrahten */
function wireUI(){
  const overlay = $('#startOverlay');
  const card = $('#startCard');
  const startBtn = $('#startBtn');
  const fsBtn = $('#fsBtn');
  const fsBtnTop = $('#fsBtnTop');
  const resetBtn = $('#resetBtn');

  card && card.addEventListener('dblclick', () => toggleFS(), {passive:true});
  fsBtn && fsBtn.addEventListener('click', () => toggleFS());
  fsBtnTop && fsBtnTop.addEventListener('click', () => toggleFS());

  resetBtn && resetBtn.addEventListener('click', () => {
    try { localStorage.removeItem('siedler-mini-save'); } catch {}
    location.reload();
  });

  startBtn && startBtn.addEventListener('click', async () => {
    try{
      showHUD(true);
      if (overlay) overlay.style.display = 'none';
      // ---- wichtig: lazy Import von main.js + run() ----
      const mod = await import('./main.js?v=14.3');
      if (!mod || typeof mod.run !== 'function') {
        throw new Error('main.run() wurde nicht gefunden.');
      }
      await mod.run($('#game'), {
        DPR: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
        onHud: (k,v) => { const el = document.querySelector('#'+k); if (el) el.textContent = v; }
      });
    } catch (err) {
      // zurück ins Startmenü + Fehler zeigen
      if (overlay) overlay.style.display = '';
      showHUD(false);
      alert('Startfehler: ' + (err && err.message ? err.message : String(err)));
      console.error('[boot] start error', err);
    }
  });
}

/* Resize – solange Overlay sichtbar ist, nur Placeholder anpassen */
window.addEventListener('resize', () => {
  const overlayVisible = $('#startOverlay') && $('#startOverlay').style.display !== 'none';
  if (overlayVisible) drawPlaceholder();
});

/* Kickoff */
drawPlaceholder();
wireUI();

/* kleine API-Haken, falls game.js das überschreiben will */
window.main = window.main || {};
window.main.centerMap = window.main.centerMap || (()=>{});
