// v26.01.09-paths-stageB-visible
// -----------------------------------------------------------------------------
// PATH OVERLAY (Trampelpfade)
// Ziel (für Alex / Siedler-Mini):
// - Stempeln entlang der tatsächlichen Unit-Bewegung (prevX/prevY -> x/y)
// - Sub-Tile Sampling ~16px (bei tileSize=64 => 0.25 Tiles)
// - Zeichnen als eigenes Canvas (#paths-overlay), IMMER sichtbar (kein CSS-Depend)
// - Unter Units: z-index 2 (Map = 1, Units = 3) - wir setzen Style direkt am Canvas
// - Pivot der Frames ist im Atlas auf Mitte gesetzt (128px => 64/64), wir zeichnen centered.
//
// WICHTIG:
// - Wir hören auf cb:unit:step (wird in core/game.units.js emit't).
// - Kein altes "tile heatmap"-System mehr (auf Wunsch entfernt).
// - Debug-Schalter vorhanden: window.PathOverlay.debug = true
// -----------------------------------------------------------------------------

/* global Assets */

(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // KONFIG
  // ---------------------------------------------------------------------------
  const CFG = {
    // Atlas/Frames
    atlasKey: 'path_sprite_atlas',     // muss zu deinem Asset-Registry Key passen
    framePrefix: 'path_',              // Frames heißen path_00 ... path_63

    // Sichtbarkeit / Style
    enabled: true,
    alpha: 0.55,                       // Sichtbarkeit (0..1)
    stampScale: 0.60,                  // kleiner als vorher
    decayPerSecond: 0.010,             // langsam verschwinden (je kleiner, desto langsamer)
    maxStamps: 6000,                   // Ringbuffer

    // Sampling: 16px entlang Move-Segmenten
    samplePx: 16,                      // gewünschter Pixel-Abstand
    minDistPx: 8,                      // Untergrenze (falls sehr langsam)

    // Layer
    zIndex: 2,                         // unter Units, über Map
  };

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function getTileSize(){
    // In deinem Projekt ist tileSize i.d.R. 64.
    // Wir versuchen mehrere Quellen, falls du es später dynamisch machst.
    return (window.Game && window.Game.tileSize) ||
           (window.GameMap && window.GameMap.tileSize) ||
           64;
  }

  function nowSec(){ return (performance.now() || Date.now()) / 1000; }

  function makeFrameName(idx){
    const n = (idx|0);
    return CFG.framePrefix + String(n).padStart(2,'0');
  }

  function hash2(x, y){
    // deterministisch "zufällige" Frame-Auswahl
    const v = ((x*73856093) ^ (y*19349663)) >>> 0;
    return v;
  }

  // ---------------------------------------------------------------------------
  // KLASSE
  // ---------------------------------------------------------------------------
  class PathOverlay {
    constructor(){
      this.enabled = CFG.enabled;
      this.alpha = CFG.alpha;
      this.stampScale = CFG.stampScale;
      this.decayPerSecond = CFG.decayPerSecond;
      this.debug = false;

      // Stamps: {xPx, yPx, bornSec, frame}
      this._stamps = [];
      this._lastT = nowSec();

      // Canvas
      this._canvas = null;
      this._ctx = null;

      // Für "letzte Position pro Unit"
      this._unitLast = new Map(); // unit.id -> {xPx,yPx}

      this._ensureCanvas();

      // Events
      this._bindEvents();
    }

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------
    _bindEvents(){
      // Unit-Bewegung (kommt aus core/game.units.js)
      // WICHTIG: In deinem Projekt existieren zwei Event-Formate:
      //   A) cb:unit:move  detail: { id, kind, type, from:{x,y}, to:{x,y} }
      //   B) cb:unit:step  detail: { id, kind, type, tx,ty, prevTx,prevTy, x,y }
      // Der alte Listener erwartete fälschlich d.unit + d.prevX/d.prevY → dadurch wurden NIE Stamps erzeugt.
      window.addEventListener('cb:unit:move', (ev) => {
        if (!this.enabled) return;
        const d = ev && ev.detail;
        if (!d || !d.from || !d.to) return;
        // from/to sind TILE-Koordinaten (float)
        this.onUnitMove({ id: d.id }, d.from.x, d.from.y, d.to.x, d.to.y);
      });

      window.addEventListener('cb:unit:step', (ev) => {
        if (!this.enabled) return;
        const d = ev && ev.detail;
        if (!d) return;
        // step liefert x/y (float) + prevTx/prevTy (int). Wir rekonstruieren prevX/prevY als Tile-Float.
        const prevX = (Number.isFinite(d.prevTx) ? (d.prevTx + 0.5) : d.x);
        const prevY = (Number.isFinite(d.prevTy) ? (d.prevTy + 0.5) : d.y);
        if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) return;
        this.onUnitMove({ id: d.id }, prevX, prevY, d.x, d.y);
      });

      // Optional: harte Toggle-Events (falls du später per Inspector steuern willst)
      window.addEventListener('req:paths:toggle', () => {
        this.enabled = !this.enabled;
      });

      // Resize
      window.addEventListener('resize', () => this._ensureCanvas(true));
    }

    // -------------------------------------------------------------------------
    // CANVAS
    // -------------------------------------------------------------------------
    _ensureCanvas(force=false){
      const host = document.getElementById('game') || document.querySelector('canvas');
      if (!host) return;

      if (!this._canvas){
        const c = document.createElement('canvas');
        c.id = 'paths-overlay';
        c.style.position = 'absolute';
        c.style.left = '0';
        c.style.top = '0';
        c.style.pointerEvents = 'none';
        c.style.zIndex = String(CFG.zIndex);

        // IMPORTANT: wir hängen es an den selben Parent wie #game,
        // damit absolute Position korrekt ist.
        const parent = host.parentElement || document.body;
        parent.style.position = parent.style.position || 'relative';
        parent.appendChild(c);

        this._canvas = c;
        this._ctx = c.getContext('2d');
      }

      // Größe/Position synchronisieren
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Canvas im CSS exakt über #game legen
      this._canvas.style.width = rect.width + 'px';
      this._canvas.style.height = rect.height + 'px';
      this._canvas.style.left = (host.offsetLeft || 0) + 'px';
      this._canvas.style.top  = (host.offsetTop || 0) + 'px';

      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));

      if (force || this._canvas.width !== w || this._canvas.height !== h){
        this._canvas.width = w;
        this._canvas.height = h;

        // Zeichenskalierung auf DPR
        this._ctx.setTransform(dpr,0,0,dpr,0,0);
      }
    }

    // -------------------------------------------------------------------------
    // STAMPING
    // -------------------------------------------------------------------------
    onUnitMove(unit, prevX, prevY, x, y){
      const ts = getTileSize();

      // Unit-Coords sind in Tiles (float). Wir arbeiten in Pixel.
      const x0 = (prevX ?? x) * ts;
      const y0 = (prevY ?? y) * ts;
      const x1 = x * ts;
      const y1 = y * ts;

      // Segmentlänge
      const dx = x1 - x0;
      const dy = y1 - y0;
      const dist = Math.hypot(dx, dy);

      if (!isFinite(dist) || dist <= 0.001) return;

      // 16px Sampling
      const step = clamp(CFG.samplePx, CFG.minDistPx, 64);
      const steps = Math.max(1, Math.floor(dist / step));

      // Wir stempeln inkl. Endpunkt, damit es "lückenloser" wirkt
      for (let i=1; i<=steps; i++){
        const t = i / steps;
        const sx = x0 + dx * t;
        const sy = y0 + dy * t;
        this._addStamp(sx, sy);
      }

      // Merke letzte
      if (unit && unit.id != null){
        this._unitLast.set(unit.id, {xPx:x1, yPx:y1});
      }
    }

    _addStamp(xPx, yPx){
      // Frame wählen (leicht variieren, aber deterministisch)
      const ts = getTileSize();
      const gx = Math.floor(xPx / ts);
      const gy = Math.floor(yPx / ts);
      const h = hash2(gx, gy);
      const idx = h % 64; // 0..63
      const frame = makeFrameName(idx);

      this._stamps.push({
        xPx, yPx,
        bornSec: nowSec(),
        frame,
      });

      // Ringbuffer
      const over = this._stamps.length - CFG.maxStamps;
      if (over > 0) this._stamps.splice(0, over);
    }

    // -------------------------------------------------------------------------
    // DRAW
    // -------------------------------------------------------------------------
    draw(){
      if (!this.enabled) return;

      this._ensureCanvas();

      const ctx = this._ctx;
      if (!ctx) return;

      const t = nowSec();
      const dt = Math.min(0.25, Math.max(0, t - this._lastT));
      this._lastT = t;

      // Clear
      ctx.clearRect(0,0, this._canvas.width, this._canvas.height);

      // Nichts zu zeichnen
      if (!this._stamps.length) return;

      // Atlas-API muss vorhanden sein
      // WICHTIG (Safari/iOS + JS-Details):
      //   Assets.drawAtlasFrame ist eine Methode, die intern "this" nutzt.
      //   Wenn man sie in eine Variable kopiert (const f = Assets.drawAtlasFrame)
      //   und danach f(...) aufruft, ist "this" UNDEFINED -> TypeError.
      //   Deshalb rufen wir später IMMER über window.Assets.drawAtlasFrame(...) auf.
      const A = window.Assets;
      const hasAtlasApi = A && typeof A.getAtlas === 'function' && typeof A.drawAtlasFrame === 'function';
      if (!hasAtlasApi){
        // Fallback: Debug-Punkte (zeigt ob Stamps überhaupt entstehen)
        if (this.debug){
          ctx.fillStyle = 'rgba(255,0,0,0.8)';
          for (const s of this._stamps){
            ctx.fillRect(s.xPx-1, s.yPx-1, 3, 3);
          }
        }
        return;
      }

      const alpha = this.alpha;
      const scale = this.stampScale;
      const decay = this.decayPerSecond;

      // Zeichnen + Decay
      // Wir filtern in-place (einfach, performant genug für jetzt).
      const out = [];
      for (let i=0;i<this._stamps.length;i++){
        const s = this._stamps[i];
        const age = t - s.bornSec;

        // lineare Abnahme
        const a = clamp(1 - age * decay, 0, 1);
        if (a <= 0.01) continue;

        ctx.globalAlpha = alpha * a;

        // -------------------------------------------------------------------
        // GUARD #1: Atlas muss wirklich geladen sein (sonst keine drawImage-Calls)
        // -------------------------------------------------------------------
        const atlas = A.getAtlas(CFG.atlasKey);
        if (!atlas || !atlas.ok || !atlas.img){
          if (this.debug){
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,0,0,0.9)';
            // etwas groesser, damit du es sofort siehst
            ctx.fillRect(s.xPx-2, s.yPx-2, 4, 4);
          }
          out.push(s);
          continue;
        }

        // -------------------------------------------------------------------
        // GUARD #2: Frame muss existieren (sonst koennen wir nicht stempeln)
        // -------------------------------------------------------------------
        const fr = atlas.frames && atlas.frames[s.frame];
        if (!fr){
          if (this.debug){
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,0,0,0.9)';
            ctx.fillRect(s.xPx-2, s.yPx-2, 4, 4);
          }
          out.push(s);
          continue;
        }

        // Center-Pivot im Atlas -> wir zeichnen direkt an (xPx,yPx)
        // opts: {scale} wird in Assets.drawAtlasFrame beruecksichtigt.
        // WICHTIG: Aufruf ueber A.drawAtlasFrame(...), damit "this" stimmt.
        try{
          A.drawAtlasFrame(ctx, CFG.atlasKey, s.frame, s.xPx, s.yPx, {
            scale,
            // Wichtig: Center-Pivot (Atlas) -> kein zusaetzlicher Offset noetig
          });
        }catch(e){
          // not fatal
          if (this.debug) console.warn('[paths] draw fail', e);
        }

        if (this.debug){
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,0,0,0.6)';
          ctx.fillRect(s.xPx-1, s.yPx-1, 2, 2);
        }

        out.push(s);
      }

      ctx.globalAlpha = 1;
      this._stamps = out;
    }
  }

  // ---------------------------------------------------------------------------
  // SINGLETON + LOOP
  // ---------------------------------------------------------------------------
  const inst = window.PathOverlayInstance || new PathOverlay();
  window.PathOverlayInstance = inst;

  // Mini-API für Konsole/Inspector
  window.PathOverlay = {
    setEnabled(v){ inst.enabled = !!v; },
    setDebug(v){ inst.debug = !!v; },
    clear(){ inst._stamps = []; },
    tune(obj){
      if (!obj) return;
      if (obj.alpha != null) inst.alpha = obj.alpha;
      if (obj.stampScale != null) inst.stampScale = obj.stampScale;
      if (obj.decayPerSecond != null) inst.decayPerSecond = obj.decayPerSecond;
    },
    _inst: inst,
  };

  // Draw-Loop (unabhängig von OverlayHooks, damit Safari/Underlay-Probleme egal sind)
  function loop(){
    try{ inst.draw(); }catch(e){ /* ignore */ }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

})();
