/* ============================================================================
 * Datei   : core/core.map.js
 * Projekt : Neue Siedler – Engine
 * Version : v18.2.0 (2025-10-02)
 * Zweck   : SiedlerMap – Map-Loader & Tile-Renderer
 *           - Kein DPR-Mismatch (Canvas läuft in CSS-Pixeln)
 *           - Robuste Frame-Normalisierung (TexturePacker u. flach)
 *           - Ground-Layer-Fallbacks (name:'ground'|'base'|id:'ground')
 * ============================================================================ */
(() => {
  'use strict';

  // ---- Logging -------------------------------------------------------------
  const TAG  = '[map]';
  const LOG  = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const OK   = (...a) => (window.CBLog?.ok    || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  // ---- Utils ---------------------------------------------------------------
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

  // ---- Klasse --------------------------------------------------------------
  class SiedlerMap {
    constructor(canvas, ctx /*, debugOverlay? */){
      this.canvas = canvas;
      this.ctx    = ctx;

      // Kamera
      this.camX = 0;
      this.camY = 0;
      this.zoom = 1;
      this.minZoom = 0.5;
      this.maxZoom = 3;

      // Viewport in CSS-Pixeln
      this.viewW = canvas?.width  || 0;
      this.viewH = canvas?.height || 0;

      // Tileset & Map
      this.tileset = null;   // { image, frames:{key:{x,y,w,h}}, tileSize }
      this.map     = null;   // { width,height,tileSize,layers:[...] }
      this._ground = null;

      LOG('SiedlerMap bereit.');
    }

    // --- Public API ---------------------------------------------------------
    setSize(w, h){
      this.viewW = w|0;
      this.viewH = h|0;
    }

    async loadMap(url){
      if (!this.tileset) await this._ensureTileset();

      const data = await fetchJSON(url);
      const w = Number(Array.isArray(data.size) ? data.size[0] : (data.cols ?? data.width));
      const h = Number(Array.isArray(data.size) ? data.size[1] : (data.rows ?? data.height));
      const t = Number(data.tile || data.tileSize || this.tileset.tileSize || 64);

      this.map = {
        width : w || 32,
        height: h || 18,
        tileSize: t,
        layers: Array.isArray(data.layers) ? data.layers.slice() : []
      };

      // Ground-Layer robust finden
      this._ground = (this.map.layers || []).find(l =>
        l && l.type === 'tiles' && (l.name === 'ground' || l.name === 'base' || l.id === 'ground')
      );
      if (!this._ground){
        WARN('Kein Ground-Layer gefunden – es wird nichts gezeichnet.');
      }

      // Map-Tilegröße ggf. ins Tileset spiegeln (einheitliches Raster)
      if (this.map.tileSize && this.tileset) {
        this.tileset.tileSize = this.map.tileSize;
      }

      OK(`Map geladen: ${this.map.width}×${this.map.height} (tile=${this.map.tileSize})`);
    }

    reload(){ /* Platzhalter */ }

    draw(){
      if (!this.ctx || !this.canvas) return;
      if (!this.tileset || !this.map || !this._ground) return;

      const ctx = this.ctx;
      const T   = this.map.tileSize|0;

      // --- Welt-Transform setzen (ohne DPR!) -------------------------------
      const s = (this.zoom || 1);
      ctx.setTransform(s, 0, 0, s, Math.floor(-this.camX * s), Math.floor(-this.camY * s));

      // --- Sichtfenster bestimmen ------------------------------------------
      const vw = (this.viewW || this.canvas.width ) / s;
      const vh = (this.viewH || this.canvas.height) / s;
      const x0 = Math.max(0, Math.floor(this.camX / T) - 1);
      const y0 = Math.max(0, Math.floor(this.camY / T) - 1);
      const x1 = Math.min(this.map.width,  Math.ceil((this.camX + vw) / T) + 1);
      const y1 = Math.min(this.map.height, Math.ceil((this.camY + vh) / T) + 1);

      // --- Layer zeichnen ---------------------------------------------------
      const frames = this.tileset.frames;
      const img    = this.tileset.image;
      const rows   = this._ground.data;

      for (let r = y0; r < y1; r++){
        const row = rows[r]; if (!row) continue;
        for (let c = x0; c < x1; c++){
          const key = row[c]; if (!key) continue;
          const f   = frames[key];
          if (!f) continue; // unbekannter Frame-Key
          ctx.drawImage(img, f.x, f.y, f.w, f.h, c*T, r*T, T, T);
        }
      }
    }

    // --- Intern -------------------------------------------------------------
    async _ensureTileset(){
      const candidates = [
        'assets/tiles/tileset.terrain.json',
        'assets/tiles/tileset.json'
      ];

      let atlas = null, chosen = null;
      for (const url of candidates){
        try {
          atlas = await fetchJSON(url);
          chosen = url;
          break;
        } catch (e) {
          WARN('Tileset-Kandidat verworfen:', url, '→', e.message);
        }
      }
      if (!atlas) throw new Error('Kein Tileset-Atlas erreichbar.');

      const imagePath = atlas?.meta?.image;
      if (!imagePath) throw new Error('Tileset.meta.image fehlt.');
      const img = await loadImage(imagePath);

      // --- Frames normalisieren --------------------------------------------
      // Unterstützt:
      //  - frames[key] = { x,y,w,h, ... }
      //  - frames[key] = { frame:{ x,y,w,h }, ... }  (TexturePacker)
      const normalized = {};
      const frames = atlas.frames || {};
      for (const [key, val] of Object.entries(frames)){
        let x,y,w,h;
        if (val && typeof val === 'object'){
          if (val.x!=null) { x=val.x; y=val.y; w=val.w; h=val.h; }
          else if (val.frame && typeof val.frame==='object'){
            ({x,y,w,h} = val.frame);
          }
        }
        if ([x,y,w,h].every(n => Number.isFinite(n))) {
          normalized[key] = { x: x|0, y: y|0, w: w|0, h: h|0 };
        } else {
          WARN('Frame ignoriert (kein x/y/w/h):', key);
        }
      }

      const tileSize = atlas?.meta?.tileSize || atlas?.meta?.tile || 64;

      this.tileset = {
        image  : img,
        frames : normalized,
        tileSize
      };

      OK('Tileset geladen:', chosen, `(Frames normalisiert: ${Object.keys(this.tileset.frames).length})`);
    }

    // Platzhalter für Terrain-Abfragen
    isWater(){ return false; }
    terrainAt(){ return null; }
  }

  window.SiedlerMap = SiedlerMap;
})();
