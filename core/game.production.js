/* ============================================================================
 * Datei   : core/game.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.01-core-manager
 *
 * Zweck   :
 *   Zentrale Produktions-Verwaltung (Manager):
 *     - Hält eine Liste von Produktions-Modulen (wood, fish, stone, …)
 *     - Verteilt Events (z.B. cb:build:complete) an die Module
 *     - Ruft pro Tick alle Module auf
 *     - Stellt eine gemeinsame Ressourcenschreib-API bereit (addResource)
 *
 *   WICHTIG:
 *     - KEINE spezifische Gebäudel ogik hier drin (kein Holzfäller-Code)
 *     - Das kommt in core/game.production.wood.js usw.
 *
 * Struktur:
 *   IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → MANAGER-KLASSE → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  // =========================
  // KONSOLE / LOG-HILFEN
  // =========================
  const TAG  = '[prod-core]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // =========================
  // KONSTANTEN
  // =========================
  const TICK_MS = 200; // passend zu game.tick.js (Loop alle 200ms)

  // =========================
  // INTERNER STATE
  // =========================

  /**
   * Liste aller Produktions-Module.
   * Jedes Modul ist ein Objekt:
   *   {
   *     id: 'wood',
   *     tick?: (dtMs) => void,
   *     onBuildComplete?: (detail) => void,
   *     // optional weitere Hooks in Zukunft
   *   }
   */
  const MODULES = [];

  /** Ressourcen-Speicher (globaler, einfacher Store) */
  const RES_STORE = (window.RegistryValues = window.RegistryValues || {});

  // =========================
  // HILFSFUNKTIONEN
  // =========================

  /**
   * Ressource ändern + HUD / andere Systeme informieren.
   *
   * @param {string} resId   – z.B. 'wood'
   * @param {number} delta   – z.B. +1 / -1
   * @param {string} reason  – Kurztext für Logs ('prod', 'lumberjack-cycle', ...)
   * @param {string} src     – Modul/Quelle ('wood', 'fish', ...)
   */
  function addResource(resId, delta, reason, src){
    if (!resId || !delta) return;

    const old   = Number(RES_STORE[resId] || 0);
    const value = old + delta;
    RES_STORE[resId] = value;

    try {
      dispatchEvent(new CustomEvent('cb:res:change', {
        detail:{
          res   : resId,
          old,
          value,
          delta,
          reason: reason || 'prod',
          src   : src || TAG
        }
      }));
    } catch(e){
      WARN('cb:res:change dispatch fehlgeschlagen', e);
    }
  }

  /**
   * Produktions-Modul registrieren (z.B. wood, fish, stone, …)
   *
   * @param {object} mod
   *   - id: string (Pflicht)
   *   - tick?: (dtMs:number) => void
   *   - onBuildComplete?: (detail:object) => void
   */
  function registerModule(mod){
    if (!mod || !mod.id) {
      WARN('registerModule ohne id aufgerufen', mod);
      return;
    }
    MODULES.push(mod);
    LOG('Modul registriert:', mod.id);
  }

  /**
   * Event-Verteiler für cb:build:complete.
   * Hier werden ALLE Produktions-Module informert, die onBuildComplete haben.
   */
  function handleBuildComplete(ev){
    const d = ev?.detail || {};
    if (!d) return;

    for (const mod of MODULES){
      if (typeof mod.onBuildComplete === 'function'){
        try {
          mod.onBuildComplete(d);
        } catch(e){
          ERR('Fehler in Modul.onBuildComplete:', mod.id, e);
        }
      }
    }
  }

  /**
   * Zentraler Tick – wird von core/game.tick.js aufgerufen.
   */
  function tick(){
    for (const mod of MODULES){
      if (typeof mod.tick === 'function'){
        try {
          mod.tick(TICK_MS);
        } catch(e){
          ERR('Fehler in Modul.tick:', mod.id, e);
        }
      }
    }
  }

  // =========================
  // EVENT-BINDINGS
  // =========================

  // Fertiggestelltes Gebäude → an Produktions-Module verteilen
  window.addEventListener('cb:build:complete', handleBuildComplete, { passive:true });

  // =========================
  // EXPORT / GLOBAL-API
  // =========================

  window.Production = window.Production || {};
  window.Production.registerModule = registerModule;
  window.Production.addResource    = addResource;
  window.Production.tick           = tick;
  window.Production._state         = {
    MODULES,
    RES_STORE
  };

  LOG('Manager geladen v25.12.01-core-manager');

})();
