/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-buildsprites+units
 * Zweck   : Map (map-epoch1.json) + Tileset laden und mit GameCamera
 *           rendern (Pan + Zoom) + Baustellen + einfache Einheitenanzeige.
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
  // Sprites: Baustellen + fertige Gebäude
  // -------------------------------------------------------------------------
  const BuildPlaceSprites   = [];          // baustelle_0/1/2
  const BuildingSpriteCache = new Map();   // key = buildingId ("b.hq" …) → Image

  function ensureBuildPlaceSprites(){
    if (BuildPlaceSprites.length) return;
    for (let i=0;i<3;i++){
      const img = new Image();
      img.src = `assets/buildings/building_place/baustelle_${i}.png`;
      BuildPlaceSprites[i] = img;
    }
  }

  function resolveBuildingSpritePath(id){
    // Hier kannst du später die Pfade anpassen!
    // Aktuell: assets/buildings/b.hq.png / b.lumberjack.png / b.quarry.png …
    const raw  = String(id || '');
    return `assets/buildings/${raw}.png`;
  }

  function getBuildingSprite(id){
    if (!id) return null;
    if (BuildingSpriteCache.has(id)) return BuildingSpriteCache.get(id);

    const path = resolveBuildingSpritePath(id);
    const img  = new Image();
    img.src    = path;
    BuildingSpriteCache.set(id, img);
    return img;
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
  // Map-JSON normalisieren
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
        grid[y][x] = row[x] | 0;
      }
    }
    Mod.grid = grid;

    if (Mod.tileset){
      Mod.ready = true;
      LOG('Map übernommen:', json, '→ renderfähig');
    } else {
      LOG('Map übernommen – warte noch auf Tileset …');
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
  // Units ermitteln (für Fallback-Punkte)
  // -------------------------------------------------------------------------
  function getUnitsForDraw(){
    if (Array.isArray(window.Game?.units)) return window.Game.units;
    if (Array.isArray(window.GameUnits?.list)) return window.GameUnits.list;
    if (Array.isArray(window.__units)) return window.__units;
    return [];
  }

  // -------------------------------------------------------------------------
  // INIT – Map + Tileset laden
  // -------------------------------------------------------------------------
  function init(Game){
    const canvas = document.getElementById('game');
    const mapUrl = canvas?.getAttribute('data-map')
                 || 'data/maps/map-epoch1.json';

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

    loadTileset(Game);
    return Mod;
  }

  // -------------------------------------------------------------------------
  // RENDER – Map + Gebäude + Units
  // -------------------------------------------------------------------------
  function render(Game){
    const ctx = Game?.ctx;
    if (!ctx) return;

    // Canvas an Bildschirm anpassen
    ensureCanvasSize(Game);

    // Screen-Space clear
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);

    // Kamera anwenden
    const cam  = window.GameCamera || {};
    const zoom = cam.zoom ?? 1;
    const camX = cam.x    ?? 0;
    const camY = cam.y    ?? 0;
    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);

    // Map + Tileset bereit?
    if (!Mod.ready || !Mod.grid || !Mod.tileset) return;

    const img = Mod.tileset;
    const ts  = Mod.tileSize;

    // Terrain
    for (let y = 0; y < Mod.rows; y++){
      const row = Mod.grid[y];
      for (let x = 0; x < Mod.cols; x++){
        const id = row[x] | 0;
        if (id <= 0) continue;

        const tid = id - 1;
        const sx  = (tid % Mod.tilesetCols) * ts;
        const sy  = Math.floor(tid / Mod.tilesetCols) * ts;
        const dx  = x * ts;
        const dy  = y * ts;

        try{
          ctx.drawImage(img, sx, sy, ts, ts, dx, dy, ts, ts);
        }catch(e){
          WARN('drawImage-Fehler (x='+x+', y='+y+', id='+id+'):', e?.message || e);
        }
      }
    }

    // ---------------------------------------------------------------------
    // Gebäude-Overlay (Baustellen + fertige Gebäude)
    // ---------------------------------------------------------------------
    if (Array.isArray(Game?.buildings) && Game.buildings.length){
      ensureBuildPlaceSprites();

      for (const b of Game.buildings){
        const bx = (b.x | 0) * ts;
        const by = (b.y | 0) * ts;
        const bw = (b.w || 1) * ts;
        const bh = (b.h || 1) * ts;

        const stage = typeof b.buildStage === 'number' ? b.buildStage : 3;

        // Standard-Farben
        let col = 'rgba(80,200,80,0.9)';   // fertig
        if (stage === 0) col = 'rgba(200,150,50,0.6)';
        if (stage === 1) col = 'rgba(220,180,80,0.7)';
        if (stage === 2) col = 'rgba(140,200,120,0.8)';

        let useFallback = false;

        if (stage < 3){
          const idx = Math.max(0, Math.min(2, stage));
          const imgSite = BuildPlaceSprites[idx];
          if (imgSite && imgSite.complete){
            ctx.drawImage(imgSite, bx, by, bw, bh);
          } else {
            useFallback = true;
          }
        } else {
          const imgB = getBuildingSprite(b.id);
          if (imgB && imgB.complete){
            ctx.drawImage(imgB, bx, by, bw, bh);
          } else {
            // Solange kein fertiges Gebäudebild da ist → Fallback
            useFallback = true;
          }
        }

        if (useFallback){
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, bw, bh);
        }
      }
    }

    // ---------------------------------------------------------------------
    // Einheiten-Fallback: Carrier als weiße Punkte
    // ---------------------------------------------------------------------
    const units = getUnitsForDraw();
    if (units.length){
      ctx.save();
      ctx.fillStyle   = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      for (const u of units){
        const ux = (u.x || 0) * ts + ts/2;
        const uy = (u.y || 0) * ts + ts/2;
        ctx.beginPath();
        ctx.arc(ux, uy, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameMap = { init, render, _state: Mod };

})();
