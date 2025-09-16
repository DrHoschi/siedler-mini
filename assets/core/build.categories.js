/* ============================================================================
 * build.categories.js – v17.0.4
 * Aufgabe: Kategorien in die Registry eintragen (für Tabs/Filter im Bau-Menü)
 * Reihenfolge/Sortierung nach Lastenheft & Monolith.
 * Pfad: assets/core/build.categories.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const logI = (global.CBLog?.info || console.log).bind(console, "[build.categories]");

  const CATEGORIES = [
    { id:"admin",   name:"Allg. / Verwaltung",   sort:10 },
    { id:"food",    name:"Produktion / Nahrung", sort:20 },
    { id:"raw",     name:"Produktion / Rohstoffe", sort:30 },
    // Erweiterungen aus der Basis:
    { id:"housing", name:"Wohnen",               sort:40 },   // Wohnhaus etc.
    { id:"infra",   name:"Infrastruktur",        sort:50 },   // Straßen …
    { id:"deco",    name:"Deko / Landschaft",    sort:60 },   // Paint/Steine/Gras
    { id:"mil",     name:"Militär",              sort:70 }    // Wachtturm …
  ];

  function ensureCategories() {
    const R = global.Registry;
    if (!R || typeof R.register !== "function") return false;
    CATEGORIES.forEach(cat => R.register("category", cat));
    logI("Kategorien registriert:", CATEGORIES.length);
    try {
      const cats = (R.list && R.list("categories") || []).length || 0;
      const blds = (R.list && R.list("buildings")  || []).length || 0;
      global.dispatchEvent(new CustomEvent("cb:registry:update", {
        detail: { kind:"categories", total: cats }
      }));
      // Falls UI auf ready wartet, einmal freundlich winken:
      global.dispatchEvent(new CustomEvent("cb:registry:ready", {
        detail: { ready:true, counts:{ categories:cats, buildings:blds }, source:"build.categories" }
      }));
    } catch {}
    return true;
  }

  // Direkt versuchen, ansonsten warten bis Registry bereit ist
  if (!ensureCategories()) {
    global.addEventListener("cb:registry:ready", function once(){
      if (ensureCategories()) global.removeEventListener("cb:registry:ready", once);
    });
  }
})(window);
