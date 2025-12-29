/* ============================================================================
 * Datei   : core/game.buildings.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.29-buildings-spriteframe-fix
 * Zweck   : Zentrale Gebäudeliste + Helper (Create/Get) + Sprite-Helper
 * --------------------------------------------------------------------------
 *  - Buildings.list = EINE Quelle für ALLE Gebäude
 *  - create(type,x,y) liest Größe aus Registry
 *  - übernimmt optional def.sprite -> b.__sprite (für Atlas-Rendering)
 *  - setSpriteFrame(b, frame, reveal, dur) für „Wachstum“-Reveal (Bottom→Top)
 * ========================================================================= */

(function () {
  'use strict';

  const TAG  = '[buildings]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getBuildingDef(buildingType){
    // Registry bevorzugt (dein Standard)
    if (window.Registry && typeof window.Registry.get === 'function'){
      try{
        // je nach Registry: get('buildings','b.hunter') oder get('b.hunter')
        // Wir versuchen beides tolerant:
        let def = window.Registry.get('buildings', buildingType);
        if (!def) def = window.Registry.get(buildingType);
        return def || null;
      } catch(e){
        WARN('Registry.get() Fehler:', e);
      }
    }

    // Fallback: falls Registry.buildings existiert
    if (window.Registry && Array.isArray(window.Registry.buildings)){
      return window.Registry.buildings.find(b => b && b.id === buildingType) || null;
    }

    return null;
  }

  function cloneSpriteDef(spriteDef){
    if (!spriteDef || typeof spriteDef !== 'object') return null;
    const atlas = spriteDef.atlas || spriteDef.atlasId || spriteDef.atlasName;
    const frame = spriteDef.frame || spriteDef.frameName;
    if (!atlas || !frame) return null;

    return {
      atlas: String(atlas),
      frame: String(frame),
      reveal: null
    };
  }

  // ---------------------------------------------------------------------------
  // Buildings API
  // ---------------------------------------------------------------------------

  const Buildings = {
    list: [],

    create (buildingType, x, y) {
      const def = getBuildingDef(buildingType) || {};
      const w = def.size?.w ?? def.size?.width  ?? 3;
      const h = def.size?.h ?? def.size?.height ?? 3;

      const b = {
        id         : buildingType,
        type       : buildingType,

        // Tile-Koordinaten (TopLeft)
        x          : x | 0,
        y          : y | 0,
        tx         : x | 0,
        ty         : y | 0,

        w,
        h,

        buildStage : 0,          // 0 = Baustelle
        buildTimer : 0,
        stock      : {},

        // Produktionsregel optional
        productionRule: def.productionRule || null,

        // Sprite-Override (fertig-Renderer in game.map.js nutzt b.__sprite)
        __sprite   : cloneSpriteDef(def.sprite)
      };

      this.list.push(b);
      LOG('Gebäude erzeugt:', b.id, 'an', b.x, b.y, 'sprite?', !!b.__sprite);
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
    },

    /**
     * Setzt den Frame eines Gebäude-Sprites und (optional) eine Reveal-Animation.
     * reveal=true -> Bottom→Top Reveal (Renderer in game.map.js)
     */
    setSpriteFrame (b, frameName, reveal = false, durMs = 1200) {
      if (!b) return false;

      // Falls noch kein Sprite vorhanden ist, aber Def eins hat → nachziehen
      if (!b.__sprite){
        const def = getBuildingDef(b.id || b.type) || {};
        b.__sprite = cloneSpriteDef(def.sprite);
      }

      if (!b.__sprite) return false;

      b.__sprite.frame = String(frameName);

      if (reveal){
        b.__sprite.reveal = {
          start: performance.now(),
          dur: Math.max(50, durMs|0)
        };
      } else {
        b.__sprite.reveal = null;
      }

      return true;
    }
  };

  // global machen
  window.Buildings = Buildings;

  // Game.buildings → gleiche Liste (Kompatibilität)
  function syncToGame () {
    if (window.Game) {
      window.Game.buildings = Buildings.list;
    }
  }
  syncToGame();

  window.addEventListener('cb:game:start', syncToGame);
})();
