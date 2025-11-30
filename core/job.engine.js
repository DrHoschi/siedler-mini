/* ============================================================================
 * Datei    : core/job.engine.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-final-JobHQ
 * Zweck    : Vereinfachte Job-Engine
 *            - kümmert sich aktuell NUR darum:
 *              → wenn HQ fertig gebaut ist:
 *                * HQ-Position an Units übergeben
 *                * Träger am HQ spawnen
 *
 * Später:
 *   - Baujobs für andere Gebäude
 *   - Produktionsjobs (Holz, Fisch, Stein, ...)
 *   - Prioritäten / Warteschlangen
 * ============================================================================
 */
(function () {
  'use strict';

  const global = window;
  const LOG  = global.LOG  ? global.LOG.bind(global,  '[job.engine]') : console.log.bind(console, '[job.engine]');
  const WARN = global.WARN ? global.WARN.bind(global, '[job.engine]') : console.warn.bind(console, '[job.engine]');

  const Game  = global.Game  || null;
  const Units = global.GameUnits || null;

  // ---------------------------------------------------------------------------
  // Helper: HQ-Mitte aus einem Building-Objekt berechnen
  // building: { id, tx, ty, w, h }
  // ---------------------------------------------------------------------------
  function getBuildingCenter(building) {
    if (!building) return null;

    const w = building.w || 1;
    const h = building.h || 1;

    // Mitte der Kachelfläche (wie früher: +w/2 - 0.5)
    const cx = (building.tx || 0) + w / 2 - 0.5;
    const cy = (building.ty || 0) + h / 2 - 0.5;

    return { cx, cy };
  }

  // ---------------------------------------------------------------------------
  // Handler für cb:build:complete
  // ---------------------------------------------------------------------------
  function handleBuildComplete(ev) {
    try {
      const building = ev && ev.building;
      if (!building) {
        WARN('handleBuildComplete: kein building im Event', ev);
        return;
      }

      const id = building.id;
      LOG('handleBuildComplete für', id, building);

      // 1) HQ fertig → HQ-Position setzen + Träger spawnen
      if (id === 'b.hq') {
        const center = getBuildingCenter(building);
        if (!center) {
          WARN('HQ fertig, aber Center konnte nicht berechnet werden', building);
          return;
        }

        if (!Units) {
          WARN('HQ fertig, aber GameUnits nicht verfügbar');
          return;
        }

        if (typeof Units.setHQPos === 'function') {
          Units.setHQPos(center.cx, center.cy);
        } else {
          WARN('Units.setHQPos fehlt');
        }

        if (typeof Units.spawnCarriersForHQ === 'function') {
          Units.spawnCarriersForHQ(3); // aktuell: 3 Träger
        } else {
          WARN('Units.spawnCarriersForHQ fehlt');
        }

        LOG('HQ fertig → HQPos gesetzt + Carrier gespawnt', center);
        return;
      }

      // 2) Andere Gebäude: aktuell nur Log, noch keine Jobs
      LOG('Gebäude fertig (noch keine Job-Logik):', id);

      // Hier später: Baujobs/Produktion für Lumberjack, Fisher etc. anlegen

    } catch (e) {
      // WICHTIG: hier KEIN "this.hqPos" o.ä. mehr verwenden → der alte Fehler kam daher
      WARN('handleBuildComplete Fehler', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Start-Funktion: registriert Event-Listener
  // ---------------------------------------------------------------------------
  function start() {
    if (!Game || typeof Game.on !== 'function') {
      WARN('start(): Game oder Game.on nicht verfügbar – JobEngine bleibt passiv');
      return;
    }

    // Auf "Gebäude fertig" reagieren
    Game.on('cb:build:complete', handleBuildComplete);

    LOG('JobEngine bereit (HQ-Logik aktiv)');
  }

  // ---------------------------------------------------------------------------
  // Auto-Start bei cb:game:start
  // ---------------------------------------------------------------------------
  if (Game && typeof Game.on === 'function') {
    Game.on('cb:game:start', function () {
      LOG('cb:game:start erhalten → JobEngine.start()');
      start();
    });
  } else {
    WARN('Game.on nicht verfügbar – JobEngine.start() muss manuell aufgerufen werden');
  }

  // ---------------------------------------------------------------------------
  // Öffentliche API (falls du später vom Inspector aus triggern willst)
  // ---------------------------------------------------------------------------
  global.JobEngine = {
    start
  };
})();
