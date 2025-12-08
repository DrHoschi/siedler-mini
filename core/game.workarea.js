/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.08-workarea-core-v5-drawworld
 *
 * Zweck   :
 *   Zentrale Verwaltung der ARBEITSBEREICHE (WorkAreas) für Gebäude:
 *
 *   - Pro Gebäude (uid) wird ein Arbeitskreis verwaltet:
 *       { id, buildingId, uid, x, y, w, h, cx, cy, radiusTiles }
 *
 *   - API:
 *       GameWorkArea.beginSelection(buildingDetail)
 *       GameWorkArea.isSelecting()
 *       GameWorkArea.applySelectionTile(tx,ty)
 *       GameWorkArea.cancelSelection()
 *       GameWorkArea.getAreaFor(detailOrUid)
 *       GameWorkArea.getOrCreateAreaFor(detailOrUid)
 *
 *   - Events:
 *       cb:workarea:set(detail)
 *
 *   - Zeichnen:
 *       → Renderer ruft GameWorkArea.drawWorld(ctx, camOrOpts) ODER
 *         GameWorkArea.drawOnMainCanvas(ctx, cam) auf.
 *       → Kreis wird NUR gezeichnet, solange isSelecting() === true ist.
 * ========================================================================== */

(function(){
  'use strict';

  // --------------------------------------------------------------------------
  //  LOGGING
  // --------------------------------------------------------------------------

  const PREFIX = '[game.workarea]';

  function LOG(...args){ console.log(PREFIX, ...args); }
  function INFO(...args){ console.info(PREFIX, ...args); }
  function WARN(...args){ console.warn(PREFIX, ...args); }

  // --------------------------------------------------------------------------
  //  STATE
  // --------------------------------------------------------------------------

  /** Map<uid, WorkAreaState> */
  const areasByUid = new Map();

  /** Aktuelles Gebäude aus dem Menü (cb:building:menu-open) */
  let currentBuilding = null;

  /** Aktive Auswahl (wenn der Benutzer gerade einen Bereich setzen will) */
  let selecting    = false;
  let selectingUid = null;

  /** Letzte Hover-Tile (nur Diagnose / spätere Features) */
  let lastHoverTile = null;

  const DEFAULT_RADIUS = 3; // in Tiles

  // --------------------------------------------------------------------------
  //  HILFSFUNKTIONEN (UID, Defaults)
  // --------------------------------------------------------------------------

  function makeUid(detail){
    if (!detail) return null;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || 'building';
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
  }

  function pickRadius(detail){
    if (!detail) return DEFAULT_RADIUS;
    if (detail.radiusTiles != null) return detail.radiusTiles | 0;
    return DEFAULT_RADIUS;
  }

  function computeDefaultCenter(detail){
    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);

    return { cx, cy };
  }

  function toWorkArea(detail){
    if (!detail) return null;
    const uid = makeUid(detail);
    if (!uid) return null;

    const x  = detail.x | 0;
    const y  = detail.y | 0;
    const w  = (detail.w | 0) || 3;
    const h  = (detail.h | 0) || 3;

    const center = computeDefaultCenter({x,y,w,h});
    const radius = pickRadius(detail);

    return {
      id        : detail.id || detail.buildingId || detail.kind || 'building',
      buildingId: detail.buildingId || detail.id || detail.kind || 'building',
      uid,
      x, y, w, h,
      cx   : detail.cx ?? center.cx,
      cy   : detail.cy ?? center.cy,
      radiusTiles: radius
    };
  }

  function dispatchWorkAreaSet(area){
    if (!area) return;

    const detail = {
      id         : area.id,
      buildingId : area.buildingId || area.id,
      uid        : area.uid,
      x          : area.x,
      y          : area.y,
      w          : area.w,
      h          : area.h,
      cx         : area.cx,
      cy         : area.cy,
      radiusTiles: area.radiusTiles
    };

    INFO('cb:workarea:set →', detail);

    try{
      window.dispatchEvent(new CustomEvent('cb:workarea:set', { detail }));
    } catch(e){
      WARN('dispatchWorkAreaSet Fehler', e);
    }
  }

  // --------------------------------------------------------------------------
  //  KERN-API: Bereiche verwalten
  // --------------------------------------------------------------------------

  function getOrCreateAreaFor(detailOrUid){
    if (!detailOrUid) return null;

    if (typeof detailOrUid === 'string'){
      const existing = areasByUid.get(detailOrUid);
      return existing || null;
    }

    const uid = makeUid(detailOrUid);
    if (!uid) return null;

    const existing = areasByUid.get(uid);
    if (existing) return existing;

    const area = toWorkArea(detailOrUid);
    if (!area) return null;

    areasByUid.set(uid, area);
    LOG('Neue WorkArea angelegt', uid, area);

    // Standard-Arbeitsbereich sofort melden
    dispatchWorkAreaSet(area);
    return area;
  }

  function getAreaFor(detailOrUid){
    if (!detailOrUid) return null;
    if (typeof detailOrUid === 'string'){
      return areasByUid.get(detailOrUid) || null;
    }
    const uid = makeUid(detailOrUid);
    if (!uid) return null;
    return areasByUid.get(uid) || null;
  }

  // --------------------------------------------------------------------------
  //  SELECTION-LOGIK (Begin/Apply/Cancel)
  // --------------------------------------------------------------------------

  function beginSelection(detail){
    const d = detail || currentBuilding;
    if (!d){
      WARN('beginSelection ohne gültiges Gebäude aufgerufen');
      return;
    }

    const area = getOrCreateAreaFor(d);
    if (!area){
      WARN('beginSelection: konnte Area nicht erzeugen', d);
      return;
    }

    selecting      = true;
    selectingUid   = area.uid;
    currentBuilding = {
      id : area.id,
      uid: area.uid,
      x  : area.x,
      y  : area.y,
      w  : area.w,
      h  : area.h
    };

    LOG('Selection gestartet für', area.uid, area);

    // Beim Start sofort den aktuellen Bereich rausfeuern
    dispatchWorkAreaSet(area);
  }

  function applySelectionTile(tx, ty){
    if (!selecting || !selectingUid) return;

    const area = areasByUid.get(selectingUid);
    if (!area){
      WARN('applySelectionTile: kein Area für uid', selectingUid);
      return;
    }

    area.cx = tx;
    area.cy = ty;
    areasByUid.set(selectingUid, area);

    LOG('Arbeitsbereich verschoben', selectingUid, '→', tx, ty);

    // Sofort an alle interessierten Module melden (Holz, Stein, etc.)
    dispatchWorkAreaSet(area);

    // Ein Klick = setzen & fertig → Selektionsmodus beenden
    cancelSelection();
  }

  function cancelSelection(){
    if (!selecting) return;
    LOG('Selection beendet für', selectingUid);
    selecting    = false;
    selectingUid = null;
  }

  function isSelecting(){
    return !!selecting;
  }

  // --------------------------------------------------------------------------
  //  ZEICHNEN DES KREISES (NUR WÄHREND SELECTION)
  // --------------------------------------------------------------------------

  function drawCircle(ctx, xPx, yPx, rPx){
    ctx.beginPath();
    ctx.arc(xPx, yPx, rPx, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawWorkAreas(ctx, cam){
    if (!ctx) return;
    if (!areasByUid.size) return;
    if (!selecting) return;   // <— Kreis nur im Setz-Modus sichtbar

    const zoom = cam?.zoom ?? 1;

    const ts =
      (window.Game?.map?.tileSize) ||
      (window.Game?.tileSize) ||
      (window.GameMap?._state?.tileSize) || // <— korrigiert
      64;

    ctx.save();

    for (const area of areasByUid.values()){
      const active = (area.uid === selectingUid);
      if (!active) continue;  // nur aktueller Bereich

      const cxPx = (area.cx + 0.5) * ts;
      const cyPx = (area.cy + 0.5) * ts;
      const rPx  = (area.radiusTiles || DEFAULT_RADIUS) * ts;

      ctx.save();

      const baseLW = ts * 0.06;
      ctx.lineWidth   = Math.max(1, baseLW / zoom);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
      ctx.setLineDash([ts * 0.6, ts * 0.3]);

      drawCircle(ctx, cxPx, cyPx, rPx);

      ctx.restore();
    }

    ctx.restore();
  }

  // Renderer-Hooks
  function drawOnMainCanvas(ctx, cam){
    drawWorkAreas(ctx, cam);
  }

  function drawWorld(ctx, camOrOpts){
    const zoom =
      (window.GameCamera && typeof window.GameCamera.zoom === 'number')
        ? window.GameCamera.zoom
        : (camOrOpts && typeof camOrOpts.zoom === 'number'
            ? camOrOpts.zoom
            : 1);

    drawWorkAreas(ctx, { zoom });
  }

  // --------------------------------------------------------------------------
  //  EVENTS VOM SPIEL (z. B. Gebäude-Menü öffnen)
  // --------------------------------------------------------------------------

  function handleBuildingMenuOpen(ev){
    const d = ev && ev.detail;
    if (!d) return;

    const uid = makeUid(d);
    currentBuilding = {
      id : d.id || d.buildingId || d.kind || 'building',
      uid,
      x  : d.x | 0,
      y  : d.y | 0,
      w  : (d.w | 0) || 3,
      h  : (d.h | 0) || 3
    };
    INFO('cb:building:menu-open → currentBuilding =', currentBuilding);

    // Sicherstellen, dass es für dieses Gebäude eine WorkArea gibt
    getOrCreateAreaFor(currentBuilding);
  }

  try {
    window.addEventListener('cb:building:menu-open', handleBuildingMenuOpen);
    INFO('Event-Listener cb:building:menu-open registriert');
  } catch(e){
    WARN('Event-Listener cb:building:menu-open konnte nicht registriert werden:', e);
  }

  // --------------------------------------------------------------------------
  //  EXPORT
  // --------------------------------------------------------------------------

  window.GameWorkArea = {
    beginSelection,
    applySelectionTile,
    cancelSelection,
    isSelecting,
    getAreaFor,
    getOrCreateAreaFor,
    drawOnMainCanvas,
    drawWorld
  };

  INFO('bereit v25.12.08-workarea-core-v5-drawworld');

})();
