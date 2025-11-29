/* ============================================================================
 * Datei   : core/job.engine.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-jobs-v1
 * Zweck   : Zentrale Verwaltung offener Jobs (Bau/Transport)
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → HAUPTLOGIK → EXPORTS
 *
 * Läuft   : Eigenes rAF-Tickloop (leichtgewichtig)
 * Lauscht : cb:game:start  → startet Loop
 *           cb:build:complete → HQ initialisieren + Baujobs erzeugen
 *
 * Zusammenspiel:
 *   - GameConstruction  erzeugt Gebäude + feuert cb:build:complete
 *   - JobEngine         verwaltet Queue und legt Jobs an
 *   - CarrierRuntime    tickt GameUnits + zieht Jobs aus JobEngine
 *   - GameUnits         bewegt Träger + arbeitet Jobs ab
 * ========================================================================== */

(function initJobEngine (global) {
  'use strict';

  // -------------------------------------------------------------------------
  // LOGGING-HELPER
  // -------------------------------------------------------------------------
  const TAG  = '[job.engine]';
  const LOG  = (...a)=> (global.CBLog?.info  || console.info)(TAG, ...a);
  const WARN = (...a)=> (global.CBLog?.warn  || console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  /** Interne Job-Queue (FIFO) */
  const queue = [];

  /** Zeitstempel des letzten Ticks (für dt, aktuell nur Infologik) */
  let lastTick  = 0;

  /** Ob das JobEngine-Loop bereits läuft */
  let running   = false;

  /** HQ wurde bereits initialisiert + Träger gespawnt */
  let hqSpawned = false;

  // -------------------------------------------------------------------------
  // JOB-API (QUEUE)
  // -------------------------------------------------------------------------

  /**
   * Job in die Warteschlange legen.
   * Erwartet z. B.:
   * {
   *   id   : 'job-build-b.hq-…',
   *   type : 'build' | 'carry',
   *   res  : 'res.wood',
   *   from : {x,y},    // Start in Tile-Koordinaten
   *   to   : {x,y}     // Ziel in Tile-Koordinaten (bei 'build')
   * }
   */
  function add(job){
    if (!job || typeof job !== 'object'){
      WARN('add(job) → ungültiger Job', job);
      return;
    }
    queue.push(job);
    // Optional: spätere Inspector-Anbindung → cb:logistics:queue:update etc.
  }

  /** Nächstes Job-Objekt aus der Queue holen (FIFO) */
  function pop(){
    return queue.length ? queue.shift() : null;
  }

  /** Hat die Queue aktuell irgendwelche Jobs? */
  function hasJobs(){
    return queue.length > 0;
  }

  /** Direkter Blick auf die Queue (read-only benutzen!) */
  function getQueue(){
    return queue;
  }

  // -------------------------------------------------------------------------
  // TICK-LOGIK (leichtgewichtig)
  // -------------------------------------------------------------------------
  /**
   * Tick wird vom eigenen rAF-Loop aufgerufen.
   *
   * WICHTIG:
   * - Die eigentliche Bewegung der Träger macht GameUnits.tick(dt)
   *   (wird aktuell von carrier.runtime.js UND game.js getickt).
   * - JobEngine kümmert sich hier NUR um die Zuweisung von Jobs,
   *   falls ein Träger etwas zu tun braucht.
   */
  function tick(dt){
    try {
      const Units = global.GameUnits;
      if (!Units) return;
      if (typeof Units.needsJob !== 'function' ||
          typeof Units.assignJob !== 'function'){
        return;
      }
      if (!hasJobs()) return;

      // Fragt das Units-Modul: "Braucht irgendein Träger einen Job?"
      if (Units.needsJob()){
        const job = pop();
        if (job){
          try {
            Units.assignJob(job);
            // LOG('Job an Träger vergeben', job); // bei Bedarf entkommentieren
          } catch(e){
            WARN('assignJob(job) Fehler', e);
          }
        }
      }
    } catch (e){
      WARN('tick(dt) Fehler', e);
    }
  }

  // -------------------------------------------------------------------------
  // EIGENES rAF-LOOP
  // -------------------------------------------------------------------------
  function loop(ts){
    if (!running) return;

    const now = ts || performance.now();
    let dt = (now - lastTick) / 1000;
    if (!Number.isFinite(dt) || dt <= 0) dt = 1/60;
    lastTick = now;

    // Nur leichte Logik: Zuweisung von Jobs (Bewegung macht GameUnits selbst)
    tick(dt);

    global.requestAnimationFrame(loop);
  }

  function start(){
    if (running){
      LOG('JobEngine bereits gestartet');
      return;
    }
    running   = true;
    lastTick  = performance.now();
    global.requestAnimationFrame(loop);
    LOG('JobEngine gestartet (Loop aktiv)');
  }

  function stop(){
    running = false;
    LOG('JobEngine gestoppt');
  }

  // -------------------------------------------------------------------------
  // BAU-HOOK: cb:build:complete → HQ & Baujobs
  // -------------------------------------------------------------------------
  /**
   * Helfer: versucht, ein Building-Objekt aus Game zu holen.
   * Achtet auf beide Varianten:
   *  - Game.buildings = Array
   *  - Game.getBuildings() → Array
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

  /**
   * cb:build:complete-Handler:
   *  - Wenn HQ (b.hq) → HQ-Pos setzen + Träger spawnen
   *  - Für alle anderen Gebäude → ein paar Baujobs von HQ → Gebäude anlegen
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

    // Tile-Mitte des Gebäudes (für Zielkoordinate)
    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const Units = global.GameUnits;

    try {
      // ---------------------------------------------------------------
      // 1) HQ-Spezialfall → Logistikzentrum + Start-Träger
      // ---------------------------------------------------------------
      if (id === 'b.hq' && Units){
        if (!hqSpawned){
          hqSpawned = true;

          // HQ-Position merken
          try {
            if (typeof Units.setHQPos === 'function'){
              Units.setHQPos(cx, cy);
            } else {
              Units.hqPos = { x: cx, y: cy };
            }
          } catch (e){
            WARN('HQPos setzen fehlgeschlagen', e);
          }

          // Ein paar Träger rund um das HQ spawnen (Epoche 1: einfache Träger)
          try {
            const spawn = Units.spawnCarrier || Units.spawnUnit;
            if (typeof spawn === 'function'){
              const COUNT = 3;
              for (let i = 0; i < COUNT; i++){
                spawn(cx, cy, {
                  kind: 'u.carrier',
                  name: `Träger ${i + 1}`
                });
              }
              LOG('HQ fertig → Träger gespawnt', { count: 3, at:{ x:cx, y:cy } });
            } else {
              WARN('GameUnits.spawnCarrier/SpawnUnit nicht verfügbar – keine Träger gespawnt');
            }
          } catch (e){
            WARN('Träger-Spawn fehlgeschlagen', e);
          }
        } else {
          LOG('Zweites HQ fertig – HQ/Träger bereits initialisiert, überspringe Spawn');
        }
      }

      // ---------------------------------------------------------------
      // 2) Baujobs für alle Nicht-HQ-Gebäude
      // ---------------------------------------------------------------
      if (!Units) return;

      const hq = Units.hqPos || null;
      if (!hq){
        LOG('Noch kein HQPos gesetzt – keine Baujobs für', id);
        return;
      }

      // simple Demo: 3 Holzlieferungen von HQ → Baustelle
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
      LOG('Baujobs angelegt', { building: id, count: JOB_COUNT, from: hq, to:{ x:cx, y:cy } });

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
    queue: getQueue,
    tick,      // falls später von extern getickt werden soll
    start,
    stop
  };

  global.JobEngine = API;

  // -------------------------------------------------------------------------
  // AUTO-START: bei Spielstart Loop aktivieren
  // -------------------------------------------------------------------------
  global.addEventListener('cb:game:start', () => {
    start();
  });

  LOG('bereit (v25.11.29-jobs-v1)');

})(window);
