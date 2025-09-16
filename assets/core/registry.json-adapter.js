/* ============================================================================
 * registry.json-adapter.js – v1.0.3
 * Aufgabe: Lies assets/registry/buildings.json und registriere ALLE Gebäude
 * bei der zentralen Registry (type = "building", SINGULAR!).
 * Ereignis: dispatch 'cb:registry:ready' danach (mit counts).
 * Pfad: assets/core/registry.json-adapter.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const logI = (global.CBLog?.info  || console.log).bind(console, "[registry.json-adapter]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[registry.json-adapter]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[registry.json-adapter]");

  // Standard-Ort der JSON (du hast ihn so verwendet):
  const JSON_URL = "assets/registry/buildings.json";

  function resolveIconURL(base, name) {
    if (!name) return null;
    // absolute oder relative Pfade einfach durchlassen
    if (/^https?:\/\//i.test(name) || name.startsWith("assets/")) return name;
    return (base ? (base.replace(/\/+$/,"") + "/") : "") + name;
  }

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " beim Laden von " + url);
    return res.json();
  }

  function toBuildingEntries(data) {
    const base = data.iconsBase || "";
    const list = Array.isArray(data.buildings) ? data.buildings : [];
    return list.map(b => ({
      id:        b.id,
      name:      b.name,
      cat:       b.cat,
      sprite:    b.sprite,
      icon:      resolveIconURL(base, b.icon),
      enabled:   !!b.enabled,
      size:      Array.isArray(b.size) ? b.size.slice(0,2) : [1,1],
      place:     b.place,
      // Zusatzfelder, falls die UI sie nutzen will:
      type:      "building"
    }));
  }

  function registerAll(buildings) {
    const R = global.Registry;
    if (!R || typeof R.register !== "function") {
      logW("Registry nicht bereit – verschiebe Registrierung");
      // Fallback: erst nach Registry-Ready registrieren
      const onReady = () => {
        try { doRegister(); } finally {
          global.removeEventListener("cb:registry:ready", onReady);
        }
      };
      global.addEventListener("cb:registry:ready", onReady);
      return;
    }
    doRegister();

    function doRegister() {
      let count = 0;
      buildings.forEach(b => {
        try {
          // *** WICHTIG: SINGULAR 'building' ***
          R.register("building", b);
          count++;
        } catch (e) { logE("Fehler bei register(building,", b.id, "):", e); }
      });
      logI("applied " + count + " buildings");
      try {
        const cats = (R.list && R.list("categories") || []).length || 0;
        const blds = (R.list && R.list("buildings")  || []).length || 0;
        global.dispatchEvent(new CustomEvent("cb:registry:ready", {
          detail: { ready:true, counts:{ categories:cats, buildings:blds }, source:"json-adapter" }
        }));
        logI("ready dispatched (cats: " + cats + " blds: " + blds + " )");
      } catch {}
    }
  }

  (async function boot(){
    try {
      logI("Modul geladen v1.0.3");
      const data = await loadJSON(JSON_URL);
      const buildings = toBuildingEntries(data);
      registerAll(buildings);
    } catch (e) {
      logE("Konnte JSON nicht anwenden:", e);
    }
  })();
})(window);
