// ============================================================================
// Datei: ui/ui-start.js
// Zweck : Startfenster-Logik + UI-Events
// Events: sendet  cb:ui-ready, cb:start:new, cb:start:continue, cb:start:reset, cb:fullscreen
//         reagiert auf cb:game-start (Startpanel ausblenden, HUD/Build zeigen)
// Hinweise:
//   • KEIN globales STATE; nur DOM + Events
//   • Kein "$" Alias verwenden (Safari-Global-Property-Konflikte vermeiden)
// ============================================================================

(() => {
  const q   = (sel) => document.querySelector(sel);
  const on  = (n, cb) => window.addEventListener(n, cb);
  const EVT = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  function bindButtons() {
    const btnNew       = q('#btn-new');
    const btnCont      = q('#btn-continue');
    const btnFS        = q('#btn-fullscreen');
    const btnReset     = q('#btn-reset');
    const btnInspector = q('#btn-inspector');

    // Neues Spiel: optional andere Map übergeben → boot liest canvas.dataset.map
    btnNew?.addEventListener('click', () => {
      const canvas = q('#game');
      // Wenn du eine andere Map starten willst: canvas.dataset.map = 'data/maps/map-pro.json'
      EVT('cb:start:new', { mapId: canvas?.dataset.map });
    });

    btnCont?.addEventListener('click', () => EVT('cb:start:continue'));
    btnReset?.addEventListener('click', () => EVT('cb:start:reset'));

    btnFS?.addEventListener('click', () => EVT('cb:fullscreen'));

    // Inspector-Toggle (UI-seitig Panel zeigen/verstecken, Event für Inspector-Module)
    btnInspector?.addEventListener('click', () => {
      const host = q('#inspector');
      if (host) host.classList.toggle('hidden');
      EVT('req:inspector:toggle');
    });
  }

  function hideStartPanel() {
    const panel = q('#start-panel');
    panel && (panel.classList.remove('visible'), panel.classList.add('hidden'));
  }

  function showHudAndBuild() {
    q('#hud-top')?.classList.remove('hidden');
    q('#build-dock')?.classList.remove('hidden');
  }

  // DOM bereit → Buttons binden + UI ready melden
  on('DOMContentLoaded', () => {
    bindButtons();
    (window.CBLog?.ok || console.log)('[ui-start] ready → cb:ui-ready');
    EVT('cb:ui-ready');
  });

  // Wenn das Spiel startet, Startpanel ausblenden & HUD/Build sichtbar
  on('cb:game-start', () => {
    hideStartPanel();
    showHudAndBuild();
    // zusätzlich im cb:game-start-Handler:
document.body.classList.add('is-playing');           // steuert Body-Hintergrund per CSS
document.body.style.background = 'none';             // Fallback: BG direkt entfernen
const bgEl = document.querySelector('#start-bg');    // falls ein eigenes Panel-Bild existiert
if (bgEl) bgEl.style.display = 'none';
    (window.CBLog?.ok || console.log)('[ui-start] game-start → UI sichtbar');
  });
})();
