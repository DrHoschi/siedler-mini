/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-workarea-core-v7-maincanvas
 *
 * Zweck   :
 *   Zentrale Verwaltung der ARBEITSBEREICHE (WorkAreas) für Gebäude
 *   (insbesondere b.lumberjack).
 *
 *   - Für jedes Gebäude (uid) wird ein Kreis gespeichert:
 *       { uid, buildingId, x,y,w,h, cx,cy, radiusTiles }
 *
 *   - API (global über window.GameWorkArea):
 *       GameWorkArea.beginSelection(buildingDetail)
 *       GameWorkArea.isSelecting()
 *       GameWorkArea.applySelectionTile(tx, ty)
 *       GameWorkArea.cancelSelection()
 *       GameWorkArea.getAreaFor(detailOrUid)
 *       GameWorkArea.getOrCreateAreaFor(detail)
 *       GameWorkArea.ensureDefaultForBuilding(detail)
 *       GameWorkArea.drawWorld(ctx, { tileSize })
 *
 *   - Events:
 *       Dispatch von 'cb:workarea:set' nach neuer Auswahl
 * ============================================================================ */

(function(){
  'use strict';

  const TAG  = '[game.workarea]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console,  TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console,  TAG);

  const DEFAULT_RADIUS_TILES = 2.5;

  /** Map<uid, WorkAreaState> */
  const areasByUid = new Map();

  let selecting     = false;
  let selectingUid  = null;
  let currentBuilding = null;

  // -------------------------------------------------------------------------
  // UID helper
  // -------------------------------------------------------------------------
  function makeUid(detail){
    if (!detail) return null;
    if (typeof detail === 'string') return detail;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || 'building';
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
  }

  // -------------------------------------------------------------------------
  // Area-Erzeugung
  // -------------------------------------------------------------------------
  function pickRadius(detail){
    // Aus Registry übernehmen, wenn vorhanden:
    // buildings.json → workArea.radiusTiles
    try{
      const id = detail?.id || detail?.buildingId || detail?.kind || null;
      const def = id ? window.Registry?.getBuilding?.(id) : null;
      const r = Number(def?.workArea?.radiusTiles);
      if (Number.isFinite(r) && r > 0) return r;
    }catch(_){}
    return DEFAULT_RADIUS_TILES;
  }

  function createArea(detail){
    const uid = makeUid(detail);
    if (!uid) return null;

    const id = detail.id || detail.buildingId || detail.kind || 'building';

    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    const cx = x + w / 2;
    const cy = y + h / 2;

    return {
      uid,
      buildingId : id,
      x, y, w, h,
      cx, cy,
      radiusTiles: pickRadius(detail)
    };
  }

  function ensureDefaultForBuilding(detail){
    const uid = makeUid(detail);
    if (!uid) return null;

    let area = areasByUid.get(uid);
    if (!area){
      area = createArea(detail);
      if (!area) return null;
      areasByUid.set(uid, area);
      LOG('Default-WorkArea angelegt', uid, area);
    }
    return area;
  }

  function getAreaFor(detailOrUid){
    const uid = makeUid(detailOrUid);
    if (!uid) return null;
    return areasByUid.get(uid) || null;
  }

  function getOrCreateAreaFor(detail){
    return getAreaFor(detail) || ensureDefaultForBuilding(detail);
  }

  // -------------------------------------------------------------------------
  // Auswahl-Flow (vom UI aus gesteuert)
  // -------------------------------------------------------------------------
  function beginSelection(buildingDetail){
    if (!buildingDetail){
      WARN('beginSelection ohne buildingDetail');
      return;
    }

    currentBuilding = buildingDetail;

    const area = getOrCreateAreaFor(buildingDetail);
    if (!area){
      WARN('beginSelection: keine Area erzeugt', buildingDetail);
      return;
    }

    selecting     = true;
    selectingUid  = area.uid;

    LOG('Selection gestartet für', selectingUid, area);
  }

  function isSelecting(){
    return !!selecting;
  }

  /**
   * Wird aus core.input.js aufgerufen, wenn du bei aktiver Auswahl
   * auf eine Tile klickst.
   */function applySelectionTile(tx, ty){
  if (!selecting || !selectingUid) return false;

  const area = areasByUid.get(selectingUid);
  if (!area){
    WARN('applySelectionTile: keine Area für', selectingUid);
    selecting    = false;
    selectingUid = null;
    return false;
  }

  // -------------------------------------------------------------
  // Begrenzung:
  // Mittelpunkt des Kreises MUSS in einem Rahmen von 1 Tile
  // rund um den 3×3-Gebäudeblock bleiben.
  //
  // Gebäude-Block:  x .. x+w-1
  // Erlaubter Bereich für Kreis-Mittelpunkt:
  //   X: (x-1) .. (x+w)
  //   Y: (y-1) .. (y+h)
  // -------------------------------------------------------------
  const w = area.w || 3;
  const h = area.h || 3;

  const minX = area.x - 1;
  const maxX = area.x + w;
  const minY = area.y - 1;
  const maxY = area.y + h;

  const rawTx = tx;
  const rawTy = ty;

  if (tx < minX) tx = minX;
  if (tx > maxX) tx = maxX;
  if (ty < minY) ty = minY;
  if (ty > maxY) ty = maxY;

  area.cx = tx;
  area.cy = ty;

  LOG('WorkArea übernommen', area.uid, {
    clicked : { tx: rawTx, ty: rawTy },
    clamped : { cx: area.cx, cy: area.cy },
    bounds  : { minX, maxX, minY, maxY }
  });

  // Auswahl beenden – Kreis bleibt an der neuen Position stehen
  selecting    = false;
  selectingUid = null;

  // Event nach außen feuern (dein vorhandener cb:workarea:set-Block bleibt)
  try {
    window.dispatchEvent(new CustomEvent('cb:workarea:set', {
      detail: {
        id          : area.buildingId,
        buildingId  : area.buildingId,
        uid         : area.uid,
        x           : area.x,
        y           : area.y,
        w           : area.w,
        h           : area.h,
        cx          : area.cx,
        cy          : area.cy,
        radiusTiles : area.radiusTiles
      }
    }));
  } catch (e){
    WARN('cb:workarea:set konnte nicht dispatcht werden:', e);
  }

  return true;
}

  function cancelSelection(){
    if (!selecting) return;
    LOG('Selection abgebrochen für', selectingUid);
    selecting    = false;
    selectingUid = null;
  }

  // -------------------------------------------------------------------------
  // Zeichnen – Kreis auf Haupt-Canvas
  // -------------------------------------------------------------------------
  /**
   * Wird aus game.renderer.js aufgerufen:
   *   GameWorkArea.drawWorld(ctx, { tileSize })
   * Kamera / Offset sind dort schon gesetzt.
   */
  function drawWorld(ctx, opts){
    if (!ctx) return;
    if (!selecting || !selectingUid) return;

    const tileSize = (opts && opts.tileSize) | 0 || 64;
    const area = areasByUid.get(selectingUid);
    if (!area) return;

    const cx = Number(area.cx) || (area.x + (area.w || 3) / 2);
    const cy = Number(area.cy) || (area.y + (area.h || 3) / 2);
    const rT = Number(area.radiusTiles) || DEFAULT_RADIUS_TILES;

    const px = cx * tileSize;
    const py = cy * tileSize;
    const r  = rT * tileSize;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);

    ctx.fillStyle   = 'rgba(0, 180, 255, 0.10)';
    ctx.strokeStyle = 'rgba(0, 120, 220, 0.9)';
    ctx.lineWidth   = 2;

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Export ins globale Window
  // -------------------------------------------------------------------------
  window.GameWorkArea = {
    areasByUid,
    getAreaFor,
    getOrCreateAreaFor,
    ensureDefaultForBuilding,
    beginSelection,
    isSelecting,
    applySelectionTile,
    cancelSelection,
    drawWorld
  };

  LOG('WorkArea-Modul geladen v25.12.09-workarea-core-v7-maincanvas');
})();
