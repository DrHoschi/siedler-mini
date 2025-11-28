/* ============================================================================
 * Datei   : core/game.construction.js
 * Version : v25.11.27-final
 * Zweck   : Bauphasen steuern
 * ========================================================================== */

(function(){
  'use strict';

  const TAG='[construction]';
  const LOG=(...a)=> (window.CBLog?.ok??console.log)(TAG,...a);

  const PHASE = {
    SITE:0, MATERIAL:1, FINISH:2, COMPLETE:3
  };

  const TIME = {
    SITE:2000, MATERIAL:1500, FINISH:1200
  };

  window.addEventListener('cb:build:deliver', ev=>{
    const {x,y} = ev.detail;
    const b = Game.buildings.find(b=>b.x===x && b.y===y);
    if (!b) return;

    if (b.buildStage === PHASE.SITE){
      b.buildStage = PHASE.MATERIAL;
      b.buildTimer = 0;
      LOG('Material geliefert', b.id);
    }
  });

  function tick(dt){
    for (const b of Game.buildings){
      switch (b.buildStage){

        case PHASE.SITE:
          b.buildTimer += dt*1000;
          break;

        case PHASE.MATERIAL:
          b.buildTimer += dt*1000;
          if (b.buildTimer > TIME.MATERIAL){
            b.buildStage = PHASE.FINISH;
            b.buildTimer = 0;
          }
          break;

        case PHASE.FINISH:
          b.buildTimer += dt*1000;
          if (b.buildTimer > TIME.FINISH){
            b.buildStage = PHASE.COMPLETE;
            dispatchEvent(new CustomEvent('cb:build:complete',{detail:{id:b.id}}));
            LOG('Gebäude fertig', b.id);
          }
          break;
      }
    }
  }

  window.GameConstruction = { tick };
})();
