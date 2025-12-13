/* ============================================================================
 * Datei   : core/production.res-validate.js
 * Projekt : Neue Siedler (Epoche 1 – Basis)
 * Version : v25.12.13-emit-change-after-hud
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
 * Danach sendet es ein Snapshot-Event (cb:res:snapshot).
 *
 * WICHTIG (Fix v25.12.13):
 * - Das HUD (ui-hud-v2) lauscht NUR auf cb:res:change.
 * - res-validate lief bisher oft schon bei cb:registry:ready und hat dann
 *   nur cb:res:snapshot gesendet. Ergebnis: Store hatte z.B. food/gold=20,
 *   aber HUD blieb bei 0 bis zum ersten echten cb:res:change (z.B. HQ-Kosten).
 * - Lösung: Initialisierung bleibt 1×, aber wir "broadcasten" den Stand
 *   NACH cb:hud-ready zusätzlich als cb:res:change (value) für jede Ressource.
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
  const VER  = 'v25.12.13-emit-change-after-hud';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // -------------------------------------------------------------------------
  // DEV/TEST-DEFAULTS
  // -------------------------------------------------------------------------
  // Damit man beim Testen nicht sofort blockiert (Bauen/Produktion), geben wir
  // Epoche-1-Basis-Ressourcen standardmäßig einen Startwert.
  // Hinweis: Nur für FEHLENDE Einträge – vorhandene Werte werden nie überschrieben.
  const DEV_START_DEFAULT = 20;
  const DEV_START_IDS     = new Set(['wood','stone','food','gold','fish']);


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
        store[id] = DEV_START_IDS.has(id) ? DEV_START_DEFAULT : 0;
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

  // Flags:
  let didInit = false;        // Werte im Store ergänzt
  let didHudBroadcast = false; // Werte an HUD/Inspector als cb:res:change gepusht

  /**
   * Broadcastet den aktuellen Stand so, dass UI-Module, die nur auf
   * cb:res:change hören, sofort korrekt sind.
   */
  function broadcastToUI(store, origin){
    if (!store || typeof store !== 'object') return;

    // 1) Snapshot (für Tools, die Snapshots kennen)
    emit('cb:res:snapshot', { resources: store, origin });

    // 2) Change pro Ressource (für HUD v2)
    try {
      for (const [res, v] of Object.entries(store)){
        const value = Number(v || 0);
        // old ist hier egal – HUD nutzt nur value
        emit('cb:res:change', {
          res,
          value,
          old: value,
          delta: 0,
          reason: 'res-validate',
          src: TAG
        });
      }
    } catch(e){
      WARN('broadcastToUI fail', e?.message || e);
    }
  }

  function validateResourcesOnce(origin) {
    try {
      // Store ggf. 1× initialisieren
      let ids = getDefinedResourceIDs();
      // HUD-Fallback nutzt u.a. 'food' → sicherstellen, dass Keys existieren.
      ids = Array.from(new Set([...(ids||[]), ...Array.from(DEV_START_IDS)]));
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

      // Init-Log nur 1×
      if (!didInit){
        LOG(`Validierung abgeschlossen (${Object.keys(store).length} Ressourcen).`);
        didInit = true;
      }

      // Broadcast an UI (nur sinnvoll, wenn HUD schon lauscht)
      if (origin === 'hud-ready' && !didHudBroadcast){
        broadcastToUI(store, origin);
        didHudBroadcast = true;
        LOG('UI-Broadcast nach hud-ready gesendet.');
      } else {
        // Für Debug/Tools wenigstens Snapshot anbieten (ohne Spammen)
        emit('cb:res:snapshot', { resources: store, origin });
      }
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

  // Debug-Haken: falls du im Inspector/Console nachträglich den HUD-Stand
  // nochmal pushen willst:
  //   window.dispatchEvent(new CustomEvent('req:res:rebroadcast'))
  addEventListener('req:res:rebroadcast', () => {
    try {
      const store = window.RegistryValues || {};
      broadcastToUI(store, 'manual');
      LOG('UI-Broadcast manuell ausgelöst.');
    } catch(e){
      WARN('req:res:rebroadcast fail', e?.message || e);
    }
  });

  // Falls die Registry bereits bereit ist (Reload / Hot-Start)
  if (window.Registry?.__ready) setTimeout(() => validateResourcesOnce('late-init'), 0);

  LOG('aktiv', VER, '(wartet auf cb:registry:ready …)');
})();
