/* ============================================================================
 * Datei   : core/path-overlay.js
 * Projekt : Neue Siedler – Pfad/Heatmap Overlay
 * Version : v25.11.13-final
 * Autor   : ChatGPT (Assistenz)
 *
 * Zweck   : Zeichnet ein transparentes Overlay über dem Spiel-Canvas (#game),
 *           um Trampelpfade/Nutzungsintensität pro Tile sichtbar zu machen.
 *
 * Design-Entscheidungen (konform Bootflow):
 *   • KEIN Autostart mehr auf DOMContentLoaded / assets-ready.
 *   • Init erfolgt ausschließlich nach cb:game:start (vom Boot).
 *   • Doppel-Init wird über File- und Instance-Guards verhindert.
 *
 * Struktur : Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Abhäng.  : #game-Canvas existiert wenn cb:game:start kommt.
 * Events   : hört  auf:  cb:game:start, cb:path:overlay:on/off, cb:path:heatmap:on/off
 *            sendet:     (keine)
 * API      : window.PathOverlay.{init,toggle,setHeatmap,mark,reset,isEnabled,isHeatmap,_state}
 * ========================================================================== */


/* ============================================================================
 * [Imports] (keine externen Imports – Plain JS Modul)
 * ========================================================================== */


/* ============================================================================
 * [Run-Once: File-Guard] – verhindert, dass diese Datei mehrfach läuft
 * ========================================================================== */
if (window.__PATH_OVERLAY_FILE_LOADED__) {
  console.info('[PathOverlay] file already loaded – skip duplicate include');
  // Sofort beenden, um doppelte Registrierung zu vermeiden
  // (bewusst KEIN teardown hier, da ein zweites Include immer ein Fehler ist)
  // eslint-disable-next-line no-useless-return
  ;(function(){ return; })();
}
window.__PATH_OVERLAY_FILE_LOADED__ = true;


/* ============================================================================
 * [Konstanten]
 * ========================================================================== */
const PO = {
  VERSION: 'v25.11.13-final',
  CANVAS_ID: 'paths-overlay',
  DEFAULT_TILE: 64,          // px pro Tile
  DECAY_INTERVAL_MS: 500,    // Intervall fürs Ausklingen der Heat
  DECAY_STEP: 0.01,          // Abbau pro Tick (0..1)
  MAX_INTENSITY: 1.0,
  MIN_VISIBLE: 0.02,
  Z_INDEX: 40,               // über Game, unter HUD
};


/* ============================================================================
 * [Hilfsfunktionen]
 * ========================================================================== */
function clamp01(v){ return Math.max(0, Math.min(1, v)); }
function i(v){ return (v|0); }

function findGameCanvas(){
  return document.getElementById('game') ||
         document.querySelector('canvas#game') ||
         null;
}

function ensureRelativeParent(el) {
  const parent = el.parentElement || document.body;
  const style = window.getComputedStyle(parent);
  if (style.position === 'static') parent.style.position = 'relative';
  return parent;
}

function createOverlayCanvas(gameCanvas){
  const c = document.createElement('canvas');
  c.id = PO.CANVAS_ID;
  Object.assign(c.style, {
    position: 'absolute',
    inset: '0',             // deckungsgleich im Parent
    pointerEvents: 'none',
    zIndex: String(PO.Z_INDEX),
    display: 'none',        // erst sichtbar nach toggle(true)
  });
  ensureRelativeParent(gameCanvas).appendChild(c);
  resizeCanvasToClient(c);  // Backbuffer an CSS-Größe anpassen
  return c;
}

function resizeCanvasToClient(canvas){
  const rect = canvas.getBoundingClientRect();
  const dpr  = Math.max(1, window.devicePixelRatio || 1);
  const w    = Math.max(1, Math.round(rect.width  * dpr));
  const h    = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w)  canvas.width  = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // 1 CSS-Pixel == 1 Einheit
  return { ctx, rect, dpr };
}


/* ============================================================================
 * [Klasse] PathHeatmap – kapselt Zustand & Rendering
 * ========================================================================== */
class PathHeatmap {
  constructor(){
    this.enabled   = false;
    this.showHeat  = false;

    this.tile = PO.DEFAULT_TILE;
    this.cols = 0;
    this.rows = 0;
    this.map  = [];       // 1D-Array der Intensitäten

    this.canvas = null;
    this.ctx    = null;

    this._raf         = 0;
    this._decayTimer  = 0;
    this._resizeObs   = null;
  }

  /* ---------------- Lifecycle ---------------- */
  init(opts = {}){
    if (window.__PATH_OVERLAY_INIT__) {
      console.info('[PathOverlay] already initialized – skip');
      return;
    }
    window.__PATH_OVERLAY_INIT__ = true;

    this.tile = i(opts.tileSize || this.tile);

    const game = opts.gameCanvas || findGameCanvas();
    if (!game) {
      console.warn('[PathOverlay] no #game canvas yet – init postponed');
      // Ein einziger Retry-Frame (kein Polling-Spam)
      requestAnimationFrame(() => this.init(opts));
      return;
    }

    // Canvas erstellen/finden
    this.canvas = document.getElementById(PO.CANVAS_ID) || createOverlayCanvas(game);
    this.ctx    = this.canvas.getContext('2d');

    // Grid bestimmen
    const { rect } = resizeCanvasToClient(this.canvas);
    this.cols = Math.max(1, Math.ceil(rect.width  / this.tile));
    this.rows = Math.max(1, Math.ceil(rect.height / this.tile));
    this.map  = new Array(this.cols * this.rows).fill(0);

    // Resize beobachten
    try {
      this._resizeObs = new ResizeObserver(() => this._alignToGame(game));
      this._resizeObs.observe(game);
    } catch {
      window.addEventListener('resize', () => this._alignToGame(game));
      window.addEventListener('orientationchange', () => this._alignToGame(game));
    }
    this._alignToGame(game);

    // Renderloop
    this._startLoop();

    console.info('[PathOverlay] init ✓', { tile:this.tile, cols:this.cols, rows:this.rows });
  }

  teardown(){
    this.toggle(false);
    this._stopLoop();
    if (this._resizeObs){ try{ this._resizeObs.disconnect(); }catch{} this._resizeObs = null; }
    if (this.canvas && this.canvas.parentElement){
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx    = null;
    this.map    = [];
    window.__PATH_OVERLAY_INIT__ = false;
  }

  /* ---------------- Sichtbarkeit/Modi ---------------- */
  toggle(on){
    this.enabled = !!on;
    if (this.canvas) this.canvas.style.display = this.enabled ? 'block' : 'none';
    this._markDirty();
  }
  setHeatmap(on){ this.showHeat = !!on; this._markDirty(); }

  isEnabled(){ return !!this.enabled; }
  isHeatmap(){ return !!this.showHeat; }

  /* ---------------- Daten ---------------- */
  mark(tx, ty, amt = 1){
    if (!this.map.length) return;
    if (tx<0 || ty<0 || tx>=this.cols || ty>=this.rows) return;
    const idx  = ty * this.cols + tx;
    const next = clamp01((this.map[idx] || 0) + Math.max(0, amt) * 0.1);
    this.map[idx] = Math.min(PO.MAX_INTENSITY, next);
    this._markDirty();
  }
  reset(){
    if (!this.map.length) return;
    this.map.fill(0);
    this._markDirty();
  }

  /* ---------------- Intern: Render/Resize ---------------- */
  _markDirty(){ this._dirty = true; }

  _startLoop(){
    const loop = (t)=>{
      // Decay
      if (!this._decayTimer) this._decayTimer = t;
      if ((t - this._decayTimer) >= PO.DECAY_INTERVAL_MS) {
        this._decayTimer = t;
        if (this.showHeat && this.map.length){
          let changed = false;
          for (let k=0; k<this.map.length; k++){
            const v0 = this.map[k];
            if (v0>0){
              const v1 = Math.max(0, v0 - PO.DECAY_STEP);
              if (v1!==v0){ this.map[k]=v1; changed = true; }
            }
          }
          if (changed) this._markDirty();
        }
      }

      // Redraw
      if (this.enabled && this._dirty) {
        this._draw();
        this._dirty = false;
      }

      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stopLoop(){ if (this._raf){ cancelAnimationFrame(this._raf); this._raf = 0; } }

  _draw(){
    if (!this.canvas || !this.ctx) return;
    const { ctx, canvas } = this;
    const { rect } = resizeCanvasToClient(canvas); // DPR-scharf bleiben
    ctx.clearRect(0,0,rect.width,rect.height);

    if (!this.showHeat) return; // Overlay an, aber Heatmap aus → nichts zeichnen

    for (let ty=0; ty<this.rows; ty++){
      for (let tx=0; tx<this.cols; tx++){
        const v = this.map[ty*this.cols + tx] || 0;
        if (v < PO.MIN_VISIBLE) continue;
        ctx.globalAlpha = clamp01(v);
        ctx.fillStyle   = '#d1a81b';
        ctx.fillRect(tx*this.tile, ty*this.tile, this.tile, this.tile);
      }
    }
    ctx.globalAlpha = 1;
  }

  _alignToGame(gameCanvas){
    if (!this.canvas) return;

    // Canvas an Game-Canvas ausrichten (innerhalb desselben Parents)
    ensureRelativeParent(gameCanvas);
    Object.assign(this.canvas.style, {
      width:  gameCanvas.clientWidth  + 'px',
      height: gameCanvas.clientHeight + 'px',
      left:   '0',
      top:    '0',
    });

    // Grid ggf. neu aufbauen (links oben verankert)
    const prevCols = this.cols, prevRows = this.rows, prev = this.map.slice();
    const { rect } = resizeCanvasToClient(this.canvas);
    this.cols = Math.max(1, Math.ceil(rect.width  / this.tile));
    this.rows = Math.max(1, Math.ceil(rect.height / this.tile));
    this.map  = new Array(this.cols * this.rows).fill(0);
    const minC = Math.min(prevCols, this.cols), minR = Math.min(prevRows, this.rows);
    for (let y=0; y<minR; y++){
      for (let x=0; x<minC; x++){
        this.map[y*this.cols + x] = prev[y*prevCols + x] || 0;
      }
    }
    this._markDirty();
  }
}


/* ============================================================================
 * [Hauptlogik] – Singleton + Events sauber, einmalig binden
 * ========================================================================== */
(function setupSingletonBindings(){
  // Einmalige Bindings-Guard (wichtig gegen doppelte Logs)
  if (window.__PATH_OVERLAY_BINDINGS__) return;
  window.__PATH_OVERLAY_BINDINGS__ = true;

  const inst = new PathHeatmap();

  // Öffentliche API
  window.PathOverlay = Object.freeze({
    init:       (opts)=>inst.init(opts),
    teardown:   ()=>inst.teardown(),
    toggle:     (on)=>inst.toggle(on),
    setHeatmap: (on)=>inst.setHeatmap(on),
    mark:       (tx,ty,amt)=>inst.mark(tx,ty,amt),
    reset:      ()=>inst.reset(),
    isEnabled:  ()=>inst.isEnabled(),
    isHeatmap:  ()=>inst.isHeatmap(),
    _state:     ()=>({ version:PO.VERSION, enabled:inst.enabled, heat:inst.showHeat,
                       tile:inst.tile, cols:inst.cols, rows:inst.rows, cells:inst.map.length }),
  });

  // ✨ Konformer Start: NUR nach cb:game:start initialisieren
  window.addEventListener('cb:game:start', () => inst.init({}));

  // Inspector-Brücke
  window.addEventListener('cb:path:overlay:on',  ()=>inst.toggle(true));
  window.addEventListener('cb:path:overlay:off', ()=>inst.toggle(false));
  window.addEventListener('cb:path:heatmap:on',  ()=>inst.setHeatmap(true));
  window.addEventListener('cb:path:heatmap:off', ()=>inst.setHeatmap(false));

  console.info('[PathOverlay] bindings ready', PO.VERSION);
})();


/* ============================================================================
 * [Exports] – (global via window.PathOverlay)
 * ========================================================================== */
