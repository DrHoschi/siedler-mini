/* ============================================================================
 * Datei   : core/job.engine.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-jobs-v2
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
 *      -> core/carrier.runtime.js  +  core/units.js
 *
 * Struktur: IMPORTS → STATE → QUEUE-API → BUILD-HOOK → EXPORT
 * ========================================================================== */

(function initJobEngine (global) {
  'use strict';

  // -------------------------------------------------------------------------
  // LOGGING
  // -------------------------------------------------------------------------
  const TAG  = '[job.engine]';
  const LOG  = (...a)=> (global.CBLog?.info  || console.info)(TAG, ...a);
  const WARN = (...a)=> (global.CBLog?.warn  || console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /** Einfache FIFO-Queue für Jobs */
  const queue = [];

  /** Merker, ob HQ schon initialisiert wurde (HQ-Pos + Träger-Spawn) */
  let hqSpawned = false;

  // -------------------------------------------------------------------------
  // QUEUE-API
  // -------------------------------------------------------------------------

  /**
   * Job in die Warteschlange legen.
   *
   * Erwartete Grundstruktur:
   * {
   *   id   : 'job-build-b.hq-…',
   *   type : 'build' | 'carry' | 'prod',
   *   res  : 'res.wood',
   *   from : { x, y },    // Start in Tile-Koordinaten
   *   to   : { x, y }     // Ziel in Tile-Koordinaten
   * }
   */
  function add(job){
    if (!job || typeof job !== 'object'){
      WARN('add(job) → ungültiger Job', job);
      return;
    }
    queue.push(job);
  }

  /** Nächstes Job-Objekt aus der Queue holen (FIFO) */
  function pop(){
    return queue.length ? queue.shift() : null;
  }

  /** Hat die Queue aktuell irgendwelche Jobs? */
  function hasJobs(){
    return queue.length > 0;
  }

  /** Direkter Blick auf die Queue (bitte nur LESEN, nicht mutieren) */
  function getQueue(){
    return queue;
  }

  // Dummy-Funktionen für Abwärtskompatibilität
  function start(){
    LOG('JobEngine bereit (passiv – CarrierRuntime verteilt Jobs)');
  }
  function stop(){
    LOG('JobEngine stop() aufgerufen – keine eigene Loop aktiv');
  }

  // -------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // -------------------------------------------------------------------------

  /**
   * Sucht ein Building-Objekt per id aus Game.
   * Unterstützt:
   *   - Game.buildings = Array
   *   - Game.getBuildings() → Array
   */
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

  // -------------------------------------------------------------------------
  // HQ + BAUJOBS: cb:build:complete
  // -------------------------------------------------------------------------

  /**
   * Wird aufgerufen, wenn ein Gebäude vollständig fertig ist.
   *  - Bei HQ: HQ-Position setzen + 3 Träger spawnen (leicht versetzt).
   *  - Bei allen anderen Gebäuden: einfache Holz-Baujobs vom HQ → Gebäude.
   */
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

    const bx = Number(building.x) || 0;
    const by = Number(building.y) || 0;
    const bw = Number(building.w) || 1;
    const bh = Number(building.h) || 1;

    // Tile-Mitte des Gebäudes
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

          // HQ-Position im Units-System merken (falls vorhanden)
          try {
            if (typeof Units.setHQPos === 'function'){
              Units.setHQPos(cx, cy);
            } else {
              Units.hqPos = { x: cx, y: cy };
            }
          } catch (e){
            WARN('HQPos setzen fehlgeschlagen', e);
          }

          // Träger-Spawner holen (spawnCarrier bevorzugt, sonst spawnUnit)
          const spawn = Units.spawnCarrier || Units.spawnUnit;
          if (typeof spawn === 'function'){
            // Offsets: drei Träger leicht um das HQ herum versetzt
            const OFFS = [
              { dx: -0.4, dy:  0.0 },
              { dx:  0.4, dy:  0.1 },
              { dx:  0.0, dy:  0.4 }
            ];
            for (let i = 0; i < OFFS.length; i++){
              const o = OFFS[i];
              spawn(cx + o.dx, cy + o.dy, {
                kind: 'u.carrier',
                name: `Träger ${i+1}`
              });
            }
            LOG('HQ fertig → 3 Träger gespawnt', { at:{ x:cx, y:cy } });
          } else {
            WARN('Kein Units.spawnCarrier/spawnUnit vorhanden – keine Träger gespawnt');
          }

        } else {
          LOG('Zweites HQ fertig – HQ/Träger bereits initialisiert, überspringe Spawn');
        }
      }

      // -------------------------------------------------------------
      // 2) BAUJOBS FÜR ALLE NICHT-HQ-GEBÄUDE
      // -------------------------------------------------------------
      // Wir brauchen eine HQ-Position als Quelle.
      const hq = Units && (Units.hqPos || null);
      if (!hq){
        LOG('Noch kein HQPos gesetzt – keine Baujobs für', id);
        return;
      }

      // Einfache Demo: 3 Holzlieferungen vom HQ → Gebäude
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
        from    : hq,
        to      : { x:cx, y:cy }
      });

    } catch (e){
      WARN('handleBuildComplete Fehler', e);
    }
  }

  // Event registrieren
  global.addEventListener('cb:build:complete', handleBuildComplete);

  // -------------------------------------------------------------------------
  // EXPORT-API
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

  // Beim Spielstart nur „bereit“-Log ausgeben (keine eigene Loop)
  global.addEventListener('cb:game:start', () => {
    start();
  });

  LOG('modul geladen (v25.11.29-jobs-v2)');

})(window);
