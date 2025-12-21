/* =============================================================================
 * Datei    : ui/ui-state.js
 * Projekt  : Neue Siedler
 * Version  : v25.12.21-bot
 * Zweck    : Zentraler UI-Status (sichtbare Panels, HUD, Build-Menü etc.)
 *
 * Beschreibung:
 *   Dieses Modul verwaltet einen globalen UIState-Container zur Laufzeit.
 *   Es lauscht auf zentrale UI-Events (z.B. Spielstart, Pause, HUD bereit,
 *   Build-Menü öffnen/schließen) und aktualisiert einen zentralen
 *   Zustandsbaum. Alle Änderungen werden per Event `cb:ui-state-change`
 *   propagiert und zur Debugging-Ausgabe auf die Konsole geschrieben.
 *
 *   Das Modul greift nicht in bestehende Module ein, sondern beobachtet
 *   lediglich Events und bietet eine einheitliche Schnittstelle über
 *   `window.UIState` und `window.UIStateUpdate`.
 * ============================================================================= */

(function(root){
  // UI-State singleton (idempotent) – nur einmal initialisieren
  if (root.UIState) return;

  /**
   * Zentraler Status des UI-Systems.
   *
   * - gameStarted:  true, sobald das Spiel (cb:game:start) begonnen hat
   * - gamePaused:   true, wenn das Spiel pausiert (cb:game:paused)
   * - panelOpen:    sichtbares Start/Pause-Panel (true bei offen)
   * - hudVisible:   HUD (Ressourcenleiste) sichtbar (true, wenn geladen)
   * - buildMenu:    Status des Baumenüs: 'off', 'real' (ui-build), 'fallback'
   * - _updatedAt:   interner Zeitstempel der letzten Statusänderung
   */
  const state = {
    gameStarted: false,
    gamePaused:  false,
    panelOpen:   true,
    hudVisible:  false,
    buildMenu:   'off',
    _updatedAt:  Date.now()
  };

  /**
   * Aktualisiert den zentralen Status. Nur veränderte Felder werden
   * übernommen. Bei Änderungen wird ein `cb:ui-state-change`-Event
   * ausgelöst und der gesamte Zustand in die Konsole geloggt.
   *
   * @param {Object} partial Teil-Statusobjekt mit neuen Werten
   */
  function update(partial){
    let changed = false;
    if (partial && typeof partial === 'object'){
      for (const key in partial){
        if (Object.prototype.hasOwnProperty.call(partial, key)){
          if (state[key] !== partial[key]){
            state[key] = partial[key];
            changed = true;
          }
        }
      }
    }
    if (changed){
      state._updatedAt = Date.now();
      // Event für Beobachter (z.B. Inspector) auslösen
      try {
        const detail = Object.assign({}, state, { __src:'ui-state' });
        window.dispatchEvent(new CustomEvent('cb:ui-state-change', { detail }));
      } catch(e){
        /* keine Aktion bei Dispatch-Fehler */
      }
      // Debug-Log – nur in Entwicklung sinnvoll
      (window.CBLog?.info || console.info)('[ui-state]', JSON.stringify(state));
    }
  }

  // ---------------------------- Event-Wiring -----------------------------
  // Spielstart → HUD aktivieren, Panel schließen
  window.addEventListener('cb:game:start', () => {
    update({ gameStarted:true, gamePaused:false, panelOpen:false, hudVisible:true });
  });
  // Pause → Panel öffnen
  window.addEventListener('cb:game:paused', () => {
    update({ gamePaused:true, panelOpen:true });
  });
  // Spiel fortsetzen (falls es ein eigenes Event gibt)
  window.addEventListener('cb:game:resume', () => {
    update({ gamePaused:false, panelOpen:false });
  });
  // HUD ist bereit → sichtbar
  window.addEventListener('cb:hud-ready', () => {
    update({ hudVisible:true });
  });
  // UI Ready (Startpanel aufgebaut) → Panel offen
  window.addEventListener('cb:ui-ready', () => {
    update({ panelOpen:true });
  });
  // Baumenü geöffnet → Art (real/fallback) bestimmen
  window.addEventListener('cb:build:open', (ev) => {
    const detail = (ev && ev.detail) || {};
    let kind = 'real';
    // Wenn der Event von einem anderen Modul als ui-build kommt, als fallback markieren
    if (detail.__src && detail.__src !== 'ui-build'){
      kind = 'fallback';
    }
    update({ buildMenu: kind });
  });
  // Baumenü geschlossen
  window.addEventListener('cb:build:close', () => {
    update({ buildMenu:'off' });
  });
  // Baumenü toggeln → zwischen offen/zu wechseln
  window.addEventListener('cb:build:toggle', () => {
    const current = state.buildMenu;
    if (current === 'off') {
      update({ buildMenu:'real' });
    } else {
      update({ buildMenu:'off' });
    }
  });

  // Globale Exports
  root.UIState       = state;
  root.UIStateUpdate = update;
})(typeof window !== 'undefined' ? window : this);