// boot.js – verdrahtet Start/Vollbild/Reset und ruft main.run()

function $(sel) { return document.querySelector(sel); }

function isFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}
async function requestFS() {
  const el = document.documentElement;
  if (!el.requestFullscreen) return el.webkitRequestFullscreen?.();
  return el.requestFullscreen();
}
async function exitFS() {
  if (document.exitFullscreen) return document.exitFullscreen();
  return document.webkitExitFullscreen?.();
}
function toggleFS(){ isFullscreen() ? exitFS() : requestFS(); }

function showHUD(show){
  $('#uiBar').style.opacity = show ? '0.95' : '0';
}

// Platzhalter zeichnen (bis main.run das Game übernimmt)
function drawPlaceholder(){
  const canvas = $('#game');
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // leichtes Diagonal‑Grid als „Bühne“
  const s = 42, sz = 2;
  ctx.fillStyle = '#122b3d';
  for (let y = -s; y < h + s; y += s) {
    for (let x = -s; x < w + s; x += s) {
      ctx.fillRect(x, y, sz, sz);
    }
  }
  ctx.fillStyle = '#3fc3ff';
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('Warte auf Start …', 16, 22);
}

function wireStartUI(){
  const start = $('#startBtn');
  const fs = $('#fsBtn');
  const fsTop = $('#fsBtnTop');
  const reset = $('#resetBtn');
  const overlay = $('#startOverlay');

  // Doppeltipp auf Card => Vollbild
  $('#startCard').addEventListener('dblclick', toggleFS, {passive:true});

  fs?.addEventListener('click', toggleFS, {passive:true});
  fsTop?.addEventListener('click', toggleFS, {passive:true});

  reset?.addEventListener('click', () => {
    try { localStorage.removeItem('siedler-mini-save'); } catch {}
    location.reload();
  });

  start?.addEventListener('click', async () => {
    try{
      showHUD(true);
      overlay.style.display = 'none'; // UI frei machen
      // main.js dynamisch laden und run() aufrufen
      const mod = await import('./main.js?v=14.3');
      if (!mod || typeof mod.run !== 'function') {
        throw new Error('main.run() wurde nicht gefunden (Export fehlt?)');
      }
      await mod.run($('#game'), {
        DPR: Math.max(1, Math.min(3, window.devicePixelRatio||1)),
        onHud: (k,v) => { const el = document.querySelector('#'+k); if (el) el.textContent = v; }
      });
    }catch(err){
      overlay.style.display = ''; // Start wieder anzeigen
      showHUD(false);
      alert('Startfehler:\n' + (err?.message || String(err)));
      console.error(err);
    }
  });
}

// bei Resize den Platzhalter nachziehen (bis Spiel läuft)
window.addEventListener('resize', () => {
  if ($('#startOverlay').style.display !== 'none') drawPlaceholder();
});

// Kickoff
drawPlaceholder();
wireStartUI();

// optional API, falls du von außen zentrieren willst
window.main = window.main || {};
window.main.centerMap = () => {}; // wird von game.js bei Bedarf überschrieben
