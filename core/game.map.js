/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.28-camgrid (Map+Camera, ohne Bridge)
 * Zweck   : Map (map-epoch1.json) + Tileset selbst laden und mit GameCamera
 *           rendern (Pan + Zoom).
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[map]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const Mod = {
    name       : 'unknown',
    cols       : 1,
    rows       : 1,
    tileSize   : 64,
    grid       : null,    // 2D-Array [y][x] = tileId

    tileset    : null,    // Image
    tilesetUrl : '',
    tilesetCols: 1,

    ready      : false,
    sized      : false
  };

  // -------------------------------------------------------------------------
  // Canvas-Größe an Viewport anpassen (einmalig)
  // -------------------------------------------------------------------------
  function ensureCanvasSize(Game){
    try{
      const ctx = Game?.ctx;
      if (!ctx) return;
      const c = ctx.canvas;
      if (!c) return;

      const w = window.innerWidth  || document.documentElement.clientWidth  || c.width;
      const h = window.innerHeight || document.documentElement.clientHeight || c.height;

      if (!Mod.sized && w > 0 && h > 0){
        c.width  = w;
        c.height = h;
        Mod.sized = true;
        LOG('Canvasgröße gesetzt:', w, 'x', h);
      }
    }catch(e){
      WARN('ensureCanvasSize Fehler:', e?.message || e);
    }
  }

  // -------------------------------------------------------------------------
  // Map-JSON normalisieren (2D-Grid -> internes Format)
  //
  // Erwartetes Format:
  // {
  //   "name": "epoch1",
  //   "size": [64, 64],
  //   "tiles": [
  //     [1,1,1,...],
  //     [1,2,2,...],
  //     ...
  //   ]
  // }
  // -------------------------------------------------------------------------
  function applyMapJson(json){
    if (!json || !Array.isArray(json.tiles) || !json.tiles.length){
      WARN('Map-JSON ungültig oder leer – Fallback 1x1');
      Mod.name     = 'fallback';
      Mod.cols     = 1;
      Mod.rows     = 1;
      Mod.tileSize = 64;
      Mod.grid     = [[1]];
      return;
    }

    const tiles = json.tiles;
    const rows  = tiles.length;
    const cols  = tiles[0].length;

    Mod.name     = json.name || 'epoch1';
    Mod.rows     = rows;
    Mod.cols     = cols;
    Mod.tileSize = Array.isArray(json.size) ? (json.size[0] || 64) : 64;

    const grid = new Array(rows);
    for (let y = 0; y < rows; y++){
      const row = Array.isArray(tiles[y]) ? tiles[y] : [];
      grid[y] = new Array(cols);
      for (let x = 0; x < cols; x++){
        grid[y][x] = row[x] | 0;     // 0 = leer
      }
    }
    Mod.grid = grid;

    LOG('Map übernommen:', {
      name : Mod.name,
      cols : Mod.cols,
      rows : Mod.rows,
      ts   : Mod.tileSize
    });
  }

  // Tile-ID (1-basiert) -> Quelle im Tileset
  function spriteFromId(tileId){
    tileId = tileId | 0;
    if (tileId <= 0) return null;

    const ts   = Mod.tileSize;
    const cols = Mod.tilesetCols || 1;
    const id   = tileId - 1;                // 0-basiert

    const sx = (id % cols) * ts;
    const sy = Math.floor(id / cols) * ts;

    return { sx, sy };
  }

  // -------------------------------------------------------------------------
  // INIT – Map + Tileset SELBST laden (ohne map-runtime.bridge.js)
  // -------------------------------------------------------------------------
  function init(Game){
    const canvas    = document.getElementById('game');
    const mapUrl    = canvas?.getAttribute('data-map')     || 'data/maps/map-epoch1.json';
    const tilesetUrl= canvas?.getAttribute('data-tileset') || 'assets/tiles/tileset.terrain.png';

    Mod.tilesetUrl = tilesetUrl;

    // Map laden
    fetch(mapUrl)
      .then(r => {
        if (!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      })
      .then(json => {
        applyMapJson(json);
        if (Mod.tileset) {
          Mod.ready = true;
          LOG('Map + Tileset bereit → renderfähig');
        }
      })
      .catch(err => {
        WARN('Fehler beim Laden der Map:', mapUrl, err);
      });

    // Tileset laden
    const img = new Image();
    img.onload = ()=>{
      Mod.tileset = img;
      Mod.tilesetCols = Math.max(1, Math.floor(img.width / Mod.tileSize) || 1);
      LOG('Tileset geladen:', tilesetUrl, 'Cols=', Mod.tilesetCols);
      if (Mod.grid) {
        Mod.ready = true;
        LOG('Map + Tileset bereit → renderfähig');
      }
    };
    img.onerror = (e)=>{
      WARN('Fehler beim Laden des Tilesets:', tilesetUrl, e);
    };
    img.src = tilesetUrl;

    LOG('init() – Map-Renderer vorbereitet');
    return Mod;
  }

  // -------------------------------------------------------------------------
  // RENDER – mit GameCamera (Pan + Zoom)
  // -------------------------------------------------------------------------
  function render(Game){
    const ctx = Game?.ctx;
    if (!ctx) return;

    // 1) Canvas auf Bildschirmgröße bringen
    ensureCanvasSize(Game);

    // 2) Canvas komplett löschen (im Screen-Space)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 3) Kamera anwenden
    const cam   = window.GameCamera || {};
    const zoom  = cam.zoom ?? 1;
    const camX  = cam.x    ?? 0;
    const camY  = cam.y    ?? 0;
    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);

    // 4) Nur zeichnen, wenn Map + Tileset bereit sind
    if (!Mod.ready || !Mod.grid || !Mod.tileset) {
      return;
    }

    const img = Mod.tileset;
    const ts  = Mod.tileSize;

    // 5) Terrain (komplette Map)
    for (let y = 0; y < Mod.rows; y++){
      const row = Mod.grid[y];
      for (let x = 0; x < Mod.cols; x++){
        const id = row[x] | 0;
        if (id <= 0) continue;

        const spr = spriteFromId(id);
        if (!spr) continue;

        const dx = x * ts;
        const dy = y * ts;

        try{
          ctx.drawImage(
            img,
            spr.sx, spr.sy, ts, ts,
            dx, dy, ts, ts
          );
        }catch(e){
          WARN('drawImage-Fehler (x='+x+', y='+y+', id='+id+'):', e?.message || e);
        }
      }
    }

    // 6) Gebäude-Overlay (Baustellen / fertige Gebäude)
    if (Array.isArray(Game?.buildings)){
      for (const b of Game.buildings){
        const bx = (b.x | 0) * ts;
        const by = (b.y | 0) * ts;
        const bw = (b.w || 1) * ts;
        const bh = (b.h || 1) * ts;

        let col = 'rgba(80,200,80,0.9)';   // fertig
        if (b.buildStage === 0) col = 'rgba(200,150,50,0.6)';
        if (b.buildStage === 1) col = 'rgba(220,180,80,0.7)';
        if (b.buildStage === 2) col = 'rgba(140,200,120,0.8)';

        ctx.fillStyle = col;
        ctx.fillRect(bx, by, bw, bh);
      }
    }
  }

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameMap = { init, render, _state: Mod };

})();
