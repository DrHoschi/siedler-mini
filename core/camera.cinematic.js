/* ============================================================================
 * Datei   : core/camera.cinematic.js
 * Projekt : Neue Siedler – Cinematic Start Zoom (HQ Intro)
 * Version : v25.12.16-cinematic-start-zoom (Option 1)
 * Zweck   :
 *   Erzeugt den gewünschten "genialen Start-Zoom-Effekt":
 *     1) Start in einer "Maximalansicht" (Fit-to-Map)
 *     2) Smooth (Ease-Out) auf das HQ reinzoomen & zentrieren
 *
 * Design-Ziele / Regeln:
 *   - KEINE Verknotung der bestehenden Kamera-Logik: rein Event-basiert.
 *   - Reagiert nur auf EIN Event: 'cb:hq:pos' (kommt aus GameUnits.setHQPos()).
 *   - Läuft genau EINMAL pro Reload.
 *
 * Konfiguration (optional, global):
 *   window.__SIEDLER_DISABLE_CINEMATIC_CAMERA = true;   // komplett aus
 *   window.__SIEDLER_CINEMATIC_DURATION_MS   = 1200;   // Dauer in ms
 *   window.__SIEDLER_CINEMATIC_PADDING       = 0.98;   // Fit-Padding (0..1)
 *
 * Hinweis:
 *   Option 1 (wie von dir gewählt):
 *     → Zielzoom = "aktueller GameCamera-Zoom", bevor wir auf Fit-to-Map umstellen.
 *       (Falls du später z.B. window.__SIEDLER_START_ZOOM setzt, bleibt das "dein" Zoom.)
 * ========================================================================== */

(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // Singleton-Guard + globale Flags (damit Game.js optional zentrieren kann,
  // wenn dieses Modul NICHT geladen ist)
  // -------------------------------------------------------------------------
  if (window.__SIEDLER_CINEMATIC_CAMERA_LOADED) return;
  window.__SIEDLER_CINEMATIC_CAMERA_LOADED = true;
  window.__SIEDLER_CINEMATIC_CAMERA_ACTIVE = true;

  const TAG  = '[camera.cinematic]';
  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // "Hard off"-Switch
  const ENABLED = (window.__SIEDLER_DISABLE_CINEMATIC_CAMERA !== true);
  if (!ENABLED){
    LOG('Deaktiviert per window.__SIEDLER_DISABLE_CINEMATIC_CAMERA');
    return;
  }

  // -------------------------------------------------------------------------
  // Konfiguration
  // -------------------------------------------------------------------------
  const DURATION_MS = Number.isFinite(window.__SIEDLER_CINEMATIC_DURATION_MS)
    ? (window.__SIEDLER_CINEMATIC_DURATION_MS|0)
    : 1200;

  const PADDING = (typeof window.__SIEDLER_CINEMATIC_PADDING === 'number')
    ? Math.max(0.1, Math.min(1.0, window.__SIEDLER_CINEMATIC_PADDING))
    : 0.98;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function getCanvas(){
    return document.getElementById('game')
        || document.querySelector('canvas[data-role="map"]')
        || document.querySelector('canvas');
  }

  function getMapState(){
    // Primär: window.Game.map (wird in core/game.js gesetzt)
    const map = window.Game?.map || null;
    if (map && Number.isFinite(map.cols) && Number.isFinite(map.rows) && Number.isFinite(map.tileSize)){
      return map;
    }
    // Fallback: GameMap._state (falls Game.map noch nicht gesetzt wurde)
    const m2 = window.GameMap?._state || null;
    if (m2 && Number.isFinite(m2.cols) && Number.isFinite(m2.rows) && Number.isFinite(m2.tileSize)){
      return m2;
    }
    return null;
  }

  function computeFitZoom(map, rect){
    const worldW = (map.cols|0) * (map.tileSize|0);
    const worldH = (map.rows|0) * (map.tileSize|0);
    if (!(worldW > 0 && worldH > 0 && rect.width > 0 && rect.height > 0)) return null;

    // Damit wirklich alles sichtbar ist, nehmen wir das Minimum beider Achsen
    // und geben minimal "Luft" via PADDING.
    const z = Math.min(rect.width / worldW, rect.height / worldH) * PADDING;
    return z;
  }

  function centerStateForWorld(worldX, worldY, zoom, rect){
    // GameCamera.centerOn() macht intern das gleiche. Wir rechnen es hier nur
    // aus, weil wir für die Animation Start/End-Werte brauchen.
    const x = worldX - (rect.width  / 2) / zoom;
    const y = worldY - (rect.height / 2) / zoom;
    return { x, y, zoom };
  }

  function centerStateForMap(map, zoom, rect){
    const worldW = (map.cols|0) * (map.tileSize|0);
    const worldH = (map.rows|0) * (map.tileSize|0);
    const wx = worldW / 2;
    const wy = worldH / 2;
    return centerStateForWorld(wx, wy, zoom, rect);
  }

  // -------------------------------------------------------------------------
  // Hauptlogik: Einmalig reagieren, wenn HQ-Position bekannt ist.
  // -------------------------------------------------------------------------
  let _fired = false;

  function onHQPos(ev){
    if (_fired) return;
    _fired = true;

    const d = ev?.detail || {};
    const tx = Number(d.tx);
    const ty = Number(d.ty);

    const cam = window.GameCamera;
    const canvas = getCanvas();
    const map = getMapState();

    if (!cam || !canvas){
      WARN('GameCamera oder Canvas fehlt → Cinematic abgebrochen');
      return;
    }
    if (!Number.isFinite(tx) || !Number.isFinite(ty)){
      WARN('cb:hq:pos ohne gültige tx/ty → Cinematic abgebrochen', d);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)){
      WARN('Canvas-Rect ungültig → Cinematic abgebrochen', rect);
      return;
    }

    // OPTION 1: Zielzoom ist der "aktuelle" Zoom, den die Kamera gerade hat
    // (bevor wir auf Fit-to-Map umschalten).
    const current = cam.getState ? cam.getState() : { zoom: cam.zoom ?? 1 };
    const targetZoom = (current && typeof current.zoom === 'number') ? current.zoom : 1;

    // Fallback/Heuristik: falls der aktuelle Zoom noch "Default 1" ist,
    // aber du via Global etwas vorgibst, nutzen wir das als dein gewünschtes Ziel.
    const zFromGlobal = (window.__SIEDLER_START_ZOOM != null) ? Number(window.__SIEDLER_START_ZOOM) : null;
    const finalZoom = (Number.isFinite(zFromGlobal) && Math.abs(targetZoom - 1) < 0.0001)
      ? zFromGlobal
      : targetZoom;

    const ts = (window.Game?.tileSize || map?.tileSize || 64);
    const hqWorldX = tx * ts;
    const hqWorldY = ty * ts;

    // 1) Fit-to-Map
    const fitZoom = map ? computeFitZoom(map, rect) : null;
    if (!fitZoom){
      // Kein Map-State? Dann wenigstens direkt auf HQ zentrieren.
      WARN('Fit-to-Map nicht möglich (Map-State fehlt) → centerOn(HQ) ohne Animation');
      try { cam.centerOn?.(hqWorldX, hqWorldY, { zoom: finalZoom }); } catch {}
      return;
    }

    const start = centerStateForMap(map, fitZoom, rect);
    const end   = centerStateForWorld(hqWorldX, hqWorldY, finalZoom, rect);

    // Kamera sofort auf "alles sichtbar"
    try { cam.setState?.(start); } catch(e){ WARN('setState(start) fehlgeschlagen', e); }

    // 2) Animation (Ease-Out)
    const t0 = performance.now();

    function frame(now){
      const raw = (now - t0) / Math.max(1, DURATION_MS);
      const t = clamp(raw, 0, 1);
      const k = easeOutCubic(t);

      const zoom = start.zoom + (end.zoom - start.zoom) * k;
      const x    = start.x    + (end.x    - start.x)    * k;
      const y    = start.y    + (end.y    - start.y)    * k;

      try { cam.setState?.({ x, y, zoom }); } catch {}

      if (t < 1){
        requestAnimationFrame(frame);
      } else {
        // Am Ende sauber "snappen", damit wir garantiert exakt am Ziel landen.
        try { cam.setState?.(end); } catch {}
        LOG('Cinematic finished', { tx, ty, fitZoom, finalZoom });
      }
    }

    requestAnimationFrame(frame);
  }

  // Wir hören sowohl auf window als auch document, weil manche Module
  // Events defensiv auf beiden dispatchen.
  window.addEventListener('cb:hq:pos', onHQPos);
  document.addEventListener('cb:hq:pos', onHQPos);

  LOG('geladen → wartet auf cb:hq:pos (Cinematic Start Zoom)');

})();
