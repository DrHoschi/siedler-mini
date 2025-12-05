/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.05-workarea-v4-center-api
 *
 * Zweck   :
 *   - Verwalten von Arbeitsbereichen (WorkAreas) für Produktionsgebäude
 *   - Aktuell: Holzfäller (b.lumberjack), Steinbruch, Fischer
 *
 * Zeichnen:
 *   - Registriert einen Overlay-Layer "workareas" bei OverlayHooks
 *   - Zeichnet pro Gebäude einen Kreis um den Arbeitsbereich
 *   - Der aktuell ausgewählte Bereich wird etwas kräftiger dargestellt
 *
 * Interaktion:
 *   - Bei Fertigstellung eines Produktionsgebäudes wird automatisch ein
 *     Standard-Arbeitsbereich angelegt (Mitte des Gebäudes).
 *   - Über GameWorkArea.startSelectionForBuilding(detail) kann ein
 *     Auswahlmodus gestartet werden (z.B. aus ui-building-menu.js).
 *
 * Zusatz-API:
 *   - GameWorkArea.getAreaForBuilding(b/detail)
 *   - GameWorkArea.getCenterForBuilding(b/detail) → { cx, cy } in Tiles
 *     → kann von game.production.wood.js etc. genutzt werden, um
 *       Ressourcen IM Arbeitsbereich zu suchen/spawnen.
 * ========================================================================== */

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
    // Weitere Gebäude (Fischer, Steinbruch, …) später ergänzen
    // 'b.hq',
  ]);

  /** Standard-Radius in Tiles um das Gebäude herum */
  const DEFAULT_RADIUS_TILES = 4;

  // ---------------------------------------------------------------------------
  // INTERNE STATE-STRUKTUREN
  // ---------------------------------------------------------------------------

  /**
   * Map<uid, WorkArea>
   * WorkArea:
   *   {
   *     uid        : string,
   *     buildingId : string,   // z.B. 'b.lumberjack'
   *     cx, cy     : number,   // Zentrum (Tile-Koordinate)
   *     radiusTiles: number,   // Radius in Tiles
   *     selected   : boolean   // wird aktuell editiert?
   *   }
   */
  const areas = new Map();

  /** UID des Bereichs, der gerade im Auswahl-/Editmodus ist */
  let selectingUid = null;

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------

  /** Liefert die Tilegröße in Pixeln (Fallback 64) */
  function getTileSize() {
    const cam  = window.GameCamera;
    const game = window.GameCore || window.Game;
    if (cam && typeof cam.getTileSize === 'function') {
      return cam.getTileSize();
    }
    if (game && game.map && game.map.tileSize) {
      return game.map.tileSize;
    }
    return 64;
  }

  /** Erzeugt eine stabile UID für ein Gebäude */
  function buildUid(b) {
    if (b.uid) return String(b.uid);
    const id = b.type || b.id || 'building';
    // Annahme: b.x / b.y sind Tile-Koordinaten
    return `${id}@${b.x | 0},${b.y | 0}`;
  }

  /** Area-Objekt sicher in die Map schreiben */
  function setArea(uid, partial) {
    if (!uid) return;
    const prev = areas.get(uid) || {};
    const next = {
      uid,
      buildingId : prev.buildingId || partial.buildingId || 'unknown',
      cx         : Number.isFinite(partial.cx)          ? partial.cx          : (prev.cx ?? 0),
      cy         : Number.isFinite(partial.cy)          ? partial.cy          : (prev.cy ?? 0),
      radiusTiles: Number.isFinite(partial.radiusTiles) ? partial.radiusTiles : (prev.radiusTiles ?? DEFAULT_RADIUS_TILES),
      selected   : partial.selected ?? prev.selected ?? false
    };
    areas.set(uid, next);
    return next;
  }

  /** Sorgt dafür, dass für dieses Gebäude ein Standard-WorkArea existiert */
  function ensureDefaultForBuilding(build) {
    if (!build) return;
    const id = build.type || build.id;
    if (!SUPPORTED_IDS.has(id)) return;

    const uid = buildUid(build);

    // Falls schon vorhanden → nichts tun
    if (areas.has(uid)) return;

    // Zentrum: Mitte des Gebäude-Rechtecks (in Tile-Koordinaten)
    // Annahme: b.x / b.y = linke obere Ecke, b.w / b.h = Breite/Höhe in Tiles
    const cx = (build.x || 0) + (build.w || 1) / 2;
    const cy = (build.y || 0) + (build.h || 1) / 2;

    const area = setArea(uid, {
      buildingId : id,
      cx,
      cy,
      radiusTiles: DEFAULT_RADIUS_TILES,
      selected   : false
    });

    LOG('Standard-WorkArea angelegt', area);
  }

  /** Liefert die Area für ein Gebäude-Detail (oder null) */
  function getAreaForBuilding(detail) {
    if (!detail) return null;
    const id = detail.type || detail.id || detail.buildingId;
    if (!SUPPORTED_IDS.has(id)) return null;

    const uid = detail.uid || buildUid(detail);

    if (!areas.has(uid)) {
      // Versuche einen Default anzulegen (z.B. bei Produktion ohne vorheriges Zeichnen)
      ensureDefaultForBuilding(detail);
    }

    return areas.get(uid) || null;
  }

  /** Liefert nur das Zentrum (cx, cy in Tiles) für Produktions-Module */
  function getCenterForBuilding(detail) {
    const area = getAreaForBuilding(detail);
    if (!area) return null;
    return { cx: area.cx, cy: area.cy, radiusTiles: area.radiusTiles };
  }

  /**
   * Synchronisiert die Areas-Map grob mit den existierenden Gebäuden im Game.
   * Wird beim Zeichnen regelmäßig aufgerufen, ist aber sehr leichtgewichtig.
   */
  function syncAreasFromGameBuildings() {
    const game = window.GameCore || window.Game;
    const list = game?.buildings || [];
    if (!Array.isArray(list) || !list.length) return;

    for (const b of list) {
      if (!b) continue;
      const id = b.type || b.id;
      if (!SUPPORTED_IDS.has(id)) continue;
      ensureDefaultForBuilding(b);
    }
  }

  // ---------------------------------------------------------------------------
  // INTERAKTION / API
  // ---------------------------------------------------------------------------

  /**
   * Startet den Auswahlmodus für einen WorkArea-Kreis eines bestimmten Gebäudes.
   * Wird z.B. aus ui-building-menu.js beim Klick auf den Arbeitsbereich-Button
   * aufgerufen.
   */
  function startSelectionForBuilding(detail) {
    if (!detail) return;
    const id = detail.type || detail.buildingId || detail.id;
    if (!SUPPORTED_IDS.has(id)) {
      WARN('startSelectionForBuilding: nicht unterstütztes Gebäude', id);
      return;
    }

    // Zuerst sicherstellen, dass ein Bereich existiert
    ensureDefaultForBuilding(detail);

    const uid = detail.uid || buildUid(detail);

    // Alle Areas kurz deselektieren
    for (const [k, a] of areas) {
      if (!a) continue;
      a.selected = (k === uid);
    }
    selectingUid = uid;

    // Overlay-Layer auf jeden Fall aktivieren
    if (window.OverlayHooks && typeof OverlayHooks.enable === 'function') {
      OverlayHooks.enable('workareas', true);
    }

    LOG('WorkArea-Auswahl gestartet', { uid, id });
  }

  // Für spätere Erweiterung: einzelne Klicks in Tile-Koordinaten anwenden
  function applySelectionTile(tx, ty) {
    if (!selectingUid || !areas.has(selectingUid)) return;
    const area = areas.get(selectingUid);
    area.cx = tx;
    area.cy = ty;
    LOG('WorkArea verschoben', { selectingUid, cx: tx, cy: ty });
  }

  // ---------------------------------------------------------------------------
  // ZEICHNEN DES WORKAREA-LAYERS
  // ---------------------------------------------------------------------------

  /**
   * Zeichnet alle Arbeitsbereiche.
   * Wird von OverlayHooks.draw(ctx, cam) aufgerufen.
   */
    /**
   * Zeichnet alle Arbeitsbereiche.
   * Wird von OverlayHooks.draw(ctx, cam) aufgerufen.
   */
  function drawAreas(ctx, cam) {
    if (!ctx) return;

    // Sicherstellen, dass wir für alle vorhandenen Gebäude Areas haben
    syncAreasFromGameBuildings();

    if (!areas.size) return;

    // Kamera-Infos (gleiches Schema wie bei Path-/Unit-Overlay!)
    const camera = cam || (window.GameCamera && GameCamera.getState && GameCamera.getState()) || {
      x: 0,
      y: 0,
      zoom: 1
    };

    const tile = getTileSize();
    const zoom = camera.zoom || 1;
    const camX = camera.x || 0;
    const camY = camera.y || 0;

    // Weltkoordinaten (Pixel) → Canvas-Pixel
    // WICHTIG: KEIN devicePixelRatio hier, der Canvas ist schon „richtig“ skaliert.
    function worldToScreen(wx, wy) {
      const sx = (wx - camX) * zoom;
      const sy = (wy - camY) * zoom;
      return { x: sx, y: sy };
    }

    ctx.save();
    // Overlay läuft im reinen Pixel-Screen-Space (1:1)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    for (const area of areas.values()) {
      if (!area) continue;

      // Zentrum des Bereiches in Welt-Pixeln
      const wx = area.cx * tile;
      const wy = area.cy * tile;

      const { x: sx, y: sy } = worldToScreen(wx, wy);

      // Radius in Pixeln (Tiles → Pixel → Zoom)
      const radiusPx = (area.radiusTiles || DEFAULT_RADIUS_TILES) * tile * zoom;

      // Dünner Hintergrundkreis (immer sichtbar)
      ctx.beginPath();
      ctx.arc(sx, sy, radiusPx, 0, Math.PI * 2, false);
      ctx.strokeStyle = 'rgba(50, 150, 220, 0.30)';
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Wenn ausgewählt → kräftiger Rand + Punkt
      if (area.selected) {
        ctx.beginPath();
        ctx.arc(sx, sy, radiusPx, 0, Math.PI * 2, false);
        ctx.strokeStyle = 'rgba(50, 220, 255, 0.9)';
        ctx.lineWidth   = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // REGISTRIERUNG BEI OverlayHooks
  // ---------------------------------------------------------------------------

  function registerOverlayLayer() {
    if (!window.OverlayHooks || typeof OverlayHooks.register !== 'function') {
      WARN('OverlayHooks nicht verfügbar – WorkAreas werden nicht gezeichnet');
      return false;
    }

    // Layer registrieren (ein drawAreas wird pro Frame vom Renderer aufgerufen)
    OverlayHooks.register('workareas', drawAreas);

    // Standardmäßig einschalten
    if (typeof OverlayHooks.enable === 'function') {
      OverlayHooks.enable('workareas', true);
    }

    LOG('Overlay-Layer "workareas" registriert');
    return true;
  }

  // Direkt versuchen, ansonsten ein paar Mal nachregistrieren
  if (!registerOverlayLayer()) {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (registerOverlayLayer() || tries > 20) clearInterval(t);
    }, 250);
  }

  // ---------------------------------------------------------------------------
  // EVENTS AUS ANDEREN MODULES
  // ---------------------------------------------------------------------------

  // Wenn ein Gebäude fertig ist → Default-WorkArea anlegen
  window.addEventListener('cb:build:complete', (ev) => {
    const d = ev?.detail || {};
    ensureDefaultForBuilding(d);
  });

  // ---------------------------------------------------------------------------
  // DEBUG-/PRODUKTIONS-API
  // ---------------------------------------------------------------------------

  window.GameWorkArea = {
    areas,
    startSelectionForBuilding,
    applySelectionTile,
    ensureDefaultForBuilding,
    getAreaForBuilding,
    getCenterForBuilding
  };

  LOG('WorkArea-Modul geladen (v25.12.05-workarea-v4-center-api)');
})();
