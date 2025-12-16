/* ============================================================================
 * Datei   : core/path-overlay.js
 * Projekt : Neue Siedler – Trampelpfade (Stamps) + Heatmap
 * Version : v4.3.0-segment-move-trail-decayctl (2025-12-16)
 *
 * Ziel (Endlich stabil, ohne "wir drehen uns im Kreis"):
 *   1) EIN Koordinatensystem: Wir zeichnen über OverlayHooks auf dem
 *      bestehenden #overlay Canvas (Renderer synchronisiert Size/Scale).
 *      → kein Versatz, kein "halber Weg", kein "zu wenig Zoom".
 *
 *   2) Trampelpfade tracken IMMER (auch wenn Inspector noch aus ist).
 *      Sichtbarkeit ist trotzdem schaltbar, aber Default = sichtbar.
 *
 *   3) Kein Global-Name-Konflikt mit pfglue:
 *      - Trampelpfade nutzen window.PathOverlay (wie Inspector erwartet)
 *      - pfglue darf window.PathOverlay NICHT überschreiben (siehe Patch pfglue)
 *
 *   4) Richtungsgebundene Stamps:
 *      - wir merken pro Tile die letzte Bewegungsrichtung (dx/dy)
 *      - Stamps werden per ctx.rotate(angle) gedreht
 *
 *   5) Texturen:
 *      assets/tex/path/topdown_path0..9.png  (wir versuchen .png und .PNG)
 *
 * Struktur : IIFE → Konstanten → Helpers → Klasse → Wiring → Export
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[path-overlay]';
  const LOG  = (window.CBLog?.info  || console.info ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // -------------------------------------------------------------------------
  // KONSTANTEN
  // -------------------------------------------------------------------------

  const CFG = {
    VERSION: 'v4.2.0-stable-overlayhooks',

    // Default: sichtbar ab Spielstart (wie von dir gewünscht)
    DEFAULT_VISIBLE: true,
    DEFAULT_STAMPS : true,
    DEFAULT_HEATMAP: false,

    // Event-Quelle
    // - Move-Segmente (cb:unit:move) sind die neue Hauptquelle (glatte Linie)
    // - Step-Fallback (cb:unit:step) optional, standardmäßig AUS um Zickzack zu vermeiden
    USE_MOVE_EVENTS_DEFAULT  : true,
    USE_STEP_FALLBACK_DEFAULT: false,

    // Darstellung
    MIN_VISIBLE: 0.02,

    // Heatmap Alpha (wir verwenden nur Alpha, Farbe bleibt neutral/schwarz)
    HEAT_ALPHA_MIN: 0.06,
    HEAT_ALPHA_MAX: 0.45,

    // Stamp Alpha
    STAMP_ALPHA_MIN: 0.10,
    STAMP_ALPHA_MAX: 0.70,

    // Decay (zeitbasiert + Inspector steuerbar)
    // Hinweis: Wir decayen NICHT mehr in fixen "Steps", sondern per Sekunde.
    DECAY_TICK_MS      : 250,
    DECAY_PER_SEC_BASE : 0.0008, // 100% Speed: ~0.08 Intensität pro 100s

    // Legacy-Fallback (wird nur genutzt, wenn DECAY_PER_SEC_BASE fehlt)
    DECAY_INTERVAL_MS  : 500,
    DECAY_STEP         : 0.01,

    // Texturen
    TEX_BASE: 'assets/tex/path/',
    TEX_NAMES: Array.from({length:10}, (_,i)=>`topdown_path${i}`),

    // Weighting
    WEIGHT_WORKER: 0.14,
    WEIGHT_CARRIER: 0.08,
  };

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------

  const clamp01 = (v)=> Math.max(0, Math.min(1, v));

  function lerp(a,b,t){ return a + (b-a)*t; }

  function isWorkerKind(kind){
    return /woodcutter|stonecutter|fisher|worker/i.test(String(kind||''));
  }

  function safeInt(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function angleFromDelta(dx, dy){
    // Canvas: x rechts, y nach unten. atan2(dy,dx) passt.
    return Math.atan2(dy, dx);
  }

  function dir8FromDelta(dx,dy){
    // 0..7 Richtung. (E,SE,S,SW,W,NW,N,NE)
    if (!dx && !dy) return 0;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ay > ax){
      return dy > 0 ? 2 : 6; // S oder N
    } else if (ax > ay){
      return dx > 0 ? 0 : 4; // E oder W
    } else {
      // diagonal
      if (dx > 0 && dy > 0) return 1; // SE
      if (dx < 0 && dy > 0) return 3; // SW
      if (dx < 0 && dy < 0) return 5; // NW
      return 7; // NE
    }
  }

  function ensureOverlayHooksReady(cb){
    // OverlayHooks kann später geladen werden (in index.html steht path-overlay vor overlay-hooks).
    // Wir versuchen sofort und dann kurz zu "pollen", bis es da ist.
    let tries = 0;
    const tick = ()=>{
      if (window.OverlayHooks && typeof window.OverlayHooks.register === 'function'){
        cb();
        return;
      }
      tries++;
      if (tries > 120) { // ~2s bei 16ms
        WARN('OverlayHooks nicht gefunden – Pfad-Overlay kann nicht zeichnen.');
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  function getMapState(){
    // bevorzugt GameMap._state (stabil in deinem Projekt)
    const s = window.GameMap?._state;
    if (s && Number.isFinite(s.cols) && Number.isFinite(s.rows) && Number.isFinite(s.tileSize)){
      return { cols:s.cols, rows:s.rows, tile:s.tileSize };
    }
    // Fallbacks
    const cols = window.Game?.cols ?? window.Map?.cols;
    const rows = window.Game?.rows ?? window.Map?.rows;
    const tile = window.Game?.tileSize ?? window.Map?.tileSize;
    if (Number.isFinite(cols) && Number.isFinite(rows) && Number.isFinite(tile)){
      return { cols, rows, tile };
    }
    return null;
  }

  function getViewportTileBounds(cam, ctx, tile){
    // sichtbarer Weltbereich in Pixeln
    const w = ctx.canvas.width  / (cam.zoom || 1);
    const h = ctx.canvas.height / (cam.zoom || 1);
    const x0 = cam.x;
    const y0 = cam.y;
    const x1 = cam.x + w;
    const y1 = cam.y + h;

    // in Tiles
    const tx0 = Math.max(0, Math.floor(x0 / tile) - 1);
    const ty0 = Math.max(0, Math.floor(y0 / tile) - 1);
    const tx1 = Math.floor(x1 / tile) + 1;
    const ty1 = Math.floor(y1 / tile) + 1;
    return { tx0, ty0, tx1, ty1 };
  }

  // -------------------------------------------------------------------------
  // KLASSE
  // -------------------------------------------------------------------------

  class TrampleOverlay {
    constructor(){
      // Sichtbarkeit/Modi
      this.visible = CFG.DEFAULT_VISIBLE;
      this.showStamps = CFG.DEFAULT_STAMPS;
      this.showHeatmap = CFG.DEFAULT_HEATMAP;

      // Grid
      this.cols = 0;
      this.rows = 0;
      this.tile = 64;

      // Data
      this.map = null; // Float32Array intensity
      this.dir = null; // Int8Array direction 0..7

      // Unit last positions
      this._unitLast = new Map();

      // Steps buffer falls Map-Dims noch fehlen
      this._preInitSteps = [];
      this._preInitMax = 2000;

      // Texturen
      this._tex = new Array(10).fill(null);
      this._texReady = false;
      this._texTried = false;

      // Debug/Stats
      this.stepCount = 0;
      this.lastStep = null;
      this._dbgLoggedDraw = false;

      // Decay
      this._decayTimer = 0;
      this.decayPaused    = false;
      this.decaySpeedMult = 1.0; // 1.0 = 100%
      this.decayPerSec    = CFG.DECAY_PER_SEC_BASE;

      // Segment-Events vs Step-Events
      this.useMoveEvents  = !!CFG.USE_MOVE_EVENTS_DEFAULT;
      this.useStepEvents  = !!CFG.USE_STEP_FALLBACK_DEFAULT;
      this._seenMoveEvent = false;

      // Buffer für Move-Segmente (falls Map spät initialisiert)
      this._preInitMoves = [];
      this._preInitMovesMax = 1000;

      // OverlayHooks layer name
      this._layerName = 'trample-paths';
      this._layerRegistered = false;
    }

    // ----------------------------
    // INIT / GRID
    // ----------------------------

    ensureGrid(){
      const ms = getMapState();
      if (!ms) return false;

      const changed = (ms.cols !== this.cols) || (ms.rows !== this.rows) || (ms.tile !== this.tile);

      this.cols = ms.cols;
      this.rows = ms.rows;
      this.tile = ms.tile;

      if (!this.map || changed){
        this.map = new Float32Array(this.cols * this.rows);
        this.dir = new Int8Array(this.cols * this.rows);

        // buffered Steps nachziehen
        if (this._preInitSteps.length){
          const steps = this._preInitSteps.slice();
          this._preInitSteps.length = 0;
          for (const d of steps){
            this._applyStepDetail(d);
          }
        }

        // buffered Move-Segmente nachziehen
        if (this._preInitMoves.length){
          const moves = this._preInitMoves.slice();
          this._preInitMoves.length = 0;
          for (const d of moves){
            this._applyMoveDetail(d);
          }
        }
      }
      return true;
    }

    _idx(tx,ty){
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) return -1;
      if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return -1;
      return ty * this.cols + tx;
    }

    // ----------------------------
    // TRACKING
    // ----------------------------

    onUnitStep(ev){
      // Wenn wir Move-Segmente nutzen, sind Tile-Steps nur noch Fallback.
      if (this.useMoveEvents && !this.useStepEvents) return;
      const d = ev?.detail || {};
      // tx/ty Pflicht
      const tx = Number.isFinite(d.tx) ? d.tx : null;
      const ty = Number.isFinite(d.ty) ? d.ty : null;
      if (tx === null || ty === null) return;

      // Wenn Grid noch nicht da ist: puffern
      if (!this.ensureGrid()){
        this._preInitSteps.push({ ...d, tx, ty, t: Date.now() });
        if (this._preInitSteps.length > this._preInitMax) this._preInitSteps.shift();
        return;
      }

      this._applyStepDetail({ ...d, tx, ty });
    }

    // ----------------------------
    // MOVE-SEGMENT EVENTS (cb:unit:move)
    //  - Hauptquelle für glatte Trampelpfade (Linie statt Treppe)
    //  - Detail: {from:{x,y}, to:{x,y}, id, kind, type, weight?, idle?}
    // ----------------------------

    onUnitMove(ev){
      if (!this.useMoveEvents) return;

      const d = ev?.detail || {};
      if (d.idle === true) return;

      const from = d.from, to = d.to;
      const x0 = Number(from?.x), y0 = Number(from?.y);
      const x1 = Number(to?.x),   y1 = Number(to?.y);
      if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return;

      // Micro-Jitter killen
      const dist = Math.hypot(x1 - x0, y1 - y0);
      if (dist < 0.20) return;

      // Wenn Grid noch nicht da ist: puffern
      if (!this.ensureGrid()){
        this._preInitMoves.push({ ...d, t: Date.now() });
        if (this._preInitMoves.length > this._preInitMovesMax) this._preInitMoves.shift();
        return;
      }

      this._seenMoveEvent = true;
      this._applyMoveDetail(d);
    }

    _getBuildingsArray(){
      // möglichst kompatibel mit deinem Projekt (verschiedene Versionen/Monoliths)
      const g = window.Game;
      if (!g) return [];
      try{
        const a = (typeof g.getBuildings === 'function') ? g.getBuildings() : (g.buildings || []);
        if (Array.isArray(a)) return a;
        if (a && typeof a.list === 'function') return a.list();
      }catch(_e){}
      return [];
    }

    _isInBuildingFootprint(tx, ty){
      // HQ/Buildings nicht "dreckig" stempeln – weder beim Spawn noch beim Deliver-Reinlaufen
      const arr = this._getBuildingsArray();
      for (const b of arr){
        if (!b) continue;
        const bx = (b.x ?? b.tx ?? 0) | 0;
        const by = (b.y ?? b.ty ?? 0) | 0;
        const bw = Math.max(1, (b.w ?? b.width ?? 1) | 0);
        const bh = Math.max(1, (b.h ?? b.height ?? 1) | 0);
        if (tx >= bx && tx < bx + bw && ty >= by && ty < by + bh) return true;
      }
      return false;
    }

    _applyMoveDetail(d){
      const from = d.from, to = d.to;
      const x0 = Number(from?.x), y0 = Number(from?.y);
      const x1 = Number(to?.x),   y1 = Number(to?.y);

      const id = (d.id ?? d.unitId ?? d.uid ?? 'unit');
      const kind = String(d.kind || d.type || '');
      const isW = isWorkerKind(kind);

      const amt = (typeof d.weight === 'number')
        ? d.weight
        : (isW ? CFG.WEIGHT_WORKER : CFG.WEIGHT_CARRIER);

      // Segment in konstanten Abständen sampeln (runde Stempel, keine Rotation nötig)
      const step = 0.20; // Tiles
      const dx = x1 - x0, dy = y1 - y0;
      const dist = Math.hypot(dx, dy);
      const n = Math.max(1, Math.ceil(dist / step));

      // Duplikate vermeiden (wenn mehrere Samples im gleichen Tile landen)
      let lastTx = null, lastTy = null;

      for (let i=0; i<=n; i++){
        const t = i / n;
        const x = x0 + dx * t;
        const y = y0 + dy * t;
        const tx = Math.floor(x);
        const ty = Math.floor(y);

        if (tx === lastTx && ty === lastTy) continue;
        lastTx = tx; lastTy = ty;

        // nicht auf/in Gebäuden stempeln (HQ-Spawn Problem)
        if (this._isInBuildingFootprint(tx, ty)) continue;

        this._applyStepDetail({ id, kind, tx, ty, weight: amt });
      }
    }


    _applyStepDetail(d){
      const tx = d.tx, ty = d.ty;

      // NICHT auf/in Gebäuden stempeln (HQ bleibt sauber)
      if (this._isInBuildingFootprint(tx, ty)) return;

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

      const kind = String(d.kind || d.type || '');
      const isW = isWorkerKind(kind);

      const amt = (typeof d.weight === 'number')
        ? d.weight
        : (isW ? CFG.WEIGHT_WORKER : CFG.WEIGHT_CARRIER);

      const cell = this._idx(tx, ty);
      if (cell < 0) return;

      this.map[cell] = clamp01((this.map[cell] || 0) + amt);
      this.dir[cell] = dir8FromDelta(dx, dy);
    }

    // ----------------------------
    // TEXTURE LOADING
    // ----------------------------

    _tryLoadTextures(){
      if (this._texTried) return;
      this._texTried = true;

      let loaded = 0;
      let done = 0;

      const finalize = ()=>{
        done++;
        if (done >= 10){
          this._texReady = (loaded > 0);
          LOG('Textures ready:', this._texReady, `(loaded ${loaded}/10)`);
        }
      };

      for (let i=0;i<10;i++){
        const base = CFG.TEX_BASE + CFG.TEX_NAMES[i];
        const img = new Image();

        // Wir versuchen zuerst .png, dann .PNG (falls du noch am Umbenennen bist)
        const tryUrls = [base + '.png', base + '.PNG'];
        let urlIdx = 0;

        const tryNext = ()=>{
          if (urlIdx >= tryUrls.length){
            this._tex[i] = null;
            finalize();
            return;
          }
          img.src = tryUrls[urlIdx++];
        };

        img.onload = ()=>{
          this._tex[i] = img;
          loaded++;
          finalize();
        };
        img.onerror = ()=>{
          // nächster Versuch (PNG groß) oder endgültig fail
          tryNext();
        };

        tryNext();
      }
    }

    // ----------------------------
    // TOGGLES (Inspector)
    // ----------------------------

    setVisible(flag){
      this.visible = !!flag;
      // overlay canvas wird pro frame cleared, daher muss der layer aktiv bleiben;
      // wir steuern die Sichtbarkeit im draw().
    }

    setHeatmap(flag){ this.showHeatmap = !!flag; this._emitState('heatmap'); }
    setStamps(flag){ this.showStamps = !!flag; this._emitState('stamps'); }

    // ----------------------------
    // INSPECTOR-API (Decay + State)
    // ----------------------------
    setDecaySpeed(mult){
      // mult: 0.0 .. 3.0 (0..300%)
      const v = Number(mult);
      if (!Number.isFinite(v)) return;
      this.decaySpeedMult = Math.max(0, Math.min(3, v));
      this._emitState('decay:speed');
    }

    setDecayPerSec(perSec){
      const v = Number(perSec);
      if (!Number.isFinite(v)) return;
      this.decayPerSec = Math.max(0, v);
      this._emitState('decay:persec');
    }

    setDecayPaused(flag){
      this.decayPaused = !!flag;
      this._emitState('decay:paused');
    }

    toggleDecayPaused(){
      this.setDecayPaused(!this.decayPaused);
    }

    setUseStepFallback(flag){
      this.useStepEvents = !!flag;
      this._emitState('events:stepFallback');
    }

    setUseMoveEvents(flag){
      this.useMoveEvents = !!flag;
      this._emitState('events:move');
    }

    getState(){
      return {
        visible     : !!this.visible,
        stamps      : !!this.showStamps,
        heatmap     : !!this.showHeatmap,
        decayPaused : !!this.decayPaused,
        decaySpeed  : Number(this.decaySpeedMult || 1),
        decayPerSec : Number(this.decayPerSec || CFG.DECAY_PER_SEC_BASE || 0),
        useMoveEvents: !!this.useMoveEvents,
        useStepFallback: !!this.useStepEvents
      };
    }

    _emitState(reason){
      try{
        window.dispatchEvent(new CustomEvent('cb:path:state', { detail: { reason, state: this.getState() } }));
      }catch(_e){}
    }


    // ----------------------------
    // DRAW (OverlayHooks Layer)
    // ----------------------------

    draw(ctx, cam){
      // Wenn nicht sichtbar -> nichts zeichnen
      if (!this.visible) return;
      if (!this.showHeatmap && !this.showStamps) return;

      // Grid sicherstellen (wenn Map spät initialisiert)
      if (!this.ensureGrid()) return;

      // DBG (einmalig): Canvas + Cam + Grid + Flags (hilft gegen Cache/Koordinaten-Rätsel)
      if (!this._dbgLoggedDraw){
        this._dbgLoggedDraw = true;
        try{
          LOG('DBG draw:',
              'canvas=', (ctx?.canvas?.width||0) + 'x' + (ctx?.canvas?.height||0),
              'cam=', { x: cam?.x, y: cam?.y, zoom: cam?.zoom },
              'grid=', this.cols + 'x' + this.rows, 'tile=', this.tile,
              'visible=', this.visible, 'stamps=', this.showStamps, 'heatmap=', this.showHeatmap);
        }catch(_){/* noop */}
      }

      // Texturen bei Bedarf laden (lazy)
      if (!this._texTried) this._tryLoadTextures();

      const tile = this.tile;

      // Viewport -> Tile Bounds
      const b = getViewportTileBounds(cam, ctx, tile);

      ctx.save();

      // Welt → Screen (exakt wie deine Map)
      const z = cam.zoom || 1;
      ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);

      // HEATMAP (neutral: schwarz mit Alpha)
      if (this.showHeatmap){
        // Wir verwenden globalAlpha + schwarze FillRects, damit es "unaufdringlich" ist.
        for (let ty=b.ty0; ty<=b.ty1 && ty<this.rows; ty++){
          for (let tx=b.tx0; tx<=b.tx1 && tx<this.cols; tx++){
            const cell = this._idx(tx, ty);
            if (cell < 0) continue;
            const v = this.map[cell];
            if (v < CFG.MIN_VISIBLE) continue;

            const a = lerp(CFG.HEAT_ALPHA_MIN, CFG.HEAT_ALPHA_MAX, v);
            ctx.globalAlpha = a;
            ctx.fillStyle = '#000';
            ctx.fillRect(tx*tile, ty*tile, tile, tile);
          }
        }
      }

      // STAMPS (Texturen / Fallback)
      if (this.showStamps){
        for (let ty=b.ty0; ty<=b.ty1 && ty<this.rows; ty++){
          for (let tx=b.tx0; tx<=b.tx1 && tx<this.cols; tx++){
            const cell = this._idx(tx, ty);
            if (cell < 0) continue;
            const v = this.map[cell];
            if (v < CFG.MIN_VISIBLE) continue;

            const idx = Math.min(9, Math.max(0, Math.floor(v * 9.999)));
            const img = this._texReady ? this._tex[idx] : null;

            const a = lerp(CFG.STAMP_ALPHA_MIN, CFG.STAMP_ALPHA_MAX, v);
            ctx.globalAlpha = a;

            const px = tx*tile;
            const py = ty*tile;

            const dir = this.dir[cell] || 0;
            const ang = (dir===0?0:
                         dir===1?Math.PI/4:
                         dir===2?Math.PI/2:
                         dir===3?3*Math.PI/4:
                         dir===4?Math.PI:
                         dir===5?-3*Math.PI/4:
                         dir===6?-Math.PI/2:
                         -Math.PI/4);

            if (img){
              ctx.save();
              ctx.translate(px + tile/2, py + tile/2);
              ctx.rotate(ang);
              ctx.drawImage(img, -tile/2, -tile/2, tile, tile);
              ctx.restore();
            } else {
              // Fallback: kleines "Tritt"-Rect (damit man IMMER was sieht)
              ctx.fillStyle = '#000';
              ctx.fillRect(px + tile*0.25, py + tile*0.35, tile*0.5, tile*0.3);
            }
          }
        }
      }

      ctx.restore();

      // Decay (zeitbasiert)
      this._tickDecay();
    }

    _tickDecay(){
      const now = (performance && typeof performance.now === 'function') ? performance.now() : Date.now();
      if (!this._decayTimer) this._decayTimer = now;

      const tickMs = CFG.DECAY_TICK_MS || CFG.DECAY_INTERVAL_MS || 250;
      const dtMs = now - this._decayTimer;
      if (dtMs < tickMs) return;

      this._decayTimer = now;

      // nur decayn, wenn wir überhaupt Daten haben
      if (!this.map) return;

      if (this.decayPaused) return;

      // Basis (per Sekunde) * Speed-Multiplier
      const basePerSec = (typeof this.decayPerSec === 'number' && this.decayPerSec >= 0)
        ? this.decayPerSec
        : (CFG.DECAY_PER_SEC_BASE || (CFG.DECAY_STEP / ((CFG.DECAY_INTERVAL_MS||500)/1000)));

      const perSec = basePerSec * (this.decaySpeedMult || 1.0);
      const step = perSec * (dtMs / 1000);

      if (!(step > 0)) return;

      for (let i=0;i<this.map.length;i++){
        const v = this.map[i];
        if (v <= 0) continue;
        const nv = v - step;
        this.map[i] = nv > 0 ? nv : 0;
      }
    }

    // ----------------------------
    // REGISTER LAYER
    // ----------------------------

    registerLayer(){
      if (this._layerRegistered) return;
      ensureOverlayHooksReady(()=>{
        try{
          LOG('mode=overlay-hooks');
          window.OverlayHooks.register(this._layerName, (ctx, cam)=> this.draw(ctx, cam));
          window.OverlayHooks.enable(this._layerName, true); // aktiv
          this._layerRegistered = true;
          LOG('registered layer:', this._layerName, 'visible=', this.visible);
        }catch(e){
          WARN('konnte OverlayHooks layer nicht registrieren:', e);
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // SINGLETON + WIRING
  // -------------------------------------------------------------------------

  const inst = new TrampleOverlay();

  // 1) Immer registrieren (damit ab Start sichtbar)
  inst.registerLayer();

  // 2) Unit Steps immer tracken
  window.addEventListener('cb:unit:step', (e)=>{ try{ inst.onUnitStep(e); }catch(err){ WARN('onUnitStep err', err); } });
  window.addEventListener('cb:unit:move', (e)=>{ try{ inst.onUnitMove(e); }catch(err){ WARN('onUnitMove err', err); } });

  // 3) Toggle-Events (Inspector)
  //    Decay-Control: Speed (0..3) + Freeze
  window.addEventListener('cb:path:decay:speed', (e)=>{
    const d = e?.detail || {};
    const v = (d.mult ?? d.speed ?? d.value);
    inst.setDecaySpeed(Number(v));
  });
  window.addEventListener('cb:path:decay:freeze', (e)=>{
    const d = e?.detail || {};
    if (typeof d.paused === 'boolean') inst.setDecayPaused(d.paused);
    else inst.toggleDecayPaused();
  });

  //    Overlay = Sichtbarkeit (und Stamps automatisch an, damit man wirklich etwas sieht)
  window.addEventListener('cb:path:overlay:on',  ()=>{ inst.setVisible(true);  inst.setStamps(true); });
  window.addEventListener('cb:path:overlay:off', ()=>{ inst.setVisible(false); });

  // Alias: "Layer" in deinem Sprachgebrauch = Stamps
  window.addEventListener('cb:path:layer:on',    ()=>{ inst.setVisible(true); inst.setStamps(true); });
  window.addEventListener('cb:path:layer:off',   ()=>{ inst.setStamps(false); });

  // Heatmap toggles
  window.addEventListener('cb:path:heatmap:on',  ()=> inst.setHeatmap(true));
  window.addEventListener('cb:path:heatmap:off', ()=> inst.setHeatmap(false));

  // Optional separate Stamps toggle (wenn du Buttons dafür willst)
  window.addEventListener('cb:path:stamps:on',   ()=>{ inst.setVisible(true); inst.setStamps(true); });
  window.addEventListener('cb:path:stamps:off',  ()=> inst.setStamps(false));

  // 4) Extra: sobald game start/registry ready: grid sicherstellen
  const kick = ()=>{ try{ inst.ensureGrid(); }catch(_){} };
  window.addEventListener('cb:game:start', kick);
  window.addEventListener('cb:registry:ready', kick);
  window.addEventListener('cb:game:initialized', kick);

  // -------------------------------------------------------------------------
  // GLOBAL EXPORT (für Debug/Inspector)
  // -------------------------------------------------------------------------

  window.PathOverlay = {
    version: CFG.VERSION,
    // API
    setVisible: (v)=> inst.setVisible(v),
    setHeatmap: (v)=> inst.setHeatmap(v),
    setStamps : (v)=> inst.setStamps(v),
    // debug
    _inst: inst,
  };

  LOG('loaded', CFG.VERSION, 'defaultVisible=', CFG.DEFAULT_VISIBLE);
})();
