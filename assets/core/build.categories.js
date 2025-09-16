/* ============================================================================
 * Neue Siedler – Build Categories (CORE)
 * Datei: assets/core/build.categories.js
 * Version: v17.0.4
 *
 * Zweck:
 *  - Liefert ausschließlich die KATEGORIEN/Tabs für das Bau-Menü.
 *  - KEINE Items/Buildings mehr hier! Die kommen aus der Registry
 *    (registry.js + registry.json-adapter.js) und werden von
 *    ui-build.data-bridge.js ins UI gemappt.
 *
 * Events/Verträge:
 *  - UI erwartet window.BuildCategories.list() → Array<{id, name, sort, icon?}>
 *  - IDs müssen mit den "cat"-Werten in buildings übereinstimmen.
 *  - Reihenfolge via "sort".
 * ========================================================================== */
(function initBuildCategories (global) {
  'use strict';

  const logI = (global.CBLog?.info || console.log).bind(console, '[build.categories]');
  const logW = (global.CBLog?.warn || console.warn).bind(console, '[build.categories]');

  // — Kategorien/Tabs --------------------------------------------------------
  // Namen/IDs müssen zu deinen Registry/JSON-Daten passen.
  const CATEGORIES = [
    { id: 'admin', name: 'Allg. / Verwaltung',    sort: 10, icon: null },
    { id: 'food',  name: 'Produktion / Nahrung',  sort: 20, icon: null },
    { id: 'raw',   name: 'Produktion / Rohstoffe',sort: 30, icon: null },
  ];

  // — API --------------------------------------------------------------------
  const API = {
    version: '17.0.4',
    list() { return CATEGORIES.slice().sort((a,b) => a.sort - b.sort); },
    get(id) {
      const hit = CATEGORIES.find(c => c.id === id);
      if (!hit) logW('Unbekannte Kategorie:', id);
      return hit || null;
    }
  };

  // global registrieren (read-only)
  Object.defineProperty(global, 'BuildCategories', {
    value: API,
    writable: false,
    configurable: false,
    enumerable: true
  });

  logI(`bereit v${API.version} (Tabs: ${CATEGORIES.length})`);
})(window);
