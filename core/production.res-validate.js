/* ============================================================================
 * Datei   : core/production.res-validate.js
 * Projekt : Neue Siedler (Epoche 1 – Basis)
 * Version : v25.10.26-1
 * Autor   : Mann & GPT-5
 * Zweck   : Einmalige Validierung und Initialisierung der Live-Ressourcenwerte
 *
 * ---------------------------------------------------------------------------
 * HINTERGRUND
 * - Registry enthält die Definitionsliste aller Ressourcen (ID, Name, Icon).
 * - RegistryValues enthält die aktuellen Mengen (z. B. { wood:12, stone:5 }).
 * - Wenn Registry neue Ressourcen definiert, fehlen sie evtl. in RegistryValues.
 *
 * Dieses Modul prüft beim Start:
 *   → Welche Ressourcen in Registry existieren?
 *   → Gibt es für jede einen Eintrag in RegistryValues?
 *   → Falls nicht: automatisch anlegen mit Wert 0.
 *
 * Danach sendet es ein einmaliges Snapshot-Event (cb:res:snapshot),
 * damit HUD, Inspector und Production sofort einen sauberen Stand sehen.
 *
 * ---------------------------------------------------------------------------
 * Lauscht : cb:registry:ready, cb:hud-ready, cb:boot:ready, cb:game:start
 * Sendet  : cb:res:snapshot { resources }
 *
 * ---------------------------------------------------------------------------
 * Einbindung (index.html)
 *   <script src="core/registry.js"></script>
 *   <script src="core/production.res-validate.js"></script>
 *   <script src="core/diag.boot.js"></script>
 * ========================================================================== */

(() => {
  'use strict';

  /* =============================== [LOGGING] =============================== */
  const TAG  = '[res-validate]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  /* ========================= [HILFSFUNKTIONEN] ============================ */

  /**
   * Liest alle Ressourcen-IDs aus der Registry-Definitionsliste.
   * Fällt notfalls auf Keys aus RegistryValues zurück.
   */
  function getDefinedResourceIDs() {
    try {
      const R = window.Registry ?? {};
      if (typeof R.list === 'function') {
        const list = R.list('resources');
        if (Array.isArray(list)) return list.map(r => r.id).filter(Boolean);
      }
      // Fallback: Keys aus Registry.data.resources (wenn Map)
      const data = R.data?.resources;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return Object.keys(data);
      }
    } catch (e) {
      WARN('getDefinedResourceIDs fail', e?.message || e);
    }
    // Letzter Fallback: Keys aus globaler Map
    return Object.keys(window.RegistryValues || {});
  }

  /**
   * Ergänzt fehlende Ressourcen in RegistryValues mit Wert 0.
   * Gibt Liste der neu angelegten IDs zurück.
   */
  function ensureValuesExist(ids) {
    const store = (window.RegistryValues = window.RegistryValues || {});
    const missing = [];
    for (const id of ids) {
      if (store[id] == null) {
        store[id] = 0;
        missing.push(id);
      }
    }
    return { store, missing };
  }

  /** Emit-Helper (feuert sowohl auf window als auch document) */
  function emit(eventName, detail) {
    try { window.dispatchEvent(new CustomEvent(eventName, { detail })); } catch(_) {}
    try { document.dispatchEvent(new CustomEvent(eventName, { detail })); } catch(_) {}
  }

  /* ============================ [HAUPTLOGIK] ============================== */

  let done = false; // Flag: läuft nur 1× pro Start

  function validateResourcesOnce(origin) {
    if (done) return;
    try {
      const ids = getDefinedResourceIDs();
      if (!ids.length) {
        WARN('Keine Ressourcen-Definitionen gefunden (noch zu früh?) – Ursprung:', origin);
        return;
      }

      const { store, missing } = ensureValuesExist(ids);
      if (missing.length) {
        WARN('Fehlende Ressourcen ergänzt (0-Initialisierung):', missing.join(', '));
      }

      // Spiegel unter Registry.data.resources aktualisieren (Sicherheit)
      try {
        const R = (window.Registry = window.Registry || {});
        R.data = R.data || {};
        R.data.resources = store;
      } catch (e) {
        WARN('Konnte Registry.data.resources nicht spiegeln:', e?.message || e);
      }

      // Snapshot senden → HUD/Inspector sehen aktuellen Stand sofort
      emit('cb:res:snapshot', { resources: store });
      LOG(`Validierung abgeschlossen (${Object.keys(store).length} Ressourcen).`);
      done = true;
    } catch (e) {
      ERR('Validierung fehlgeschlagen:', e?.message || e);
    }
  }

  /* ============================ [EVENT-BINDINGS] =========================== */
  // Wir lauschen auf mehrere Start-Events – der erste Treffer führt aus.
  addEventListener('cb:registry:ready', () => validateResourcesOnce('registry-ready'));
  addEventListener('cb:boot:ready',     () => validateResourcesOnce('boot-ready'));
  addEventListener('cb:hud-ready',      () => validateResourcesOnce('hud-ready'));
  addEventListener('cb:game:start',     () => validateResourcesOnce('game-start'));

  // Falls die Registry bereits bereit ist (Reload / Hot-Start)
  if (window.Registry?.__ready) setTimeout(() => validateResourcesOnce('late-init'), 0);

  LOG('aktiv (wartet auf cb:registry:ready …)');
})();
