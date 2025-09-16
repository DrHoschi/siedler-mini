/* ============================================================================
 * build.categories.js (Fallback)
 * Version: v17.0.6
 * Aufgabe: Stellt Kategorien bereit, falls Registry keine liefert.
 * ========================================================================== */
(function(){
  'use strict';
  if (!window.Registry?.list) return; // Wenn Registry fehlt, nichts tun

  var haveCats = (window.Registry.list("categories") || []).length > 0;
  if (haveCats) return; // es gibt bereits Kategorien

  var fallbackCats = [
    { id:"admin", name:"Verwaltung", sort:10 },
    { id:"food",  name:"Produktion / Nahrung", sort:20 },
    { id:"raw",   name:"Produktion / Rohstoffe", sort:30 }
  ];
  fallbackCats.forEach(function(c){
    if (typeof window.Registry.register === "function") {
      window.Registry.register("category", c);
    } else if (typeof window.Registry.upsert === "function") {
      window.Registry.upsert("categories", c);
    }
  });
})();
