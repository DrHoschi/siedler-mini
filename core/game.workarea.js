/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.08-workarea-core-v6-maincanvas
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
 *       GameWorkArea.getOrCreateAreaFor(detailOrUid)
 *       GameWorkArea.drawWorld(ctx, { tileSize })
 *
 *   - Events:
 *       cb:workarea:set(detail)  // wird nach erfolgreicher Auswahl gefeuert
 *
 *   - Zeichnen:
 *       → GameMap / Renderer ruft GameWorkArea.drawWorld(ctx,{tileSize}) auf.
 *       → Kreis wird NUR gezeichnet, solange isSelecting() === true ist.
 * ========================================================================== */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // LOGGING
  // -------------------------------------------------------------------------
  const TAG  = '[game.workarea]';
  const LOG  = (window.CBLog?.ok   ?? console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn ?? console.warn).bind(console, TAG);

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

  /** Letzte geklickte / gehoverte Tile – nur für spätere Features */
  let lastHoverTile = null;

  const DEFAULT_RADIUS = 3; // Tiles

  // -------------------------------------------------------------------------
  // HILFSFUNKTIONEN – UID, Defaults
  // -------------------------------------------------------------------------

  function makeUid(detail) {
    if (!detail) return null;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || 'building';
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
  }

  function pickRadius(detail) {
    if (!detail) return DEFAULT_RADIUS;
    if (detail.radiusTiles != null) return detail.radiusTiles | 0;
    return DEFAULT_RADIUS;
  }

  /** Standard-Zentrum = Mitte des Gebäude-Rechtecks (in Tile-Koordinaten) */
  function computeDefaultCenter(detail) {
    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);

    return { cx, cy };
  }

  function toWorkArea(detail) {
    if (!detail) return null;
    const uid = makeUid(detail);
    if (!uid) return null;

    const { cx, cy } = computeDefaultCenter(detail);

    return {
      id         : detail.id || detail.buildingId || detail.kind || 'building',
      buildingId : detail.id || detail.buildingId || detail.kind || 'building',
      uid,
      x          : detail.x | 0,
      y          : detail.y | 0,
      w          : (detail.w | 0) || 3,
      h          : (detail.h | 0) || 3,
      cx,
      cy,
      radiusTiles: pickRadius(detail)
    };
  }

  // -------------------------------------------------------------------------
  // ZUGRIFF AUF AREAS
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
      a = toWorkArea(detail);
      areasByUid.set(uid, a);
      LOG('Neue WorkArea angelegt', uid, a);
    }
    return a;
  }

  // -------------------------------------------------------------------------
  // SELECTION-FLOW (Starten, Klicken, Abbrechen)
  // -------------------------------------------------------------------------

  /**
   * Wird vom Gebäude-Menü aufgerufen, wenn du auf
   * „Arbeitsbereich setzen“ klickst.
   */
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

    selecting    = true;
    selectingUid = area.uid;
    lastHoverTile = { tx: area.cx, ty: area.cy };

    LOG('Selection gestartet für', selectingUid, area);

    // optional könnten wir hier schon einmal ein cb:workarea:set feuern,
    // aber aktuell warten wir auf den ersten „Bestätigen“-Klick.
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
      return false;
    }

    const area = areasByUid.get(selectingUid);
    if (!area) {
      WARN('applySelectionTile: keine Area für uid', selectingUid);
      selecting = false;
      selectingUid = null;
      return false;
    }

    lastHoverTile = { tx, ty };

    // --- einfache Regel: Kreis muss das Gebäude berühren -------------------
    // min. Abstand vom Gebäude-Rechteck = 0 (Rand darf direkt anliegen)
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

    // Auswahl beenden – Kreis bleibt aktuell nur beim Setzen sichtbar
    selecting    = false;
    selectingUid = null;

    // Event nach außen: Produktions-Module usw.
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

  function cancelSelection() {
    if (!selecting) return;
    LOG('Selection abgebrochen für', selectingUid);
    selecting    = false;
    selectingUid = null;
  }

  // -------------------------------------------------------------------------
  // ZEICHNEN DES ARBEITSKREISES
  // -------------------------------------------------------------------------

  /**
   * Zeichnet den aktuellen Auswahl-Kreis direkt im Welt-Koordinatensystem.
   * Aufruf aus GameMap / Renderer:
   *   GameWorkArea.drawWorld(ctx, { tileSize: ts });
   */
  // ============================================================================
// RENDER: Kreise direkt im Weltkoordinatensystem (= Map-Canvas)
// ============================================================================

function drawWorld(ctx, opts){
  if (!ctx) return;

  const tileSize = (opts && opts.tileSize) | 0 || getTileSize();
  const cam      = (opts && opts.camera) || { x: 0, y: 0, zoom: 1 };

  ctx.save();

  // Kamera-Offset wie bei Gebäuden: wir zeichnen in Tile-Koordinaten,
  // GameMap hat i.d.R. bereits die Kamera berücksichtigt, daher hier
  // NUR dann verschieben, wenn du wirklich mit GameCamera arbeitest:
  // → falls dein GameMap bereits die Welt "gescrollt" hat, kannst du
  //   die translate-Zeile auch komplett auskommentieren.
  ctx.translate(-cam.x * tileSize, -cam.y * tileSize);

  for (const area of areas.values()){
    if (!area) continue;

    const cx = Number(area.cx) || (area.x + (area.w || 3) / 2);
    const cy = Number(area.cy) || (area.y + (area.h || 3) / 2);
    const rT = Number(area.radiusTiles) || DEFAULT_RADIUS_TILES;

    const px = cx * tileSize;
    const py = cy * tileSize;
    const r  = rT * tileSize;

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);

    // Füllung leicht transparent
    ctx.fillStyle   = 'rgba(0, 180, 255, 0.10)';
    ctx.strokeStyle = 'rgba(0, 120, 220, 0.9)';
    ctx.lineWidth   = 2;

    ctx.fill();
    ctx.stroke();

    // Wenn dieser Bereich gerade im Auswahlmodus ist → etwas hervorheben
    if (area.uid === selectingUid){
      ctx.beginPath();
      ctx.arc(px, py, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.lineWidth   = 2;
      ctx.stroke();
    }
  }

  ctx.restore();
}
  
  // ============================================================================
// EXPORT
// ============================================================================
window.GameWorkArea = {
  areas,
  ensureDefaultForBuilding,
  beginSelection,        // oder startSelectionForBuilding - je nach deiner Variante
  applySelectionTile,
  cancelSelection,
  isSelecting,
  drawWorld              // <–– WICHTIG für game.map.js
};

LOG('WorkArea-Modul geladen v25.12.09-maincanvas-drawworld');
})();
