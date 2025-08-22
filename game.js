/* -------------------------------------------------------------
 * Siedler‑Mini • game.js
 * Version: v11.1r6 • 2025‑08‑22
 *
 * Zweck
 *  - Start/Reload einer Karte (JSON) über eine stabile öffentliche API
 *  - Kamera-Steuerung (Zoom/Pan) – UI bleibt angedockt, Canvas zoomt
 *  - Fallback-Rendering (Grid), falls kein externer Renderer verfügbar
 *  - Nicht-invasiv: if (window.Render?.drawMap) => delegieren
 *
 * Öffentliche API (für UI / boot.js):
 *  - window.startGame(mapUrl: string): Promise<void>
 *  - window.reloadGame(mapUrl?: string): Promise<void>
 *  - window.game (State-Objekt)
 *  - window.GameLoader.start/reload (Bridge)
 *  - window.GameCamera.setZoom/setPosition (Bridge)
 * ------------------------------------------------------------- */

(() => {
  const VERSION = 'v11.1r6';
  const DATE = '2025-08-22';

  const log   = (...a) => console.log('[game]', ...a);
  const warn  = (...a) => console.warn('[game]', ...a);
  const error = (...a) => console.error('[game]', ...a);
  const setDbg = (msg) => (typeof window.setDebug === 'function' ? window.setDebug(msg) : void 0);

  /** Hard-Limits & Defaults für Kamera */
  const CAMERA = {
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 3.5,
    START_ZOOM: 0.8,
    PAN_SPEED: 1.0, // Faktor für Drag
  };

  /** Interner Helper: DOM-Elemente */
  const $ = (id) => document.getElementById(id);

  /** Globale State-Struktur (sichtbar unter window.game) */
  const state = {
    version: VERSION,
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,

    // Kamera
    camera: {
      x: 0,
      y: 0,
      zoom: CAMERA.START_ZOOM,
      setZoom(z) {
        this.zoom = Math.max(CAMERA.MIN_ZOOM, Math.min(CAMERA.MAX_ZOOM, Number(z) || CAMERA.START_ZOOM));
        requestRender();
      },
      setPosition(x, y) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
        requestRender();
      },
    },

    // Map / Daten
    mapUrl: '',
    map: null,        // Map-JSON
    tileset: null,    // optional – wenn dein Renderer es braucht
    startedAt: null,

    // Eingabe
    input: {
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      camStartX: 0,
      camStartY: 0,
      lastPinchDist: 0,
    },

    // Sonstiges
    DPR: (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1,
    needsRender: false,
  };

  /** Render-Invalider */
  function requestRender() {
    state.needsRender = true;
  }

  /** Canvas vorbereiten (Resizing + DPR) */
  function initCanvas() {
    const c = $('stage');
    if (!c) {
      error('Canvas #stage fehlt – index.html prüfen.');
      return false;
    }
    state.canvas = c;
    state.ctx = c.getContext('2d', { alpha: false });

    function fit() {
      const DPR = (state.DPR = window.devicePixelRatio || 1);
      const w = Math.floor(c.clientWidth * DPR) || window.innerWidth * DPR;
      const h = Math.floor(c.clientHeight * DPR) || window.innerHeight * DPR;
      if (c.width !== w || c.height !== h) {
        c.width = w; c.height = h;
        state.width = w; state.height = h;
        requestRender();
      }
    }
    fit();
    window.addEventListener('resize', fit);
    return true;
  }

  /** Eingaben (Zoom/Pan) – nur, wenn Cursor/Gesten über dem Canvas sind */
  function initInput() {
    const c = state.canvas;
    if (!c) return;

    // Canvas soll Gesten selbst konsumieren
    c.style.touchAction = 'none';

    // Wheel-Zoom
    c.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const delta = Math.sign(ev.deltaY) * 0.1; // kleiner Zoomschritt
      state.camera.setZoom(state.camera.zoom * (1 - delta));
    }, { passive: false });

    // Drag/Pan (Maus)
    c.addEventListener('mousedown', (ev) => {
      state.input.dragging = true;
      state.input.dragStartX = ev.clientX;
      state.input.dragStartY = ev.clientY;
      state.input.camStartX = state.camera.x;
      state.input.camStartY = state.camera.y;
    });
    window.addEventListener('mousemove', (ev) => {
      if (!state.input.dragging) return;
      const dx = (ev.clientX - state.input.dragStartX);
      const dy = (ev.clientY - state.input.dragStartY);
      state.camera.setPosition(
        state.input.camStartX - dx / state.camera.zoom * CAMERA.PAN_SPEED,
        state.input.camStartY - dy / state.camera.zoom * CAMERA.PAN_SPEED
      );
    });
    window.addEventListener('mouseup', () => { state.input.dragging = false; });

    // Touch (Pan + Pinch)
    c.addEventListener('touchstart', (ev) => {
      if (ev.touches.length === 1) {
        const t = ev.touches[0];
        state.input.dragging = true;
        state.input.dragStartX = t.clientX;
        state.input.dragStartY = t.clientY;
        state.input.camStartX = state.camera.x;
        state.input.camStartY = state.camera.y;
        state.input.lastPinchDist = 0;
      } else if (ev.touches.length === 2) {
        state.input.dragging = false;
        state.input.lastPinchDist = pinchDist(ev.touches[0], ev.touches[1]);
      }
    }, { passive: false });

    c.addEventListener('touchmove', (ev) => {
      ev.preventDefault();
      if (ev.touches.length === 1 && state.input.dragging) {
        const t = ev.touches[0];
        const dx = (t.clientX - state.input.dragStartX);
        const dy = (t.clientY - state.input.dragStartY);
        state.camera.setPosition(
          state.input.camStartX - dx / state.camera.zoom * CAMERA.PAN_SPEED,
          state.input.camStartY - dy / state.camera.zoom * CAMERA.PAN_SPEED
        );
      } else if (ev.touches.length === 2) {
        const d = pinchDist(ev.touches[0], ev.touches[1]);
        if (state.input.lastPinchDist) {
          const factor = d / state.input.lastPinchDist;
          state.camera.setZoom(state.camera.zoom * factor);
        }
        state.input.lastPinchDist = d;
      }
    }, { passive: false });

    window.addEventListener('touchend', () => { state.input.dragging = false; state.input.lastPinchDist = 0; }, { passive: true });

    function pinchDist(a, b) {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.hypot(dx, dy);
    }
  }

  /* -------------------------------------------------------------
   * Rendering
   * 1) Wenn externer Renderer vorhanden (window.Render.drawMap), dann delegieren
   * 2) Sonst: Fallback – schlichtes Grid zeichnen
   * ----------------------------------------------------------- */

  function render() {
    state.needsRender = false;
    const { ctx, width, height, camera, map } = state;
    if (!ctx) return;

    // Hintergrund
    ctx.fillStyle = '#0a1624';
    ctx.fillRect(0, 0, width, height);

    // Delegation an ext. Renderer (falls verfügbar)
    try {
      if (window.Render && typeof window.Render.drawMap === 'function') {
        window.Render.drawMap(ctx, state);
        return;
      }
    } catch (e) {
      error('Fehler im externen Renderer:', e);
    }

    // ---- Fallback: Grid + simple info
    const tile = (map && map.tile) || (map && map.tileSize) || 64;
    const cols = (map && map.cols) || 16;
    const rows = (map && map.rows) || 16;

    // Welt -> Bildschirm
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Grid
    const w = cols * tile;
    const h = rows * tile;
    const left = -w / 2;
    const top  = -h / 2;

    ctx.fillStyle = '#10233b';
    ctx.fillRect(left, top, w, h);

    ctx.strokeStyle = 'rgba(207,227,255,.15)';
    ctx.lineWidth = 1 / camera.zoom;
    for (let r = 0; r <= rows; r++) {
      const y = top + r * tile;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      const x = left + c * tile;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + h); ctx.stroke();
    }

    // Mittelpunkt
    ctx.fillStyle = '#8fd0ff';
    ctx.beginPath(); ctx.arc(0, 0, 3 / camera.zoom, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Debug-Overlay
    const lines = [
      `Cam: x=${Math.round(camera.x)}   y=${Math.round(camera.y)}   zoom=${camera.zoom.toFixed(2)}`,
      `Map: ${state.mapUrl || '(keine)'} `,
      `rows=${rows}  cols=${cols}  tile=${tile}`,
      `DPR=${state.DPR}   Size=${state.width}×${state.height}`
    ];
    setDbg(lines.join('\n'));
  }

  function renderLoop() {
    if (state.needsRender) render();
    requestAnimationFrame(renderLoop);
  }

  /* -------------------------------------------------------------
   * Map‑Laden
   * ----------------------------------------------------------- */

  async function loadMapJSON(url) {
    const bust = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    const t0 = performance.now();
    const res = await fetch(bust, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Map-HTTP ${res.status} @ ${url}`);
    const json = await res.json();
    const dt = Math.round(performance.now() - t0);
    log(`Map geladen: ${url} (${dt}ms)`);
    return json;
  }

  /* -------------------------------------------------------------
   * Öffentliche API: startGame / reloadGame
   * ----------------------------------------------------------- */

  async function startGame(mapUrl) {
    try {
      if (!state.canvas) {
        if (!initCanvas()) return;
        initInput();
        // Render-Schleife einmal starten
        requestRender();
        requestAnimationFrame(renderLoop);
      }

      state.startedAt = Date.now();
      state.mapUrl = mapUrl || state.mapUrl || 'assets/maps/map-demo.json';

      // Map laden
      state.map = await loadMapJSON(state.mapUrl);

      // Kamera sinnvoll initialisieren (Weltmitte)
      const tile = state.map.tile || state.map.tileSize || 64;
      const cols = state.map.cols || 16;
      const rows = state.map.rows || 16;
      state.camera.setPosition((cols * tile) / 2, (rows * tile) / 2);
      if (!Number.isFinite(state.camera.zoom)) state.camera.setZoom(CAMERA.START_ZOOM);

      requestRender();
      log('Game gestartet.', { map: state.mapUrl, version: VERSION });
    } catch (e) {
      error('startGame() fehlgeschlagen:', e);
      alert('Karte konnte nicht gestartet werden. Details in der Konsole.');
    }
  }

  async function reloadGame(mapUrl) {
    if (mapUrl) state.mapUrl = mapUrl;
    log('Neu laden…', state.mapUrl);
    return startGame(state.mapUrl);
  }

  /* -------------------------------------------------------------
   * Bridges (für UI/boot.js)
   * ----------------------------------------------------------- */

  window.startGame  = startGame;
  window.reloadGame = reloadGame;

  window.GameLoader = {
    start: (mapUrl)  => startGame(mapUrl),
    reload: (mapUrl) => reloadGame(mapUrl),
  };

  window.GameCamera = {
    setZoom:     (z)    => state.camera.setZoom(z),
    setPosition: (x, y) => state.camera.setPosition(x, y),
  };

  // Öffentlichen State bereitstellen
  window.game = state;

  log(`game.js geladen • ${VERSION} • ${DATE}`);
})();
