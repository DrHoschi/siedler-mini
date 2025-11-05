/* ============================================================================
 * Datei   : core/boot.js
 * Projekt : Neue Siedler
 * Version : v25.11.03 (boot-skeleton)
 * Zweck   : Zentrale Orchestrierung (Events bündeln, Systeme ankoppeln)
 *
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 *
 * Lauscht  :
 *   cb:ui-ready, cb:assets-ready, cb:registry:ready, req:game:start, req:game:stop
 *
 * Sendet   :
 *   cb:boot:ready           {version}
 *   cb:game-start           {ok:true, map, seed}
 *   cb:game-stop            {ok:true}
 *
 * Verdrahtung:
 *   - Nach assets → Registry laden (core/registry.js muss bereit sein)
 *   - Nach registry → (optional) Produktions-Ticker starten (Production.tickAll)
 *   - Auf Spielstart → Pointer-Events fürs Canvas an, Startpanel schließen (UI übernimmt)
 *
 * Hinweise:
 *   - Debug/Inspector-Tools bleiben aktiv (nicht entfernen).
 *   - Startpanel soll vor Spielstart sichtbar sein; Autostart ist AUS.
 * ============================================================================ */

if (window.__BOOT_INIT__) {
  console.warn('[boot] Doppel-Init verhindert.');
  return;
}
window.__BOOT_INIT__ = true;

;(() => {
  // [IMPORTS] – keine echten Imports (ESM) – nutzt globale Singletons (Registry, Production, Carrier, Warehouse, LogisticsManager, Territory, Market)

  // [KONSTANTEN]
  const BOOT_VERSION = "v25.11.03";
  const DEFAULT_MAP   = "default";
  const DEFAULT_SEED  = Date.now();

  // Konfig: Soll direkt nach Registry-Ready die Produktion getickt werden?
  const AUTO_TICK_AFTER_REGISTRY = true;   // ← Wunsch: cb:registry:ready → Production.tickAll()
  const PRODUCTION_TICK_MS       = 2000;   // Interval für Folgeticks (einfacher Heartbeat)

  // [STATE]
  const state = {
    uiReady: false,
    assetsReady: false,
    registryReady: false,
    gameRunning: false,
    tickTimer: null,
  };

  // [HILFSFUNKTIONEN]
  function logInfo(...args){ console.info("[boot]", ...args); }
  function logWarn(...args){ console.warn("[boot]", ...args); }
  function logErr (...args){ console.error("[boot]", ...args); }

  function startProductionTicker() {
    if (!window.Production) {
      logWarn("Production nicht gefunden – ticker übersprungen.");
      return;
    }
    // Sofort einmal ticken (Erstlauf)
    try { window.Production.tick(); } catch(e){ logErr("Production.tick() Fehler (Erstlauf):", e); }

    // Wiederholender Ticker
    clearInterval(state.tickTimer);
    state.tickTimer = setInterval(() => {
      try { window.Production.tick(); } catch(e){ logErr("Production.tick() Fehler:", e); }
    }, PRODUCTION_TICK_MS);

    logInfo("Produktions-Ticker gestartet (alle", PRODUCTION_TICK_MS, "ms)");
  }

  function stopProductionTicker() {
    clearInterval(state.tickTimer);
    state.tickTimer = null;
    logInfo("Produktions-Ticker gestoppt");
  }

  function canStartGame() {
    return state.uiReady && state.assetsReady && state.registryReady;
  }

  function emitBootReady() {
    dispatchEvent(new CustomEvent("cb:boot:ready", { detail: { version: BOOT_VERSION }}));
  }

  function emitGameStart(map = DEFAULT_MAP, seed = DEFAULT_SEED) {
    dispatchEvent(new CustomEvent("cb:game-start", { detail: { ok:true, map, seed }}));
  }

  function emitGameStop() {
    dispatchEvent(new CustomEvent("cb:game-stop", { detail: { ok:true }}));
  }

  // [KLASSEN]
  class BootManager {
    static get version(){ return BOOT_VERSION; }

    static init() {
      logInfo("BootManager initialisiert", BOOT_VERSION);
      emitBootReady();

      // A) UI
      addEventListener("cb:ui-ready", (e) => {
        state.uiReady = true;
        logInfo("UI bereit – Startpanel sichtbar", e?.detail || {});
      });

      // B) Assets
      addEventListener("cb:assets-ready", (e) => {
        state.assetsReady = true;
        logInfo("Assets bereit ✓", e?.detail || {});
        // Registry laden (falls vorhanden)
        if (window.Registry && typeof window.Registry.load === "function") {
          window.Registry.load().catch(err => logErr("Registry.load Fehler:", err));
        } else {
          logWarn("Registry Modul nicht gefunden – bitte core/registry.js einbinden.");
        }
      });

      // C) Registry
      addEventListener("cb:registry:ready", (e) => {
        state.registryReady = true;
        logInfo("Registry bereit ✓", e?.detail || {});
        if (AUTO_TICK_AFTER_REGISTRY) {
          startProductionTicker();
        } else {
          logInfo("AUTO_TICK_AFTER_REGISTRY = false → kein Auto-Ticker.");
        }
      });

      // D) Spielstart / -stopp
      addEventListener("req:game:start", (e) => {
        const { map = DEFAULT_MAP, seed = DEFAULT_SEED } = e?.detail || {};
        if (!canStartGame()) {
          logWarn("Spielstart blockiert – Voraussetzungen fehlen:", {
            uiReady: state.uiReady, assetsReady: state.assetsReady, registryReady: state.registryReady
          });
          return;
        }
        state.gameRunning = true;
        // Canvas/Pointer-Einstellungen darf dein UI übernehmen; hier nur Event-Handshake:
        emitGameStart(map, seed);
        logInfo("Spiel gestartet →", { map, seed });

        // Falls du Ticker lieber ERST nach Game-Start willst, kannst du hier starten:
        // if (!state.tickTimer) startProductionTicker();
      });

      addEventListener("req:game:stop", () => {
        if (!state.gameRunning) return;
        state.gameRunning = false;
        stopProductionTicker();
        emitGameStop();
        logInfo("Spiel gestoppt");
      });
    }
  }

  // [HAUPTLOGIK]
  // Auto-Initialisierung (DOMContentLoaded-Fallback, falls ui-start.js später feuert)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => BootManager.init(), { once:true });
  } else {
    BootManager.init();
  }

  // [EXPORTS]
  window.Boot = BootManager;
})();
