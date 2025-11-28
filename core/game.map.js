/* ============================================================================
 * Datei   : core/game.map.js
 * Version : v25.11.27-final
 * Zweck   : Map laden + rendern
 * ========================================================================== */

(function(){
  'use strict';

  const TAG='[map]';
  const LOG=(...a)=> (window.CBLog?.ok ?? console.log)(TAG,...a);

  const Mod = {
    map:null,
    tileset:null,
    ts:64
  };

  function init(Game){
    fetch('data/maps/map-epoch1.json')
      .then(r=>r.json())
      .then(json=>{
        Mod.map = json;
        LOG('Map geladen');
      });

    const img = new Image();
    img.src = 'assets/tiles/tileset.terrain.png';
    img.onload = ()=> Mod.tileset = img;

    return Mod;
  }

  function render(Game){
    const ctx = Game.ctx;
    if (!ctx || !Mod.map) return;

    ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);

    // Tiles
    for (const t of Mod.map.tiles){
      ctx.drawImage(
        Mod.tileset,
        t.sx, t.sy, Mod.ts, Mod.ts,
        t.x*Mod.ts, t.y*Mod.ts, Mod.ts, Mod.ts
      );
    }

    // Buildings
    for (const b of Game.buildings){
      ctx.fillStyle = b.buildStage<3 ? 'rgba(200,150,50,0.6)' : 'rgba(80,200,80,0.9)';
      ctx.fillRect(b.x*Mod.ts, b.y*Mod.ts, b.w*Mod.ts, b.h*Mod.ts);
    }
  }

  window.GameMap = { init, render };
})();
