// ============================================================================
// Datei: ui/ui-start.js
// Projekt: Neue Siedler
// Version: v19.3.0 (2025-09-28)
// Zweck:
//   • Startfenster-Logik (Startfenster zuerst sichtbar)
//   • Button-IDs exakt wie in deiner Monolith:
//       btnStartNew / btnStartResume / btnStartReset / btnStartFullscreen
//   • Buttons bis cb:boot-ready deaktiviert; Blend-out bei cb:game-start
// Events (Senden):
//   • cb:ui-ready (UI ist initialisiert)
//   • cb:start:new|continue|reset|fullscreen (Benutzereingaben)
// Leitplanken:
//   • KEIN globales STATE; nur Events & DOM-Interaktion
//   • window.dispatchEvent / window.addEventListener konsequent
// Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
// ============================================================================

(() => {
  // --------------------------- Konstanten ---------------------------
  const $   = (sel) => document.querySelector(sel);
  const EVT = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const BTN_IDS = ['btnStartNew', 'btnStartResume', 'btnStartReset', 'btnStartFullscreen'];

  // --------------------------- Hilfsfunktionen ----------------------
  function setButtonsDisabled(disabled) {
    for (const id of BTN_IDS) {
      const b = document.getElementById(id);
      if (b) b.disabled = disabled;
    }
  }

  function bindClicks() {
    const btnNew  = $('#btnStartNew');
    const btnCont = $('#btnStartResume');
    const btnRes  = $('#btnStartReset');
    const btnFS   = $('#btnStartFullscreen');

    btnNew  && btnNew .addEventListener('click', () => EVT('cb:start:new',       { mapId: 'demo.ep1' }));
    btnCont && btnCont.addEventListener('click', () => EVT('cb:start:continue'));
    btnRes  && btnRes .addEventListener('click', () => EVT('cb:start:reset'));
    btnFS   && btnFS  .addEventListener('click', () => EVT('cb:fullscreen'));
  }

  function hideStartPanel() {
    const panel = document.getElementById('start-panel');
    if (panel) panel.style.display = 'none';
  }

  // --------------------------- Hauptlogik ---------------------------
  // 1) Buttons initial sperren, bis Boot-ready kommt
  window.addEventListener('DOMContentLoaded', () => {
    setButtonsDisabled(true);
    bindClicks();

    (window.CBLog?.ok || console.log)('[ui-start] bereit (cb:ui-ready)');
    EVT('cb:ui-ready');
  });

  // 2) Boot meldet „bereit“ → Buttons entsperren
  window.addEventListener('cb:boot-ready', () => {
    setButtonsDisabled(false);
    (window.CBLog?.ok || console.log)('[ui-start] entsperrt (boot-ready)');
  });

  // 3) Spiel startet → Startpanel ausblenden
  window.addEventListener('cb:game-start', () => {
    hideStartPanel();
    (window.CBLog?.ok || console.log)('[ui-start] Startpanel ausgeblendet (game-start)');
  });

  // (Optional) Bei Map geladen nochmal loggen (UI-Seite)
  window.addEventListener('cb:map:loaded', (e) => {
    const mapId = e?.detail?.mapId ?? '(unbekannt)';
    (window.CBLog?.ok || console.log)('[ui-start] Map geladen:', mapId);
  });
})();
