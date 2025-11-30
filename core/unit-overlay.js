/* ============================================================================
 * Datei    : core/unit-overlay.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-units-overlay
 * Zweck    : Zeichnet die Träger (Carrier) als kleine Kreise über der Karte.
 *
 * Abhängigkeiten:
 *   – window.GameUnits.getUnits()
 *   – window.GameCamera (tileToScreen / worldToScreen / tileWidth / tileHeight)
 *   – OverlayHooks.register(id, drawFn) ODER PathOverlay.registerLayer(id, drawFn)
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[units.overlay]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // --- Hilfsfunktionen -------------------------------------------------------

  function getUnits() {
    try {
      return window.GameUnits?.getUnits?.() || [];
    } catch (e) {
      WARN('getUnits fehlgeschlagen:', e?.message || e);
      return [];
    }
  }

  function getCamera() {
    if (window.GameCamera) return window.GameCamera;
    return null;
  }

  /**
   * Tile-Koordinate → Canvas-Pixel
   * Nutzt wenn möglich GameCamera.tileToScreen/worldToScreen,
   * sonst einfache Isometrie mit 64x32-Fallback.
   */
  function tileToCanvas(tx, ty) {
    const cam = getCamera();

    try {
      if (cam && typeof cam.tileToScreen === 'function') {
        return cam.tileToScreen(tx, ty);
      }
      if (cam && typeof cam.worldToScreen === 'function') {
        return cam.worldToScreen(tx, ty);
      }
    } catch (e) {
      WARN('tileToCanvas via GameCamera fehlgeschlagen', e?.message || e);
    }

    const tileW = (cam && cam.tileWidth)  || 64;
    const tileH = (cam && cam.tileHeight) || 32;
    const camX  = (cam && cam.x) || 0;
    const camY  = (cam && cam.y) || 0;

    const sx = (tx - ty) * (tileW / 2) - camX;
    const sy = (tx + ty) * (tileH / 2) - camY;

    return { x: sx, y: sy };
  }

  // --- Zeichnen --------------------------------------------------------------

  function draw(ctx) {
    const units = getUnits();
    if (!units.length) return;

    const cam   = getCamera();
    const zoom  = cam?.zoom || 1;

    ctx.save();
    ctx.scale(zoom, zoom);

    for (const u of units) {
      if (u.type !== 'carrier') continue;

      const p = tileToCanvas(u.x, u.y);
      const r = 6; // Radius in Pixeln (vor Zoom)

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(20, 200, 255, 0.85)'; // hellblauer Punkt
      ctx.fill();
      ctx.lineWidth   = 1;
      ctx.strokeStyle = '#003344';
      ctx.stroke();

      // kleines "C" in die Mitte schreiben
      ctx.font         = '8px system-ui, sans-serif';
      ctx.fillStyle    = '#001016';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', p.x, p.y);
    }

    ctx.restore();
  }

  // --- Registrierung beim Overlay-System ------------------------------------

  function registerOverlayLayer() {
    function tryRegister() {
      // Neue Variante: OverlayHooks
      const oh = window.OverlayHooks;
      if (oh && typeof oh.register === 'function') {
        oh.register('units', (ctx) => draw(ctx));
        LOG('Overlay-Layer "units" via OverlayHooks registriert');
        return true;
      }

      // Ältere Variante: PathOverlay
      const po = window.PathOverlay;
      if (po && typeof po.registerLayer === 'function') {
        po.registerLayer('units', (ctx) => draw(ctx));
        LOG('Overlay-Layer "units" via PathOverlay registriert');
        return true;
      }

      return false;
    }

    // Sofort versuchen …
    if (tryRegister()) return;

    // … sonst ein paar Mal nachladen (OverlayHooks kommt evtl. später)
    let tries = 0;
    const maxTries = 40; // ~4 Sekunden bei 100ms
    const t = setInterval(() => {
      if (tryRegister()) {
        clearInterval(t);
      } else if (++tries > maxTries) {
        clearInterval(t);
        WARN('OverlayHooks/PathOverlay nicht gefunden – Units-Layer nicht aktiv');
      }
    }, 100);
  }

  // Auto-Start
  registerOverlayLayer();
  LOG('Modul geladen v25.11.30-units-overlay');
})();
