/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Projekt : Neue Siedler
 * Zweck   : Schaltet das Layout erst NACH Spielstart scharf.
 * Events  : cb:game-start  -> body.has-layout an
 *           cb:game:reset  -> body.has-layout aus (optional)
 *           cb:boot-ready  -> (bleibt AUS; Startscreen sichtbar)
 * ============================================================================
*/

<script>
/* ui/ui-layout.js – aktiviert Layout erst nach Spielstart */
(function () {
  const body = document.body;
  // Startzustand: Startbild sichtbar, kein Spiel-Layout
  body.classList.remove('is-playing');

  // Sobald das Spiel wirklich startet → Spiel-Layout aktivieren
  window.addEventListener('cb:game-start', () => {
    body.classList.add('is-playing');      // Canvas/HUD/Dock Layout an
  });

  // Optional: Beim Zurück ins Startpanel wieder deaktivieren
  window.addEventListener('cb:ui-ready', () => {
    body.classList.remove('is-playing');
  });
}());
</script>

(function(){
  const tag = '[layout]';
  const log = (m)=> (window.CBLog?.info || console.info)(`${tag} ${m}`);

  function enableLayout(){
    if (!document.body.classList.contains('has-layout')) {
      document.body.classList.add('has-layout');
      log('aktiviert');
    }
  }
  function disableLayout(){
    if (document.body.classList.contains('has-layout')) {
      document.body.classList.remove('has-layout');
      log('deaktiviert');
    }
  }


  
  // 1) Nach Spielstart aktivieren
  window.addEventListener('cb:game-start', enableLayout);

  // 2) Optional zurücksetzen (wenn du einen Reset-Flow hast)
  window.addEventListener('cb:game:reset', disableLayout);

  // 3) Falls die Seite bereits im gestarteten Zustand wäre (Reload),
  //    könntest du hier heuristisch prüfen; Standard: aus lassen.
  document.addEventListener('DOMContentLoaded', ()=> {
    // bewusst AUS lassen -> Start-Hintergrund bleibt sichtbar bis Start
    log('bereit (wartet auf cb:game-start)');
  });

  // Export (Debug)
  window.LayoutGlue = { enable: enableLayout, disable: disableLayout };
})();
