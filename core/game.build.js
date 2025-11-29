/* ============================================================================
 * Datei   : core/game.build.js
 * Version : v25.11.29-mapfix1
 * Zweck   : Gebäude platzieren + Baujobs erzeugen (mit Fallback bei Registry)
 * Struktur: LOG-Helfer → place() → Export
 * ============================================================================
 */

(function(){
  'use strict';

  const TAG = '[build]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const WARN= (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  EIN GEBÄUDE PLATZIEREN
  //  - id  : z.B. "b.hq", "b.lumberjack" (kommt aus dem Baumenü)
  //  - x,y : Tile-Koordinate (linke obere Ecke)
  // -------------------------------------------------------------------------
  function place(id, x, y){
    const reg = window.Registry || {};

    // 1) Versuche, Definition aus Registry zu holen
    let def = null;
    if (typeof reg.getBuilding === 'function'){
      def = reg.getBuilding(id);
    } else if (reg.buildings && reg.buildings[id]){
      def = reg.buildings[id];
    }

    if (!def){
      // Fallback: trotzdem platzieren, damit du was siehst
      WARN('Registry kennt Gebäude nicht → verwende Platzhalter 3x3:', id);
    }

    const w = def?.size?.w || 3;
    const h = def?.size?.h || 3;

    // 2) Einfaches Gebäude-Objekt anlegen
    const b = {
      id,
      type       : id,
      x, y,
      w, h,
      buildStage : 0,        // 0 = Baustelle
      buildTimer : 0,
      stock      : 0
    };

    if (!Array.isArray(Game.buildings)){
      Game.buildings = [];
    }
    Game.buildings.push(b);

    LOG('Gebäude platziert:', id, 'an', x, y, 'Größe', w+'x'+h);

    // 3) HQ-Spezialfall → Position für Carrier merken
    if (id === 'b.hq' && window.GameUnits){
      GameUnits.hqPos = { x, y };
      LOG('HQ gesetzt → hqPos =', GameUnits.hqPos);
    }

    // 4) Baujob anlegen (einfacher Prototyp – 1 Holz vom HQ zur Baustelle)
    if (window.GameUnits && GameUnits.assignJob && GameUnits.hqPos){
      GameUnits.assignJob({
        type      : 'build',
        res       : 'wood',
        from      : { x: GameUnits.hqPos.x, y: GameUnits.hqPos.y },
        to        : { x, y },
        buildingId: id
      });
    }

    // 5) Event für andere Systeme (Construction, HUD, Inspector, …)
    dispatchEvent(new CustomEvent('cb:build:placed',{
      detail:{ id, x, y, w, h }
    }));
  }

  // -------------------------------------------------------------------------
  //  EXPORT
  // -------------------------------------------------------------------------
  window.GameBuild = { place };

})();
