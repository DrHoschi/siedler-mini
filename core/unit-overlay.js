/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-overlay-carrier-res
 *
 * Zweck   : Zeichnet die Träger (Carrier) als Punkte über der Karte.
 *           - eigenes Canvas direkt über #game
 *           - reagiert auf Kamera (Pan/Zoom)
 *           - liest Daten aus GameUnits.getUnits()
 *           - zeigt kleine Ressourcenkugeln, wenn der Träger etwas trägt
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[units-overlay]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  let overlay = null;
  let ctx      = null;

  const RES_COLORS = {
    'res.wood' : '#c48a3c',
    'res.stone': '#9e9e9e',
    'res.fish' : '#1e88e5',
    'res.food' : '#f4b400',
    'res.gold' : '#ffd700'
  };

  // -------------------------------------------------------------------------
  // Canvas anlegen & Größe mit #game synchronisieren
  // -------------------------------------------------------------------------
  function getGameCanvas() {
    return document.getElementById('game');
  }

  function ensureCanvas() {
    if (overlay && ctx) return;

    const host = document.body;
    overlay = document.createElement('canvas');
    overlay.id = 'unit-overlay';
    overlay.style.position      = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex        = '25'; // über Karte, unter HUD
    overlay.style.left = '0';
    overlay.style.top  = '0';
    host.appendChild(overlay);

    ctx = overlay.getContext('2d');
    LOG('Overlay-Canvas erstellt');
    syncSize();
  }

  function syncSize() {
    const game = getGameCanvas();
    if (!game || !overlay) return;

    const r   = game.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    overlay.width  = Math.max(1, Math.round(r.width  * dpr));
    overlay.height = Math.max(1, Math.round(r.height * dpr));

    overlay.style.left   = Math.floor(r.left + window.scrollX) + 'px';
    overlay.style.top    = Math.floor(r.top  + window.scrollY) + 'px';
    overlay.style.width  = Math.max(1, Math.round(r.width))  + 'px';
    overlay.style.height = Math.max(1, Math.round(r.height)) + 'px';
  }

  window.addEventListener('resize', syncSize);
  window.addEventListener('cb:game:start', syncSize);
  window.addEventListener('cb:camera-change', syncSize);

  // -------------------------------------------------------------------------
  // Kamera-Helfer
  // -------------------------------------------------------------------------

  function worldToScreen(wx, wy) {
    // bevorzugt zentrale Kamera-API
    const GC = window.GameCamera;
    if (GC && typeof GC.worldToScreen === 'function') {
      try {
        return GC.worldToScreen(wx, wy);
      } catch (e) {
        WARN('GameCamera.worldToScreen Fehler', e);
      }
    }

    const CAM  = window.__CAM || {};
    const zoom = Number(CAM.zoom || CAM.scale || 1) || 1;
    const cx   = Number(CAM.x) || 0;
    const cy   = Number(CAM.y) || 0;

    const sx = (wx - cx) * zoom;
    const sy = (wy - cy) * zoom;
    return { x: sx, y: sy };
  }

  /** Tile-Koordinaten (tx,ty) → Screen-Koordinaten */
  function tileToScreen(tx, ty) {
    const tileSize =
      (window.Game && window.Game.tileSize) ||
      (window.Entities?.state?.tile) ||
      64;

    const wx = (tx + 0.5) * tileSize;
    const wy = (ty + 0.5) * tileSize;
    return worldToScreen(wx, wy);
  }

  // -------------------------------------------------------------------------
  // Units lesen
  // -------------------------------------------------------------------------
  function getUnits() {
    try {
      if (window.GameUnits && typeof window.GameUnits.getUnits === 'function') {
        return window.GameUnits.getUnits() || [];
      }
    } catch (e) {
      WARN('getUnits Fehler', e);
    }
    return [];
  }

  // -------------------------------------------------------------------------
  // Zeichnen
  // -------------------------------------------------------------------------
  function draw() {
    if (!overlay || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w   = overlay.width  / dpr;
    const h   = overlay.height / dpr;

    // Koordinatensystem: 1 Unit = 1 CSS-Pixel
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const units = getUnits();
    if (!units.length) return;

    for (const u of units) {
      if (u.type !== 'carrier') continue;

      const pos = tileToScreen(u.x, u.y);
      const sx  = pos.x;
      const sy  = pos.y;

      // Grundpunkt des Trägers
      const baseR = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, baseR, 0, Math.PI * 2);
      ctx.fillStyle   = '#fdf0c0';
      ctx.strokeStyle = '#5d3a1a';
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();

      // Wenn er etwas trägt → kleine Ressourcenkugel darüber
      if (u.carrying) {
        const color = RES_COLORS[u.carrying] || '#ffffff';
        const rRes  = 3;
        const by    = sy - baseR - 3;

        ctx.beginPath();
        ctx.arc(sx, by, rRes, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.strokeStyle = '#222';
        ctx.lineWidth   = 0.8;
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function loop() {
    try {
      ensureCanvas();
      draw();
    } catch (e) {
      WARN('Overlay-loop Fehler', e);
    }
    requestAnimationFrame(loop);
  }

  // Start
  ensureCanvas();
  requestAnimationFrame(loop);
  LOG('Units-Overlay aktiv (mit Ressourcenkugeln)');
})();
