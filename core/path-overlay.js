// v26.01.09-paths-stageB-worldlayer + v26.01.09-paths-presets+inspector
// -----------------------------------------------------------------------------
// PATH OVERLAY (Trampelpfade)
// Ziel (für Alex / Siedler-Mini):
// - Stempeln entlang der tatsächlichen Unit-Bewegung (prevX/prevY -> x/y)
// - Sub-Tile Sampling ~16px (bei tileSize=64 => 0.25 Tiles)
// - Zeichnen als WORLD-Layer direkt auf dem Haupt-Canvas (GameMap.render)
//   → dadurch scrollt es korrekt mit der Kamera und liegt UNTER Gebäuden/Bäumen,
//     aber ÜBER dem Terrain.
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

    // ---------------------------------------------------------------------
    // PRESETS (Trampelpfad-Stil)
    // ---------------------------------------------------------------------
    // Hinweis zur Interpretation:
    // - stampScale ist der Scale-Faktor, der an Assets.drawAtlasFrame übergeben wird.
    // - "Pfadbreite" im Spielgefühl erreichst du primär über stampScale.
    // - Wir trennen: Preset-Base-Werte + ein Width-Multiplier (Slider im Inspector).
    presets: {
      // Schmaler, dezenter (Siedler 1/2 Style)
      CLASSIC: {
        alpha: 0.52,
        stampScaleBase: 0.42,
        samplePx: 18,
        decayPerSecondBase: 0.010,
      },
      // Etwas breiter, sichtbarer (Siedler 3 Style)  ✅ vom Nutzer gewünscht
      MODERN: {
        alpha: 0.58,
        stampScaleBase: 0.52,
        samplePx: 16,
        decayPerSecondBase: 0.010,
      }
    },

    // Default
    preset: 'MODERN',

    // Slider (Inspector): multipliziert stampScaleBase
    // 1.0 = Preset-Base, 0.7 = schmaler, 1.3 = breiter
    widthMult: 1.00,

    // Decay-Speed-Multiplier (Inspector)
    // 1.0 = Preset-Base
    decaySpeedMult: 1.00,

    // Initialwerte (werden im Konstruktor aus Preset berechnet)
    alpha: 0.55,                       // Sichtbarkeit (0..1)
    stampScale: 0.60,                  // effektive Scale (PresetBase * widthMult)
    decayPerSecond: 0.010,             // effektiv (PresetBase * decaySpeedMult)
    maxStamps: 6000,                   // Ringbuffer

    // Sampling: 16px entlang Move-Segmenten (wird durch Preset gesetzt)
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
      // -------------------------------------------------------------------
      // Runtime-Zustand
      // -------------------------------------------------------------------
      this.enabled = CFG.enabled;
      this.debug = false;

      // Preset/Slider-Parameter (Inspector)
      this.preset = CFG.preset;
      this.widthMult = CFG.widthMult;
      this.decaySpeedMult = CFG.decaySpeedMult;
      this.decayPaused = false;

      // Effektive Werte (werden aus Preset + Multis berechnet)
      this.alpha = CFG.alpha;
      this.stampScale = CFG.stampScale;
      this.decayPerSecond = CFG.decayPerSecond;

      // Preset initial anwenden (setzt auch CFG.samplePx etc.)
      this._applyPreset(this.preset);
      this.debug = false;

      // Stamps: {xPx, yPx, bornSec, frame}
      this._stamps = [];
      this._lastT = nowSec();

      // Für "letzte Position pro Unit"
      this._unitLast = new Map(); // unit.id -> {xPx,yPx}

      // Events
      this._bindEvents();
    }

    // ---------------------------------------------------------------------
    // PRESET / TUNING
    // ---------------------------------------------------------------------
    _applyPreset(name){
      const key = String(name || '').toUpperCase();
      const p = CFG.presets[key] || CFG.presets.MODERN;

      // Preset-Basiswerte merken
      this.preset = (CFG.presets[key] ? key : 'MODERN');
      this._presetAlphaBase = p.alpha;
      this._presetScaleBase = p.stampScaleBase;
      this._presetDecayBase = p.decayPerSecondBase;

      // Sampling ist Teil des Presets
      CFG.samplePx = p.samplePx;

      // Effektive Werte neu berechnen
      this._recomputeEffective();
    }

    _recomputeEffective(){
      const w = clamp(Number(this.widthMult) || 1, 0.25, 2.0);
      const d = clamp(Number(this.decaySpeedMult) || 1, 0.0, 5.0);

      // Effektive Werte
      this.alpha = clamp(this._presetAlphaBase ?? CFG.alpha, 0, 1);
      this.stampScale = clamp((this._presetScaleBase ?? CFG.stampScale) * w, 0.10, 2.50);
      this.decayPerSecond = clamp((this._presetDecayBase ?? CFG.decayPerSecond) * d, 0.0, 1.0);
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

      // NOTE:
      //   Wir zeichnen NICHT mehr in ein eigenes Canvas, sondern in GameMap.render
      //   direkt auf das Haupt-Canvas (World-Space). Daher brauchen wir hier
      //   keinerlei Resize-/Canvas-Sync-Logik mehr.
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
    /**
     * Zeichnet die Pfade in WORLD-Koordinaten.
     *
     * Erwartung:
     *   - Der aufrufende Renderer (GameMap.render) hat bereits die Kamera-
     *     Transform gesetzt: ctx.setTransform(zoom,0,0,zoom,-camX*zoom,-camY*zoom)
     *   - (xPx,yPx) sind WORLD-Pixel (tile*tileSize)
     */
    drawOnMainCanvas(ctx){
      if (!this.enabled) return;
      if (!ctx) return;

      const t = nowSec();
      const dt = Math.min(0.25, Math.max(0, t - this._lastT));
      this._lastT = t;

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
            ctx.fillRect(s.xPx-2, s.yPx-2, 4, 4);
          }
        }
        return;
      }

      const alpha = this.alpha;
      const scale = this.stampScale;
      const decay = this.decayPaused ? 0 : this.decayPerSecond;

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

        // Center-Pivot im Atlas -> wir zeichnen direkt an (xPx,yPx) in WORLD.
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
    // -------------------------------------------------------------------
    // [A] Grundfunktionen (Console + Inspector)
    // -------------------------------------------------------------------
    setEnabled(v){ inst.enabled = !!v; try{ window.dispatchEvent(new CustomEvent('cb:path:state', { detail: window.PathOverlay.getState() })); }catch(_){/*noop*/} },
    setDebug(v){ inst.debug = !!v; try{ window.dispatchEvent(new CustomEvent('cb:path:state', { detail: window.PathOverlay.getState() })); }catch(_){/*noop*/} },
    clear(){ inst._stamps = []; },

    // Hook für Renderer
    drawOnMainCanvas(ctx){ inst.drawOnMainCanvas(ctx); },

    // -------------------------------------------------------------------
    // [B] Presets + Slider (neues Pfad-System)
    // -------------------------------------------------------------------
    /** Preset setzen: 'CLASSIC' | 'MODERN' */
    setPreset(name){ inst._applyPreset(name); try{ window.dispatchEvent(new CustomEvent('cb:path:state', { detail: window.PathOverlay.getState() })); }catch(_){/*noop*/} },

    /** Pfadbreite (Inspector-Slider): multiplier auf Preset-Base */
    setWidthMult(mult){ inst.widthMult = Number(mult) || 1; inst._recomputeEffective(); try{ window.dispatchEvent(new CustomEvent('cb:path:state', { detail: window.PathOverlay.getState() })); }catch(_){/*noop*/} },

    /** Absoluter Scale (für harte Debug-Tests) */
    setStampScale(scale){ inst.stampScale = Number(scale) || inst.stampScale; },

    // Decay
    setDecayPaused(v){ inst.decayPaused = !!v; try{ window.dispatchEvent(new CustomEvent('cb:path:state', { detail: window.PathOverlay.getState() })); }catch(_){/*noop*/} },
    /** 1.0 = Preset-Base, 0 = kein Decay */
    setDecaySpeed(mult){ inst.decaySpeedMult = Number(mult) || 0; inst._recomputeEffective(); try{ window.dispatchEvent(new CustomEvent('cb:path:state', { detail: window.PathOverlay.getState() })); }catch(_){/*noop*/} },
    /** direkt perSec (für harte Debug-Tests) */
    setDecayPerSec(perSec){ inst.decayPerSecond = Math.max(0, Number(perSec) || 0); },

    // Zustand abrufen (Inspector kann damit syncen)
    getState(){
      return {
        enabled: !!inst.enabled,
        debug: !!inst.debug,
        preset: inst.preset,
        widthMult: inst.widthMult,
        stampScale: inst.stampScale,
        alpha: inst.alpha,
        samplePx: CFG.samplePx,
        decayPaused: !!inst.decayPaused,
        decaySpeedMult: inst.decaySpeedMult,
        decayPerSecond: inst.decayPerSecond,
        stamps: inst._stamps.length,
      };
    },

    // -------------------------------------------------------------------
    // [C] Backward-Compat für alte Inspector-Bridge (damit nichts kaputt geht)
    // -------------------------------------------------------------------
    toggle(v){ inst.enabled = (v==null ? !inst.enabled : !!v); },
    setVisible(v){ inst.enabled = !!v; },
    setStamps(v){ inst.enabled = !!v; },
    setHeatmap(_v){ /* im neuen System nicht verwendet */ },

    // Tune (legacy)
    tune(obj){
      if (!obj) return;
      if (obj.alpha != null) inst.alpha = obj.alpha;
      if (obj.stampScale != null) inst.stampScale = obj.stampScale;
      if (obj.decayPerSecond != null) inst.decayPerSecond = obj.decayPerSecond;
    },

    _inst: inst,
  };

  // WICHTIG:
  //   Kein eigener requestAnimationFrame-Loop mehr!
  //   Das Rendering passiert im Haupt-Renderer (GameMap.render),
  //   damit die Pfade korrekt in WORLD-Space mit Kamera transformiert
  //   werden und vor Ressourcen/Deko/Gebäuden gerendert werden können.

})();
