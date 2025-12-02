/* ============================================================================
 * Datei   : core/game.workarea.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.02-workarea-v1
 *
 * Zweck   :
 *   - Zentrales Arbeitsbereichs-Overlay für Produktionsgebäude
 *   - Legt bei cb:build:complete für bestimmte Gebäude (Holzfäller, Steinbruch,
 *     Fischer) einen Standard-Arbeitsbereich an.
 *   - Zeichnet einen Kreis (Tile-basiert) auf der Map.
 *   - API:
 *       GameWorkArea.startSelectionForBuilding({ id, uid, x,y,w,h, radiusTiles? })
 *         → markiert den entsprechenden Kreis als "selektiert" (dicker Rand).
 *
 *   WICHTIG:
 *     - In dieser v1 wird die Position des Kreises noch nicht verschoben –
 *       sie sitzt mittig auf dem Gebäude. Erstmal geht es darum, dass der
 *       Kreis überhaupt sicher sichtbar ist. Das "Verschieben" hängen wir
 *       danach sauber an.
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[workarea]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console, TAG);

  // Für welche Gebäudearten wollen wir überhaupt Arbeitsbereiche?
  const SUPPORTED_IDS = new Set([
    'b.lumberjack',
    'b.quarry',
    'b.fisher'
  ]);

  /**
   * State-Struktur:
   *   areas: Map<uid, {
   *     id, uid,
   *     x,y,w,h,          // Gebäude-Footprint (Tiles)
   *     cx,cy,            // Mittelpunkt (Tiles)
   *     radiusTiles,      // Radius in Tiles
   *     selected          // true → dicker Rand
   *   }>
   */
  const areas = new Map();

  // aktuell angewähltes Gebäude (für "Arbeitsbereich setzen")
  let currentSelectionUid = null;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function toNumber(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function getDefaultRadiusForId(id){
    // später aus Registry.buildings[id].workArea.radiusTiles auslesen
    if (id === 'b.lumberjack') return 4.0;
    if (id === 'b.quarry')     return 4.0;
    if (id === 'b.fisher')     return 4.5;
    return 3.5;
  }

  function ensureAreaForBuilding(detail){
    const id  = detail.id;
    if (!SUPPORTED_IDS.has(id)) return null;

    const x   = toNumber(detail.x, 0);
    const y   = toNumber(detail.y, 0);
    const w   = toNumber(detail.w, 3) || 3;
    const h   = toNumber(detail.h, 3) || 3;
    const uid = detail.uid || `${id}@${x},${y}`;

    let area = areas.get(uid);
    if (!area){
      const cx = x + w / 2;
      const cy = y + h / 2;
      const radiusTiles = getDefaultRadiusForId(id);

      area = {
        id,
        uid,
        x, y, w, h,
        cx,
        cy,
        radiusTiles,
        selected: false
      };
      areas.set(uid, area);

      LOG('WorkArea angelegt', area);
    }
    return area;
  }

  // ---------------------------------------------------------------------------
  // Events: Gebäude fertig → Arbeitsbereich anlegen
  // ---------------------------------------------------------------------------

  window.addEventListener('cb:build:complete', (ev)=>{
    const d = ev.detail || {};
    if (!d.id) return;
    if (!SUPPORTED_IDS.has(d.id)) return;

    ensureAreaForBuilding(d);
  }, { passive:true });

  // ---------------------------------------------------------------------------
  // API für UI (Gebäude-Menü)
  // ---------------------------------------------------------------------------

  function startSelectionForBuilding(cfg){
    if (!cfg || !cfg.id) return;
    if (!SUPPORTED_IDS.has(cfg.id)) {
      WARN('startSelectionForBuilding: Gebäude nicht unterstützt', cfg.id);
      return;
    }

    const x   = toNumber(cfg.x, 0);
    const y   = toNumber(cfg.y, 0);
    const w   = toNumber(cfg.w, 3) || 3;
    const h   = toNumber(cfg.h, 3) || 3;
    const uid = cfg.uid || `${cfg.id}@${x},${y}`;

    const area = ensureAreaForBuilding({
      id : cfg.id,
      uid,
      x, y, w, h
    });

    if (!area) return;

    // Radius optional aus cfg übernehmen
    if (typeof cfg.radiusTiles === 'number' && cfg.radiusTiles > 0){
      area.radiusTiles = cfg.radiusTiles;
    }

    // Diese WorkArea visuell hervorheben
    currentSelectionUid = uid;
    areas.forEach((a, key)=>{
      a.selected = (key === uid);
    });

    LOG('Arbeitsbereich selektiert', { uid, id: cfg.id });
  }

  // ---------------------------------------------------------------------------
  // Zeichnen des Kreises (Overlay)
  // ---------------------------------------------------------------------------

  function getCameraState(){
    // bevorzugt GameCamera
    if (window.GameCamera && typeof window.GameCamera.getState === 'function'){
      return window.GameCamera.getState();
    }
    // einfacher Fallback
    const cam = window.Game?.camera || {};
    return {
      x   : toNumber(cam.x, 0),
      y   : toNumber(cam.y, 0),
      zoom: toNumber(cam.zoom, 1)
    };
  }

  function getTileSize(){
    if (window.Game?.map?.tileSize) return window.Game.map.tileSize;
    if (window.GameMap?._state?.map?.tileSize) return window.GameMap._state.map.tileSize;
    return 64;
  }

  function drawAreas(ctx){
    if (!areas.size) return;

    const cam = getCameraState();
    const ts  = getTileSize();

    const zoom = cam.zoom || 1;
    const ox   = cam.x   || 0;
    const oy   = cam.y   || 0;

    ctx.save();
    ctx.translate(-ox * ts * zoom, -oy * ts * zoom);
    ctx.scale(zoom, zoom);

    areas.forEach((area)=>{
      const cxPx = area.cx * ts;
      const cyPx = area.cy * ts;
      const rPx  = area.radiusTiles * ts;

      // Fläche
      ctx.beginPath();
      ctx.arc(cxPx, cyPx, rPx, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80, 160, 255, 0.12)';
      ctx.fill();

      // Rand
      ctx.lineWidth   = area.selected ? 4 : 2;
      ctx.strokeStyle = area.selected
        ? 'rgba(80, 200, 255, 0.9)'
        : 'rgba(80, 160, 255, 0.7)';
      ctx.setLineDash(area.selected ? [8,4] : [4,4]);
      ctx.stroke();

      // Mittelpunkt markieren
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(cxPx, cyPx, ts * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 80, 200, 0.9)';
      ctx.fill();
    });

    ctx.restore();
  }

  // Overlay Registrierung (über OverlayHooks, falls vorhanden)
  (function registerOverlay(){
    function tryRegister(){
      if (!window.OverlayHooks || typeof window.OverlayHooks.register !== 'function'){
        return false;
      }
      try{
        window.OverlayHooks.register('workareas', (ctx)=>{
          drawAreas(ctx);
        });
        LOG('WorkArea-Overlay registriert (workareas).');
        return true;
      }catch(e){
        WARN('WorkArea-Overlay Registrierung fehlgeschlagen', e);
        return true;
      }
    }

    if (tryRegister()) return;
    let tries = 0;
    const t = setInterval(()=>{
      if (tryRegister() || ++tries > 20) clearInterval(t);
    }, 200);
  })();

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  window.GameWorkArea = {
    areas,
    startSelectionForBuilding
  };

  LOG('Modul geladen v25.12.02-workarea-v1');

})();
