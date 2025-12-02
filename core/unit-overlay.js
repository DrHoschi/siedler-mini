/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-overlay-carrier-res3
 *
 * Zweck   : Ressourcenkugeln über Trägern (Carrier)
 *           - Fallback-Bubble (neutral)
 *           - Trage-Bubble (Icon + Farbe der Ressource)
 *           - Auftrags-Bubble (halbtransparent + roter Rand, wenn Job bekannt)
 *
 * WICHTIG:
 *   - nutzt GameUnits / Game.getUnits() / Game.units
 *   - Kamera-Umrechnung wie im Renderer (GameCamera.x/y/zoom, Game.tileSize)
 *   - Canvas (#units-overlay) liegt exakt über #game
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[unit-overlay]';
  const LOG  = (...a) => (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn || console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // KONSTANTEN
  // ---------------------------------------------------------------------------
  const CANVAS_ID = 'units-overlay';

  // Farben für Ressourcentypen
  const RES_COLORS = {
    wood   : '#d49a55',
    stone  : '#c0c0c0',
    food   : '#f4c965',
    gold   : '#ffd84a',
    default: '#f0f0f0'
  };

  // Emoji-„Icons“ für Ressourcen (später gern durch echte Sprites ersetzen)
  const RES_EMOJI = {
    wood   : '🪵',
    stone  : '🪨',
    food   : '🍞',
    gold   : '🪙',
    default: ''
  };

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  /** @type {HTMLCanvasElement|null} */
  let canvas = null;
  /** @type {CanvasRenderingContext2D|null} */
  let ctx = null;

  let lastW = 0;
  let lastH = 0;
  let running = false;
  let rafId   = 0;

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN – DOM & GRÖSSE
  // ---------------------------------------------------------------------------
  function ensureCanvas() {
    const game = document.getElementById('game');
    if (!game) {
      WARN('kein #game Canvas gefunden – Overlay inaktiv');
      return false;
    }

    // Canvas anlegen, falls nötig
    if (!canvas) {
      canvas = document.getElementById(CANVAS_ID);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = CANVAS_ID;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top  = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '15'; // über der Map, unter UI
        const parent = game.parentElement || document.body;
        parent.appendChild(canvas);
      }
      ctx = canvas.getContext('2d');
    }

    const rect = game.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const dpr  = window.devicePixelRatio || 1;

    if (cssW !== lastW || cssH !== lastH ||
        canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {

      lastW = cssW;
      lastH = cssH;

      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';

      canvas.width  = cssW * dpr;
      canvas.height = cssH * dpr;

      // Alle Koordinaten in "CSS-Pixeln" → wir skalieren intern auf DPR
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LOG('Canvas-Größe synchronisiert', { cssW, cssH, dpr });
    }

    // Overlay exakt über #game positionieren
    canvas.style.left = rect.left + 'px';
    canvas.style.top  = rect.top  + 'px';

    return true;
  }

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN – UNITS & RESSOURCEN
  // ---------------------------------------------------------------------------
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

  function normalizeResId(id) {
    if (!id) return null;
    let s = String(id);
    s = s.replace(/^res[._]/, '');
    s = s.replace(/^resource[._]/, '');
    return s || null;
  }

  // Ressource, die der Träger GERADE wirklich trägt
  function getCarryResId(u) {
    if (!u) return null;
    if (typeof u.carrying === 'string' && u.carrying) {
      return normalizeResId(u.carrying);
    }
    if (u.carrying && typeof u.carrying === 'object') {
      const c = u.carrying;
      if (typeof c.id === 'string')  return normalizeResId(c.id);
      if (typeof c.res === 'string') return normalizeResId(c.res);
      if (typeof c.type === 'string')return normalizeResId(c.type);
    }
    return null;
  }

  // Ressource, die der aktuelle Job VORsieht (Auftrag)
  function getJobResId(u) {
    const job = u && u.task && u.task.job ? u.task.job : null;
    if (!job || typeof job !== 'object') return null;

    const keys = ['res', 'resource', 'resourceId', 'item', 'itemId', 'type'];
    for (const k of keys) {
      const v = job[k];
      if (typeof v === 'string' && v) return normalizeResId(v);
    }
    return null;
  }

  function getColorForRes(resId) {
    if (!resId) return RES_COLORS.default;
    return RES_COLORS[resId] || RES_COLORS.default;
  }

  function getEmojiForRes(resId) {
    if (!resId) return RES_EMOJI.default;
    return RES_EMOJI[resId] || RES_EMOJI.default;
  }

  // Tile → Screen-Koordinaten, analog zum Renderer
  function tileToScreen(tx, ty) {
    const Game = window.Game || {};
    const ts   = Game.tileSize || 64;

    const cam  = window.GameCamera || {};
    const zoom = Number(cam.zoom ?? 1);
    const camX = Number(cam.x    ?? 0);
    const camY = Number(cam.y    ?? 0);

    const wx = tx * ts;
    const wy = ty * ts;

    const sx = (wx - camX) * zoom;
    const sy = (wy - camY) * zoom;

    return { sx, sy, ts, zoom };
  }

  // ---------------------------------------------------------------------------
  // ZEICHEN-HILFEN
  // ---------------------------------------------------------------------------
  function drawCarryBubble(cx, cy, zoom, resId) {
    const col   = getColorForRes(resId);
    const emoji = getEmojiForRes(resId);

    const rOuter = 14 * zoom;
    const rInner = 11 * zoom;

    // Schatten
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    // farbige Kugel
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();

    if (emoji) {
      ctx.font = `${11 * zoom}px system-ui,apple-color-emoji,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3b2a15';
      ctx.fillText(emoji, cx, cy);
    }
  }

  function drawJobBubble(cx, cy, zoom, resId) {
    if (!resId) return;

    const emoji = getEmojiForRes(resId);
    const r = 15 * zoom;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';       // halbtransparent
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = 'rgba(200,40,40,0.9)';        // roter Rand
    ctx.stroke();

    if (emoji) {
      ctx.font = `${12 * zoom}px system-ui,apple-color-emoji,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3b2a15';
      ctx.fillText(emoji, cx, cy);
    }
  }

  function drawFallbackBubble(cx, cy, zoom) {
    const r = 6 * zoom;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // RENDER-LOOP
  // ---------------------------------------------------------------------------
  function render() {
    if (!running) return;

    if (!ensureCanvas() || !ctx) {
      scheduleNext();
      return;
    }

    ctx.clearRect(0, 0, lastW, lastH);

    const units = getUnits();
    if (!units.length) {
      scheduleNext();
      return;
    }

    for (const u of units) {
      if (!u) continue;
      if (u.type && u.type !== 'carrier') continue;

      const { sx, sy, ts, zoom } = tileToScreen(u.x || 0, u.y || 0);
      const cx = sx + (ts * zoom) / 2;
      const cy = sy + (ts * zoom) / 2;

      const carryRes = getCarryResId(u);
      const jobRes   = getJobResId(u);

      // Grundpositionen für die Bubbles
      const yCarry = cy - 18 * zoom;   // Trage-Bubble (Hauptebene)
      const yJob   = cy - 34 * zoom;   // Auftrags-Bubble etwas höher

      // 1) Auftrags-Bubble: nur wenn Job bekannt & noch nichts getragen wird
      if (!carryRes && jobRes) {
        drawJobBubble(cx, yJob, zoom, jobRes);
      }

      // 2) Trage-Bubble: wenn der Träger etwas in der Hand hat
      if (carryRes) {
        drawCarryBubble(cx, yCarry, zoom, carryRes);
      }

      // 3) Fallback: wenn wir gar nichts wissen → kleine neutrale Kugel
      if (!carryRes && !jobRes) {
        drawFallbackBubble(cx, yCarry, zoom);
      }
    }

    scheduleNext();
  }

  function scheduleNext() {
    rafId = window.requestAnimationFrame(render);
  }

  // ---------------------------------------------------------------------------
  // STEUERUNG
  // ---------------------------------------------------------------------------
  function start() {
    if (running) return;
    running = true;
    LOG('gestartet (Carrier-Overlay mit Ressourcensymbolen)');
    scheduleNext();
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

  // ---------------------------------------------------------------------------
  // EXPORT / AUTO-START
  // ---------------------------------------------------------------------------
  window.UnitOverlay = {
    start,
    stop,
    isRunning: () => running
  };

  // Startet automatisch, sobald das Spiel losläuft
  window.addEventListener('cb:game:start', () => start());

  LOG('geladen (overlay-carrier-res3, wartet auf cb:game:start)');
})();
