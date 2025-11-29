/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-units-safe
 *
 * Zweck   : Einheiten (Carrier) steuern:
 *           – Bewegung
 *           – Job-Annahme
 *           – Baujobs korrekt ausführen
 *           – Produktionsjobs korrekt ausführen
 *           – Ressource tragen → Icon in unit.overlay.js
 *
 * Struktur: IMPORTS → STATE → JOBLOGIK → MOVEMENT → TICK → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[units]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const WARN= (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const Units = {
    list : [],
    hqPos: null,   // wird beim HQ-Set gesetzt
    Game : null,

    // ------------------------------------------------------------
    // INIT
    // ------------------------------------------------------------
    init(Game){
      Units.Game = Game;
      Game.units = Units.list;
    },

    setHQPos(x,y){
      if (!Number.isFinite(x) || !Number.isFinite(y)){
        WARN('setHQPos mit ungültigen Werten:', x, y);
        return;
      }
      Units.hqPos = { x, y };
      LOG('HQPos gesetzt:', Units.hqPos);
    },

    // ------------------------------------------------------------
    // Unit erzeugen
    // ------------------------------------------------------------
    spawnCarrier(x,y){
  // Fallbacks: falls irgendwas Komisches reinkommt
  if (!Number.isFinite(x) || !Number.isFinite(y)){
    const hq = Units.hqPos || { x:0, y:0 };
    x = hq.x;
    y = hq.y;
    WARN('spawnCarrier mit ungültigen Koordinaten – nutze HQPos', { x, y });
  }

  const u = {
    id : Units.list.length+1,
    x  : x,
    y  : y,
    tx : x,
    ty : y,
    speed    : 2.2,
    carrying : null,
    task     : null
  };
  Units.list.push(u);
  LOG('Carrier gespawnt', u);
},

    // Alias, falls jemand spawnUnit() aufruft
    spawnUnit(x,y,opts){
      Units.spawnCarrier(x,y,opts);
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

      u.task     = job;
      u.carrying = null;

      if (job.type === 'build'){
        // Startpunkt: HQ / Lager
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
  // 1) Position prüfen
  if (!Number.isFinite(u.x) || !Number.isFinite(u.y)){
    const hq = Units.hqPos || { x:0, y:0 };
    WARN('Unit-Position ungültig – setze auf HQ', u);
    u.x = hq.x;
    u.y = hq.y;
  }

  // 2) Ziel prüfen
  if (!Number.isFinite(u.tx) || !Number.isFinite(u.ty)){
    WARN('Unit-Ziel ungültig – setze Ziel = Position', u);
    u.tx = u.x;
    u.ty = u.y;
  }

  const dx   = u.tx - u.x;
  const dy   = u.ty - u.y;
  const dist = Math.hypot(dx,dy);

  if (!Number.isFinite(dist)){
    WARN('dist NaN für Unit, breche Bewegung ab', u);
    return;
  }

  if (dist < 0.02){
    Units.onArrive(u);
    return;
  }

  const step = u.speed * dt;
  if (step <= 0) return;

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
              x  : job.to.x,
              y  : job.to.y
            }
          }));
          u.carrying = null;
          u.task     = null;
        }
        return;
      }

      // --------- PRODUKTIONSJOB ---------
      if (job.type === 'carry'){
        if (!u.carrying){
          // Ressource aufnehmen
          u.carrying = { res: job.res, qty:1 };
          // Ziel: HQ
          if (Units.hqPos){
            u.tx = Units.hqPos.x;
            u.ty = Units.hqPos.y;
          }
        } else {
          // im HQ ablegen
          dispatchEvent(new CustomEvent('cb:warehouse:push',{
            detail:{
              res: job.res,
              qty: 1
            }
          }));
          u.carrying = null;
          u.task     = null;
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
