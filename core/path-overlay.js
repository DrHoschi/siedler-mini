/* ============================================================================
 * Datei   : core/path-overlay.js
 * Projekt : Neue Siedler – Pfad/Heatmap Overlay
 * Version : v25.12.15-paths-overlay-visible
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


// Pfad-Texturen (optional) – liegt bei dir unter: assets/tex/path/topdown_path0..9.png
// Wichtig: Wir laden LAZY (erst wenn Overlay aktiv ist), und fallen auf Pattern zurück,
// falls die Images nicht gefunden werden.
const TEX = {
  BASE_PATH: 'assets/tex/path/',
  FILE_PREFIX: 'topdown_path',
  COUNT: 10,
  EXT: '.png',
  SCALE: 1.0,          // 1.0 = volle Tilegröße
  ALPHA_MIN: 0.18,     // Overlay-Deckkraft bei geringer Intensität
  ALPHA_MAX: 0.55      // Overlay-Deckkraft bei hoher Intensität
};

function _hash2i(x,y){
  // deterministischer Hash für Tile-Varianten
  x = (x|0); y=(y|0);
  let h = (x * 73856093) ^ (y * 19349663);
  h ^= (h >>> 13);
  return (h >>> 0);
}
function _texUrl(i){
  return `${TEX.BASE_PATH}${TEX.FILE_PREFIX}${i}${TEX.EXT}`;
}
function _dirAngleFromDelta(dtx, dty){
  // 8-dir in Radiant. (0 = rechts, pi/2 = unten)
  const dx = Number(dtx)||0;
  const dy = Number(dty)||0;
  if (!dx && !dy) return 0;
  return Math.atan2(dy, dx);
}



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
    this.showOvl   = false; // sichtbares Pfad-Overlay (Textur/Pattern)

    this.tile = PO.DEFAULT_TILE;
    this.cols = 0;
    this.rows = 0;
    this.map  = [];       // 1D-Array der Intensitäten


    this.dir  = [];       // 1D-Array der Richtungen (Radiant)

    // Texturen (lazy geladen)
    this._texImgs     = [];
    this._texReady    = false;
    this._texLoading  = false;
    this._texFail     = 0;
    this.canvas = null;
    this.ctx    = null;

    this._raf         = 0;
    this._decayTimer  = 0;
    this._resizeObs   = null;

    // Kamera-Status (World-Pixel): wird über cb:camera-change aktualisiert
    this.camera = { x:0, y:0, zoom:1 };
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
    // Wichtig: Wir speichern die Heatmap in WELT-Tiles (nicht Screen-Tiles),
    // damit sie beim Panning/Zooming "mit der Karte" wandert.
    const gm = window.GameMap?._state || null;
    if (gm && Number.isFinite(gm.cols) && Number.isFinite(gm.rows)) {
      this.cols = Math.max(1, gm.cols|0);
      this.rows = Math.max(1, gm.rows|0);
      this.map  = new Array(this.cols * this.rows).fill(0);
      this.dir  = new Array(this.cols * this.rows).fill(0);
      this.dir  = new Array(this.cols * this.rows).fill(0);
    } else {
      // Fallback: Wenn Map-State noch nicht verfügbar ist, nutze Screen-Grid.
      const { rect } = resizeCanvasToClient(this.canvas);
      this.cols = Math.max(1, Math.ceil(rect.width  / this.tile));
      this.rows = Math.max(1, Math.ceil(rect.height / this.tile));
      this.map  = new Array(this.cols * this.rows).fill(0);
    }

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
    try{ window.dispatchEvent(new CustomEvent('cb:paths:ready',{detail:{version:PO.VERSION, tile:this.tile, cols:this.cols, rows:this.rows}})); }catch(e){}
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


/* ---------------- Texturen (lazy) ---------------- */
_ensureTextures(){
  if (this._texReady || this._texLoading) return;
  this._texLoading = true;

  const imgs = [];
  let done = 0;

  const onDone = ()=>{
    done++;
    if (done < TEX.COUNT) return;
    this._texLoading = false;
    // Wenn wenigstens 1 Bild ok: ready
    this._texReady = imgs.some(im => im && im.complete && im.naturalWidth > 0);
    this._texImgs  = imgs;
    // Einmal neu zeichnen
    this._markDirty();
    console.info('[PathOverlay] textures ready?', this._texReady, 'fails:', this._texFail);
  };

  for (let i=0;i<TEX.COUNT;i++){
    const im = new Image();
    im.loading = 'eager';
    im.decoding = 'async';
    im.onload = ()=> onDone();
    im.onerror = ()=>{ this._texFail++; onDone(); };
    im.src = _texUrl(i);
    imgs[i] = im;
  }
}

  /* ---------------- Sichtbarkeit/Modi ---------------- */
  /* ---------------- Sichtbarkeit/Modi ---------------- */
  _syncVisibility(){
    // Canvas soll sichtbar sein, sobald EIN Modus aktiv ist.
    this.enabled = !!(this.showOvl || this.showHeat);
    if (this.canvas) this.canvas.style.display = this.enabled ? 'block' : 'none';
  }

  // Inspector "Overlay ON/OFF" → sichtbares Pfad-Overlay (Pattern/Textur)
  toggle(on){
    this.showOvl = !!on;
    if (this.showOvl) this._ensureTextures();
    this._syncVisibility();
    this._markDirty();
  }

  // Inspector "Heatmap ON/OFF" → farbige Intensitäts-Heatmap
  setHeatmap(on){
    this.showHeat = !!on;
    this._syncVisibility();
    this._markDirty();
  }

  isEnabled(){ return !!this.enabled; }
  isHeatmap(){ return !!this.showHeat; }
  isOverlay(){ return !!this.showOvl; }

  /* ---------------- Daten ---------------- */
  mark(tx, ty, amt = 1, angle = null){
    if (!this.map.length) return;
    if (tx<0 || ty<0 || tx>=this.cols || ty>=this.rows) return;
    const idx  = ty * this.cols + tx;
    const next = clamp01((this.map[idx] || 0) + Math.max(0, amt) * 0.1);
    this.map[idx] = Math.min(PO.MAX_INTENSITY, next);
    if (angle !== null && Number.isFinite(angle)){
      // leicht glätten (verhindert hartes Flackern)
      const prev = Number(this.dir[idx]) || 0;
      const a = Number(angle);
      this.dir[idx] = prev * 0.7 + a * 0.3;
    }
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

    // 1) Canvas auf Clientgröße bringen (DPR-scharf)
    const { dpr } = resizeCanvasToClient(canvas);

    // 2) Immer in Screen-Space löschen (sonst bleiben Reste beim Panning)
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Wenn kein Modus aktiv ist → nichts zeichnen (Canvas bleibt aber sauber)
    if (!this.showHeat && !this.showOvl) return;

    // 3) Kamera-Transform (wie Map-Render): World-Pixel → Screen
    const cam = this.camera || {x:0,y:0,zoom:1};
    const zoom = Number(cam.zoom) || 1;
    const camX = Number(cam.x) || 0;
    const camY = Number(cam.y) || 0;

    const s = dpr * zoom;
    ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s);

    // 4) Nur sichtbaren Bereich zeichnen (Performance)
    const viewW = (canvas.width  / s); // sichtbare Welt-Pixel
    const viewH = (canvas.height / s);

    const pad = 2; // +Tiles am Rand
    let minTx = Math.floor(camX / this.tile) - pad;
    let minTy = Math.floor(camY / this.tile) - pad;
    let maxTx = Math.floor((camX + viewW) / this.tile) + pad;
    let maxTy = Math.floor((camY + viewH) / this.tile) + pad;

    minTx = Math.max(0, minTx); minTy = Math.max(0, minTy);
    maxTx = Math.min(this.cols - 1, maxTx); maxTy = Math.min(this.rows - 1, maxTy);

    for (let ty=minTy; ty<=maxTy; ty++){
      const rowOff = ty * this.cols;
      for (let tx=minTx; tx<=maxTx; tx++){
        const v = this.map[rowOff + tx] || 0;
        if (v < PO.MIN_VISIBLE) continue;
        // (A) Heatmap: farbige Fläche
        if (this.showHeat){
          ctx.globalAlpha = clamp01(v);
          ctx.fillStyle   = '#d1a81b';
          ctx.fillRect(tx*this.tile, ty*this.tile, this.tile, this.tile);
        }

        // (B) Overlay: "Trampelpfad"-Pattern (subtil, grau/schwarz)
        // Hinweis: Das ist absichtlich ein einfacher Pattern-Stil, bis du deine
        // finalen Pfad-Texturen/Brushes lieferst. Dann tauschen wir das Rendering
        // gegen echte Stamp-Sprites aus.
        if (this.showOvl){
  // Variante wählen (deterministisch), damit das Muster natürlich wirkt
  const hv   = _hash2i(tx,ty);
  const idxT = (TEX.COUNT>0) ? (hv % TEX.COUNT) : 0;
  const im   = this._texReady ? this._texImgs[idxT] : null;

  // Deckkraft abhängig von Intensität (v)
  const a = TEX.ALPHA_MIN + (TEX.ALPHA_MAX - TEX.ALPHA_MIN) * clamp01(v);
  ctx.globalAlpha = a;

  // Richtung (Radiant) pro Tile – wird beim Step/mark aktualisiert
  const ang = Number(this.dir[ty*this.cols + tx]) || 0;

  if (im && im.complete && im.naturalWidth>0){
    const cx = tx*this.tile + this.tile*0.5;
    const cy = ty*this.tile + this.tile*0.5;
    const sz = this.tile * TEX.SCALE;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.drawImage(im, -sz*0.5, -sz*0.5, sz, sz);
    ctx.restore();
  }else{
    // Fallback: simples Pattern (wenn Texturen fehlen/noch laden)
    const g = (hv & 7); // 0..7
    ctx.fillStyle = (g<3) ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.22)';
    ctx.fillRect(tx*this.tile, ty*this.tile, this.tile, this.tile);
  }
}
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

    // Grid ggf. neu aufbauen (Welt-Grid bevorzugt)
    const prevCols = this.cols, prevRows = this.rows, prev = this.map.slice();

    // Canvas DPR-scharf halten (Größe kommt vom Game-Canvas)
    resizeCanvasToClient(this.canvas);

    // Wenn Map-State verfügbar: Heatmap in Welt-Tiles (ganze Karte)
    const gm = window.GameMap?._state || null;
    const targetCols = (gm && Number.isFinite(gm.cols)) ? (gm.cols|0) : prevCols;
    const targetRows = (gm && Number.isFinite(gm.rows)) ? (gm.rows|0) : prevRows;

    // Nur neu allokieren, wenn sich die Größe wirklich geändert hat
    if (targetCols !== prevCols || targetRows !== prevRows){
      this.cols = Math.max(1, targetCols);
      this.rows = Math.max(1, targetRows);
      this.map  = new Array(this.cols * this.rows).fill(0);

      const minC = Math.min(prevCols, this.cols), minR = Math.min(prevRows, this.rows);
      for (let y=0; y<minR; y++){
        for (let x=0; x<minC; x++){
          this.map[y*this.cols + x] = prev[y*prevCols + x] || 0;
        }
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
    isOverlay:  ()=>inst.isOverlay(),
    _state:     ()=>({ version:PO.VERSION, enabled:inst.enabled, overlay:inst.showOvl, heat:inst.showHeat,
                       tile:inst.tile, cols:inst.cols, rows:inst.rows, cells:inst.map.length }),
  });

  // ✨ Konformer Start: NUR nach cb:game:start initialisieren
  window.addEventListener('cb:game:start', () => inst.init({}));

  // Inspector-Brücke
  window.addEventListener('cb:path:overlay:on',  ()=>inst.toggle(true));
  window.addEventListener('cb:path:overlay:off', ()=>inst.toggle(false));
  window.addEventListener('cb:path:heatmap:on',  ()=>inst.setHeatmap(true));
  window.addEventListener('cb:path:heatmap:off', ()=>inst.setHeatmap(false));

  // Kamera: wenn gepannt/gezoomt wird, muss das Overlay neu gerendert werden,
  // sonst wirkt es, als würde es "am Bildschirm kleben".
  window.addEventListener('cb:camera-change', (ev)=>{
    const d = ev?.detail || {};
    const x = Number(d.x) || 0;
    const y = Number(d.y) || 0;
    const z = Number(d.zoom) || 1;
    inst.camera = { x, y, zoom: z };
    if (inst.isEnabled() && inst.isHeatmap()) inst._markDirty();
  });

  // Trampelpfade: bei jedem Tile-Step einer Unit "Intensity" erhöhen.
  // Hinweis: Das funktioniert sofort für Carrier/Worker, sobald irgendwo cb:unit:step emittiert wird.
  window.addEventListener('cb:unit:step', (ev)=>{
    const d = ev?.detail || {};
    const tx = Number.isFinite(d.tx) ? d.tx : Math.floor(d.x || 0);
    const ty = Number.isFinite(d.ty) ? d.ty : Math.floor(d.y || 0);

    // Gewichtung: Carrier etwas stärker (weil oft laufen), Worker normal.
    const type = String(d.type || '').toLowerCase();
    const kind = String(d.kind || '').toLowerCase();
    const amt  = (type === 'carrier' || kind.includes('carrier')) ? 2 : 1;

    const ang = _dirAngleFromDelta(d.dtx, d.dty);
    inst.mark(tx, ty, amt, ang);
});



  console.info('[PathOverlay] bindings ready', PO.VERSION);
})();


/* ============================================================================
 * [Exports] – (global via window.PathOverlay)
 * ========================================================================== */
