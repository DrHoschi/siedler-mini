/* ============================================================================
 * Datei   : core/game.map.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-final
 *
 * Zweck   : Map laden + rendern
 *           – Tileset
 *           – Boden-Rendering
 *           – Gebäude-Rendering (ruhig, Bau, fertig)
 *
 * Struktur: IMPORTS → STATE → INIT → RENDER → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[map]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  const MapMod = {
    tileset: null,
    map: null,
    tileSize: 64
  };

  // ------------------------------------------------------------
  // MAP LADEN
  // ------------------------------------------------------------
  function init(Game){
    const url = 'data/maps/map-epoch1.json';
    MapMod.map = Game.map;

    fetch(url).then(r=>r.json()).then(json=>{
      MapMod.map = json;
      LOG('Map geladen', json);
    });

    // Tileset laden
    const img = new Image();
    img.src = 'assets/tiles/tileset.terrain.png';
    img.onload = ()=> MapMod.tileset = img;

    return MapMod;
  }

  // ------------------------------------------------------------
  // TILE RENDER
  // ------------------------------------------------------------
  function drawTerrain(ctx, map){
    if (!map || !MapMod.tileset) return;

    const ts = MapMod.tileSize;
    const img = MapMod.tileset;

    map.tiles.forEach(t=>{
      ctx.drawImage(
        img,
        t.sx, t.sy, ts, ts,
        t.x * ts, t.y * ts, ts, ts
      );
    });
  }

  // ------------------------------------------------------------
  // GEBÄUDE RENDER
  // ------------------------------------------------------------
  function drawBuildings(ctx){
    const ts = MapMod.tileSize;

    for (const b of Game.buildings){
      // Platzhalter-Grafik
      ctx.fillStyle = (b.buildStage < 3) ? "rgba(200,150,50,0.6)" : "rgba(120,200,120,0.9)";
      ctx.fillRect(b.x*ts, b.y*ts, b.w*ts, b.h*ts);
    }
  }

  // ------------------------------------------------------------
  // HAUPTRENDER
  // ------------------------------------------------------------
  function render(Game){
    const ctx = Game.ctx;
    if (!ctx) return;

    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);

    if (MapMod.map) drawTerrain(ctx, MapMod.map);
    drawBuildings(ctx);
  }

  // ------------------------------------------------------------
  // EXPORT
  // ------------------------------------------------------------
  window.GameMap = { init, render };

})();
