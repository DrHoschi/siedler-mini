/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-overlay-carrier-res2
 *
 * Zweck   : Zeichnet die Träger (Carrier) als Punkte über der Karte.
 *           - eigenes Canvas direkt über #game
 *           - reagiert auf Kamera (Pan/Zoom/Resize)
 *           - liest Daten aus GameUnits.getUnits()
 *           - zeigt GUT SICHTBARE Ressourcenkugeln, wenn der Träger etwas trägt
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

  // -------------------------------------------------------------------------
  // Overlay-Canvas über dem Game-Canvas anlegen
  // -------------------------------------------------------------------------
  const $overlay = document.createElement('canvas');
  $overlay.id = 'units-overlay';
  $overlay.style.position      = 'fixed';
  $overlay.style.left          = '0';
  $overlay.style.top           = '0';
  $overlay.style.pointerEvents = 'none'; // nicht klick-bar
  $overlay.style.zIndex        = '25';   // über der Map, unter HUD

  // Canvas direkt über den Game-Canvas legen
  const parent = $game.parentElement || document.body;
  if (parent.style.position === '' || parent.style.position === 'static') {
    parent.style.position = 'relative';
  }
  parent.appendChild($overlay);

  const ctx = $overlay.getContext('2d');

    // Passt Größe + Bildschirmposition des Overlays an das #game-Canvas an
  function syncSize(){
    if (!overlay || !$game) return;

    const rect = $game.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;

    // Sichtbare CSS-Größe des Game-Canvas
    const wCss = Math.max(1, Math.round(rect.width  || $game.width  || 1));
    const hCss = Math.max(1, Math.round(rect.height || $game.height || 1));

    // Interne Auflösung in Device-Pixel
    const wDev = wCss * dpr;
    const hDev = hCss * dpr;

    if (overlay.width  !== wDev) overlay.width  = wDev;
    if (overlay.height !== hDev) overlay.height = hDev;

    // Sichtbare CSS-Größe des Overlays
    overlay.style.width  = wCss + 'px';
    overlay.style.height = hCss + 'px';

    // WICHTIG:
    // Overlay exakt an die gleiche Stelle kleben wie #game (Viewport-Koordinaten),
    // damit worldToScreen() → (x,y) genau auf die Tiles vom Canvas passt.
    overlay.style.left = rect.left + 'px';
    overlay.style.top  = rect.top  + 'px';
  }
  syncSize();

  window.addEventListener('resize', syncSize);
  window.addEventListener('cb:game:start', syncSize);
  window.addEventListener('cb:camera-change', syncSize);

  // -------------------------------------------------------------------------
  // Kamera-Helfer
  // -------------------------------------------------------------------------
  function worldToScreen(wx, wy) {
    // bevorzugt: GameCamera aus camera.js
    if (window.GameCamera && typeof window.GameCamera.worldToScreen === 'function') {
      try {
        return window.GameCamera.worldToScreen(wx, wy);
      } catch (e) {
        WARN('GameCamera.worldToScreen Fehler', e);
      }
    }

    // Fallback über __CAM
    const CAM  = window.__CAM || {};
    const zoom = Number(CAM.zoom || CAM.scale || 1) || 1;
    const cx   = Number(CAM.x) || 0;
    const cy   = Number(CAM.y) || 0;

    const sx = (wx - cx) * zoom;
    const sy = (wy - cy) * zoom;
    return { x: sx, y: sy };
  }

  function tileToScreen(tx, ty) {
    const tileSize =
      (window.Game && window.Game.tileSize) ||
      (window.Entities?.state?.tile) ||
      64;

    // Mittelpunkt der Tile → Weltpixel → Screen
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

  // Farben für Ressourcentypen (gut sichtbare Standardfarben)
  const RES_COLORS = {
    'res.wood' : '#d28b3b',
    'res.stone': '#bbbbbb',
    'res.fish' : '#1e88e5',
    'res.food' : '#f4b400',
    'res.gold' : '#ffd700'
  };

  // -------------------------------------------------------------------------
  // Zeichnen
  // -------------------------------------------------------------------------
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w   = $overlay.width  / dpr;
    const h   = $overlay.height / dpr;

    // Reset + Koordinatensystem auf CSS-Pixel
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const units = getUnits();
    if (!units.length) return;

    for (const u of units) {
      if (!u || u.type !== 'carrier') continue;

      const pos = tileToScreen(u.x, u.y);
      const sx  = pos.x;
      const sy  = pos.y;

      // Grundpunkt des Trägers (etwas größer, gut sichtbar)
      const baseR = 5;
      ctx.beginPath();
      ctx.arc(sx, sy, baseR, 0, Math.PI * 2);
      ctx.fillStyle   = '#ffe9c0';  // heller Punkt
      ctx.strokeStyle = '#5d3a1a';  // dunkler Rand
      ctx.lineWidth   = 1.4;
      ctx.fill();
      ctx.stroke();

      // Wenn der Träger etwas trägt → große Ressourcenkugel drüber
      if (u.carrying) {
        const color = RES_COLORS[u.carrying] || '#ffffff';
        const resR  = 6;              // DEUTLICH größer
        const by    = sy - baseR - resR - 4; // gut Abstand nach oben

        // Schatten / Outline
        ctx.beginPath();
        ctx.arc(sx + 1, by + 1, resR + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();

        // Ressourcenkugel
        ctx.beginPath();
        ctx.arc(sx, by, resR, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.strokeStyle = '#222';
        ctx.lineWidth   = 1.2;
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function loop() {
    try {
      syncSize();  // falls sich Game-Canvas minimal ändert
      draw();
    } catch (e) {
      WARN('Overlay-loop Fehler', e);
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
  LOG('Units-Overlay aktiv (Ressourcenkugeln v2)');
})();
