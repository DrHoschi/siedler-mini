/* ============================================================================
 * ui-build.data-bridge.js
 * Version: v17.0.8
 * Aufgabe:
 *   - Holt Kategorien & Gebäude aus Registry
 *   - Formt sie für CORE-UI (UIBuild) auf
 *   - Schickt UIBuild.setData({ categories, items }) ODER Legacy: setCategories/setItems
 * Voraussetzungen:
 *   - window.Registry (mit list('categories'|'buildings'))
 *   - window.UIBuild (mit setData(...) ODER setCategories + setItems)
 * Events:
 *   - Reagiert auf cb:registry:ready und cb:registry:update
 * ========================================================================== */
(function (global) {
  'use strict';
  var logI = (global.CBLog?.info  || console.log).bind(console, "[ui-build.data-bridge]");
  var logW = (global.CBLog?.warn  || console.warn).bind(console, "[ui-build.data-bridge]");

  function getCategories() {
    var list = (global.Registry?.list?.("categories") || []).slice();
    // Sicherheit: deutsche Labels erzwingen/fallbacken
    list.forEach(function(c){
      if (!c.name) {
        if (c.id === "admin") c.name = "Verwaltung";
        else if (c.id === "food") c.name = "Produktion / Nahrung";
        else if (c.id === "raw")  c.name = "Produktion / Rohstoffe";
        else c.name = c.id;
      }
    });
    // sort falls vorhanden
    list.sort(function(a,b){ return (a.sort||0) - (b.sort||0); });
    return list;
  }

  function getItems() {
    var blds = (global.Registry?.list?.("buildings") || []).slice();
    // UI-Friendly Struktur
    return blds.map(function(b){
      return {
        id: b.id,
        name: b.name || b.id,
        icon: b.icon || "assets/ui/build/unknown.png",
        sprite: b.sprite || "",
        cat: b.cat,
        enabled: !!b.enabled,
        size: Array.isArray(b.size) ? b.size : [1,1],
        place: b.place || ""
      };
    });
  }

  function pushToUI() {
    var cats  = getCategories();
    var items = getItems();

    if (!global.UIBuild) { logW("UIBuild fehlt (noch) – spätere Wiederholung."); return; }

    if (typeof global.UIBuild.setData === "function") {
      global.UIBuild.setData({ categories: cats, items: items });
      logI("Data gesetzt: cats=" + cats.length + " items=" + items.length);
    } else {
      // Legacy 2-Aufrufe
      global.UIBuild.setCategories?.(cats);
      global.UIBuild.setItems?.(items);
      logI("Items gesetzt: " + items.length);
    }
  }

  // bei Registry-Ready & Update schieben
  global.addEventListener("cb:registry:ready",  pushToUI);
  global.addEventListener("cb:registry:update", pushToUI);
  // Falls UIBuild später kommt: kleiner Poll-Kick
  var tries = 0, timer = setInterval(function(){
    tries++;
    if (global.UIBuild && global.Registry) { clearInterval(timer); pushToUI(); }
    if (tries > 100) clearInterval(timer);
  }, 50);

  logI("bereit v17.0.8");
})(window);
