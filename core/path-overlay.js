/* ============================================================================
 * Datei   : core/path-overlay.js
 * Projekt : Neue Siedler – Pfad/Heatmap Overlay
 * Version : v1.0.0 (2025-10-31)
 * Autor   : ChatGPT (Assistenz)
 * Zweck   : Zeichnet ein Overlay über dem Spiel-Canvas, um "Trampelpfade"
 *           (Nutzungs-Heat) sichtbar zu machen. Inspector kann Overlay/Heatmap
 *           toggeln. Spiel kann Tiles "markieren".
 *
 * Einbindung (index.html):
 *   <!-- NACH game.js / bevor ui-Inspector-Bridge -->
 *   <script src="core/path-overlay.js?v=1.0.0"></script>
 *
 * Erwartete Umgebung:
 *   • Spiel-Canvas: <canvas id="game"> (oder Fallback #game-canvas)
 *   • Tilegröße:    64 px (Default, konfigurierbar)
 *
 * Events (Verdrahtung – kompatibel zur Inspector-Bridge):
 *   → Hört  auf:  'cb:path:overlay:on'     (Overlay sichtbar machen)
 *                 'cb:path:overlay:off'    (Overlay ausblenden)
 *                 'cb:path:heatmap:on'     (Heatmap-Modus an)
 *                 'cb:path:heatmap:off'    (Heatmap-Modus aus)
 *   → Optional:    'cb:game:start'         (Init-Autostart, falls noch nicht)
 *                  'cb:assets-ready'       (Init-Fallback)
 *
 * Öffentliche API (window.PathOverlay):
 *   • init(opts?)             – manuelles Init (nur nötig, wenn Auto-Init zu früh kommt)
 *   • toggle(on:boolean)      – Overlay an/aus
 *   • setHeatmap(on:boolean)  – Heatmap an/aus
 *   • mark(tx, ty, amt=1)     – Tile (Grid-Koordinate) verstärken
 *   • reset()                 – alle Intensitäten löschen
 *   • isEnabled()             – Overlay sichtbar?
 *   • isHeatmap()             – Heatmap-Modus aktiv?
 *
 * Render:
 *   • Eigener Canvas (#paths-overlay) über dem Game-Canvas (pointer-events:none)
 *   • Zeichnet Heat pro Tile (Alpha/Intensität). Optional spätere „Stempel“-Brushes.
 *
 * Performance:
 *   • Redraw nur bei Änderungen (mark/toggle/resize/decayTick).
 *   • Decay per rAF alle ~500 ms (konfigurierbar).
 *
 * Hinweise:
 *   • Keine Abhängigkeit vom Game-Loop – läuft unabhängig (failsafe).
 *   • Tile-Koordinaten (tx/ty) = Grid-Koordinaten, nicht Pixel.
 *   • Wenn kein Canvas gefunden wird, folgt automatischer „Lazy Init“, sobald
 *     #game auftaucht (MutationObserver/Resize).
 * ========================================================================== */


/* ============================================================================
 * [1] KONSTANTEN
 * ========================================================================== */

const PO_CONST = {
  VERSION: 'v1.0.0',
  CANVAS_ID: 'paths-overlay',
  HOST_ATTR: 'data-ui',          // wird nicht zwingend benötigt, nur zur Ordnung
  HOST_ATTR_VAL: 'paths',
  DEFAULT_TILE: 64,              // px
  DECAY_INTERVAL_MS: 500,        // wie oft die Heatmap „ausklingt“
  DECAY_STEP: 0.01,              // pro Tick (0..1)
  MAX_INTENSITY: 1.0,            // Kappung
  MIN_VISIBLE: 0.02,             // unter dieser Schwelle bleibt Tile unsichtbar
};


/* ============================================================================
 * [2] HILFSFUNKTIONEN
 * ========================================================================== */

/** Finde den Spiel-Canvas (#game oder #game-canvas). */
function findGameCanvas() {
  return document.getElementById('game') ||
         document.getElementById('game-canvas') ||
         null;
}

/** Erzeuge ein Canvas mit id und setze Style über dem Game-Canvas. */
function createOverlayCanvas(gameCanvas) {
  const c = document.createElement('canvas');
  c.id = PO_CONST.CANVAS_ID;
  c.setAttribute(PO_CONST.HOST_ATTR, PO_CONST.HOST_ATTR_VAL);

  // Stil: deckungsgleich über dem Game-Canvas
  Object.assign(c.style, {
    position: 'absolute',
    left: gameCanvas.offsetLeft + 'px',
    top:  gameCanvas.offsetTop + 'px',
    width: gameCanvas.clientWidth + 'px',
    height: gameCanvas.clientHeight + 'px',
    pointerEvents: 'none',
    zIndex: '40', // über Canvas, unter HUD (bei Bedarf anpassen)
    display: 'none', // Start: unsichtbar bis toggle(true)
  });

  // In denselben Container wie #game hängen (oder direkt Body)
  const parent = gameCanvas.parentElement || document.body;
  parent.appendChild(c);

  // Physische Größe = CSS-Größe * DPR
  resizeCanvasToClient(c);

  return c;
}

/** DPR-scharfes Resizing eines Canvas auf seine CSS-Clientgröße. */
function resizeCanvasToClient(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 CSS-Pixel == 1 „Einheit“
  return { ctx, rect, dpr };
}

/** Clamp Helfer. */
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

/** Integer Helfer. */
function i(v) { return (v|0); }


/* ============================================================================
 * [3] KLASSE: PathHeatmap
 * ========================================================================== */

class PathHeatmap {
  constructor() {
    // Runtime
    this.enabled = false;
    this.showHeat = false;

    // Grid
    this.tile = PO_CONST.DEFAULT_TILE; // px
    this.cols = 0;
    this.rows = 0;

    // Daten
    this.map = [];      // 1D Float32Array-ähnlich (hier normales Array)
    this.dirty = false; // Redraw-Flag

    // DOM
    this.canvas = null;
    this.ctx = null;

    // Timing
    this._decayTimer = 0;
    this._raf = 0;

    // Beobachter
    this._resizeObs = null;
  }

  /* ---------------- API: Lifecycle ---------------- */

  init(opts = {}) {
    // Optionen: {tileSize?, gameCanvas?}
    this.tile = i(opts.tileSize || this.tile);

    // Host finden/erzeugen
    const game = opts.gameCanvas || findGameCanvas();
    if (!game) {
      // Lazy-Init: später erneut versuchen, sobald DOM sich ändert
      this._awaitCanvas();
      return;
    }

    // Canvas anlegen oder holen
    let cv = document.getElementById(PO_CONST.CANVAS_ID);
    if (!cv) cv = createOverlayCanvas(game);
    this.canvas = cv;
    this.ctx = cv.getContext('2d');

    // Gridgröße aus Canvas ableiten
    const rect = cv.getBoundingClientRect();
    this.cols = Math.max(1, Math.ceil(rect.width / this.tile));
    this.rows = Math.max(1, Math.ceil(rect.height / this.tile));
    this.map = new Array(this.cols * this.rows).fill(0);

    // Resize beobachten (Game-Canvas oder Window)
    this._attachResizeObserver(game);

    // Zeichenloop starten
    this._startLoop();

    // Info
    console.info('[PathOverlay] init ✓',
      { tile: this.tile, cols: this.cols, rows: this.rows });
  }

  teardown() {
    this.toggle(false);
    this._stopLoop();
    if (this._resizeObs) {
      this._resizeObs.disconnect();
      this._resizeObs = null;
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.map = [];
  }

  /* ---------------- API: Sichtbarkeit/Modi ---------------- */

  toggle(on) {
    this.enabled = !!on;
    if (this.canvas) {
      this.canvas.style.display = this.enabled ? 'block' : 'none';
    }
    this.dirty = true;
  }

  setHeatmap(on) {
    this.showHeat = !!on;
    this.dirty = true;
  }

  isEnabled() { return !!this.enabled; }
  isHeatmap() { return !!this.showHeat; }

  /* ---------------- API: Datenänderungen ---------------- */

  /** Verstärkt ein Tile in Grid-Koordinaten (tx,ty). */
  mark(tx, ty, amt = 1) {
    if (!this.map.length) return;
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return;
    const idx = ty * this.cols + tx;
    const next = clamp01((this.map[idx] || 0) + Math.max(0, amt) * 0.1);
    this.map[idx] = Math.min(PO_CONST.MAX_INTENSITY, next);
    this.dirty = true;
  }

  /** Setzt die komplette Heatmap zurück. */
  reset() {
    if (!this.map.length) return;
    this.map.fill(0);
    this.dirty = true;
  }

  /* ---------------- Intern: Render/Decay ---------------- */

  _startLoop() {
    const loop = (t) => {
      // Decay zeitgesteuert
      if (!this._decayTimer) this._decayTimer = performance.now();
      const dt = t - this._decayTimer;
      if (dt >= PO_CONST.DECAY_INTERVAL_MS) {
        this._decayTimer = t;
        if (this.showHeat && this.map.length) {
          let changed = false;
          for (let i = 0; i < this.map.length; i++) {
            const v0 = this.map[i];
            if (v0 > 0) {
              const v1 = Math.max(0, v0 - PO_CONST.DECAY_STEP);
              if (v1 !== v0) { this.map[i] = v1; changed = true; }
            }
          }
          if (changed) this.dirty = true;
        }
      }

      // Redraw
      if (this.enabled && this.dirty) {
        this._draw();
        this.dirty = false;
      }

      this._raf = window.requestAnimationFrame(loop);
    };
    this._raf = window.requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this._raf) {
      window.cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  _draw() {
    if (!this.canvas || !this.ctx) return;

    const { ctx, canvas } = this;
    const rect = this.canvas.getBoundingClientRect();

    // DPR-scharf bleiben (falls Größe extern geändert wurde)
    const { dpr } = resizeCanvasToClient(canvas);

    // Hintergrund NICHT löschen → transparenter Overlay
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!this.showHeat) {
      // Platzhalter für "Overlay an, aber Heatmap aus" – später z.B. Brushes o.ä.
      // Für jetzt: nichts zeichnen.
      return;
    }

    // Heatmap zeichnen – einfache gefüllte Quadrate je Tile mit Alpha nach Intensität
    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const v = this.map[ty * this.cols + tx] || 0;
        if (v < PO_CONST.MIN_VISIBLE) continue;

        // Farbe: neutral-gelblich; Alpha via v
        const alpha = clamp01(v);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#d1a81b'; // keine Styles/Theme-Abhängigkeit

        ctx.fillRect(
          tx * this.tile,
          ty * this.tile,
          this.tile,
          this.tile
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- Intern: DOM/Resize ---------------- */

  _attachResizeObserver(gameCanvas) {
    // 1) Game-Canvas-Resize (via ResizeObserver)
    try {
      this._resizeObs = new ResizeObserver(() => this._alignToGame(gameCanvas));
      this._resizeObs.observe(gameCanvas);
    } catch {
      // Fallback: Window-Resize
      window.addEventListener('resize', () => this._alignToGame(gameCanvas));
    }
    // Einmal initial ausrichten
    this._alignToGame(gameCanvas);
  }

  _alignToGame(gameCanvas) {
    if (!this.canvas) return;
    const gcRect = gameCanvas.getBoundingClientRect();
    Object.assign(this.canvas.style, {
      left: gcRect.left + window.scrollX + 'px',
      top:  gcRect.top  + window.scrollY + 'px',
      width:  gcRect.width + 'px',
      height: gcRect.height + 'px',
    });

    // Grid an neue Größe anpassen, Inhalt proportional „verlieren“ (vereinfachend)
    const prevCols = this.cols;
    const prevRows = this.rows;
    const prevMap  = this.map.slice();

    const { rect } = resizeCanvasToClient(this.canvas);
    this.cols = Math.max(1, Math.ceil(rect.width / this.tile));
    this.rows = Math.max(1, Math.ceil(rect.height / this.tile));
    this.map  = new Array(this.cols * this.rows).fill(0);

    // Kein exaktes Resampling – wir kopieren, was passt (links oben verankert)
    const minCols = Math.min(prevCols, this.cols);
    const minRows = Math.min(prevRows, this.rows);
    for (let y = 0; y < minRows; y++) {
      for (let x = 0; x < minCols; x++) {
        this.map[y * this.cols + x] = prevMap[y * prevCols + x] || 0;
      }
    }

    this.dirty = true;
  }

  _awaitCanvas() {
    // Wenn #game noch nicht existiert, probieren wir es später wieder.
    const retry = () => {
      const gc = findGameCanvas();
      if (gc) {
        this.init({ gameCanvas: gc });
      } else {
        // nächster Versuch im nächsten Frame
        requestAnimationFrame(retry);
      }
    };
    requestAnimationFrame(retry);
  }
}


/* ============================================================================
 * [4] HAUPTLOGIK / SINGLETON
 * ========================================================================== */

(function attachSingleton(){
  const inst = new PathHeatmap();

  // Public API auf window
  window.PathOverlay = Object.freeze({
    // Lifecycle
    init: (opts) => inst.init(opts),
    teardown: () => inst.teardown(),

    // Sichtbarkeit/Modi
    toggle: (on) => inst.toggle(on),
    setHeatmap: (on) => inst.setHeatmap(on),

    // Daten
    mark: (tx, ty, amt) => inst.mark(tx, ty, amt),
    reset: () => inst.reset(),

    // Status
    isEnabled: () => inst.isEnabled(),
    isHeatmap: () => inst.isHeatmap(),

    // Debug (optional)
    _state: () => ({
      version: PO_CONST.VERSION,
      enabled: inst.enabled,
      heat: inst.showHeat,
      tile: inst.tile,
      cols: inst.cols,
      rows: inst.rows,
      cells: inst.map.length
    }),
  });

  // Auto-Init: sobald Game „startet“ oder Assets fertig sind
  window.addEventListener('cb:game:start', () => inst.init({}));
  window.addEventListener('cb:assets-ready', () => inst.init({}));

  // Inspector-Bridge Events
  window.addEventListener('cb:path:overlay:on',  () => inst.toggle(true));
  window.addEventListener('cb:path:overlay:off', () => inst.toggle(false));
  window.addEventListener('cb:path:heatmap:on',  () => inst.setHeatmap(true));
  window.addEventListener('cb:path:heatmap:off', () => inst.setHeatmap(false));

  // Safety: falls schon alles geladen ist
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Kleines Delay, damit #game bereits im DOM steht
    setTimeout(() => inst.init({}), 0);
  } else {
    document.addEventListener('DOMContentLoaded', () => inst.init({}));
  }
})();


/* ============================================================================
 * [5] KURZ-DOKU / HOW-TO (für dich im Projekt)
 * ========================================================================== *
 * 1) Datei einbinden (index.html), NACH dem Spiel-Canvas:
 *      <canvas id="game"></canvas>
 *      <script src="game.js?..."></script>
 *      <script src="core/path-overlay.js?v=1.0.0"></script>
 *
 * 2) Inspector-Bridge ist bereits darauf ausgelegt (inspector.bridges.js):
 *      // Buttons im "Pfade"-Tab senden:
 *      window.dispatchEvent(new Event('cb:path:overlay:on'));   // Overlay an
 *      window.dispatchEvent(new Event('cb:path:overlay:off'));  // Overlay aus
 *      window.dispatchEvent(new Event('cb:path:heatmap:on'));   // Heatmap an
 *      window.dispatchEvent(new Event('cb:path:heatmap:off'));  // Heatmap aus
 *
 * 3) Pfadnutzung im Spiel registrieren:
 *      // Beispiel: Walker betritt Tile (tx,ty)
 *      PathOverlay.mark(tx, ty);              // verstärkt dieses Tile
 *
 * 4) Manuelles Umschalten (Konsole):
 *      PathOverlay.toggle(true);
 *      PathOverlay.setHeatmap(true);
 *      PathOverlay._state();
 *
 * 5) Styling (optional – falls Parent kein position:relative hat):
 *      Stelle sicher, dass der Container von #game position:relative besitzt,
 *      damit das Overlay exakt deckungsgleich ausgerichtet werden kann.
 *
 * 6) Erweiterungen (später):
 *      – Brush-Stempel (Richtungsanteile), Vektorfelder
 *      – Export/Import der Heatmap (CSV/JSON)
 *      – Farbskalen, Legende, Screenshot-Funktion
 * ========================================================================== */
