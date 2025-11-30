/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-bubblefix1
 *
 * Zweck   : Zeichnet Ressourcenkugeln (Blasen) über Trägern.
 *           Läuft auf einem separaten Canvas (#units-overlay), das
 *           exakt über dem Game-Canvas liegt und NICHT klickbar ist.
 *
 * Wichtige Punkte:
 *   - Units-Quelle: Game.getUnits() → Game.units → GameUnits.getUnits()
 *   - Positionen werden mit Kamera (GameCamera) + tileSize berechnet
 *   - Wenn keine Ressource erkannt wird, trotzdem eine neutrale Blase
 *   - Debug-Logs bleiben drin, bitte NICHT entfernen :)
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[unit-overlay]';
  const LOG  = (...a) => (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn || console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // KONSTANTEN
  // -------------------------------------------------------------------------
  const CANVAS_ID = 'units-overlay';

  // Farben für bekannte Ressourcen
  const RES_COLORS = {
    wood : '#d19a55',
    stone: '#c0c0c0',
    food : '#f4c965',
    gold : '#ffd84a',
    default: '#f0f0f0'
  };

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  /** @type {HTMLCanvasElement|null} */
  let canvas = null;
  /** @type {CanvasRenderingContext2D|null} */
  let ctx = null;

  let running = false;
  let rafId   = 0;

  // Letzte bekannte Canvas-Größe (CSS-Pixel)
  let lastW = 0;
  let lastH = 0;

  // -------------------------------------------------------------------------
  // HILFSFUNKTIONEN – DOM & Größen
  // -------------------------------------------------------------------------

  // Stellt sicher, dass es ein Overlay-Canvas gibt und passt Größe an das
  // Game-Canvas (#game) an.
  function ensureCanvas() {
    const gameCanvas = document.getElementById('game');
    if (!gameCanvas) {
      WARN('kein #game-Canvas gefunden – Overlay inaktiv');
      return false;
    }

    // Canvas anlegen, falls noch nicht vorhanden
    if (!canvas) {
      canvas = document.getElementById(CANVAS_ID);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = CANVAS_ID;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '5'; // über der Map, unter UI
        // direkt über dem Game-Canvas einhängen
        const parent = gameCanvas.parentElement || document.body;
        parent.appendChild(canvas);
      }
      ctx = canvas.getContext('2d');
    }

    const rect = gameCanvas.getBoundingClientRect();
    const cssW = rect.width  | 0;
    const cssH = rect.height | 0;
    const dpr  = window.devicePixelRatio || 1;

    // Nur neu setzen, wenn sich etwas geändert hat
    if (cssW !== lastW || cssH !== lastH ||
        canvas.width !== (cssW * dpr) || canvas.height !== (cssH * dpr)) {

      lastW = cssW;
      lastH = cssH;

      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width  = cssW * dpr;
      canvas.height = cssH * dpr;

      // Wir wollen in "CSS-Pixeln" zeichnen, deshalb transformieren wir
      // direkt auf DPR, damit alle Koordinaten in Screen-Pixeln bleiben.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LOG('Canvas-Größe synchronisiert', { cssW, cssH, dpr });
    }

    return true;
  }

  // -------------------------------------------------------------------------
  // HILFSFUNKTIONEN – Daten
  // -------------------------------------------------------------------------

  // Liefert die aktuell sichtbaren Units.
  function getUnits() {
    const Game = window.Game || {};

    if (typeof Game.getUnits === 'function') {
      const u = Game.getUnits();
      if (Array.isArray(u)) return u;
    }

    if (Array.isArray(Game.units)) return Game.units;

    if (window.GameUnits && typeof window.GameUnits.getUnits === 'function') {
      const u = window.GameUnits.getUnits();
      if (Array.isArray(u)) return u;
    }

    if (Array.isArray(window.__units)) return window.__units;

    return [];
  }

  // Ressource zu einem Unit ableiten (möglichst robust).
  function getResIdForUnit(u) {
    // 1) Direkte Kennzeichnung (String)
    if (typeof u.carrying === 'string' && u.carrying) {
      return normalizeResId(u.carrying);
    }

    // 2) Objekt-Form, z.B. { id:'wood' } oder { res:'wood' }
    if (u.carrying && typeof u.carrying === 'object') {
      const c = u.carrying;
      if (typeof c.id  === 'string') return normalizeResId(c.id);
      if (typeof c.res === 'string') return normalizeResId(c.res);
      if (typeof c.type=== 'string') return normalizeResId(c.type);
    }

    // 3) Job-Info (u.task.job.*)
    const job = u.task && u.task.job ? u.task.job : null;
    if (job && typeof job === 'object') {
      const keys = ['res', 'resource', 'resourceId', 'item', 'itemId', 'type'];
      for (const k of keys) {
        const v = job[k];
        if (typeof v === 'string' && v) return normalizeResId(v);
      }
    }

    // nichts erkannt → null (wir zeichnen trotzdem eine neutrale Blase)
    return null;
  }

  // Dinge wie "res.wood" oder "resource.wood" auf "wood" reduzieren
  function normalizeResId(id) {
    if (!id) return id;
    return String(id).replace(/^res[._]/, '').replace(/^resource[._]/, '');
  }

  // Farbe für eine Ressource
  function getColorForRes(resId) {
    if (!resId) return RES_COLORS.default;
    const key = normalizeResId(resId);
    return RES_COLORS[key] || RES_COLORS.default;
  }

  // Tile-Koordinaten → Screen-Pixel, analog zum Kamera-Setup im Renderer
  function tileToScreen(x, y) {
    const Game = window.Game || {};
    const ts   = Game.tileSize || 64;

    const cam  = window.GameCamera || {};
    const zoom = Number(cam.zoom ?? 1);
    const camX = Number(cam.x    ?? 0);
    const camY = Number(cam.y    ?? 0);

    // Weltkoordinaten (linke obere Ecke der Tile)
    const wx = x * ts;
    const wy = y * ts;

    // Map benutzt: ctx.setTransform(zoom, 0, 0, zoom, -camX*zoom, -camY*zoom)
    // → Screen: (wx - camX)*zoom
    const sx = (wx - camX) * zoom;
    const sy = (wy - camY) * zoom;

    return { sx, sy, ts, zoom };
  }

  // -------------------------------------------------------------------------
  // RENDER-LOOP
  // -------------------------------------------------------------------------
  function render() {
    if (!running) return;

    if (!ensureCanvas() || !ctx) {
      scheduleNextFrame();
      return;
    }

    // Komplett löschen (in CSS-Pixeln, daher lastW/lastH)
    ctx.clearRect(0, 0, lastW, lastH);

    const units = getUnits();
    if (!units.length) {
      scheduleNextFrame();
      return;
    }

    for (const u of units) {
      if (!u || u.type !== 'carrier') continue;

      const { sx, sy, ts, zoom } = tileToScreen(u.x || 0, u.y || 0);
      const cx = sx + (ts * zoom) / 2;
      const cy = sy + (ts * zoom) / 2;

      const resId = getResIdForUnit(u);
      const col   = getColorForRes(resId);

      const radiusOuter = 14 * zoom;
      const radiusInner = 10 * zoom;
      const bubbleY     = cy - 18 * zoom; // etwas über dem Träger

      // Außenrand
      ctx.beginPath();
      ctx.arc(cx, bubbleY, radiusOuter, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      // Innenkreis (Ressource)
      ctx.beginPath();
      ctx.arc(cx, bubbleY, radiusInner, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();

      // Optional kleines Initial als Text (H/S/N/G) – hilft beim Debug
      const label =
        resId && /^wood/.test(resId)  ? 'H' :
        resId && /^stone/.test(resId) ? 'S' :
        resId && /^food/.test(resId)  ? 'N' :
        resId && /^gold/.test(resId)  ? 'G' : '';

      if (label) {
        ctx.font = `${10 * zoom}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#3b2a15';
        ctx.fillText(label, cx, bubbleY);
      }
    }

    scheduleNextFrame();
  }

  function scheduleNextFrame() {
    rafId = window.requestAnimationFrame(render);
  }

  // -------------------------------------------------------------------------
  // STEUERUNG
  // -------------------------------------------------------------------------
  function start() {
    if (running) return;
    running = true;
    LOG('gestartet (Ressourcenkugeln aktiv)');
    scheduleNextFrame();
  }

  function stop() {
    if (!running) return;
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    LOG('gestoppt');
  }

  // -------------------------------------------------------------------------
  // EXPORT / AUTO-START
  // -------------------------------------------------------------------------
  window.UnitOverlay = {
    start,
    stop,
    isRunning: () => running
  };

  // Nach Spielstart automatisch aktivieren
  window.addEventListener('cb:game:start', () => {
    start();
  });

  LOG('geladen (bubblefix1 – wartet auf cb:game:start)');
})();
