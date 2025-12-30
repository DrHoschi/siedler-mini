/* ============================================================================
 * Datei   : core/game.buildings.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-split1
 * Zweck   : Zentrale Gebäudeliste + Helper (Create/Get)
 * --------------------------------------------------------------------------
 *  - Buildings.list = EINE Quelle für ALLE Gebäude
 *  - create(type,x,y) liest Größe aus Registry
 *  - Game.buildings zeigt auf dieselbe Liste (Kompat)
 * ========================================================================= */

(function () {
  'use strict';

  const TAG  = '[buildings]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const Buildings = {
    list: [],

    // -----------------------------------------------------------------------
    //  Gebäude erzeugen
    // -----------------------------------------------------------------------
    create (buildingType, x, y) {
      const reg = window.Registry || {};
      const def = (typeof reg.getBuilding === 'function')
        ? reg.getBuilding(buildingType)
        : (reg.buildings && reg.buildings[buildingType]) || null;

      if (!def) {
        WARN('Unbekannter Gebäudetyp:', buildingType);
        return null;
      }

      const w = def.size?.w ?? def.size?.width ?? 3;
      const h = def.size?.h ?? def.size?.height ?? 3;

      const b = {
        id         : buildingType,          // einfache ID = Registry-ID
        type       : buildingType,
        x          : x | 0,
        y          : y | 0,
        w,
        h,
        buildStage : 0,                     // 0 = Baustelle
        buildTimer : 0,
        stock      : {},                    // Ressourcenlager
        productionRule: def.productionRule || null
      };

      // ------------------------------------------------------------
// Atlas-Sprite-Init (optional, z.B. Hunter)
// ------------------------------------------------------------
if (def.sprite?.type === 'atlas') {
  b.__sprite = {
    atlas : def.sprite.atlas,
    frame : def.sprite.frames?.place || null,
    reveal: null
  };
}
      
      this.list.push(b);
      LOG('Gebäude erzeugt:', b.id, 'an', b.x, b.y);
      return b;
    },

    getAll () {
      return this.list;
    },

    // Gebäude anhand Tile-Position finden
    getAt (tx, ty) {
      return this.list.find(b =>
        tx >= b.x && ty >= b.y &&
        tx < b.x + b.w &&
        ty < b.y + b.h
      ) || null;
    }
  };
  
// Helper
  Buildings.setSpriteFrame = function (b, frameName, reveal=false, durationMs=800){
  if (!b || !b.__sprite) return;
  b.__sprite.frame = frameName;

  if (reveal){
    b.__sprite.reveal = {
      start: performance.now(),
      dur  : durationMs
    };
  } else {
    b.__sprite.reveal = null;
  }
};
  
  // global machen
  window.Buildings = Buildings;

  // Game.buildings → gleiche Liste (Kompatibilität für alte Module)
  function syncToGame () {
    if (window.Game) {
      window.Game.buildings = Buildings.list;
      return true;
    }
    return false;
  }

  // Sofort versuchen (falls Game schon existiert)
  syncToGame();

  // Robust: wenn Game später gesetzt wird (Load-Reihenfolge / Safari Cache),
  // dann ein paar Mal nachziehen.
  (function retrySync(n=0){
    if (syncToGame()) return;
    if (n >= 40) return; // ~4s (40 * 100ms)
    setTimeout(()=> retrySync(n+1), 100);
  })();

  // Zusätzlich bei Start-Event
  window.addEventListener('cb:game:start', syncToGame);
})();
