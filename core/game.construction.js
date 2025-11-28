/* ============================================================================
 * Datei   : core/game.construction.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-final
 *
 * Zweck   : Bauphasen steuern:
 *            – Baustelle → Material → Finish → Fertig
 *            – Zeitsteuerung
 *            – Event-Auslösung für Renderer/Inspector
 *
 * Struktur: IMPORTS → KONSTANTEN → FUNKTIONEN → TICK → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[construction]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  // ------------------------------------------------------------
  // KONSTANTEN
  // ------------------------------------------------------------
  const BUILD_PHASE = {
    SITE: 0,
    MATERIAL: 1,
    FINISH: 2,
    COMPLETE: 3
  };

  const buildTimes = {
    SITE: 2000,
    MATERIAL: 1500,
    FINISH: 1000
  };

  // ------------------------------------------------------------
  // MATERIAL-LIEFERUNG (von game.units.js)
  // ------------------------------------------------------------
  window.addEventListener('cb:build:deliver', ev=>{
    const { x, y } = ev.detail;
    const b = Game.buildings.find(b=> b.x===x && b.y===y);
    if (!b) return;

    if (b.buildStage === BUILD_PHASE.SITE){
      b.buildStage = BUILD_PHASE.MATERIAL;
      b.buildTimer = 0;
      LOG('Material geliefert → Stage MATERIAL', b.id);
    }
  });

  // ------------------------------------------------------------
  // BAUPHASEN-TICK
  // ------------------------------------------------------------
  function tick(dt){
    for (const b of Game.buildings){

      switch (b.buildStage){

        case BUILD_PHASE.SITE:
          b.buildTimer += dt;
          if (b.buildTimer > buildTimes.SITE){
            dispatchEvent(new CustomEvent('cb:build:waiting',{detail:{id:b.id}}));
          }
          break;

        case BUILD_PHASE.MATERIAL:
          b.buildTimer += dt;
          if (b.buildTimer > buildTimes.MATERIAL){
            b.buildStage = BUILD_PHASE.FINISH;
            b.buildTimer = 0;
            dispatchEvent(new CustomEvent('cb:build:finish',{detail:{id:b.id}}));
          }
          break;

        case BUILD_PHASE.FINISH:
          b.buildTimer += dt;
          if (b.buildTimer > buildTimes.FINISH){
            b.buildStage = BUILD_PHASE.COMPLETE;
            dispatchEvent(new CustomEvent('cb:build:complete',{detail:{id:b.id}}));
            LOG('Gebäude fertig →', b.id);
          }
          break;
      }
    }
  }

  // ------------------------------------------------------------
  // EXPORT
  // ------------------------------------------------------------
  window.GameConstruction = { tick };

})();
