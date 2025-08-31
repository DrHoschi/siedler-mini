/*! ui-build.js v16.2.8 — Build-Menü: Toggle & Tool-Set (ES5) */
(function(){
  'use strict';
  var VERSION='v16.2.8';

  function $(s,r){return (r||document).querySelector(s);}
  function $all(s,r){return [].slice.call((r||document).querySelectorAll(s));}
  function on(el,ev,fn,opt){el&&el.addEventListener&&el.addEventListener(ev,fn,opt||false);}

  // Buttons im Build-Menü wählen Tool (zweiter Klick = deaktivieren)
  function bind(){
    var root = document.body;
    $all('[data-tool]', root).forEach(function(btn){
      on(btn,'click', function(){
        var t = btn.getAttribute('data-tool');
        var k = btn.getAttribute('data-key');
        // Toggle: bereits aktiv? -> clear
        if (btn.classList.contains('active')){
          if (window.Game && Game.clearTool) Game.clearTool();
          $all('[data-tool].active', root).forEach(function(b){b.classList.remove('active');});
          return;
        }
        // sonst aktivieren
        $all('[data-tool].active', root).forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');

        if (t==='build' && k){
          if (window.Game && Game.setTool) Game.setTool('build', {key:k});
        } else if (window.Game && Game.setTool){
          Game.setTool(t||null);
        }
      });
    });

    // Wenn Game das Tool cleared, UI state zurücknehmen
    if (!window.GameUI) window.GameUI = {};
    window.GameUI.onToolCleared = function(){
      $all('[data-tool].active', document.body).forEach(function(b){b.classList.remove('active');});
    };

    if (window.CBLog && CBLog.ok) CBLog.ok('[ok] Bau-Menü bereit ('+VERSION+')');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', bind); }
  else { bind(); }
})();
