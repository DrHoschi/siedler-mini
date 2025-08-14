// boot.js — Siedler‑Mini V14.7‑hf2 (mobile boot)
// bindet UI, startet game, robuste Vollbild‑Handhabung und Boot-Diagnose

import { game } from './game.js?v=147hf2';

(function boot() {
  const $ = (sel) => document.querySelector(sel);

  // --- kleine Boot-Pille für schnelle Diagnose ---
  const pill = document.createElement('div');
  pill.style.cssText = `
    position:fixed;left:8px;top:8px;z-index:99999;
    background:#0f1b29;border:1px solid #1b2a40;border-radius:12px;
    padding:4px 8px;font:12px/1.3 system-ui,-apple-system,Segoe UI,Roboto;
    color:#cfe3ff;opacity:.85;pointer-events:none
  `;
  pill.textContent = 'BOOT …';
  document.body.appendChild(pill);
  const setBoot = (txt, ok=true) => {
    pill.textContent = txt;
    pill.style.background = ok ? '#11331f' : '#3a1515';
    pill.style.borderColor = ok ? '#0a6129' : '#752020';
  };

  // --- DOM refs ---
  const canvas    = $('#canvas');
  const btnStart  = $('#btnStart');
  const btnFsCard = $('#btnFs');
  const btnReset  = $('#btnReset');

  const btnFull   = $('#btnFull');
  const btnCenter = $('#btnCenter');
  const btnDebug  = $('#btnDebug');

  const toolsBar  = $('#tools');
  const hudZoomEl = $('#hudZoom');
  const hudToolEl = $('#hudTool');

  // sanity: alles da?
  if (!canvas || !btnStart || !btnReset || !btnFull || !btnCenter || !toolsBar) {
    setBoot('BOOT FAIL: DOM fehlt', false);
    return;
  }

  // --- HUD writer weiterreichen ---
  const onHUD = (key, val) => {
    if (key === 'Zoom' && hudZoomEl) hudZoomEl.textContent = val;
    if (key === 'Tool' && hudToolEl) hudToolEl.textContent = val;
  };

  // --- Fullscreen helper (iOS/Safari/WebKit inkl.) ---
  const canFullscreen = () => {
    // iOS 15 Safari im normalen Tab kann kein FS; iOS 16+ unterstützt webkitFullscreen
    const el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  };

  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); // iOS
    } catch (err) {
      alert('Vollbild konnte nicht aktiviert werden.\n' + (err?.message || err));
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } catch {}
  };

  const ensureFullscreenOrToast = async () => {
    if (!canFullscreen()) {
      alert('Vollbild wird in diesem Browser/Modus nicht unterstützt.\n' +
            'Tipp: iOS Safari ab iOS 16 oder Seite „Zum Homescreen“ hinzufügen.');
      return false;
    }
    await enterFullscreen();
    // kleine Verzögerung, damit das Canvas korrekt resized
    setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
    return true;
  };

  // --- Buttons binden ---
  btnStart.addEventListener('click', () => {
    try {
      game.startGame({
        canvas,
        onHUD,
      });
      setBoot('BOOT OK', true);
    } catch (e) {
      setBoot('BOOT FAIL: startGame', false);
      alert('Startfehler: ' + (e?.message || e));
    }
  });

  btnReset.addEventListener('click', () => {
    try {
      // einfacher Reset: Welt leeren & Kamera zentrieren
      const s = game.state;
      s.roads.length = 0;
      s.buildings.length = 0;
      s.camX = 0; s.camY = 0; s.zoom = 1;
      // HUD aktualisieren
      if (hudZoomEl) hudZoomEl.textContent = s.zoom.toFixed(2) + 'x';
      // neu zeichnen (tick läuft ohnehin)
      setBoot('Reset', true);
    } catch (e) {
      alert('Reset-Fehler: ' + (e?.message || e));
    }
  });

  btnFull.addEventListener('click', ensureFullscreenOrToast);
  btnFsCard?.addEventListener('click', ensureFullscreenOrToast);

  btnCenter.addEventListener('click', () => {
    try { game.center(); } catch {}
  });

  btnDebug.addEventListener('click', () => {
    const s = game.state;
    console.log('STATE', {
      running: s.running, camX: s.camX, camY: s.camY, zoom: s.zoom,
      roads: s.roads.length, buildings: s.buildings.length
    });
    alert(`Debug:\nZoom ${s.zoom.toFixed(2)}x  Cam(${s.camX},${s.camY})\n` +
          `Straßen: ${s.roads.length}  Gebäude: ${s.buildings.length}`);
  });

  // Tool-Leiste (links)
  toolsBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn[data-tool]');
    if (!btn) return;
    const tool = btn.getAttribute('data-tool');
    try { game.setTool(tool); } catch {}
    // aktive Optik
    for (const b of toolsBar.querySelectorAll('.btn')) b.classList.remove('active');
    btn.classList.add('active');
  });

  // Optional: Doppeltipp auf Canvas => Fullscreen versuchen
  let lastTap = 0;
  canvas.addEventListener('pointerup', () => {
    const now = Date.now();
    if (now - lastTap < 300) ensureFullscreenOrToast();
    lastTap = now;
  }, {passive:true});

  // Reaktion auf Fullscreen/Resize -> Canvas size aktualisieren übernehmen game.js bereits
  document.addEventListener('fullscreenchange', () => setTimeout(() => window.dispatchEvent(new Event('resize')), 50));
  document.addEventListener('webkitfullscreenchange', () => setTimeout(() => window.dispatchEvent(new Event('resize')), 50));

  // Wenn alles gebunden ist:
  setBoot('BOOT bereit', true);
})();
