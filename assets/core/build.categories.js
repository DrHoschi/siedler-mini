/* ============================================================================
 * Neue Siedler – BUILD CATEGORIES (Registry-Seed)
 * Version: v17.0.3
 * Aufgabe: Tabs/Kategorien bereitstellen
 * ============================================================================
 */
(function seedCategories (global) {
  const logI = (global.CBLog?.info  || console.log).bind(console, "[build.categories]");

  const cats = [
    { id:"admin", name:"Allg. / Verwaltung",   sort:10 },
    { id:"food",  name:"Produktion / Nahrung", sort:20 },
    { id:"raw",   name:"Produktion / Rohstoffe", sort:30 },
  ];

  function upsertAll(){
    if (!global.Registry) return;
    cats.forEach(c => global.Registry.upsert?.("categories", c));
    logI("Kategorien registriert:", cats.length);
  }

  if (global.Registry?.__ready) upsertAll();
  global.addEventListener("cb:registry:ready", upsertAll, { once:true });
})(window);
