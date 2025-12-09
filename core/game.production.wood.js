/* ============================================================================
 * Datei   : core/game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-wood-workarea-maincanvas-v2
 *
 * Zweck   :
 *   Spezielle Produktionslogik für Holz / Förster / Holzfäller:
 *     - Reagiert auf cb:build:complete für b.lumberjack
 *     - Legt pro Holzfäller ein eigenes State-Objekt an
 *     - Zyklus:
 *         PLANT -> GROW -> READY -> CUT -> (Holz erzeugen) -> wieder PLANT
 *     - Erzeugt Holz über Production.addResource('wood', ...)
 *     - Zeichnet Bäume direkt auf dem Haupt-Canvas in Weltkoordinaten
 *     - Nutzt den trees_mega_atlas als Grafikquelle (Fallback: Punkte)
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
 *     - window.ProductionWood.Lumberjacks
 *     - window.ProductionWood.drawOnMainCanvas(ctx, cam, tileSize)
 * ========================================================================== */

(function(){
  'use strict';

  // =========================
  // LOGGING / META
  // =========================

  const TAG  = '[prod-wood]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // =========================
  // KONSTANTEN
  // =========================

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

  /* ==========================================================================
   * BAUM-ATLAS-KONFIGURATION (trees_mega_atlas.*)
   * ========================================================================== */

  const TREE_ATLAS_CFG = {
    urlJson  : 'assets/tex/deco/trees_mega_atlas.json',
    urlImage : 'assets/tex/deco/trees_mega_atlas.png',

    frameMap : {
      PLANT : 'e1_regrow_sprout',
      GROW  : 'e1_regrow_tree_medium',
      READY : 'e1_oak_big',
      CUT   : 'cut_fall_left'
    },

    resolvedFrames : null
  };

  // =========================
  // STATE
  // =========================

  /** Map<uid, LumberjackState> */
  const Lumberjacks = new Map();

  /** Atlas-Daten (optional) */
  let treeAtlas        = null;  // Inhalt von trees_mega_atlas.json
  let treeAtlasImg     = null;  // Image-Objekt
  let treeAtlasLoaded  = false; // TRUE, wenn das Bild geladen wurde
  let treeAtlasLoading = false; // Ladevorgang bereits gestartet?

  // =========================
  // HILFSFUNKTIONEN LOGIK
  // =========================

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
  // Kleine Pseudo-Zufallsfunktion aus String (uid-basiert),
  // damit der Baum-Spot stabil bleibt, aber je Zyklus wechseln kann
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

  /**
   * Wählt eine konkrete Baum-Position innerhalb des Arbeitsbereichs
   * und speichert sie in lj.treePos = { tx, ty } in Tile-Koordinaten.
   *
   * - Mittelpunkt = WorkArea.cx / cy (Fallback: Gebäudecenter)
   * - Radius     = WorkArea.radiusTiles (Fallback: 2.5)
   */
  function recomputeTreePos(lj){
    if (!lj) return;

    const wa = lj.workArea || {};
    const cx = (typeof wa.cx === 'number') ? wa.cx : (lj.x + (lj.w || 3) / 2);
    const cy = (typeof wa.cy === 'number') ? wa.cy : (lj.y + (lj.h || 3) / 2);
    const r  = (typeof wa.radiusTiles === 'number') ? wa.radiusTiles : 2.5;

    const seed = `${lj.uid}|${lj.cycle || 0}`;
    const rnd  = makeRng(seed);

    const r2 = r * r;
    let tx = Math.round(cx);
    let ty = Math.round(cy);

    // ein paar Versuche, einen Punkt im Kreis zu finden
    for (let i=0; i<20; i++){
      const angle = rnd() * Math.PI * 2;
      const dist  = r * Math.sqrt(rnd()); // sqrt → mehr Punkte in der Mitte
      const px    = cx + Math.cos(angle) * dist;
      const py    = cy + Math.sin(angle) * dist;

      const dx = px - cx;
      const dy = py - cy;
      if (dx*dx + dy*dy <= r2){
        tx = Math.round(px);
        ty = Math.round(py);
        break;
      }
    }

    lj.treePos = { tx, ty };
    LOG('Baum-Spot neu gewählt', lj.uid, {
      center : { cx, cy, r },
      treePos: lj.treePos
    });
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

      // Konkreter Baum-Spot im Arbeitsbereich
      treePos: null
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

    // ERSTMALS Baum-Position im Arbeitskreis wählen
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

  function tickLumberjack(lj, dtMs){
    lj.timer += dtMs;

    switch (lj.phase) {
      case LJ_PHASE.PLANT: {
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

          // Nach jedem vollständigen Zyklus neuen Baum-Spot im Arbeitsbereich wählen
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

  // ==========================================================================
  // BAUM-ATLAS-LOADING
  // ==========================================================================

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

  // --------------------------------------------------------------------------
  // Zeichnen auf dem Haupt-Canvas (Weltkoordinaten)
  //   - wird aus game.renderer.js aufgerufen
  //   - Kamera-Transform ist bereits gesetzt
  // --------------------------------------------------------------------------
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

      const bx = lj.x | 0;
      const by = lj.y | 0;
      const bw = lj.w || 3;
      const bh = lj.h || 3;

      const area = lj.workArea || {};
      const cxTiles = (typeof area.cx === 'number') ? area.cx : (bx + bw / 2);
      const cyTiles = (typeof area.cy === 'number') ? area.cy : (by + bh / 2);

      const treePos = lj.treePos || {};
      const tx = (typeof treePos.tx === 'number') ? treePos.tx : cxTiles;
      const ty = (typeof treePos.ty === 'number') ? treePos.ty : cyTiles;

      const cxPx = (tx + 0.5) * ts;
      const cyPx = (ty + 1.0) * ts;

      // --------------------------------------------------------------------
      // 1) Baum – Atlas oder Fallback-Kreis
      // --------------------------------------------------------------------
      let treeDrawn = false;

      if (atlasReady){
        let key = null;
        if (lj.phase === LJ_PHASE.PLANT) key = TREE_ATLAS_CFG.frameMap.PLANT;
        else if (lj.phase === LJ_PHASE.GROW)  key = TREE_ATLAS_CFG.frameMap.GROW;
        else if (lj.phase === LJ_PHASE.READY) key = TREE_ATLAS_CFG.frameMap.READY;
        else if (lj.phase === LJ_PHASE.CUT)   key = TREE_ATLAS_CFG.frameMap.CUT;

        if (key){
          const sizeWorld = ts * 2.0; // 2×Tilegröße
          const ok = drawTreeFrame(ctx, key, cxPx, cyPx, sizeWorld);
          if (ok){
            treeDrawn = true;

            // kleiner Wachstums-Ring bei GROW
            if (lj.phase === LJ_PHASE.GROW){
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

      // Fallback: einfacher grüner Punkt, falls Atlas nicht verfügbar
      if (!treeDrawn){
        drawSimpleTreeCircle(ctx, cxPx, cyPx, ts);
      }
      // (Kein Arbeitskreis hier – der kommt aus game.workarea.js)
    }

    ctx.restore();
  }

  // =========================
  // MODUL-SCHNITTSTELLE FÜR Production-Manager
  // =========================

  function onBuildComplete(detail){
    registerLumberjackFromBuild(detail);
    ensureTreeAtlasLoaded();
  }

  function tick(dtMs){
    tickAllLumberjacks(dtMs);
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

  // =========================
  // Arbeitsbereich-API (für UI / WorkArea-Modul)
  // =========================

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

    // Sobald sich der Arbeitsbereich ändert → Baum-Spot neu berechnen
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

  // =========================
  // REGISTRIERUNG BEIM Production-Manager
  // =========================

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
        drawOnMainCanvas
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

  // =========================
  // DEBUG-EXPORT
  // =========================

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

  LOG('Holz-Modul geladen v25.12.09-wood-workarea-maincanvas-v2');

})();
