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

  // HQ soll NICHT automatisch wachsen/wechseln.
  if (b.id === 'b.hq' && frameKey !== 'place' && frameKey !== 'frame_0_0') {
    return;
  }

  if (typeof frameKey === 'string' && !frameKey.startsWith('frame_')){
  // Falls ein Key wie "0_0" kommt, normalisieren wir auf "frame_0_0" (Atlas-JSON nutzt dieses Prefix).
    try{
      // Wenn jemand '0_0'/'0_1' etc. übergibt, normalisieren wir auf 'frame_0_0'.
      if (typeof resolved === 'string' && /^[0-9]+_[0-9]+$/.test(resolved)) {
        resolved = 'frame_' + resolved;
      }

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


  
  /**
   * Startet ein "Wachstum" als Overlay: Frame-0 bleibt sichtbar,
   * der Ziel-Frame wächst von unten nach oben darüber.
   * Erst wenn der Reveal fertig ist, wird auf den Ziel-Frame umgeschaltet.
   */
  Buildings.startOverlayReveal = function (b, targetKey, durationMs=2200){
    if (!b) return;
    Buildings.ensureSprite(b);
    if (!b.__sprite) return;

    // HQ wächst nicht.
    if (b.id === 'b.hq') return;

    // Ziel-Frame auflösen (semantisch -> echter Frame-Name)
    let target = targetKey;
    if (typeof target === 'string' && !target.startsWith('frame_')){
      // 0_0 normalisieren
      if (/^[0-9]+_[0-9]+$/.test(target)) target = 'frame_' + target;

      try{
        const reg = window.Registry;
        const def = (reg && typeof reg.get === 'function') ? reg.get('buildings', b.id) : null;
        const map = def?.sprite?.frames || null;
        if (map && map[targetKey]) target = map[targetKey];
      }catch(e){}
    }

    if (!target) return;

    // Overlay nur starten, wenn nicht schon aktiv
    const spr = b.__sprite;
    spr.overlayFrame = target;
    spr.overlay = { start: performance.now(), dur: durationMs };
  };

// -------------------------------------------------------------------------
  // Sprite/Atlas Attach + Occupy/Growth
  // -------------------------------------------------------------------------

  /**
   * Sorgt dafür, dass ein Gebäude ein __sprite-Objekt besitzt (Atlas-Key + Frame).
   * Nutzt buildings.json/Registry: sprite:{type:'atlas', atlas:'..._building_atlas', frames:{place/live/reserve}}
   */
  Buildings.ensureSprite = function (b){
    if (!b) return;
    if (b.__sprite && b.__sprite.atlas) return; // bereits ok

    const def = window.Registry?.getBuilding?.(b.id) || window.Registry?.get?.('buildings', b.id) || null;
    const spr = def?.sprite || null;

    if (spr && spr.type === 'atlas' && spr.atlas){
      b.__sprite = b.__sprite || {};
      b.__sprite.atlas  = spr.atlas;
      b.__sprite.frames = spr.frames || null;
      b.__sprite.frame  = (spr.frames?.place) ? spr.frames.place : 'frame_0_0';
      // HQ bleibt immer beim Start-Frame (kein Auto-Growth).
      if (b.id === 'b.hq') {
        b.__sprite.frame = (spr.frames?.place) ? spr.frames.place : 'frame_0_0';
        b.__sprite.overlayFrame = null;
        b.__sprite.overlay = null;
        b.__sprite.reveal = null;
        b._grown = true;
        b.occupiedAt = null;
        b.occupied = false;
      }
      b.__sprite.reveal = null;
    }
  };

  /** Markiert ein Gebäude als "bewohnt" – startet Upgrade-Timer. */
  Buildings.markOccupied = function (uid){
    if (!uid) return;

    // Gebäude finden (primär Buildings.list; Fallback: Game.buildings)
    let b = Buildings.list.find(x => x && x.uid === uid) || null;
    if (!b && Array.isArray(window.Game?.buildings)){
      b = window.Game.buildings.find(x => x && x.uid === uid) || null;
    }
    if (!b) return;

    // HQ ist sofort fertig und hat kein Wachstum.
    if (b.id === 'b.hq') return;

    // Sprite sicherstellen
    Buildings.ensureSprite(b);

    // Einmalig markieren
    if (!b.occupiedAt){
      b.occupiedAt = performance.now();
      b.occupied   = true;
      // Debug-Event optional
      try{
        window.dispatchEvent(new CustomEvent('cb:build:occupied', { detail:{ uid:b.uid, id:b.id, x:b.x, y:b.y } }));
      }catch(e){}
      LOG('occupied', b.id, b.uid);
    }
  };

  /**
   * Tick: prüft alle Gebäude, die "bewohnt" sind und nach 15s upgraden sollen.
   * Upgrade bedeutet: Frame auf "live" + Reveal bottom→top (600ms).
   */
  Buildings.tickGrowth = function (dt){
    const now = performance.now();

    // 1) Laufende Overlays abschließen (Framewechsel erst nach Reveal-Ende)
    for (const b of Buildings.list){
      if (!b || b.id === 'b.hq') continue;
      const spr = b.__sprite;
      if (spr && spr.overlay && spr.overlayFrame){
        const t = (now - spr.overlay.start) / (spr.overlay.dur || 1);
        if (t >= 1){
          // Umschalten erst JETZT (damit Frame-0 bis zum Ende sichtbar bleibt)
          spr.frame = spr.overlayFrame;
          spr.overlayFrame = null;
          spr.overlay = null;
          b._grown = true;
        }
      }
    }

    // 2) Neue Growths starten (15s nach "occupied")
    for (const b of Buildings.list){
      if (!b || b.id === 'b.hq') continue;
      if (!b.occupiedAt) continue;

      // bereits fertig gewachsen / läuft schon?
      if (b._grown) continue;
      if (b.__sprite?.overlay) continue;

      const elapsed = now - b.occupiedAt;
      if (elapsed < 15000) continue;

      Buildings.ensureSprite(b);

      if (b.__sprite){
        // Wachstum (langsamer als vorher)
        Buildings.startOverlayReveal(b, 'live', 2200); // 2.2s Reveal
        // b._grown wird erst nach Overlay-Ende gesetzt
        try{
          window.dispatchEvent(new CustomEvent('cb:build:grow:start', { detail:{ uid:b.uid, id:b.id, x:b.x, y:b.y } }));
        }catch(e){}
        LOG('grow:start', b.id, b.uid);
      }
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
