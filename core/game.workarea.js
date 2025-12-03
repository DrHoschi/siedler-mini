/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.03-workarea-v3 (Selection+Click+Event)
 *
 * Zweck   :
 *   - Zentrales Arbeitsbereichs-Modul für Produktionsgebäude
 *   - Zeichnet Kreise um Gebäude (Holzfäller, Steinbruch, Fischerhütte)
 *   - Arbeitet unabhängig vom Inspector – immer, sobald Gebäude fertig ist
 *
 *  Gebäude / IDs:
 *    - b.lumberjack (Holzfällerhütte)
 *    - b.quarry     (Steinbruch)
 *    - b.fisher     (Fischerhütte)
 *
 *  Triggers:
 *    - IN:
 *        cb:build:complete { id, uid?, x,y,w,h, ... }
 *        (optional) GameWorkArea.startSelectionForBuilding({id,uid,x,y,w,h})
 *
 *    - Overlay:
 *        OverlayHooks.register('workareas', (ctx,cam)=> drawAreas(ctx,cam))
 *
 *  API:
 *    - window.GameWorkArea = {
 *        areas: Map<uid, WorkArea>,
 *        startSelectionForBuilding(cfg),
 *        applySelectionTile(tx,ty),
 *        isSelecting()
 *      }
 *
 *  WorkArea-Objekt:
 *    {
 *      id          : 'b.lumberjack' | 'b.quarry' | 'b.fisher',
 *      uid         : string,
 *      x, y        : Gebäude-Start (Tiles),
 *      w, h        : Gebäude-Größe (Tiles),
 *      cx, cy      : Zentrum (Tiles),
 *      radiusTiles : number,
 *      selected    : boolean
 *    }
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[workarea]';
  const LOG  = (window.CBLog?.info  || console.info ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ---------------------------------------------------------------------------
  // KONFIGURATION
  // ---------------------------------------------------------------------------

  // Welche Gebäude bekommen einen Arbeitsbereich?
  const SUPPORTED_IDS = new Set([
    'b.lumberjack',
    'b.quarry',
    'b.fisher'
  ]);

  // Standard-Radien in Tiles, falls nichts aus Daten kommt
  function getDefaultRadius(id){
    switch (id){
      case 'b.lumberjack': return 4.0;
      case 'b.quarry'    : return 4.0;
      case 'b.fisher'    : return 4.5;
      default            : return 4.0;
    }
  }

  function toNumber(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /** Map: uid → WorkArea */
  const areas = new Map();
  let currentSelectionUid = null;
  let selectionActive     = false;

  // ---------------------------------------------------------------------------
  // Hilfen: TileSize + Kamera
  // ---------------------------------------------------------------------------

  function getTileSize(){
    try{
      const Game = window.Game || {};
      if (typeof Game.tileSize === 'number') return Game.tileSize;
      if (Game.map && typeof Game.map.tileSize === 'number') return Game.map.tileSize;
      if (window.GameMap && window.GameMap._state?.map?.tileSize){
        return Number(window.GameMap._state.map.tileSize) || 64;
      }
    } catch(e){
      WARN('getTileSize() Fehler:', e);
    }
    return 64;
  }

  function getCameraState(){
    try{
      if (window.GameCamera && typeof window.GameCamera.getState === 'function'){
        const cam = window.GameCamera.getState();
        return {
          x   : toNumber(cam.x,    0),
          y   : toNumber(cam.y,    0),
          zoom: toNumber(cam.zoom, 1)
        };
      }
    } catch(e){
      WARN('getCameraState() (GameCamera) Fehler:', e);
    }

    const cam = window.Game?.camera || {};
    return {
      x   : toNumber(cam.x,    0),
      y   : toNumber(cam.y,    0),
      zoom: toNumber(cam.zoom, 1)
    };
  }

  // ---------------------------------------------------------------------------
  // WorkArea anlegen / aktualisieren
  // ---------------------------------------------------------------------------

  /**
   * Legt einen Arbeitsbereich für ein Gebäude an oder aktualisiert ihn.
   * detail: { id, uid?, x,y,w,h, radiusTiles? }
   */
  function ensureAreaForBuilding(detail){
    if (!detail) return null;
    const id = detail.id;
    if (!id || !SUPPORTED_IDS.has(id)) return null;

    const x   = toNumber(detail.x, 0);
    const y   = toNumber(detail.y, 0);
    const w   = toNumber(detail.w, 3) || 3;
    const h   = toNumber(detail.h, 3) || 3;
    const uid = detail.uid || `${id}@${x},${y}`;

    // Mittelpunkt des Gebäudes in Tile-Koordinaten
    const cx = x + w / 2;
    const cy = y + h / 2;

    // Radius: aus Detail → sonst Standard pro Gebäude
    const radiusTiles = toNumber(detail.radiusTiles, getDefaultRadius(id));

    let area = areas.get(uid);
    if (!area){
      area = {
        id,
        uid,
        x, y, w, h,
        cx, cy,
        radiusTiles,
        selected: false
      };
      areas.set(uid, area);
      LOG('Arbeitsbereich angelegt', area);
    } else {
      area.id          = id;
      area.x           = x;
      area.y           = y;
      area.w           = w;
      area.h           = h;
      area.cx          = cx;
      area.cy          = cy;
      area.radiusTiles = radiusTiles;
      LOG('Arbeitsbereich aktualisiert', area);
    }

    return area;
  }

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen für Selektion / Klick
  // ---------------------------------------------------------------------------

  function clampCenterToMaxDistance(area){
    if (!area) return;

    const gx = area.x + area.w / 2; // Gebäudemitte X (Tiles)
    const gy = area.y + area.h / 2; // Gebäudemitte Y (Tiles)

    const dx = area.cx - gx;
    const dy = area.cy - gy;
    const dist = Math.sqrt(dx*dx + dy*dy) || 0;

    // Maximalabstand: Außenkreis soll das 3×3-Gebäude "berühren",
    // darf aber nicht weiter weg driften. Heuristik:
    const halfSize = Math.max(area.w, area.h) / 2; // bei 3×3 -> 1.5
    const maxDist  = area.radiusTiles + halfSize;

    if (dist > maxDist && dist > 0){
      const f = maxDist / dist;
      area.cx = gx + dx * f;
      area.cy = gy + dy * f;
    }
  }

  function applySelectionTile(tx, ty){
    if (!selectionActive || !currentSelectionUid) return;
    const area = areas.get(currentSelectionUid);
    if (!area) return;

    // Mittelpunkt auf Tile-Zentrum setzen
    area.cx = (tx|0) + 0.5;
    area.cy = (ty|0) + 0.5;

    // Begrenzung, damit der Kreis nicht "zu weit weg" liegt
    clampCenterToMaxDistance(area);

    LOG('Arbeitsbereich verschoben', {
      id : area.id,
      uid: area.uid,
      cx : area.cx,
      cy : area.cy,
      r  : area.radiusTiles
    });

    // Auswahl beenden (ein Klick reicht fürs Setzen)
    selectionActive     = false;
    currentSelectionUid = null;

    // Event nach außen schicken, damit Produktions-Module reagieren können
    try{
      window.dispatchEvent(new CustomEvent('cb:workarea:set', {
        detail: {
          id          : area.id,
          uid         : area.uid,
          cx          : area.cx,
          cy          : area.cy,
          radiusTiles : area.radiusTiles,
          x           : area.x,
          y           : area.y,
          w           : area.w,
          h           : area.h
        }
      }));
    } catch(e){
      WARN('cb:workarea:set dispatch fehlgeschlagen', e);
    }
  }

  function isSelecting(){
    return !!selectionActive && !!currentSelectionUid;
  }

  // ---------------------------------------------------------------------------
  // Ereignisse
  // ---------------------------------------------------------------------------

  // Wenn ein unterstütztes Gebäude fertig ist → Arbeitsbereich anlegen
  window.addEventListener('cb:build:complete', (ev)=>{
    const d = ev.detail || {};
    if (!d.id || !SUPPORTED_IDS.has(d.id)) return;

    const area = ensureAreaForBuilding(d);
    if (area){
      LOG('Auto-Arbeitsbereich nach cb:build:complete', {
        id : area.id,
        uid: area.uid,
        cx : area.cx,
        cy : area.cy,
        r  : area.radiusTiles
      });
    }
  }, { passive:true });

  // ---------------------------------------------------------------------------
  // API für das Gebäude-Menü
  // ---------------------------------------------------------------------------

  /**
   * Wird vom Gebäude-Menü aufgerufen, wenn der Button
   * „Arbeitsbereich setzen“ gedrückt wird.
   *
   * cfg: { id, uid?, x,y,w,h, radiusTiles? }
   */
  function startSelectionForBuilding(cfg){
    const area = ensureAreaForBuilding(cfg || {});
    if (!area) {
      WARN('startSelectionForBuilding: kein gültiger Bereich', cfg);
      return;
    }

    currentSelectionUid = area.uid;
    selectionActive     = true;

    // Markiere nur diesen Bereich als "selected"
    for (const a of areas.values()){
      a.selected = (a.uid === currentSelectionUid);
    }

    LOG('Arbeitsbereich selektiert (Selection-Modus aktiv)', {
      id : area.id,
      uid: area.uid,
      cx : area.cx,
      cy : area.cy,
      r  : area.radiusTiles
    });
  }

  // ---------------------------------------------------------------------------
  // Zeichnen des Overlays (Kreise)
  // ---------------------------------------------------------------------------

  /**
   * Zeichnet alle Arbeitsbereiche auf das Overlay-Canvas.
   * ctx : 2D-Context des "game"-Canvas (von OverlayHooks)
   * cam : {x,y,zoom} SCREEN-Kamera (Pixel) – kommt aus OverlayHooks.draw
   */
    /**
   * Zeichnet alle Arbeitsbereiche auf das Overlay-Canvas.
   * ctx : 2D-Context des "game"-Canvas (von OverlayHooks)
   * cam : {x,y,zoom} SCREEN-Kamera (Pixel) – kommt aus OverlayHooks.draw
   */
  function drawAreas(ctx, cam){
    // Nichts zu tun, wenn kein Context oder keine Bereiche
    if (!ctx || !areas.size) return;

    // Kamera-State übernehmen (entweder übergeben oder aus GameCamera lesen)
    const camState = cam || getCameraState();
    const camX = toNumber(camState.x,    0);
    const camY = toNumber(camState.y,    0);
    const zoom = toNumber(camState.zoom, 1);

    const ts = getTileSize(); // Tilegröße in Pixel

    ctx.save();

    for (const area of areas.values()){
      // Weltkoordinaten (Tile-Mittelpunkt → Welt-Pixel)
      const wx = area.cx * ts;
      const wy = area.cy * ts;

      // Screen-Koordinaten via Kamera-Offset + Zoom
      const sx = (wx - camX) * zoom;
      const sy = (wy - camY) * zoom;

      // Radius in Pixeln (Tiles → Welt → Screen)
      const r  = area.radiusTiles * ts * zoom;

      // Außenkreis
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);

      // Füllung leicht transparent (heller, wenn selektiert)
      ctx.fillStyle = area.selected
        ? 'rgba(0, 180, 255, 0.15)'
        : 'rgba(0, 120, 255, 0.10)';

      // Rand etwas kräftiger
      ctx.strokeStyle = area.selected
        ? 'rgba(0, 200, 255, 0.85)'
        : 'rgba(0, 120, 255, 0.60)';

      ctx.lineWidth = 2 * zoom;
      ctx.fill();
      ctx.stroke();

      // Kleiner Punkt im Zentrum
      ctx.beginPath();
      ctx.arc(sx, sy, 3 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = area.selected ? '#00e0ff' : '#0070ff';
      ctx.fill();
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // OverlayHooks-Integration
  // ---------------------------------------------------------------------------

  function registerOverlayLayer(){
    if (!window.OverlayHooks || typeof window.OverlayHooks.register !== 'function'){
      return false;
    }

    try{
      window.OverlayHooks.register('workareas', (ctx, cam)=>{
        drawAreas(ctx, cam);
      });
      LOG('Overlay-Layer "workareas" registriert');
      return true;
    } catch(e){
      WARN('Overlay-Layer-Registrierung fehlgeschlagen:', e);
      return true; // nicht neu versuchen
    }
  }

  // Direkt versuchen + ggf. ein paar Mal nachschieben
  if (!registerOverlayLayer()){
    let tries = 0;
    const maxTries = 20;
    const timer = setInterval(()=>{
      tries++;
      if (registerOverlayLayer() || tries >= maxTries){
        clearInterval(timer);
      }
    }, 200);
  }

  // ---------------------------------------------------------------------------
  // GLOBAL API
  // ---------------------------------------------------------------------------

  window.GameWorkArea = {
    areas,
    startSelectionForBuilding,
    applySelectionTile,
    isSelecting
  };

  LOG('Modul geladen v25.12.03-workarea-v3 (Selection+Click+Event)');

})();
