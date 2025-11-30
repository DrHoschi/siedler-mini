/* ============================================================================
 * Datei    : core/unit-overlay.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-units-overlay-direct-v2
 * Zweck    : Zeichnet Träger direkt in ein eigenes Canvas über dem Spiel.
 *
 *  - unabhängig vom Path-Overlay
 *  - liest Positionen aus GameUnits.getUnits() / Game.getUnits() / window.__units
 *  - nutzt GameCamera.worldToScreen(), falls vorhanden
 *  - übernimmt CSS-Transform + Position von #game, damit beim Schieben/Zoomen
 *    alles synchron bleibt
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[units-overlay]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  /** Canvas + Kontext *********************************************************/

  /** @type {HTMLCanvasElement|null} */
  let _canvas = null;
  /** @type {CanvasRenderingContext2D|null} */
  let _ctx = null;

  let _width  = 0;
  let _height = 0;
  let _usedCamera = null; // 'GameCamera' oder 'fallback'

  function getGameCanvas() {
    return document.getElementById('game');
  }

  function ensureCanvas() {
    if (_canvas && _ctx) return;

    const gameCanvas = getGameCanvas();
    if (!gameCanvas) {
      WARN('kein #game Canvas gefunden');
      return;
    }

    const parent = gameCanvas.parentNode || document.body;

    const c = document.createElement('canvas');
    c.id = 'units-overlay';
    c.style.position       = 'absolute';
    c.style.pointerEvents  = 'none';   // Klicks gehen weiter an das Spiel
    c.style.zIndex         = '15';     // über #game (10), unter UI (1020)
    c.style.imageRendering = 'pixelated';

    parent.insertBefore(c, gameCanvas.nextSibling);

    const ctx = c.getContext('2d');
    if (!ctx) {
      WARN('konnte 2D-Context nicht anlegen');
      return;
    }

    _canvas = c;
    _ctx    = ctx;

    syncToGame();
    LOG('Canvas erstellt & bereit');
  }

  /** Größe + Position + Transform an #game anpassen ***************************/
  function syncToGame() {
    if (!_canvas) return;
    const gameCanvas = getGameCanvas();
    if (!gameCanvas) return;

    const rect = gameCanvas.getBoundingClientRect();

    // interne Canvasgröße = logische Spielgröße
    _canvas.width  = gameCanvas.width;
    _canvas.height = gameCanvas.height;

    _width  = _canvas.width;
    _height = _canvas.height;

    // visuelle Größe + Position
    _canvas.style.width  = rect.width  + 'px';
    _canvas.style.height = rect.height + 'px';
    _canvas.style.left   = rect.left + window.scrollX + 'px';
    _canvas.style.top    = rect.top  + window.scrollY + 'px';

    // Kamera-Transform vom Game-Canvas übernehmen (Zoom/Pan)
    const style = getComputedStyle(gameCanvas);
    _canvas.style.transform       = style.transform;
    _canvas.style.transformOrigin = style.transformOrigin;
  }

  /** Helpers ******************************************************************/

  function getUnits() {
    try {
      if (window.GameUnits && typeof window.GameUnits.getUnits === 'function') {
        return window.GameUnits.getUnits();
      }
      if (window.Game && typeof window.Game.getUnits === 'function') {
        return window.Game.getUnits();
      }
      if (Array.isArray(window.__units)) {
        return window.__units;
      }
    } catch (err) {
      WARN('getUnits() Fehler', err);
    }
    return [];
  }

  function worldToScreen(tx, ty) {
    // bevorzugt: echte Kamera benutzen, falls vorhanden
    if (window.GameCamera && typeof window.GameCamera.worldToScreen === 'function') {
      try {
        const pt = window.GameCamera.worldToScreen({ x: tx, y: ty });
        if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
          if (_usedCamera !== 'GameCamera') {
            _usedCamera = 'GameCamera';
            LOG('nutze GameCamera.worldToScreen für Units');
          }
          return { x: pt.x, y: pt.y };
        }
      } catch (err) {
        WARN('Fehler in GameCamera.worldToScreen', err);
      }
    }

    // Fallback: einfache ISO-Projektion ungefähr mittig im Canvas
    if (_usedCamera !== 'fallback') {
      _usedCamera = 'fallback';
      LOG('nutze Fallback-ISO-Projektion (GameCamera fehlt)');
    }

    const TILE_W = 64;
    const TILE_H = 32;
    const sx = (tx - ty) * (TILE_W / 2) + (_width / 2);
    const sy = (tx + ty) * (TILE_H / 2);
    return { x: sx, y: sy };
  }

  /** Zeichnen *****************************************************************/

  function drawUnits() {
    if (!_canvas || !_ctx) return;

    const units = getUnits();
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    if (!units || !units.length) return;

    for (const u of units) {
      if (!u || u.type !== 'carrier') continue;

      const p = worldToScreen(u.x, u.y);
      const r = 6;

      // gelber Punkt (Körper)
      _ctx.beginPath();
      _ctx.arc(p.x, p.y - 10, r, 0, Math.PI * 2, false);
      _ctx.fillStyle   = 'rgba(255, 255, 0, 0.9)';
      _ctx.strokeStyle = 'rgba(80, 40, 0, 0.9)';
      _ctx.lineWidth   = 2;
      _ctx.fill();
      _ctx.stroke();

      // kleiner Schatten
      _ctx.beginPath();
      _ctx.ellipse(p.x, p.y - 4, r + 2, r / 2, 0, 0, Math.PI * 2);
      _ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      _ctx.fill();
    }
  }

  /** Animations-Loop **********************************************************/

  let _loopStarted = false;
  let _lastTS = 0;

  function loop(ts) {
    if (!_loopStarted) {
      _loopStarted = true;
      _lastTS = ts;
    }
    const dt = ts - _lastTS;
    _lastTS = ts;

    try {
      ensureCanvas();
      syncToGame();   // wichtig: jedes Frame an Kamera anpassen
      drawUnits();
    } catch (err) {
      WARN('Fehler im Overlay-Loop', err);
    }

    window.requestAnimationFrame(loop);
  }

  /** Boot-Hooks ***************************************************************/

  // Starten, sobald das Spiel losläuft
  window.addEventListener('cb:game:start', () => {
    try {
      ensureCanvas();
      syncToGame();
      window.requestAnimationFrame(loop);
      LOG('Overlay-Loop gestartet');
    } catch (err) {
      WARN('Fehler beim Start des Overlays', err);
    }
  }, { once: true });

  // Sicherheitsnetz: bei Fenster-Resize
  window.addEventListener('resize', () => {
    syncToGame();
  });

  LOG('Modul geladen v25.11.30-units-overlay-direct-v2');
})();
