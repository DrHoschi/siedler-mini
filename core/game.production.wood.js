/* ============================================================================
 * Datei   : core/game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-wood-workarea-maincanvas-forest-worker-v1
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
 *     - KEIN OverlayHooks, kein eigenes Overlay-Canvas
 *     - Nutzt trees_mega_atlas.* (Fallback: einfache grüne Punkte)
 *
 *   Besonderheiten:
 *     - Bäume werden im Arbeitsbereich verteilt (Ring um das Gebäude)
 *     - Keine Bäume IM Gebäude-Rechteck (Kollision Gebäudefläche)
 *     - Y-Sortierung: von oben nach unten, Bäume "hinter" dem Gebäude
 *       werden nicht über die Häuserwand gemalt
 *     - Ein einfacher "Förster"-Bubble (graue Blase), der zwischen
 *       Hütte und einem aktiven Baum hin und her läuft (Ping-Pong)
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *     - cb:workarea:set   { id|buildingId|kind, uid, cx,cy,radiusTiles, x,y,w,h }
 *
 *   OUT :
 *     - cb:prod:start  { bId, kind }
 *     - cb:prod:output { bId, kind, item:'wood', qty }
 *
 *   API / Debug:
 *     - window.ProductionWood.Lumberjacks           (Map mit States)
 *     - window.ProductionWood.drawOnMainCanvas(...) (Renderer-Hook)
 *     - window.ProductionWood.setWorkArea(uid, cfg) (WorkArea-Update)
 *     - window.ProductionWood._recomputeTreePos(lj) (setzt aktiven Baum)
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
  const TREE_RADIUS_MIN = 1.0;
  const TREE_RADIUS_MAX_DEFAULT = 3.0;

  // Worker-Animation (Förster-Bubble) – Zeit für Hin- und Rückweg
  const WORKER_TRAVEL_MS = 1600;
  const WORKER_TOTAL_MS  = WORKER_TRAVEL_MS * 2; // hin + zurück

  /* ==========================================================================
   * BAUM-ATLAS-KONFIGURATION (trees_mega_atlas.*)
   * ========================================================================== */

  const TREE_ATLAS_CFG = {
    urlJson  : 'assets/tex/deco/trees_mega_atlas.json',
    urlImage : 'assets/tex/deco/trees_mega_atlas.png',

    // Logische Phasen → Frame-Namen
    frameMap : {
      PLANT : 'e1_regrow_sprout',
      GROW  : 'e1_regrow_tree_medium',
      READY : 'e1_oak_big',
      CUT   : 'cut_fall_left'
    },

    resolvedFrames : null
  };

  // ========================================================================
  // STATE
  // ========================================================================

  /**
   * LumberjackState:
   *  {
   *    uid, kind, x,y,w,h,
   *    phase, timer, cycle, treeProg,
   *    workArea : { cx, cy, radiusTiles },
   *    trees    : [ { tx, ty }, ... ],   // Verteilte Baum-Positionen
   *    activeTreeIndex : number,         // Index in trees für den aktiven Baum
   *    treePos : { tx, ty } | null,      // Kompatibilität / Debug
   *    worker  : { ... } | null          // Förster-Bubble
   *  }
   */
  /** Map<uid, LumberjackState> */
  const Lumberjacks = new Map();

  /** Atlas-Daten (optional) */
  let treeAtlas        = null;  // Inhalt von trees_mega_atlas.json
  let treeAtlasImg     = null;  // Image-Objekt
  let treeAtlasLoaded  = false; // TRUE, wenn das Bild geladen wurde
  let treeAtlasLoading = false; // Ladevorgang bereits gestartet?

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

  /**
   * Einheitliche UID-Erzeugung für Holzfäller-Gebäude
   * (gleiche Logik wie im WorkArea-Modul).
   */
  function makeUidFromDetail(detail){
    if (!detail) return null;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || LUMBERJACK_ID;
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
  }

  // ----------------------------------------------------------
  // Pseudo-Zufall aus String (uid-basiert),
  // damit die Wald-Positionen stabil, aber je Gebäude verschieden sind
  // ----------------------------------------------------------
  function makeRng(seedStr){
    let s = 0;
    for (let i=0; i<seedStr.length; i++){
      s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    if (!s) s = 1;
    return function rng(){
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
  }

  // ========================================================================
  // WALD-GENERIERUNG / AKTIVER BAUM
  // ========================================================================

  /**
   * Erzeugt / erneuert das Baum-Layout für einen Lumberjack:
   * - Verteilte Bäume im Arbeitsbereich (Ring um center)
   * - Keine Bäume IM Gebäude-Rechteck
   */
  function buildForestForLumberjack(lj){
    if (!lj) return;

    const wa = lj.workArea || {};
    const cx = (typeof wa.cx === 'number') ? wa.cx : (lj.x + (lj.w || 3) / 2);
    const cy = (typeof wa.cy === 'number') ? wa.cy : (lj.y + (lj.h || 3) / 2);

    const maxR = (typeof wa.radiusTiles === 'number') ? wa.radiusTiles : TREE_RADIUS_MAX_DEFAULT;
    const rMin = Math.min(TREE_RADIUS_MIN, maxR * 0.6);
    const rMax = maxR;

    const rng = makeRng(lj.uid + '|forest|' + (lj.cycle || 0));

    // Gebäuderechteck (damit dort keine Bäume stehen)
    const bx0 = lj.x | 0;
    const by0 = lj.y | 0;
    const bw  = (lj.w | 0) || 3;
    const bh  = (lj.h | 0) || 3;
    const bx1 = bx0 + bw;
    const by1 = by0 + bh;

    const trees = [];

    for (let i=0; i<TREES_PER_FIELD; i++){
      let tx = 0;
      let ty = 0;
      let placed = false;

      // Bis zu 30 Versuche, einen Punkt im Ring zu finden,
      // der NICHT im Gebäude liegt.
      for (let tries=0; tries<30 && !placed; tries++){
        const angle  = rng() * Math.PI * 2;
        const radius = rMin + (rMax - rMin) * rng();

        tx = cx + Math.cos(angle) * radius;
        ty = cy + Math.sin(angle) * radius;

        // Liegt die Position im Gebäude-Rechteck? → überspringen
        if (tx >= bx0-0.1 && tx <= bx1+0.1 &&
            ty >= by0-0.1 && ty <= by1+0.1){
          continue;
        }

        placed = true;
      }

      if (!placed){
        continue;
      }

      trees.push({ tx, ty });
    }

    lj.trees = trees;
    LOG('Wald für Lumberjack erzeugt', lj.uid, { count: trees.length, cx, cy, rMin, rMax });
  }

  /**
   * Wählt einen aktiven Baum aus lj.trees und setzt lj.treePos
   * (für Animation + Kompatibilität zu älteren Debug-Funktionen).
   */
  function pickActiveTree(lj){
    const trees = lj.trees || [];
    if (!trees.length){
      lj.activeTreeIndex = -1;
      lj.treePos = null;
      return;
    }

    const rng = makeRng(lj.uid + '|active|' + (lj.cycle || 0));
    const idx = Math.floor(rng() * trees.length) % trees.length;

    lj.activeTreeIndex = idx;
    const t = trees[idx];
    lj.treePos = {
      tx: Math.round(t.tx),
      ty: Math.round(t.ty)
    };

    LOG('Aktiver Baum gewählt', lj.uid, {
      index : idx,
      treePos: lj.treePos
    });
  }

  /**
   * Kompatibel zur alten Semantik: setzt den "Baum-Spot" neu.
   * In der neuen Version:
   *   - stellt sicher, dass ein Wald existiert
   *   - wählt einen neuen aktiven Baum aus dem Wald
   */
  function recomputeTreePos(lj){
    if (!lj) return;
    if (!lj.trees || !lj.trees.length){
      buildForestForLumberjack(lj);
    }
    pickActiveTree(lj);
  }

  /**
   * Förster-Instanz registrieren – wird von onBuildComplete() aufgerufen.
   */
  function registerLumberjackFromBuild(detail){
    if (!detail) return;

    const kind = detail.id || detail.buildingId || detail.kind;
    if (kind !== LUMBERJACK_ID) return;

    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    const uid = makeUidFromDetail(detail);
    if (!uid) return;

    if (Lumberjacks.has(uid)){
      // bereits registriert → nichts tun
      return;
    }

    const centerX = x + w / 2;
    const centerY = y + h / 2;

    const state = {
      uid,
      kind,
      x, y, w, h,

      phase    : LJ_PHASE.PLANT,
      timer    : 0,
      cycle    : 0,
      treeProg : 0,

      // ARBEITSBEREICH:
      // Standard-Kreismitte = Gebäudecenter; wird später von GameWorkArea
      // bzw. cb:workarea:set überschrieben.
      workArea : {
        cx         : centerX,
        cy         : centerY,
        radiusTiles: 2.5
      },

      // Wald-Layout und aktiver Baum
      trees           : [],
      activeTreeIndex : -1,
      treePos         : null,

      // Einfache Worker-Blase (Förster)
      worker : null
    };

    // Versuchen, eine bereits existierende WorkArea vom WorkArea-Modul zu holen
    try {
      if (window.GameWorkArea && typeof GameWorkArea.getAreaFor === 'function'){
        const area = GameWorkArea.getAreaFor({
          id  : kind,
          uid : uid,
          x, y, w, h
        });
        if (area){
          state.workArea = {
            cx         : area.cx,
            cy         : area.cy,
            radiusTiles: area.radiusTiles
          };
        }
      }
    } catch(e){
      WARN('Konnte WorkArea für Lumberjack nicht übernehmen:', e);
    }

    // Wald erzeugen & einen aktiven Baum wählen
    buildForestForLumberjack(state);
    recomputeTreePos(state);

    Lumberjacks.set(uid, state);

    try {
      dispatchEvent(new CustomEvent('cb:prod:start', {
        detail:{ bId: uid, kind }
      }));
    } catch(e){
      WARN('cb:prod:start (wood) dispatch fehlgeschlagen', e);
    }

    LOG('Lumberjack registriert', state);
  }

  // ========================================================================
  // TICK / PHASEN-LOGIK
  // ========================================================================

  function tickLumberjack(lj, dtMs){
    lj.timer += dtMs;

    switch (lj.phase) {
      case LJ_PHASE.PLANT: {
        // Immer sicherstellen, dass es einen aktiven Baum gibt
        if (!lj.trees || !lj.trees.length){
          buildForestForLumberjack(lj);
        }
        if (lj.activeTreeIndex == null || lj.activeTreeIndex < 0){
          recomputeTreePos(lj);
        }

        if (lj.timer >= LJ_TIMES.PLANT){
          lj.timer    = 0;
          lj.phase    = LJ_PHASE.GROW;
          lj.treeProg = 0;
        }
        break;
      }

      case LJ_PHASE.GROW: {
        const p = Math.min(1, lj.timer / LJ_TIMES.GROW);
        lj.treeProg = p;
        if (lj.timer >= LJ_TIMES.GROW){
          lj.timer    = 0;
          lj.phase    = LJ_PHASE.READY;
          lj.treeProg = 1;
        }
        break;
      }

      case LJ_PHASE.READY: {
        // Hier könnten später Arbeitswege / Trägerjobs reinkommen.
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
          addResource('wood', qty, 'lumberjack-cycle', lj.uid);

          try {
            dispatchEvent(new CustomEvent('cb:prod:output', {
              detail:{
                bId  : lj.uid,
                kind : lj.kind,
                item : 'wood',
                qty  : qty
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

  function tickAllWorkers(dtMs){
    if (!Lumberjacks.size) return;

    for (const lj of Lumberjacks.values()){
      const trees = lj.trees || [];
      if (!trees.length){
        lj.worker = null;
        continue;
      }

      // Sichtbarer Baum für Worker-Animation:
      const activeTree = (lj.activeTreeIndex != null && lj.activeTreeIndex >= 0 && lj.activeTreeIndex < trees.length)
        ? trees[lj.activeTreeIndex]
        : trees[0];

      if (!activeTree){
        lj.worker = null;
        continue;
      }

      // Falls noch kein Worker existiert → einen neuen anlegen
      if (!lj.worker){
        const bx0 = lj.x | 0;
        const by0 = lj.y | 0;
        const bw  = (lj.w | 0) || 3;
        const bh  = (lj.h | 0) || 3;

        const centerTx = bx0 + bw / 2;
        const centerTy = by0 + bh / 2;

        lj.worker = {
          tMs    : 0,
          fromTx : centerTx,
          fromTy : centerTy,
          toTx   : activeTree.tx,
          toTy   : activeTree.ty,
          tNorm  : 0,
          idle   : true
        };
      }

      const w = lj.worker;
      if (!w) continue;

      w.tMs += dtMs || 0;

      if (w.tMs >= WORKER_TOTAL_MS){
        // Zyklus fertig → Worker verschwindet,
        // wird im nächsten Tick ggf. neu erstellt.
        lj.worker = null;
        continue;
      }

      const t = w.tMs / WORKER_TOTAL_MS;
      const phase = t <= 0.5 ? (t * 2) : (2 - t * 2);
      w.tNorm = Math.max(0, Math.min(1, phase));
    }
  }

  // ========================================================================
  // BAUM-ATLAS-LOADING
  // ========================================================================

  function ensureTreeAtlasLoaded(){
    if (treeAtlasLoaded || treeAtlasLoading) return;
    treeAtlasLoading = true;

    try {
      fetch(TREE_ATLAS_CFG.urlJson)
        .then(r => r.json())
        .then(data => {
          treeAtlas = data;
          LOG('Tree-Atlas JSON geladen:', TREE_ATLAS_CFG.urlJson);
        })
        .catch(err => {
          WARN('Tree-Atlas JSON konnte nicht geladen werden:', err);
        });
    } catch(e){
      WARN('Tree-Atlas JSON fetch nicht verfügbar:', e);
    }

    try {
      const img = new Image();
      img.onload = function(){
        treeAtlasImg    = img;
        treeAtlasLoaded = true;
        LOG('Tree-Atlas Bild geladen:', TREE_ATLAS_CFG.urlImage);
      };
      img.onerror = function(err){
        WARN('Tree-Atlas Bild konnte nicht geladen werden:', err);
      };
      img.src = TREE_ATLAS_CFG.urlImage;
    } catch(e){
      WARN('Tree-Atlas Bild-Ladevorgang fehlgeschlagen:', e);
    }
  }

  function ensureTreeAtlasReady(){
    if (!treeAtlasLoaded || !treeAtlasImg || !treeAtlas || !treeAtlas.frames){
      return false;
    }

    if (!TREE_ATLAS_CFG.resolvedFrames){
      const tileW = treeAtlas.tileW || 128;
      const tileH = treeAtlas.tileH || 128;
      const resolved = {};

      for (const [name, pos] of Object.entries(treeAtlas.frames)){
        const cx = pos[0] | 0;
        const cy = pos[1] | 0;
        resolved[name] = {
          x: cx * tileW,
          y: cy * tileH,
          w: tileW,
          h: tileH
        };
      }

      TREE_ATLAS_CFG.resolvedFrames = resolved;
      LOG('Tree-Atlas Frames aufgelöst (resolvedFrames).');
    }

    return true;
  }

  /**
   * Zeichnet einen Baum-Frame an Weltkoordinate (cx,cy) in Pixeln.
   * cx,cy = Bodenkontakt / Fußpunkt (Mitte unten).
   */
  function drawTreeFrame(ctx, key, cx, cy, sizePx){
    if (!ensureTreeAtlasReady()) return false;

    const frames = TREE_ATLAS_CFG.resolvedFrames;
    const f = frames && frames[key];
    if (!f || !treeAtlasImg) return false;

    const w = sizePx;
    const h = sizePx;

    const dx = cx - w / 2;
    const dy = cy - h;

    try {
      ctx.drawImage(
        treeAtlasImg,
        f.x, f.y, f.w, f.h,
        dx, dy, w, h
      );
      return true;
    } catch (e){
      WARN('drawTreeFrame Fehler:', e);
      return false;
    }
  }

  function drawSimpleTreeCircle(ctx, xPx, yPx, ts){
    ctx.beginPath();
    ctx.fillStyle   = 'rgba(40, 180, 80, 0.85)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth   = Math.max(1.5, ts * 0.05);
    ctx.arc(xPx, yPx, ts * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // ========================================================================
  // HAUPT-CANVAS-ZEICHNUNG (Wald + Förster)
  // ========================================================================

  /**
   * Wird vom Renderer aufgerufen, nachdem die Kamera-Transform gesetzt wurde.
   * → ctx ist bereits in Weltkoordinaten transformiert.
   */
  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;
    if (!Lumberjacks.size) return;

    const Game = window.Game || {};
    const ts =
      (tileSize) ||
      (Game.map && Game.map.tileSize) ||
      (window.GameMap && window.GameMap._state && window.GameMap._state.map && window.GameMap._state.map.tileSize) ||
      Game.tileSize ||
      64;

    const atlasReady = ensureTreeAtlasReady();

    ctx.save();

    for (const lj of Lumberjacks.values()){
      if (!lj) continue;

      const bx0 = lj.x | 0;
      const by0 = lj.y | 0;
      const bw  = (lj.w || 3) | 0;
      const bh  = (lj.h || 3) | 0;
      const bx1 = bx0 + bw;
      const by1 = by0 + bh;

      // Linie, ab der "vor dem Gebäude" vs. "hinter dem Gebäude"
      const frontY = by1 - 0.2;

      const trees = (lj.trees && lj.trees.length)
        ? lj.trees.slice()  // Kopie zum Sortieren
        : (lj.treePos ? [lj.treePos] : []);

      if (!trees.length){
        continue;
      }

      const activeTree = (lj.trees && lj.activeTreeIndex != null && lj.activeTreeIndex >= 0 && lj.activeTreeIndex < lj.trees.length)
        ? lj.trees[lj.activeTreeIndex]
        : null;

      // Y-Sortierung: von oben nach unten, damit Tiefenwirkung stimmt
      trees.sort((a, b)=> (a.ty - b.ty));

      for (const t of trees){
        const tx = t.tx;
        const ty = t.ty;

        if (typeof tx !== 'number' || typeof ty !== 'number') continue;

        // Bäume, die hinter dem Gebäude liegen und im X-Bereich des Hauses:
        // nicht zeichnen → sonst würden sie über die Hauswand gemalt.
        const behindBuilding =
          ty < frontY &&
          tx >= bx0 - 0.5 && tx <= bx1 + 0.5;

        if (behindBuilding){
          continue;
        }

        const cxPx = (tx + 0.5) * ts;
        const cyPx = (ty + 1.0) * ts;

        let treeDrawn = false;

        // Welcher Frame? Aktiver Baum → PLANT/GROW/READY/CUT,
        // alle anderen Bäume → READY (großer, fertiger Baum).
        let key = null;
        const isActive = (activeTree && t === activeTree);

        if (atlasReady){
          if (isActive){
            if (lj.phase === LJ_PHASE.PLANT) key = TREE_ATLAS_CFG.frameMap.PLANT;
            else if (lj.phase === LJ_PHASE.GROW)  key = TREE_ATLAS_CFG.frameMap.GROW;
            else if (lj.phase === LJ_PHASE.READY) key = TREE_ATLAS_CFG.frameMap.READY;
            else if (lj.phase === LJ_PHASE.CUT)   key = TREE_ATLAS_CFG.frameMap.CUT;
          } else {
            key = TREE_ATLAS_CFG.frameMap.READY;
          }

          if (key){
            const sizeWorld = ts * 2.0;
            const ok = drawTreeFrame(ctx, key, cxPx, cyPx, sizeWorld);
            if (ok){
              treeDrawn = true;

              if (isActive && lj.phase === LJ_PHASE.GROW){
                // Wachstumsring beim aktiven Baum
                ctx.beginPath();
                ctx.lineWidth   = Math.max(1.5, ts * 0.04);
                ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
                const r    = sizeWorld * 0.35;
                ctx.arc(
                  cxPx,
                  cyPx - sizeWorld * 0.9,
                  r,
                  -Math.PI/2,
                  -Math.PI/2 + prog * Math.PI * 2
                );
                ctx.stroke();
              }
            }
          }
        }

        if (!treeDrawn){
          drawSimpleTreeCircle(ctx, cxPx, cyPx, ts);
        }
      }

      // Förster-Bubble zeichnen (falls vorhanden)
      if (lj.worker){
        const w = lj.worker;
        const tNorm = Math.max(0, Math.min(1, w.tNorm || 0));

        const curTx = w.fromTx + (w.toTx - w.fromTx) * tNorm;
        const curTy = w.fromTy + (w.toTy - w.fromTy) * tNorm;

        const wx = (curTx + 0.5) * ts;
        const wy = (curTy + 1.0) * ts;

        const rr = ts * 0.25;

        ctx.beginPath();
        ctx.fillStyle   = 'rgba(160,200,160,0.9)';
        ctx.strokeStyle = 'rgba(30,60,30,0.9)';
        ctx.lineWidth   = Math.max(1, ts * 0.03);
        ctx.arc(wx, wy - rr * 1.2, rr, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ========================================================================
  // MODUL-SCHNITTSTELLE FÜR Production-Manager
  // ========================================================================

  function onBuildComplete(detail){
    registerLumberjackFromBuild(detail);
    ensureTreeAtlasLoaded();
  }

  function tick(dtMs){
    tickAllLumberjacks(dtMs);
    tickAllWorkers(dtMs);
  }

  // Direkter cb:build:complete Listener als Fallback
  try {
    window.addEventListener('cb:build:complete', (ev)=>{
      const detail = ev.detail || {};
      try {
        (window.CBLog?.info || console.info)(
          TAG,
          'direct cb:build:complete',
          detail.id,
          detail
        );

        registerLumberjackFromBuild(detail);
        ensureTreeAtlasLoaded();
      } catch (e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'Direkter cb:build:complete-Listener Fehler:',
          e
        );
      }
    }, { passive:true });
  } catch(e){
    (window.CBLog?.warn || console.warn)(
      TAG,
      'Direkter cb:build:complete-Listener konnte nicht registriert werden:',
      e
    );
  }

  // ========================================================================
  // Arbeitsbereich-API (für UI / WorkArea-Modul)
  // ========================================================================

  function setWorkArea(uid, cfg){
    const lj = Lumberjacks.get(uid);
    if (!lj){
      WARN('setWorkArea: unbekannte uid', uid);
      return;
    }

    const fallbackRadius = (lj.workArea && lj.workArea.radiusTiles) || 2.5;

    lj.workArea = {
      cx         : (cfg && typeof cfg.cx === 'number') ? cfg.cx : (lj.x + (lj.w || 3) / 2),
      cy         : (cfg && typeof cfg.cy === 'number') ? cfg.cy : (lj.y + (lj.h || 3) / 2),
      radiusTiles: (cfg && typeof cfg.radiusTiles === 'number') ? cfg.radiusTiles : fallbackRadius
    };

    // Wenn sich der Arbeitsbereich ändert:
    //  - Wald neu um den neuen Mittelpunkt herum erzeugen
    //  - neuen aktiven Baum wählen
    buildForestForLumberjack(lj);
    recomputeTreePos(lj);

    LOG('Arbeitsbereich aktualisiert', uid, lj.workArea);
  }

  function onWorkAreaSet(detail){
    if (!detail) return;

    const bId = detail.id || detail.buildingId || detail.kind;
    if (bId !== LUMBERJACK_ID) return;

    const uid = makeUidFromDetail(detail);
    if (!uid) return;

    setWorkArea(uid, {
      cx         : (typeof detail.cx === 'number') ? detail.cx : undefined,
      cy         : (typeof detail.cy === 'number') ? detail.cy : undefined,
      radiusTiles: (typeof detail.radiusTiles === 'number') ? detail.radiusTiles : undefined
    });
  }

  // Direktes Event-Binding für cb:workarea:set
  try {
    window.addEventListener('cb:workarea:set', (ev)=>{
      const detail = ev.detail || {};
      try {
        onWorkAreaSet(detail);
      } catch(e){
        (window.CBLog?.warn || console.warn)(
          TAG,
          'cb:workarea:set-Listener Fehler:',
          e
        );
      }
    }, { passive:true });
  } catch(e){
    (window.CBLog?.warn || console.warn)(
      TAG,
      'cb:workarea:set-Listener konnte nicht registriert werden:',
      e
    );
  }

  // ========================================================================
  // REGISTRIERUNG BEIM Production-Manager
  // ========================================================================

  function registerWithManager(){
    if (!window.Production || typeof window.Production.registerModule !== 'function'){
      return false;
    }
    try {
      window.Production.registerModule({
        id             : 'wood',
        onBuildComplete,
        onWorkAreaSet,
        tick,
        drawOnMainCanvas   // <-- WICHTIG: Main-Canvas-Zeichner registrieren
      });
      LOG('Produktionsmodul "wood" registriert.');
      return true;
    } catch(e){
      WARN('Production.registerModule(wood) fehlgeschlagen', e);
      return true;
    }
  }

  if (!registerWithManager()){
    let tries = 0;
    const t = setInterval(()=>{
      if (registerWithManager() || ++tries > 20) clearInterval(t);
    }, 200);
  }

  // ========================================================================
  // DEBUG-EXPORT
  // ========================================================================

  window.ProductionWood = {
    Lumberjacks,
    LJ_PHASE,
    LJ_TIMES,
    TREE_ATLAS_CFG,
    setWorkArea,
    drawOnMainCanvas,
    _tickOne             : tickLumberjack,
    _ensureTreeAtlasReady: ensureTreeAtlasReady,
    _drawTreeFrame       : drawTreeFrame,
    _recomputeTreePos    : recomputeTreePos
  };

  LOG('Holz-Modul geladen v25.12.10-wood-workarea-maincanvas-forest-worker-v1');

})();
