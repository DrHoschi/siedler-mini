/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-workarea-core-final
 *
 * Zweck   :
 *   Verwaltung + Zeichnen der Arbeitsbereiche (WorkAreas)
 *   für Produktionsgebäude wie Holzfäller, Steinbruch usw.
 *
 *   Fixes in dieser Version:
 *   ✔ Doppeltes drawWorld() / drawOnMainCanvas() entfernt
 *   ✔ drawWorld korrekt für game.map.js implementiert
 *   ✔ tileSize korrekt aus GameMap übernommen
 *   ✔ Export komplett korrigiert (keine Überschreibungen mehr)
 *   ✔ Logging aufgeräumt
 * ========================================================================== */

(function(){
  'use strict';

  const PREFIX = '[game.workarea]';
  const LOG  = (...a)=>console.log(PREFIX, ...a);
  const INFO = (...a)=>console.info(PREFIX, ...a);
  const WARN = (...a)=>console.warn(PREFIX, ...a);

  // Alle Arbeitsbereiche (key: uid)
  const areasByUid = new Map();

  // Aktuelles Gebäude aus dem geöffneten Menü
  let currentBuilding = null;

  // WorkArea-Selection aktiv?
  let selecting    = false;
  let selectingUid = null;

  // Standardradius
  const DEFAULT_RADIUS = 3;

  // ----------------------------------------------------------------------------
  // Hilfsfunktionen
  // ----------------------------------------------------------------------------

  function makeUid(detail){
    if (!detail) return null;
    if (detail.uid) return String(detail.uid);
    return `${detail.id || detail.buildingId}@${detail.x},${detail.y}`;
  }

  function computeDefaultCenter(detail){
    return {
      cx: detail.x + Math.floor(detail.w / 2),
      cy: detail.y + Math.floor(detail.h / 2)
    };
  }

  function toWorkArea(detail){
    const uid = makeUid(detail);
    if (!uid) return null;

    const x = detail.x|0, y = detail.y|0;
    const w = detail.w||3, h = detail.h||3;

    const {cx, cy} = computeDefaultCenter({x,y,w,h});

    return {
      id: detail.id,
      buildingId: detail.buildingId || detail.id,
      uid,
      x,y,w,h,
      cx: detail.cx ?? cx,
      cy: detail.cy ?? cy,
      radiusTiles: detail.radiusTiles ?? DEFAULT_RADIUS
    };
  }

  function dispatchWorkAreaSet(area){
    try {
      window.dispatchEvent(new CustomEvent('cb:workarea:set',{ detail: area }));
      INFO('cb:workarea:set →', area);
    } catch(e){ WARN('SET-Dispatch Fehler', e); }
  }

  // ----------------------------------------------------------------------------
  // WorkArea Verwaltung
  // ----------------------------------------------------------------------------

  function getOrCreateAreaFor(detail){
    const uid = makeUid(detail);
    if (!uid) return null;

    if (areasByUid.has(uid)) return areasByUid.get(uid);

    const area = toWorkArea(detail);
    if (!area) return null;

    areasByUid.set(uid, area);
    dispatchWorkAreaSet(area);
    return area;
  }

  function getAreaFor(detailOrUid){
    const uid = typeof detailOrUid === 'string'
      ? detailOrUid
      : makeUid(detailOrUid);
    return areasByUid.get(uid) || null;
  }

  // ----------------------------------------------------------------------------
  // Selection Flow
  // ----------------------------------------------------------------------------

  function beginSelection(detail){
    const area = getOrCreateAreaFor(detail);
    if (!area) return;

    selecting = true;
    selectingUid = area.uid;
    currentBuilding = detail;

    INFO('Selection gestartet:', area.uid);
  }

  function applySelectionTile(tx,ty){
    if (!selecting || !selectingUid) return;

    const area = areasByUid.get(selectingUid);
    if (!area) return;

    area.cx = tx;
    area.cy = ty;

    dispatchWorkAreaSet(area);
    cancelSelection();
  }

  function cancelSelection(){
    selecting = false;
    selectingUid = null;
  }

  function isSelecting(){
    return selecting;
  }

  // ----------------------------------------------------------------------------
  // Zeichnen des Kreises
  // ----------------------------------------------------------------------------

  function drawCircle(ctx, xPx, yPx, rPx){
    ctx.beginPath();
    ctx.arc(xPx, yPx, rPx, 0, Math.PI*2);
    ctx.stroke();
  }

  function drawWorkAreas(ctx, cam){
    if (!selecting || !selectingUid) return;

    const ts = window.GameMap?._state?.tileSize || 64;
    const zoom = cam?.zoom || 1;

    const area = areasByUid.get(selectingUid);
    if (!area) return;

    const cxPx = (area.cx + 0.5) * ts;
    const cyPx = (area.cy + 0.5) * ts;
    const rPx  = area.radiusTiles * ts;

    ctx.save();
    ctx.lineWidth = Math.max(1, (ts*0.06)/zoom);
    ctx.strokeStyle = 'rgba(0,255,255,0.9)';
    ctx.setLineDash([ts*0.6, ts*0.3]);
    drawCircle(ctx, cxPx, cyPx, rPx);
    ctx.restore();
  }

  // ----------------------------------------------------------------------------
  // Renderer Hooks (werden von game.map.js aufgerufen!)
  // ----------------------------------------------------------------------------

  function drawOnMainCanvas(ctx, cam){
    drawWorkAreas(ctx, cam);
  }

  function drawWorld(ctx, opts){
    const cam = window.GameCamera || {x:0,y:0,zoom:1};
    drawWorkAreas(ctx, cam);
  }

  // ----------------------------------------------------------------------------
  // Menü-Events (cb:building:menu-open)
  // ----------------------------------------------------------------------------

  function handleBuildingMenuOpen(ev){
    const d = ev.detail;
    if (!d) return;

    currentBuilding = {
      id: d.id,
      buildingId: d.buildingId,
      x: d.x,
      y: d.y,
      w: d.w,
      h: d.h
    };

    getOrCreateAreaFor(currentBuilding);
  }

  window.addEventListener('cb:building:menu-open', handleBuildingMenuOpen);

  // ----------------------------------------------------------------------------
  // EXPORT
  // ----------------------------------------------------------------------------

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

  INFO('bereit v25.12.09-workarea-core-final');
})();
