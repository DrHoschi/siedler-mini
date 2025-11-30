/* ============================================================================
 * Datei   : core/game.construction.js
 * Version : v25.11.30-instance-fix1
 * Zweck   : Bauphasen steuern (mit Fallback, falls Träger/Events klemmen)
 *           → meldet fertige Gebäude mit exakter Instanz-Position
 * ========================================================================== */

(function () {
  'use strict';

  const TAG = '[construction]';
  const LOG = (...a) => (window.CBLog?.ok ?? console.log)(TAG, ...a);

  const PHASE = {
    SITE    : 0,
    MATERIAL: 1,
    FINISH  : 2,
    COMPLETE: 3
  };

  const TIME = {
    SITE    : 2000,
    MATERIAL: 1500,
    FINISH  : 1200
  };

  function getBuildings() {
    return (window.Game && Array.isArray(Game.buildings))
      ? Game.buildings
      : [];
  }

  // -------------------------------------------------------------------------
  // Event: Material geliefert (von GameUnits)
  // -------------------------------------------------------------------------
  window.addEventListener('cb:build:deliver', (ev) => {
    const { x, y } = ev.detail || {};
    const list = getBuildings();
    const b = list.find((b) => b.x === x && b.y === y);
    if (!b) return;

    b.hasMaterial = true; // Flag setzen → nächste Tick-Runde kann Phase hochschalten
    LOG('Material geliefert', b.id, '→ hasMaterial=true');
  });

  // -------------------------------------------------------------------------
  // Tick: Bauphasen voranschieben
  //  - läuft immer, egal ob Events kommen oder nicht
  //  - Events dienen nur dazu, schneller voranzukommen
  // -------------------------------------------------------------------------
  function tick(dt) {
    const list = getBuildings();
    if (!list.length) return;

    const ms = dt * 1000;

    for (const b of list) {
      // Initialisierung, falls aus älterem Save stammt
      if (typeof b.buildStage !== 'number') b.buildStage = PHASE.SITE;
      if (typeof b.buildTimer !== 'number') b.buildTimer = 0;

      switch (b.buildStage) {
        case PHASE.SITE: {
          b.buildTimer += ms;

          // Fallback: auch ohne Material beginnt irgendwann der Aufbau
          if (b.hasMaterial || b.buildTimer > TIME.SITE) {
            b.buildStage = PHASE.MATERIAL;
            b.buildTimer = 0;
            LOG('Phase MATERIAL', b.id);
          }
          break;
        }

        case PHASE.MATERIAL: {
          b.buildTimer += ms;
          // Mit Material etwas schneller fertig
          const limit = b.hasMaterial ? TIME.MATERIAL * 0.6 : TIME.MATERIAL;
          if (b.buildTimer > limit) {
            b.buildStage = PHASE.FINISH;
            b.buildTimer = 0;
            LOG('Phase FINISH', b.id);
          }
          break;
        }

        case PHASE.FINISH: {
          b.buildTimer += ms;
          const limit = TIME.FINISH;
          if (b.buildTimer > limit) {
            b.buildStage   = PHASE.COMPLETE;
            b.buildTimer   = 0;
            b.hasMaterial  = false;

            // WICHTIG: fertiges Gebäude mit Instanz-Koordinaten melden
            try {
              window.dispatchEvent(new CustomEvent('cb:build:complete', {
                detail: {
                  id: b.id,
                  x : b.x,
                  y : b.y,
                  w : b.w,
                  h : b.h
                }
              }));
            } catch (_) { /* nicht kritisch */ }

            LOG('Gebäude fertig', b.id);
          }
          break;
        }

        case PHASE.COMPLETE:
        default:
          // nichts mehr zu tun
          break;
      }
    }
  }

  window.GameConstruction = { tick };
})();
