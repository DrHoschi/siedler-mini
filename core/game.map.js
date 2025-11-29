/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-buildsprites (Map+Camera+BaustellenSprites)
 * Zweck   : Map (map-epoch1.json) + Tileset selbst laden und mit GameCamera
 *           rendern (Pan + Zoom) + Gebäude/Baustellen-Overlay.
 * ========================================================================= */

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
  // Baustellen-Sprites (baustelle_0/1/2.png) – einfache Bildliste
  // -------------------------------------------------------------------------
  const BuildPlaceSprites = [];

  function ensureBuildPlaceSprites(){
    if (BuildPlaceSprites.length) return; // schon geladen
    const phases = [0,1,2];
    for (const idx of phases){
      const img = new Image();
      img.src = `assets/buildings/building_place/baustelle_${idx}.png`;
      BuildPlaceSprites.push(img);
    }
  }

  // -------------------------------------------------------------------------
  // Canvas-Größe an Viewport anpassen
  // -------------------------------------------------------------------------
  function ensureCanvasSize(Game){
    try{
      const ctx = Game?.ctx;
      if (!ctx) return;
      const c = ctx.canvas;
      if (!c) return;

      const w = window.innerWidth  || document.documentElement.clientWidth  || c.width;
      const h = window.innerHeight || document.documentElement.clientHeight || c.height;

      if (!Mod.sized || c.width !== w || c.height !== h){
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
    Mod.cols     = cols;
    Mod.rows     = rows;
    Mod.tileSize = Number(json.tileSize || json.tile_size || 64);

    const grid = [];
    for (let y = 0; y < rows; y++){
      const row = tiles[y];
      const out = [];
      for (let x = 0; x < cols; x++){
        out.push(row[x] | 0);
      }
      grid.push(out);
    }
    Mod.grid = grid;

    if (Mod.tileset){
      Mod.ready = true;
      LOG('Map übernommen:', json, '→ renderfähig');
    } else {
      LOG('Map übernommen – warte noch auf Tileset...');
    }
  }

  // -------------------------------------------------------------------------
  // Tileset laden
  // -------------------------------------------------------------------------
  function loadTileset(Game){
    const canvas     = Game?.ctx?.canvas;
    const tilesetUrl = canvas?.getAttribute('data-tileset')
                     || 'assets/tiles/tileset.terrain.png';

    Mod.tilesetUrl = tilesetUrl;

    const img = new Image();
    img.onload = ()=>{
      Mod.tileset = img;
      Mod.tilesetCols = Math.max(1, Math.floor(img.width / Mod.tileSize) || 1);
      LOG('Tileset geladen:', tilesetUrl, 'Cols=', Mod.tilesetCols);
      if (Mod.grid){
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

    // 1) Canvasgröße anpassen
    ensureCanvasSize(Game);

    // 2) kompletten Canvas löschen (Screen-Space)
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);

    // 3) Kamera anwenden
    const cam  = window.GameCamera || {};
    const zoom = cam.zoom ?? 1;
    const camX = cam.x    ?? 0;
    const camY = cam.y    ?? 0;

    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);

    // 4) Tiles zeichnen, wenn Map + Tileset bereit
    if (!Mod.ready || !Mod.tileset || !Mod.grid){
      return;
    }

    const ts   = Mod.tileSize;
    const cols = Mod.tilesetCols;
    const img  = Mod.tileset;

    for (let y=0; y<Mod.rows; y++){
      const row = Mod.grid[y];
      if (!row) continue;

      for (let x=0; x<Mod.cols; x++){
        const tileId = row[x] | 0;
        if (!tileId) continue; // 0 = leer

        const id = tileId - 1;  // 0-basiert
        const sx = (id % cols) * ts;
        const sy = Math.floor(id / cols) * ts;
        const dx = x * ts;
        const dy = y * ts;

        try{
          ctx.drawImage(
            img,
            sx, sy, ts, ts,
            dx, dy, ts, ts
          );
        }catch(e){
          WARN('drawImage-Fehler (x='+x+', y='+y+', id='+id+'):', e?.message || e);
        }
      }
    }

    // 6) Gebäude-Overlay (Baustellen / fertige Gebäude)
    if (Array.isArray(Game?.buildings)){
      // Baustellen-Sprites lazy laden
      ensureBuildPlaceSprites();

      const reg = window.Registry || {};
      for (const b of Game.buildings){
        const bx = (b.x | 0) * ts;
        const by = (b.y | 0) * ts;
        const bw = (b.w || 1) * ts;
        const bh = (b.h || 1) * ts;

        // Standard-Fallback-Farbe (fertig)
        let col = 'rgba(80,200,80,0.9)';

        // Bauphase bestimmen (0,1,2 = Baustelle; >=3 = fertig)
        const stage = typeof b.buildStage === 'number' ? b.buildStage : 3;

        let drawFallback = false;

        if (stage < 3){
          // Baustelle → passende Grafik verwenden
          const idx = Math.min(stage, BuildPlaceSprites.length - 1);
          const imgBP = BuildPlaceSprites[idx];
          if (imgBP && imgBP.complete){
            ctx.drawImage(imgBP, bx, by, bw, bh);
          } else {
            // solange Bild noch lädt: Farb-Fallback nach Phase
            if (stage === 0) col = 'rgba(200,150,50,0.6)';
            if (stage === 1) col = 'rgba(220,180,80,0.7)';
            if (stage === 2) col = 'rgba(140,200,120,0.8)';
            drawFallback = true;
          }
        } else {
          // fertiges Gebäude → Sprite aus Registry / Assets
          let def = null;
          if (typeof reg.getBuilding === 'function'){
            def = reg.getBuilding(b.id);
          } else if (reg.buildings && reg.buildings[b.id]){
            def = reg.buildings[b.id];
          }

          let imgB = null;
          if (def && def.img && window.Assets?.get){
            imgB = Assets.get(def.img);
          }

          if (imgB && imgB.complete){
            ctx.drawImage(imgB, bx, by, bw, bh);
          } else {
            // solange kein Sprite vorhanden ist: grüne Fläche
            drawFallback = true;
          }
        }

        if (drawFallback){
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, bw, bh);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // INIT – Map + Tileset SELBST laden (ohne map-bridge)
  // -------------------------------------------------------------------------
  function init(Game){
    const canvas = document.getElementById('game');
    const mapUrl = canvas?.getAttribute('data-map')
                 || 'data/maps/map-epoch1.json';

    // Map laden
    fetch(mapUrl)
      .then(r => {
        if (!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      })
      .then(json => {
        applyMapJson(json);
        if (Mod.tileset){
          Mod.ready = true;
          LOG('Map + Tileset bereit → renderfähig');
        }
      })
      .catch(err => {
        WARN('Fehler beim Laden der Map:', err);
      });

    // Tileset laden
    loadTileset(Game);

    return Mod;
  }

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameMap = { init, render, _state: Mod };

})();
