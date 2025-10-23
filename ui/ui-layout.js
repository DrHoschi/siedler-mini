/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Projekt : Neue Siedler
 * Version : v25.10.19-final3
 * Zweck   : Schaltet Spiel-Layout NACH Spielstart aktiv (Start-BG bleibt bis dahin).
 * Events  : cb:ui-ready / cb:ui:ready    -> Layout AUS
 *           cb:game-start / cb:game:start-> Layout AN
 *           cb:game:reset                -> Layout AUS
 * ========================================================================== */
/* (function () {
  const TAG = '[layout]';
  const log = (m)=> (window.CBLog?.info||console.info)(`${TAG} ${m}`);

  function enableLayout()  { document.body.classList.add('is-playing');  log('aktiv (body.is-playing)'); }
  function disableLayout() { document.body.classList.remove('is-playing'); log('inaktiv (Startscreen sichtbar)'); }

  // Startzustand: Layout AUS (Start-BG sichtbar)
  disableLayout();

  // --- Ready (beide Aliasse) -> AUS ---
  window.addEventListener('cb:ui-ready', disableLayout, { passive:true });
  window.addEventListener('cb:ui:ready', disableLayout, { passive:true });

  // --- Game start (beide Aliasse) -> AN ---
  window.addEventListener('cb:game-start',  enableLayout, { passive:true });
  window.addEventListener('cb:game:start',  enableLayout, { passive:true });

  // --- Reset optional -> AUS ---
  window.addEventListener('cb:game:reset', disableLayout, { passive:true });

  // Debug-Export
  window.LayoutGlue = { enable: enableLayout, disable: disableLayout };
})(); */

/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Zweck   : Schaltet Spiel-Layout NACH Spielstart aktiv (Start-BG bis dahin).
 * Events  : cb:ui-ready / cb:ui:ready    -> Layout AUS
 *           cb:game-start / cb:game:start-> Layout AN
 *           cb:game:reset                -> Layout AUS
 * ========================================================================== */
(function () {
  const TAG = '[layout]';
  const log = (m)=> (window.CBLog?.info||console.info)(`${TAG} ${m}`);

  function enable()  { document.body.classList.add('is-playing');  log('aktiv (body.is-playing)'); }
  function disable() { document.body.classList.remove('is-playing'); log('inaktiv (Startscreen sichtbar)'); }

  // Startzustand (Startscreen sichtbar)
  disable();

  // Ready -> AUS (beide Aliasse)
  addEventListener('cb:ui-ready', disable,  { passive:true });
  addEventListener('cb:ui:ready', disable,  { passive:true });

  // Game start -> AN (beide Aliasse)
  addEventListener('cb:game-start', enable, { passive:true });
  addEventListener('cb:game:start', enable, { passive:true });

  // Reset -> AUS
  addEventListener('cb:game:reset', disable,{ passive:true });

  // Debug/Manuell
  window.LayoutGlue = { enable, disable };
})();
