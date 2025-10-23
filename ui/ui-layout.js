/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Projekt : Neue Siedler
 * Version : v25.10.23-fix1
 * Zweck   : Start-/Spiel-Layout sicher schalten:
 *           - Start:  body.is-start (Cover sichtbar, Spiel-UI noch „leise“)
 *           - Spiel:  body.is-playing (HUD/Map/Build sichtbar)
 *           - Explizite Show-Requests für HUD & Build auf cb:game:start
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ========================================================================== */

/* ============================================================================
 * [Imports] (keine externen Module hier, nur Browser-APIs)
 * ========================================================================== */
// (leer)

/* ============================================================================
 * [Konstanten]
 * ========================================================================== */
const TAG_LAYOUT = '[layout]';
const LOGi = (m)=> (window.CBLog?.info || console.info)(`${TAG_LAYOUT} ${m}`);

/* ============================================================================
 * [Hilfsfunktionen]
 * ========================================================================== */
function $(sel, root=document){ return root.querySelector(sel); }
function ensureCover(){
  // Falls #layout-cover in index.html fehlt → anlegen
  let c = $('#layout-cover');
  if (!c){
    c = document.createElement('div');
    c.id = 'layout-cover';
    document.body.appendChild(c);
  }
  return c;
}
function enablePlaying(){
  document.body.classList.remove('is-start');
  document.body.classList.add('is-playing');
  LOGi('aktiv (body.is-playing)');
}
function disablePlaying(){
  document.body.classList.remove('is-playing');
  document.body.classList.add('is-start');
  LOGi('inaktiv (Startscreen sichtbar)');
}

/* ============================================================================
 * [Klassen]
 * ========================================================================== */
// (hier nicht notwendig – reines Modulverhalten)

/* ============================================================================
 * [Hauptlogik] – Event-Wiring (Aliasse berücksichtigt)
 * ========================================================================== */
(function initLayoutGlue(){
  // Startzustand: Startscreen aktiv
  ensureCover();
  disablePlaying();

  // UI-ready → sicherheitshalber Startzustand (beide Aliasse)
  addEventListener('cb:ui-ready', disablePlaying, { passive:true });
  addEventListener('cb:ui:ready', disablePlaying, { passive:true });

  // Game start → Spiel aktiv (beide Aliasse)
  addEventListener('cb:game-start', onGameStart, { passive:true });
  addEventListener('cb:game:start', onGameStart, { passive:true });

  // Game reset → zurück zum Startscreen
  addEventListener('cb:game:reset', disablePlaying, { passive:true });

  // Fail-Safe Log (wie in deinen Logs)
  LOGi('failsafe enable (via boot)');
})();

/** Auf Spielstart: State setzen + HUD/Build anfordern */
function onGameStart(){
  enablePlaying();

  // Falls am Cover Styles „kleben“
  const c = $('#layout-cover');
  if (c){ c.style.display=''; c.style.visibility=''; c.style.opacity=''; }

  // Explizit HUD + Build zeigen (deine Events/Flows)
  dispatchEvent(new CustomEvent('req:hud:show'));
  dispatchEvent(new CustomEvent('req:buildmenu:show'));
}

/* ============================================================================
 * [Exports]
 * ========================================================================== */
window.LayoutGlue = { enablePlaying, disablePlaying };
