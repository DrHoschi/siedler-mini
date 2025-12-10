/* ============================================================================
 * Datei   : core/game.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-res-core-v1
 *
 * Zweck   :
 *   Zentraler Produktions-Manager + einheitliche Ressourcen-Zählung
 *
 *   – Hält eine Liste von Produktions-Modulen (wood, stone, fish, …)
 *   – Verteilt Events (cb:build:complete, cb:workarea:set) an die Module
 *   – Bietet Production.addResource(...) als EINHEITLICHEN Weg zum Zählen
 *   – Schickt cb:res:change → HUD aktualisiert sich
 *
 * Integration:
 *   – game.tick.js ruft (falls vorhanden) Production.tick() auf
 *   – Produktions-Module registrieren sich via Production.registerModule({ ... })
 *   – Holz-/Stein-/Fisch-Modul rufen Production.addResource('wood'|'stone'|'fish', ...)
 *
 * Struktur:
 *   IMPORTS (global) → Konstanten → Hilfsfunktionen → Event-Verteiler → Tick →
 *   Bindings → Export (window.Production)
 * ============================================================================ */
(() => {
  'use strict';

  // ==========================================================================
  // KONSTANTEN & LOGGING
  // ==========================================================================
  const TAG   = '[game.production]';
  const LOG   = (...a) => (window.CBLog?.ok   ?? console.log ).call(console,   TAG, ...a);
  const WARN  = (...a) => (window.CBLog?.warn ?? console.warn).call(console,   TAG, ...a);
  const ERR   = (...a) => (window.CBLog?.error?? console.error).call(console,  TAG, ...a);

  /** Tick-Dauer (ms) – sollte zu core/game.tick.js::TICK_MS passen */
  const TICK_MS = 200;

  // ==========================================================================
  // LAUFZEIT-STATE
  // ==========================================================================

  /**
   * Liste aller Produktions-Module.
   * Jedes Modul:
   *   {
   *     id: 'wood',
   *     tick?: (dtMs) => void,
   *     onBuildComplete?: (detail) => void,
   *     onWorkAreaSet?: (detail) => void
   *   }
   */
  const MODULES = [];

  /**
   * Globaler Ressourcen-Speicher.
   *   – Wird außerdem vom HUD gelesen (RegistryValues.*)
   *   – addResource() ist der einzige Weg, diesen Store zu ändern.
   */
  const RES_STORE = (window.RegistryValues = window.RegistryValues || {});

  // ==========================================================================
  // HILFSFUNKTIONEN – RESSOURCEN
  // ==========================================================================

  /**
   * Ressource ändern + HUD / andere Systeme informieren.
   *
   * @param {string} resId   – z.B. 'wood' | 'stone' | 'fish'
   * @param {number} delta   – z.B. +1 / -1
   * @param {string} reason  – Kurztext für Logs ('lumberjack-cycle', 'stone-cycle', ...)
   * @param {string} src     – Quelle/Modul ('wood', 'stone', 'fish', 'unit', ...)
   */
  function addResource(resId, delta, reason, src) {
    if (!resId) return;
    if (!delta || !Number.isFinite(delta)) return;

    const key = String(resId);  // bewusst KEIN 'res.*' Prefix
    const old = Number(RES_STORE[key] || 0);
    const value = old + delta;

    RES_STORE[key] = value;

    // Debug-Log optional
    LOG('Ressource geändert:', { res: key, old, delta, value, reason, src });

    // HUD / andere Systeme informieren
    try {
      window.dispatchEvent(new CustomEvent('cb:res:change', {
        detail: {
          res   : key,                  // 'wood' | 'stone' | 'fish' ...
          old,
          value,
          delta,
          reason: reason || 'prod',
          src   : src    || TAG
        }
      }));
    } catch (e) {
      WARN('cb:res:change dispatch fehlgeschlagen', e);
    }
  }

  /**
   * Aktuellen Wert einer Ressource abfragen.
   * @param {string} resId
   * @returns {number}
   */
  function getResourceValue(resId) {
    if (!resId) return 0;
    return Number(RES_STORE[String(resId)] || 0);
  }

  // ==========================================================================
  // MODUL-REGISTRIERUNG
  // ==========================================================================

  /**
   * Produktions-Modul registrieren (z.B. wood, fish, stone, …)
   *
   * @param {object} mod
   *   - id: string (Pflicht)
   *   - tick?: (dtMs:number) => void
   *   - onBuildComplete?: (detail:object) => void
   *   - onWorkAreaSet?: (detail:object) => void
   */
  function registerModule(mod) {
    if (!mod || !mod.id) {
      WARN('registerModule ohne id aufgerufen', mod);
      return;
    }
    MODULES.push(mod);
    LOG('Modul registriert:', mod.id);
  }

  // ==========================================================================
  // EVENT-VERTEILER
  // ==========================================================================

  /**
   * Event-Verteiler für cb:build:complete.
   *   – Wird aufgerufen, wenn ein Gebäude fertig gebaut ist.
   *   – Alle Module, die onBuildComplete haben, bekommen das detail.
   */
  function handleBuildComplete(ev) {
    const d = ev?.detail || {};
    if (!d) return;

    for (const mod of MODULES) {
      if (typeof mod.onBuildComplete === 'function') {
        try {
          mod.onBuildComplete(d);
        } catch (e) {
          ERR('Fehler in Modul.onBuildComplete:', mod.id, e);
        }
      }
    }
  }

  /**
   * Event-Verteiler für cb:workarea:set.
   *   – Wird aufgerufen, wenn der Arbeitsbereich eines Gebäudes gesetzt/verschoben wird.
   *
   * detail:
   *   { id, uid, cx, cy, radiusTiles, x, y, w, h }
   */
  function handleWorkAreaSet(ev) {
    const d = ev?.detail || {};
    if (!d) return;

    for (const mod of MODULES) {
      if (typeof mod.onWorkAreaSet === 'function') {
        try {
          mod.onWorkAreaSet(d);
        } catch (e) {
          ERR('Fehler in Modul.onWorkAreaSet:', mod.id, e);
        }
      }
    }
  }

  // ==========================================================================
  // ZENTRALER TICK (wird von core/game.tick.js aufgerufen)
  // ==========================================================================

  /**
   * Zentraler Tick – wird von core/game.tick.js alle TICK_MS aufgerufen.
   *   – Reicht dtMs an alle Module durch (damit Zyklen funktionieren).
   */
  function tick() {
    for (const mod of MODULES) {
      if (typeof mod.tick === 'function') {
        try {
          mod.tick(TICK_MS);
        } catch (e) {
          ERR('Fehler in Modul.tick:', mod.id, e);
        }
      }
    }
  }

  // ==========================================================================
  // EVENT-BINDINGS (einmalig)
  // ==========================================================================

  // Gebäude fertiggestellt → an Produktions-Module verteilen
  window.addEventListener('cb:build:complete', handleBuildComplete, { passive: true });

  // Arbeitsbereich geändert → an Produktions-Module verteilen
  window.addEventListener('cb:workarea:set', handleWorkAreaSet, { passive: true });

  // ==========================================================================
  // EXPORT / GLOBAL-API
  // ==========================================================================

  // Bestehendes Production-Objekt NICHT zerstören (wegen core/production.js)
  const Prod = (window.Production = window.Production || {});

  // Nur ergänzen/überschreiben, was wir wirklich brauchen:
  Prod.registerModule   = registerModule;
  Prod.addResource      = addResource;
  Prod.getResourceValue = getResourceValue;
  Prod.tick             = tick;

  // Debug-/Inspector-Einblick
  Prod._state = {
    MODULES,
    RES_STORE
  };

  LOG('Manager geladen v25.12.10-res-core-v1');
})();
