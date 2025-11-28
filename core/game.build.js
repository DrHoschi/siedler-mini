/* ============================================================================
 * Datei   : core/game.build.js
 * Version : v25.11.27-final
 * Zweck   : Gebäude platzieren + Baujobs erzeugen
 * ========================================================================== */

(function(){
  'use strict';
  const TAG = '[build]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG,...a);

  function place(id, x, y){
    const def = Registry.getBuilding(id);
    if (!def){
      console.warn(TAG,'Unbekanntes Gebäude:', id);
      return;
    }

    const b = {
      id,
      x,y,
      w:def.size?.w||3,
      h:def.size?.h||3,
      buildStage:0,
      buildTimer:0,
      stock:0
    };
    Game.buildings.push(b);

    if (id === 'b.hq'){
      GameUnits.hqPos = { x,y };
      LOG('HQ gesetzt', GameUnits.hqPos);
    }

    // Baujob erzeugen
    GameUnits.assignJob({
      type:'build',
      res:'wood',
      from: GameUnits.hqPos,
      to:{x,y},
      buildingId:id
    });

    dispatchEvent(new CustomEvent('cb:build:placed',{detail:{id,x,y}}));
  }

  window.GameBuild = { place };
})();
