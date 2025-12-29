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
  // -----------------------------------------------------------------------
//  Helper: Sprite-Frame für Atlas-Gebäude umschalten
// -----------------------------------------------------------------------
//  Wird benötigt für:
//   - Reveal-Animation (Bottom→Top Wachstum)
//   - Frame-Wechsel nach Bau / später Upgrade (place → live → reserve …)
//
//  Erwartet im Building-Def (data/buildings.json):
//    sprite: {
//      type: "atlas",
//      atlas: "hunter_building_atlas",
//      frames: { place:"frame_0_0", live:"frame_0_1", reserve:"frame_0_2" }
//    }
//
//  Usage:
//    Buildings.setSpriteFrame(b, 'live', true, 800);      // nimmt Mapping aus def.sprite.frames
//    Buildings.setSpriteFrame(b, 'frame_0_1', true, 800); // oder direkt Frame-Name
//
Buildings.setSpriteFrame = function (b, which, reveal=false, durationMs=800){
  if (!b) return null;

  const def = window.Registry?.get?.('buildings', b.type) || null;

  // Wenn kein Atlas-Def vorliegt, versuchen wir zumindest das interne Feld zu setzen.
  if (!def || def.sprite?.type !== 'atlas') {
    if (b.__sprite && typeof which === 'string') {
      b.__sprite.frame = which;
      if (reveal){
        b.__sprite.reveal = { start: performance.now(), dur: durationMs };
      }
      return which;
    }
    return null;
  }

  // __sprite sicherstellen (alte Saves / früh erzeugte Buildings)
  if (!b.__sprite) {
    b.__sprite = {
      atlas : def.sprite.atlas,
      frame : null,
      reveal: null
    };
  }

  // Mapping: "place/live/reserve" → tatsächlicher Frame-Name
  const mapped = (def.sprite.frames && def.sprite.frames[which]) ? def.sprite.frames[which] : which;

  if (typeof mapped === 'string' && mapped.length) {
    b.__sprite.atlas = def.sprite.atlas;
    b.__sprite.frame = mapped;

    if (reveal){
      b.__sprite.reveal = { start: performance.now(), dur: durationMs };
    } else {
      b.__sprite.reveal = null;
    }

    return mapped;
  }

  return null;
};

  
  // global machen
  window.Buildings = Buildings;

  // Game.buildings → gleiche Liste (Kompatibilität für alte Module)
  function syncToGame () {
    if (window.Game) {
      window.Game.buildings = Buildings.list;
    }
  }
  syncToGame();

  window.addEventListener('cb:game:start', syncToGame);
})();
