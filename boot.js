// boot.js (V14.3)
const $ = sel => document.querySelector(sel);
const canvas = $('#game');

// Fullscreen helper
async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {}
}

// Buttons
$('#fsBtn')?.addEventListener('click', toggleFullscreen);
$('#fsBtnTop')?.addEventListener('click', toggleFullscreen);
$('#resetBtn')?.addEventListener('click', () => location.reload());
canvas?.addEventListener('dblclick', toggleFullscreen);

// einfache HUD‑Platzhalteranzeige bis das Spiel läuft
function showHUD() { $('#uiBar').style.opacity = '1'; }
function hideStart() { $('#startOverlay').style.display = 'none'; }
function showStart() { $('#startOverlay').style.display = ''; }

// Startkette: Button → (dynamic import) → main.run(opts)
$('#startBtn')?.addEventListener('click', start);

async function start() {
  try {
    const mod = await import('./main.js?v=14.3');
    if (!mod || typeof mod.run !== 'function') {
      throw new Error("main.run() wurde nicht gefunden (Export fehlt?)");
    }
    hideStart();     // Overlay aus
    showHUD();       // HUD sichtbar
    await mod.run({
      canvas,
      DPR: Math.max(1, Math.min(3, window.devicePixelRatio || 1)),
      onHUD: (k, v) => { const el = document.querySelector('#'+k); if (el) el.textContent = v; }
    });
  } catch (err) {
    // Start wieder anzeigen + Fehler melden
    showStart();
    alert(`Startfehler:\n${err.message || err}`);
  }
}

// optional: "Zentrieren" (ruft – falls vorhanden – main.centerMap auf)
$('#centerBtn')?.addEventListener('click', async () => {
  try {
    const mod = await import('./main.js?v=14.3');
    if (typeof mod.centerMap === 'function') mod.centerMap();
  } catch {}
});
