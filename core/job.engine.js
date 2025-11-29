/* ============================================================================
 * Datei   : core/job.engine.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-jobs-v3
 *
 * Zweck   : Einfache, PASSIVE Job-Queue + Bau-Hooks
 *
 *  - Verwaltet nur die Warteschlange der Jobs (FIFO)
 *  - Erzeugt Baujobs, wenn ein Gebäude fertig ist (cb:build:complete)
 *  - Beim ersten HQ:
 *      -> HQ-Position merken
 *      -> 3 Träger leicht versetzt um das HQ spawnen
 *
 *  Bewegung / Job-Abarbeitung macht weiterhin:
 *      -> core/carrier.runtime.js  +  core/game.units.js
 * ========================================================================== */

(function initJobEngine (global) {
  'use strict';

  const TAG  = '[job.engine]';
  const LOG  = (...a)=> (global.CBLog?.info  || console.info)(TAG, ...a);
  const WARN = (...a)=> (global.CBLog?.warn  || console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const queue    = [];       // FIFO-Queue
  let   hqSpawned = false;   // HQ bereits initialisiert?

  // -------------------------------------------------------------------------
  // QUEUE-API
  // -------------------------------------------------------------------------

  function add(job){
    if (!job || typeof job !== 'object'){
      WARN('add(job) → ungültiger Job', job);
      return;
    }
    queue.push(job);
  }

  function pop(){
    return queue.length ? queue.shift() : null;
  }

  function hasJobs(){
    return queue.length > 0;
  }

  function getQueue(){
    return queue;
  }

  // Nur für Abwärtskompatibilität – JobEngine ist passiv
  function start(){
    LOG('JobEngine bereit (passiv – CarrierRuntime verteilt Jobs)');
  }
  function stop(){
    LOG('JobEngine stop() aufgerufen – keine eigene Loop aktiv');
  }

  // -------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // -------------------------------------------------------------------------

  function findBuildingById(id){
    const G = global.Game || {};
    let list = [];

    if (Array.isArray(G.buildings)){
      list = G.buildings;
    } else if (typeof G.getBuildings === 'function'){
      try { list = G.getBuildings() || []; } catch(_){ list = []; }
    }

    if (!Array.isArray(list)) return null;
    return list.find(b => b && b.id === id) || null;
  }

  function toNumberOr(obj, key, fallback){
    const v = Number(obj?.[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  // -------------------------------------------------------------------------
  // HQ + BAUJOBS: cb:build:complete
  // -------------------------------------------------------------------------

  function handleBuildComplete(ev){
    const d  = ev?.detail || {};
    const id = d.id;

    if (!id){
      WARN('cb:build:complete ohne id', d);
      return;
    }

    const building = findBuildingById(id);
    if (!building){
      WARN('cb:build:complete – Building nicht gefunden', d);
      return;
    }

    const bx = toNumberOr(building, 'x', 0);
    const by = toNumberOr(building, 'y', 0);
    const bw = toNumberOr(building, 'w', 1);
    const bh = toNumberOr(building, 'h', 1);

    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const Units = global.GameUnits || {};

    try {
      // -------------------------------------------------------------
      // 1) HQ-SPEZIALFALL → HQ-Pos + 3 Träger versetzt spawnen
      // -------------------------------------------------------------
      if (id === 'b.hq'){
        if (!hqSpawned && Units){
          hqSpawned = true;

          try {
            if (typeof Units.setHQPos === 'function'){
              Units.setHQPos(cx, cy);
            } else {
              Units.hqPos = { x: cx, y: cy };
            }
          } catch (e){
            WARN('HQPos setzen fehlgeschlagen', e);
          }

          const spawn = Units.spawnCarrier || Units.spawnUnit;
          if (typeof spawn === 'function'){
            const OFFS = [
              { dx: -0.5, dy:  0.1 },
              { dx:  0.5, dy:  0.15 },
              { dx:  0.0, dy:  0.6 }
            ];
            OFFS.forEach((o, i)=>{
              spawn(cx + o.dx, cy + o.dy, {
                kind: 'u.carrier',
                name: `Träger ${i+1}`
              });
            });
            LOG('HQ fertig → 3 Träger gespawnt', { at:{ x:cx, y:cy } });
          } else {
            WARN('Kein Units.spawnCarrier/spawnUnit vorhanden – keine Träger gespawnt');
          }
        } else {
          LOG('Zweites HQ fertig – HQ/Träger bereits initialisiert, überspringe Spawn');
        }

        // GANZ WICHTIG:
        // Für das HQ selbst KEINE Baujobs erzeugen – sonst laufen alle
        // Träger sofort zum HQ-Mittelpunkt und "verballern" Jobs im Kreis.
        return;
      }

      // -------------------------------------------------------------
      // 2) BAUJOBS FÜR ALLE NICHT-HQ-GEBÄUDE
      // -------------------------------------------------------------
      const hq = Units && (Units.hqPos || null);
      if (!hq || !Number.isFinite(hq.x) || !Number.isFinite(hq.y)){
        LOG('Noch kein HQPos gesetzt – keine Baujobs für', id);
        return;
      }

      // defensive: Building-Coords checken
      if (!Number.isFinite(cx) || !Number.isFinite(cy)){
        WARN('Building-Koordinaten nicht gültig – keine Jobs', { id, cx, cy });
        return;
      }

      const JOB_COUNT = 3;
      for (let n = 0; n < JOB_COUNT; n++){
        add({
          id   : `job-build-${id}-${Date.now()}-${n}`,
          type : 'build',
          res  : 'res.wood',        // TODO: später aus Registry/Baukosten holen
          from : { x: hq.x, y: hq.y },
          to   : { x: cx,  y: cy    }
        });
      }

      LOG('Baujobs angelegt', {
        building: id,
        count   : JOB_COUNT,
        from    : { x:hq.x, y:hq.y },
        to      : { x:cx,  y:cy }
      });

    } catch (e){
      WARN('handleBuildComplete Fehler', e);
    }
  }

  global.addEventListener('cb:build:complete', handleBuildComplete);

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  const API = {
    add,
    pop,
    hasJobs,
    queue : getQueue,
    start,
    stop
  };

  global.JobEngine = API;

  global.addEventListener('cb:game:start', () => {
    start();
  });

  LOG('modul geladen (v25.11.29-jobs-v3)');

})(window);
