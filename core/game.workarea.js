/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.02-workarea-v2
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
 *        startSelectionForBuilding(cfg)
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

    // Markiere nur diesen Bereich als "selected"
    for (const a of areas.values()){
      a.selected = (a.uid === currentSelectionUid);
    }

    LOG('Arbeitsbereich selektiert', {
      id : area.id,
      uid: area.uid,
      cx : area.cx,
      cy : area.cy,
      r  : area.radiusTiles
    });

    // HINWEIS:
    // In dieser v2 wird die Position nur markiert, NICHT verschoben.
    // Die Interaktion (Klick auf Karte → Mittelpunkt verschieben)
    // binden wir in einem weiteren Schritt an core.core.input-v1.js an.
  }

  // ---------------------------------------------------------------------------
  // Zeichnen des Overlays (Kreise)
  // ---------------------------------------------------------------------------

  /**
   * Zeichnet alle Arbeitsbereiche auf das Overlay-Canvas.
   * ctx : 2D-Context des "game"-Canvas (von OverlayHooks)
   * cam : {x,y,zoom} SCREEN-Kamera (Pixel) – kommt aus OverlayHooks.draw
   */
  function drawAreas(ctx, cam){
    if (!ctx || !areas.size) return;

    const camState = cam || getCameraState();
    const camX = toNumber(camState.x,    0);
    const camY = toNumber(camState.y,    0);
    const zoom = toNumber(camState.zoom, 1);

    const ts = getTileSize();

    ctx.save();

    for (const area of areas.values()){
      const wx = area.cx * ts; // Welt-Pixel X
      const wy = area.cy * ts; // Welt-Pixel Y
      const sx = (wx - camX) * zoom; // Screen-Pixel X
      const sy = (wy - camY) * zoom; // Screen-Pixel Y
      const r  = area.radiusTiles * ts * zoom;

      // Außenkreis
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);

      // Füllung leicht transparent
      ctx.fillStyle   = area.selected
        ? 'rgba(0, 180, 255, 0.15)'
        : 'rgba(0, 120, 255, 0.10)';

      ctx.strokeStyle = area.selected
        ? 'rgba(0, 200, 255, 0.85)'
        : 'rgba(0, 120, 255, 0.60)';

      ctx.lineWidth   = 2 * zoom;
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
    startSelectionForBuilding
  };

  LOG('Modul geladen v25.12.02-workarea-v2');

})();
