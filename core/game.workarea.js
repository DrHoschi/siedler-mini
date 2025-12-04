/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.03-workarea-v6 (auto-create + selection + overlay)
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
 *        ensureDefaultForBuilding(detail),
 *        startSelectionForBuilding(detail),
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

  // -------------------------------------------------------------------------
  // KONFIG / SUPPORT
  // -------------------------------------------------------------------------

  /** Unterstützte Gebäude-Typen für Arbeitsbereiche */
  const SUPPORTED_IDS = new Set([
    'b.lumberjack',
    'b.quarry',
    'b.fisher'
  ]);

  /**
   * Building-Config aus Registry / GameRegistry holen.
   * Erwartet ein Objekt mit u. a. workArea: { radiusTiles, ... }.
   */
  function getBuildingConfig(id){
    try{
      const all = window.GameRegistry?.buildings || window.Registry?.buildings;
      if (!all) return null;
      return all[id] || null;
    }catch(e){
      WARN('Building-Config nicht lesbar:', e);
      return null;
    }
  }

  /** Fallback-Radius, falls in der Registry nichts definiert ist. */
  function getDefaultRadius(id){
    switch(id){
      case 'b.lumberjack': return 5.0;
      case 'b.quarry'    : return 4.5;
      case 'b.fisher'    : return 4.5;
      default            : return 4.0;
    }
  }

  /** Hilfsfunktion: Zahl mit Fallback konvertieren */
  function toNumber(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /** Map: uid → WorkArea */
  const areas = new Map();

  /** UID des aktuell im Selektionsmodus befindlichen Bereichs */
  let currentSelectionUid = null;

  /** Flag: Ist gerade der Arbeitsbereich-Auswahlmodus aktiv? */
  let selectionActive = false;

  // -------------------------------------------------------------------------
  // Hilfen: TileSize + Kamera
  // -------------------------------------------------------------------------

  function getTileSize(){
    try{
      const Game = window.Game || {};
      if (typeof Game.tileSize === 'number') return Game.tileSize;
      if (Game.map && typeof Game.map.tileSize === 'number') return Game.map.tileSize;
      if (window.GameMap && window.GameMap._state?.map?.tileSize){
        return Number(window.GameMap._state.map.tileSize) || 64;
      }
    }catch(e){
      // ignoriere
    }
    return 64;
  }

  function getCameraState(){
    try{
      if (window.GameCamera?.getState){
        return window.GameCamera.getState();
      }
      const cam = window.GameCamera || {};
      return {
        x   : cam.x   || 0,
        y   : cam.y   || 0,
        zoom: cam.zoom || 1
      };
    }catch(e){
      return { x:0, y:0, zoom:1 };
    }
  }

  // -------------------------------------------------------------------------
  // WorkArea erzeugen / aktualisieren
  // -------------------------------------------------------------------------

  /**
   * ensureAreaForBuilding(detail)
   *  - detail: { id, uid?, x,y,w,h, workArea? }
   *  - sorgt dafür, dass zu einem Gebäude genau ein WorkArea-Eintrag existiert
   */
  function ensureAreaForBuilding(detail){
    if (!detail) return null;

    const id   = detail.id || detail.buildingId || detail.type || detail.kind;
    if (!id) return null;

    // Nur unsere Produktionsgebäude – alles andere ignorieren
    if (!SUPPORTED_IDS.has(id)){
      return null;
    }

    // Gebäudekoordinaten aus detail
    const x  = (detail.x | 0);
    const y  = (detail.y | 0);
    const w  = (detail.w | 0) || 1;
    const h  = (detail.h | 0) || 1;

    // UID – möglichst stabil (überall gleiche Bildung)
    const uid =
      detail.uid ||
      detail.instanceId ||
      detail.buildingUid ||
      (id + ':' + x + ',' + y);

    // WorkArea-Konfiguration aus:
    //  - detail.workArea
    //  - Registry-Eintrag
    //  - Default
    const cfg = detail.workArea || getBuildingConfig(id)?.workArea || {};

    // bevorzugt cfg.radiusTiles (unser aktueller Standard)
    const radiusTiles = toNumber(
      (cfg.radiusTiles ?? cfg.radius),
      getDefaultRadius(id)
    );

    // Zentrum des Gebäudes in Tile-Koordinaten
    const cx = x + (w / 2);
    const cy = y + (h / 2);

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

  /**
   * ensureDefaultForBuilding(detail)
   *  - Öffentliche API, die vom Gebäude-Menü benutzt werden kann.
   *  - Stellt sicher, dass für dieses Gebäude ein Arbeitsbereich vorhanden ist.
   */
  function ensureDefaultForBuilding(detail){
    const area = ensureAreaForBuilding(detail);
    if (!area) return null;

    LOG('Default-Arbeitsbereich sichergestellt', {
      id : area.id,
      uid: area.uid,
      cx : area.cx,
      cy : area.cy,
      r  : area.radiusTiles
    });

    return area;
  }

  /**
   * Fallback-Sync:
   *  - Läuft beim Zeichnen und sorgt dafür, dass für alle fertigen
   *    Produktionsgebäude (Holz, Stein, Fisch) ein Arbeitsbereich existiert
   *    – selbst wenn das cb:build:complete-Event verpasst wurde.
   */
  function syncAreasFromGameBuildings(){
    const Game = window.Game;
    if (!Game || !Array.isArray(Game.buildings)) return;

    for (const b of Game.buildings){
      if (!b) continue;

      const id = b.id || b.type || b.kind;
      if (!id || !SUPPORTED_IDS.has(id)) continue;

      // Nur fertige Gebäude (Baustellen ignorieren)
      if (typeof b.buildStage === 'number' && b.buildStage < 3) continue;
      if (b.status && b.status !== 'done') continue;

      const detail = {
        id,
        uid: b.uid || b.instanceId || (id + ':' + ((b.x|0)) + ',' + ((b.y|0))),
        x  : b.x | 0,
        y  : b.y | 0,
        w  : b.w || 1,
        h  : b.h || 1
      };

      ensureAreaForBuilding(detail);
    }
  }

  // -------------------------------------------------------------------------
  // Selektion / Klick
  // -------------------------------------------------------------------------

  /**
   * Wird vom Gebäude-Menü aufgerufen, wenn der User auf
   * „Arbeitsbereich wählen“ klickt.
   */
  function startSelectionForBuilding(detail){
    const area = ensureAreaForBuilding(detail);
    if (!area){
      WARN('startSelectionForBuilding: kein gültiger Bereich für', detail?.id);
      return;
    }

    currentSelectionUid = area.uid;
    selectionActive     = true;

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

  /**
   * applySelectionTile(tx, ty)
   *  - Input-System ruft das im Selection-Modus auf.
   *  - verschiebt NUR das Zentrum (cx,cy), Radius bleibt gleich.
   *  - sendet cb:workarea:set mit Payload für Production-Manager.
   */
  function applySelectionTile(tx, ty){
    if (!selectionActive || currentSelectionUid == null) return;
    const area = areas.get(currentSelectionUid);
    if (!area) return;

    const dx   = (tx + 0.5) - area.cx;
    const dy   = (ty + 0.5) - area.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);

    area.cx = tx + 0.5;
    area.cy = ty + 0.5;

    LOG('Arbeitsbereich verschoben', {
      uid   : area.uid,
      id    : area.id,
      cx    : area.cx,
      cy    : area.cy,
      radius: area.radiusTiles,
      dist
    });

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
  }

  /** Getter für das Input-System (renderer/input): */
  function isSelecting(){
    return selectionActive;
  }

  // -------------------------------------------------------------------------
  // Zeichnen des Overlays (Kreise)
  // -------------------------------------------------------------------------

  function drawAreas(ctx, cam){
    if (!ctx) return;

    // Fallback-Sync (falls Events verpasst wurden)
    syncAreasFromGameBuildings();

    if (!areas.size) return;

    const camState = cam || getCameraState();
    const camX = toNumber(camState.x,    0);
    const camY = toNumber(camState.y,    0);
    const zoom = toNumber(camState.zoom, 1);

    const TILE = getTileSize();

    ctx.save();

    for (const area of areas.values()){
      const worldCx = area.cx * TILE;
      const worldCy = area.cy * TILE;

      const screenCx = (worldCx - camX) * zoom;
      const screenCy = (worldCy - camY) * zoom;
      const screenR  = area.radiusTiles * TILE * zoom;

      // Nur zeichnen, wenn im Sichtbereich
      if (screenCx + screenR < 0) continue;
      if (screenCy + screenR < 0) continue;
      if (screenCx - screenR > ctx.canvas.width)  continue;
      if (screenCy - screenR > ctx.canvas.height) continue;

      const isSelected = area.selected;

      ctx.beginPath();
      ctx.arc(screenCx, screenCy, screenR, 0, Math.PI * 2, false);

      if (isSelected){
        ctx.lineWidth   = 4;
        ctx.strokeStyle = 'rgba(80,200,255,0.9)';
        ctx.setLineDash([8 * zoom, 6 * zoom]);
      } else {
        ctx.lineWidth   = 2;
        ctx.strokeStyle = 'rgba(50,150,220,0.7)';
        ctx.setLineDash([6 * zoom, 6 * zoom]);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Overlay-Layer bei OverlayHooks registrieren
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // EVENT-BINDINGS (cb:build:complete)
  // -------------------------------------------------------------------------

  try{
    window.addEventListener('cb:build:complete', (ev)=>{
      const d = ev?.detail || {};
      const b = d.building || d;
      if (!b) return;

      const id = b.id || b.buildingId || b.type || b.kind;
      if (!id || !SUPPORTED_IDS.has(id)) return;

      LOG('cb:build:complete erhalten → WorkArea-Default anlegen', {
        id,
        x : b.x,
        y : b.y,
        w : b.w,
        h : b.h
      });

      ensureDefaultForBuilding({
        id,
        uid: b.uid || b.instanceId || b.buildingUid || (id + ':' + ((b.x|0)) + ',' + ((b.y|0))),
        x  : b.x | 0,
        y  : b.y | 0,
        w  : b.w || 1,
        h  : b.h || 1
      });
    }, { passive:true });
  } catch(e){
    WARN('cb:build:complete-Listener konnte nicht registriert werden:', e);
  }

  // -------------------------------------------------------------------------
  // GLOBAL API
  // -------------------------------------------------------------------------

  window.GameWorkArea = {
    areas,
    ensureDefaultForBuilding,
    startSelectionForBuilding,
    applySelectionTile,
    isSelecting
  };

  LOG('Modul geladen v25.12.03-workarea-v6 (auto-create + selection + overlay)');

})();
