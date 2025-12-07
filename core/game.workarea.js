/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.07-workarea-core-v1
 *
 * Zweck   :
 *   Zentrale Verwaltung der ARBEITSBEREICHE (WorkAreas) für Gebäude:
 *
 *   - Pro Gebäude (uid) wird ein Arbeitskreis verwaltet:
 *       { id, uid, x, y, w, h, cx, cy, radiusTiles }
 *
 *   - API:
 *       GameWorkArea.beginSelection(buildingDetail)
 *         → wird vom Gebäude-Menü aufgerufen ("Arbeitsbereich setzen")
 *       GameWorkArea.isSelecting()
 *         → wird von core.input.js abgefragt
 *       GameWorkArea.applySelectionTile(tx,ty)
 *         → wird von core.input.js beim Kartenklick aufgerufen
 *       GameWorkArea.cancelSelection()
 *
 *   - Ereignisse:
 *       IN :
 *         cb:building:menu-open(detail)
 *           → aktuelles Gebäude merken (für Button-Aufrufe)
 *
 *       OUT:
 *         cb:workarea:set(detail)
 *           detail = {
 *             id, buildingId, uid,
 *             x, y, w, h,
 *             cx, cy,
 *             radiusTiles
 *           }
 *
 *   - Overlay:
 *       Zeichnet einfache Kreise um die Arbeitsbereiche (Option „workarea“
 *       über OverlayHooks).
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[workarea]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console, TAG);

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  /** Map<uid, WorkAreaState> */
  const areasByUid = new Map();

  /** Aktuelles Gebäude aus dem Menü (cb:building:menu-open) */
  let currentBuilding = null;

  /** Aktive Auswahl (wenn der Benutzer gerade einen Bereich setzen will) */
  let selecting   = false;
  let selectingUid = null;

  /** Letzte Hover-Tile (für spätere Erweiterungen, z.B. Live-Vorschau) */
  let lastHoverTile = null;

  const DEFAULT_RADIUS = 3; // in Tiles

  // --------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // --------------------------------------------------------------------------

  function makeUid(detail){
    const id = detail.id || detail.buildingId || detail.kind || 'building';
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return detail.uid || `${id}@${x},${y}`;
  }

  function computeDefaultCenter(detail){
    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;
    return {
      cx: x + w / 2,
      cy: y + h / 2
    };
  }

  function getOrCreateAreaFor(detail){
    const uid = makeUid(detail);
    let area  = areasByUid.get(uid);

    if (!area){
      const center = computeDefaultCenter(detail);
      area = {
        id   : detail.id || detail.buildingId || detail.kind || 'building',
        uid,
        x    : detail.x | 0,
        y    : detail.y | 0,
        w    : (detail.w | 0) || 3,
        h    : (detail.h | 0) || 3,
        cx   : center.cx,
        cy   : center.cy,
        radiusTiles: DEFAULT_RADIUS
      };
      areasByUid.set(uid, area);
    }

    return area;
  }

  function dispatchWorkAreaSet(area){
    if (!area) return;

    const detail = {
      id         : area.id,
      buildingId : area.id,
      uid        : area.uid,
      x          : area.x,
      y          : area.y,
      w          : area.w,
      h          : area.h,
      cx         : area.cx,
      cy         : area.cy,
      radiusTiles: area.radiusTiles
    };

    LOG('cb:workarea:set →', detail);

    try{
      window.dispatchEvent(new CustomEvent('cb:workarea:set', { detail }));
    } catch(e){
      WARN('cb:workarea:set dispatch fehlgeschlagen', e);
    }
  }

  // --------------------------------------------------------------------------
  //  API: Auswahl starten / anwenden / abbrechen
  // --------------------------------------------------------------------------

  /**
   * Wird vom Gebäude-Menü aufgerufen, wenn der Benutzer auf
   * "Arbeitsbereich setzen" klickt.
   *
   * Erwartet detail aus cb:building:menu-open:
   *   { id, uid?, x, y, w, h, ... }
   */
  function beginSelection(detail){
    const d = detail || currentBuilding;
    if (!d){
      WARN('beginSelection ohne gültiges Building-Detail aufgerufen');
      return;
    }

    const area = getOrCreateAreaFor(d);

    selecting    = true;
    selectingUid = area.uid;
    currentBuilding = d;

    LOG('Selection gestartet für', area.uid, area);

    // Beim Start sofort einmal den aktuellen Bereich rausfeuern,
    // damit Holz/Stein etc. einen gültigen Default haben.
    dispatchWorkAreaSet(area);
  }

  /**
   * Wird von core.input.js aufgerufen, wenn auf die Karte geklickt wird
   * und GameWorkArea.isSelecting() === true ist.
   */
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

    // Optional: Auswahl direkt beenden (ein Klick = setzen & fertig)
    // Wenn du lieber mehrere Klicks erlauben willst, Kommentar entfernen
    // und cancelSelection() NICHT aufrufen.
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
  //  OVERLAY-ZEICHNUNG (KREISE)
  // --------------------------------------------------------------------------

  function drawCircle(ctx, xPx, yPx, rPx){
    ctx.beginPath();
    ctx.arc(xPx, yPx, rPx, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawWorkAreas(ctx, cam){
    if (!ctx) return;
    if (!areasByUid.size) return;

    const zoom = cam?.zoom ?? 1;
    const oxPx = cam?.x    ?? 0;
    const oyPx = cam?.y    ?? 0;

    const ts =
      (window.Game?.map?.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      64;

    ctx.save();
    ctx.translate(-oxPx * zoom, -oyPx * zoom);
    ctx.scale(zoom, zoom);

    for (const area of areasByUid.values()){
      const cxPx = area.cx * ts;
      const cyPx = area.cy * ts;
      const rPx  = (area.radiusTiles || DEFAULT_RADIUS) * ts;

      ctx.save();

      // aktiver Bereich etwas fetter / heller
      const active = (selecting && area.uid === selectingUid);
      ctx.lineWidth   = active ? Math.max(2, ts * 0.08) : Math.max(1, ts * 0.05);
      ctx.strokeStyle = active
        ? 'rgba(0, 255, 255, 0.9)'
        : 'rgba(255, 255, 255, 0.7)';
      ctx.setLineDash(active ? [ts * 0.4, ts * 0.2] : [ts * 0.6, ts * 0.3]);

      drawCircle(ctx, cxPx, cyPx, rPx);

      ctx.restore();
    }

    ctx.restore();
  }

  // Registrierung beim Overlay-System (falls vorhanden)
  (function registerOverlay(){
    function tryRegister(){
      if (!window.OverlayHooks?.register) return false;
      try{
        window.OverlayHooks.register('workarea', (ctx)=>{
          const cam = window.GameCamera?.getState?.() || { x:0, y:0, zoom:1 };
          drawWorkAreas(ctx, cam);
        });
        LOG('WorkArea-Overlay registriert (workarea).');
        return true;
      } catch(e){
        WARN('WorkArea-Overlay Registrierung fehlgeschlagen:', e);
        return true;
      }
    }

    if (tryRegister()) return;
    let tries = 0;
    const t = setInterval(()=>{
      if (tryRegister() || ++tries > 20) clearInterval(t);
    }, 200);
  })();

  // --------------------------------------------------------------------------
  //  EVENT-BINDINGS
  // --------------------------------------------------------------------------

  // Aktuelles Gebäude aus dem Menü merken
  try{
    window.addEventListener('cb:building:menu-open', ev=>{
      const d = ev.detail || {};
      currentBuilding = {
        id      : d.id,
        uid     : d.uid,
        x       : d.x | 0,
        y       : d.y | 0,
        w       : (d.w | 0) || 3,
        h       : (d.h | 0) || 3
      };
      LOG('Building-Menü geöffnet für', currentBuilding);
    }, { passive:true });
  }catch(e){
    WARN('Listener cb:building:menu-open konnte nicht registriert werden:', e);
  }

  // Letzte Hover-Tile merken (für spätere Erweiterungen)
  try{
    window.addEventListener('cb:hover-tile', ev=>{
      lastHoverTile = ev.detail || null;
    }, { passive:true });
  }catch(e){
    WARN('Listener cb:hover-tile konnte nicht registriert werden:', e);
  }

  // --------------------------------------------------------------------------
  //  EXPORT
  // --------------------------------------------------------------------------

  window.GameWorkArea = {
    beginSelection,
    applySelectionTile,
    cancelSelection,
    isSelecting,
    getAreaForUid(uid){ return areasByUid.get(uid) || null; },
    _areas: areasByUid,
    _lastHoverTile: () => lastHoverTile
  };

  LOG('GameWorkArea bereit v25.12.07-workarea-core-v1');

})();
