/* ============================================================================
 * Datei   : core/job.engine.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-jobs-adapted
 *
 * Zweck   : Zentrale Job-Queue (passiv)
 *           – verwaltet Jobs (FIFO)
 *           – reagiert auf cb:build:complete
 *           – erzeugt Baujobs für fertige Gebäude (NICHT für HQ)
 *
 * WICHTIG:
 *   - GameUnits (core/game.units.js v25.11.30-simple-carriers) verwaltet:
 *       • HQ-Position in Tiles
 *       • Träger-Spawns
 *       • Bewegung in Tile-Koordinaten
 *   - JobEngine erzeugt NUR Jobs in denselben Tile-Koordinaten.
 *
 * API (global):
 *   window.JobEngine.add(job)
 *   window.JobEngine.pop()
 *   window.JobEngine.hasJobs()
 *   window.JobEngine.getQueue()
 *   window.JobEngine.start() / stop() (nur Logging)
 * ========================================================================== */

(function (global) {
  'use strict';

  const TAG  = '[job.engine]';
  const LOG  = (...a) => (global.CBLog?.ok   ?? console.log )(TAG, ...a);
  const WARN = (...a) => (global.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE: Zentrale Job-Queue (FIFO)
  // -------------------------------------------------------------------------
  /** @type {Array<object>} */
  const Queue = [];

  // Nur für Legacy-Kompatibilität – in dieser Version spawnen wir keine Träger
  let hqSpawned = false; // wird nur noch für Logging verwendet

  // -------------------------------------------------------------------------
  // PUBLIC API: Queue-Operationen
  // -------------------------------------------------------------------------
  function add(job) {
    if (!job || typeof job !== 'object') {
      WARN('add(job) mit ungültigem Job aufgerufen', job);
      return;
    }
    // kleine Normalisierung
    const norm = {
      id   : job.id   || `job-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type : job.type || 'build',
      res  : job.res  || 'res.wood',
      from : job.from || null,
      to   : job.to   || null
    };
    Queue.push(norm);
    LOG('Job hinzugefügt', norm);
  }

  function pop() {
    const j = Queue.shift() || null;
    if (j) LOG('Job ausgegeben', j);
    return j;
  }

  function hasJobs() {
    return Queue.length > 0;
  }

  function getQueue() {
    return Queue.slice();
  }

  // Nur für Abwärtskompatibilität – JobEngine ist passiv
  function start() {
    LOG('JobEngine bereit (passiv – CarrierRuntime holt Jobs aus Queue)');
  }
  function stop() {
    LOG('JobEngine stop() aufgerufen – keine eigene Loop aktiv');
  }

  // -------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // -------------------------------------------------------------------------

  function findBuildingById(id) {
    const G = global.Game || {};
    let list = [];

    if (Array.isArray(G.buildings)) {
      list = G.buildings;
    } else if (typeof G.getBuildings === 'function') {
      try {
        list = G.getBuildings() || [];
      } catch (_) {
        list = [];
      }
    }

    if (!Array.isArray(list)) return null;
    return list.find((b) => b && b.id === id) || null;
  }

  function toNumberOr(obj, key, fallback) {
    const v = Number(obj?.[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  /**
   * HQ-Position aus GameUnits holen.
   * Unterstützt:
   *   – Units.hqPos = { x, y }          (alte Variante, Welt-/Tilekoord.)
   *   – Units.getHQPos() = { tx, ty }   (neue simple-carriers-Variante)
   *
   * Rückgabe IMMER als { x, y } in Tile-Koordinaten.
   */
  function getHQPosTiles(Units) {
    if (!Units) return null;

    // 1) Alte Variante: Units.hqPos = { x, y }
    if (Units.hqPos && Number.isFinite(Units.hqPos.x) && Number.isFinite(Units.hqPos.y)) {
      return { x: Units.hqPos.x, y: Units.hqPos.y };
    }

    // 2) Neue Variante: Units.getHQPos() = { tx, ty }
    if (typeof Units.getHQPos === 'function') {
      try {
        const p = Units.getHQPos();
        if (p && Number.isFinite(p.tx) && Number.isFinite(p.ty)) {
          return { x: p.tx, y: p.ty };
        }
      } catch (err) {
        WARN('getHQPos() hat Fehler geworfen', err);
      }
    }

    return null;
  }

  // -------------------------------------------------------------------------
  // HQ + BAUJOBS: cb:build:complete
  // -------------------------------------------------------------------------

  /**
   * Wird aufgerufen, wenn ein Gebäude fertiggestellt ist.
   * Erwartet Event:
   *   detail: { id: 'b.lumberjack' } etc.
   *
   * Holt:
   *   – Building aus Game.buildings
   *   – HQ-Position aus GameUnits (Tiles)
   * Erzeugt:
   *   – 3 Baujobs von HQ → Gebäude-Mitte (Tiles)
   */
  function handleBuildComplete(ev) {
    const d = ev?.detail || {};
    const id = d.id;

    if (!id) {
      WARN('cb:build:complete ohne id', d);
      return;
    }

    const building = findBuildingById(id);
    if (!building) {
      WARN('cb:build:complete – Building nicht gefunden', d);
      return;
    }

    const bx = toNumberOr(building, 'x', 0);
    const by = toNumberOr(building, 'y', 0);
    const bw = toNumberOr(building, 'w', 1);
    const bh = toNumberOr(building, 'h', 1);

    // Gebäude-Mitte in Tiles
    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const Units = global.GameUnits || {};

    try {
      // -------------------------------------------------------------
      // 1) HQ-SPEZIALFALL → in dieser Version KEINE Träger spawnen
      //    (das erledigt game.units.js bereits über cb:build:place)
      // -------------------------------------------------------------
      if (id === 'b.hq') {
        if (!hqSpawned) {
          hqSpawned = true;
          LOG('HQ fertig – HQ/Träger werden von GameUnits verwaltet; keine Baujobs fürs HQ.');
        } else {
          LOG('Zweites HQ fertig – bereits initialisiert, überspringe Job-Erzeugung.');
        }
        return;
      }

      // -------------------------------------------------------------
      // 2) BAUJOBS FÜR ALLE NICHT-HQ-GEBÄUDE
      // -------------------------------------------------------------
      const hq = getHQPosTiles(Units);
      if (!hq || !Number.isFinite(hq.x) || !Number.isFinite(hq.y)) {
        LOG('Noch kein HQPos gesetzt – keine Baujobs für', id);
        return;
      }

      // defensive: Building-Coords checken
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
        WARN('Building-Koordinaten nicht gültig – keine Jobs', { id, cx, cy });
        return;
      }

      const JOB_COUNT = 3;
      for (let n = 0; n < JOB_COUNT; n++) {
        add({
          id   : `job-build-${id}-${Date.now()}-${n}`,
          type : 'build',
          res  : 'res.wood', // TODO: später aus Registry/Baukosten holen
          from : { x: hq.x, y: hq.y }, // Tiles
          to   : { x: cx,   y: cy    } // Tiles
        });
      }

      LOG('Baujobs angelegt', {
        building: id,
        count   : JOB_COUNT,
        from    : { x: hq.x, y: hq.y },
        to      : { x: cx,   y: cy }
      });

    } catch (e) {
      WARN('handleBuildComplete Fehler', e);
    }
  }

  // Event-Listener registrieren
  try {
    global.addEventListener('cb:build:complete', handleBuildComplete);
    LOG('Listener auf cb:build:complete registriert');
  } catch (err) {
    WARN('Konnte Listener auf cb:build:complete nicht registrieren', err);
  }

  // -------------------------------------------------------------------------
  // Export nach global
  // -------------------------------------------------------------------------
  global.JobEngine = {
    add,
    pop,
    hasJobs,
    getQueue,
    start,
    stop
    // KEIN tick() nötig – GameTick ruft nur CarrierRuntime/GameUnits/Production
  };

  start();
  LOG('Modul geladen (v25.11.30-jobs-adapted)');
})(window);
