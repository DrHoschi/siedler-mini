/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.05-workarea-v5-sync-camera+select
 *
 * Zweck   :
 *   - Verwaltet Arbeitsbereiche (WorkAreas) für Produktionsgebäude
 *   - Unterstützt:
 *       • Holzfäller (b.lumberjack)
 *       • Steinbruch (b.quarry)   [Vorbereitung]
 *       • Fischer   (b.fisher)    [Vorbereitung]
 *
 *   - Legt zu jedem unterstützten Gebäude einen WorkArea-Eintrag an
 *   - Zeichnet Kreise im Overlay-Layer "workareas"
 *   - Auswahlmodus: Klick auf "Arbeitsbereich setzen" im Gebäude-Menü
 *       → Kreis wird hervorgehoben
 *       → nächster Klick auf die Karte verschiebt den Mittelpunkt
 *       → Event cb:workarea:set wird gesendet
 * ========================================================================== */

(() => {
  'use strict';

  const TAG  = '[workarea]';
  const LOG  = (...a) => (window.CBLog?.info  ?? console.log )(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  ?? console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error ?? console.error)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // KONFIGURATION
  // ---------------------------------------------------------------------------

  /** Welche Gebäude haben überhaupt einen Arbeitsbereich? */
  const SUPPORTED_IDS = new Set([
    'b.lumberjack',
    'b.quarry',
    'b.fisher'
  ]);

  /** Fallback-Radius (in Tiles), falls nichts in der Registry steht. */
  function getDefaultRadius(id) {
    switch (id) {
      case 'b.lumberjack': return 5.0;
      case 'b.quarry'    : return 4.5;
      case 'b.fisher'    : return 4.5;
      default            : return 4.0;
    }
  }

  /** Registry-Eintrag des Gebäudes lesen (falls vorhanden). */
  function getBuildingConfig(id) {
    try {
      const all = window.GameRegistry?.buildings || window.Registry?.buildings;
      if (!all) return null;
      return all[id] || null;
    } catch (e) {
      WARN('Building-Config nicht lesbar', e);
      return null;
    }
  }

  /** Kleine Helper für Zahlen mit Fallback. */
  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * WorkArea-Objekt:
   *   {
   *     id          : 'b.lumberjack' | 'b.quarry' | 'b.fisher',
   *     uid         : string,
   *     x, y        : Gebäude-Start (Tiles),
   *     w, h        : Gebäude-Größe (Tiles),
   *     cx, cy      : Zentrum (Tiles),
   *     radiusTiles : number,
   *     selected    : boolean
   *   }
   */
  const areas = new Map();      // Map<uid, WorkArea>
  let currentSelectionUid = null;
  let selectionActive     = false;

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN – TILESIZE + KAMERA
  // ---------------------------------------------------------------------------

  /** Tilegröße aus Map / Game holen (Fallback 64). */
  function getTileSize() {
    try {
      const game = window.GameCore || window.Game;
      if (game?.map?.tileSize) return game.map.tileSize | 0;
      if (game?.tileSize)      return game.tileSize | 0;
    } catch {}
    return 64;
  }

  /** Kamera-Status vom neuen Kamera-Modul holen (x,y,zoom). */
  function getCameraState() {
    try {
      if (window.GameCamera && typeof window.GameCamera.getState === 'function') {
        return window.GameCamera.getState();
      }
    } catch (e) {
      WARN('GameCamera.getState() Fehler', e);
    }
    return { x: 0, y: 0, zoom: 1 };
  }

  // ---------------------------------------------------------------------------
  // AREA-ERZEUGUNG & SYNC MIT GEBÄUDEN
  // ---------------------------------------------------------------------------

  /** UID für ein Gebäude bestimmen (stabil, wenn möglich). */
  function getUidForBuilding(b) {
    if (!b) return null;
    if (b.uid) return String(b.uid);
    const id = b.id || b.buildingId || b.type || b.kind || 'building';
    const x  = (b.x ?? b.tx ?? 0) | 0;
    const y  = (b.y ?? b.ty ?? 0) | 0;
    return `${id}@${x},${y}`;
  }

  /**
   * ensureAreaForBuilding(detail)
   *  - Sorgt dafür, dass für das Gebäude ein WorkArea-Objekt existiert.
   *  - Nutzt Registry-Infos (workArea.radiusTiles), sonst Fallback.
   */
  function ensureAreaForBuilding(detail) {
    if (!detail) return null;

    const id = detail.id || detail.buildingId || detail.type || detail.kind;
    if (!id || !SUPPORTED_IDS.has(id)) return null;

    const uid = detail.uid || getUidForBuilding(detail);
    if (!uid) return null;

    // Wenn schon vorhanden → direkt zurück
    const existing = areas.get(uid);
    if (existing) return existing;

    const x = (detail.x ?? detail.tx ?? 0) | 0;
    const y = (detail.y ?? detail.ty ?? 0) | 0;
    const w = (detail.w || detail.width  || 3) | 0;
    const h = (detail.h || detail.height || 3) | 0;

    // Zentrum des Gebäudes (Mitte der 3x3-Fläche usw.)
    const cx0 = x + w / 2;
    const cy0 = y + h / 2;

    // Radius aus Registry lesen
    const cfg         = getBuildingConfig(id);
    const radiusTiles = num(cfg?.workArea?.radiusTiles, getDefaultRadius(id));

    const area = {
      id,
      uid,
      x,
      y,
      w,
      h,
      cx         : cx0,
      cy         : cy0,
      radiusTiles,
      selected   : false
    };

    areas.set(uid, area);
    LOG('WorkArea angelegt', area);
    return area;
  }

  /**
   * syncAreasFromGameBuildings()
   *  - Wird beim Zeichnen aufgerufen, damit auch alte Builds
   *    einen Kreis bekommen, wenn Events verpasst wurden.
   */
  function syncAreasFromGameBuildings() {
    try {
      const game = window.GameCore || window.Game;
      const list = game?.buildings;
      if (!Array.isArray(list)) return;

      for (const b of list) {
        if (!b) continue;
        const id = b.id || b.buildingId || b.type || b.kind;
        if (!id || !SUPPORTED_IDS.has(id)) continue;
        ensureAreaForBuilding(b);
      }
    } catch (e) {
      WARN('syncAreasFromGameBuildings Fehler', e);
    }
  }

  // ---------------------------------------------------------------------------
  // SELEKTION / KLICKS
  // ---------------------------------------------------------------------------

  /**
   * Wird vom Gebäude-Menü aufgerufen („Arbeitsbereich setzen“).
   */
  function startSelectionForBuilding(detail) {
    const area = ensureAreaForBuilding(detail);
    if (!area) {
      WARN('startSelectionForBuilding: kein gültiger Bereich für', detail?.id);
      return;
    }

    currentSelectionUid = area.uid;
    selectionActive     = true;

    for (const a of areas.values()) {
      a.selected = (a.uid === currentSelectionUid);
    }

    // WorkArea-Layer sicher aktivieren
    try {
      if (window.OverlayHooks && typeof OverlayHooks.enable === 'function') {
        OverlayHooks.enable('workareas', true);
      }
    } catch {}

    LOG('Arbeitsbereich selektiert (Selection-Modus aktiv)', {
      id : area.id,
      uid: area.uid,
      cx : area.cx,
      cy : area.cy,
      r  : area.radiusTiles
    });
  }

  /**
   * applySelectionTile(tx, ty)
   *  - wird vom Input-System aufgerufen, wenn im Selection-Modus
   *    auf eine Karte-Tile geklickt wird.
   *  - verschiebt NUR das Zentrum (cx,cy)
   *  - sendet cb:workarea:set für das Produktions-Modul
   */
  function applySelectionTile(tx, ty) {
    if (!selectionActive || currentSelectionUid == null) return;
    const area = areas.get(currentSelectionUid);
    if (!area) return;

    // Mittelpunkt auf Tile-Mitte setzen ( +0.5 )
    const newCx = tx + 0.5;
    const newCy = ty + 0.5;

    const dx   = newCx - area.cx;
    const dy   = newCy - area.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    area.cx = newCx;
    area.cy = newCy;

    LOG('Arbeitsbereich verschoben', {
      uid   : area.uid,
      id    : area.id,
      cx    : area.cx,
      cy    : area.cy,
      radius: area.radiusTiles,
      dist
    });

    // Produktions-Module informieren (Holz, Stein, Fisch, …)
    try {
      window.dispatchEvent(new CustomEvent('cb:workarea:set', {
        detail: {
          id          : area.id,
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
      WARN('cb:workarea:set konnte nicht gesendet werden', e);
    }
  }

  /** Wird vom Input-System abgefragt, ob gerade Auswahl aktiv ist. */
  function isSelecting() {
    return !!selectionActive;
  }

  // ---------------------------------------------------------------------------
  // ZEICHNEN DES OVERLAY-LAYERS
  // ---------------------------------------------------------------------------

  function drawAreas(ctx, cam) {
    if (!ctx) return;

    // Fallback-Sync (falls ein cb:build:complete verpasst wurde)
    syncAreasFromGameBuildings();
    if (!areas.size) return;

    const camState = cam || getCameraState();
    const camX = num(camState.x,    0);
    const camY = num(camState.y,    0);
    const zoom = num(camState.zoom, 1);

    const TILE = getTileSize();

    ctx.save();
    // Overlay läuft im Screen-Space → keine weitere Transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    for (const area of areas.values()) {
      const worldCx = area.cx * TILE;
      const worldCy = area.cy * TILE;

      const screenCx = (worldCx - camX) * zoom;
      const screenCy = (worldCy - camY) * zoom;
      const screenR  = area.radiusTiles * TILE * zoom;

      // Nur zeichnen, wenn im Sichtbereich
      if (screenCx + screenR < 0) continue;
      if (screenCy + screenR < 0) continue;
      if (screenCx - screenR > ctx.canvas.width)  continue;
      if (screenCy - screenR > ctx.canvas.height) continue;

      const selected = !!area.selected;

      ctx.beginPath();
      ctx.arc(screenCx, screenCy, screenR, 0, Math.PI * 2, false);

      if (selected) {
        ctx.lineWidth   = 4;
        ctx.strokeStyle = 'rgba(80,200,255,0.9)';
        ctx.setLineDash([8 * zoom, 6 * zoom]);
      } else {
        ctx.lineWidth   = 2;
        ctx.strokeStyle = 'rgba(50,150,220,0.7)';
        ctx.setLineDash([6 * zoom, 6 * zoom]);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // REGISTRIERUNG BEI OverlayHooks
  // ---------------------------------------------------------------------------

  function registerOverlayLayer() {
    if (!window.OverlayHooks || typeof OverlayHooks.register !== 'function') {
      return false;
    }
    try {
      OverlayHooks.register('workareas', (ctx, cam) => {
        drawAreas(ctx, cam);
      });
      // Standardmäßig eingeschaltet
      if (typeof OverlayHooks.enable === 'function') {
        OverlayHooks.enable('workareas', true);
      }
      LOG('Overlay-Layer "workareas" registriert');
      return true;
    } catch (e) {
      WARN('Overlay-Layer-Registrierung fehlgeschlagen', e);
      return true; // kein weiterer Retry
    }
  }

  // Direkt versuchen + ggf. ein paar Mal nachschieben
  if (!registerOverlayLayer()) {
    let tries    = 0;
    const maxTry = 20;
    const t      = setInterval(() => {
      tries++;
      if (registerOverlayLayer() || tries >= maxTry) {
        clearInterval(t);
      }
    }, 200);
  }

  // ---------------------------------------------------------------------------
  // EVENT: cb:build:complete → Default-Area anlegen
  // ---------------------------------------------------------------------------

  try {
    window.addEventListener('cb:build:complete', (ev) => {
      const d = ev?.detail || {};
      const b = d.building || d;
      if (!b) return;

      const id = b.id || b.buildingId || b.type || b.kind;
      if (!id || !SUPPORTED_IDS.has(id)) return;

      LOG('cb:build:complete → ensureAreaForBuilding', {
        id,
        x: b.x, y: b.y, w: b.w, h: b.h
      });

      ensureAreaForBuilding({
        id,
        uid: b.uid || b.instanceId || b.buildingUid || getUidForBuilding(b),
        x  : b.x | 0,
        y  : b.y | 0,
        w  : b.w || 1,
        h  : b.h || 1
      });
    }, { passive: true });
  } catch (e) {
    WARN('cb:build:complete-Listener konnte nicht registriert werden', e);
  }

  // ---------------------------------------------------------------------------
  // GLOBAL API
  // ---------------------------------------------------------------------------

  window.GameWorkArea = {
    areas,
    ensureDefaultForBuilding : ensureAreaForBuilding, // kompatibler Name
    startSelectionForBuilding,
    applySelectionTile,
    isSelecting
  };

  LOG('WorkArea-Modul geladen (v25.12.05-workarea-v5-sync-camera+select)');
})();
