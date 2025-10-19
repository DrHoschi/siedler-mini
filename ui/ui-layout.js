/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Projekt : Neue Siedler
 * Version : v25.10.19-final2
 * Zweck   : Schaltet Spiel-Layout NACH Spielstart aktiv (Start-BG bleibt bis dahin).
 * Events  : cb:ui-ready     -> Layout AUS  (Startscreen sichtbar)
 *           cb:game-start   -> Layout AN   (HUD/Map/Dock sichtbar)
 *           cb:game:reset   -> Layout AUS  (optional)
 * ========================================================================== */
(function () {
  const TAG = '[layout]';
  const log = (m)=> (window.CBLog?.info||console.info)(`${TAG} ${m}`);

  function enableLayout() {
    document.body.classList.add('is-playing');
    log('aktiv (body.is-playing)');
  }
  function disableLayout() {
    document.body.classList.remove('is-playing');
    log('inaktiv (Startscreen sichtbar)');
  }

  // Startzustand: Layout AUS
  disableLayout();

  // Umschalten gemäß Lifecycle-Events
  window.addEventListener('cb:ui-ready',    disableLayout, { passive:true });
  window.addEventListener('cb:game-start',  enableLayout,  { passive:true });
  window.addEventListener('cb:game:reset',  disableLayout, { passive:true });

  // Debug-Export
  window.LayoutGlue = { enable: enableLayout, disable: disableLayout };
})();
