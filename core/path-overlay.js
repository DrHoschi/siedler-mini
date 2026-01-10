// v26.01.09-paths-stageB-worldlayer + v26.01.09-paths-presets+inspector
// v26.01.09-paths-usage-terrain-epoch (Usage-Boost + Terrain-Modifier + Epoche-Lock)
// -----------------------------------------------------------------------------
// PATH OVERLAY (Trampelpfade) – WORLD-Layer
// -----------------------------------------------------------------------------
// Ziel (für Alex / Siedler-Mini):
// - Stempeln entlang der tatsächlichen Unit-Bewegung (prevX/prevY -> x/y)
// - Sub-Tile Sampling (Default ~16px) entlang Move-Segmenten
// - Zeichnen als WORLD-Layer direkt auf dem Haupt-Canvas (GameMap.render)
//   → scrollt korrekt mit Kamera, liegt UNTER Objekten (Bäume/Gebäude/Units),
//     aber ÜBER dem Terrain.
// - Stempel sind RUND (richtungsneutral). Reihen im Atlas bedeuten daher:
//     ROW = Usage/Abnutzung (Stage), COL = Variation/Größe/Fransen.
//   Wir sind damit 100% dynamisch in allen Richtungen (Siedler-3 Feeling).
//
// NEU in dieser Version:
// - Usage-Boost: häufig begangene Tiles werden "stärker" (höhere Stage/Row)
// - Terrain-Modifier: Gras weicher, Erde härter, Schnee kaum sichtbar (Alpha/Decay/Deposit)
// - Epoche-Lock: Epoche 1 limitiert max. Stage (schmale/leichte Pfade), Epoche 3 erlaubt mehr
//
// Debug:
// - window.PathOverlay.setDebug(true) zeigt kleine rote Punkte an den Stamp-Positionen.
//
// WICHTIG:
// - Wir hören auf cb:unit:move & cb:unit:step (aus core/game.units.js).
// - Wir zeichnen NICHT in ein eigenes Canvas. Das Rendering passiert in GameMap.render.
// -----------------------------------------------------------------------------

/* global Assets */

(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // LOG
  // ---------------------------------------------------------------------------
  const TAG  = '[paths]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console, TAG);

  // ---------------------------------------------------------------------------
  // KONFIG
  // ---------------------------------------------------------------------------
  const CFG = {
    // Atlas/Frames
    atlasKey: 'path_sprite_atlas',   // muss zu deinem Asset-Key passen
    framePrefix: 'path_',            // Frames heißen path_00 .. path_63 (8x8)

    // Sichtbarkeit / Style
    enabled: true,

    // ---------------------------------------------------------------------
    // PRESETS (Trampelpfad-Stil)
    // ---------------------------------------------------------------------
    presets: {
      // Schmal, dezenter (Siedler 1/2 Style)
      CLASSIC: {
        alpha: 0.52,
        stampScaleBase: 0.42,
        samplePx: 18,
        decayPerSecondBase: 0.010,
        softnessBase: 0.90,
      },
      // Etwas sichtbarer (Siedler 3 Style) ✅
      MODERN: {
        alpha: 0.58,
        stampScaleBase: 0.52,
        samplePx: 16,
        decayPerSecondBase: 0.010,
        softnessBase: 1.10,
      }
    },

    preset: 'MODERN',

    // Slider (Inspector): multipliziert stampScaleBase
    widthMult: 0.50,

    // Decay-Speed-Multiplier (Inspector)
    decaySpeedMult: 1.00,

    // Softness-Multiplier (Inspector): multipliziert softnessBase
    softnessMult: 1.00,

    // Stamp-Buffer
    maxStamps: 7000,

    // Sampling-Limits
    minDistPx: 16,

    // ---------------------------------------------------------------------
    // USAGE / WEAR
    // ---------------------------------------------------------------------
    // Wear wächst pro Stamp (deposit) und sinkt über Zeit (decay).
    // Das ist bewusst SEHR fein, weil wir pro Wegsegment mehrere Stamps setzen.
    wearDepositBase: 0.030,  // Grundaufbau pro Stamp (vor Terrain-Mod)
    wearMax: 1.0,

    // Stages/Rows (wir haben 8 Reihen im Atlas)
    atlasCols: 8,
    atlasRows: 8,

    // ---------------------------------------------------------------------
    // TERRAIN MODIFIER
    // ---------------------------------------------------------------------
    // Terrain beeinflusst: Alpha, Softness, Deposit, Decay.
    // Ziel: Gras = weich, Erde = härter, Schnee = kaum sichtbar.
    terrain: {
      DEFAULT: { alphaMult: 1.00, softnessMult: 1.00, depositMult: 1.00, decayMult: 1.00 },
      GRASS:   { alphaMult: 1.00, softnessMult: 1.15, depositMult: 1.00, decayMult: 1.00 },
      EARTH:   { alphaMult: 1.05, softnessMult: 0.90, depositMult: 1.10, decayMult: 0.85 },
      SAND:    { alphaMult: 0.85, softnessMult: 0.95, depositMult: 0.80, decayMult: 1.15 },
      ROCK:    { alphaMult: 0.35, softnessMult: 0.80, depositMult: 0.35, decayMult: 1.30 },
      WATER:   { alphaMult: 0.00, softnessMult: 1.00, depositMult: 0.00, decayMult: 2.00 },
      SNOW:    { alphaMult: 0.22, softnessMult: 1.35, depositMult: 0.55, decayMult: 1.40 },
    },

    // ---------------------------------------------------------------------
    // EPOCHE LOCK
    // ---------------------------------------------------------------------
    // Epoche begrenzt die maximal mögliche Stage/Row.
    epochLockEnabled: true,
    epochProfiles: {
      1: { maxStage: 1 }, // Epoche 1: nur sehr leichte Pfade (Rows 0..1)
      2: { maxStage: 2 },
      3: { maxStage: 4 }, // Epoche 3: etablierte Wege möglich
      4: { maxStage: 5 },
      5: { maxStage: 6 },
    },
  };

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function nowSec(){ return (performance.now ? performance.now() : Date.now()) / 1000; }

  function getTileSize(){
    return (window.Game && window.Game.tileSize) ||
           (window.GameMap && window.GameMap._state && window.GameMap._state.tileSize) ||
           64;
  }

  function makeFrameName(idx){
    const n = (idx|0);
    return CFG.framePrefix + String(n).padStart(2,'0');
  }

  function hash2(x, y){
    const v = ((x*73856093) ^ (y*19349663)) >>> 0;
    return v;
  }

  function parseEpochFromMapName(name){
    const s = String(name || '').toLowerCase();
    const m = s.match(/epoch\s*[-_]?(\d+)/) || s.match(/(\d+)/);
    const n = m ? parseInt(m[1], 10) : 1;
    return (Number.isFinite(n) && n > 0) ? n : 1;
  }

  function getMapState(){
    return window.GameMap?._state || null;
  }

  function getMapName(){
    const ms = getMapState();
    return ms?.name || 'epoch1';
  }

  // Legend → tileId → "name"
  function buildLegendTileNameLookup(){
    const ms = getMapState();
    const legend = ms?.legend;
    const out = new Map(); // tileId -> name
    if (!legend || typeof legend !== 'object') return out;

    // akzeptierte Formen:
    //  - { GRASS: 1, WATER: 8, ... }
    //  - { GRASS: [1,5], ... }
    //  - { "1":"GRASS", ... } (selten)
    for (const [k, v] of Object.entries(legend)){
      const key = String(k).toUpperCase();
      if (typeof v === 'number' && Number.isFinite(v)) out.set(v|0, key);
      else if (Array.isArray(v)){
        for (const n of v){
          if (typeof n === 'number' && Number.isFinite(n)) out.set(n|0, key);
        }
      } else if (typeof v === 'string'){
        const n = parseInt(k, 10);
        if (Number.isFinite(n)) out.set(n|0, String(v).toUpperCase());
      }
    }
    return out;
  }

  function terrainFromTileId(tileId, legendLookup){
    const id = tileId|0;
    const lname = legendLookup?.get(id);
    const name = lname || '';

    // 1) Über Legend-Namen, wenn vorhanden
    if (name.includes('WATER')) return 'WATER';
    if (name.includes('SNOW'))  return 'SNOW';
    if (name.includes('SAND'))  return 'SAND';
    if (name.includes('ROCK'))  return 'ROCK';
    if (name.includes('EARTH') || name.includes('DIRT')) return 'EARTH';
    if (name.includes('GRASS') || name.includes('FOREST')) return 'GRASS';

    // 2) Fallback auf bekannte Epoch1 IDs
    // (entspricht map.decorations.js Tile-Legend)
    if (id === 8) return 'WATER';
    if (id === 6) return 'ROCK';
    if (id === 9) return 'EARTH';
    if (id === 1 || id === 5) return 'GRASS';

    // 3) Default
    return 'DEFAULT';
  }

  // ---------------------------------------------------------------------------
  // KLASSE
  // ---------------------------------------------------------------------------
  class PathOverlay {
    constructor(){
      // Runtime-Flags
      this.enabled = CFG.enabled;
      this.debug = false;

      // Preset/Slider
      this.preset = CFG.preset;
      this.widthMult = CFG.widthMult;
      this.decaySpeedMult = CFG.decaySpeedMult;
      this.softnessMult = CFG.softnessMult;

      // Decay
      this.decayPaused = false;

      // Epoche
      this.epochLockEnabled = !!CFG.epochLockEnabled;
      this.epoch = parseEpochFromMapName(getMapName());
      this.epochMaxStage = this._computeEpochMaxStage();

      // Map / Legend
      this._legendLookup = buildLegendTileNameLookup();
      this._mapCols = 0;
      this._mapRows = 0;

      // Wear: Sparse Map (nur Tiles, die überhaupt betreten wurden)
      this._wear = new Map(); // key = idx (ty*cols+tx) -> wear 0..1

      // Stamps: Ringbuffer für visuelles Decay (wird zusätzlich zu Wear genutzt)
      // stamp = { xPx, yPx, bornSec, frame, terrain }
      this._stamps = [];

      // Effektive Werte (aus Preset + Multis)
      this._applyPreset(this.preset);

      // Timing
      this._lastT = nowSec();

      // Events
      this._bindEvents();
    }

    // ---------------------------------------------------------------------
    // PRESET / TUNING
    // ---------------------------------------------------------------------
    _computeEpochMaxStage(){
      const ep = this.epoch|0;
      const p = CFG.epochProfiles[ep] || CFG.epochProfiles[1] || { maxStage: 1 };
      return clamp(p.maxStage|0, 0, CFG.atlasRows - 1);
    }

    _applyPreset(name){
      const key = String(name || '').toUpperCase();
      const p = CFG.presets[key] || CFG.presets.MODERN;

      this.preset = (CFG.presets[key] ? key : 'MODERN');

      // Base-Werte merken
      this._presetAlphaBase = p.alpha;
      this._presetScaleBase = p.stampScaleBase;
      this._presetDecayBase = p.decayPerSecondBase;
      this._presetSoftBase  = (p.softnessBase != null) ? p.softnessBase : 1.0;

      // Sampling gehört zum Preset
      this.samplePx = clamp(p.samplePx, CFG.minDistPx, 64);

      this._recomputeEffective();
      this._emitState();
    }

    _recomputeEffective(){
      const w = clamp(Number(this.widthMult) || 1, 0.05, 3.0);
      const d = clamp(Number(this.decaySpeedMult) || 1, 0.0, 5.0);
      const s = clamp(Number(this.softnessMult) || 1, 0.25, 3.0);

      this.alpha        = clamp(this._presetAlphaBase ?? 0.55, 0, 1);
      this.stampScale   = clamp((this._presetScaleBase ?? 0.6) * w, 0.05, 2.50);
      this.decayPerSecond = clamp((this._presetDecayBase ?? 0.01) * d, 0.0, 1.0);

      // Softness wird im Draw als "Halo-Intensität" benutzt
      this.softness = clamp((this._presetSoftBase ?? 1.0) * s, 0.25, 3.0);
    }

    // ---------------------------------------------------------------------
    // MAP / RESET
    // ---------------------------------------------------------------------
    _onMapReady(detail){
      const ms = getMapState();
      this.epoch = parseEpochFromMapName(detail?.mapId || ms?.name || 'epoch1');
      this.epochMaxStage = this._computeEpochMaxStage();

      // Legend refresh
      this._legendLookup = buildLegendTileNameLookup();

      // Map size
      this._mapCols = ms?.cols || 0;
      this._mapRows = ms?.rows || 0;

      // Optional: Wear reset bei Mapwechsel
      this._wear.clear();
      // Stamps behalten wir NICHT – sonst "geisterpfade" beim Mapwechsel
      this._stamps = [];

      this._emitState();
      LOG('map ready → epoch=', this.epoch, 'epochMaxStage=', this.epochMaxStage, 'cols=', this._mapCols, 'rows=', this._mapRows);
    }

    // ---------------------------------------------------------------------
    // EVENTS
    // ---------------------------------------------------------------------
    _bindEvents(){
      // Map ready (für Epoche + Wear-Reset)
      window.addEventListener('cb:map:ready', (ev)=> this._onMapReady(ev?.detail));

      // Unit-Bewegung
      window.addEventListener('cb:unit:move', (ev) => {
        if (!this.enabled) return;
        const d = ev?.detail;
        if (!d || !d.from || !d.to) return;
        this.onUnitMove({ id: d.id }, d.from.x, d.from.y, d.to.x, d.to.y);
      });

      window.addEventListener('cb:unit:step', (ev) => {
        if (!this.enabled) return;
        const d = ev?.detail;
        if (!d) return;
        const prevX = (Number.isFinite(d.prevTx) ? (d.prevTx + 0.5) : d.x);
        const prevY = (Number.isFinite(d.prevTy) ? (d.prevTy + 0.5) : d.y);
        if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) return;
        this.onUnitMove({ id: d.id }, prevX, prevY, d.x, d.y);
      });
    }

    // ---------------------------------------------------------------------
    // TERRAIN LOOKUP
    // ---------------------------------------------------------------------
    _getTileId(tx, ty){
      const ms = getMapState();
      const g = ms?.grid;
      if (!g || ty < 0 || tx < 0 || ty >= g.length) return 0;
      const row = g[ty];
      if (!row || tx >= row.length) return 0;
      return row[tx] | 0;
    }

    _getTerrain(tx, ty){
      const id = this._getTileId(tx, ty);
      return terrainFromTileId(id, this._legendLookup);
    }

    // ---------------------------------------------------------------------
    // WEAR / STAGE
    // ---------------------------------------------------------------------
    _key(tx, ty){
      // key für Wear Map
      const ms = getMapState();
      const cols = ms?.cols || this._mapCols || 0;
      return (ty * cols + tx) >>> 0;
    }

    _getWear(tx, ty){
      const k = this._key(tx, ty);
      return this._wear.get(k) || 0;
    }

    _setWear(tx, ty, v){
      const k = this._key(tx, ty);
      const wear = clamp(v, 0, CFG.wearMax);
      if (wear <= 0.0001) this._wear.delete(k);
      else this._wear.set(k, wear);
      return wear;
    }

    _wearToStage(wear){
      // Wear 0..1 -> Stage 0..epochMaxStage (und später noch atlas-available-limit)
      const maxStage = this._getEffectiveMaxStage();
      const w = clamp(wear, 0, 1);
      const stage = Math.floor(w * (maxStage + 0.999)); // schneller früher sichtbar
      return clamp(stage, 0, maxStage);
    }

    _getEffectiveMaxStage(){
      // Epoche-Limit
      let maxStage = this.epochLockEnabled ? this.epochMaxStage : (CFG.atlasRows - 1);

      // Atlas-Existenz-Limit (falls du noch nicht alle Reihen befüllt hast)
      // Wir prüfen: existiert Frame der jeweiligen Row? (col=0)
      const A = window.Assets;
      const atlas = A?.getAtlas?.(CFG.atlasKey);
      if (atlas && atlas.frames){
        let avail = 0;
        for (let r = 0; r < CFG.atlasRows; r++){
          const idx = r * CFG.atlasCols; // col=0
          const fn = makeFrameName(idx);
          if (atlas.frames[fn]) avail = r;
          else break;
        }
        maxStage = Math.min(maxStage, avail);
      }

      return clamp(maxStage|0, 0, CFG.atlasRows - 1);
    }

    // ---------------------------------------------------------------------
    // STAMPING
    // ---------------------------------------------------------------------
    onUnitMove(unit, prevX, prevY, x, y){
      const ts = getTileSize();

      const x0 = (prevX ?? x) * ts;
      const y0 = (prevY ?? y) * ts;
      const x1 = x * ts;
      const y1 = y * ts;

      const dx = x1 - x0;
      const dy = y1 - y0;
      const dist = Math.hypot(dx, dy);

      if (!isFinite(dist) || dist <= 0.001) return;

      const step = clamp(this.samplePx || 16, CFG.minDistPx, 64);
      const steps = Math.max(1, Math.floor(dist / step));

      for (let i = 1; i <= steps; i++){
        const t = i / steps;
        const sx = x0 + dx * t;
        const sy = y0 + dy * t;
        this._addStampAndWear(sx, sy);
      }
    }

    _addStampAndWear(xPx, yPx){
      const ts = getTileSize();
      const tx = Math.floor(xPx / ts);
      const ty = Math.floor(yPx / ts);

      // Terrain bestimmen (beeinflusst Deposit/Alpha/Softness/Decay)
      const terrain = this._getTerrain(tx, ty);
      const tmod = CFG.terrain[terrain] || CFG.terrain.DEFAULT;

      // WATER = keine Pfade
      if (tmod.depositMult <= 0.0001 || tmod.alphaMult <= 0.0001) return;

      // Wear erhöhen (Usage-Boost)
      const wear0 = this._getWear(tx, ty);
      const deposit = CFG.wearDepositBase * tmod.depositMult;
      const wear1 = this._setWear(tx, ty, wear0 + deposit);

      // Stage/Row aus Wear
      const stage = this._wearToStage(wear1);

      // Col/Variation deterministisch (pro Tile), aber Stage-abhängig leicht anders
      const h = hash2(tx + stage*97, ty + stage*57);
      const col = (h % CFG.atlasCols) | 0;
      const idx = stage * CFG.atlasCols + col;
      const frame = makeFrameName(idx);

      // Stamp ablegen (für visuelle Decay/Trail)
      this._stamps.push({
        xPx, yPx,
        bornSec: nowSec(),
        frame,
        terrain,
        stage,
      });

      // Ringbuffer
      const over = this._stamps.length - CFG.maxStamps;
      if (over > 0) this._stamps.splice(0, over);
    }

    // ---------------------------------------------------------------------
    // DRAW (WORLD)
    // ---------------------------------------------------------------------
    drawOnMainCanvas(ctx){
      if (!this.enabled || !ctx) return;

      const t = nowSec();
      const dt = Math.min(0.25, Math.max(0, t - this._lastT));
      this._lastT = t;

      // Wear Decay (sparse)
      this._decayWear(dt);

      if (!this._stamps.length) return;

      const A = window.Assets;
      const hasAtlasApi = A && typeof A.getAtlas === 'function' && typeof A.drawAtlasFrame === 'function';
      if (!hasAtlasApi){
        if (this.debug){
          ctx.fillStyle = 'rgba(255,0,0,0.8)';
          for (const s of this._stamps) ctx.fillRect(s.xPx-2, s.yPx-2, 4, 4);
        }
        return;
      }

      const atlas = A.getAtlas(CFG.atlasKey);
      if (!atlas || !atlas.ok || !atlas.img){
        if (this.debug){
          ctx.fillStyle = 'rgba(255,0,0,0.9)';
          for (const s of this._stamps) ctx.fillRect(s.xPx-2, s.yPx-2, 4, 4);
        }
        return;
      }

      const baseAlpha = this.alpha;
      const baseScale = this.stampScale;
      const decay = this.decayPaused ? 0 : this.decayPerSecond;

      const out = [];
      for (let i=0;i<this._stamps.length;i++){
        const s = this._stamps[i];
        const age = t - s.bornSec;

        // stamp-decay (rein visuell)
        const a = clamp(1 - age * decay, 0, 1);
        if (a <= 0.01) continue;

        const terrain = s.terrain || 'DEFAULT';
        const mod = CFG.terrain[terrain] || CFG.terrain.DEFAULT;

        const alpha = baseAlpha * mod.alphaMult * a;
        if (alpha <= 0.002) continue;

        const scale = baseScale;
        const soft  = clamp((this.softness || 1.0) * mod.softnessMult, 0.25, 3.0);
        const halo  = clamp((soft - 0.8) / 1.2, 0, 1);

        // Frame guard
        if (!(atlas.frames && atlas.frames[s.frame])){
          // frame fehlt (z.B. wenn du Reihen später erst füllst) -> fallback auf row0 col0
          const fallbackFrame = makeFrameName(0);
          s.frame = fallbackFrame;
        }

        try{
          // Halo-Pass (weiche Kante, performant)
          if (halo > 0.001){
            ctx.globalAlpha = alpha * (0.22 * halo);
            const haloScale = scale * (1.12 + 0.22 * halo);
            A.drawAtlasFrame(ctx, CFG.atlasKey, s.frame, s.xPx, s.yPx, { scale: haloScale });
          }

          ctx.globalAlpha = alpha;
          A.drawAtlasFrame(ctx, CFG.atlasKey, s.frame, s.xPx, s.yPx, { scale });

          if (this.debug){
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,0,0,0.55)';
            ctx.fillRect(s.xPx-1, s.yPx-1, 2, 2);
          }
        }catch(e){
          if (this.debug) WARN('draw fail', e);
        }

        out.push(s);
      }

      ctx.globalAlpha = 1;
      this._stamps = out;
    }

    _decayWear(dt){
      if (this.decayPaused) return;
      if (dt <= 0) return;

      // Wir decayn nur die Tiles, die existieren (sparse Map).
      const decayBase = this.decayPerSecond; // pro Sekunde, 0..1-ish
      if (decayBase <= 0) return;

      // Sicherheitslimit: falls extrem viele Tiles, nicht alles in einem Frame.
      const HARD_LIMIT = 1800;
      let n = 0;

      // Iteration über Map
      for (const [k, wear0] of this._wear){
        if (n++ > HARD_LIMIT) break;

        // tile coords rekonstruieren (nur für Terrain-Decay)
        const ms = getMapState();
        const cols = ms?.cols || this._mapCols || 0;
        const tx = cols ? (k % cols) : 0;
        const ty = cols ? Math.floor(k / cols) : 0;

        const terrain = this._getTerrain(tx, ty);
        const mod = CFG.terrain[terrain] || CFG.terrain.DEFAULT;

        const wear1 = wear0 - (decayBase * mod.decayMult * dt);
        if (wear1 <= 0.0001) this._wear.delete(k);
        else this._wear.set(k, wear1);
      }
    }

    // ---------------------------------------------------------------------
    // STATE / EVENTS (für Inspector)
    // ---------------------------------------------------------------------
    _emitState(){
      try{
        window.dispatchEvent(new CustomEvent('cb:path:state', { detail: window.PathOverlay?.getState?.() || null }));
      }catch(_){/*noop*/}
    }
  }

  // ---------------------------------------------------------------------------
  // SINGLETON + API
  // ---------------------------------------------------------------------------
  const inst = window.PathOverlayInstance || new PathOverlay();
  window.PathOverlayInstance = inst;

  window.PathOverlay = {
    // Grundfunktionen
    setEnabled(v){ inst.enabled = !!v; inst._emitState(); },
    setDebug(v){ inst.debug = !!v; inst._emitState(); },
    clear(){ inst._stamps = []; inst._wear.clear(); inst._emitState(); },

    // Renderer-Hook
    drawOnMainCanvas(ctx){ inst.drawOnMainCanvas(ctx); },

    // Presets + Slider
    setPreset(name){ inst._applyPreset(name); },
    setWidthMult(mult){ inst.widthMult = Number(mult) || 1; inst._recomputeEffective(); inst._emitState(); },
    setSoftnessMult(mult){ inst.softnessMult = Number(mult) || 1; inst._recomputeEffective(); inst._emitState(); },
    setSoftness(v){ window.PathOverlay.setSoftnessMult(v); },

    // Decay
    setDecayPaused(v){ inst.decayPaused = !!v; inst._emitState(); },
    setDecaySpeed(mult){ inst.decaySpeedMult = Number(mult) || 0; inst._recomputeEffective(); inst._emitState(); },
    setDecayPerSec(perSec){ inst.decayPerSecond = Math.max(0, Number(perSec) || 0); inst._emitState(); },

    // Epoche / Locks
    setEpochLockEnabled(v){ inst.epochLockEnabled = !!v; inst.epochMaxStage = inst._computeEpochMaxStage(); inst._emitState(); },
    setEpoch(n){ inst.epoch = clamp(parseInt(n,10)||1, 1, 99); inst.epochMaxStage = inst._computeEpochMaxStage(); inst._emitState(); },

    // State
    getState(){
      return {
        enabled: !!inst.enabled,
        debug: !!inst.debug,

        preset: inst.preset,
        widthMult: inst.widthMult,
        stampScale: inst.stampScale,
        alpha: inst.alpha,

        softnessMult: inst.softnessMult,
        softness: inst.softness,

        samplePx: inst.samplePx,

        decayPaused: !!inst.decayPaused,
        decaySpeedMult: inst.decaySpeedMult,
        decayPerSecond: inst.decayPerSecond,

        epochLockEnabled: !!inst.epochLockEnabled,
        epoch: inst.epoch,
        epochMaxStage: inst.epochMaxStage,
        maxStageEffective: inst._getEffectiveMaxStage(),

        stamps: inst._stamps.length,
        wearTiles: inst._wear.size,
      };
    },

    // Backward-Compat
    toggle(v){ inst.enabled = (v==null ? !inst.enabled : !!v); inst._emitState(); },
    setVisible(v){ inst.enabled = !!v; inst._emitState(); },
    setStamps(v){ inst.enabled = !!v; inst._emitState(); },
    setHeatmap(_v){ /* neues System nutzt keine Heatmap */ },

    tune(obj){
      if (!obj) return;
      if (obj.alpha != null) inst.alpha = obj.alpha;
      if (obj.stampScale != null) inst.stampScale = obj.stampScale;
      if (obj.decayPerSecond != null) inst.decayPerSecond = obj.decayPerSecond;
      inst._emitState();
    },

    _inst: inst,
  };

})();
