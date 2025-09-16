/* ============================================================================
 * Neue Siedler – CORE UI Data-Bridge
 * Version: v17.0.6
 * - Holt Buildings aus Registry
 * - Mappt Items für CORE-UI
 * - Reagiert auf cb:registry:ready / cb:registry:update
 * - Kompat: setzt sowohl "category" (neu) als auch "group" (legacy)
 * - Unterstützt iconsBase + item.icon
 * ========================================================================== */
(function (global) {
  'use strict';
  var MOD = '[ui-build.data-bridge]';
  var logI = (global.CBLog?.info || console.log).bind(console, MOD);
  var logW = (global.CBLog?.warn || console.warn).bind(console, MOD);

  // Fallback-Icon (falls keines auflösbar ist)
  var FALLBACK_ICON = 'assets/ui/build/icon-placeholder.png';

  function joinPath(base, file) {
    if (!base) return file || '';
    if (!file) return base;
    if (base.endsWith('/')) return base + file;
    return base + '/' + file;
  }

  function resolveIcon(b) {
    // Priorität: b.ui.icon → b.icon (+ iconsBase) → FALLBACK
    if (b.ui && b.ui.icon) return b.ui.icon;
    if (b.icon) {
      var ib = (global.Registry && global.Registry.meta && global.Registry.meta.iconsBase)
             || (global.__REGISTRY_ICONS_BASE) // optionaler globaler Hook
             || '';
      return joinPath(ib, b.icon);
    }
    return FALLBACK_ICON;
  }

  function mapToItems() {
    if (!global.Registry) return [];
    var builds = global.Registry.list('buildings') || [];
    return builds
      .filter(function (b) { return b.enabled !== false; })
      .map(function (b) {
        var iconUrl = resolveIcon(b);
        var cat = b.cat || b.category || 'admin';
        return {
          id:       b.id,
          title:    b.name || b.id,
          category: cat,           // neue CORE-UI
          group:    cat,           // legacy-CORE-UI
          icon:     iconUrl,
          enabled:  b.enabled !== false
        };
      });
  }

  function pushToUI(attempt) {
    attempt = (attempt|0) + 1;
    var U = global.UIBuild;
    if (!U || typeof U.setItems !== 'function') {
      if (attempt <= 20) return void setTimeout(function(){ pushToUI(attempt); }, 60);
      return logW('UIBuild.setItems nicht verfügbar');
    }
    var items = mapToItems();
    U.setItems(items);
    if (typeof U.rerender === 'function') U.rerender();
    logI('Items gesetzt:', items.length);
  }

  // Events aus der Registry
  global.addEventListener('cb:registry:ready',  function(){ pushToUI(0); });
  global.addEventListener('cb:registry:update', function(){ pushToUI(0); });

  // Initial versuchen, wenn DOM steht
  function bootstrap(){ if (global.Registry?.__ready) pushToUI(0); }
  if (document.readyState === 'complete' || document.readyState === 'interactive') bootstrap();
  else document.addEventListener('DOMContentLoaded', bootstrap, { once:true });

  logI('bereit v17.0.6');
})(window);
