/* ============================================================================
 * Datei   : core/game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.01-wood-lumberjack
 *
 * Zweck   :
 *   Spezielle Produktionslogik für Holz / Förster / Holzfäller:
 *     - Reagiert auf cb:build:complete für b.lumberjack
 *     - Legt pro Holzfäller ein eigenes State-Objekt an
 *     - Simpler Zyklus:
 *         PLANT -> GROW -> READY -> CUT -> (Holz erzeugen) -> wieder PLANT
 *     - Erzeugt Holz über Production.addResource('wood', ...)
 *     - Zeichnet Bäume vor dem Gebäude:
 *         * wenn Atlas geladen → Baum-Sprites aus trees_mega_atlas
 *         * sonst Fallback: einfache Kreise
 *
 *   Anbindung:
 *     - Registriert sich bei Production.registerModule({ id:'wood', ... })
 *
 * Struktur:
 *   IMPORTS → KONSTANTEN → STATE → HILFSFUNKTIONEN → TICK → OVERLAY → EXPORT
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
    PLANT : 2000,  // 2 s Setzling pflanzen
    GROW  : 8000,  // 8 s wachsen
    CUT   : 2000,  // 2 s fällen
    REST  : 1000   // (noch nicht genutzt, Reserve)
  };

  // Baum-Atlas-Konfiguration (wie besprochen)
  const TREE_ATLAS_CFG = {
    urlJson:  'assets/tex/deco/trees_mega_atlas.json',
    urlImage: 'assets/tex/deco/trees_mega_atlas.png',
    frameMap: {
      PLANT: 'reserved_32',  // Setzling / kleiner Busch
      GROW : 'reserved_24',  // mittlerer Baum
      READY: 'reserved_0',   // großer Baum
      CUT  : 'reserved_40'   // Stumpf / gefällt
    }
  };

  // =========================
  // STATE
  // =========================

  /**
   * Map mit allen Förster-Gebäuden.
   * key = `${kind}@${x},${y}`
   */
  const Lumberjacks = new Map();

  /** Atlas-Daten */
  let treeAtlas        = null;
  let treeAtlasImg     = null;
  let treeAtlasLoaded  = false;
  let treeAtlasLoading = false;

  // =========================
  // HILFSFUNKTIONEN (LOGIK)
  // =========================

  /**
   * Shortcut auf zentrale Ressourcenschreib-API aus game.production.js.
   */
  function addResource(resId, delta, reason, src){
    if (!window.Production || typeof window.Production.addResource !== 'function'){
      WARN('Production.addResource noch nicht verfügbar – call ignoriert', resId, delta);
      return;
    }
    window.Production.addResource(resId, delta, reason, src);
  }

  /**
   * Förster-Instanz registrieren – wird von onBuildComplete() aufgerufen.
   *
   * @param {object} detail – { id, x,y,w,h, ... } aus cb:build:complete
   */
  function registerLumberjackFromBuild(detail){
    if (!detail) return;
    const kind = detail.id || detail.buildingId || detail.kind;
    if (kind !== LUMBERJACK_ID) return;

    const x = detail.x|0;
    const y = detail.y|0;
    const w = (detail.w|0) || 3;
    const h = (detail.h|0) || 3;

    const uid = `${kind}@${x},${y}`;
    if (Lumberjacks.has(uid)) {
      // Doppelte Events ignorieren
      return;
    }

    const state = {
      uid,
      kind,
      x, y, w, h,
      phase    : LJ_PHASE.PLANT,
      timer    : 0,
      cycle    : 0,
      treeProg : 0,
      // für später: Arbeitsbereich / Radius usw.
      workArea : null
    };

    Lumberjacks.set(uid, state);

    try {
      dispatchEvent(new CustomEvent('cb:prod:start', {
        detail:{ bId:uid, kind }
      }));
    } catch(e){
      WARN('cb:prod:start (wood) dispatch fehlgeschlagen', e);
    }

    LOG('Lumberjack registriert', state);
  }

  /**
   * EINEN Förster einen Schritt weiter ticken.
   * @param {object} lj – Lumberjack-State
   * @param {number} dtMs – Tick-Zeit
   */
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
          lj.timer = 0;
          lj.phase = LJ_PHASE.READY;
        }
        break;
      }
      case LJ_PHASE.READY: {
        // vorerst: sofort in CUT übergehen
        lj.phase = LJ_PHASE.CUT;
        lj.timer = 0;
        break;
      }
      case LJ_PHASE.CUT: {
        if (lj.timer >= LJ_TIMES.CUT){
          lj.timer = 0;
          lj.cycle++;

          const qty = 1; // 1 Holz pro Zyklus – später balancieren
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
            WARN('cb:prod:output (wood) dispatch fehlgeschlagen', e);
          }

          // neuer Zyklus
          lj.phase    = LJ_PHASE.PLANT;
          lj.treeProg = 0;
        }
        break;
      }
      case LJ_PHASE.IDLE:
      default:
        break;
    }
  }

  /**
   * Alle Förster ticken (wird von Modul.tick aufgerufen).
   */
  function tickAllLumberjacks(dtMs){
    if (!Lumberjacks.size) return;
    for (const lj of Lumberjacks.values()){
      try { tickLumberjack(lj, dtMs); }
      catch(e){ ERR('Lumberjack-Tick Fehler:', e); }
    }
  }

  // =========================
  // HILFSFUNKTIONEN (ATLAS + RENDER)
  // =========================

  function ensureTreeAtlasReady(){
    if (treeAtlas && treeAtlasLoaded) return true;
    if (treeAtlasLoading) return false;
    treeAtlasLoading = true;

    // JSON
    try {
      fetch(TREE_ATLAS_CFG.urlJson)
        .then(r => r.json())
        .then(data => {
          treeAtlas = data;
        })
        .catch(err => {
          WARN('Tree-Atlas JSON konnte nicht geladen werden:', err);
        });
    } catch(e){
      WARN('Tree-Atlas JSON fetch nicht verfügbar:', e);
    }

    // Bild
    try {
      const img = new Image();
      img.onload = function(){
        treeAtlasImg    = img;
        treeAtlasLoaded = true;
      };
      img.onerror = function(err){
        WARN('Tree-Atlas Bild konnte nicht geladen werden:', err);
      };
      img.src = TREE_ATLAS_CFG.urlImage;
    } catch(e){
      WARN('Tree-Atlas Bild-Ladevorgang fehlgeschlagen:', e);
    }

    return false;
  }

  function drawTreeFrame(ctx, frameKey, x, y, size){
    if (!treeAtlas || !treeAtlasImg || !treeAtlas.frames) return false;

    const frameDef = treeAtlas.frames[frameKey];
    if (!frameDef) return false;

    let col, row, tileW, tileH;

    // Unser eigenes Format: [col,row]
    if (Array.isArray(frameDef)) {
      col   = frameDef[0];
      row   = frameDef[1];
      tileW = treeAtlas.tileW || 256;
      tileH = treeAtlas.tileH || 256;
    } else if (frameDef.frame) {
      // Phaser-Atlas-Format (x,y,w,h)
      tileW = frameDef.frame.w;
      tileH = frameDef.frame.h;
      col   = (frameDef.frame.x / tileW)|0;
      row   = (frameDef.frame.y / tileH)|0;
    } else {
      return false;
    }

    const sx = col * tileW;
    const sy = row * tileH;
    const sw = tileW;
    const sh = tileH;

    ctx.drawImage(
      treeAtlasImg,
      sx, sy, sw, sh,
      x - size / 2,
      y - size * 0.9,
      size,
      size
    );
    return true;
  }

  function drawLumberjackOverlay(ctx, cam){
    if (!ctx) return;
    if (!Lumberjacks.size) return;

    const zoom = cam?.zoom ?? 1;
    const ox   = cam?.x    ?? 0;
    const oy   = cam?.y    ?? 0;

    const ts =
      (window.Game?.map?.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      64;

    ctx.save();
    ctx.translate(-ox * ts * zoom, -oy * ts * zoom);
    ctx.scale(zoom, zoom);

    const atlasReady = ensureTreeAtlasReady();

    for (const lj of Lumberjacks.values()){
      const bx = lj.x;
      const by = lj.y;
      const bw = lj.w || 3;
      const bh = lj.h || 3;

      const cx = (bx + bw / 2) * ts;
      const cy = (by + bh) * ts;

      // 1) Atlas-Sprite, wenn verfügbar
      if (atlasReady) {
        let key = null;
        if (lj.phase === LJ_PHASE.PLANT) key = TREE_ATLAS_CFG.frameMap.PLANT;
        else if (lj.phase === LJ_PHASE.GROW) key = TREE_ATLAS_CFG.frameMap.GROW;
        else if (lj.phase === LJ_PHASE.READY) key = TREE_ATLAS_CFG.frameMap.READY;
        else if (lj.phase === LJ_PHASE.CUT) key = TREE_ATLAS_CFG.frameMap.CUT;

        if (key) {
          const size = ts * 2.0;
          const ok = drawTreeFrame(ctx, key, cx, cy, size);
          if (ok) {
            // Wachstumsring (nur in GROW)
            if (lj.phase === LJ_PHASE.GROW){
              ctx.beginPath();
              ctx.lineWidth   = Math.max(1.5, ts * 0.04);
              ctx.strokeStyle = 'rgba(255,255,255,0.9)';
              const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
              const r    = size * 0.35;
              ctx.arc(cx, cy - size * 0.9, r, -Math.PI/2, -Math.PI/2 + prog * Math.PI*2);
              ctx.stroke();
            }
            continue; // kein Fallback nötig
          }
        }
      }

      // 2) Fallback – einfache Kreise
      let fill = '#228B22';
      if (lj.phase === LJ_PHASE.PLANT) fill = '#8BC34A';
      if (lj.phase === LJ_PHASE.GROW)  fill = '#4CAF50';
      if (lj.phase === LJ_PHASE.READY) fill = '#2E7D32';
      if (lj.phase === LJ_PHASE.CUT)   fill = '#A0522D';

      const r = ts * 0.45;

      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.arc(cx, cy - r * 0.2, r, 0, Math.PI * 2);
      ctx.fill();

      if (lj.phase === LJ_PHASE.GROW){
        ctx.beginPath();
        ctx.lineWidth   = Math.max(1.5, ts * 0.04);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
        ctx.arc(cx, cy - r * 0.2, r * 0.8, -Math.PI/2, -Math.PI/2 + prog * Math.PI*2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // =========================
  // OVERLAY-REGISTRIERUNG
  // =========================

  (function registerTreeOverlay(){
    function tryRegister(){
      if (!window.OverlayHooks?.register) return false;
      try {
        window.OverlayHooks.register('trees', (ctx)=>{
          const cam = window.GameCamera?.getState?.() || { x:0, y:0, zoom:1 };
          drawLumberjackOverlay(ctx, cam);
        });
        LOG('Tree-Overlay registriert (trees).');
        return true;
      } catch(e){
        WARN('Tree-Overlay Registrierung fehlgeschlagen:', e);
        return true;
      }
    }

    if (tryRegister()) return;
    let tries = 0;
    const t = setInterval(()=>{
      if (tryRegister() || ++tries > 20) clearInterval(t);
    }, 200);
  })();

  // =========================
  // MODUL-SCHNITTSTELLE FÜR Production-Manager
  // =========================

  /**
   * Hook für cb:build:complete (vom Manager aufgerufen).
   * @param {object} detail – { id, x,y,w,h, ... }
   */
  function onBuildComplete(detail){
    registerLumberjackFromBuild(detail);
  }

  /**
   * Tick-Handler (vom Manager aufgerufen).
   * @param {number} dtMs
   */
  function tick(dtMs){
    tickAllLumberjacks(dtMs || 0);
  }

  // =========================
  // REGISTRIERUNG BEIM MANAGER
  // =========================

  function registerAtManager(){
    if (!window.Production || typeof window.Production.registerModule !== 'function'){
      // Manager noch nicht da → später erneut versuchen
      return false;
    }
    window.Production.registerModule({
      id: 'wood',
      tick,
      onBuildComplete
    });
    LOG('Holz-Modul registriert bei Production.');
    return true;
  }

  if (!registerAtManager()){
    let tries = 0;
    const t = setInterval(()=>{
      if (registerAtManager() || ++tries > 20) clearInterval(t);
    }, 200);
  }

  // Debug-Hilfe
  window.ProductionWood = {
    Lumberjacks,
    LJ_PHASE,
    LJ_TIMES,
    TREE_ATLAS_CFG
  };

})();
