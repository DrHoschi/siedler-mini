/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.05-workarea-v4
 *
 * Zweck   :
 *   - Verwalten von Arbeitsbereichen (WorkAreas) für Produktionsgebäude
 *   - Aktuell: Holzfäller, Steinbruch, Fischer
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
 *     Auswahlmodus gestartet werden (Button "Arbeitsbereich setzen").
 *   - Solange der Auswahlmodus aktiv ist, fängt core/core.input.js Klicks
 *     auf die Karte ab und ruft GameWorkArea.applySelectionTile(tx, ty) auf.
 *
 * Zusatz-API:
 *   - GameWorkArea.getAreaForBuilding(b/detail)
 *   - GameWorkArea.getCenterForBuilding(b/detail) → { cx, cy } in Tiles
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
      buildingId : partial.buildingId ?? prev.buildingId ?? 'unknown',
      // cx / cy bleiben Tile-Koordinaten (Mitte in Tiles)
      cx         : Number.isFinite(partial.cx)         ? partial.cx         : (prev.cx ?? 0),
      cy         : Number.isFinite(partial.cy)         ? partial.cy         : (prev.cy ?? 0),
      radiusTiles: Number.isFinite(partial.radiusTiles)? partial.radiusTiles: (prev.radiusTiles ?? DEFAULT_RADIUS_TILES),
      selected   : partial.selected ?? prev.selected ?? false
    };
    areas.set(uid, next);
    return next;
  }

  /**
   * Sorgt dafür, dass für dieses Gebäude ein Standard-WorkArea existiert.
   * Zentrum = geometrische Mitte des Gebäude-Rechtecks in Tiles.
   */
  function ensureDefaultForBuilding(build) {
    if (!build) return;
    const id = build.type || build.id;
    if (!SUPPORTED_IDS.has(id)) return;

    const uid = buildUid(build);

    // Falls schon vorhanden → nichts tun
    if (areas.has(uid)) return;

    const bx = Number(build.x) || 0;
    const by = Number(build.y) || 0;
    const bw = Number(build.w) || 1;
    const bh = Number(build.h) || 1;

    // Mittelpunkt in Tile-Koordinaten
    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const area = setArea(uid, {
      buildingId : id,
      cx,
      cy,
      radiusTiles: DEFAULT_RADIUS_TILES,
      selected   : false
    });

    LOG('Standard-WorkArea angelegt', area);
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

  /** Wird vom Input-Modul bei einem Klick auf die Karte aufgerufen. */
  function applySelectionTile(tx, ty) {
    if (!selectingUid || !areas.has(selectingUid)) return;
    const area = areas.get(selectingUid);

    // Mittelpunkt auf die Mitte der geklickten
