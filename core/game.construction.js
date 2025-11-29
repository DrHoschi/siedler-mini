/* ============================================================================
 * Datei   : core/game.construction.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-split1
 * Zweck   : Bauphasen (Baustelle → fertig) steuern
 * Lauscht : cb:build:deliver { x, y, res, qty }
 * Sendet  : cb:build:complete { id }
 * ========================================================================= */

(function () {
  'use strict';

  const TAG  = '[construction]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);

  const PHASE = {
    SITE    : 0,
    MATERIAL: 1,
    FINISH  : 2,
    COMPLETE: 3
  };

  const TIME = {
    SITE    : 2000,
    MATERIAL: 1500,
    FINISH  : 1200
  };

  // Hilfsfunktion: aktuelle Gebäudeliste holen (Buildings bevorzugt)
  function allBuildings () {
    if (window.Buildings?.getAll) return Buildings.getAll();
    if (window.Game?.buildings)   return Game.buildings;
    return [];
  }

  // --------------------------------------------------------------
  //  Material-Lieferung (von Units)
  // --------------------------------------------------------------
  window.addEventListener('cb:build:deliver', (ev) => {
    const { x, y } = ev.detail || {};
    const list = allBuildings();

    let b = null;
    if (window.Buildings?.getAt) {
      b = Buildings.getAt(x, y);
    } else {
      b = list.find(g => g.x === x && g.y === y) || null;
    }
    if (!b) return;

    if (b.buildStage === PHASE.SITE) {
      b.buildStage = PHASE.MATERIAL;
      b.buildTimer = 0;
      LOG('Material geliefert → Phase MATERIAL:', b.id);
    }
  });

  // --------------------------------------------------------------
  //  Tick: Bauphasen voranschreiten lassen
  // --------------------------------------------------------------
  function tick (dt) {
    const list = allBuildings();
    const ms   = dt * 1000;

    for (const b of list) {
      switch (b.buildStage) {
        case PHASE.SITE:
          b.buildTimer += ms;
          // (Hier könnte man irgendwann Baustelle nach Zeit verschwinden lassen)
          break;

        case PHASE.MATERIAL:
          b.buildTimer += ms;
          if (b.buildTimer > TIME.MATERIAL) {
            b.buildStage = PHASE.FINISH;
            b.buildTimer = 0;
          }
          break;

        case PHASE.FINISH:
          b.buildTimer += ms;
          if (b.buildTimer > TIME.FINISH) {
            b.buildStage = PHASE.COMPLETE;
            b.buildTimer = 0;
            try {
              window.dispatchEvent(new CustomEvent('cb:build:complete', {
                detail: { id: b.id }
              }));
            } catch { /* egal */ }
            LOG('Gebäude fertiggestellt:', b.id);
          }
          break;

        case PHASE.COMPLETE:
        default:
          // nichts mehr zu tun
          break;
      }
    }
  }

  window.GameConstruction = { tick };
})();
