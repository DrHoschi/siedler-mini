/* ============================================================================
 * Datei   : core/game.build.js
 * Version : v25.11.28-final-unified
 * Zweck   : Gebäude platzieren + Baujobs erzeugen (korrekt mit Buildings-Modul)
 * ========================================================================== */

import { Buildings } from "./game.buildings.js";

(function(){
  'use strict';
  const TAG = '[build]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);

  function place(type, x, y){
    // 1) Gebäude-Definition holen
    const def = window.Registry.buildings[type];
    if (!def){
      console.warn(TAG,'Unbekanntes Gebäude:', type);
      return;
    }

    // 2) Gebäude-Objekt korrekt erzeugen
    const b = Buildings.create(type, x, y);  // <— wichtiger Fix!!!
    if (!b) return;

    LOG("Gebäude platziert:", type, x, y);

    // 3) HQ-Position speichern
    if (type === 'b.hq'){
      if (!window.GameUnits.hqPos)
        window.GameUnits.hqPos = { x, y };
      LOG('HQ gesetzt', GameUnits.hqPos);
    }

    // 4) Baujob erzeugen
    window.JobEngine.add({
      type: 'build',
      buildingId: b.id,
      pos: { x, y },
      need: def.cost || { wood: 2 }
    });

    // 5) UI/Inspector informieren
    dispatchEvent(new CustomEvent('cb:build:placed', {
      detail:{ id:b.id, type, x, y }
    }));
  }

  window.GameBuild = { place };
})();
