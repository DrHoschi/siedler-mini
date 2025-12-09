/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-workarea-core-v7-maincanvas
 * Zweck   : Arbeitsbereich (Kreis) für Gebäude, v. a. Holzfäller
 *
 * Lauscht : –
 * Bietet  : GameWorkArea.beginSelection(buildingDetail)
 *           GameWorkArea.applySelectionTile(tx, ty)
 *           GameWorkArea.drawWorld(ctx, {tileSize})
 *           GameWorkArea.getAreaFor({id,uid,x,y,w,h})
 *           GameWorkArea.cancelSelection()
 *
 * Events  : cb:workarea:set(detail)
 * ============================================================================ */

(function(){
  const TAG  = '[game.workarea]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console,  TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console,  TAG);

  const DEFAULT_RADIUS_TILES = 2.5;

  // uid → { uid, buildingId, x,y,w,h, cx,cy, radiusTiles }
  const areasByUid = new Map();

  let selecting     = false;
  let selectingUid  = null;
  let lastHoverTile = null;
  let currentBuilding = null;

  // -------------------------------------------------------------------------
  // UID-Hilfsfunktion (Holzfäller etc.)
  // -------------------------------------------------------------------------
  function makeUidFromDetail(detail){
    if (!detail) return null;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || 'building';
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
  }

  function ensureDefaultForBuilding(detail){
    const uid = makeUidFromDetail(detail);
    if (!uid) return null;

    let area = areasByUid.get(uid);
    if (!area){
      const x = detail.x | 0;
      const y = detail.y | 0;
      const w = (detail.w | 0) || 3;
      const h = (detail.h | 0) || 3;

      const cx = x + w / 2;
      const cy = y + h / 2;

      area = {
        uid,
        buildingId : detail.id || detail.buildingId || detail.kind || 'building',
        x, y, w, h,
        cx, cy,
        radiusTiles: DEFAULT_RADIUS_TILES
      };
      areasByUid.set(uid, area);
    }
    return area;
  }

  function getAreaFor(detail){
    const uid = makeUidFromDetail(detail);
    if (!uid) return null;
    return areasByUid.get(uid) || null;
  }

  function getOrCreateAreaFor(detail){
    return getAreaFor(detail) || ensureDefaultForBuilding(detail);
  }

  // -------------------------------------------------------------------------
  // Auswahl-Flow
  // -------------------------------------------------------------------------
  function beginSelection(buildingDetail){
    if (!buildingDetail){
      WARN('beginSelection ohne buildingDetail aufgerufen');
      return;
    }

    currentBuilding = buildingDetail;

    const area = getOrCreateAreaFor(buildingDetail);
    if (!area) {
      WARN('beginSelection: konnte WorkArea nicht ermitteln', buildingDetail);
      return;
    }

    selecting     = true;
    selectingUid  = area.uid;
    lastHoverTile = { tx: area.cx, ty: area.cy };

    LOG('Selection gestartet für', selectingUid, area);
  }

  function isSelecting(){
    return !!selecting;
  }

  /**
   * Wird von core.input.js aufgerufen, wenn du auf eine Map-Tile klickst,
   * WÄHREND der WorkArea-Modus aktiv ist.
   */
  function applySelectionTile(tx, ty){
    if (!selecting || !selectingUid) {
      return false;
    }

    const area = areasByUid.get(selectingUid);
    if (!area) {
      WARN('applySelectionTile: keine Area für uid', selectingUid);
      selecting    = false;
      selectingUid = null;
      return false;
    }

    lastHoverTile = { tx, ty };

    // Kreis muss das Gebäude berühren → Rand darf anlegen
    const minX = area.x - area.radiusTiles;
    const maxX = area.x + area.w - 1 + area.radiusTiles;
    const minY = area.y - area.radiusTiles;
    const maxY = area.y + area.h - 1 + area.radiusTiles;

    if (tx < minX) tx = minX;
    if (tx > maxX) tx = maxX;
    if (ty < minY) ty = minY;
    if (ty > maxY) ty = maxY;

    area.cx = tx;
    area.cy = ty;

    LOG('WorkArea übernommen', area.uid, '→', { cx: area.cx, cy: area.cy });

    // Auswahl beenden – das Menü bleibt offen/zu, wie UI es macht
    selecting    = false;
    selectingUid = null;

    // Event nach außen (Production-Module etc.)
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
    } catch (e) {
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
  // Zeichnen des Arbeitskreises (im Haupt-Canvas)
  // -------------------------------------------------------------------------
  /**
   * Wird aus game.renderer.js aufgerufen:
   *   GameWorkArea.drawWorld(ctx, { tileSize: ts });
   * Kamera-Transform ist dort bereits gesetzt.
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

    // kleine Hervorhebung am Rand
    ctx.beginPath();
    ctx.arc(px, py, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // EXPORT
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
