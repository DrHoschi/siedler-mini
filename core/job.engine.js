/* ============================================================================
 * Datei    : core/job.engine.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-final
 * Zweck    : Zentrale Job-Warteschlange (aktuell Baujobs)
 *
 * Architektur:
 *   – JobEngine erzeugt Jobs bei Bauabschluss (HQ, Gebäude)
 *   – CarrierRuntime zieht Jobs per JobEngine.pop() und gibt sie an GameUnits
 *   – GameUnits.assignJob(job) weist den Job einem freien Carrier zu
 *
 * Öffentliche API (global):
 *   window.JobEngine = {
 *     push(job),
 *     pop(),
 *     handleBuildComplete(building)
 *   }
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[job.engine]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  /** interne Warteschlange *****************************************************/

  /** @type {Array<object>} */
  const _queue = [];

  function push(job) {
    if (!job) return;
    _queue.push(job);
    LOG('Job hinzugefügt', { id: job.id, type: job.type, queueLen: _queue.length });
  }

  function pop() {
    const job = _queue.shift() ?? null;
    if (job) {
      LOG('Job entnommen', { id: job.id, type: job.type, queueLen: _queue.length });
    }
    return job;
  }

  /**
   * Hilfsfunktion: HQ-Mittelpunkt in Tile-Koordinaten bestimmen.
   * Erwartet ein Gebäude-Objekt mit x,y,w,h in TILES.
   */
  function _getBuildingCenterTiles(b) {
    const tx = Number(b.x ?? 0) + Number(b.w ?? 1) / 2;
    const ty = Number(b.y ?? 0) + Number(b.h ?? 1) / 2;
    return { tx, ty };
  }

  /**
   * Wird von construction.runtime.js o. ä. aufgerufen, sobald ein Gebäude
   * fertiggestellt ist.
   *
   * building-Objekt:
   *   { id, type, x, y, w, h, buildCost? }
   */
  function handleBuildComplete(building) {
    try {
      const b = building?.building ?? building;
      if (!b || !b.id) {
        WARN('handleBuildComplete: kein gültiges Gebäude', building);
        return;
      }

      // Spezialfall: HQ – HQ-Position setzen und Träger spawnen
      if (b.id === 'b.hq') {
        if (!window.GameUnits || typeof window.GameUnits.setHQPos !== 'function') {
          WARN('handleBuildComplete(HQ): GameUnits.setHQPos nicht verfügbar');
          return;
        }

        const center = _getBuildingCenterTiles(b);
        window.GameUnits.setHQPos(center);

        // initial 3 Carrier spawnen (kannst du später anpassen)
        if (typeof window.GameUnits.spawnInitialCarriers === 'function') {
          window.GameUnits.spawnInitialCarriers(3);
        }

        LOG('HQ fertig → HQPos gesetzt & Carrier gespawnt', { center });
        return;
      }

      // alle anderen Gebäude → Baujobs anlegen, sofern HQ schon bekannt ist
      if (!window.GameUnits || typeof window.GameUnits.getHQPos !== 'function') {
        WARN('handleBuildComplete: GameUnits nicht verfügbar – keine Baujobs', b.id);
        return;
      }

      const hqPos = window.GameUnits.getHQPos();
      if (!hqPos) {
        LOG('Noch kein HQPos gesetzt – keine Baujobs für', b.id);
        return;
      }

      const center = _getBuildingCenterTiles(b);

      // einfache Schätzung: wie viele Holz-Einheiten werden benötigt?
      const woodCost =
        Number(b.buildCost?.res?.wood) ||
        Number(b.buildCost?.wood) ||
        3; // Default, falls nichts angegeben

      const jobCount = Math.max(1, woodCost);

      for (let i = 0; i < jobCount; i++) {
        const jobId = `build-${b.id}-${Date.now()}-${i}`;
        push({
          id   : jobId,
          type : 'build',
          res  : 'res.wood',
          from : { tx: hqPos.tx, ty: hqPos.ty },
          to   : { tx: center.tx, ty: center.ty }
        });
      }

      LOG('Baujobs angelegt', { building: b.id, count: jobCount });
    } catch (err) {
      WARN('handleBuildComplete Fehler', err);
    }
  }

  /** Event-Hooks ***************************************************************/

  // Fängt das "Gebäude fertig"-Event der Construction-Engine ab, falls vorhanden.
  try {
    window.addEventListener('cb:construction:building-complete', (ev) => {
      handleBuildComplete(ev.detail);
    });
  } catch (err) {
    WARN('Konnte cb:construction:building-complete Listener nicht registrieren', err);
  }

  /** Export nach global ********************************************************/

  window.JobEngine = {
    push,
    pop,
    handleBuildComplete
  };

  LOG('JobEngine bereit (passiv – CarrierRuntime verteilt Jobs)');
})();
