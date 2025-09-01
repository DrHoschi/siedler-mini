/* assets/ui/ui-bridge.js — v16.3.6 */
(function () {
  'use strict';

  var VERSION = 'v16.3.6';
  var log = (window.CBLog && CBLog.ok) ? CBLog.ok : console.log;

  // ------- helpers
  function $el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function once(name, fn) {
    var called = false;
    return function () { if (!called) { called = true; fn(); } };
  }

  // ------- FABs (build + inspector)
  var uiFabBuild = null;
  var uiFabInspector = null;

  function ensureFabs() {
    if (uiFabBuild && uiFabInspector) return;

    // Container (z-index hoch, fixed)
    var holder = document.getElementById('ui-fabs');
    if (!holder) {
      holder = $el('div', 'cb-fab-holder');
      holder.id = 'ui-fabs';
      document.body.appendChild(holder);
    }

    // Build-FAB (links unten)
    if (!uiFabBuild) {
      uiFabBuild = $el('button', 'cb-fab cb-fab--build', '<span class="icon-bricks" aria-hidden="true"></span>');
      uiFabBuild.title = 'Bau-Menü';
      uiFabBuild.addEventListener('click', function () {
        if (window.GameUI && typeof GameUI.toggleBuild === 'function') {
          GameUI.toggleBuild(true);
        } else if (window.GameUI && typeof GameUI.openBuild === 'function') {
          GameUI.openBuild();
        }
      });
      holder.appendChild(uiFabBuild);
    }

    // Inspector-FAB (rechts unten)
    if (!uiFabInspector) {
      uiFabInspector = $el('button', 'cb-fab cb-fab--inspector', '<span class="icon-wrench" aria-hidden="true"></span>');
      uiFabInspector.title = 'Inspector';
      uiFabInspector.addEventListener('click', function () {
        if (window.Inspector && typeof Inspector.open === 'function') {
          Inspector.open(); // Vollbild; s. inspector.js
        } else if (window.Inspector && typeof Inspector.toggle === 'function') {
          Inspector.toggle(true);
        }
      });
      holder.appendChild(uiFabInspector);
    }
  }

  // ------- react to game start (to not auto-open build)
  function wireGameEvents() {
    // Beim Spielstart das Baumenü NICHT automatisch öffnen:
    if (window.GameUI && typeof GameUI.closeBuild === 'function') {
      GameUI.closeBuild();
    }
  }

  // ------- boot
  function boot() {
    ensureFabs();

    // auf Start-UI warten -> nichts tun (Buttons bleiben sichtbar)
    // auf Game-Start warten -> Build-UI nicht auto-öffnen
    window.addEventListener('cb:game-started', wireGameEvents);
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', once('boot', boot));
  } else {
    boot();
  }

  log('[ui-bridge] bereit (v' + VERSION + ')');
})();
