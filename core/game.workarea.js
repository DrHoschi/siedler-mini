/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.06-workarea-maincanvas-v4
 *
 * Zweck   :
 *   - Verwalten von Arbeitsbereichen (WorkAreas) für Produktionsgebäude
 *   - Aktuell: HQ, Holzfäller (b.lumberjack), Steinbruch (b.quarry), Fischer (b.fish)
 *
 * Wichtig:
 *   - KEIN OverlayHooks / KEIN eigener Overlay-Canvas.
 *   - Die Kreise werden direkt im Welt-Koordinatensystem gezeichnet.
 *   - Integriert wird das Modul von GameMap.render() via drawWorld().
 *
 * Öffentliche API:
 *   window.GameWorkArea = {
 *     areas,                         // Map<uid, WorkArea>
 *     ensureDefaultForBuilding(b),   // Standard-Bereich für Gebäude anlegen
 *     startSelectionForBuilding(d),  // Auswahlmodus starten (Gebäude-Menü)
 *     applySelectionTile(tx, ty),    // Klick auf Karte anwenden (input-core)
 *     isSelecting(),                 // ob wir gerade im Auswahlmodus sind
 *     drawWorld(ctx, opts)           // aus GameMap.render aufrufen
 *   }
 * ============================================================================
 */

(() => {
  'use strict';

  const TAG  = '[workarea]';
  const LOG  = (...a) => (window.CBLog?.info  ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // KONFIGURATION
  // ---------------------------------------------------------------------------

  /** Welche Gebäude unterstützen Arbeitsbereiche? */
  const SUPPORTED_IDS = new Set([
    'b.hq',
    'b.lumberjack',
    'b.quarry',
    'b.fish'
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
    try {
      const game = window.GameCore || window.Game;
      if (game?.map?.tileSize) return game.map.tileSize | 0;
      if (game?.tileSize)      return game.tileSize     | 0;
    } catch {
      /* ignorieren */
    }
    return 64;
  }

  /** Kleinere Helper, um ein Zahl-Fallback zu bekommen */
  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Gebäude-Objekt aus verschiedenen Detail-Strukturen extrahieren */
  function normalizeBuilding(input) {
    if (!input) return null;
    const d = input.building || input.detail || input; // Events liefern detail
    if (!d) return null;
    return d;
  }

  /** Erzeugt eine stabile UID für ein Gebäude */
  function getUidForBuilding(b) {
    if (!b) return null;
    if (b.uid) return String(b.uid);
    const id = b.id || b.buildingId || b.type || b.kind || 'building';
    const x  = (b.x ?? b.tx ?? 0) | 0;
    const y  = (b.y ?? b.ty ?? 0) | 0;
    return `${id}@${x},${y}`;
  }

  /** Area-Objekt sicher in die Map schreiben */
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
      radiusTiles: num(partial.radiusTiles,prev.radiusTiles ?? DEFAULT_RADIUS_TILES),
      selected   : partial.selected ?? prev.selected ?? false
    };
    areas.set(uid, next);
    return next;
  }

  // ---------------------------------------------------------------------------
  // AREA-ERZEUGUNG & SYNC MIT GEBÄUDEN
  // ---------------------------------------------------------------------------

  function ensureDefaultForBuilding(buildInput) {
    const b = normalizeBuilding(buildInput);
    if (!b) return null;

    const id = b.id || b.buildingId || b.type || b.kind;
    if (!id || !SUPPORTED_IDS.has(id)) return null;

    const uid = getUidForBuilding(b);
    if (!uid) return null;

    if (areas.has(uid)) return areas.get(uid);

    const x = (b.x ?? b.tx ?? 0) | 0;
    const y = (b.y ?? b.ty ?? 0) | 0;
    const w = (b.w || b.width  || 3) | 0;
    const h = (b.h || b.height || 3) | 0;

    const cx = x + w / 2;
    const cy = y + h / 2;

    const area = setArea(uid, {
      buildingId : id,
      x, y, w, h,
      cx,
      cy,
      radiusTiles: DEFAULT_RADIUS_TILES,
      selected   : false
    });

    LOG('Standard-WorkArea angelegt', area);
    return area;
  }

  /** Fallback-Sync mit Game.buildings (leichtgewichtig) */
  function syncAreasFromGameBuildings() {
    try {
      const game = window.GameCore || window.Game;
      const list = game?.buildings;
      if (!Array.isArray(list) || !list.length) return;

      for (const b of list) {
        const id = b.id || b.buildingId || b.type || b.kind;
        if (!id || !SUPPORTED_IDS.has(id)) continue;
        ensureDefaultForBuilding(b);
      }
    } catch (e) {
      WARN('syncAreasFromGameBuildings Fehler:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // SELEKTION / INTERAKTION
  // ---------------------------------------------------------------------------

  function startSelectionForBuilding(detail) {
    const area = ensureDefaultForBuilding(detail);
    if (!area) {
      WARN('startSelectionForBuilding: kein gültiger Bereich für', detail);
      return;
    }

    selectingUid = area.uid;

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

  function applySelectionTile(tx, ty) {
    if (!selectingUid || !areas.has(selectingUid)) return;

    const area = areas.get(selectingUid);
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

  function isSelecting() {
    return !!selectingUid;
  }

  // ---------------------------------------------------------------------------
  // ZEICHNEN IM WELT-KOORDINATENSYSTEM (GameMap.render)
  // ---------------------------------------------------------------------------

  /**
   * drawWorld(ctx, opts?)
   *
   * ctx   : 2D-Context des HAUPT-Canvas.
   * opts  : { tileSize?: number } – optional; sonst aus Game.map.tileSize.
   *
   * WICHTIG:
   *   - GameMap.render() hat die Kamera-Transform bereits gesetzt.
   *   - Alle Koordinaten hier sind Weltkoordinaten (Tiles * tileSize).
   */
  function drawWorld(ctx, opts) {
    if (!ctx) return;

    syncAreasFromGameBuildings();
    if (!areas.size) return;

    const TILE = num(opts?.tileSize, getTileSize());

    ctx.save();

    for (const area of areas.values()) {
      if (!area) continue;

      const worldCx  = area.cx * TILE;
      const worldCy  = area.cy * TILE;
      const radiusPx = (area.radiusTiles || DEFAULT_RADIUS_TILES) * TILE;

      const selected = !!area.selected;

      // Hintergrund-Kreis
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth   = 2;
      ctx.strokeStyle = 'rgba(50, 150, 220, 0.35)';
      ctx.arc(worldCx, worldCy, radiusPx, 0, Math.PI * 2, false);
      ctx.stroke();

      if (selected) {
        // kräftiger Rand
        ctx.beginPath();
        ctx.setLineDash([10, 6]);
        ctx.lineWidth   = 4;
        ctx.strokeStyle = 'rgba(80, 220, 255, 0.95)';
        ctx.arc(worldCx, worldCy, radiusPx, 0, Math.PI * 2, false);
        ctx.stroke();

        // Mittelpunkt
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
  // EVENTS: Gebäude-Fertigstellung → Default-Bereich anlegen
  // ---------------------------------------------------------------------------

  try {
    window.addEventListener('cb:build:complete', (ev) => {
      try {
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
    drawWorld
  };

  LOG('WorkArea-Modul geladen (v25.12.06-workarea-maincanvas-v4)');

})();
