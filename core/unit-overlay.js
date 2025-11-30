/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-overlay-follow-camera
 *
 * Zweck   : Zeichnet die Träger (Carrier) als Punkte über der Karte.
 *           - eigenes Canvas direkt über #game
 *           - reagiert auf Kamera (Pan/Zoom)
 *           - liest Daten aus GameUnits.getUnits()
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[units-overlay]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const $game = document.getElementById('game');
  if (!$game) {
    WARN('kein #game Canvas gefunden – Overlay deaktiviert');
    return;
  }

  // --- Canvas für das Overlay anlegen ---------------------------------------

  const $overlay = document.createElement('canvas');
  $overlay.id = 'units-overlay';
  $overlay.style.position = 'absolute';
  $overlay.style.left = '0';
  $overlay.style.top = '0';
  $overlay.style.pointerEvents = 'none'; // nicht klick-bar
  $overlay.style.zIndex = '15';         // über der Map, unter dem UI

  // Canvas direkt über den Game-Canvas legen
  const parent = $game.parentElement || document.body;
  parent.style.position = parent.style.position || 'relative';
  parent.appendChild($overlay);

  const ctx = $overlay.getContext('2d');

  // Dimensionen vom Game-Canvas übernehmen
  function syncSize() {
    const w = $game.width  || $game.getBoundingClientRect().width;
    const h = $game.height || $game.getBoundingClientRect().height;
    if (!w || !h) return;
    $overlay.width  = w;
    $overlay.height = h;
    $overlay.style.width  = w + 'px';
    $overlay.style.height = h + 'px';
  }
  syncSize();

  // Wenn sich die Canvas-Größe ändert (Resize-Handler aus camera/layout)
  window.addEventListener('resize', syncSize);
  window.addEventListener('cb:game:start', syncSize);
  window.addEventListener('cb:camera-change', syncSize);

  // --- Kamera-Helfer --------------------------------------------------------

  /**
   * Wir versuchen zuerst GameCamera.worldToScreen(wx, wy) zu nutzen.
   * Falls das nicht vorhanden ist, rechnen wir selbst mit __CAM:
   *   - x/y = Weltpixel
   *   - CAM.x / CAM.y = Welt-Offset
   *   - CAM.zoom = Zoom-Faktor
   */
  function worldToScreen(wx, wy) {
    // bevorzugt: GameCamera aus camera.js
    const GC = window.GameCamera;
    if (GC && typeof GC.worldToScreen === 'function') {
      try {
        return GC.worldToScreen(wx, wy);
      } catch (e) {
        WARN('GameCamera.worldToScreen Fehler', e);
      }
    }

    // Fallback: __CAM direkt benutzen (wie in camera.glue.js)
    const CAM = window.__CAM || {};
    const zoom = Number(CAM.zoom) || 1;
    const sx = (wx - (CAM.x || 0)) * zoom;
    const sy = (wy - (CAM.y || 0)) * zoom;
    return { x: sx, y: sy };
  }

  /**
   * Tile-Koordinaten (tx,ty) → Screen-Koordinaten.
   * Nutzt Game.tileSize oder Entities.state.tile als Basis.
   */
  function tileToScreen(tx, ty) {
    const tileSize =
      (window.Game && window.Game.tileSize) ||
      (window.Entities?.state?.tile) ||
      64;

    // Mittelpunkt der Kachel
    const wx = (tx + 0.5) * tileSize;
    const wy = (ty + 0.5) * tileSize;
    return worldToScreen(wx, wy);
  }

  // --- Render-Loop ----------------------------------------------------------

  function drawUnits() {
    syncSize();

    ctx.clearRect(0, 0, $overlay.width, $overlay.height);

    const UnitsAPI = window.GameUnits;
    if (!UnitsAPI || typeof UnitsAPI.getUnits !== 'function') return;

    const list = UnitsAPI.getUnits() || [];
    if (!list.length) return;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)'; // dunkler Punkt mit kleinem Rand
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.2;

    for (const u of list) {
      if (!u) continue;
      if (u.type !== 'carrier') continue;

      const tx = Number(u.x);
      const ty = Number(u.y);
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;

      const p = tileToScreen(tx, ty);
      const r = 4; // Radius des Punkts

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function loop() {
    try {
      drawUnits();
    } catch (e) {
      WARN('Overlay-loop Fehler', e);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  LOG('Canvas erstellt & bereit');
})();
