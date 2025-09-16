<!-- Datei: assets/core/ui-build.data-bridge.js -->
<script>
/* ============================================================================
 * Neue Siedler – UI-Build Data Bridge (CORE)
 * Version: v17.0.7
 * Zweck: Nimmt Kategorien + Buildings aus der Registry, gruppiert nach cat,
 *        und gibt sie an die CORE-UI weiter (UIBuild.setItems).
 * Erwartet:
 *   - window.BuildCategories.tabs  (aus build.categories.js)
 *   - window.Registry.list('buildings')
 * ========================================================================== */
(function (global) {
  const logI = (global.CBLog?.info  || console.log).bind(console, "[ui-build.data-bridge]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[ui-build.data-bridge]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[ui-build.data-bridge]");

  function groupItems() {
    const tabs = (global.BuildCategories?.tabs) || [];
    const catIds = new Set(tabs.map(t => t.id));
    const itemsByCat = {};
    tabs.forEach(t => itemsByCat[t.id] = []);

    const buildings = (global.Registry?.list?.('buildings') || [])
      .filter(b => b && (b.enabled !== false)); // default: enabled, nur false raus

    const iconsBase = (global.Registry?.iconsBase) || (global.__buildingsIconsBase) || "assets/ui/build/";

    const items = buildings.map(b => ({
      id: b.id,
      title: b.name || b.id,
      icon: b.icon ? (iconsBase.replace(/\/?$/, '/') + b.icon) : null,
      sprite: b.sprite || null,
      place: b.place || null,
      cat: b.cat || "misc"
    }));

    // Gruppieren
    items.forEach(it => {
      const c = catIds.has(it.cat) ? it.cat : (tabs[0]?.id || "misc");
      itemsByCat[c].push(it);
    });

    // Sortierung innerhalb der Kategorie: alphabetisch nach title
    Object.keys(itemsByCat).forEach(c => {
      itemsByCat[c].sort((a,b) => a.title.localeCompare(b.title, 'de'));
    });

    return { tabs, itemsByCat };
  }

  function pushToUI() {
    if (!global.UIBuild?.setItems) { logW("UIBuild.setItems fehlt"); return; }
    const { tabs, itemsByCat } = groupItems();
    global.UIBuild.setItems({ tabs, itemsByCat });
    const count = Object.values(itemsByCat).reduce((n, arr) => n + arr.length, 0);
    logI(`Items gesetzt: ${count}`);
  }

  function maybeRun() {
    if (!global.Registry?.__ready) return;       // erst wenn Registry fertig
    if (!global.BuildCategories?.tabs) return;   // erst wenn Tabs da sind
    pushToUI();
  }

  // Reagiere auf beide „ready“-Signale
  global.addEventListener('cb:registry:ready',  maybeRun);
  global.addEventListener('cb:build-cats-ready', maybeRun);

  // Falls alles schon da:
  setTimeout(maybeRun, 0);

  // Bei Updates (z.B. JSON-Adapter nachlädt)
  global.addEventListener('cb:registry:update', function(){ setTimeout(maybeRun, 0); });

})(window);
</script>
