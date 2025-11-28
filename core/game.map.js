/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.28-fix2 (Map-Render: 2D-Grid)
 * Zweck   : Map laden (map-epoch1.json) + Tileset laden + komplette Map rendern
 * Struktur: STATE → INIT → RENDER → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[map]';
  const LOG = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WRN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const Mod = {
    // Map-Daten
    name:        'unknown',
    cols:        1,
    rows:        1,
    tileSize:    64,
    grid:        null,   // 2D-Array [y][x] = tileId
    // Tileset
    tileset:     null,
    tilesetUrl:  '',
    tilesetCols: 1,

    ready: false,
    sized: false
  };

  // -------------------------------------------------------------------------
  // Canvas-Größe an Viewport anpassen (einmalig)
  // -------------------------------------------------------------------------
  function ensureCanvasSize(Game){
    try{
      const ctx = Game.ctx;
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
      WRN('ensureCanvasSize Fehler:', e?.message || e);
    }
  }

  // -------------------------------------------------------------------------
  // Map-JSON normalisieren
  // Erwartet Format in etwa:
  // {
  //   "name": "epoch1",
  //   "size": [64,64],
  //   "tiles": [
  //     [1,1,1,1,...],
  //     [1,2,2,1,...],
  //     ...
  //   ]
  // }
  // -------------------------------------------------------------------------
  function applyMapJson(json){
    if (!json || !Array.isArray(json.tiles) || !json.tiles.length){
      WRN('Map-JSON ungültig oder leer – verwende 1x1 Fallback');
      Mod.name = 'fallback';
      Mod.cols = 1;
      Mod.rows = 1;
      Mod.tileSize = 64;
      Mod.grid = [[1]];
      return;
    }

    const tiles = json.tiles;
    const rows  = tiles.length;
    const cols  = tiles[0].length;

    Mod.name     = json.name || 'epoch1';
    Mod.rows     = rows;
    Mod.cols     = cols;
    Mod.tileSize = Array.isArray(json.size) ? (json.size[0] || 64) : 64;

    // Safety: alle Zeilen auf gleiche Länge bringen, Werte in Integer umwandeln
    const grid = new Array(rows);
    for (let y = 0; y < rows; y++){
      const row = Array.isArray(tiles[y]) ? tiles[y] : [];
      grid[y] = new Array(cols);
      for (let x = 0; x < cols; x++){
        grid[y][x] = row[x] | 0; // 0 = leer, >0 = Tile-ID
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

  // -------------------------------------------------------------------------
  // Tileset-Helfer: aus Tile-ID (1-basiert) → sx, sy im Tileset
  // -------------------------------------------------------------------------
  function spriteFromId(tileId){
    tileId = tileId | 0;
    if (tileId <= 0) return null;     // 0 = kein Tile

    const ts   = Mod.tileSize;
    const cols = Mod.tilesetCols || 1;

    const id   = tileId - 1;          // 0-basiert
    const sx   = (id % cols) * ts;
    const sy   = Math.floor(id / cols) * ts;

    return { sx, sy };
  }

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------
  function init(Game){
    const canvas    = document.getElementById('game');
    const mapUrl    = canvas?.getAttribute('data-map')     || 'data/maps/map-epoch1.json';
    const tilesetUrl= canvas?.getAttribute('data-tileset') || 'assets/tiles/tileset.terrain.png';

    Mod.tilesetUrl  = tilesetUrl;

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
        WRN('Fehler beim Laden der Map:', mapUrl, err);
      });

    // Tileset laden
    const img = new Image();
    img.onload = ()=>{
      Mod.tileset     = img;
      Mod.tilesetCols = Math.max(1, Math.floor(img.width / Mod.tileSize) || 1);
      LOG('Tileset geladen:', tilesetUrl, 'Cols=', Mod.tilesetCols);
      if (Mod.grid) {
        Mod.ready = true;
        LOG('Map + Tileset bereit → renderfähig');
      }
    };
    img.onerror = (e)=>{
      WRN('Fehler beim Laden des Tilesets:', tilesetUrl, e);
    };
    img.src = tilesetUrl;

    return Mod;
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  function render(Game){
    const ctx = Game.ctx;
    if (!ctx) return;

    // Canvas einmalig an Viewport anpassen
    ensureCanvasSize(Game);

    // Erst zeichnen, wenn Map + Tileset wirklich da sind
    if (!Mod.ready || !Mod.grid || !Mod.tileset) return;

    const c  = ctx.canvas;
    const ts = Mod.tileSize;

    ctx.clearRect(0, 0, c.width, c.height);

    // komplette Map zeichnen (ohne Kamera-Offset, Top-Left)
    for (let y = 0; y < Mod.rows; y++){
      const row = Mod.grid[y];
      for (let x = 0; x < Mod.cols; x++){
        const id = row[x] | 0;
        if (id <= 0) continue; // leer

        const spr = spriteFromId(id);
        if (!spr) continue;

        try{
          ctx.drawImage(
            Mod.tileset,
            spr.sx, spr.sy, ts, ts,
            x * ts, y * ts, ts, ts
          );
        }catch(e){
          WRN('drawImage-Fehler (x='+x+', y='+y+', id='+id+'):',
              e?.message || e);
          // nicht den ganzen Frame abbrechen
        }
      }
    }

    // (Optional) Gebäude-Overlay → später; aktuell lassen wir das Map-only.
  }

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameMap = { init, render, _state: Mod };

})();
