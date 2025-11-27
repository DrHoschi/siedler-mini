/* ============================================================================
 * Datei   : core/units.js
 * Projekt : Neue Siedler
 * Version : v25.11.27-units-core
 *
 * Zweck   :
 *   Zentrale Verwaltung aller Einheiten (insb. Carrier/Träger).
 *   – Carrier registrieren
 *   – Job-Queue verwalten (FIFO)
 *   – CarrierRuntime.tick(unit, dt) pro Frame aufrufen
 *
 * Schnittstellen:
 *   window.GameUnits.addCarrier(unitObj)
 *   window.GameUnits.getUnits()
 *   window.GameUnits.addJob(job)
 *   window.GameUnits.popJob()
 *
 *   Frame-Tick:
 *     → reagiert auf cb:game:tick und ruft CarrierRuntime.tick(unit,dt)
 * ============================================================================
 */

(function(){
  'use strict';

  const TAG  = '[units]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const Units = [];
  const JobQueue = [];

  const API = {};

  /* ==========================================================================
   * Carrier hinzufügen (wird beim HQ-Bau ausgelöst)
   * ======================================================================== */
  API.addCarrier = function(pos){
    const u = {
      type : 'carrier',
      x    : pos?.x || 0,
      y    : pos?.y || 0,
      speedTilesPerSec : 3
    };
    Units.push(u);
    INFO('Carrier registriert:', u);
    return u;
  };

  API.getUnits = ()=> Units.slice();

  /* ==========================================================================
   * Jobs verwalten
   * ======================================================================== */
  API.addJob = function(job){
    if (!job) return;
    JobQueue.push(job);
    INFO('Job hinzugefügt:', job);
  };

  API.popJob = function(){
    if (!JobQueue.length) return null;
    return JobQueue.shift();
  };

  /* ==========================================================================
   * Tick – über cb:game:tick
   * ======================================================================== */
  addEventListener('cb:game:tick', (e)=>{
    const dt = e.detail?.dt || 0.016;

    if (typeof window.CarrierRuntime?.tick !== 'function'){
      WARN('CarrierRuntime.tick fehlt');
      return;
    }

    for (const u of Units){
      if (u.type === 'carrier'){
        window.CarrierRuntime.tick(u, dt, {});
      }
    }
  });

  /* ==========================================================================
   * Export
   * ======================================================================== */
  window.GameUnits = API;

  OK('Units-System geladen (v25.11.27-units-core)');

})();
