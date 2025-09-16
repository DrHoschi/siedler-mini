/* ============================================================================
 * Neue Siedler – CORE UI Data-Bridge
 * Dateiname: assets/core/ui-build.data-bridge.js
 * Version: v17.0.5
 *
 * Aufgabe:
 *  - Registry -> UI-Build Items mappen und an UIBuild liefern
 *  - reagiert auf cb:registry:ready und cb:registry:update
 *  - funktioniert, egal ob die Registry vor oder nach UIBuild kommt
 *
 * WICHTIG: Die CORE-UI erwartet das Feld "category" (nicht "group").
 * ========================================================================== */
(function (global) {
  'use strict';
  var MOD = '[ui-build.data-bridge]';
  var logI = (global.CBLog?.info || console.log).bind(console, MOD);
  var logW = (global.CBLog?.warn || console.warn).bind(console, MOD);

  var FALLBACK_ICON = 'assets/ui/build/icon-placeholder.png'; // bis echte PNGs da sind

  function mapToItems() {
    if (!global.Registry) return [];
    var builds = global.Registry.list('buildings') || [];
    return builds
      .filter(function (b) {
        // standard: nur anzeigen, wenn nicht explizit disabled
        return b.enabled !== false;
      })
      .map(function (b) {
        var icon = (b.ui && b.ui.icon) ? b.ui.icon : FALLBACK_ICON;
        return {
          id:       b.id,
          title:    b.name || b.id,
          category: b.cat || 'admin',   // ← CORE-UI erwartet "category"
          icon:     icon,
          enabled:  b.enabled !== false
        };
      });
  }

  function pushToUI(attempt) {
    attempt = (attempt|0) + 1;
    if (!global.UIBuild || typeof global.UIBuild.setItems !== 'function') {
      // UI noch nicht bereit -> kurz später erneut
      if (attempt <= 10) return void setTimeout(function(){ pushToUI(attempt); }, 60);
      logW('UIBuild.setItems nicht verfügbar');
      return;
    }
    var items = mapToItems();
    global.UIBuild.setItems(items);
    if (typeof global.UIBuild.rerender === 'function') {
      global.UIBuild.rerender();
    }
    logI('Items gesetzt:', items.length);
  }

  // --- Event-Hooks ----------------------------------------------------------
  // Registry ready -> initial befüllen
  global.addEventListener('cb:registry:ready', function () { pushToUI(0); });
  // Bei Upserts nachziehen
  global.addEventListener('cb:registry:update', function () { pushToUI(0); });

  // Falls Registry schon ready war, beim DOM-Start nachziehen
  function bootstrap() {
    if (global.Registry && global.Registry.__ready) pushToUI(0);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  }

  logI('bereit v17.0.5');
})(window);
