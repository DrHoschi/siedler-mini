<script>
/* ============================================================================
 * Neue Siedler – Registry JSON Adapter (v1.0.6)
 * Lädt Gebäude-Definitionen aus assets/data/buildings.json
 * und registriert sie in der Core-Registry.
 * Events:
 *   - cb:registry:update  (pro Gebäude)
 *   - cb:registry:ready   (einmal nach kompletter Anwendung)
 * ========================================================================== */
(function (global) {
  'use strict';
  const logI = (global.CBLog?.info  || console.log).bind(console, "[registry.json-adapter]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[registry.json-adapter]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[registry.json-adapter]");

  // --- fester, eindeutiger Pfad ------------------------------------------------
  const JSON_URL = "assets/data/buildings.json";

  // --- kleine Helper -----------------------------------------------------------
  function dispatch(type, detail) {
    try { global.dispatchEvent(new CustomEvent(type, { detail })); } catch (_) {}
  }

  function ensureCategories() {
    // Minimal-Satz gemäß Lastenheft / CORE-UI
    const cats = [
      { id:"admin", name:"Allg. / Verwaltung",   sort:10 },
      { id:"food",  name:"Produktion / Nahrung", sort:20 },
      { id:"raw",   name:"Produktion / Rohstoffe", sort:30 },
    ];
    cats.forEach(c => global.Registry?.upsert?.("categories", c));
  }

  async function loadJSON(url) {
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
    return await res.json();
  }

  function applyData(data) {
    if (!data || !Array.isArray(data.buildings)) {
      logW("Ungültiges JSON-Format – erwartet { buildings: [...] }");
      return { applied:0 };
    }

    const base = (data.iconsBase || "").replace(/\/+$/,""); // optional
    let applied = 0;

    data.buildings.forEach(raw => {
      // Normalize
      const b = { ...raw };
      if (base && b.icon && !/^https?:/i.test(b.icon) && !b.icon.startsWith("assets/")) {
        b.icon = `${base}/${b.icon}`;
      }
      if (typeof b.enabled === "undefined") b.enabled = true;
      if (!b.size) b.size = [1,1];

      // Registrieren (WICHTIG: singular "building")
      if (global.Registry?.register) {
        global.Registry.register("building", b);   // <- korrekt (kein plural!)
        applied++;
      }
    });

    return { applied };
  }

  async function boot() {
    try {
      ensureCategories(); // Kategorien stehen bereit (deutsch)
      const json = await loadJSON(JSON_URL);
      const { applied } = applyData(json);

      // Logging & Events
      const cats = global.Registry?.list?.("categories")?.length || 0;
      const blds = global.Registry?.list?.("buildings") ?.length || 0;

      logI(`geladen aus ${JSON_URL} – angewendet: ${applied} | counts ⇒ cats:${cats} blds:${blds}`);
      dispatch("cb:registry:ready", { ready:true, counts:{ categories:cats, buildings:blds }, source:"json-adapter" });
    } catch (err) {
      logE("Laden fehlgeschlagen:", err);
    }
  }

  logI("Modul geladen v1.0.6");
  // Start so früh wie möglich (die Registry ist in index.html bereits vor uns geladen)
  boot();
})(window);
</script>
