/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Projekt : Neue Siedler
 * Version : v25.10.23-fix2 (ohne Cover)
 * Zweck   : Zustände "Start" ↔ "Spiel" schalten, ohne zusätzliche Layer.
 *           – Start: body.is-start (Startpanel zeigt sich wie gehabt)
 *           – Spiel: body.is-playing (Canvas + HUD + Build sichtbar)
 *           – KEIN layout-cover, KEIN Overlay!
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ========================================================================== */

/* ============================================================================
 * [Imports]
 * ========================================================================== */
// (leer)

/* ============================================================================
 * [Konstanten]
 * ========================================================================== */
const TAG = '[layout]';
const logI = (m)=> (window.CBLog?.info || console.info)(`${TAG} ${m}`);

/* ============================================================================
 * [Hilfsfunktionen]
 * ========================================================================== */
function enableStart(){
  document.body.classList.add('is-start');
  document.body.classList.remove('is-playing');
  logI('inaktiv (Startscreen sichtbar)');
}
function enablePlaying(){
  document.body.classList.remove('is-start');
  document.body.classList.add('is-playing');
  logI('aktiv (body.is-playing)');
}

/* ============================================================================
 * [Klassen] – nicht benötigt
 * ========================================================================== */

/* ============================================================================
 * [Hauptlogik] – Event-Wiring (inkl. Aliasse aus deinem Monolith)
 * ========================================================================== */
(function initLayout(){
  // Initial: wir gehen konservativ auf Start
  enableStart();

  // UI-ready (beide Aliasse) → Startzustand bleibt, bis explizit gestartet wird
  addEventListener('cb:ui-ready', enableStart, { passive:true });
  addEventListener('cb:ui:ready', enableStart, { passive:true });

  // Game start (beide Aliasse) → Spielzustand aktivieren
  const onGameStart = ()=> enablePlaying();
  addEventListener('cb:game-start', onGameStart, { passive:true });
  addEventListener('cb:game:start', onGameStart, { passive:true });

  // Reset zurück auf Start
  addEventListener('cb:game:reset', enableStart, { passive:true });

  // Log-Kompat mit deinem bisherigen Logtext
  logI('failsafe enable (via boot)');
})();

/* ============================================================================
 * [Exports]
 * ========================================================================== */
export const Layout = { enableStart, enablePlaying };
