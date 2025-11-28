/* ============================================================================
 * Datei   : core/carrier.js
 * Projekt : Neue Siedler
 * Version : v25.11.27-simplejobs
 *
 * Zweck   : Einfache Laufzeitlogik für Träger (Carrier).
 *           – Holt Jobs über JobEngine.pop()
 *           – Bewegt Träger kachelweise von job.from → job.to
 *           – Bei type:"carry" werden Game.takeFromBuilding / Game.deliverToHQ
 *             verwendet, damit Ressourcen im HQ ankommen können.
 *
 * Anbindung:
 *   • Das Units-Modul ruft pro Frame auf:
 *       CarrierRuntime.tick(unit, dt, ctx)
 *   • Die Jobs werden im Units-System erzeugt (GameUnits.addJob)
 *     und über JobEngine.pop() / Game.addJob() verwaltet.
 *
 * Achtung:
 *   – Das ist eine bewusst einfache Implementierung ohne komplexes Pathfinding.
 *   – Bewegung erfolgt über eine Manhattan-Linie (erst X, dann Y).
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[carrier]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error?? console.error)(TAG, ...a);

  const G = window.Game || {};
  const CarrierRuntime = window.CarrierRuntime = window.CarrierRuntime || {};

  /* ==========================================================================
   * kleine Hilfen
   * ======================================================================== */

  // Standard-Geschwindigkeit: Kacheln pro Sekunde
  const DEFAULT_SPEED_TPS = 1;   // 1 Tiles pro Sekunde

  function sign(v){
    return v < 0 ? -1 : (v > 0 ? 1 : 0);
  }

  function approxEqual(a,b,eps){
    return Math.abs(a-b) <= (eps || 0.001);
  }

  function ensureState(unit){
    // Eigener State-Container pro Träger, damit wir nix mit fremden Feldern vermischen
    if (!unit.__carrierState){
      unit.__carrierState = {
        mode      : 'idle',   // idle | toSource | toTarget
        job       : null,     // aktueller Job
        cargoRes  : null,     // z.B. "wood"
        cargoQty  : 0,
        moveTimer : 0,        // Steuert "Schritt"-Frequenz
        speedTPS  : unit.speedTilesPerSec || DEFAULT_SPEED_TPS
      };
    }
    return unit.__carrierState;
  }

  function fetchJob(){
    if (typeof G.popJob !== 'function') return null;
    try {
      const job = G.popJob();
      if (job) {
        INFO('Neuer Job für Carrier:', job);
      }
      return job || null;
    } catch(e){
      WARN('G.popJob Fehler:', e?.message || e);
      return null;
    }
  }

  /* ==========================================================================
   * Bewegung: immer einen Kachel-Schritt Richtung Ziel laufen
   * ======================================================================== */

  function stepTowardsTile(unit, st, target, dt){
    if (!target) return;

    // Wir gehen davon aus, dass unit.x/unit.y Kachel-Koordinaten sind.
    let ux = unit.x || 0;
    let uy = unit.y || 0;

    // Wie viele Kacheln dürfen wir dieses Frame gehen?
    const maxStep = st.speedTPS * dt;
    st.moveTimer += maxStep;

    // Um ein "Flackern" zu vermeiden, bewegen wir nur,
    // wenn wir mindestens 0.25 Kacheln "Budget" gesammelt haben
    if (st.moveTimer < 0.25) return;
    st.moveTimer -= 0.25;

    const dx = target.x - ux;
    const dy = target.y - uy;

    if (!dx && !dy){
      // Schon auf dem Ziel-Tile
      return;
    }

    // Manhattan: erst X-Richtung, dann Y-Richtung
    if (dx !== 0){
      ux += sign(dx);
    } else if (dy !== 0){
      uy += sign(dy);
    }

    unit.x = ux;
    unit.y = uy;
  }

  /* ==========================================================================
   * Job-Phasen
   * ======================================================================== */

  function isOnTile(unit, t){
    if (!t) return false;
    const ux = unit.x|0, uy = unit.y|0;
    return ux === (t.x|0) && uy === (t.y|0);
  }

  function handleArriveAtSource(unit, st){
    const job = st.job;
    if (!job) return;

    // type:"carry": hier Produktions-Ware aufnehmen
    if (job.type === 'carry' && job.res && G.takeFromBuilding){
      try {
        const taken = G.takeFromBuilding(job.from.x, job.from.y, job.res);
        if (taken > 0){
          st.cargoRes = job.res;
          st.cargoQty = taken;
          INFO('Carrier hat Ware aufgenommen:', job.res, 'x', taken, 'von', job.from);
        } else {
          // nichts zum Abholen → Job verwerfen
          WARN('Kein Vorrat am Produktionsgebäude – Job verworfen', job);
          st.job  = null;
          st.mode = 'idle';
          return;
        }
      } catch(e){
        WARN('takeFromBuilding Fehler:', e?.message || e);
      }
    }

    // Bei allen Jobtypen geht es danach Richtung Ziel
    st.mode = 'toTarget';
  }

  function handleArriveAtTarget(unit, st){
    const job = st.job;
    if (!job) return;

    if (job.type === 'carry' && st.cargoRes && st.cargoQty && G.deliverToHQ){
      try {
        G.deliverToHQ(st.cargoRes, st.cargoQty);
        INFO('Carrier hat Ware im HQ abgeliefert:', st.cargoRes, 'x', st.cargoQty);
      } catch(e){
        WARN('deliverToHQ Fehler:', e?.message || e);
      }
    }

    // Job erledigt
    st.job      = null;
    st.mode     = 'idle';
    st.cargoRes = null;
    st.cargoQty = 0;
  }

  /* ==========================================================================
   * Haupt-Tick pro Einheit
   * ======================================================================== */

  CarrierRuntime.tick = function(unit, dt, ctx){
    // Safety-Guard: dt sollte >0 sein
    if (!unit || !dt || dt <= 0) return;

    const st = ensureState(unit);

    // Falls kein Job: versuche neuen zu ziehen
    if (!st.job){
      const job = fetchJob();
      if (!job){
        st.mode = 'idle';
        return; // nichts zu tun
      }
      st.job  = job;
      st.mode = 'toSource';

      // Startposition: falls Unit (noch) keine Koordinate hat,
      // setzen wir sie auf das HQ oder direkt auf job.to
      if (!Number.isFinite(unit.x) || !Number.isFinite(unit.y)){
        if (job.to){
          unit.x = job.to.x|0;
          unit.y = job.to.y|0;
        } else if (job.from){
          unit.x = job.from.x|0;
          unit.y = job.from.y|0;
        } else {
          unit.x = 0;
          unit.y = 0;
        }
      }

      // Reset kleiner Lauf-States
      st.moveTimer = 0;
      st.cargoRes  = null;
      st.cargoQty  = 0;
    }

    const job = st.job;
    if (!job){
      st.mode = 'idle';
      return;
    }

    // 1) Ziel je nach Phase bestimmen
    let target = null;
    if (st.mode === 'toSource'){
      target = job.from || null;
    } else if (st.mode === 'toTarget'){
      target = job.to || null;
    } else {
      // Fallback: zurück zur Source
      st.mode = 'toSource';
      target  = job.from || null;
    }

    if (!target){
      // Kaputter Job → wegwerfen
      WARN('Job ohne gültiges Ziel → verworfen', job);
      st.job  = null;
      st.mode = 'idle';
      return;
    }

    // 2) Check: schon am Ziel-Tile?
    if (isOnTile(unit, target)){
      if (st.mode === 'toSource'){
        handleArriveAtSource(unit, st);
      } else if (st.mode === 'toTarget'){
        handleArriveAtTarget(unit, st);
      }
      return;
    }

    // 3) Sonst: einen Schritt Richtung Ziel laufen
    stepTowardsTile(unit, st, target, dt);
  };

  OK('CarrierRuntime geladen (v25.11.27-simplejobs)');

})();
