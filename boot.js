// boot.js – V14.3
const VER = '14.3';

function popup(msg) {
  try {
    // kleines modales Popup ohne CSS-Abhängigkeit
    const box = document.createElement('div');
    box.style.cssText = `
      position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
      background:#122131;color:#cfe3ff;border:1px solid #20324a;border-radius:12px;
      box-shadow:0 20px 60px rgba(0,0,0,.35);padding:16px;z-index:99999;max-width:90vw;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Open Sans','Helvetica Neue',Arial;font-size:14px;
    `;
    box.innerHTML = `<div style="margin-bottom:10px"><b>Startfehler</b></div>
      <div style="white-space:pre-wrap">${msg}</div>
      <div style="text-align:right;margin-top:12px">
        <button id="__ok" style="padding:6px 10px;border-radius:10px;border:1px solid #2a3b55;background:#0f1b29;color:#cfe3ff">Schließen</button>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('#__ok').onclick = () => box.remove();
  } catch { alert(msg); }
}

async function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    try { await el.requestFullscreen?.(); } catch {}
  } else {
    try { await document.exitFullscreen?.(); } catch {}
  }
}

function wireUi() {
  const $ = id => document.getElementById(id);

  const canvas = $('game');
  const overlay = $('startOverlay');
  const startBtn = $('startBtn');
  const fsBtn = $('fsBtn');
  const fsBtnTop = $('fsBtnTop');
  const resetBtn = $('resetBtn');
  const centerBtn = $('centerBtn');

  if (!canvas) { popup("Canvas #game fehlt in index.html"); return; }
  if (!overlay || !startBtn) { popup("Start‑Overlay/Start‑Button nicht gefunden"); return; }

  // Doppeltipp/‑klick -> Vollbild (nur auf dem Overlay sinnvoll)
  overlay.addEventListener('dblclick', toggleFullscreen, { passive:true });

  // Top‑Vollbild
  fsBtnTop?.addEventListener('click', toggleFullscreen, { passive:true });
  // Button im Overlay
  fsBtn?.addEventListener('click', toggleFullscreen, { passive:true });

  // Reset: lokalen Spielstand (falls genutzt) löschen
  resetBtn?.addEventListener('click', () => {
    try { localStorage.removeItem('sm_save'); } catch {}
    location.reload();
  });

  // „Zentrieren“ (optional; wenn main eine globale Funktion setzt)
  centerBtn?.addEventListener('click', () => window.__centerMap?.(), { passive:true });

  // START
  startBtn.addEventListener('click', async () => {
    // Overlay sofort schließen, damit klar ist, dass etwas passiert
    overlay.style.display = 'none';
    document.getElementById('uiBar')?.style && (document.getElementById('uiBar').style.opacity = 1);

    try {
      const mod = await import(`./main.js?v=${VER}`);
      if (!mod || typeof mod.run !== 'function') {
        throw new Error("main.run() wurde nicht gefunden (Export fehlt?).");
      }
      // run kann sync oder async sein
      const ret = mod.run();
      if (ret && typeof ret.then === 'function') {
        await ret;
      }
    } catch (e) {
      overlay.style.display = ''; // Overlay wieder anzeigen
      popup(String(e?.message || e));
    }
  }, { passive:true });
}

window.addEventListener('DOMContentLoaded', () => {
  try { wireUi(); } catch (e) { popup(String(e?.message || e)); }
});
