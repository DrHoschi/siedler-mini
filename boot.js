// boot.js – Verdrahtet Start/Vollbild/Reset und ruft main.run(), zeigt Fehler als Popup

function $(sel){ return document.querySelector(sel); }
function showHUD(show){ $('#uiBar').style.opacity = show ? '0.95' : '0'; }

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
async function toggleFS(){ isFull() ? await exitFS() : await reqFS(); }

function drawPlaceholder(ctx, canvas){
  const DPR = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * DPR);
  const h = Math.floor(canvas.clientHeight * DPR);
  canvas.width = w; canvas.height = h;

  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#3aa34a';
  const bw = Math.min(w*0.3, 420), bh = bw*0.6;
  ctx.fillRect((w-bw)/2, (h-bh)/2, bw, bh);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = 'bold 48px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('HQ (Platzhalter)', 20, 80);
}

function alertErr(prefix, err){
  console.error(prefix, err);
  alert(`${prefix}\n${(err && err.message) || err}`);
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = $('#game');
  const startBtn = $('#startBtn');
  const fsBtn = $('#fsBtn');
  const resetBtn = $('#resetBtn');

  // Diagnose: falls Buttons nicht gefunden werden
  if (!canvas || !startBtn || !fsBtn || !resetBtn) {
    alert('Startfehler: UI‑Elemente fehlen (canvas/start/fs/reset).');
    return;
  }

  // Placeholder sofort zeichnen
  drawPlaceholder(canvas.getContext('2d'), canvas);

  // Vollbild
  fsBtn.onclick = () => toggleFS().catch(e => alertErr('Vollbild‑Fehler:', e));
  $('#fsBtnTop')?.addEventListener('click', () => toggleFS().catch(e => alertErr('Vollbild‑Fehler:', e)));

  // Reset = Seite neu laden
  resetBtn.onclick = () => location.reload();

  // Start
  startBtn.onclick = async () => {
    try {
      startBtn.disabled = true;
      startBtn.textContent = 'Starte …';
      // main laden
      const mod = await import('./main.js?v=14.3-safe2');
      const run = (mod && mod.default?.run) || mod.run || window.main?.run;
      if (typeof run !== 'function') throw new Error('main.run() wurde nicht gefunden (Export fehlt?).');

      // Overlay weg, HUD an
      $('#startOverlay').style.display = 'none';
      showHUD(true);

      // Start
      await run();
    } catch (err) {
      $('#startOverlay').style.display = ''; // Overlay wieder zeigen
      showHUD(false);
      startBtn.disabled = false;
      startBtn.textContent = 'Start';
      alertErr('Startfehler:', err);
    }
  };
});
