/* ============================================================================
 * Datei   : core/core.map.js
 * Projekt : Neue Siedler – Engine
 * Version : v18.1.0 (2025-10-02)
 * Zweck   : SiedlerMap – Map-Loader & Tile-Renderer (kompatibel zu game.js)
 *
 * Erwartetes Interface (von core/game.js benutzt):
 *   const map = new SiedlerMap(canvas, ctx, debugOverlay?)
 *   await map.loadMap('data/maps/map-mini.json');   // URL zu JSON
 *   map.setSize(w, h);                              // optional vom Game bei Resize
 *   map.draw();                                     // Game ruft das pro Frame auf
 *   // optionale Eigenschaften die Game liest/setzt:
 *   map.camX, map.camY, map.zoom, map.minZoom, map.maxZoom
 *
 * Unterstützte Assets / Formate:
 *   - Tileset-Atlas: versucht zuerst assets/tiles/tileset.terrain.json,
 *                    sonst assets/tiles/tileset.json (beide mit meta.image)
 *   - Map-JSON:     erwartet mind. size (rows/cols oder [w,h]) und eine
 *                    Layer "ground" mit 2D-Array von Frame-Keys:
 *                    z.B. "terrain_r4_c0", die im Atlas unter frames[...] liegen.
 *
 * Performance:
 *   - Setzt die Welt-Transform selbst (basierend auf camX/camY/zoom)
 *   - Zeichnet nur die im Viewport sichtbaren Kacheln (Culling)
 *   - tileSize default = 64 (aus Atlas meta.tileSize, wenn vorhanden)
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

      // Kamera (Game synchronisiert die Werte gegen diese Properties)
      this.camX = 0;
      this.camY = 0;
      this.zoom = 1;
      this.minZoom = 0.5;
      this.maxZoom = 3;

      // Viewport (in CSS-Pixeln; wir rechnen im draw() mit devicePixelRatio)
      this.viewW = canvas?.width  || 0;
      this.viewH = canvas?.height || 0;

      // Tileset & Map
      this.tileset = null;   // { image, frames, tileSize }
      this.map     = null;   // { width, height, tileSize, layers:[{name,type,data:2D}] }

      // Cache
      this._dpr = Math.max(1, window.devicePixelRatio || 1);

      LOG('SiedlerMap bereit.');
    }

    // --- Public API ---------------------------------------------------------
    setSize(w, h){
      // Game ruft das bei Resize → wir merken die Zeichenfläche (in Device-Px!)
      this.viewW = w|0;
      this.viewH = h|0;
    }

    async loadMap(url){
      // Tileset einmalig vorwärmen
      if (!this.tileset) await this._ensureTileset();

      const data = await fetchJSON(url);
      // Normalisiere Basisdaten
      const w = Number(Array.isArray(data.size) ? data.size[0] : (data.cols ?? data.width));
      const h = Number(Array.isArray(data.size) ? data.size[1] : (data.rows ?? data.height));
      const t = Number(data.tile || data.tileSize || this.tileset.tileSize || 64);

      this.map = {
        width : w || 32,
        height: h || 18,
        tileSize: t,
        layers: Array.isArray(data.layers) ? data.layers.slice() : []
      };

      // Wichtige Layer herausgreifen (mind. 'ground')
      this._ground = (this.map.layers || []).find(l => l && l.name === 'ground' && Array.isArray(l.data));
      if (!this._ground){
        WARN('Keine Layer "ground" gefunden – es wird nichts gezeichnet.');
      }

      // Falls Map Tilegröße vorgibt, übernehmen wir sie auch fürs Atlas-Raster
      if (this.map.tileSize && this.tileset) {
        this.tileset.tileSize = this.map.tileSize;
      }

      OK(`Map geladen: ${this.map.width}×${this.map.height} (tile=${this.map.tileSize})`);
    }

    reload(){
      // Platzhalter für spätere Mechaniken (z. B. Layer neu generieren)
      // Game ruft das optional auf; hier ist nichts weiter nötig.
    }

    draw(){
      if (!this.ctx || !this.canvas) return;
      if (!this.tileset || !this.map || !this._ground) return;

      const ctx = this.ctx;
      const T   = this.map.tileSize|0;
      const dpr = this._dpr;

      // 1) Welt-Transform setzen (Skalierung + Verschiebung)
      const s = dpr * (this.zoom || 1);
      ctx.setTransform(s, 0, 0, s, Math.floor(-this.camX * s), Math.floor(-this.camY * s));

      // 2) Sichtfenster cullen (in Weltkoordinaten)
      const vw = (this.viewW || this.canvas.width ) / s;
      const vh = (this.viewH || this.canvas.height) / s;
      const x0 = Math.max(0, Math.floor(this.camX / T) - 1);
      const y0 = Math.max(0, Math.floor(this.camY / T) - 1);
      const x1 = Math.min(this.map.width,  Math.ceil((this.camX + vw) / T) + 1);
      const y1 = Math.min(this.map.height, Math.ceil((this.camY + vh) / T) + 1);

      // 3) Ground-Layer zeichnen
      const frames = this.tileset.frames;
      const img    = this.tileset.image;
      const rows   = this._ground.data;

      for (let r = y0; r < y1; r++){
        const row = rows[r]; if (!row) continue;
        for (let c = x0; c < x1; c++){
          const key = row[c]; if (!key) continue;
          const f   = frames[key]; if (!f) continue;
          const dx = c * T, dy = r * T;
          ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, T, T);
        }
      }

      // 4) Transform wird NICHT zurückgesetzt – Game zeichnet danach in Screen-Space
      //     und ruft dafür selbst ctx.save/restore().
    }

    // --- Internes -----------------------------------------------------------
    async _ensureTileset(){
      // Reihenfolge: terrain.json → tileset.json
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
      const tileSize = atlas?.meta?.tileSize || atlas?.meta?.tile || 64;

      this.tileset = {
        image  : img,
        frames : atlas.frames || {},
        tileSize
      };

      OK('Tileset geladen:', chosen, `(Frames: ${Object.keys(this.tileset.frames).length})`);
    }

    // Optionale Abfragen (werden in game.js evtl. genutzt)
    isWater(gx, gy){
      // Wenn du später Terrain-Typen ablegst, kannst du die hier mappen.
      // Platzhalter: false
      return false;
    }
    terrainAt(gx, gy){
      // Platzhalter für spätere Terrain-Klassifizierung
      return null;
    }
  }

  // ---- Export --------------------------------------------------------------
  window.SiedlerMap = SiedlerMap;
})();
