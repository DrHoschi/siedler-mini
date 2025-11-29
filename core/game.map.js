/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-buildsprites+units
 * Zweck   : Map (map-epoch1.json) + Tileset selbst laden und mit GameCamera
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

  // Baustellen-Sprites (0/1/2) + Gebäudesprites (fertig)
  const BuildPlaceSprites = [];       // Index = BuildStage 0–2
  const BuildingSpriteCache = new Map(); // key = buildingId ("b.hq" usw.)

  // -------------------------------------------------------------------------
  // Helpers: Canvas-Größe anpassen
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
  // Baustellen-Sprites lazy laden
  // -------------------------------------------------------------------------
  function ensureBuildPlaceSprites(){
    if (BuildPlaceSprites.length) return;
    for (let i=0;i<3;i++){
      const img = new Image();
      img.src = `assets/buildings/building_place/baustelle_${i}.png`;
      BuildPlaceSprites[i] = img;
    }
  }

  // -------------------------------------------------------------------------
  // Gebäudesprite (fertiges Gebäude) holen
  //
  // WICHTIG: Hier kannst du später die Pfade anpassen, z. B.:
  //   b.hq         → assets/buildings/hq_map.png
  //   b.lumberjack → assets/buildings/holzfaeller_map.png
  // -------------------------------------------------------------------------
  function resolveBuildingSpritePath(id){
    const raw = String(id || '');
    const base = raw.replace(/^b\./,''); // b.hq → hq

    // 1. Versuch: assets/buildings/<id>.png  (b.hq.png)
    let p = `assets/buildings/${raw}.png`;
    // 2. Versuch: assets/buildings/<base>.png (hq.png)
    if (!BuildingSpriteCache.has(p)) {
      // wir versuchen mehrere Varianten; erste, die existiert, wird genutzt
      return p;
    }
    // Optional weitere Varianten:
    // p = `assets/buildings/${base}_map.png`;
    return p;
  }

  function getBuildingSprite(id){
    if (!id) return null;

    // schon geladen?
    if (BuildingSpriteCache.has(id)) return BuildingSpriteCache.get(id);

    const path = resolveBuildingSpritePath(id);
    const img = new Image();
    img.src = path;
    BuildingSpriteCache.set(id, img);
    return img;
  }

  // -------------------------------------------------------------------------
  // INIT – Map + Tileset SELBST laden (ohne map-bridge)
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
        if (Mod.tileset){
          Mod.ready = true;
          LOG('Map + Tileset bereit → renderfähig');
        }
      })
      .catch(err => {
        WARN('Fehler beim Laden der Map:', err);
      });

    loadTileset(Game);
    return Mod;
  }

  // -------------------------------------------------------------------------
  // RENDER – mit GameCamera (Pan + Zoom)
  // -------------------------------------------------------------------------
  function render(Game){
    const ctx = Game?.ctx;
    if (!ctx) return;

    // 1) Canvas an Bildschirm anpassen
    ensureCanvasSize(Game);

    // 2) Clear im Screen-Space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 3) Kamera
    const cam   = window.GameCamera || {};
    const zoom  = cam.zoom ?? 1;
    const camX  = cam.x    ?? 0;
    const camY  = cam.y    ?? 0;
    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);

    // 4) Tiles zeichnen
    if (!Mod.ready || !Mod.grid || !Mod.tileset) {
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

        const id = tileId - 1;
        const sx = (id % cols) * ts;
        const sy = Math.floor(id / cols) * ts;
        const dx = x * ts;
        const dy = y * ts;

        try{
          ctx.drawImage(img, sx, sy, ts, ts, dx, dy, ts, ts);
        }catch(e){
          WARN('drawImage-Fehler tile=', tileId, '→', e?.message || e);
        }
      }
    }

    // ---------------------------------------------------------------------
    // 5) Gebäude-Overlay (Baustellen / fertige Gebäude)
    // ---------------------------------------------------------------------
    if (Array.isArray(Game?.buildings) && Game.buildings.length){
      ensureBuildPlaceSprites();

      for (const b of Game.buildings){
        const bx = (b.x | 0) * ts;
        const by = (b.y | 0) * ts;
        const bw = (b.w || 1) * ts;
        const bh = (b.h || 1) * ts;

        const stage = typeof b.buildStage === 'number' ? b.buildStage : 3;

        // Fallback-Farbe
        let col = 'rgba(80,200,80,0.9)';   // fertig
        if (stage === 0) col = 'rgba(200,150,50,0.6)';
        if (stage === 1) col = 'rgba(220,180,80,0.7)';
        if (stage === 2) col = 'rgba(140,200,120,0.8)';

        let useFallback = false;

        if (stage < 3){
          // Baustellen-Grafik
          const idx = Math.max(0, Math.min(2, stage));
          const imgSite = BuildPlaceSprites[idx];
          if (imgSite && imgSite.complete){
            ctx.drawImage(imgSite, bx, by, bw, bh);
          } else {
            useFallback = true;
          }
        } else {
          // Fertiges Gebäude → Sprite
          const imgB = getBuildingSprite(b.id);
          if (imgB && imgB.complete){
            ctx.drawImage(imgB, bx, by, bw, bh);
          } else {
            // solange noch kein Bild geladen ist → grünes Quadrat
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
    // 6) Einfache Carrier-Anzeige (Fallback, falls Overlay nicht läuft)
    // ---------------------------------------------------------------------
    if (Array.isArray(Game?.units) && Game.units.length){
      const z  = zoom;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      for (const u of Game.units){
        const cx = (u.x || 0) * ts + ts/2;
        const cy = (u.y || 0) * ts + ts/2;
        const sx = cx;
        const sy = cy;

        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI*2);
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
