/* ============================================================================
 * Datei   : core/job.engine.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-unified
 *
 * Zweck   : Zentrales Job-System für:
 *           – Gebäudeproduktion (Holz/Stein)
 *           – Baujobs (Baumaterial zum Gebäude)
 *           – Transportjobs (von A → HQ oder A → B)
 *           – spätere Spezial-Jobs (Fischen, Fällen, Jagen, etc.)
 *
 * Bindet ALLE Quellen zusammen:
 *           Game.addJob()
 *           GameUnits.needsJob()
 *           Production-System
 *
 * UND versorgt ALLE Einheiten sauber:
 *           GameUnits.assignJob(job)
 *           GameUnits.tick(dt)
 *
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[job.engine]';
  const OK  = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const WARN= (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // zentrale Queue
  const queue = [];

  // ——————————————————————————————————————————
  //  Job-API
  // ——————————————————————————————————————————
  function add(job){
    if (!job) return;
    queue.push(job);
    OK('Job hinzugefügt →', job);
  }

  function pop(){
    return queue.shift() || null;
  }

  function hasJobs(){
    return queue.length > 0;
  }

  // Exporte
  window.JobEngine = {
    add,
    pop,
    hasJobs,
    queue
  };


  // ——————————————————————————————————————————
  //  TICKER – läuft unabhängig vom Renderer
  // ——————————————————————————————————————————

  let running = false;
  let raf = 0;

  function tick(dt){
    try {
      // 1) Zuerst Units bewegen
      if (window.GameUnits?.tick){
        window.GameUnits.tick(dt);
      }

      // 2) Prüfen → braucht eine Einheit einen Auftrag?
      if (window.GameUnits?.needsJob && window.GameUnits.needsJob()){
        const job = pop();
        if (job){
          try {
            window.GameUnits.assignJob(job);
            OK('Job → Einheit:', job);
          } catch(e){
            WARN('assignJob Fehler:', e);
          }
        }
      }

      // (Optional) Später Spezialcodes:
      // – Idle-Carrier sammeln
      // – Priorisierung (HQ > Produktion > Bau)
      // – Smart-Picking (nächster Job zuerst)
    } catch(e){
      WARN('tick()', e);
    }
  }

  function loop(){
    if (!running) return;
    tick(1/60);
    raf = requestAnimationFrame(loop);
  }

  function start(){
    if (running) return;
    running = true;
    OK('JobEngine gestartet');
    loop();
  }

  function stop(){
    running = false;
    cancelAnimationFrame(raf);
    OK('JobEngine gestoppt');
  }

  // ——————————————————————————————————————————
  //  Automatisches Starten beim Spielstart
  // ——————————————————————————————————————————
  window.addEventListener('cb:game:start', ()=> {
    start();
  });

})();
