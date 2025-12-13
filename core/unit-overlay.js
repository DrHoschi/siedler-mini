/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.12-overlay-carrier-res4 (job+carry+qty, fish->food)
 *
 * Zweck   : Ressourcenkugeln über Trägern (Carrier)
 *           - Fallback-Bubble (neutral)
 *           - Trage-Bubble (Icon + Farbe der Ressource)
 *           - Auftrags-Bubble (halbtransparent + roter Rand, wenn Job bekannt)
 *           - NEU: qty-Anzeige (klein) + robustes Job-Finding
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
  // RENDER-OPTIONEN (Debug)
  // ---------------------------------------------------------------------------
  /**
   * Wenn true, zeichnet das Overlay zusätzlich einen "Unit-Body" (Sprite-Fallback),
   * damit man Units sofort visuell erkennt. (Bubbles bleiben darüber.)
   *
   * Hinweis:
   *  - Wir versuchen zuerst einen echten Carrier-Sprite aus dem Asset-System zu zeichnen.
   *  - Wenn das Asset-System nicht verfügbar ist (oder kein Bild gefunden wird),
   *    zeichnen wir ein kleines Fallback-Symbol (Punkt).
   */
  let DRAW_BODIES = true;

  /** Wenn true, blendet kleine Debug-Texte ein (unit id / type). */
  let DEBUG_LABELS = false;

  // Einmal-Log (damit Konsole nicht spammt)
  let _BODY_LOG_ONCE = false;
  let _BODY_MODE     = 'auto';



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
    let s = String(id).toLowerCase();
    s = s.replace(/^res[._]/, '');
    s = s.replace(/^resource[._]/, '');

    // Vereinheitlichung: Fisch zählt später als Nahrung → hier schon als "food"
    if (s === 'fish' || s === 'fisch') return 'food';

    return s || null;
  }

  // Ressource, die der Träger GERADE wirklich trägt
  function getCarryResId(u) {
    if (!u) return null;

    // häufig: u.carrying = 'res.wood'
    if (typeof u.carrying === 'string' && u.carrying) {
      return normalizeResId(u.carrying);
    }

    // oder: u.carrying = { id:'res.wood', qty: 1 }
    if (u.carrying && typeof u.carrying === 'object') {
      const c = u.carrying;
      if (typeof c.id === 'string')   return normalizeResId(c.id);
      if (typeof c.res === 'string')  return normalizeResId(c.res);
      if (typeof c.type === 'string') return normalizeResId(c.type);
      if (typeof c.item === 'string') return normalizeResId(c.item);
    }

    // einige Systeme nutzen: u.task.carry / u.task.payload
    const tc = u?.task?.carry || u?.task?.payload || null;
    if (tc && typeof tc === 'object') {
      if (typeof tc.id === 'string')   return normalizeResId(tc.id);
      if (typeof tc.res === 'string')  return normalizeResId(tc.res);
      if (typeof tc.type === 'string') return normalizeResId(tc.type);
      if (typeof tc.item === 'string') return normalizeResId(tc.item);
    }

    return null;
  }

  // Menge, die der Träger trägt (wenn vorhanden)
  function getCarryQty(u) {
    if (!u) return 0;
    if (u.carrying && typeof u.carrying === 'object' && Number.isFinite(u.carrying.qty)) {
      return u.carrying.qty;
    }
    const tc = u?.task?.carry || u?.task?.payload || null;
    if (tc && typeof tc === 'object' && Number.isFinite(tc.qty)) return tc.qty;
    return 0;
  }

  // Job-Objekt robust finden (wichtig für C2!)
  function getJobObject(u) {
    if (!u) return null;

    // alt: u.task.job
    if (u.task && u.task.job && typeof u.task.job === 'object') return u.task.job;

    // neu / varianten:
    if (u.job && typeof u.job === 'object') return u.job;
    if (u.currentJob && typeof u.currentJob === 'object') return u.currentJob;
    if (u._job && typeof u._job === 'object') return u._job;

    // manchmal hängt es unter task.current
    if (u.task && u.task.current && typeof u.task.current === 'object') return u.task.current;

    return null;
  }

  // Ressource, die der aktuelle Job VORsieht (Auftrag)
  function getJobResId(u) {
    const job = getJobObject(u);
    if (!job || typeof job !== 'object') return null;

    const keys = ['res', 'resource', 'resourceId', 'item', 'itemId', 'type', 'id'];
    for (const k of keys) {
      const v = job[k];
      if (typeof v === 'string' && v) return normalizeResId(v);
    }
    return null;
  }

  // Menge, die der Job vorsieht (wenn vorhanden)
  function getJobQty(u) {
    const job = getJobObject(u);
    if (!job || typeof job !== 'object') return 0;

    const q = job.qty ?? job.amount ?? job.count ?? 0;
    return Number.isFinite(q) ? q : 0;
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
  // HILFSFUNKTIONEN – UNIT BODY (Sprite-Fallback)
  // ---------------------------------------------------------------------------

  /**
   * Versucht, einen Carrier (oder generischen Unit-Body) als Sprite zu zeichnen.
   * Wir testen mehrere mögliche Asset-APIs, damit es robust bleibt,
   * selbst wenn sich dein Asset-System später weiterentwickelt.
   *
   * @returns {boolean} true wenn etwas gezeichnet wurde
   */
  function drawUnitBody(cx, cy, ts, zoom, u) {
    // 1) Erst versuchen wir, das bestehende Asset-System zu nutzen.
    //    (Wir wissen nicht 100% wie die API heißt – daher "try/catch" und mehrere Kandidaten.)
    try {
      const A =
        window.Assets ||
        window.Asset ||
        window.CoreAssets ||
        window.GameAssets ||
        null;

      // a) drawChar / drawUnit API (falls vorhanden)
      if (A && typeof A.drawChar === 'function') {
        try { A.drawChar(ctx, 'u.carrier', cx, cy); _BODY_MODE='drawChar:u.carrier'; if(!_BODY_LOG_ONCE){_BODY_LOG_ONCE=true; LOG('Unit-Body: nutzt Assets.drawChar(u.carrier)');} return true; } catch (_) {}
        try { A.drawChar(ctx, 'carrier', cx, cy); _BODY_MODE='drawChar:carrier'; if(!_BODY_LOG_ONCE){_BODY_LOG_ONCE=true; LOG('Unit-Body: nutzt Assets.drawChar(carrier)');} return true; } catch (_) {}
        try { A.drawChar({ ctx, id: 'u.carrier', x: cx, y: cy, dir: 'S', anim: 'idle', zoom }); _BODY_MODE='drawChar:obj'; if(!_BODY_LOG_ONCE){_BODY_LOG_ONCE=true; LOG('Unit-Body: nutzt Assets.drawChar({...})');} return true; } catch (_) {}
      }
      if (A && typeof A.drawUnit === 'function') {
        try { A.drawUnit(ctx, 'u.carrier', cx, cy, { zoom }); return true; } catch (_) {}
        try { A.drawUnit(ctx, 'carrier', cx, cy, { zoom }); return true; } catch (_) {}
      }

      // b) Direkter Image-Zugriff (falls eure Preloader-Map Images hält)
      const img =
        (A && (A.images?.['u.carrier'] || A.images?.carrier || A.img?.carrier)) ||
        window.__ASSET_IMAGES__?.carrier ||
        window.__ASSET_IMAGES__?.['u.carrier'] ||
        null;

      if (img && img.width && img.height) {
        // Wir zeichnen es zentriert auf dem Tile.
        const size = Math.max(8, ts * zoom * 0.90);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx, cy);
        ctx.drawImage(img, -size/2, -size/2, size, size);
        _BODY_MODE='image'; if(!_BODY_LOG_ONCE){_BODY_LOG_ONCE=true; LOG('Unit-Body: nutzt direktes Image (carrier)');}
        ctx.restore();
        return true;
      }
    } catch (_) {
      // Absichtlich still – wir fallen auf Debug-Fallback zurück.
    }

    // 2) Fallback: einfacher Punkt (damit NIE "unsichtbar")
    drawUnitBodyFallback(cx, cy, ts, zoom, u);
    return true;
  }

  function drawUnitBodyFallback(cx, cy, ts, zoom, u) {
    if(!_BODY_LOG_ONCE){ _BODY_LOG_ONCE=true; _BODY_MODE='fallback-dot'; LOG('Unit-Body: Fallback-Punkt (kein Carrier-Sprite gefunden)'); }
    const r = Math.max(2.2, (ts * zoom) * 0.12);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.fill();
    ctx.stroke();

    if (DEBUG_LABELS) {
      ctx.font = `${Math.max(10, 10*zoom)}px system-ui`;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(String(u?.type || 'unit'), cx + r + 3, cy - r - 3);
    }
    ctx.restore();
  }


  // ---------------------------------------------------------------------------
  // ZEICHEN-HILFEN
  // ---------------------------------------------------------------------------
  function drawQtyBadge(cx, cy, zoom, qty) {
    if (!qty || qty <= 1) return;

    const r = 8 * zoom;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + 12 * zoom, cy - 10 * zoom, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fill();

    ctx.font = `${10 * zoom}px system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(qty), cx + 12 * zoom, cy - 10 * zoom);
    ctx.restore();
  }

  function drawCarryBubble(cx, cy, zoom, resId, qty) {
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

    drawQtyBadge(cx, cy, zoom, qty);
  }

  function drawJobBubble(cx, cy, zoom, resId, qty) {
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

    drawQtyBadge(cx, cy, zoom, qty);
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

      const carryQty = getCarryQty(u);
      const jobQty   = getJobQty(u);


      // --- Unit-Body (Sprite-Fallback) --------------------------------------
      if (DRAW_BODIES) {
        // Zeichne zuerst den Körper (damit die Bubbles oben drüber liegen)
        drawUnitBody(cx, cy, ts, zoom, u);
      }

      // Grundpositionen für die Bubbles
      const yCarry = cy - 18 * zoom;   // Trage-Bubble (Hauptebene)
      const yJob   = cy - 34 * zoom;   // Auftrags-Bubble etwas höher

      // 1) Auftrags-Bubble: nur wenn Job bekannt & noch nichts getragen wird
      if (!carryRes && jobRes) {
        drawJobBubble(cx, yJob, zoom, jobRes, jobQty);
      }

      // 2) Trage-Bubble: wenn der Träger etwas in der Hand hat
      if (carryRes) {
        drawCarryBubble(cx, yCarry, zoom, carryRes, carryQty || jobQty);
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
    isRunning: () => running,

    // Debug/Dev-Optionen (ohne Inspector-Kopplung – optional später verlinken)
    setDrawBodies: (v) => { DRAW_BODIES = !!v; },
    setDebugLabels: (v) => { DEBUG_LABELS = !!v; }
  };

  // Startet automatisch, sobald das Spiel losläuft
  window.addEventListener('cb:game:start', () => start());

  LOG('geladen (overlay-carrier-res4, wartet auf cb:game:start)');
})();

