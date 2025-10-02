// ============================================================================
// Datei   : core/map-runtime.js
// Projekt : Neue Siedler
// Version : v2.0.0 (passive Map-Engine)
// Zweck   : Terrain aus Tileset zeichnen (ohne eigene Inputs)
//           - liest rows/cols/tile/tiles[] aus map-json
//           - lädt tileset + optionale tileset.terrain.json (Meta: tilesize, cols, spacing…)
//           - stellt Terrain-Helper bereit (terrainAt, isWater)
// Schnitt : Game kümmert sich um camX, camY, zoom; Map zeichnet nur.
// ============================================================================

(function (root, factory) {
  root.SiedlerMap = factory();
})(typeof window !== 'undefined' ? window : this, function () {

  class SiedlerMap {
    constructor(canvas, ctx, debugOverlay) {
      this.canvas = canvas;
      this.ctx    = ctx;

      // Debug-Overlay (optional)
      this.debugOverlay = debugOverlay || SiedlerMap.ensureDebugOverlay();

      // --- Welt/Map-Daten ---------------------------------------------------
      this.map       = null;         // geladene Map (JSON)
      this.rows      = 0;            // Anzahl Zeilen
      this.cols      = 0;            // Anzahl Spalten
      this.tile      = 64;           // Ziel-Kachelgröße in der Welt (px)

      // Kamera (werden von Game geschrieben; hier nur konsumiert)
      this.camX = 0;
      this.camY = 0;
      this.zoom = 1.0;
      this.minZoom = 0.5;
      this.maxZoom = 3.0;

      // --- Tileset (Bild + Meta) -------------------------------------------
      this.tilesetPath = 'assets/tiles/tileset.terrain.png';
      this.metaPath    = 'assets/tiles/tileset.terrain.json'; // optional
      this.tileset     = null;       // HTMLImageElement
      this._tilesetReady = false;

      // Metadaten des Tilesets (Quelle: meta json oder Fallbacks)
      this.ts = {
        tileSize: 64,      // Quellkachel im PNG
        columns:  8,       // wie viele Kacheln pro Zeile im PNG
        margin:   0,       // optional: Rand im PNG
        spacing:  0        // optional: Abstand zwischen Kacheln im PNG
      };

      // Zeichen-Flags
      this.showGrid   = true;
      this.gridColor  = 'rgba(240,240,255,0.05)'; // dezentes Grid

      // Canvas-Größe initial setzen
      this.setSize(this.canvas.clientWidth || this.canvas.width || 1280,
                   this.canvas.clientHeight || this.canvas.height || 720);
    }

    // -----------------------------------------------------------------------
    // Debug-Overlay (kleines <pre>, optional)
    // -----------------------------------------------------------------------
    static ensureDebugOverlay() {
      let el = document.getElementById('debug-map');
      if (!el) {
        el = document.createElement('pre');
        el.id = 'debug-map';
        el.style.position = 'fixed';
        el.style.bottom   = '8px';
        el.style.left     = '8px';
        el.style.padding  = '6px 8px';
        el.style.font     = '12px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        el.style.background = 'rgba(0,0,0,.35)';
        el.style.color    = '#cfe3ff';
        el.style.border   = '1px solid rgba(255,255,255,.15)';
        el.style.borderRadius = '8px';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
      }
      return el;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    setSize(w, h) {
      // Wichtig: die interne Canvas-Auflösung auf echte CSS-Pixel skalieren
      this.canvas.width  = w;
      this.canvas.height = h;
    }

    async loadMap(path) {
      // Map-JSON
      const res  = await fetch(path, { cache: 'no-cache' });
      const json = await res.json();

      // Basiswerte (rows/cols/tile/tiles/terrainTypes)
      this.map   = json;
      this.rows  = Number(json.rows || (Array.isArray(json.size) && json.size[1])) || 16;
      this.cols  = Number(json.cols || (Array.isArray(json.size) && json.size[0])) || 16;
      this.tile  = Number(json.tile) || 64;

      // Tileset laden
      await this._loadTileset();     // Bild + optionale Meta
    }

    reload() {
      // Kamera-Defaults (Game überschreibt diese wieder)
      this.camX = 0;
      this.camY = 0;
      this.zoom = 1.0;
    }

    // -----------------------------------------------------------------------
    // Terrain-Helfer (werden von Game für Platzierung benutzt)
    // Erwartet map.tiles[row][col] (number | string).
    // Optional: map.terrainTypes = { 0:'grass', 1:'water', ... }
    // -----------------------------------------------------------------------
    terrainAt(gx, gy) {
      if (!this.map || !Array.isArray(this.map.tiles)) return null;
      if (gy < 0 || gy >= this.rows || gx < 0 || gx >= this.cols) return null;

      const val = this.map.tiles[gy]?.[gx];
      if (val == null) return null;

      // Mapping bevorzugt
      if (this.map.terrainTypes && this.map.terrainTypes[val] !== undefined) {
        return this.map.terrainTypes[val];
      }

      // Fallback-Heuristik (nur, wenn numerische IDs verwendet werden)
      if (typeof val === 'number') {
        switch (val) {
          case 0: return 'grass';
          case 1: return 'water';
          case 2: return 'stone';
          default: return 'unknown';
        }
      }

      // Falls Strings direkt in tiles abgelegt wurden (z.B. 'grass')
      if (typeof val === 'string') return val;

      return 'unknown';
    }

    isWater(gx, gy) {
      return this.terrainAt(gx, gy) === 'water';
    }

    // -----------------------------------------------------------------------
    // Intern: Tileset laden (Bild + optionale Meta)
    // meta-Datei sollte folgendes enthalten:
    //   { "tileSize":64, "columns":8, "margin":0, "spacing":0 }
    // -----------------------------------------------------------------------
    async _loadTileset() {
      // Meta (optional)
      try {
        const m = await fetch(this.metaPath, { cache: 'no-cache' });
        if (m.ok) {
          const meta = await m.json();
          this.ts.tileSize = Number(meta.tileSize || meta.tile || this.ts.tileSize);
          this.ts.columns  = Number(meta.columns  || this.ts.columns);
          this.ts.margin   = Number(meta.margin   || 0);
          this.ts.spacing  = Number(meta.spacing  || 0);
        }
      } catch (_) { /* optional */ }

      // Bild
      await new Promise((resolve) => {
        const img = new Image();
        img.onload  = () => { this.tileset = img; this._tilesetReady = true; resolve(); };
        img.onerror = ()  => { this.tileset = null; this._tilesetReady = false; resolve(); };
        img.src = this.tilesetPath;
      });
    }

    // -----------------------------------------------------------------------
    // Zeichnen
    // -----------------------------------------------------------------------
    draw() {
      const ctx = this.ctx, c = this.canvas;
      if (!ctx || !c || !this.map) return;

      // Hintergrund
      ctx.save();
      ctx.fillStyle = '#161a1f';
      ctx.fillRect(0, 0, c.width, c.height);

      // Welt-Transform gemäß Kamera
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.camX, -this.camY);

      // Sichtbaren Bereich ermitteln (Clipping für Performance)
      const viewW = c.width  / this.zoom;
      const viewH = c.height / this.zoom;
      const x0 = Math.max(0, Math.floor(this.camX / this.tile));
      const y0 = Math.max(0, Math.floor(this.camY / this.tile));
      const x1 = Math.min(this.cols - 1, Math.ceil((this.camX + viewW) / this.tile));
      const y1 = Math.min(this.rows - 1, Math.ceil((this.camY + viewH) / this.tile));

      // Terrain zeichnen
      if (Array.isArray(this.map.tiles) && this._tilesetReady && this.tileset) {
        const ts  = this.ts;
        const img = this.tileset;

        for (let gy = y0; gy <= y1; gy++) {
          const row = this.map.tiles[gy];
          if (!row) continue;
          for (let gx = x0; gx <= x1; gx++) {
            let idx = row[gx];

            // String → Index? (optional: wenn terrainTypes reverse verfügbar wäre)
            if (typeof idx !== 'number') idx = 0;

            const col = idx % ts.columns;
            const rowIdx = Math.floor(idx / ts.columns);

            const sx = ts.margin + col * (ts.tileSize + ts.spacing);
            const sy = ts.margin + rowIdx * (ts.tileSize + ts.spacing);
            const dx = gx * this.tile;
            const dy = gy * this.tile;

            ctx.drawImage(img, sx, sy, ts.tileSize, ts.tileSize, dx, dy, this.tile, this.tile);
          }
        }
      } else {
        // Fallback: nur Grid-Hintergrund – damit man was sieht
        ctx.fillStyle = '#1a1f26';
        ctx.fillRect(0, 0, this.cols * this.tile, this.rows * this.tile);
      }

      // Optional: Grid
      if (this.showGrid) {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        // horizontale Linien
        for (let r = 0; r <= this.rows; r++) {
          const y = r * this.tile + 0.5;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.cols * this.tile, y); ctx.stroke();
        }
        // vertikale Linien
        for (let cix = 0; cix <= this.cols; cix++) {
          const x = cix * this.tile + 0.5;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.rows * this.tile); ctx.stroke();
        }
      }

      ctx.restore();

      // Debug: nur anzeigen, wenn Overlay existiert
      if (this.debugOverlay) {
        this.debugOverlay.textContent =
          `Cam: x=${this.camX.toFixed(1)} y=${this.camY.toFixed(1)} zoom=${this.zoom.toFixed(2)}\n` +
          `Map: ${this.map?.name || 'unnamed'}  size=${this.cols}×${this.rows}  tile=${this.tile}\n` +
          `Tileset: ${this._tilesetReady ? 'ok' : 'missing'}  src=${this.tilesetPath}`;
      }
    }
  }

  return SiedlerMap;
});
