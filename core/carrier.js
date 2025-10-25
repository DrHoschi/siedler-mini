/* ============================================================================
 * Datei    : core/carrier.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.10.25-final
 * Zweck    : Träger-Logik (Jobs annehmen → Ressource holen → ins HQ liefern)
 *
 * Struktur : Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 *
 * Events   :
 *   – emit:  cb:carrier:job:accepted {res, from:{x,y}, to:{x,y}}
 *            cb:carrier:pickup:ok    {res, at:{x,y}}
 *            cb:carrier:pickup:fail  {res, at:{x,y}, reason}
 *            cb:carrier:deliver:ok   {res, qty, to:{x,y}}
 *            cb:carrier:idle         {id}
 *            cb:res:change           {res, delta, source:'carrier'}
 *   – listen: (optional) nichts zwingend – wird per Game.tick(...) aufgerufen
 *
 * Hinweis   :
 *   – Nutzt optional AdFinder.findPath(from,to) falls vorhanden, sonst 4-Richtungs-Fallback.
 *   – Greift defensiv auf Game-API zu (Adapter), damit nichts hart crasht.
 *   – Debug-Icon über der Figur bleibt (non-blocking); kann später in HUD überführt werden.
 * ============================================================================ */

(() => {
  'use strict';

  /* ==========================================================================
   * [Imports / Fallback-Logger]
   * ========================================================================== */
  const LOG  = (...a)=> (window.CBLog?.info  ?? console.log )('[carrier]', ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)('[carrier]', ...a);
  const ERR  = (...a)=> (window.CBLog?.error ?? console.error)('[carrier]', ...a);
  const EVT  = (name, detail)=> window.dispatchEvent(new CustomEvent(name, { detail }));

  /* ==========================================================================
   * [Konstanten & Meta]
   * ========================================================================== */
  const VERSION = 'v25.10.25-final';
  const MOVE_COST_PER_TILE = 1;           // dt-Kosten pro Schritt (für spätere Speed-Modelle)
  const ICON_SIZE = 20;                    // Trage-Icon (px)
  const TILE_SIZE = () => (window.Game?.tileSize || 32);

  /* ==========================================================================
   * [Hilfsfunktionen]
   * ========================================================================== */

  /** Kapselt optionale Game-APIs – niemals hart crashen. */
  const G = {
    isBlocked(tx, ty){
      // bevorzugt Standard-API:
      if (typeof window.Game?.getObstacleAt === 'function') {
        return !!window.Game.getObstacleAt(tx, ty);
      }
      if (typeof window.Game?.isBlocked === 'function') {
        return !!window.Game.isBlocked(tx, ty);
      }
      return false; // im Zweifel frei (nur im Debug sinnvoll)
    },
    popJob(){
      if (typeof window.Game?.popJob === 'function') return window.Game.popJob();
      return null;
    },
    takeFromBuilding(x, y, res){
      if (typeof window.Game?.takeFromBuilding === 'function') return window.Game.takeFromBuilding(x, y, res) || 0;
      return 0;
    },
    deliverToHQ(res, qty){
      if (typeof window.Game?.deliverToHQ === 'function') return window.Game.deliverToHQ(res, qty);
      // Minimal: selbst ein cb:res:change emittieren, falls Game es nicht tut
      EVT('cb:res:change', { res, delta: qty, source: 'carrier' });
      return true;
    }
  };

  /** Manhattan-Schritt (4-Richtungen) – Fallback ohne Pfadliste. */
  function stepTowardFallback(u, tx, ty){
    if (u.x === tx && u.y === ty) return true;
    if (u.x < tx && !G.isBlocked(u.x+1, u.y)) u.x++;
    else if (u.x > tx && !G.isBlocked(u.x-1, u.y)) u.x--;
    else if (u.y < ty && !G.isBlocked(u.x, u.y+1)) u.y++;
    else if (u.y > ty && !G.isBlocked(u.x, u.y-1)) u.y--;
    return (u.x === tx && u.y === ty);
  }

  /** Trage-Icon (Debug/Visualizer) anlegen/aktualisieren. */
  function ensureCarryIcon(u){
    if (u._iconElm) return;
    const el = document.createElement('img');
    el.style.position = 'absolute';
    el.style.width    = ICON_SIZE + 'px';
    el.style.height   = ICON_SIZE + 'px';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '35';
    document.body.appendChild(el);
    u._iconElm = el;
  }
  function updateCarryIcon(u){
    const t = TILE_SIZE();
    if (!u._iconElm) return;
    if (u.carrying && u.carrying.res){
      u._iconElm.style.display = 'block';
      u._iconElm.src  = `assets/icons/resources/${u.carrying.res}.png`;
      u._iconElm.style.left = (u.x * t + 6)  + 'px';
      u._iconElm.style.top  = (u.y * t - 10) + 'px';
    } else {
      u._iconElm.style.display = 'none';
    }
  }

  /** Pfad über AdFinder ermitteln (optional). Gibt Liste von Knoten {x,y} oder null. */
  function planPath(from, to){
    try{
      if (window.AdFinder?.findPath){
        const list = window.AdFinder.findPath({x:from.x, y:from.y}, {x:to.x, y:to.y}) || null;
        // Erwartetes Format: [{x,y}, ...]; Fallback falls [from,to] etc.
        if (Array.isArray(list) && list.length){
          // Sicherstellen, dass Objekte {x,y} sind
          const norm = list.map(p => ({ x: ('x' in p ? p.x : p[0]), y: ('y' in p ? p.y : p[1]) }));
          return norm;
        }
      }
    } catch(e){
      WARN('AdFinder.findPath Fehler:', e);
    }
    return null;
  }

  /** Ein Schritt entlang eines geplanten Pfades; gibt true bei Ziel-Erreichen. */
  function stepAlongPath(u){
    if (!Array.isArray(u._path) || u._path.length === 0) return false;
    // Wenn erster Knoten erreicht → entfernen
    const next = u._path[0];
    if (u.x === next.x && u.y === next.y){
      u._path.shift();
      if (u._path.length === 0) return true;
    }
    // Auf den nächsten Knoten zubewegen (ein Tile pro Tick)
    const target = u._path[0];
    return stepTowardFallback(u, target.x, target.y) && u._path.length === 1;
  }

  /* ==========================================================================
   * [Klassen]
   * ========================================================================== */

  /**
   * CarrierRuntime:
   *  – zustandsloses Laufzeitmodul mit einer zentralen tick(u, dt, worldState) Methode
   *  – erwartet pro Träger minimale Struktur {x,y, carrying?, task?}
   */
  const CarrierRuntime = {
    /** Einmaliger Log beim Laden */
    _initOnce: (()=>{ LOG(`Modul geladen (${VERSION})`); return true; })(),

    /**
     * tick(u, dt, state):
     *  – wechselt Zustände: idle → toPickup → toHQ → idle
     *  – nutzt optional geplanten Pfad (u._path), sonst 4-Richtungen-Fallback
     */
    tick(u, dt, state){
      // 0) Defensive Defaults
      if (!u || typeof u.x!=='number' || typeof u.y!=='number'){ return; }

      // 1) Idle → Job ziehen
      if (!u.task){
        const job = G.popJob();
        if (job){
          u.task = { step:'toPickup', job };
          u._path = planPath({x:u.x,y:u.y}, job.from) || null;
          EVT('cb:carrier:job:accepted', { res: job.res, from: job.from, to: job.to });
        } else {
          EVT('cb:carrier:idle', { id: u.id ?? null });
          updateCarryIcon(u);
          return;
        }
      }

      const J = u.task.job;

      // 2) zur Abhol-Position
      if (u.task.step === 'toPickup'){
        let reached = false;
        if (u._path) {
          reached = stepAlongPath(u);
        } else {
          reached = stepTowardFallback(u, J.from.x, J.from.y);
        }
        if (reached){
          // Entnahme versuchen
          const got = G.takeFromBuilding(J.from.x, J.from.y, J.res);
          if (got > 0){
            u.carrying = { res:J.res, qty: Math.min(got, 1) }; // v1: 1 Stück je Lauf
            ensureCarryIcon(u);
            EVT('cb:carrier:pickup:ok', { res:J.res, at:J.from });
            // neuen Pfad zum Ziel/HQ planen
            u._path = planPath({x:u.x,y:u.y}, J.to) || null;
            u.task.step = 'toHQ';
          } else {
            // Nichts da → Job verwerfen (später evtl. retry/backoff)
            EVT('cb:carrier:pickup:fail', { res:J.res, at:J.from, reason:'empty' });
            u.task = null;
            u._path = null;
          }
        }
      }

      // 3) zum HQ/Ziel
      else if (u.task.step === 'toHQ'){
        let reached = false;
        if (u._path) {
          reached = stepAlongPath(u);
        } else {
          reached = stepTowardFallback(u, J.to.x, J.to.y);
        }
        if (reached){
          if (u.carrying){
            G.deliverToHQ(u.carrying.res, u.carrying.qty);
            EVT('cb:carrier:deliver:ok', { res:u.carrying.res, qty:u.carrying.qty, to:J.to });
            // Hinweis: Falls Game.deliverToHQ kein cb:res:change feuert, hat der Adapter bereits emit gemacht.
          }
          u.carrying = null;
          u.task = null;
          u._path = null;
        }
      }

      updateCarryIcon(u);
    }
  };

  /* ==========================================================================
   * [Hauptlogik]
   * ========================================================================== */
  // (leer – Runtime wird über Game-Loop getickt)

  /* ==========================================================================
   * [Exports]
   * ========================================================================== */
  window.CarrierRuntime = CarrierRuntime;

})();
