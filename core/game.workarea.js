/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-workarea-core-v7-maincanvas
 *
 * Zweck   :
 *   Zentrale Verwaltung der ARBEITSBEREICHE (WorkAreas) für Gebäude:
 *
 *   - Pro Gebäude (uid) wird ein Arbeitskreis verwaltet:
 *       { id, buildingId, uid, x, y, w, h, cx, cy, radiusTiles }
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
 * ========================================================================== */

(() => {
  'use strict';

  const TAG  = '[game.workarea]';
  const LOG  = (window.CBLog?.ok   ?? console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn ?? console.warn).bind(console, TAG);

  // -------------------------------------------------------------------------
  // KONSTANTEN
  // -------------------------------------------------------------------------

  const DEFAULT_RADIUS_TILES = 2.5; // Standard-Radius um das Gebäude

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /** Map<uid, WorkAreaState> */
  const areasByUid = new Map();

  /** Aktuelles Gebäude (Detail aus dem Gebäude-Menü) */
  let currentBuilding = null;

  /** Selektion aktiv? */
  let selecting    = false;
  let selectingUid = null;

  /** Letzte Auswahlkoordinaten (Tile) */
  let lastTx = null;
  let lastTy = null;

  // -------------------------------------------------------------------------
  // Helper
  // -------------------------------------------------------------------------

  function makeUid(detail) {
    if (!detail) return null;

    if (typeof detail === 'string') return detail;

    // Bekommt typischerweise: { id, uid, x, y, w, h }
    const id  = detail.id  || detail.kind || 'building';
    const uid = detail.uid || `${id}@${detail.x},${detail.y}`;
    return String(uid);
  }

  function ensureBaseArea(detail) {
    const uid = makeUid(detail);
    if (!uid) return null;

    const id = detail.id || detail.kind || 'building';

    const x = (detail.x ?? detail.tx ?? 0) | 0;
    const y = (detail.y ?? detail.ty ?? 0) | 0;
    const w = (detail.w ?? detail.width  ?? 3) | 0;
    const h = (detail.h ?? detail.height ?? 3) | 0;

    const cx = x + w / 2;
    const cy = y + h / 2;

    return {
      id,
      buildingId: id,
      uid,
      x, y, w, h,
      cx,
      cy,
      radiusTiles: DEFAULT_RADIUS_TILES
    };
  }

  // -------------------------------------------------------------------------
  // Daten-API
  // -------------------------------------------------------------------------

  function getAreaFor(detailOrUid) {
    if (!detailOrUid) return null;

    const uid = (typeof detailOrUid === 'string')
      ? detailOrUid
      : makeUid(detailOrUid);

    if (!uid) return null;
    return areasByUid.get(uid) || null;
  }

  function getOrCreateAreaFor(detail) {
    const uid = makeUid(detail);
    if (!uid) return null;

    let a = areasByUid.get(uid);
    if (!a) {
      a = ensureBaseArea(detail);
      areasByUid.set(uid, a);
    }
    return a;
  }

  function ensureDefaultForBuilding(detail) {
    const uid = makeUid(detail);
    if (!uid) return null;

    if (!areasByUid.has(uid)) {
      const a = ensureBaseArea(detail);
      areasByUid.set(uid, a);
      LOG('Default-WorkArea angelegt für', uid, a);
    }
    return areasByUid.get(uid);
  }

  // -------------------------------------------------------------------------
  // Auswahl-Flow
  // -------------------------------------------------------------------------

  function beginSelection(buildingDetail) {
    if (!buildingDetail) {
      WARN('beginSelection ohne Building-Detail aufgerufen');
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
    lastTx = null;
    lastTy = null;

    LOG('Selection gestartet für', selectingUid, area);
  }

  function isSelecting() {
    return !!selecting;
  }

  /**
   * Wird von core.input.js aufgerufen, wenn du auf eine Map-Tile klickst,
   * WÄHREND der WorkArea-Modus aktiv ist.
   */
  function applySelectionTile(tx, ty) {
    if (!selecting || !selectingUid) {
      return;
    }

    lastTx = tx;
    lastTy = ty;

    const area = areasByUid.get(selectingUid);
    if (!area) {
      WARN('applySelectionTile: keine Area gefunden für', selectingUid);
      return;
    }

    // Mittelpunkt auf den neuen Tile-Mittelpunkt verschieben
    area.cx = tx + 0.5;
    area.cy = ty + 0.5;

    LOG('Selection-Tile übernommen', { uid: selectingUid, tx, ty, area });
  }

  function cancelSelection() {
    if (!selecting && !selectingUid) return;

    LOG('Selection abgebrochen', { selectingUid, lastTx, lastTy });
    selecting    = false;
    selectingUid = null;
    lastTx       = null;
    lastTy       = null;
    currentBuilding = null;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  /**
   * Zeichnet den Kreis auf den MAIN-Canvas (Map-Canvas).
   * Wird von game.renderer.js aufgerufen:
   *   GameWorkArea.drawWorld(ctx, { tileSize })
   */
  function drawWorld(ctx, opts) {
    if (!ctx) return;

    // Kreis nur anzeigen, solange Auswahl aktiv ist
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

    // Füllung leicht transparent
    ctx.fillStyle   = 'rgba(0, 180, 255, 0.10)';
    ctx.strokeStyle = 'rgba(0, 120, 220, 0.9)';
    ctx.lineWidth   = 2;

    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  window.GameWorkArea = {
    // Datenzugriff
    areasByUid,
    getAreaFor,
    getOrCreateAreaFor,
    ensureDefaultForBuilding,

    // Auswahl-Flow
    beginSelection,
    isSelecting,
    applySelectionTile,
    cancelSelection,

    // Render
    drawWorld
  };

  LOG('WorkArea-Modul geladen v25.12.09-workarea-core-v7-maincanvas');
})();
