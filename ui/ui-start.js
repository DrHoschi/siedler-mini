// ============================================================================
// Datei: ui/ui-start.js
// Projekt: Neue Siedler
// Version: v19.3.1 (Hotfix iOS Safari "$"-Collision + Fallback-Enabler)
// Zweck:
//   • Startfenster-Logik (Startfenster zuerst sichtbar)
//   • Button-IDs exakt wie in deiner Monolith:
//       btnStartNew / btnStartResume / btnStartReset / btnStartFullscreen
//   • Buttons bis cb:boot-ready deaktiviert; Blend-out bei cb:game-start
//   • Safari-Hotfix: KEIN "$" als Konstante verwenden
//   • Fallback: Wenn cb:boot-ready NICHT kommt, nach 2000ms Buttons dennoch freigeben
// Events (send):
//   • cb:ui-ready, cb:start:new|continue|reset|fullscreen
// ============================================================================

(() => {
  // KEIN "$" benutzen (Safari/Global-Property-Konflikt vermeiden)
  const q   = (sel) => document.querySelector(sel);
  const EVT = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const BTN_IDS = ['btnStartNew','btnStartResume','btnStartReset','btnStartFullscreen'];
  let bootReady = false;

  function setButtonsDisabled(disabled) {
    for (const id of BTN_IDS) {
      const b = document.getElementById(id);
      if (b) b.disabled = disabled;
    }
  }

  function bindClicks() {
    const btnNew  = q('#btnStartNew');
    const btnCont = q('#btnStartResume');
    const btnRes  = q('#btnStartReset');
    const btnFS   = q('#btnStartFullscreen');

    btnNew  && btnNew .addEventListener('click', () => EVT('cb:start:new',       { mapId: 'demo.ep1' }));
    btnCont && btnCont.addEventListener('click', () => EVT('cb:start:continue'));
    btnRes  && btnRes .addEventListener('click', () => EVT('cb:start:reset'));
    btnFS   && btnFS  .addEventListener('click', () => EVT('cb:fullscreen'));
  }

  function hideStartPanel() {
    const panel = document.getElementById('start-panel');
    if (panel) panel.style.display = 'none';
  }

  // DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    setButtonsDisabled(true);
    bindClicks();

    (window.CBLog?.ok || console.log)('[ui-start] bereit (cb:ui-ready)');
    EVT('cb:ui-ready');

    // Fallback: Wenn cb:boot-ready nicht kommt, nach 2s dennoch freigeben
    setTimeout(() => {
      if (!bootReady) {
        setButtonsDisabled(false);
        (window.CBLog?.warn || console.warn)('[ui-start] Fallback: Buttons freigegeben (cb:boot-ready fehlte)');
      }
    }, 2000);
  });

  // Boot meldet „bereit“ → Buttons entsperren
  window.addEventListener('cb:boot-ready', () => {
    bootReady = true;
    setButtonsDisabled(false);
    (window.CBLog?.ok || console.log)('[ui-start] entsperrt (boot-ready)');
  });

  // Spiel startet → Startpanel ausblenden
  window.addEventListener('cb:game-start', () => {
    hideStartPanel();
    (window.CBLog?.ok || console.log)('[ui-start] Startpanel ausgeblendet (game-start)');
  });

  // Info-Log wenn Map geladen
  window.addEventListener('cb:map:loaded', (e) => {
    const mapId = e?.detail?.mapId ?? '(unbekannt)';
    (window.CBLog?.ok || console.log)('[ui-start] Map geladen:', mapId);
  });
})();
