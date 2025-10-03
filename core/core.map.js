/* ============================================================================
 * Datei   : core/core.map.js
 * Projekt : Neue Siedler – Engine
 * Version : v18.3.0 (Diagnose + Ground-Fill)
 * Zweck   : SiedlerMap – Map-Loader & Tile-Renderer
 *
 * Features:
 *  - Kein DPR-Mismatch (Canvas läuft in CSS-Pixeln)
 *  - Robuste Frame-Find-Funktion (_frameFor)
 *  - Diagnose: count hits/misses, einmaliges Log
 *  - NEU: Ground-Layer kann via { "fill": "<frameKey>" } vollflächig
 *         automatisch gefüllt werden (breite×höhe) – ideal für größere Maps
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[map]';
  const LOG  = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const OK   = (...a) => (window.CBLog?.ok    || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  // --- Fetch/Load -----------------------------------------------------------
  async function fetchJSON(url){
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }
  function loadImage(src){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('Bild nicht erreichbar: ' + src));
      img.src     = src;
    });
  }

  // --- kleine Normalizer, falls Keys minimale Abweichungen haben ------------
  const basename = p => String(p||'').replace(/\\/g,'/').split('/').pop();
  const stripExt = n => String(n||'').replace(/\.(png|webp|jpg|jpeg|gif)$/i,'');
  const canon    = n => stripExt(basename(n)).replace(/[\s-]+/g,'_');

  // --- Helfer: Layer ggf. vollflächig füllen --------------------------------
  // Füllt einen Tiles-Layer mit einem FrameKey, wenn kein data-Raster vorhanden ist.
  // layer.fill hat Vorrang; ansonsten wird "terrain_r4_c0" verwendet.
  function ensureFilledGrid(layer, w, h){
    if (!layer || layer.type !== 'tiles') return;

    // Bereits ein valides Raster vorhanden? → nichts tun
    if (Array.isArray(layer.data) && layer.data.length) return;

    const key = String(layer.fill || 'terrain_r4_c0');
    layer.data = Array.from({ length: h }, () =>
      Array.from({ length: w }, () => key)
    );
  }

  // --- Klasse ---------------------------------------------------------------
  class SiedlerMap {
    constructor(canvas, ctx){
      this.canvas = canvas;
      this.ctx    = ctx;

      // Kamera / Zoom
      this.camX = 0; this.camY = 0; this.zoom = 1;
      this.minZoom = 0.5; this.maxZoom = 3;

      // Viewport in CSS-Pixeln
      this.viewW = canvas?.width  || 0;
      this.viewH = canvas?.height || 0;

      // Tileset & Map
      this.tileset = null;   // { image, frames:{key:{x,y,w,h}}, tileSize }
      this.map     = null;   // { width,height,tileSize,layers:[...] }
      this._ground = null;

      // Diagnose
      this._diagLogged = false;

      LOG('SiedlerMap bereit.');
    }

    // Viewport-Größe von außen setzen (Canvas-Resize)
    setSize(w, h){ this.viewW = w|0; this.viewH = h|0; }

    // Map + Tileset laden; Ground-Layer robust finden; ggf. automatisch füllen
    async loadMap(url){
      if (!this.tileset) await this._ensureTileset();

      const data = await fetchJSON(url);

      // Breite/Höhe/Tilegröße tolerant aus JSON lesen
      const w = Number(Array.isArray(data.size) ? data.size[0] : (data.cols ?? data.width));
      const h = Number(Array.isArray(data.size) ? data.size[1] : (data.rows ?? data.height));
      const t = Number(data.tile || data.tileSize || this.tileset.tileSize || 64);

      this.map = {
        width : w || 32,
        height: h || 18,
        tileSize: t,
        layers: Array.isArray(data.layers) ? data.layers.slice() : []
      };

      // Ground-Layer robust ermitteln
      this._ground = (this.map.layers || []).find(l =>
        l && l.type === 'tiles' && (l.name === 'ground' || l.name === 'base' || l.id === 'ground')
      );
      if (!this._ground){
        WARN('Kein Ground-Layer gefunden – es wird nichts gezeichnet.');
      } else {
        // NEU: falls im JSON ein "fill"-Key angegeben (oder gar kein data vorhanden) → flächig füllen
        ensureFilledGrid(this._ground, this.map.width, this.map.height);
      }

      // Map-Tilegröße ggf. ins Tileset spiegeln (einheitliches Raster)
      if (this.map.tileSize && this.tileset) this.tileset.tileSize = this.map.tileSize;

      OK(`Map geladen: ${this.map.width}×${this.map.height} (tile=${this.map.tileSize})`);
    }

    // Hook für spätere Erweiterungen
    reload(){}

    // Robuste Framesuche mit kleinen Alias-Versuchen
    _frameFor(key){
      const frames = this.tileset?.frames || {};
      if (frames[key]) return frames[key];
      const k1 = basename(key);
      const k2 = stripExt(k1);
      const k3 = canon(k1);
      const k4 = canon(key);
      return frames[k1] || frames[k2] || frames[k3] || frames[k4] || null;
    }

    // Zeichnen des sichtbaren Bereichs inkl. Diagnose
    draw(){
      if (!this.ctx || !this.canvas) return;
      if (!this.tileset || !this.map || !this._ground) return;

      const ctx = this.ctx;
      const T   = this.map.tileSize|0;

      // Welt-Transform (ohne DPR!)
      const s = (this.zoom || 1);
      ctx.setTransform(s, 0, 0, s, Math.floor(-this.camX * s), Math.floor(-this.camY * s));

      // Sichtfenster
      const vw = (this.viewW || this.canvas.width ) / s;
      const vh = (this.viewH || this.canvas.height) / s;
      const x0 = Math.max(0, Math.floor(this.camX / T) - 1);
      const y0 = Math.max(0, Math.floor(this.camY / T) - 1);
      const x1 = Math.min(this.map.width,  Math.ceil((this.camX + vw) / T) + 1);
      const y1 = Math.min(this.map.height, Math.ceil((this.camY + vh) / T) + 1);

      // Zeichnen + Diagnose zählen
      let hits = 0, misses = 0, firstMissKey = null;
      const rows = this._ground.data;

      for (let r = y0; r < y1; r++){
        const row = rows[r]; if (!row) continue;
        for (let c = x0; c < x1; c++){
          const key = row[c]; if (!key) continue;
          const f   = this._frameFor(key);
          if (!f){ misses++; if (!firstMissKey) firstMissKey = key; continue; }
          ctx.drawImage(this.tileset.image, f.x, f.y, f.w, f.h, c*T, r*T, T, T);
          hits++;
        }
      }

      // einmaliges Log, damit wir wissen, was passiert
      if (!this._diagLogged){
        this._diagLogged = true;
        LOG('draw-diag:', { hits, misses, tile:T, view:{w:this.viewW,h:this.viewH}, cam:{x:this.camX,y:this.camY,zoom:this.zoom} });
        if (misses>0) WARN('missing frame example:', firstMissKey);
      }
      // Exponieren für schnelle Checks in der Konsole
      window.__mapDrawDiag = { hits, misses };
    }

    // Tileset-Atlas laden & Frames normalisieren
    async _ensureTileset(){
      const candidates = [
        'assets/tiles/tileset.terrain.json',
        'assets/tiles/tileset.json'
      ];

      let atlas = null, chosen = null;
      for (const url of candidates){
        try { atlas = await fetchJSON(url); chosen = url; break; }
        catch (e) { WARN('Tileset-Kandidat verworfen:', url, '→', e.message); }
      }
      if (!atlas) throw new Error('Kein Tileset-Atlas erreichbar.');

      const imagePath = atlas?.meta?.image;
      if (!imagePath) throw new Error('Tileset.meta.image fehlt.');
      const img = await loadImage(imagePath);

      // Frames normalisieren (flach oder TexturePacker-Style)
      const normalized = {};
      const frames = atlas.frames || {};
      for (const [key, val] of Object.entries(frames)){
        let x,y,w,h;
        if (val && typeof val === 'object'){
          if (val.x!=null) { x=val.x; y=val.y; w=val.w; h=val.h; }
          else if (val.frame && typeof val.frame==='object'){ ({x,y,w,h}=val.frame); }
        }
        if ([x,y,w,h].every(n => Number.isFinite(n))) {
          normalized[key] = { x:x|0, y:y|0, w:w|0, h:h|0 };
        } else {
          WARN('Frame ignoriert (kein x/y/w/h):', key);
        }
      }

      const tileSize = atlas?.meta?.tileSize || atlas?.meta?.tile || 64;
      this.tileset = { image: img, frames: normalized, tileSize };

      OK('Tileset geladen:', chosen, `(Frames: ${Object.keys(this.tileset.frames).length})`);
    }

    // Platzhalter für Terrain-Abfragen
    isWater(){ return false; }
    terrainAt(){ return null; }
  }

  window.SiedlerMap = SiedlerMap;
})();
