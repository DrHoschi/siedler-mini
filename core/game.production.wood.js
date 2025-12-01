/* ============================================================================
 * Datei   : core/game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.01-wood-lumberjack-workarea+treesatlas
 *
 * Zweck   :
 *   Spezielle Produktionslogik für Holz / Förster / Holzfäller:
 *     - Reagiert auf cb:build:complete für b.lumberjack
 *     - Legt pro Holzfäller ein eigenes State-Objekt an
 *     - Zyklus:
 *         PLANT -> GROW -> READY -> CUT -> (Holz erzeugen) -> wieder PLANT
 *     - Erzeugt Holz über Production.addResource('wood', ...)
 *     - Zeichnet Bäume + Arbeitsbereich (Kreis) als Overlay
 *     - Nutzt optional den neuen trees_mega_atlas (padded) als Grafikquelle
 *
 * Ereignisse:
 *   IN  :
 *     - cb:build:complete { id, uid?, x,y,w,h, ... }
 *
 *   OUT :
 *     - cb:prod:start  { bId, kind }
 *     - cb:prod:output { bId, kind, item:'wood', qty }
 *
 *   API / Debug:
 *     - window.ProductionWood.setWorkArea(uid, {cx,cy,radiusTiles})
 *       → Arbeitskreis verschieben / Radius ändern
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
   * --------------------------------------------------------------------------
   * - Nutzt dein neues assets.draw-JSON:
   *     trees_mega_atlas.json
   *   mit:
   *     { image, tileW, tileH, frames:{ name:[cx,cy], ... } }
   * - Wir verwenden die gepaddete Version des PNG:
   *     trees_mega_atlas_padded.png
   *   → weniger Texture-Bleeding beim Zoomen.
   *
   * - frameMap mappt unsere Produktions-Phasen auf konkrete Frame-Namen.
   *   Diese Namen stammen direkt aus der JSON-Datei.
   * ======================================================================== */

  const TREE_ATLAS_CFG = {
    // Pfade ggf. anpassen, falls du sie woanders abgelegt hast:
    urlJson  : 'assets/tex/deco/trees_mega_atlas.json',
    urlImage : 'assets/tex/deco/trees_mega_atlas_padded.png',

    // Phasen → Frame-Namen aus trees_mega_atlas.json
    frameMap : {
      // Pflanz-/Wachstums-Zyklus
      PLANT : 'e1_regrow_sprout',        // kleiner Spross
      GROW  : 'e1_regrow_tree_medium',   // mittlerer Baum in Wachstum
      READY : 'e1_oak_big',              // fertige Eiche als „Ernte-Baum“
      CUT   : 'cut_fall_left'            // Fäll-Frame (Baum kippt)
    },

    // Wird zur Laufzeit von ensureTreeAtlasReady() gefüllt:
    // { name: {x,y,w,h}, ... } in Pixel-Koordinaten.
    resolvedFrames : null
  };

  // =========================
  // STATE
  // =========================

  /** Map<uid, LumberjackState> */
  const Lumberjacks = new Map();

  /** Atlas-Daten (optional) */
  let treeAtlas        = null;  // Inhalt von trees_mega_atlas.json
  let treeAtlasImg     = null;  // Image-Objekt für *_padded.png
  let treeAtlasLoaded  = false; // TRUE, wenn das Bild geladen wurde
  let treeAtlasLoading = false; // Ladevorgang bereits gestartet?

  // =========================
  // HILFSFUNKTIONEN LOGIK
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
   * @param {object} detail – { id, x,y,w,h, uid?, ... } aus cb:build:complete
   */
  function registerLumberjackFromBuild(detail){
    if (!detail) return;

    const kind = detail.id || detail.buildingId || detail.kind;
    if (kind !== LUMBERJACK_ID) return;

    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    const uid = detail.uid || `${kind}@${x},${y}`;
    if (Lumberjacks.has(uid)){
      // Doppeltes Event (z.B. Reload) ignorieren
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

      // 🔵 Standard-Arbeitsbereich: ~5×5 Tiles als Kreis
      workArea : {
        cx         : centerX, // Mittelpunkt in Tile-Koordinaten
        cy         : centerY,
        radiusTiles: 2.5      // ~ Durchmesser 5 Tiles
      }
    };

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

  /**
   * Einzelnen Förster einen Schritt weiter ticken.
   * @param {object} lj   – Lumberjack-State
   * @param {number} dtMs – Tick-Zeit in ms
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
          lj.timer    = 0;
          lj.phase    = LJ_PHASE.READY;
          lj.treeProg = 1;
        }
        break;
      }

      case LJ_PHASE.READY: {
        // Noch kein expliziter „Warten“-Zustand:
        // Wir starten direkt mit dem Fällen.
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
            WARN('cb:prod:output dispatch fehlgeschlagen', e);
          }
        }
        break;
      }

      case LJ_PHASE.IDLE:
      default:
        // nichts
        break;
    }
  }

  /**
   * Alle Förster ticken (wird von Modul.tick aufgerufen).
   */
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
  // BAUM-ATLAS-LOADING (trees_mega_atlas.json + *_padded.png)
  // ==========================================================================

  /**
   * Startet einmalig den Ladevorgang für JSON + Bild.
   * Die eigentliche Nutzung prüft später mit ensureTreeAtlasReady().
   */
  function ensureTreeAtlasLoaded(){
    if (treeAtlasLoaded || treeAtlasLoading) return;
    treeAtlasLoading = true;

    // --- JSON laden ---------------------------------------------------------
    try {
      fetch(TREE_ATLAS_CFG.urlJson)
        .then(r => r.json())
        .then(data => {
          // Erwartet assets.draw-Format:
          // { image, tileW, tileH, frames:{ name:[cx,cy] } }
          treeAtlas = data;
          LOG('Tree-Atlas JSON geladen:', TREE_ATLAS_CFG.urlJson);
        })
        .catch(err => {
          WARN('Tree-Atlas JSON konnte nicht geladen werden:', err);
        });
    } catch(e){
      WARN('Tree-Atlas JSON fetch nicht verfügbar:', e);
    }

    // --- Bild laden ---------------------------------------------------------
    try {
      const img = new Image();
      img.onload = function(){
        treeAtlasImg    = img;
        treeAtlasLoaded = true; // Bild ist da; JSON muss zusätzlich vorhanden sein
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

  /**
   * Prüft, ob Bild + JSON vorhanden sind, und baut eine
   * Pixel-basierte Frame-Tabelle aus dem assets.draw-Format.
   *
   * Rückgabe:
   *   TRUE  → Atlas kann benutzt werden
   *   FALSE → Fallback-Zeichnung verwenden
   */
  function ensureTreeAtlasReady(){
    // Bild ODER JSON fehlen → noch nicht bereit
    if (!treeAtlasLoaded || !treeAtlasImg || !treeAtlas || !treeAtlas.frames){
      return false;
    }

    // resolvedFrames nur einmal beim ersten Zugriff erzeugen
    if (!TREE_ATLAS_CFG.resolvedFrames){
      const tileW = treeAtlas.tileW || 128;
      const tileH = treeAtlas.tileH || 128;
      const resolved = {};

      // frames: { name:[cx,cy], ... }
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
   * drawTreeFrame(ctx, key, cx, cy, sizePx)
   * -------------------------------------------------------------------------
   * Zeichnet einen Baum-Frame aus dem Atlas:
   *
   *   - key    : Name aus trees_mega_atlas.json, z.B. 'e1_oak_big'
   *   - cx, cy : Mittelpunkt-Position, an der der Baum „steht“
   *   - sizePx : Zielbreite/-höhe auf dem Canvas
   *
   * Rückgabe:
   *   TRUE  → erfolgreich gezeichnet
   *   FALSE → Fallback verwenden
   */
  function drawTreeFrame(ctx, key, cx, cy, sizePx){
    if (!ensureTreeAtlasReady()) return false;

    const frames = TREE_ATLAS_CFG.resolvedFrames;
    const f = frames && frames[key];
    if (!f || !treeAtlasImg) return false;

    const w = sizePx;
    const h = sizePx;

    // Wir behandeln cx/cy als Fußpunkt (Mittelpunkt unten am Stamm)
    const dx = cx - w / 2;
    const dy = cy - h; // oben hin strecken

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

  // Einfacher Fallback zum Zeichnen eines „Baums“, falls Atlas fehlt
  function drawSimpleTreeCircle(ctx, xPx, yPx, ts){
    ctx.beginPath();
    ctx.fillStyle   = 'rgba(40, 180, 80, 0.85)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth   = Math.max(1.5, ts * 0.05);
    ctx.arc(xPx, yPx, ts * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // =========================
  // OVERLAY-ZEICHNUNG (Bäume + Arbeitskreis)
  // =========================

  /**
   * Zeichnet pro Lumberjack:
   *   - einen Atlas-Baum (falls verfügbar) oder Fallback-Kreise
   *   - den Arbeitsbereich als gestrichelten Kreis
   */
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

    // Prüfen, ob der Atlas (Bild+JSON) bereits einsatzbereit ist
    const atlasReady = ensureTreeAtlasReady();

    for (const lj of Lumberjacks.values()){
      const bx = lj.x;
      const by = lj.y;
      const bw = lj.w || 3;
      const bh = lj.h || 3;

      // Mittelpunkt des Gebäudes (für Baum)
      const cxTree = (bx + bw / 2) * ts;
      const cyTree = (by + bh) * ts;

      // Mittelpunkt des Arbeitsbereichs (eigene Mitte erlaubt)
      const area        = lj.workArea || {};
      const cxTiles     = (typeof area.cx === 'number') ? area.cx : (bx + bw / 2);
      const cyTiles     = (typeof area.cy === 'number') ? area.cy : (by + bh / 2);
      const cxArea      = cxTiles * ts;
      const cyArea      = cyTiles * ts;
      const radiusTiles = (typeof area.radiusTiles === 'number') ? area.radiusTiles : 2.5;
      const rWorkPx     = radiusTiles * ts;

      // ---------------------------------------------------
      // 1) Baum – Atlas oder Fallback
      // ---------------------------------------------------
      let treeDrawn = false;

      if (atlasReady){
        // Phase → Frame-Namen laut TREE_ATLAS_CFG.frameMap
        let key = null;
        if (lj.phase === LJ_PHASE.PLANT) key = TREE_ATLAS_CFG.frameMap.PLANT;
        else if (lj.phase === LJ_PHASE.GROW)  key = TREE_ATLAS_CFG.frameMap.GROW;
        else if (lj.phase === LJ_PHASE.READY) key = TREE_ATLAS_CFG.frameMap.READY;
        else if (lj.phase === LJ_PHASE.CUT)   key = TREE_ATLAS_CFG.frameMap.CUT;

        if (key){
          const size = ts * 2.0; // Baum etwas größer als Gebäude-Footprint
          const ok   = drawTreeFrame(ctx, key, cxTree, cyTree, size);
          if (ok){
            treeDrawn = true;

            // Wachstumsring (nur in GROW) oben auf den Baum legen
            if (lj.phase === LJ_PHASE.GROW){
              ctx.beginPath();
              ctx.lineWidth   = Math.max(1.5, ts * 0.04);
              ctx.strokeStyle = 'rgba(255,255,255,0.9)';
              const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
              const r    = size * 0.35;
              ctx.arc(
                cxTree,
                cyTree - size * 0.9,
                r,
                -Math.PI/2,
                -Math.PI/2 + prog * Math.PI*2
              );
              ctx.stroke();
            }
          }
        }
      }

      if (!treeDrawn){
        // 2) Fallback – einfache farbige Kreise
        let fill = '#228B22';
        if (lj.phase === LJ_PHASE.PLANT) fill = '#8BC34A';
        if (lj.phase === LJ_PHASE.GROW)  fill = '#4CAF50';
        if (lj.phase === LJ_PHASE.READY) fill = '#2E7D32';
        if (lj.phase === LJ_PHASE.CUT)   fill = '#A0522D';

        const r = ts * 0.45;

        ctx.beginPath();
        ctx.fillStyle = fill;
        ctx.arc(cxTree, cyTree - r * 0.2, r, 0, Math.PI * 2);
        ctx.fill();

        if (lj.phase === LJ_PHASE.GROW){
          ctx.beginPath();
          ctx.lineWidth   = Math.max(1.5, ts * 0.04);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          const prog = Math.max(0, Math.min(1, lj.treeProg || 0));
          ctx.arc(
            cxTree,
            cyTree - r * 0.2,
            r * 0.8,
            -Math.PI/2,
            -Math.PI/2 + prog * Math.PI*2
          );
          ctx.stroke();
        }
      }

      // ---------------------------------------------------
      // 3) 🔵 Arbeitsbereich-Kreis – IMMER zeichnen
      // ---------------------------------------------------
      ctx.beginPath();
      ctx.lineWidth   = Math.max(1.5, ts * 0.06);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
      ctx.setLineDash([ts * 0.25, ts * 0.25]);
      ctx.arc(cxArea, cyArea, rWorkPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
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
    ensureTreeAtlasLoaded(); // Atlas-Ladevorgang anstoßen
  }

  /**
   * Tick-Funktion (vom Manager mit TICK_MS aufgerufen).
   */
  function tick(dtMs){
    tickAllLumberjacks(dtMs);
  }

  // =========================
  // DIREKTER LISTENER (Fallback) auf cb:build:complete
  // =========================
  // Falls der Produktions-Manager aus irgendeinem Grund nicht (rechtzeitig)
  // registriert ist, hängen wir uns hier zusätzlich direkt an das Event.
  // Doppelte Events sind kein Problem, weil registerLumberjackFromBuild()
  // bei gleicher uid einfach nichts mehr macht.

  try {
    window.addEventListener('cb:build:complete', (ev)=>{
      const detail = ev.detail || {};
      try {
        // Kleines Debug-Log, damit du es im Inspector siehst:
        (window.CBLog?.info || console.info)(
          '[prod-wood]',
          'direct cb:build:complete',
          detail.id,
          detail
        );

        registerLumberjackFromBuild(detail);
        ensureTreeAtlasLoaded();
      } catch (e){
        (window.CBLog?.warn || console.warn)(
          '[prod-wood]',
          'Direkter cb:build:complete-Listener Fehler:',
          e
        );
      }
    }, { passive:true });
  } catch(e){
    (window.CBLog?.warn || console.warn)(
      '[prod-wood]',
      'Direkter cb:build:complete-Listener konnte nicht registriert werden:',
      e
    );
  }

  // =========================
  // Arbeitsbereich-API (für UI-Menü)
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

    LOG('Arbeitsbereich aktualisiert', uid, lj.workArea);
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
        tick
      });
      LOG('Produktionsmodul "wood" registriert.');
      return true;
    } catch(e){
      WARN('Production.registerModule(wood) fehlgeschlagen', e);
      return true; // nicht noch mal probieren
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
    _tickOne: tickLumberjack,
    _ensureTreeAtlasReady : ensureTreeAtlasReady,
    _drawTreeFrame        : drawTreeFrame
  };

  LOG('Holz-Modul geladen v25.12.01-wood-lumberjack-workarea+treesatlas');

})();
