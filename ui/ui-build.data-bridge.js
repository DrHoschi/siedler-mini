/* ============================================================================
 * Neue Siedler – CORE UI Data-Bridge
 * Dateiname: assets/core/ui-build.data-bridge.js
 * Version: v17.0.4
 *
 * Aufgabe:
 *  - Registry -> UI-Build Items mappen und an UIBuild liefern
 *  - reagiert auf cb:registry:ready und cb:registry:update
 *  - funktioniert, egal ob die Registry vor oder nach UIBuild kommt
 * ========================================================================== */
(function (global) {
  'use strict';
  var MOD = '[ui-build.data-bridge]';
  var logI = (global.CBLog?.info || console.log).bind(console, MOD);
  var logW = (global.CBLog?.warn || console.warn).bind(console, MOD);

  var FALLBACK_ICON = 'assets/ui/build/icon-placeholder.png'; // optional; wenn nicht vorhanden, zeigt UI ihr ?-Icon

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
          id: b.id,
          title: b.name || b.id,
          group: b.cat || 'admin',        // Tab-Zuordnung: id der Kategorie
          icon: icon,
          enabled: b.enabled !== false
        };
      });
  }

  function pushToUI() {
    if (!global.UIBuild || typeof global.UIBuild.setItems !== 'function') {
      // UI noch nicht bereit -> später erneut versuchen
      setTimeout(pushToUI, 60);
      return;
    }
    var items = mapToItems();
    global.UIBuild.setItems(items);
    // Falls Dock offen: Re-Render anstoßen
    if (typeof global.UIBuild.rerender === 'function') {
      global.UIBuild.rerender();
    }
    logI('Items gesetzt:', items.length);
  }

  // --- Event-Hooks ----------------------------------------------------------
  // Registry ready -> initial befüllen
  global.addEventListener('cb:registry:ready', function () {
    pushToUI();
  });
  // Bei Upserts nachziehen
  global.addEventListener('cb:registry:update', function () {
    pushToUI();
  });

  // Falls Registry schon ready war, beim DOM-Start nachziehen
  function bootstrap() {
    if (global.Registry && global.Registry.__ready) {
      pushToUI();
    } else {
      // falls sehr früh geladen wurde, noch einmal kurz probieren
      setTimeout(function () {
        if (global.Registry && global.Registry.__ready) pushToUI();
      }, 120);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  }

  logI('bereit');
})(window);
