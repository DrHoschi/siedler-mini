/* ============================================================================
 * Datei   : core/game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-wood-workarea-maincanvas-forest-worker-v2
 *
 * Zweck   :
 *   Produktionslogik für Holz / Förster / Holzfäller:
 *     - Reagiert auf cb:build:complete für b.lumberjack
 *     - Legt pro Holzfäller ein eigenes State-Objekt an
 *     - Zyklus:
 *         PLANT -> GROW -> READY -> CUT -> (Holz erzeugen) -> wieder PLANT
 *     - Erzeugt Holz über Production.addResource('wood', ...)
 *
 *   Darstellung:
 *     - Zeichnet VIELE Bäume im Arbeitsbereich direkt auf dem HAUPT-CANVAS
 *       (Weltkoordinaten, laufen mit Kamera/Zoom mit)
 *     - Zeigt eine kleine Förster-Blase, die zwischen Hütte und Wald pendelt
 *
 *   API / Debug:
 *     - window.ProductionWood.fields
 *     - window.ProductionWood.drawOnMainCanvas(ctx, cam, tileSize)
 *     - window.ProductionWood._state
 * ========================================================================== */

(function(){
  'use strict';

  // ========================================================================
  // LOGGING / META
  // ========================================================================

  const TAG  = '[prod-wood]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ========================================================================
  // KONSTANTEN
  // ========================================================================

  const LUMBERJACK_ID = 'b.lumberjack';

  const LJ_PHASE = {
    IDLE  : 'idle',
    PLANT : 'plant',
    GROW  : 'grow',
    READY : 'ready',
    CUT   : 'cut'
  };

  const LJ_TIMES = {
    PLANT : 2000,  // 2 s Setzling pflanzen
    GROW  : 8000,  // 8 s wachsen
    CUT   : 2000,  // 2 s fällen
    REST  : 1000   // Reserve / später nutzbar
  };

  // Wie viele Bäume pro Holzfäller-Feld gezeichnet werden sollen
  const TREES_PER_FIELD = 10;

  // Radius-Bereich für den Wald-Ring um die Hütte
  const TREE_RADIUS_MIN         = 1.0;
  const TREE_RADIUS_MAX_DEFAULT = 3.0;

  // Worker-Animation (Förster-Bubble)
  const WORKER_WALK_TIME = 2000;   // ms Hinweg
  const WORKER_REST_TIME = 1000;   // ms Pause am Baum / an der Hütte

  // ========================================================================
  // HILFSFUNKTIONEN – GENERELL
  // ========================================================================

  function addResource(resId, delta, reason, src){
    if (!window.Production || typeof window.Production.addResource !== 'function'){
      WARN('Production.addResource noch nicht verfügbar – call ignoriert', resId, delta);
      return;
    }
    window.Production.addResource(resId, delta, reason, src);
  }

  function rand(min, max){
    return min + Math.random() * (max - min);
  }

  // ========================================================================
  // STATE
  // ========================================================================

  /**
   * Pro Holzfäller-Gebäude ein State-Objekt:
   * {
   *   uid, kind, x,y,w,h,
   *   cx, cy, radiusTiles,
   *   phase, timer,
   *   treeProg, treeAngle, treeDist,
   *   workerPhase, workerTimer
   * }
   */
  const Lumberjacks = new Map();

  // ========================================================================
  // STATE-HILFSFUNKTIONEN
  // ========================================================================

  function createLumberjackState(building){
    const bw = Number.isFinite(building.w) ? building.w : 1;
    const bh = Number.isFinite(building.h) ? building.h : 1;

    const cx = building.x + bw / 2;
    const cy = building.y + bh / 2;

    const radiusTiles = building.workRadiusTiles || TREE_RADIUS_MAX_DEFAULT;

    const st = {
      uid   : building.uid || ('lj-' + Date.now().toString(16)),
      kind  : building.id  || LUMBERJACK_ID,

      x     : building.x,
      y     : building.y,
      w     : bw,
      h     : bh,

      cx,
      cy,
      radiusTiles,

      phase     : LJ_PHASE.PLANT,
      timer     : 0,
      treeProg  : 0,
      treeAngle : rand(0, Math.PI * 2),
      treeDist  : rand(TREE_RADIUS_MIN, radiusTiles),

      workerPhase : 'toTree',
      workerTimer : 0
    };

    return st;
  }

  function getOrCreateLumberjack(building){
    const uid = building.uid || building.id || LUMBERJACK_ID;
    if (Lumberjacks.has(uid)) return Lumberjacks.get(uid);

    const st = createLumberjackState(building);
    Lumberjacks.set(uid, st);
    return st;
  }

  function updateWorkArea(detail){
    const uid = detail.uid || detail.id;
    if (!uid) return;
    const lj = Lumberjacks.get(uid);
    if (!lj) return;

    lj.cx          = detail.cx ?? lj.cx;
    lj.cy          = detail.cy ?? lj.cy;
    lj.radiusTiles = detail.radiusTiles || lj.radiusTiles;

    // Baum-Position neu auswürfeln
    recomputeTreePos(lj);
  }

  function recomputeTreePos(lj){
    lj.treeAngle = rand(0, Math.PI * 2);
    lj.treeDist  = rand(TREE_RADIUS_MIN, lj.radiusTiles || TREE_RADIUS_MAX_DEFAULT);
  }

  // ========================================================================
  // TICK-LOGIK – BAUM-ZYKLUS
  // ========================================================================

  function tickLumberjack(lj, dtMs){
    lj.timer += dtMs;

    switch (lj.phase){
      case LJ_PHASE.PLANT: {
        if (lj.timer >= LJ_TIMES.PLANT){
          lj.timer = 0;
          lj.phase = LJ_PHASE.GROW;
        }
        break;
      }

      case LJ_PHASE.GROW: {
        lj.treeProg = Math.min(1, lj.treeProg + (dtMs / LJ_TIMES.GROW));
        if (lj.timer >= LJ_TIMES.GROW){
          lj.timer    = 0;
          lj.phase    = LJ_PHASE.READY;
          lj.treeProg = 1;
        }
        break;
      }

      case LJ_PHASE.READY: {
        // Später könnten hier Worker-/Träger-Jobs erzeugt werden.
        lj.timer = 0;
        lj.phase = LJ_PHASE.CUT;
        break;
      }

            case LJ_PHASE.CUT: {
        if (lj.timer >= LJ_TIMES.CUT){
          lj.timer = 0;
          lj.phase = LJ_PHASE.PLANT;
          lj.treeProg = 0;
          lj.cycle = (lj.cycle || 0) + 1;

          const qty = 1;

          // Geometrie des Gebäudes
          const bx = lj.x | 0;
          const by = lj.y | 0;
          const bw = (lj.w | 0) || 3;
          const bh = (lj.h | 0) || 3;

          const centerX = bx + bw / 2;
          const centerY = by + bh / 2;

          // 🔁 Nur noch PROD-OUTPUT-Event feuern
          // → Ressourcenzählung + Jobs macht jetzt game.production.js
          try {
            dispatchEvent(new CustomEvent('cb:prod:output', {
              detail:{
                bId  : lj.uid,        // entspricht uid aus cb:build:complete
                uid  : lj.uid,        // fallback, falls bId anders heißt
                kind : lj.kind,       // 'b.lumberjack'
                item : 'wood',        // Ressource
                qty  : qty,           // Menge
                x    : centerX,       // Gebäudecenter (für Fallback)
                y    : centerY,
                w    : bw,
                h    : bh
              }
            }));
          } catch(e){
            WARN('cb:prod:output dispatch fehlgeschlagen', e);
          }

          // Nach jedem vollständigen Zyklus neuen aktiven Baum im Wald wählen
          recomputeTreePos(lj);
        }
        break;
      }

      case LJ_PHASE.IDLE:
      default:
        break;
    }
  }

  function tickAllLumberjacks(dtMs){
    if (!Lumberjacks.size) return;
    for (const lj of Lumberjacks.values()){
      try {
        tickLumberjack(lj, dtMs);
      } catch(e){
        ERR('Fehler in tickLumberjack für', lj.uid, e);
      }
    }
  }

  // ========================================================================
  // FÖRSTER-WORKER (graue Blase, die zwischen Hütte und Baum pendelt)
  // ========================================================================

  function tickWorker(lj, dtMs){
    // sehr einfache Fake-Animation: Timer hochzählen, Phase wechseln
    lj.workerTimer += dtMs;

    if (lj.workerPhase === 'toTree' && lj.workerTimer >= WORKER_WALK_TIME){
      lj.workerPhase = 'atTree';
      lj.workerTimer = 0;
    } else if (lj.workerPhase === 'atTree' && lj.workerTimer >= WORKER_REST_TIME){
      lj.workerPhase = 'toHut';
      lj.workerTimer = 0;
    } else if (lj.workerPhase === 'toHut' && lj.workerTimer >= WORKER_WALK_TIME){
      lj.workerPhase = 'atHut';
      lj.workerTimer = 0;
    } else if (lj.workerPhase === 'atHut' && lj.workerTimer >= WORKER_REST_TIME){
      lj.workerPhase = 'toTree';
      lj.workerTimer = 0;
    }
  }

  function tickAllWorkers(dtMs){
    for (const lj of Lumberjacks.values()){
      try {
        tickWorker(lj, dtMs);
      } catch(e){
        ERR('Fehler in tickWorker für', lj.uid, e);
      }
    }
  }

  // ========================================================================
  // RENDERING – BÄUME + WORKER
  // ========================================================================

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx || !Lumberjacks.size) return;
    const ts = tileSize || 64;
    const z  = cam.zoom || 1;
    const ox = cam.x   || 0;
    const oy = cam.y   || 0;

    for (const lj of Lumberjacks.values()){
      // Wald-Baum
      const angle = lj.treeAngle;
      const dist  = lj.treeDist;

      const worldX = (lj.cx + Math.cos(angle) * dist) * ts;
      const worldY = (lj.cy + Math.sin(angle) * dist) * ts;

      const sx = (worldX - ox) * z;
      const sy = (worldY - oy) * z;

      const size = ts * z * (0.7 + 0.3 * lj.treeProg);

      ctx.save();
      ctx.fillStyle = 'rgba(0,100,0,0.9)';
      ctx.beginPath();
      ctx.arc(sx, sy - size * 0.4, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Worker-Blase
      tickWorker(lj, TICK_MS); // kleine Eigenbewegung synchron zum Produktions-Tick

      const rWork = ts * 0.3 * z;
      let workerX = (lj.cx * ts - ox) * z;
      let workerY = (lj.cy * ts - oy) * z;

      if (lj.workerPhase === 'toTree'){
        workerX = (workerX + sx) / 2;
        workerY = (workerY + sy) / 2;
      } else if (lj.workerPhase === 'atTree'){
        workerX = sx;
        workerY = sy;
      } else if (lj.workerPhase === 'toHut'){
        workerX = (workerX + sx) / 2;
        workerY = (workerY + sy) / 2;
      } // atHut: bleibt an der Hütte

      const bob = Math.sin(Date.now() / 300) * (rWork * 0.15);

      ctx.save();
      ctx.fillStyle = 'rgba(200,200,200,0.9)';
      ctx.beginPath();
      ctx.arc(workerX, workerY - ts * 0.5 + bob, rWork, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(30,30,30,0.95)';
      ctx.arc(workerX, workerY - ts * 0.8 + bob, rWork * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ========================================================================
  // EVENT-HANDLER (build/workarea)
  // ========================================================================

  function onBuildComplete(detail){
    if (!detail || detail.id !== LUMBERJACK_ID) return;
    const st = getOrCreateLumberjack(detail);
    Lumberjacks.set(st.uid, st);
  }

  function onWorkAreaSet(detail){
    if (!detail) return;
    updateWorkArea(detail);
  }

  // ========================================================================
  // TICK-EINBINDUNG
  // ========================================================================

  function tick(dtMs){
    tickAllLumberjacks(dtMs);
    // Worker-Animation hängt an TICK_MS → tickWorker wird oben im Render aufgerufen
  }

  // ========================================================================
  // REGISTRIERUNG BEIM PRODUKTIONS-MANAGER
  // ========================================================================

  if (window.Production && typeof window.Production.registerModule === 'function'){
    window.Production.registerModule({
      id: 'wood',
      tick,
      onBuildComplete,
      onWorkAreaSet
    });
  } else {
    WARN('Production.registerModule fehlt – Holz-Modul nicht angebunden');
  }

  // ========================================================================
  // EXPORT / DEBUG
  // ========================================================================

  window.ProductionWood = {
    fields : Lumberjacks,
    drawOnMainCanvas,
    _state : {
      Lumberjacks
    }
  };

  LOG('Holz-Produktion geladen v25.12.10-wood-workarea-maincanvas-forest-worker-v2');
})();
