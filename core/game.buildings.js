/* ============================================================================
 * Datei   : core/game.buildings.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.31-fix-atlas-buildings-on-map
 * Zweck   : Zentrale Gebäudeliste + Helper (Create/Get/Occupy/Sprite)
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

  // -----------------------------------------------------------------------
  // Atlas-Mapping (World-Sprites)
  // -----------------------------------------------------------------------
  // Diese Keys werden in core/asset.js registriert.
  // Wenn ein Gebäude KEIN __sprite hat, zeichnet core/game.map.js als Fallback
  // das PNG unter assets/icons/buildings/... (das sind deine Baumenü-Bilder).
  // Daher setzen wir für alle bekannten Atlas-Gebäude __sprite automatisch.
  const ATLAS_BY_BUILDING_ID = {
    'b.hq'        : 'hq_building_atlas',
    'b.hunter'    : 'hunter_building_atlas',
    'b.lumberjack': 'lumberjack_building_atlas',
    'b.quarry'    : 'quarry_building_atlas',
    'b.fisher'    : 'fisher_building_atlas'
  };

  const DEFAULT_FRAMES = {
    place  : 'frame_0_0',
    live   : 'frame_0_0',
    reserve: 'frame_0_0'
  };

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

      const isHQ = String(buildingType) === 'b.hq';

      const b = {
        id         : buildingType,          // einfache ID = Registry-ID
        type       : buildingType,
        x          : x | 0,
        y          : y | 0,
        w,
        h,
        // HQ soll direkt als fertig stehen (keine Bauphasen)
        buildStage : isHQ ? 3 : 0,          // 0..2 Baustelle, 3 = fertig
        buildTimer : 0,
        stock      : {},                    // Ressourcenlager
        productionRule: def.productionRule || null,

        // Occupancy / "bewohnt" (Trigger wenn Worker reingeht)
        occupied   : false,
        occupiedAt : 0,
        occupantId : null
      };

      // ------------------------------------------------------------
      // Atlas-Sprite Init (World-Sprites)
      // ------------------------------------------------------------
      // 1) Wenn die Registry bereits sprite.type==='atlas' liefert -> übernehmen.
      // 2) Sonst: Auto-Mapping über Gebäude-ID (Fix für "Icons auf der Map").
      try {
        if (def?.sprite?.type === 'atlas' && def.sprite.atlas) {
          b.__sprite = {
            atlas : def.sprite.atlas,
            frame : def.sprite.frames?.place || def.sprite.frames?.live || DEFAULT_FRAMES.place,
            basePx: def.sprite.basePx || 256,
            reveal: null
          };
        } else {
          const atlasKey = ATLAS_BY_BUILDING_ID[b.id] || null;
          if (atlasKey) {
            b.__sprite = {
              atlas : atlasKey,
              frame : DEFAULT_FRAMES.place,
              basePx: 256,
              reveal: null
            };
          }
        }

        // HQ: sofort fertig -> Live-Frame setzen (ohne Reveal)
        if (isHQ && b.__sprite) {
          b.__sprite.frame = def?.sprite?.frames?.live || DEFAULT_FRAMES.live;
          b.__sprite.reveal = null;
        }
      } catch (e) {
        // Sprite ist optional; niemals crashen
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
  Buildings.setSpriteFrame = function (b, frameKey, reveal=false, durationMs=800){
  // ---------------------------------------------------------------------
  // Setzt das aktuell zu rendernde Atlas-Frame für ein Gebäude.
  // frameKey kann sein:
  //  - "place" | "live" | "reserve"  (semantisch, wird via Registry gemappt)
  //  - "frame_0_1" etc.              (direkter Frame-Name aus dem Atlas)
  // reveal=true aktiviert den Bottom→Top "Wachstum"-Reveal (Map-Renderer).
  // ---------------------------------------------------------------------
  if (!b || !b.__sprite) return;

  // 1) Semantische Keys → echtes Frame auflösen (über Registry, falls vorhanden)
  let resolved = frameKey;

  if (typeof frameKey === 'string' && !frameKey.startsWith('frame_')){
    try{
      const reg = window.Registry;
      const def = (reg && typeof reg.get === 'function')
        ? reg.get('buildings', b.id)
        : null;

      const map = def?.sprite?.frames || null;
      if (map && map[frameKey]) resolved = map[frameKey];
    }catch(e){}
  }

  // 2) Frame setzen
  b.__sprite.frame = resolved || b.__sprite.frame || null;

  // 3) Reveal (Bottom→Top Wachstum) an/aus
  if (reveal){
    b.__sprite.reveal = {
      start: performance.now(),
      dur  : durationMs
    };
  } else {
    b.__sprite.reveal = null;
  }
};

  // ---------------------------------------------------------------------
  // Occupancy-Helper: Worker betritt Eingang => Gebäude ist "bewohnt"
  // ---------------------------------------------------------------------
  Buildings.markOccupied = function (b, unitId){
    if (!b) return;
    b.occupied = true;
    b.occupiedAt = performance.now();
    b.occupantId = unitId ?? b.occupantId ?? null;
    try{
      window.dispatchEvent(new CustomEvent('cb:building:occupied', { detail:{ b } }));
    }catch(e){}
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
