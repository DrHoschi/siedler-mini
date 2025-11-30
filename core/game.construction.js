/* ============================================================================
 * Datei   : core/game.construction.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-instance-fix3
 *
 * Zweck   :
 *   - Steuert die Bauphasen von Gebäuden (Baustelle → Material → Finish → fertig)
 *   - Verarbeitet Material-Lieferungen der Träger (cb:build:deliver)
 *   - Meldet fertige Gebäude mit exakter Instanz-Position (cb:build:complete)
 *
 * Hinweis:
 *   - Wir bleiben bei einer einfachen „Fake-Baustelle“:
 *       • ohne echte Lager-Bestände
 *       • ABER: mit echter Zuordnung „Material kam bei diesem Gebäude an“
 * ========================================================================== */

(function () {
  'use strict';

  const TAG = '[construction]';
  const LOG = (...a) => (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // Bauphasen – wichtig: 0/1/2 = Baustellen-Grafik, 3 = fertiges Gebäude
  const PHASE = {
    SITE    : 0,
    MATERIAL: 1,
    FINISH  : 2,
    COMPLETE: 3
  };

  // Zeiten pro Phase (Millisekunden)
  const TIME = {
    SITE    : 2000,  // Zeit bis zum Wechsel in MATERIAL (Fallback)
    MATERIAL: 1500,
    FINISH  : 1200
  };

  // -------------------------------------------------------------------------
  // Hilfsfunktionen
  // -------------------------------------------------------------------------

  function getBuildings() {
    return (window.Game && Array.isArray(window.Game.buildings))
      ? window.Game.buildings
      : [];
  }

  function toNumberOr(obj, key, fallback) {
    const v = Number(obj?.[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  /**
   * Finde Gebäude, dessen Tile-Rechteck die übergebene Position enthält.
   *  - b.x, b.y  ... linke obere Ecke
   *  - b.w, b.h  ... Breite/Höhe in Tiles
   *  - posX,posY ... irgendein Punkt (z.B. Gebäude-Mitte)
   */
  function findBuildingAt(posX, posY) {
    const list = getBuildings();
    if (!list.length) return null;

    for (const b of list) {
      if (!b) continue;

      const bx = toNumberOr(b, 'x', NaN);
      const by = toNumberOr(b, 'y', NaN);
      const bw = toNumberOr(b, 'w', 1);
      const bh = toNumberOr(b, 'h', 1);

      if (!Number.isFinite(bx) || !Number.isFinite(by)) continue;

      const inX = posX >= bx && posX < bx + bw;
      const inY = posY >= by && posY < by + bh;

      if (inX && inY) return b;
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // Event: Material geliefert (von GameUnits)
  //  -> cb:build:deliver { x, y, res?, jobId? }
  // -------------------------------------------------------------------------
  window.addEventListener('cb:build:deliver', (ev) => {
    const d = ev.detail || {};
    const x = toNumberOr(d, 'x', NaN);
    const y = toNumberOr(d, 'y', NaN);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      WARN('cb:build:deliver ohne gültige Koordinaten', d);
      return;
    }

    const b = findBuildingAt(x, y);
    if (!b) {
      WARN('cb:build:deliver – kein Gebäude an Position gefunden', { x, y, detail: d });
      return;
    }

    // Flag setzen: dieses Gebäude hat (genug) Material bekommen.
    // → entspricht deinem "delivered.res >= needs.res"
    b.hasMaterial = true;

    LOG('Material geliefert', {
      id    : b.id,
      x     : b.x,
      y     : b.y,
      w     : b.w,
      h     : b.h,
      fromX : x,
      fromY : y,
      res   : d.res,
      jobId : d.jobId
    });
  });

  // -------------------------------------------------------------------------
  // Tick: Bauphasen voranschieben
  //  - läuft immer, egal ob Events kommen oder nicht
  //  - Events dienen dazu, schneller voranzukommen
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

          // Fallback: nach TIME.SITE geht's auch ohne Lieferung weiter,
          // aber wenn hasMaterial früh gesetzt wird, sofort Phase MATERIAL.
          if (b.hasMaterial || b.buildTimer > TIME.SITE) {
            b.buildStage = PHASE.MATERIAL;
            b.buildTimer = 0;
            LOG('Phase MATERIAL', b.id);
          }
          break;
        }

        case PHASE.MATERIAL: {
          b.buildTimer += ms;

          // Mit Material: schneller bauen
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
          if (b.buildTimer > TIME.FINISH) {
            b.buildStage   = PHASE.COMPLETE;
            b.buildTimer   = 0;
            b.hasMaterial  = false;

            // Fertiges Gebäude inkl. Koordinaten melden
            try {
              window.dispatchEvent(new CustomEvent('cb:build:complete', {
                detail: {
                  id : b.id,
                  x  : b.x,
                  y  : b.y,
                  w  : b.w,
                  h  : b.h
                }
              }));
            } catch (e) {
              WARN('cb:build:complete dispatch fehlgeschlagen', e);
            }

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
  LOG('Construction-Modul aktiv (instance-fix3)');
})();
