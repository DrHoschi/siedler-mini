/* ============================================================================
 * Datei   : core/carrier.runtime.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-final
 *
 * Zweck   : Zentraler Tick für Träger / GameUnits
 *           – holt Jobs aus JobEngine.pop()
 *           – tickt alle Units kontinuierlich
 *           – garantiert Bewegung der Carrier
 *
 * Struktur : IMPORTS → STATE → FUNKTIONEN → LOOP → EVENTS → EXPORT
 * ========================================================================== */
(function(){
  'use strict';

  const TAG = '[carrier.runtime]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const WARN= (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  let running = false;
  let raf = 0;

  function step(dt){
    try {
      // 1) Units / Carrier ticken (Bewegung, Animation, Jobs)
      if (window.GameUnits?.tick) {
        window.GameUnits.tick(dt);
      }

      // 2) Jobs prüfen → falls ein Carrier frei ist
      if (window.GameUnits?.needsJob && window.GameUnits.needsJob()) {
        const job = window.JobEngine.pop?.() || null;
        if (job) {
          try {
            window.GameUnits.assignJob(job);
            LOG('Job → Carrier:', job);
          } catch(e){
            WARN('assignJob Fehler:', e);
          }
        }
      }
    } catch(e){
      WARN('step()', e);
    }
  }

  function loop(){
    if (!running) return;
    step(1/60);
    raf = requestAnimationFrame(loop);
  }

  function start(){
    if (running) return;
    running = true;
    LOG('gestartet');
    raf = requestAnimationFrame(loop);
  }

  function stop(){
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    LOG('gestoppt');
  }

  // Automatisch starten nach game-start
  window.addEventListener('cb:game:start', ()=> start());

  // Debug / API
  window.CarrierRuntime = {
    start, stop,
    isRunning: ()=> running
  };

})();
