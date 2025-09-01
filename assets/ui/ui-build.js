/* assets/ui/ui-build.js — v16.5.2
   Initialisiert nur das Bau-Menü (UI Bridge verwaltet das Öffnen/Schließen)
   - keine Auto-Öffnung
   - reagiert auf Start/Game-Events
*/
(function(){
  'use strict';
  var VERSION = 'v16.5.2';

  // Nur Logging, eigentliche Logik liegt in ui-bridge.js
  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }

  // Bei Game-Start können wir (optional) den Default-Tab setzen, aber Panel bleibt zu.
  window.addEventListener('cb:game-started', function(){
    ok('[ok] Bau-Menü bereit (ui-build.js v'+VERSION+')');
  });

  // Fallback: Globaler Helper, falls externe Buttons direkt toggeln wollen
  if (!window.GameUI) window.GameUI = {};
  if (!window.GameUI.toggleBuild) window.GameUI.toggleBuild = function(){
    try {
      var B = window.GameUI;
      if (B && B.openBuild && B.closeBuild){
        // Panel existiert? -> toggle
        var panel = document.getElementById('build-panel');
        if (panel && panel.classList.contains('open')) B.closeBuild(); else B.openBuild();
      } else {
        console.warn('[ui-build] Bridge nicht bereit');
      }
    } catch(e){ console.warn('[ui-build] toggle fehlgeschlagen:', e && e.message); }
  };

  console.log('[ui-build] Modul geladen (v'+VERSION+')');
})();
