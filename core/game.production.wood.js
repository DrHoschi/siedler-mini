/* ============================================================================
 * Datei   : core/game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-wood-workarea-maincanvas-v1
 *
 * Zweck   :
 *   Spezielle Produktionslogik für Holz / Förster / Holzfäller:
 *     - Reagiert auf cb:build:complete für b.lumberjack
 *     - Legt pro Holzfäller ein eigenes State-Objekt an
 *     - Zyklus:
 *         PLANT -> GROW -> READY -> CUT -> (Holz erzeugen) -> wieder PLANT
 *     - Erzeugt Holz über Production.addResource('wood', ...)
 *     - Zeichnet Bäume direkt auf dem Haupt-Canvas
 *       (gleiches Kamera-Transform wie Map/Gebäude)
 *     - Nutzt den trees_mega_atlas als Grafikquelle (fallback: Kreise)
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
 *     - window.ProductionWood.setWorkArea(uid, {cx,cy,radiusTiles})
 *       → Arbeitskreis synchronisieren (z.B. aus WorkArea-Modul)
 *     - window.ProductionWood.drawOnMainCanvas(ctx, cam, tileSize)
 *       → vom Renderer aufgerufen
 * ========================================================================== */

(function(){
  'use strict';

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
    PLANT : 2000,
    GROW  : 8000,
    CUT   : 2000,
    REST  : 1000
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
  let treeAtlas        = null;
  let treeAtlasImg     = null;
  let treeAtlasLoaded  = false;
  let treeAtlasLoading = false;

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

  function makeUidFromDetail(detail){
    if (!detail) return null;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || LUMBERJACK_ID;
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
  }

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
  // Helfer: Ziel-Tile für Holzfäller basierend auf Arbeitsbereich
  // ========================================================================

  function getTreeTargetTileForLumberjack(lj){
    if (!lj){
      return { x: 0, y: 0 };
    }

    // 1) GameWorkArea → Mittelpunkt des Arbeitsbereichs
    try {
      const waMod = window.GameWorkArea;
      if (waMod && typeof waMod.getCenterTileForBuilding === 'function'){
        const buildingKey =
          lj.buildingId ||
          lj.uid ||
          lj.id ||
          lj.kind ||
          LUMBERJACK_ID;

        const wa = waMod.getCenterTileForBuilding(buildingKey);
        if (wa && Number.isFinite(wa.cx) && Number.isFinite(wa.cy)){
          return {
            x: wa.cx | 0,
            y: wa.cy | 0
          };
        }
      }
    } catch (e){
      (window.CBLog?.warn || console.warn)(
        TAG,
        'getTreeTargetTileForLumberjack WorkArea-Fehler:',
        e
      );
    }

    // 2) Aktuelle WorkArea im Lumberjack-State
    if (lj.workArea && Number.isFinite(lj.workArea.cx) && Number.isFinite(lj.workArea.cy)){
      return {
        x: lj.workArea.cx | 0,
        y: lj.workArea.cy | 0
      };
    }

    // 3) Fallback: Gebäudemitte
    const bx = lj.x | 0;
    const by = lj.y | 0;
    const bw = lj.w || 3;
    const bh = lj.h || 3;

    return {
      x: (bx + Math.floor(bw / 2)) | 0,
      y: (by + Math.floor(bh / 2)) | 0
    };
  }

  /**
   * Wählt eine konkrete Baum-Position innerhalb des Arbeitsbereichs
   * und speichert sie in lj.treePos = { tx, ty } in Tile-Koordinaten.
   */
  function recomputeTreePos(lj){
    if (!lj) return;

    const center = getTreeTargetTileForLumberjack(lj);
    const wa     = lj.workArea || {};

    const cx = center.x;
    const cy = center.y;
    const r  = (typeof wa.radiusTiles === 'number') ? wa.radiusTiles : 2.5;

    const seed = `${lj.uid}|${lj.cycle || 0}`;
    const rnd  = makeRng(seed);

    const r2 = r * r;
    let tx = Math.round(cx);
    let ty = Math.round(cy);

    for (let i=0; i<20; i++){
      const angle = rnd() * Math.PI * 2;
      const dist  = r * Math.sqrt(rnd());
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

  // ========================================================================
  // REGISTRIERUNG LUMBERJACK
  // ========================================================================

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

      workArea : {
        cx         : centerX,
        cy         : centerY,
        radiusTiles: 2.5
      },

      treePos: null
    };

    // Versuch, bestehende WorkArea zu übernehmen
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

  function drawTreeFrame(ctx, key, cx, cy, sizeWorld){
    if (!ensureTreeAtlasReady()) return false;

    const frames = TREE_ATLAS_CFG.resolvedFrames;
    const f = frames && frames[key];
    if (!f || !treeAtlasImg) return false;

    const w = sizeWorld;
    const h = sizeWorld;

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

  function drawSimpleTreeCircle(ctx, wx, wy, ts){
    ctx.beginPath();
    ctx.fillStyle   = 'rgba(40, 180, 80, 0.85)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth   = Math.max(1.5, ts * 0.05);
    ctx.arc(wx, wy, ts * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // Zeichnen auf dem Haupt-Canvas (Weltkoordinaten, Kamera-Transform kommt
  // bereits vom Renderer).
  // --------------------------------------------------------------------------
  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;
    if (!Lumberjacks.size) return;

    void cam; // aktuell nicht benötigt, Transform ist bereits auf ctx

    const ts =
      tileSize ||
      (window.Game?.map?.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      64;

    const atlasReady = ensureTreeAtlasReady();

    ctx.save();

    for (const lj of Lumberjacks.values()){
      if (!lj) continue;

      const area = lj.workArea || {};

      const targetTile =
        (lj.treePos && Number.isFinite(lj.treePos.tx) && Number.isFinite(lj.treePos.ty))
          ? { x: lj.treePos.tx, y: lj.treePos.ty }
          : getTreeTargetTileForLumberjack(lj);

      const cxTiles = targetTile.x;
      const cyTiles = targetTile.y;

      // Weltkoordinaten (Map-Space, Kamera-Transform ist bereits aktiv)
      const wx = (cxTiles + 0.5) * ts;
      const wy = (cyTiles + 1.0) * ts;

      let treeDrawn = false;

      if (atlasReady){
        let key = null;
        if (lj.phase === LJ_PHASE.PLANT) key = TREE_ATLAS_CFG.frameMap.PLANT;
        else if (lj.phase === LJ_PHASE.GROW)  key = TREE_ATLAS_CFG.frameMap.GROW;
        else if (lj.phase === LJ_PHASE.READY) key = TREE_ATLAS_CFG.frameMap.READY;
        else if (lj.phase === LJ_PHASE.CUT)   key = TREE_ATLAS_CFG.frameMap.CUT;

        if (key){
          const sizeWorld = ts * 2.0;
          const ok = drawTreeFrame(ctx, key, wx, wy, sizeWorld);
          if (ok){
            treeDrawn = true;

            if (lj.phase === LJ_PHASE.GROW){
              ctx.beginPath();
              ctx.lineWidth   = Math.max(1.5, ts * 0.04);
              ctx.strokeStyle = 'rgba(255,255,255,0.9)';
              const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
              const r    = sizeWorld * 0.35;
              ctx.arc(
                wx,
                wy - sizeWorld * 0.9,
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
        drawSimpleTreeCircle(ctx, wx, wy, ts);
      }

      // Optionaler, leichter WorkArea-Schatten
      if (area && typeof area.radiusTiles === 'number'){
        const rWorld = area.radiusTiles * ts;
        ctx.beginPath();
        ctx.arc(wx, wy, rWorld, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30,120,255,0.25)';
        ctx.lineWidth   = Math.max(1.0, ts * 0.04);
        ctx.stroke();
      }
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
        tick
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
    _tickOne              : tickLumberjack,
    _ensureTreeAtlasReady : ensureTreeAtlasReady,
    _drawTreeFrame        : drawTreeFrame,
    _recomputeTreePos     : recomputeTreePos,
    _getTreeTargetTile    : getTreeTargetTileForLumberjack
  };

  LOG('Holz-Modul geladen v25.12.09-wood-workarea-maincanvas-v1');

})();
