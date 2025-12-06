/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.06-workarea-maincanvas-v3
 *
 * Zweck   :
 *   - Verwalten von Arbeitsbereichen (WorkAreas) für Produktionsgebäude
 *   - Aktuell: Holzfäller (b.lumberjack), Steinbruch (b.quarry), Fischer (b.fish)
 *
 * WICHTIG:
 *   - KEIN OverlayHooks / KEIN eigener Overlay-Canvas mehr.
 *   - Die Kreise werden direkt auf dem HAUPT-CANVAS gezeichnet,
 *     also mit genau derselben Kamera-Transform wie die Gebäude.
 *
 * API (global, wird von anderen Modulen benutzt):
 *   window.GameWorkArea = {
 *     areas,                         // Map<uid, WorkArea>
 *     ensureDefaultForBuilding(b),   // Standard-Bereich für Gebäude anlegen/aktualisieren
 *     startSelectionForBuilding(d),  // Auswahlmodus starten (Gebäude-Menü)
 *     applySelectionTile(tx, ty),    // Klick auf Karte anwenden (input-core)
 *     isSelecting(),                 // ob wir gerade im Auswahlmodus sind
 *     drawOnMainCanvas(ctx)          // aus game.renderer.js aufgerufen
 *   }
 * ============================================================================ */

(() => {
  'use strict';

  const TAG  = '[workarea]';
  const LOG  = (...a) => (window.CBLog?.info  ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // KONFIGURATION
  // ---------------------------------------------------------------------------

  /** Welche Gebäude unterstützen überhaupt Arbeitsbereiche? */
  const SUPPORTED_IDS = new Set([
    'b.lumberjack',
    'b.quarry',
    'b.fish'
    // Weitere Gebäude später ergänzen (z. B. 'b.hq' etc.)
  ]);

  /** Standard-Radius in Tiles um das Gebäude herum */
  const DEFAULT_RADIUS_TILES = 4;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * WorkArea-Objekt:
   *   {
   *     uid        : string,
   *     buildingId : string,   // z.B. 'b.lumberjack'
   *     x, y       : number,   // Gebäude-Start (Tiles)
   *     w, h       : number,   // Gebäude-Größe (Tiles)
   *     cx, cy     : number,   // Zentrum (Tiles)
   *     radiusTiles: number,   // Radius in Tiles
   *     selected   : boolean   // aktuell im Auswahlmodus?
   *   }
   */
  const areas = new Map();      // Map<uid, WorkArea>
  let selectingUid = null;      // UID des Bereichs, der gerade editiert wird

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN (Tilegröße, Normalisierung, UID)
  // ---------------------------------------------------------------------------

  /** Liefert die Tilegröße in Pixeln (Fallback 64) */
  function getTileSize() {
  // Offizielle Quelle: GameMap._state.tileSize
  try {
    const ts = window.GameMap?._state?.tileSize;
    if (Number.isFinite(ts)) return ts;
  } catch {}

  // Fallback auf GameCore/Game falls gesetzt
  try {
    const game = window.GameCore || window.Game;
    if (Number.isFinite(game?.map?.tileSize)) return game.map.tileSize | 0;
    if (Number.isFinite(game?.tileSize)) return game.tileSize | 0;
  } catch {}

  return 64; // endgültiger Fallback
}

  /** Kleinere Helper, um ein Zahl-Fallback zu bekommen */
  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Gebäude-Objekt aus verschiedenen Detail-Strukturen extrahieren */
  function normalizeBuilding(input) {
    if (!input) return null;
    // Manche Events liefern { detail: {...} }, andere { building: {...} }
    const d = input.building || input.detail || input;
    if (!d) return null;
    return d;
  }

  /** Erzeugt eine stabile UID für ein Gebäude */
  function getUidForBuilding(b) {
    if (!b) return null;
    if (b.uid) return String(b.uid);   // falls vorhanden → immer bevorzugen

    const id = b.id || b.buildingId || b.type || b.kind || 'building';
    const x  = (b.x ?? b.tx ?? 0) | 0;
    const y  = (b.y ?? b.ty ?? 0) | 0;
    return `${id}@${x},${y}`;
  }

  /** Area-Objekt sicher in die Map schreiben (merge mit bestehenden Werten) */
  function setArea(uid, partial) {
    if (!uid) return null;
    const prev = areas.get(uid) || {};
    const next = {
      uid,
      buildingId : partial.buildingId || prev.buildingId || 'unknown',
      x          : num(partial.x,          prev.x ?? 0),
      y          : num(partial.y,          prev.y ?? 0),
      w          : num(partial.w,          prev.w ?? 1),
      h          : num(partial.h,          prev.h ?? 1),
      cx         : num(partial.cx,         prev.cx ?? 0),
      cy         : num(partial.cy,         prev.cy ?? 0),
      radiusTiles: num(
        partial.radiusTiles,
        prev.radiusTiles ?? DEFAULT_RADIUS_TILES
      ),
      selected   : partial.selected ?? prev.selected ?? false
    };
    areas.set(uid, next);
    return next;
  }

  // ---------------------------------------------------------------------------
  // AREA-ERZEUGUNG & SYNC MIT GEBÄUDEN
  // ---------------------------------------------------------------------------

  /**
   * Sorgt dafür, dass für dieses Gebäude ein Standard-WorkArea existiert.
   * WICHTIG:
   *   - Wenn es schon eine Area für diese UID gibt, wird sie
   *     AKTUALISIERT (Koordinaten & Größe werden nachgezogen).
   *     → verhindert den "0,0"-Bug, falls vorher ein Ghost-/Preview-Build
   *       mit falschen Koordinaten durchgerutscht ist.
   */
  function ensureDefaultForBuilding(buildInput) {
    const b = normalizeBuilding(buildInput);
    if (!b) return null;

    const id = b.id || b.buildingId || b.type || b.kind;
    if (!id || !SUPPORTED_IDS.has(id)) return null;

    const uid = getUidForBuilding(b);
    if (!uid) return null;

    const x = (b.x ?? b.tx ?? 0) | 0;
    const y = (b.y ?? b.ty ?? 0) | 0;
    const w = (b.w || b.width  || 3) | 0;
    const h = (b.h || b.height || 3) | 0;

    // Zentrum des Gebäudes (Mitte der Fläche)
    const cx = x + w / 2;
    const cy = y + h / 2;

    const existing = areas.get(uid);

    const area = setArea(uid, {
      buildingId : id,
      x, y, w, h,
      cx,
      cy,
      // Radius & "selected" übernehmen, falls bereits gesetzt
      radiusTiles: existing?.radiusTiles ?? DEFAULT_RADIUS_TILES,
      selected   : existing?.selected   ?? false
    });

    LOG(existing ? 'WorkArea aktualisiert' : 'Standard-WorkArea angelegt', area);
    return area;
  }

  /**
   * Synchronisiert die Areas grob mit der aktuellen Game-Building-Liste.
   * Wird beim Zeichnen regelmäßig aufgerufen (leichtgewichtig).
   */
  function syncAreasFromGameBuildings() {
    try {
      const game = window.GameCore || window.Game;
      const list = game?.buildings;
      if (!Array.isArray(list) || !list.length) return;

      for (const b of list) {
        const id = b.id || b.buildingId || b.type || b.kind;
        if (!id || !SUPPORTED_IDS.has(id)) continue;
        ensureDefaultForBuilding(b); // aktualisiert jetzt auch bestehende Areas
      }
    } catch (e) {
      WARN('syncAreasFromGameBuildings Fehler:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // SELEKTION / INTERAKTION
  // ---------------------------------------------------------------------------

  /** Wird z. B. vom Gebäude-Menü aufgerufen („Arbeitsbereich setzen“). */
  function startSelectionForBuilding(detail) {
    const area = ensureDefaultForBuilding(detail);
    if (!area) {
      WARN('startSelectionForBuilding: kein gültiger Bereich für', detail);
      return;
    }

    selectingUid = area.uid;

    // Nur dieser Bereich ist "selected"
    for (const a of areas.values()) {
      a.selected = (a.uid === selectingUid);
    }

    LOG('Arbeitsbereich-Auswahl gestartet', {
      uid : area.uid,
      id  : area.buildingId,
      cx  : area.cx,
      cy  : area.cy
    });
  }

  /** Wird vom Input-System bei einem Kartenklick im Auswahlmodus genutzt. */
  function applySelectionTile(tx, ty) {
    if (!selectingUid || !areas.has(selectingUid)) return;

    const area = areas.get(selectingUid);
    // Zentrum auf die Mitte der angeklickten Tile setzen
    area.cx = tx + 0.5;
    area.cy = ty + 0.5;

    LOG('Arbeitsbereich verschoben', {
      uid  : area.uid,
      id   : area.buildingId,
      cx   : area.cx,
      cy   : area.cy,
      tileX: tx,
      tileY: ty
    });

    // Später nutzbar für Holz/Stein/Fisch-Module
    try {
      window.dispatchEvent(new CustomEvent('cb:workarea:set', {
        detail: {
          id          : area.buildingId,
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
    } catch (e) {
      WARN('cb:workarea:set konnte nicht gesendet werden:', e);
    }
  }

  /** Wird vom input-core abgefragt, ob wir Klicks an applySelectionTile leiten. */
  function isSelecting() {
    return !!selectingUid;
  }

  // ---------------------------------------------------------------------------
  // ZEICHNEN AUF DEM HAUPT-CANVAS
  // ---------------------------------------------------------------------------

  /**
   * Zeichnet alle Arbeitsbereiche direkt auf dem Haupt-Canvas.
   *
   * WICHTIG:
   *   - Wird von game.renderer.js aufgerufen, solange die Kamera-Transform
   *     noch AKTIV ist (also VOR ctx.restore()).
   *   - Alle Koordinaten hier sind Welt-Koordinaten (Tiles * tileSize).
   *   - Daher ist KEINE eigene Kamera- oder dpr-Rechnung nötig.
   */
  function drawOnMainCanvas(ctx /*, camIgnored */) {
    if (!ctx) return;

    // Fallback-Sync, falls ein cb:build:complete verpasst wurde
    syncAreasFromGameBuildings();
    if (!areas.size) return;

    const TILE = getTileSize();

    ctx.save();

    for (const area of areas.values()) {
      if (!area) continue;

      const worldCx  = area.cx * TILE;
      const worldCy  = area.cy * TILE;
      const radiusPx = (area.radiusTiles || DEFAULT_RADIUS_TILES) * TILE;

      const selected = !!area.selected;

      // Hintergrund-Kreis (gestrichelt)
      ctx.beginPath();
      ctx.arc(worldCx, worldCy, radiusPx, 0, Math.PI * 2, false);
      ctx.lineWidth   = 2;
      ctx.strokeStyle = 'rgba(50, 150, 220, 0.35)';
      ctx.setLineDash([6, 6]);
      ctx.stroke();

      // Wenn ausgewählt → kräftiger Rand + Punkt
      if (selected) {
        ctx.beginPath();
        ctx.arc(worldCx, worldCy, radiusPx, 0, Math.PI * 2, false);
        ctx.lineWidth   = 4;
        ctx.strokeStyle = 'rgba(80, 220, 255, 0.95)';
        ctx.setLineDash([10, 6]);
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.arc(worldCx, worldCy, 6, 0, Math.PI * 2, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // EVENTS: Gebäude-Fertigstellung → Default-Bereich anlegen/aktualisieren
  // ---------------------------------------------------------------------------

  try {
    window.addEventListener('cb:build:complete', (ev) => {
      try {
        // WICHTIG: aktualisiert jetzt auch schon vorhandene Areas
        ensureDefaultForBuilding(ev && ev.detail);
      } catch (e) {
        WARN('cb:build:complete → ensureDefaultForBuilding Fehler:', e);
      }
    }, { passive: true });
  } catch (e) {
    WARN('cb:build:complete-Listener konnte nicht registriert werden:', e);
  }

  // ---------------------------------------------------------------------------
  // DEBUG-/PRODUKTIONS-API
  // ---------------------------------------------------------------------------

  window.GameWorkArea = {
    areas,
    ensureDefaultForBuilding,
    startSelectionForBuilding,
    applySelectionTile,
    isSelecting,
    drawOnMainCanvas
  };

  LOG('WorkArea-Modul geladen (v25.12.06-workarea-maincanvas-v3)');
})();
