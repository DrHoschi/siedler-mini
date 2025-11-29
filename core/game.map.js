/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-buildsprites
 * Zweck   : Map (map-epoch1.json) + Tileset laden und mit GameCamera rendern.
 *           Zusätzlich:
 *           - Gebäude-Overlay mit Baustellen-Grafiken (baustelle_0/1/2.png)
 *           - fertige Gebäude mit eigenem Sprite pro ID
 * ========================================================================= */

(function(){
  'use strict';

  const TAG  = '[map]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // Map-State
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
    sized      : false,

    // Gebäude-Sprites (fertige Gebäude, nach ID, z.B. "b.hq")
    buildingSprites   : {},
    // Baustellen-Sprites für die Bauphasen (baustelle_0/1/2.png)
    buildPlaceSprites : []
  };

  // Bauphasen-Konstanten (muss zu game.construction.js passen)
  const BUILD_PHASE = { SITE:0, MATERIAL:1, FINISH:2, COMPLETE:3 };

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
  // -------------------------------------------------------------------------
  function applyMapJson(json){
    if (!json){
      WARN('applyMapJson ohne JSON aufgerufen');
      return;
    }

    Mod.name     = json.name || 'unknown';
    Mod.cols     = Number(json.width  || 1);
    Mod.rows     = Number(json.height || 1);
    Mod.tileSize = Number(json.tilewidth || json.tileWidth || 64);

    // Tiled-Layer „ground“ als 2D-Grid übernehmen
    const layer = (json.layers || []).find(l => l.name === 'ground') || json.layers?.[0];
    if (!layer || !Array.isArray(layer.data)){
      WARN('Kein gültiger Layer in map-json gefunden');
      return;
    }

    const data = layer.data;
    const grid = [];
    for (let y=0; y<Mod.rows; y++){
      const row = [];
      for (let x=0; x<Mod.cols; x++){
        row.push(data[y*Mod.cols + x] | 0);
      }
      grid.push(row);
    }
    Mod.grid = grid;

    // Wenn Tileset schon da ist → ready
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
    const canvas = Game?.ctx?.canvas;
    const tilesetUrl = canvas?.getAttribute('data-tileset') || 'assets/tiles/tileset.terrain.png';

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
  // Gebäude- & Baustellen-Sprites (lazy loading)
  // -------------------------------------------------------------------------

  // fertige Gebäude – z.B. assets/icons/buildings/b.hq.png
  function loadBuildingSprite(id){
    if (!id) return;
    if (Mod.buildingSprites[id]) return;

    const img = new Image();
    img.src = `assets/icons/buildings/${id}.png`;
    Mod.buildingSprites[id] = img;
  }

  // Baustellen-Grafiken: assets/buildings/building_place/baustelle_0/1/2.png
  function ensureBuildPlaceSprites(){
    if (Array.isArray(Mod.buildPlaceSprites) && Mod.buildPlaceSprites.length) return;

    Mod.buildPlaceSprites = [];
    const phases = [0,1,2];

    for (const idx of phases){
      const img = new Image();
      img.src = `assets/buildings/building_place/baustelle_${idx}.png`;
      Mod.buildPlaceSprites.push(img);
    }
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
    if (!Mod.ready || !Mod.tileset || !Mod.grid){
      return;
    }

    const ts   = Mod.tileSize;
    const cols = Mod.tilesetCols;
    const img  = Mod.tileset;

    // 5) Tiles zeichnen
    for (let y=0; y<Mod.rows; y++){
      const row = Mod.grid[y];
      if (!row) continue;

      for (let x=0; x<Mod.cols; x++){
        const tileId = row[x] | 0;
        if (!tileId) continue; // 0 = leer

        const id   = tileId - 1;                // 0-basiert
        const sx   = (id % cols) * ts;
        const sy   = Math.floor(id / cols) * ts;
        const dx   = x * ts;
        const dy   = y * ts;

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
      const buildings = Game.buildings;
      // Sprites vorbereiten (Baustellen-Grafiken werden lazy geladen)
      ensureBuildPlaceSprites();

      for (const b of buildings){
        const bx = (b.x | 0) * ts;
        const by = (b.y | 0) * ts;
        const bw = (b.w || 1) * ts;
        const bh = (b.h || 1) * ts;

        // Bauphase ermitteln
        let stage = BUILD_PHASE.COMPLETE;
        if (typeof b.buildStage === 'number'){
          stage = b.buildStage;
        }

        let spr = null;

        if (stage < BUILD_PHASE.COMPLETE){
          // Baustelle – richtige Bauphasen-Grafik nutzen
          const idx = Math.min(stage, Mod.buildPlaceSprites.length - 1);
          spr = Mod.buildPlaceSprites[idx] || null;
        } else {
          // Fertiges Gebäude – Gebäude-Sprite nach ID laden
          loadBuildingSprite(b.id);
          spr = Mod.buildingSprites?.[b.id] || null;
        }

        if (spr && spr.complete){
          ctx.drawImage(spr, bx, by, bw, bh);
        } else {
          // Fallback: halbtransparente Fläche (falls Sprite noch lädt)
          ctx.fillStyle = 'rgba(255,200,140,0.25)';
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 2 / Math.max(1, zoom || 1);
          ctx.strokeRect(bx+1, by+1, bw-2, bh-2);
        }
      }
    }
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
