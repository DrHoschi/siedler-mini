/* ============================================================================
 * Datei   : core/registry.js
 * Projekt : Neue Siedler
 * Version : v25.11.03 (registry-skeleton)
 * Zweck   : Lädt/validiert Spiel-Daten (resources/buildings/units/balance …)
 *
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 *
 * Lädt    :
 *   data/resources.json, data/buildings.json, data/units.json, data/balance.json
 *
 * Sendet  :
 *   cb:registry:ready {version, counts:{resources,buildings,units}}
 *   cb:registry:error {reason, file}
 *
 * Zusätze :
 *   - Einfache Validierung (eindeutige IDs, Pflichtfelder)
 *   - Optionales Auto-Register einiger Buildings in Production (Demo)
 *   - Kompatibel mit deinen Event-Konventionen (cb:/req:)
 * ============================================================================ */

;(() => {

  // [KONSTANTEN]
  const REGISTRY_VERSION = "v25.11.03";
  const PATHS = {
    resources : "data/resources.json",
    buildings : "data/buildings.json",
    units     : "data/units.json",
    balance   : "data/balance.json",
  };

  // [STATE]
  const state = {
    resources : [],
    buildings : [],
    units     : [],
    balance   : {},
    index: {
      resById : new Map(),
      bldById : new Map(),
      unitById: new Map(),
    }
  };

  // [HILFSFUNKTIONEN]
  function logInfo(...a){ console.info("[registry]", ...a); }
  function logWarn(...a){ console.warn("[registry]", ...a); }
  function logErr (...a){ console.error("[registry]", ...a); }

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Laden: ${url}`);
    return res.json();
  }

  function assertUnique(list, key, fileLabel) {
    const seen = new Set();
    for (const obj of list) {
      const id = obj[key];
      if (!id) throw new Error(`Fehlende ID in ${fileLabel}`);
      if (seen.has(id)) throw new Error(`Doppelte ID "${id}" in ${fileLabel}`);
      seen.add(id);
    }
  }

  function buildIndices() {
    state.index.resById.clear();
    state.index.bldById.clear();
    state.index.unitById.clear();

    for (const r of state.resources) state.index.resById.set(r.id, r);
    for (const b of state.buildings) state.index.bldById.set(b.id, b);
    for (const u of state.units)     state.index.unitById.set(u.id, u);
  }

  function emitReady() {
    dispatchEvent(new CustomEvent("cb:registry:ready", {
      detail: {
        version: REGISTRY_VERSION,
        counts: {
          resources: state.resources.length,
          buildings: state.buildings.length,
          units    : state.units.length,
        }
      }
    }));
  }

  function emitError(reason, file) {
    dispatchEvent(new CustomEvent("cb:registry:error", { detail: { reason, file }}));
  }

  // Optional: Ein paar Beispiel-Gebäude sofort in Production registrieren,
  // falls vorhanden (reine Demo – du kannst dies jederzeit entfernen/erweitern).
  function autoRegisterProductionFromBuildings() {
    if (!window.Production) {
      logWarn("Production nicht verfügbar – keine Auto-Registrierung.");
      return;
    }
    const candidates = state.buildings.filter(b => b.io && b.io.output);
    for (const b of candidates) {
      try {
        window.Production.register(b.id, b.io);
      } catch (e) {
        logWarn("Production.register fehlgeschlagen:", b.id, e);
      }
    }
    logInfo("Production: registrierte Gebäude (IO):", candidates.length);
  }

  // [KLASSEN]
  class RegistryManager {
    static get version(){ return REGISTRY_VERSION; }
    static get data() { return state; }

    static async load() {
      try {
        logInfo("Lade/prüfe Daten …");

        // Parallel laden
        const [resources, buildings, units, balance] = await Promise.all([
          loadJSON(PATHS.resources),
          loadJSON(PATHS.buildings),
          loadJSON(PATHS.units),
          loadJSON(PATHS.balance),
        ]);

        // Basis-Zuweisung
        state.resources = Array.isArray(resources) ? resources : (resources?.list || []);
        state.buildings = Array.isArray(buildings) ? buildings : (buildings?.list || []);
        state.units     = Array.isArray(units)     ? units     : (units?.list || []);
        state.balance   = balance || {};

        // Validierung
        assertUnique(state.resources, "id", "resources.json");
        assertUnique(state.buildings, "id", "buildings.json");
        assertUnique(state.units,     "id", "units.json");

        // Indizes
        buildIndices();

        logInfo("Daten OK ✓",
          `R:${state.resources.length}`, `B:${state.buildings.length}`, `U:${state.units.length}`
        );

        // (Optional) Gebäude in Production registrieren (damit Tick sofort etwas zu tun hat)
        autoRegisterProductionFromBuildings();

        // Fertig
        emitReady();
        return true;

      } catch (err) {
        logErr("Fehler beim Laden/Validieren:", err);
        emitError(err?.message || "unknown", "registry.load");
        throw err;
      }
    }

    static getResource(id){ return state.index.resById.get(id); }
    static getBuilding(id){ return state.index.bldById.get(id); }
    static getUnit(id){ return state.index.unitById.get(id); }
  }

  // [HAUPTLOGIK]
  // (keine Auto-Ausführung; Boot ruft Registry.load() nach assets-ready auf)

  // [EXPORTS]
  window.Registry = RegistryManager;

})();
