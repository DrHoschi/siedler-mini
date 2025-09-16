<!-- Datei: assets/core/build.categories.js -->
<script>
/* ============================================================================
 * Neue Siedler – Build Categories (CORE)
 * Version: v17.0.5
 * Zweck: Liefert die Kategorien (Tabs) aus der Registry – DE-Namen, sortiert.
 * Events: wartet auf 'cb:registry:ready'
 * ========================================================================== */
(function (global) {
  const logI = (global.CBLog?.info  || console.log).bind(console, "[build.categories]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[build.categories]");

  function getCategories() {
    if (!global.Registry?.list) { logW("Registry nicht bereit"); return []; }
    // Registry liefert z.B.  [{id:"admin", name:"Allg. / Verwaltung", sort:10}, ...]
    const cats = global.Registry.list('categories') || [];
    return cats.slice().sort((a,b) => (a.sort||0) - (b.sort||0))
      .map(c => ({ id: c.id, title: c.name || c.id }));
  }

  function onReady() {
    const tabs = getCategories();
    // Bridge holt die Items; wir veröffentlichen nur die Tab-Konfiguration.
    global.BuildCategories = { version: "17.0.5", tabs };
    logI(`Tabs bereit: ${tabs.map(t=>t.title).join(" | ")}`);
    // Signal (falls jemand hören will)
    try { global.dispatchEvent(new CustomEvent('cb:build-cats-ready', { detail:{ tabs } })); } catch {}
  }

  if (global.Registry?.__ready) onReady();
  else global.addEventListener('cb:registry:ready', onReady, { once:true });
})(window);
</script>
