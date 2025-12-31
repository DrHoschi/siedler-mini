/* ============================================================================
 * Datei   : core/game.buildings.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.31-atlas-place-occupy-grow
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
  

  // -----------------------------------------------------------------------
  //  NEU: Bewohnung + Wachstum (Atlas-Gebäude)
  // -----------------------------------------------------------------------
  // Idee:
  //  - 'place' = Frame 0_0 (sofort sichtbar nach Place/Load/BuildComplete)
  //  - 'live'  = nächstes Upgrade-Frame (z.B. 0_1), erst NACHDEM das Gebäude
  //             bewohnt wurde (Worker geht in den Eingang) und ein Timer ablief.
  //
  // Wichtig:
  //  - HQ ist Sonderfall: immer 'place', keine Bauphasen und kein Wachstum.
  //  - Der Worker-Teil wird später ergänzt: er muss beim Erreichen des Entrance
  //    Buildings.markOccupied(buildingUid) aufrufen oder cb:building:occupied emitten.

  const GROW_DELAY_MS  = 15000;  // 15 Sekunden nach "bewohnt"
  const GROW_REVEAL_MS = 1200;   // Reveal-Dauer Bottom→Top

  function isHQ(b){
    return !!b && (b.id === 'b.hq' || b.type === 'b.hq' || b.buildingId === 'b.hq');
  }

  function isAtlasBuilding(b){
    // Wir betrachten ein Gebäude als "Atlas-Gebäude", wenn __sprite existiert
    // (wird beim create() gesetzt, sobald Registry.sprite.type === 'atlas').
    return !!(b && b.__sprite && b.__sprite.atlas);
  }

  /**
   * Markiert ein Gebäude als "bewohnt".
   * Wird später vom Worker beim Entrance-Erreichen getriggert.
   */
  Buildings.markOccupied = function(uidOrBuilding){
    let b = null;

    if (!uidOrBuilding) return null;

    if (typeof uidOrBuilding === 'object') {
      b = uidOrBuilding;
    } else {
      const uid = uidOrBuilding;
      b = Buildings.list.find(x => x && x.uid === uid) || null;
    }

    if (!b || isHQ(b)) return b;

    if (typeof b.occupied !== 'boolean') b.occupied = false;
    if (typeof b.occupiedAt !== 'number') b.occupiedAt = 0;
    if (typeof b.grownStage !== 'number') b.grownStage = 0;

    if (!b.occupied){
      b.occupied = true;
      b.occupiedAt = performance.now?.() ?? Date.now();

      LOG('Gebäude bewohnt (occupied)', { id: b.id, uid: b.uid, x: b.x, y: b.y });
    }
    return b;
  };

  /**
   * Tick: prüft bewohnte Atlas-Gebäude und schaltet nach Timer auf "live"
   * (mit Bottom→Top Reveal).
   */
  Buildings.tickGrowth = function(dt){
    const now = performance.now?.() ?? Date.now();

    for (const b of Buildings.list){
      if (!b) continue;
      if (!isAtlasBuilding(b)) continue;
      if (isHQ(b)) continue;

      if (typeof b.occupied !== 'boolean') b.occupied = false;
      if (typeof b.occupiedAt !== 'number') b.occupiedAt = 0;
      if (typeof b.grownStage !== 'number') b.grownStage = 0;

      // Nur einmal upgraden (Stage 0 → 1)
      if (b.occupied && b.grownStage === 0){
        if (b.occupiedAt > 0 && (now - b.occupiedAt) >= GROW_DELAY_MS){
          b.grownStage = 1;

          // Upgrade-Frame: semantisch "live"
          try {
            Buildings.setSpriteFrame(b, 'live', true, GROW_REVEAL_MS);
          } catch(e) {}

          LOG('Atlas-Wachstum: place → live', { id: b.id, uid: b.uid });
        }
      }
    }
  };

  // Optionaler Listener: Worker/Module können cb:building:occupied senden.
  window.addEventListener('cb:building:occupied', (ev)=>{
    const d = ev.detail || {};
    const uid = d.uid || d.buildingUid || null;
    if (uid) Buildings.markOccupied(uid);
  });
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
