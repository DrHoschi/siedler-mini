/* ============================================================================
 * Datei   : core/game.build.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.27-final
 *
 * Zweck   : Gebäude platzieren:
 *            – Baustelle erzeugen
 *            – HQ erkennen + Units.hqPos setzen
 *            – Baujobs anlegen (für game.units.js)
 *
 * Struktur: IMPORTS → KONSTANTEN → FUNKTIONEN → EXPORT
 * ========================================================================== */

(function(){
  'use strict';

  const TAG = '[build]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  // ------------------------------------------------------------
  // KONSTANTEN
  // ------------------------------------------------------------
  const BUILD_PHASE = {
    SITE: 0,        // Baustelle
    MATERIAL: 1,    // Material wird geliefert
    FINISH: 2,      // Fertigstellung
    COMPLETE: 3     // Gebäude fertig
  };

  // ------------------------------------------------------------
  // HAUPTFUNKTION – Gebäude platzieren
  // ------------------------------------------------------------
  function place(buildId, x, y){
    LOG('new building', buildId, x, y);

    const b = {
      id: buildId,
      x, y,
      w: 3,
      h: 3,
      buildStage: BUILD_PHASE.SITE,
      buildTimer: 0,
      stock: 0
    };

    // Gebäude registrieren
    Game.buildings.push(b);

    // HQ erkennt hqPos
    if (buildId === 'b.hq'){
      window.GameUnits.hqPos = { x, y };
      LOG('HQ gesetzt → Units.hqPos', window.GameUnits.hqPos);
    }

    // Baujob erzeugen
    window.GameUnits.assignJob({
      type: 'build',
      res: 'wood',
      from: window.GameUnits.hqPos,
      to: { x, y },
      buildingId: buildId
    });

    // Visual-Event für andere Module
    dispatchEvent(new CustomEvent('cb:build:placed',{
      detail:{id:buildId, x,y}
    }));
  }

  // ------------------------------------------------------------
  // EXPORT
  // ------------------------------------------------------------
  window.GameBuild = { place };

})();
