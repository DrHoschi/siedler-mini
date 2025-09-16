/* ============================================================================
 * Neue Siedler – Registry JSON-Adapter
 * Version: v1.0.7
 * Aufgabe: Lädt buildings.json und trägt Einträge sauber in die Registry ein.
 *
 * Fest definiert: Quelle = assets/data/buildings.json  (nur dieser Pfad!)
 * Events:  - cb:registry:ready (wenn Registry noch nicht ready war)
 *          - cb:registry:update (pro upsert löst Registry selbst aus)
 *          - cb:assets-ready   (nachdem alle Buildings verarbeitet sind)
 * ========================================================================== */
(function loadRegistryFromJSON(global){
  'use strict';
  const logI = (global.CBLog?.info  || console.log).bind(console, "[registry.json-adapter]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[registry.json-adapter]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[registry.json-adapter]");

  // --- feste Quelle (kein Fallback-Zoo mehr) --------------------------------
  const JSON_URL = "assets/data/buildings.json";

  // Hilfen
  function dispatch(type, detail){ try{ global.dispatchEvent(new CustomEvent(type,{detail})); }catch{} }
  function onceRegistryReadyPing(){
    if (!global.Registry) return;
    if (onceRegistryReadyPing.__done) return;
    onceRegistryReadyPing.__done = true;
    try { global.Registry.__ready = true; } catch(_){}
    const cats = global.Registry.list?.('categories')?.length || 0;
    const blds = global.Registry.list?.('buildings') ?.length || 0;
    dispatch("cb:registry:ready", { ready:true, counts:{categories:cats, buildings:blds}, source:"json-adapter" });
  }

  // Fetch + Verarbeiten
  fetch(JSON_URL, { cache:"no-store" })
    .then(r => {
      if (!r.ok) throw new Error("HTTP "+r.status+" für "+JSON_URL);
      return r.json();
    })
    .then(data => {
      if (!global.Registry) { logW("Registry fehlt – breche ab"); return; }

      // iconsBase optional
      const base = (data && typeof data.iconsBase === "string") ? data.iconsBase.replace(/\/+$/,"") + "/" : "";
      const list = Array.isArray(data?.buildings) ? data.buildings : [];
      if (!list.length){ logW("Keine buildings im JSON."); }

      // Einträge upserten (KORREKT: type "building", NICHT "buildings")
      let count = 0;
      for (const raw of list){
        const item = { ...raw };
        // Icon normalisieren (falls nur Dateiname geliefert)
        if (item.icon && !/^(data:|https?:|assets\/)/.test(item.icon)){
          item.icon = base + item.icon;
        }
        // Minimalfelder absichern
        item.enabled = (item.enabled !== false);
        item.size = Array.isArray(item.size) ? item.size : [1,1];

        // Ab in die Registry
        try {
          global.Registry.register("building", item);
          count++;
        } catch(e){
          logE("Fehler beim register(building):", e, item);
        }
      }

      logI(`applied ${count} buildings aus ${JSON_URL}`);

      // Ready/Eventing
      onceRegistryReadyPing();
      dispatch("cb:assets-ready", { ok:true, buildings:count, src:JSON_URL });
    })
    .catch(err => {
      logE("Konnte JSON nicht laden:", err?.message || err);
      // Wir feuern trotzdem ein ready, damit UI nicht hängen bleibt.
      onceRegistryReadyPing();
      dispatch("cb:assets-ready", { ok:false, buildings:0, src:JSON_URL, error:String(err?.message||err) });
    });

  logI("Modul geladen v1.0.7");
})(window);
