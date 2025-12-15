/* ============================================================================
 * Datei   : core/path-overlay.js
 * Projekt : Neue Siedler – Pfad/Heatmap Overlay
 * Version : v4.1.6-align+autotrack (2025-12-15)
 *
 * Ziel dieses Hotfix:
 *   1) Overlay/Heatmap IMMER schaltbar (auch wenn cb:game:start verpasst wurde)
 *   2) Kein "klebt am Bildschirm" mehr: wir benutzen die exakt gleiche Kamera-
 *      Transform wie core/game.map.js:
 *        ctx.setTransform(zoom,0,0,zoom,-camX*zoom,-camY*zoom)
 *   3) Trampelpfade robust zeichnen (niemals crashen, auch wenn Texturen fehlen)
 *   4) Optional: vorhandene Pfad-Texturen laden:
 *        assets/tex/path/topdown_path0..9.png
 *
 * Struktur : Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ========================================================================== */
(() => {
  'use strict';

  // --- Guards ---------------------------------------------------------------
  // Wichtig: Das Modul MUSS window.PathOverlay immer bereitstellen.
  if (window.__PATH_OVERLAY_V415__) return;
  window.__PATH_OVERLAY_V415__ = true;

  // --- Logging (CBLog falls vorhanden) --------------------------------------
  const TAG  = '[path-overlay]';
  const LOG  = (...a) => (window.CBLog?.info ?? console.log )(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error?? console.error)(TAG, ...a);

  // --- Konstanten -----------------------------------------------------------
  const PO = {
    VERSION: 'v4.1.5-hotfix',
    CANVAS_ID: 'paths-overlay',
    Z_INDEX: 40,
    DEFAULT_TILE: 64,

    // Darstellung
    MIN_VISIBLE: 0.02,
    MAX_INTENSITY: 1.0,

    // Heatmap
    HEAT_ALPHA_MIN: 0.08,
    HEAT_ALPHA_MAX: 0.55,

    // Overlay (Textur/Stamp)
    OVL_ALPHA_MIN: 0.10,
    OVL_ALPHA_MAX: 0.65,

    // Decay
    DECAY_INTERVAL_MS: 500,
    DECAY_STEP: 0.01,

    // Texturen
    TEX_BASE: 'assets/tex/path/',
    TEX_FILES: [
      'topdown_path0.png','topdown_path1.png','topdown_path2.png','topdown_path3.png','topdown_path4.png',
      'topdown_path5.png','topdown_path6.png','topdown_path7.png','topdown_path8.png','topdown_path9.png',
      // Fallback falls im Repo noch .PNG groß geschrieben ist
      'topdown_path0.PNG','topdown_path1.PNG','topdown_path2.PNG','topdown_path3.PNG','topdown_path4.PNG',
      'topdown_path5.PNG','topdown_path6.PNG','topdown_path7.PNG','topdown_path8.PNG','topdown_path9.PNG'
    ],
  };

  // --- Hilfsfunktionen ------------------------------------------------------
  function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function ensureRelativeParent(gameCanvas){
    const parent = gameCanvas?.parentElement || document.body;
    const style  = window.getComputedStyle(parent);
    if (style.position === 'static') parent.style.position = 'relative';
    return parent;
  }

  function createOverlayCanvas(gameCanvas){
    const c = document.createElement('canvas');
    c.id = PO.CANVAS_ID;
    Object.assign(c.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: String(PO.Z_INDEX),
      display: 'none',
    });
    ensureRelativeParent(gameCanvas).appendChild(c);
    resizeCanvasToClient(c);
    return c;
  }

  function resizeCanvasToClient(canvas){
    // WICHTIG: Unser Haupt-Canvas (core/game.map.js) nutzt KEIN DPR-Scaling,
    // sondern setzt canvas.width/height direkt auf window.innerWidth/innerHeight.
    // Wenn wir hier rect*dpr nehmen, driftet das Overlay (halbes Panning / falsches Zoom).
    const w = (window.innerWidth  || document.documentElement.clientWidth  || canvas.width  || 1) | 0;
    const h = (window.innerHeight || document.documentElement.clientHeight || canvas.height || 1) | 0;
    if (canvas.width !== w || canvas.height !== h){
      canvas.width  = Math.max(1, w);
      canvas.height = Math.max(1, h);
    }
  }
  }

  function getCameraState(){
    // Kamera kann aus window.GameCamera kommen (dein Standard)
    const cam  = window.GameCamera || {};
    const zoom = (typeof cam.zoom === 'number') ? cam.zoom : 1;
    const x    = (typeof cam.x    === 'number') ? cam.x    : 0;
    const y    = (typeof cam.y    === 'number') ? cam.y    : 0;
    return { x, y, zoom };
  }

  // Richtung (8-way) aus delta (tx/ty Schritte)
  function dir8FromDelta(dx, dy){
    // dy positiv = nach unten (screen)
    // Mapping: 0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE
    if (dx === 0 && dy === 0) return 2;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > ay){
      return dx > 0 ? 0 : 4;
    }else if (ay > ax){
      return dy > 0 ? 2 : 6;
    }else{
      // diagonal
      if (dx > 0 && dy > 0) return 1;
      if (dx < 0 && dy > 0) return 3;
      if (dx < 0 && dy < 0) return 5;
      return 7; // dx>0 && dy<0
    }
  }

  // --- Klasse ---------------------------------------------------------------
  class PathOverlayImpl {
    constructor(){
      this.enabled  = false;
      this.showHeat = false;
      this.showOvl  = true;   // Overlay = echte Stamps (default ON wenn enabled)
      this.inited   = false;

      this.tile = PO.DEFAULT_TILE;
      this.cols = 0;
      this.rows = 0;

      // map: Float intensity
      this.map = [];
      // last dir per tile (0..7)
      this.dir = [];

      // unit tracking for direction, falls Units kein prevTx/prevTy senden
      this._unitLast = new Map();

      // Wenn init (Canvas/Map) noch nicht bereit ist, puffern wir Steps.
      // So gehen keine Trampelpfade verloren, nur weil der User das Overlay
      // erst später einschaltet.
      this._preInitSteps = [];
      this._preInitMax   = 2000;

      // Debug/Stats
      this.stepCount = 0;
      this.lastStep = null;

      // DOM/Canvas
      this.gameCanvas = null;
      this.canvas = null;
      this.ctx = null;

      // Decay timer
      this._decayTimer = null;
      this._dirty = false;

      // Optional textures
      this._tex = [];
      this._texReady = false;
      this._texTried = false;

      // bind
      this._onResize = () => { if (this.canvas) resizeCanvasToClient(this.canvas); this._dirty = true; };
      this._onCamera = () => { this._dirty = true; this.requestRepaint(); };

      this._onUnitStep = (ev) => {
        const d = ev?.detail || {};
        const tx = Number.isFinite(d.tx) ? d.tx : null;
        const ty = Number.isFinite(d.ty) ? d.ty : null;
        if (tx === null || ty === null) return;

        // Falls wir noch nicht initialisiert sind (Map-Dims/Canvas noch nicht da),
        // puffern wir den Step und verarbeiten ihn später.
        if (!this.inited || !this.map || !this.map.length){
          this._preInitSteps.push({ ...d, tx, ty, t: Date.now() });
          if (this._preInitSteps.length > this._preInitMax) this._preInitSteps.shift();
          return;
        }

        const id = (d.id ?? d.unitId ?? d.uid ?? 'unit');
        const last = this._unitLast.get(id);
        let dx = 0, dy = 0;
        if (last){
          dx = tx - last.tx;
          dy = ty - last.ty;
        }
        this._unitLast.set(id, { tx, ty });
        this.stepCount++;
        this.lastStep = { id, tx, ty, dx, dy, t: Date.now() };

        // Gewichtung (Worker stärker)
        const kind = String(d.kind || d.type || '');
        const isWorker = /woodcutter|stonecutter|fisher|worker/i.test(kind);
        const amt = (typeof d.weight === 'number') ? d.weight : (isWorker ? 0.14 : 0.08);

        const cell = this._idx(tx, ty);
        if (cell < 0) return;
        this.map[cell] = clamp01((this.map[cell] || 0) + amt);
        this.dir[cell] = dir8FromDelta(dx, dy);

        this._dirty = true;
        this.requestRepaint();
      };
    }

    _idx(tx, ty){
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) return -1;
      if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return -1;
      return ty * this.cols + tx;
    }

    init(opts = {}){
      try{
        if (this.inited) return true;

        this.gameCanvas = document.getElementById('game');
        if (!this.gameCanvas){
          WARN('Kein #game Canvas gefunden – init wird später erneut versucht.');
          return false;
        }

        this.canvas = document.getElementById(PO.CANVAS_ID) || createOverlayCanvas(this.gameCanvas);
        this.ctx = this.canvas.getContext('2d');

        // tileSize aus GameMap/Runtime falls verfügbar
        const ts = (window.Game?.tileSize ?? window.GameMap?.tileSize ?? window.Map?.tileSize);
        if (typeof ts === 'number' && ts > 0) this.tile = ts;

        // grid dims aus Map-Modul wenn vorhanden (Fallback: 128x128)
        const cols = window.Game?.cols ?? window.Map?.cols ?? window.GameMap?.cols ?? window.Mod?.cols;
        const rows = window.Game?.rows ?? window.Map?.rows ?? window.GameMap?.rows ?? window.Mod?.rows;
        this.cols = (typeof cols === 'number' && cols > 0) ? cols : 128;
        this.rows = (typeof rows === 'number' && rows > 0) ? rows : 128;

        const n = this.cols * this.rows;
        this.map = new Array(n).fill(0);
        this.dir = new Array(n).fill(2);

        // Vor-Init Steps nachziehen (damit Pfade von Anfang an "da" sind)
        if (Array.isArray(this._preInitSteps) && this._preInitSteps.length){
          const tmp = this._preInitSteps.slice();
          this._preInitSteps.length = 0;
          for (const d of tmp){
            try{
              // Reuse handler logic: wir dispatchen ein Fake-Event
              this._onUnitStep({ detail: d });
            }catch(_){}
          }
        }

        // Events
        window.addEventListener('resize', this._onResize);
        window.addEventListener('cb:camera-change', this._onCamera);
        window.addEventListener('cb:unit:step', this._onUnitStep);

        // Decay loop
        this._decayTimer = window.setInterval(() => this._tickDecay(), PO.DECAY_INTERVAL_MS);

        // Optional: Texturen laden (fail-safe)
        this._tryLoadTextures();

        this.inited = true;
        LOG('init OK', { tile:this.tile, cols:this.cols, rows:this.rows });
        return true;
      }catch(err){
        ERR('init FAIL', err);
        return false;
      }
    }

    teardown(){
      try{
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('cb:camera-change', this._onCamera);
        window.removeEventListener('cb:unit:step', this._onUnitStep);
        if (this._decayTimer) window.clearInterval(this._decayTimer);
        this._decayTimer = null;
        this.inited = false;
      }catch(err){
        ERR('teardown FAIL', err);
      }
    }

    _tryLoadTextures(){
      if (this._texTried) return;
      this._texTried = true;

      // NICHT blockieren – wir laden asynchron, Overlay funktioniert auch ohne.
      const imgs = [];
      let done = 0;
      const total = PO.TEX_FILES.length;

      const finish = () => {
        this._tex = imgs;
        this._texReady = imgs.some(Boolean);
        LOG('Textures loaded:', this._texReady ? 'OK' : 'NONE', imgs.filter(Boolean).length, '/', total);
        this._dirty = true;
        this.requestRepaint();
      };

      PO.TEX_FILES.forEach((name, i) => {
        const img = new Image();
        img.onload = () => { imgs[i] = img; done++; if (done === total) finish(); };
        img.onerror = () => { imgs[i] = null; done++; if (done === total) finish(); };
        img.src = PO.TEX_BASE + name;
      });
    }

    // --- API ----------------------------------------------------------------
    toggle(on){
      // Lazy init: falls cb:game:start verpasst wurde.
      if (!this.inited) this.init({});
      this.enabled = !!on;
      if (this.canvas){
        this.canvas.style.display = this.enabled ? 'block' : 'none';
      }
      this._dirty = true;
      this.requestRepaint();
      LOG('toggle', this.enabled);
    }

    // Heatmap-only switch
    setHeatmap(on){
      if (!this.inited) this.init({});
      this.showHeat = !!on;

      // UX: Heatmap ON soll IMMER sichtbar werden, auch wenn der User nicht
      // zuerst "Overlay ON" geklickt hat.
      if (this.showHeat && !this.enabled) this.toggle(true);

      this._dirty = true;
      this.requestRepaint();
      LOG('heatmap', this.showHeat);
    }

    // Overlay stamps switch (separat, falls du beides getrennt willst)
    setOverlay(on){
      if (!this.inited) this.init({});
      this.showOvl = !!on;

      // UX: Wenn Stamps an sind, aber das Canvas aus ist → automatisch aktivieren.
      if (this.showOvl && !this.enabled) this.toggle(true);

      this._dirty = true;
      this.requestRepaint();
      LOG('overlay', this.showOvl);
    }

    mark(tx, ty, amt = 0.1){
      if (!this.inited) this.init({});
      const cell = this._idx(tx, ty);
      if (cell < 0) return;
      this.map[cell] = clamp01((this.map[cell] || 0) + amt);
      this._dirty = true;
      this.requestRepaint();
    }

    reset(){
      if (!this.inited) this.init({});
      this.map.fill(0);
      this._dirty = true;
      this.requestRepaint();
    }

    isEnabled(){ return !!this.enabled; }
    isHeatmap(){ return !!this.showHeat; }

    _tickDecay(){
      if (!this.inited) return;
      let any = false;
      for (let i=0;i<this.map.length;i++){
        const v = this.map[i];
        if (v > 0){
          const nv = v - PO.DECAY_STEP;
          this.map[i] = nv > 0 ? nv : 0;
          if (this.map[i] > 0) any = true;
        }
      }
      if (any){
        this._dirty = true;
        this.requestRepaint();
      }
    }

    requestRepaint(){
      // Dein Projekt nutzt cb:request-repaint an mehreren Stellen
      try{ window.dispatchEvent(new CustomEvent('cb:request-repaint')); }catch(_){}
      // Fallback: selbst rendern, wenn kein zentraler Repaint kommt
      this.render();
    }

    render(){
      try{
        if (!this.enabled || !this.canvas || !this.ctx) return;
        if (!this._dirty) return;

        resizeCanvasToClient(this.canvas);

        const ctx = this.ctx;
        const { x:camX, y:camY, zoom } = getCameraState();

        // Clear in Screen-Space
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);

        // World-Space transform wie GameMap
        ctx.setTransform(zoom,0,0,zoom,-camX*zoom,-camY*zoom);

        // Draw visible cells
        const ts = this.tile;
        const min = PO.MIN_VISIBLE;

        // 1) Overlay stamps (Texturen oder Fallback-Punkt)
        if (this.showOvl){
          for (let ty=0; ty<this.rows; ty++){
            for (let tx=0; tx<this.cols; tx++){
              const i = ty*this.cols + tx;
              const v = this.map[i] || 0;
              if (v < min) continue;

              const a = PO.OVL_ALPHA_MIN + (PO.OVL_ALPHA_MAX-PO.OVL_ALPHA_MIN) * v;
              ctx.globalAlpha = a;

              const px = tx*ts;
              const py = ty*ts;

              // Textur-Stamp falls vorhanden, sonst Fallback
              if (this._texReady){
                const img = this._tex[(tx + ty) % this._tex.length] || null;
                if (img){
                  // Rotation: aus last-dir
                  const dir = this.dir[i] ?? 2;
                  // 0..7 -> Winkel in 45° Schritten; baseline 0 = E
                  const ang = (Math.PI/4) * dir;

                  const cx = px + ts/2;
                  const cy = py + ts/2;

                  ctx.save();
                  ctx.translate(cx, cy);
                  ctx.rotate(ang);
                  ctx.translate(-ts/2, -ts/2);
                  ctx.drawImage(img, 0, 0, ts, ts);
                  ctx.restore();
                }else{
                  // Fallback (wenn einzelne fehlen)
                  ctx.fillStyle = 'rgba(40,30,20,1)';
                  ctx.beginPath();
                  ctx.arc(px+ts*0.5, py+ts*0.5, ts*0.18, 0, Math.PI*2);
                  ctx.fill();
                }
              }else{
                // Fallback (ohne Texturen): kleiner "Trampel"-Blob
                ctx.fillStyle = 'rgba(40,30,20,1)';
                ctx.beginPath();
                ctx.ellipse(px+ts*0.5, py+ts*0.55, ts*0.22, ts*0.14, 0, 0, Math.PI*2);
                ctx.fill();
              }
            }
          }
        }

        // 2) Heatmap (darüber/ darunter – hier darüber)
        if (this.showHeat){
          for (let ty=0; ty<this.rows; ty++){
            for (let tx=0; tx<this.cols; tx++){
              const i = ty*this.cols + tx;
              const v = this.map[i] || 0;
              if (v < min) continue;

              const a = PO.HEAT_ALPHA_MIN + (PO.HEAT_ALPHA_MAX-PO.HEAT_ALPHA_MIN) * v;
              ctx.globalAlpha = a;

              // Rot-ish (ohne feste Farbpalette – nur alpha variierend)
              // Wir nehmen ein neutrales Dunkel und lassen Alpha sprechen,
              // damit es nicht zu bunt wird.
              ctx.fillStyle = 'rgba(255, 140, 80, 1)';
              ctx.fillRect(tx*ts, ty*ts, ts, ts);
            }
          }
        }

        ctx.globalAlpha = 1;
        this._dirty = false;
      }catch(err){
        // Niemals Game-Loop killen
        ERR('render FAIL', err);
      }
    }

    selfTest(){
      const s = {
        version: PO.VERSION,
        inited: this.inited,
        enabled: this.enabled,
        heatmap: this.showHeat,
        overlay: this.showOvl,
        tile: this.tile,
        cols: this.cols,
        rows: this.rows,
        texTried: this._texTried,
        texReady: this._texReady,
        hasCanvas: !!this.canvas,
        stepCount: this.stepCount,
        lastStep: this.lastStep,
        cam: getCameraState(),
      };
      LOG('selfTest', s);
      try{ window.dispatchEvent(new CustomEvent('cb:log', { detail: { type:'info', msg: TAG+' selfTest '+JSON.stringify(s) }})); }catch(_){}
      return s;
    }
  }

  // --- Instance -------------------------------------------------------------
  const inst = new PathOverlayImpl();

  // Public API – kompatibel mit inspector.bridges.js (toggle/setHeatmap)
  window.PathOverlay = Object.freeze({
    init: (opts)=>inst.init(opts),
    teardown: ()=>inst.teardown(),
    toggle: (on)=>inst.toggle(on),
    setHeatmap: (on)=>inst.setHeatmap(on),
    setOverlay: (on)=>inst.setOverlay(on),
    mark: (tx,ty,amt)=>inst.mark(tx,ty,amt),
    reset: ()=>inst.reset(),
    isEnabled: ()=>inst.isEnabled(),
    isHeatmap: ()=>inst.isHeatmap(),
    selfTest: ()=>inst.selfTest(),
    _state: ()=>({
      version: PO.VERSION,
      inited: inst.inited,
      enabled: inst.enabled,
      heatmap: inst.showHeat,
      overlay: inst.showOvl,
      tile: inst.tile,
      cols: inst.cols,
      rows: inst.rows,
      texReady: inst._texReady,
      stepCount: inst.stepCount,
      lastStep: inst.lastStep
    }),
  });

  // --- Inspector/Event wiring (robust) -------------------------------------
  window.addEventListener('cb:game:start', () => { inst.init({}); });

  // Init-Versuche zusätzlich, falls cb:game:start verpasst wurde oder Scripts später laden
  const tryInitSoon = () => { try{ inst.init({}); }catch(_){} };
  window.addEventListener('DOMContentLoaded', tryInitSoon);
  window.addEventListener('load', tryInitSoon);

  // Wenn Units schon laufen, bevor init fertig ist, wollen wir trotzdem Steps puffern:
  window.addEventListener('cb:unit:step', (e)=>{ try{ if(!inst.inited) inst._onUnitStep(e); }catch(_){} });

  // Inspector / UI Events (mehrere Aliase, weil du die Buttons/Labels teils als
  // "Overlay", teils als "Layer" bezeichnet hast).
  //
  // Regel:
  // - overlay/layer = Canvas sichtbar / unsichtbar
  // - heatmap       = Heatmap-Anteil (Alpha-Feld) an/aus
  // - stamps        = Textur-Stamps (Richtung) an/aus
  window.addEventListener('cb:path:overlay:on',  () => { inst.toggle(true);  });
  window.addEventListener('cb:path:overlay:off', () => { inst.toggle(false); });

  window.addEventListener('cb:path:layer:on',    () => { inst.toggle(true);  }); // Alias
  window.addEventListener('cb:path:layer:off',   () => { inst.toggle(false); });

  window.addEventListener('cb:path:heatmap:on',  () => inst.setHeatmap(true));
  window.addEventListener('cb:path:heatmap:off', () => inst.setHeatmap(false));

  window.addEventListener('cb:path:stamps:on',   () => inst.setOverlay(true));
  window.addEventListener('cb:path:stamps:off',  () => inst.setOverlay(false));

  // Weitere Aliase (falls UI anders heißt)
  window.addEventListener('cb:path:overlaylayer:on',  () => inst.setOverlay(true));
  window.addEventListener('cb:path:overlaylayer:off', () => inst.setOverlay(false));

  // --- Final log ------------------------------------------------------------
  LOG('loaded', PO.VERSION);
})();
