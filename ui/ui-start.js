/* ============================================================================
 * Datei   : ui/ui-start.js
 * Projekt : Neue Siedler
 * Version : v25.11.07-final
 * Zweck   : Startfenster + Splash-Hintergrund (vor Spielstart sichtbar).
 *
 * Sendet  : cb:ui-ready (GENAU 1×)
 *           req:game:start | req:game:continue | req:game:reset
 *
 * Lauscht : cb:game:start  → Panel schließen, body.is-playing setzen
 *           cb:game:paused → Panel öffnen, body.is-playing entfernen
 * ========================================================================== */
(function () {
  'use strict';
  const TAG = '[ui-start]';
  const log = (m,...a)=>(window.CBLog?.info||console.info)(TAG, m, ...a);
  const warn= (m,...a)=>(window.CBLog?.warn||console.warn)(TAG, m, ...a);

  // Run-Once Guard
  if (window.__UI_START_INIT__) { warn('Doppel-Init verhindert.'); return; }
  window.__UI_START_INIT__ = true;

  const html = document.documentElement;
  const root = document.getElementById('ui-root') || document.body;

  html.classList.add('panel-open');
  document.body.classList.remove('is-playing');

  // Splash minimal (Pfad kommt aus :root --start-bg)
  (function ensureSplash() {
    if (document.getElementById('start-splash')) return;
    const splash = document.createElement('div');
    splash.id = 'start-splash';
    document.body.appendChild(splash);
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--start-bg').trim();
    const m = cssVar.match(/url\((['"]?)(.*?)\1\)/);
    const url = m ? m[2] : '../../assets/ui/start-bg.jpg';
    const img = new Image(); img.onerror = () => warn('Splash-Bild nicht gefunden:', url); img.src = url;
    window.addEventListener('cb:game-start', () => { splash.classList.add('fade-out'); setTimeout(() => splash.remove(), 280); }, { once: true });
  })();

  // Panel
  const panel = document.createElement('div');
  panel.id = 'start-panel';
  panel.style.display = 'grid';
  panel.innerHTML = `
    <div class="box wood-frame">
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btn-start">Spiel starten</button>
        <button id="btn-continue">Weiterspielen</button>
        <button id="btn-reset">Reset</button>
        <button id="btn-fullscreen">Vollbild</button>
      </div>
    </div>`;
  (root || document.body).appendChild(panel);

  function closePanel() { panel.style.display='none'; html.classList.remove('panel-open'); document.body.classList.add('is-playing'); }
  function openPanel()  { panel.style.display='grid'; html.classList.add('panel-open');  document.body.classList.remove('is-playing'); }
  async function toggleFullscreen() {
    const el = document.documentElement;
    try { if (!document.fullscreenElement) { await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.call(el)); }
          else { await (document.exitFullscreen?.() || document.webkitExitFullscreen?.()); } }
    catch { warn('Vollbild evtl. durch iOS/Safari eingeschränkt.'); }
  }

  // Buttons
  panel.querySelector('#btn-start')?.addEventListener('click', () => {
    closePanel();
    if (!window.__UI_READY_EMITTED__) {
      window.__UI_READY_EMITTED__ = true;
      window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail: { ok: true } }));
    }
    // window.dispatchEvent(new CustomEvent('req:game:start', { detail: { mode: 'new' } }));
  });

  panel.querySelector('#btn-continue')?.addEventListener('click', () => {
    closePanel();
    if (!window.__UI_READY_EMITTED__) {
      window.__UI_READY_EMITTED__ = true;
      window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail: { ok: true } }));
    }
    window.dispatchEvent(new CustomEvent('req:game:continue', { detail: { mode: 'continue' } }));
  });

  panel.querySelector('#btn-reset')?.addEventListener('click', () => { try { localStorage.clear(); } catch {} window.dispatchEvent(new CustomEvent('req:game:reset')); });
  panel.querySelector('#btn-fullscreen')?.addEventListener('click', toggleFullscreen);

  // Event-Brücken
  window.addEventListener('cb:game:start',  closePanel);
  window.addEventListener('cb:game:paused', openPanel);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('req:game:pause'));
      setTimeout(() => { if (!html.classList.contains('panel-open')) openPanel(); }, 60);
    }
  });

  // UI ready (GENAU 1×, direkt beim Startpanel-Aufbau)
  if (!window.__UI_READY_EMITTED__) {
    window.__UI_READY_EMITTED__ = true;
    window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail: { ok: true } }));
    log('Startpanel bereit → cb:ui-ready');
  }
})();
