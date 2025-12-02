/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.02-workarea-core-v1
 *
 * Zweck   :
 *   Zentrale Verwaltung von Arbeitsbereichen ("workArea") für Gebäude:
 *     - Default-Konfig aus buildings.json / Registry
 *     - Runtime-Instanzen pro gebautem Gebäude (uid)
 *     - Interaktive Auswahl per Maus (Button im Gebäude-Menü)
 *     - Zeichnen der Kreise als Overlay (OverlayHooks → Layer "workareas")
 *     - Synchronisation zu Produktionsmodulen (z.B. Holzfäller)
 *
 * Begriffe:
 *   - "workArea" = Bereich, in dem ein Produktionsgebäude arbeitet
 *   - Eintrag in Registry:
 *       workArea: {
 *         shape       : "circle",
 *         radiusTiles : 4,
 *         selectable  : true
 *       }
 *   - Runtime-State:
 *       {
 *         uid, id, x, y, w, h,
 *         cx, cy,               // Mittelpunkt in Tile-Koordinaten
 *         radiusTiles,
 *         selectable
 *       }
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[workarea]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // Alle bekannten Arbeitsbereiche (pro Gebäude-Instanz)
  /** @type {Map<string, WorkAreaState>} */
  const WorkAreas = new Map();

  // Aktive Auswahl (wenn der Spieler gerade den Bereich mit der Maus setzt)
  let activeUid      = null;
  let isSelecting    = false;

  /**
   * Kleiner Helper: Registry-Building holen
   */
  function getRegistryBuilding(id){
    const reg = window.Registry || {};
    if (typeof reg.getBuilding === 'function'){
      return reg.getBuilding(id);
    }
    if (reg.buildings && reg.buildings[id]){
      return reg.buildings[id];
    }
    return null;
  }

  /**
   * Default-WorkArea aus Registry + Bau-Info erzeugen (oder vorhandene liefern)
   *
   * @param {object} info – { id, uid, x,y,w,h }
   * @param {object} [def] – optional direkt übergebene Registry-Def
   * @returns {WorkAreaState|null}
   */
  function ensureWorkAreaFromRegistry(info, def){
    if (!info || !info.id) return null;

    const id  = info.id;
    const uid = info.uid || `${id}@${info.x},${info.y}`;

    // Schon vorhanden?
    if (WorkAreas.has(uid)){
      return WorkAreas.get(uid);
    }

    const buildingDef = def || getRegistryBuilding(id);
    if (!buildingDef || !buildingDef.workArea){
      // Dieses Gebäude hat laut Registry keinen Arbeitsbereich → ignorieren
      return null;
    }

    const waCfg = buildingDef.workArea;
    if (waCfg.disabled){
      return null;
    }

    const w = (info.w | 0) || (buildingDef.size?.w | 0) || 3;
    const h = (info.h | 0) || (buildingDef.size?.h | 0) || 3;

    const radiusTiles = Number(waCfg.radiusTiles ?? waCfg.radius ?? 4) || 4;
    const selectable  = waCfg.selectable !== false;
    const shape       = waCfg.shape || 'circle';

    // Mittelpunkt-Start: Mitte des Gebäudes + optionaler Offset aus Registry
    const cx0 = info.x + w / 2 + (waCfg.offset?.dx || 0);
    const cy0 = info.y + h / 2 + (waCfg.offset?.dy || 0);

    const state = {
      uid,
      id,
      x : info.x,
      y : info.y,
      w,
      h,
      shape,
      cx : cx0,
      cy : cy0,
      radiusTiles,
      selectable
    };

    WorkAreas.set(uid, state);
    syncToProduction(state);

    LOG('WorkArea aus Registry angelegt', state);
    return state;
  }

  /**
   * Clamp-Logik:
   *  - Der Arbeitsbereich soll NICHT beliebig weit vom Gebäude entfernt sein.
   *  - Faustregel: Mittelpunkt max. (radiusTiles - 0.5) Tiles von Gebäudemitte.
   *    → Der äußere Rand liegt dann ungefähr am Rand des 3×3-Footprints an.
   */
  function clampCenter(state, tx, ty){
    if (!state) return { cx: tx, cy: ty };

    const cx0 = state.x + state.w / 2;
    const cy0 = state.y + state.h / 2;

    const dx   = tx - cx0;
    const dy   = ty - cy0;
    const dist = Math.hypot(dx, dy) || 0.0001;

    const maxOffset = Math.max(0, (state.radiusTiles || 4) - 0.5);

    if (dist <= maxOffset){
      return { cx: tx, cy: ty };
    }

    const s = maxOffset / dist;
    return {
      cx: cx0 + dx * s,
      cy: cy0 + dy * s
    };
  }

  /**
   * Screen-Koordinaten → Tile-Koordinaten
   * (benutzt GameCamera.screenToWorld, falls vorhanden, sonst einfache Formel)
   */
  function screenToTile(ev, canvas){
    const Game = window.Game || {};
    const ts   =
      (Game.map && Game.map.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      Game.tileSize || 64;

    const rect = canvas.getBoundingClientRect();
    const sx   = ev.clientX - rect.left;
    const sy   = ev.clientY - rect.top;

    let wx, wy;

    const GC = window.GameCamera;
    if (GC && typeof GC.screenToWorld === 'function'){
      const p = GC.screenToWorld(sx, sy);
      wx = p.x;
      wy = p.y;
    } else {
      const cam  = Game.camera || {};
      const zoom = cam.zoom || 1;
      const cx   = cam.x   || 0;
      const cy   = cam.y   || 0;

      wx = sx / (ts * zoom) + cx;
      wy = sy / (ts * zoom) + cy;
    }

    return { tx: wx, ty: wy };
  }

  /**
   * Änderungen an WorkArea an Produktions-Module weitergeben.
   * - aktuell: Holzfäller (b.lumberjack) → ProductionWood.setWorkArea(...)
   */
  function syncToProduction(state){
    if (!state) return;

    // Holzfäller-Hütte
    if (state.id === 'b.lumberjack' &&
        window.ProductionWood &&
        typeof window.ProductionWood.setWorkArea === 'function'){
      window.ProductionWood.setWorkArea(state.uid, {
        cx         : state.cx,
        cy         : state.cy,
        radiusTiles: state.radiusTiles
      });
    }

    // Später: weitere Module (b.quarry, b.fisher, ...)
  }

  // ==========================================================================
  // Interaktive Auswahl per Maus
  // ==========================================================================

  /**
   * Startet die Auswahl des Arbeitsbereichs für ein Gebäude.
   * Wird z.B. aus ui-building-menu.js aufgerufen.
   *
   * @param {object} info – { id, uid, x,y,w,h }
   */
  function startSelectionForBuilding(info){
    const state = ensureWorkAreaFromRegistry(info);
    if (!state){
      WARN('startSelectionForBuilding: keine WorkArea-Config für', info.id);
      return;
    }

    if (!state.selectable){
      WARN('startSelectionForBuilding: Building nicht selektierbar', info.id);
      return;
    }

    activeUid   = state.uid;
    isSelecting = true;

    LOG('Arbeitsbereich-Auswahl gestartet für', activeUid);
  }

  /**
   * Manuelles Setzen (ohne Maus), falls später gebraucht.
   */
  function setForUid(uid, cfg){
    const state = WorkAreas.get(uid);
    if (!state){
      WARN('setForUid: unbekannte uid', uid);
      return;
    }

    const cx = (typeof cfg.cx === 'number') ? cfg.cx : state.cx;
    const cy = (typeof cfg.cy === 'number') ? cfg.cy : state.cy;
    const r  = (typeof cfg.radiusTiles === 'number')
      ? cfg.radiusTiles
      : state.radiusTiles;

    const clamped = clampCenter({ ...state, radiusTiles: r }, cx, cy);

    state.cx         = clamped.cx;
    state.cy         = clamped.cy;
    state.radiusTiles= r;

    syncToProduction(state);
    LOG('Arbeitsbereich gesetzt (API)', uid, state);
  }

  function getStateForUid(uid){
    return WorkAreas.get(uid) || null;
  }

  // Maus-Handler (auf Canvas)
  function setupPointerHandlers(){
    const canvas =
      document.getElementById('game-canvas') ||
      document.getElementById('game');

    if (!canvas){
      WARN('Kein Canvas (#game / #game-canvas) für WorkArea-Maussteuerung gefunden.');
      return;
    }

    // Vorschau laufend mitbewegen
    canvas.addEventListener('pointermove', (ev)=>{
      if (!isSelecting || !activeUid) return;
      const state = WorkAreas.get(activeUid);
      if (!state) return;

      const tile = screenToTile(ev, canvas);
      const cl   = clampCenter(state, tile.tx, tile.ty);

      state.cx = cl.cx;
      state.cy = cl.cy;

      syncToProduction(state);
    });

    // Klick → Auswahl abschließen
    canvas.addEventListener('click', (ev)=>{
      if (!isSelecting || !activeUid) return;
      const state = WorkAreas.get(activeUid);
      if (!state) return;

      const tile = screenToTile(ev, canvas);
      const cl   = clampCenter(state, tile.tx, tile.ty);

      state.cx = cl.cx;
      state.cy = cl.cy;

      syncToProduction(state);

      isSelecting = false;
      activeUid   = null;
      LOG('Arbeitsbereich-Auswahl abgeschlossen.', state);
    });

    LOG('WorkArea-Maussteuerung aktiv.');
  }

  // ==========================================================================
  // Overlay-Zeichnung
  // ==========================================================================

  function drawWorkAreaOverlay(ctx){
    if (!ctx) return;
    if (!WorkAreas.size) return;

    const Game = window.Game || {};
    const ts   =
      (Game.map && Game.map.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      Game.tileSize || 64;

    const camState =
      window.GameCamera?.getState?.() ||
      { x: (Game.camera?.x || 0), y: (Game.camera?.y || 0), zoom: (Game.camera?.zoom || 1) };

    const oxPx = camState.x || 0;  // Kamera in PIXEL (Welt-Koords)
    const oyPx = camState.y || 0;
    const zoom = camState.zoom || 1;

    ctx.save();
    // Kamera-Transform ins Welt-Koordinatensystem
    ctx.translate(-oxPx * zoom, -oyPx * zoom);
    ctx.scale(zoom, zoom);

    for (const state of WorkAreas.values()){
      const cxPx = state.cx * ts;
      const cyPx = state.cy * ts;
      const rPx  = (state.radiusTiles || 4) * ts;

      const isActive = (state.uid === activeUid && isSelecting);

      ctx.beginPath();
      ctx.arc(cxPx, cyPx, rPx, 0, Math.PI * 2);

      // Füllung
      ctx.fillStyle = isActive
        ? 'rgba(80, 200, 255, 0.12)'
        : 'rgba(60, 120, 220, 0.10)';
      ctx.fill();

      // Outline
      ctx.setLineDash(isActive ? [ts * 0.2, ts * 0.2] : [ts * 0.25, ts * 0.25]);
      ctx.lineWidth   = Math.max(1.5, ts * 0.06);
      ctx.strokeStyle = isActive
        ? 'rgba(80, 220, 255, 0.95)'
        : 'rgba(0, 200, 255, 0.75)';
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Overlay bei OverlayHooks registrieren
  (function registerWorkAreaOverlay(){
    function tryRegister(){
      if (!window.OverlayHooks?.register) return false;
      try {
        window.OverlayHooks.register('workareas', (ctx)=>{
          drawWorkAreaOverlay(ctx);
        });
        LOG('WorkArea-Overlay registriert (Layer: "workareas").');
        return true;
      } catch(e){
        WARN('WorkArea-Overlay Registrierung fehlgeschlagen:', e);
        return true;
      }
    }

    if (tryRegister()) return;
    let tries = 0;
    const t   = setInterval(()=>{
      if (tryRegister() || ++tries > 20){
        clearInterval(t);
      }
    }, 200);
  })();

  // ==========================================================================
  // Hook: cb:build:complete → Default-WorkArea anlegen
  // ==========================================================================

  try {
    window.addEventListener('cb:build:complete', (ev)=>{
      const d = ev.detail || {};
      if (!d.id) return;

      const def  = getRegistryBuilding(d.id);
      const size = def?.size || {};

      const info = {
        id : d.id,
        uid: d.uid || `${d.id}@${d.x},${d.y}`,
        x  : d.x | 0,
        y  : d.y | 0,
        w  : (d.w | 0) || (size.w | 0) || 3,
        h  : (d.h | 0) || (size.h | 0) || 3
      };

      ensureWorkAreaFromRegistry(info, def);
    }, { passive:true });
  } catch(e){
    WARN('Listener für cb:build:complete konnte nicht registriert werden:', e);
  }

  // ==========================================================================
  // Initialisierung
  // ==========================================================================

  // Maus-Handler nach DOM-Ready aufsetzen
  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(setupPointerHandlers, 0);
  } else {
    window.addEventListener('DOMContentLoaded', setupPointerHandlers, { once:true });
  }

  // API-Export
  window.GameWorkArea = {
    WorkAreas,
    startSelectionForBuilding,
    setForUid,
    getStateForUid
  };

  LOG('WorkArea-Modul geladen v25.12.02-workarea-core-v1');

})();
