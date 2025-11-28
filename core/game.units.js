/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-final
 *
 * Zweck   : Einheiten (Carrier) steuern:
 *           – Bewegung
 *           – Job-Annahme
 *           – Baujobs korrekt ausführen (!)
 *           – Produktionsjobs korrekt ausführen
 *           – Ressource tragen → Icon in unit.overlay.js
 *
 * Struktur: IMPORTS → STATE → JOBLOGIK → MOVEMENT → TICK → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[units]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  const Units = {
    list: [],
    hqPos: null,   // wird beim HQ-Set gesetzt

    init(Game){
      Units.Game = Game;
      Game.units = Units.list;
    },

    // ------------------------------------------------------------
    // Unit erzeugen
    // ------------------------------------------------------------
    spawnCarrier(x,y){
      const u = {
        id: Units.list.length+1,
        x, y,
        tx: x, ty: y,
        speed: 2.2,
        carrying: null,
        task: null
      };
      Units.list.push(u);
      LOG('Carrier gespawnt', u);
    },

    // ------------------------------------------------------------
    // JOBLOGIK
    // ------------------------------------------------------------
    needsJob(){
      return Units.list.some(u => !u.task);
    },

    assignJob(job){
      const u = Units.list.find(u => !u.task);
      if (!u) return;

      u.task = job;
      u.carrying = null;

      // BAUJOB FIX
      if (job.type === 'build'){
        u.tx = job.from.x;
        u.ty = job.from.y;
      }
      else if (job.type === 'carry'){
        // Produktion → zur Ressource
        u.tx = job.from.x;
        u.ty = job.from.y;
      }

      LOG('assignJob →', job);
    },

    // ------------------------------------------------------------
    // MOVEMENT
    // ------------------------------------------------------------
    move(u, dt){
      const dx = u.tx - u.x;
      const dy = u.ty - u.y;
      const dist = Math.hypot(dx,dy);
      if (dist < 0.02){
        Units.onArrive(u);
        return;
      }
      const step = u.speed * dt;
      u.x += dx/dist * step;
      u.y += dy/dist * step;
    },

    // ------------------------------------------------------------
    // ANKUNFT
    // ------------------------------------------------------------
    onArrive(u){
      const job = u.task;
      if (!job) return;

      // --------- BAUJOB ---------
      if (job.type === 'build'){
        if (!u.carrying){
          // Schritt 1: Ressource am HQ holen
          u.carrying = { res: job.res, qty:1 };
          // Ziel: Baustelle
          u.tx = job.to.x;
          u.ty = job.to.y;
        }
        else {
          // Schritt 2: Baustelle erreicht → Ressource ablegen
          dispatchEvent(new CustomEvent('cb:build:deliver',{
            detail:{
              res: job.res,
              qty: 1,
              x: job.to.x,
              y: job.to.y
            }
          }));
          u.carrying = null;
          u.task = null;
        }
        return;
      }

      // --------- PRODUKTIONSJOB ---------
      if (job.type === 'carry'){
        if (!u.carrying){
          // Ressource aufnehmen
          u.carrying = { res: job.res, qty:1 };
          // Ziel: HQ
          u.tx = Units.hqPos.x;
          u.ty = Units.hqPos.y;
        } else {
          // im HQ ablegen
          dispatchEvent(new CustomEvent('cb:warehouse:push',{
            detail:{
              res: job.res,
              qty: 1
            }
          }));
          u.carrying = null;
          u.task = null;
        }
      }
    },

    // ------------------------------------------------------------
    // TICK
    // ------------------------------------------------------------
    tick(dt){
      for (const u of Units.list){
        Units.move(u,dt);
      }
    }
  };

  window.GameUnits = Units;

})();
