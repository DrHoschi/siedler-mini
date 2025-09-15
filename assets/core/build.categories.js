<script>
/*!
 * Build-Categories – v1.1.0
 * Feste Reihenfolge + Labels für das Bau-Menü.
 * Wird von ui-build.data-bridge.js konsumiert.
 */
(function(){
  const CATS = [
    { id: 'admin',   title: 'Allg. / Verwaltung' },
    { id: 'food',    title: 'Produktion / Nahrung' },
    { id: 'raw',     title: 'Produktion / Rohstoffe' },
    { id: 'housing', title: 'Wohnen' },
    { id: 'infra',   title: 'Infrastruktur' },
    { id: 'deco',    title: 'Deko / Landschaft' },
    { id: 'mil',     title: 'Militär' }
  ];

  // global export (nicht umbenennen)
  window.BuildCategories = Object.freeze(CATS);

  (window.CBLog?.info||console.log)(
    `[build.categories] bereit (v1.1.0) — ${CATS.length} Kategorien`
  );
})();
</script>
