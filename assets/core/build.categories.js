<script>
/* ============================================================================
 * Neue Siedler – Build Categories (v17.0.6)
 * Reihenfolge & Beschriftungen für das Bau-Menü (CORE-UI)
 * ========================================================================== */
(function (global) {
  'use strict';
  const logI = (global.CBLog?.info || console.log).bind(console, "[build.categories]");

  // Reihenfolge / Labels
  const CATS = [
    { id:"admin", name:"Allg. / Verwaltung",   sort:10 },
    { id:"food",  name:"Produktion / Nahrung", sort:20 },
    { id:"raw",   name:"Produktion / Rohstoffe", sort:30 },
  ];

  // In Registry spiegeln (damit UI-Bridge konsistente Namen / Sort hat)
  if (global.Registry?.upsert) {
    CATS.forEach(c => global.Registry.upsert("categories", c));
  }

  // Für CORE-UI exportieren (falls abgefragt)
  global.__BUILD_CATEGORIES__ = CATS.slice();

  logI(`bereit – Kategorien: ${CATS.map(c=>c.name).join(", ")}`);
})(window);
</script>
