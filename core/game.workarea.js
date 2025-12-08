/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.08-workarea-core-v3-optionA
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
 *         → wird von core.input.js bei Klick auf die Karte aufgerufen
 *       GameWorkArea.getAreaFor(detailOrUid)
 *         → liefert aktuellen Bereich für Holz-/Stein-Module
 *
 *   - Events:
 *       cb:workarea:set(detail)
 *         detail: {
 *           id, buildingId, uid,
 *           x,y,w,h,
 *           cx,cy,
 *           radiusTiles
 *         }
 *
 * Hinweise:
 *   - Diese Datei enthält KEINE generelle Input-Logik.
 *     Maus / Pointer wird ausschließlich in core.input.js behandelt.
 *   - Hier geht es nur um:
 *       → Verwalten der WorkArea-Daten
 *       → Default-Position (Option A)
 *       → Dispatch von cb:workarea:set
 *       → Zeichnen auf dem Main-Canvas (Renderer-Hook)
 * ========================================================================== */

(function(){
  'use strict';

  // --------------------------------------------------------------------------
  //  KURZ-HILFSFUNKTIONEN (LOGGING)
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
  // HILFSFUNKTIONEN
  // --------------------------------------------------------------------------

  /**
   * Einheitliche UID-Erzeugung für Gebäude.
   *
   * WICHTIG:
   *   - Wenn detail.uid vorhanden ist → NUR das benutzen
   *   - Sonst: "<id>@<x>,<y>"
   */
  function makeUid(detail){
    if (!detail) return null;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || 'building';
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
  }

  /**
   * Standard-Startposition für den Arbeitsbereich (Option A):
   *
   *  - Mittelpunkt liegt UNTER dem Gebäude
   *  - Horizontal mittig (bei 3×3 also x+1)
   *  - Vertikal genau eine Tile unter der Gebäude-Unterkante
   *
   * Beispiel:
   *   Gebäude 3×3 bei (x=10,y=5)
   *   → center.cx = 10 + 1
   *   → center.cy = 5 + 3
   */
  function computeDefaultCenter(detail){
    const x = detail.x | 0;
    const y = detail.y | 0;
    const w = (detail.w | 0) || 3;
    const h = (detail.h | 0) || 3;

    return {
      cx: x + Math.floor(w / 2),
      cy: y + h
    };
  }

  /**
   * Inneres Helper: Sorgt dafür, dass es für dieses Gebäude einen Eintrag gibt.
   */
  function getOrCreateAreaFor(detail){
    const uid = makeUid(detail);
    if (!uid){
      WARN('getOrCreateAreaFor: keine uid aus detail ableitbar', detail);
      return null;
    }

    let area = areasByUid.get(uid);
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
      INFO('Neue WorkArea angelegt', uid, area);
    }
    return area;
  }

  /**
   * Öffentliche Variante: Akzeptiert entweder eine uid (string)
   * oder ein detail-Objekt ({id,x,y,w,h,uid?}).
   *
   * Wird u. a. vom Holz-/Stein-Modul genutzt, um den gleichen
   * Arbeitsbereich zu sehen.
   */
  function getAreaFor(detailOrUid){
    if (!detailOrUid) return null;

    if (typeof detailOrUid === 'string'){
      return areasByUid.get(detailOrUid) || null;
    }
    return getOrCreateAreaFor(detailOrUid);
  }

  /**
   * cb:workarea:set Event feuern.
   *
   * Wird immer dann aufgerufen, wenn sich der Bereich ändert
   * (z. B. bei applySelectionTile oder beim ersten beginSelection).
   */
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

    try{
      INFO('cb:workarea:set →', detail);
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

    // Beim Start sofort einmal den aktuellen Bereich rausfeuern,
    // damit Produktionsmodule einen gültigen Default haben.
    dispatchWorkAreaSet(area);
  }

  /**
   * Wird von core.input.js aufgerufen, wenn auf die Karte geklickt wird
   * und GameWorkArea.isSelecting() === true ist.
   *
   * tx,ty: Tile-Koordinaten der Karte.
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

    // Ein Klick = setzen & fertig
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

  /**
   * Gemeinsame Zeichnen-Funktion:
   *   - ctx: Canvas-Context (Haupt-Canvas oder Overlay)
   *   - cam: {x,y,zoom} – i. d. R. GameCamera.getState()
   */
  function drawAreas(ctx, cam, tileSize){
    if (!ctx || !cam || !tileSize) return;

    ctx.save();
    try{
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';

      for (const area of areasByUid.values()){
        const ts   = tileSize * cam.zoom;
        const cxPx = (area.cx - cam.x) * ts + ts / 2;
        const cyPx = (area.cy - cam.y) * ts + ts / 2;
        const rPx  = (area.radiusTiles || DEFAULT_RADIUS) * ts;

        drawCircle(ctx, cxPx, cyPx, rPx);
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Convenience für den Renderer:
   *   Kann z. B. aus game.renderer.js aufgerufen werden:
   *
   *     GameWorkArea.drawOnMainCanvas(mainCtx, GameCamera.getState(), tileSize);
   */
  function drawOnMainCanvas(ctx, cam, tileSize){
    drawAreas(ctx, cam, tileSize);
  }

  // --------------------------------------------------------------------------
  //  EVENTS VOM SPIEL (z. B. Gebäude-Menü öffnen)
  // --------------------------------------------------------------------------

  /**
   * Gebäude-Menü wurde geöffnet → aktuelle Gebäude-Infos merken,
   * damit beginSelection() auch ohne Detail-Parameter funktioniert.
   */
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

    // Sicherstellen, dass es für dieses Gebäude auch eine WorkArea gibt
    getOrCreateAreaFor(currentBuilding);
  }

  // Bei Bedarf könnte man hier noch auf cb:build:complete etc. hören,
  // um WorkAreas automatisch anzulegen. Aktuell reicht das Menü-Ereignis.

  // --------------------------------------------------------------------------
  //  INITIALISIERUNG / EVENT-VERKABELUNG
  // --------------------------------------------------------------------------

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
    getAreaForUid(uid){ return areasByUid.get(uid) || null; },
    drawOnMainCanvas,          // für Renderer.draw(...)
    _areas: areasByUid,
    _lastHoverTile: () => lastHoverTile
  };

  LOG('GameWorkArea bereit v25.12.08-workarea-core-v3-optionA');

})();
