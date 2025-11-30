/* ============================================================================
 * Datei   : core/game.construction.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-instance-fix3-jobs
 *
 * Zweck   :
 *   - Steuert die Bauphasen von Gebäuden (Baustelle → Material → Finish → fertig)
 *   - Verarbeitet Material-Lieferungen der Träger (cb:build:deliver)
 *   - Zählt Needs/Delivered pro Baustelle
 *   - Legt kleine Ressourcenkugeln ("Drops") um die Baustelle ab
 *   - Meldet fertige Gebäude mit exakter Instanz-Position (cb:build:complete)
 *
 * Hinweis:
 *   - Fallback-Bau ohne Material bleibt erhalten (Zeit-basiert),
 *     aber sobald alle Needs erfüllt sind, gilt die Baustelle als versorgt.
 * ========================================================================== */

(function () {
  'use strict';

  const TAG  = '[construction]';
  const LOG  = (...a) => (window.CBLog?.ok  ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn?? console.warn)(TAG, ...a);

  const PHASE = {
    SITE    : 0,
    MATERIAL: 1,
    FINISH  : 2,
    COMPLETE: 3
  };

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

  /**
   * Prüft, ob eine Baustelle alle benötigten Ressourcen erhalten hat.
   *  - nutzt b.needs / b.delivered
   *  - falls keine Needs gesetzt sind → fällt auf b.hasMaterial zurück
   */
  function hasAllMaterial(b){
    if (!b) return false;

    const needs = b.needs;
    if (!needs || typeof needs !== 'object'){
      return !!b.hasMaterial;
    }

    const delivered = b.delivered || {};

    for (const key of Object.keys(needs)){
      const need = Number(needs[key] ?? 0);
      if (!need) continue;  // 0 oder undefined → egal

      const have = Number(delivered[key] ?? 0);
      if (!Number.isFinite(have) || have < need){
        return false;
      }
    }
    return true;
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

    const resKey = String(d.res || 'wood');

    // Needs/Delivered-Struktur sicherstellen
    if (!b.needs || typeof b.needs !== 'object'){
      b.needs = { [resKey]: 1 };    // Fallback, falls Baustelle alt ist
    }
    if (!b.delivered || typeof b.delivered !== 'object'){
      b.delivered = {};
    }

    const needTotal       = Number(b.needs[resKey] ?? 0) || 0;
    const alreadyDelivered= Number(b.delivered[resKey] ?? 0) || 0;

    // Hard-Limit: wenn Needs definiert sind und schon erfüllt → nur loggen
    if (needTotal && alreadyDelivered >= needTotal){
      LOG('Material überschüssig geliefert (Need bereits erfüllt)', {
        id  : b.id,
        res : resKey,
        needs   : b.needs,
        delivered: b.delivered
      });
    } else {
      b.delivered[resKey] = alreadyDelivered + 1;
    }

    // Kleine Ressourcenkugel (Drop) rund um die Baustelle ablegen
    const bw = toNumberOr(b, 'w', 1);
    const bh = toNumberOr(b, 'h', 1);

    const centerX = b.x + bw / 2;
    const centerY = b.y + bh / 2;

    const radius  = Math.max(bw, bh) * 0.4;
    const angle   = Math.random() * Math.PI * 2;

    const dropX = centerX + Math.cos(angle) * radius;
    const dropY = centerY + Math.sin(angle) * radius;

    if (!Array.isArray(b.dropSlots)){
      b.dropSlots = [];
    }
    b.dropSlots.push({
      res      : resKey,
      x        : dropX,
      y        : dropY,
      createdAt: performance.now?.() ?? Date.now()
    });

    // Flag: Dieses Gebäude hat (genug) Material
    b.hasMaterial = hasAllMaterial(b);

    LOG('Material geliefert', {
      id    : b.id,
      x     : b.x,
      y     : b.y,
      w     : b.w,
      h     : b.h,
      fromX : x,
      fromY : y,
      res   : resKey,
      jobId : d.jobId,
      needs : b.needs,
      delivered: b.delivered
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
      if (typeof b.status !== 'string')     b.status     = 'pending';

      switch (b.buildStage) {
        case PHASE.SITE: {
          b.buildTimer += ms;

          const filled = hasAllMaterial(b);
          if (filled){
            b.hasMaterial = true;
          }

          // Fallback: nach TIME.SITE geht's auch ohne Lieferung weiter,
          // aber wenn genug Material da ist, sofort Phase MATERIAL
          if (filled || b.buildTimer > TIME.SITE) {
            b.buildStage = PHASE.MATERIAL;
            b.buildTimer = 0;
            b.status     = 'building';
            LOG('Phase MATERIAL', b.id, {
              needs     : b.needs,
              delivered : b.delivered
            });
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
            b.status     = 'building';
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
            b.status       = 'done';

            // Fertiges Gebäude inkl. Koordinaten melden
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
  LOG('Construction-Modul aktiv (instance-fix3-jobs)');
})();
