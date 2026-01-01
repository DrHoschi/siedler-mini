/* ============================================================================
 * Datei   : core/game.buildings.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v26.01.01-occupy-grow-entries
 *
 * Zweck   :
 *   - Zentrale Gebäudeliste + Create/Get (eine Quelle: Buildings.list)
 *   - Atlas-Sprite Binding pro Gebäude (__sprite)
 *   - "Occupy" Trigger (Worker betritt Entrance) → nach Delay Wachstum/Upgrade
 *   - Overlay-Reveal: Frame-0 bleibt stehen, Ziel-Frame wächst Bottom→Top darüber
 *
 * WICHTIG:
 *   - Entrances werden in buildings.json als relative Offsets gepflegt:
 *       entrances:[{dx,dy}, ...]
 *   - Wir berechnen zusätzlich entranceTx/entranceTy (absolute Tür-Tile)
 * ========================================================================== */

(function () {
  'use strict';

  const TAG  = '[buildings]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function _getDef(buildingId){
    try{
      const R = window.Registry;
      if (!R) return null;
      if (typeof R.getBuilding === 'function') return R.getBuilding(buildingId);
      if (typeof R.get === 'function') return R.get('buildings', buildingId);
    }catch(e){}
    return null;
  }

  function _normUid(id,x,y){
    return `${id}@${(x|0)},${(y|0)}`;
  }

  function _getEntranceAbs(b){
    if (!b) return null;

    // 1) already stored
    if (Number.isFinite(Number(b.entranceTx)) && Number.isFinite(Number(b.entranceTy))){
      return { x:(b.entranceTx|0), y:(b.entranceTy|0) };
    }

    // 2) b.entrances
    if (Array.isArray(b.entrances) && b.entrances.length){
      const e0 = b.entrances[0];
      const dx = (e0?.dx|0) || 0;
      const dy = (e0?.dy|0) || 0;
      return { x:(b.x|0)+dx, y:(b.y|0)+dy };
    }

    // 3) Registry
    const def = _getDef(b.id || b.type || '');
    if (def && Array.isArray(def.entrances) && def.entrances.length){
      const e0 = def.entrances[0];
      const dx = (e0?.dx|0) || 0;
      const dy = (e0?.dy|0) || 0;
      return { x:(b.x|0)+dx, y:(b.y|0)+dy };
    }

    // 4) fallback: south middle outside
    const bw = Math.max(1, (b.w|0) || 1);
    const bh = Math.max(1, (b.h|0) || 1);
    return { x:(b.x|0)+Math.floor(bw/2), y:(b.y|0)+bh };
  }

  // -------------------------------------------------------------------------
  // Main API
  // -------------------------------------------------------------------------
  const Buildings = {
    list: [],

    // -----------------------------------------------------------------------
    // Gebäude erzeugen
    // -----------------------------------------------------------------------
    create (buildingType, x, y) {
      const def = _getDef(buildingType);

      if (!def) {
        WARN('Unbekannter Gebäudetyp:', buildingType);
        return null;
      }

      const w = def.size?.w ?? def.size?.width ?? 3;
      const h = def.size?.h ?? def.size?.height ?? 3;

      const b = {
        id         : buildingType,
        type       : buildingType,
        x          : x | 0,
        y          : y | 0,
        w,
        h,

        // UID stabil halten (wichtig für Units/WorkArea/Occupy)
        uid        : _normUid(buildingType, x, y),

        // Entrances übernehmen (dx/dy relativ)
        entrances  : Array.isArray(def.entrances)
          ? def.entrances.map(e => ({ dx:(e?.dx|0)||0, dy:(e?.dy|0)||0 }))
          : [],

        // Baustelle/Renderer (Construction setzt das später um)
        buildStage : 0,
        buildTimer : 0,

        stock      : {},
        productionRule: def.productionRule || null,

        // Occupy/Growth
        occupied   : false,
        occupiedAt : null,
        _grown     : false
      };

      // absolute Türtile (Default = erste Tür)
      const ent = _getEntranceAbs(b);
      b.entranceTx = ent?.x;
      b.entranceTy = ent?.y;

      // Atlas-Sprite-Init (falls Gebäude in Registry als Atlas definiert ist)
      if (def.sprite?.type === 'atlas' && def.sprite?.atlas) {
        b.__sprite = {
          atlas : def.sprite.atlas,
          frame : def.sprite.frames?.place || 'frame_0_0',
          reveal: null,

          // Overlay-Reveal: Base bleibt sichtbar, overlay wächst darüber
          overlayFrame: null,
          overlay: null
        };
      }

      this.list.push(b);
      LOG('Gebäude erzeugt:', b.id, b.uid, 'an', b.x, b.y);
      return b;
    },

    getAll () { return this.list; },

    // Gebäude anhand Tile-Position finden
    getAt (tx, ty) {
      return this.list.find(b =>
        tx >= b.x && ty >= b.y &&
        tx < b.x + b.w &&
        ty < b.y + b.h
      ) || null;
    }
  };

  // -------------------------------------------------------------------------
  // Sprite/Atlas helpers
  // -------------------------------------------------------------------------

  Buildings.ensureSprite = function (b){
    if (!b) return;
    if (b.__sprite && b.__sprite.atlas) return;

    const def = _getDef(b.id || b.type || '');
    const spr = def?.sprite || null;
    if (spr && spr.type === 'atlas' && spr.atlas){
      b.__sprite = b.__sprite || {};
      b.__sprite.atlas  = spr.atlas;
      b.__sprite.frames = spr.frames || null;
      b.__sprite.frame  = (spr.frames?.place) ? spr.frames.place : 'frame_0_0';
      b.__sprite.reveal = null;
      b.__sprite.overlayFrame = null;
      b.__sprite.overlay = null;
    }
  };

  /**
   * Setzt semantisches Frame (place/live/reserve) oder direkten Frame-Namen.
   * reveal=true → Bottom→Top Reveal (direkt auf dem gesetzten Frame)
   */
  Buildings.setSpriteFrame = function (b, frameKey, reveal=false, durationMs=800){
    if (!b) return;
    Buildings.ensureSprite(b);
    if (!b.__sprite) return;

    // HQ: bleibt beim Start-Frame (kein Auto-Growth)
    if (b.id === 'b.hq' && frameKey !== 'place' && frameKey !== 'frame_0_0'){
      return;
    }

    let resolved = frameKey;

    // "0_0" → "frame_0_0"
    if (typeof resolved === 'string' && /^[0-9]+_[0-9]+$/.test(resolved)){
      resolved = 'frame_' + resolved;
    }

    // Semantik via Registry
    try{
      const def = _getDef(b.id);
      const map = def?.sprite?.frames || null;
      if (map && map[frameKey]) resolved = map[frameKey];
    }catch(e){}

    b.__sprite.frame = resolved || b.__sprite.frame || null;

    if (reveal){
      b.__sprite.reveal = { start: performance.now(), dur: durationMs };
    } else {
      b.__sprite.reveal = null;
    }
  };

  /**
   * Overlay-Reveal:
   * - Base-Frame bleibt sichtbar (z.B. frame_0_0)
   * - Ziel-Frame wächst Bottom→Top darüber
   * - Erst am Ende wird spr.frame = overlayFrame gesetzt
   */
  Buildings.startOverlayReveal = function (b, targetKey, durationMs=3200){
    if (!b) return;
    Buildings.ensureSprite(b);
    if (!b.__sprite) return;

    // HQ wächst nicht
    if (b.id === 'b.hq') return;

    let target = targetKey;

    if (typeof target === 'string' && /^[0-9]+_[0-9]+$/.test(target)){
      target = 'frame_' + target;
    }

    // Semantik via Registry
    try{
      const def = _getDef(b.id);
      const map = def?.sprite?.frames || null;
      if (map && map[targetKey]) target = map[targetKey];
    }catch(e){}

    if (!target) return;

    const spr = b.__sprite;
    spr.overlayFrame = target;
    spr.overlay = { start: performance.now(), dur: durationMs };
  };

  // -------------------------------------------------------------------------
  // Occupy / Growth
  // -------------------------------------------------------------------------

  /**
   * Markiert ein Gebäude als "bewohnt".
   * Akzeptiert:
   *  - markOccupied(uid)
   *  - markOccupied(buildingObj)
   *  - markOccupied(buildingObj, unitId)
   */
  Buildings.markOccupied = function (arg, unitId){
    let b = null;

    // 1) building object?
    if (arg && typeof arg === 'object'){
      b = arg;
    }
    // 2) uid?
    else if (arg){
      const uid = String(arg);
      b = Buildings.list.find(x => x && x.uid === uid) || null;
      if (!b && Array.isArray(window.Game?.buildings)){
        b = window.Game.buildings.find(x => x && x.uid === uid) || null;
      }
    }

    if (!b) return;

    // HQ: kein Growth
    if (b.id === 'b.hq') return;

    Buildings.ensureSprite(b);

    if (!b.occupiedAt){
      b.occupied = true;
      b.occupiedAt = performance.now();
      b.occupantId = unitId ?? b.occupantId ?? null;

      try{
        window.dispatchEvent(new CustomEvent('cb:build:occupied', { detail:{ uid:b.uid, id:b.id, x:b.x, y:b.y, unitId:b.occupantId } }));
      }catch(e){}
      LOG('occupied', b.id, b.uid);
    }
  };

  /**
   * Tick:
   *  - schließt laufende Overlay-Reveals ab
   *  - startet Growth 10s nach occupiedAt (wenn noch nicht gewachsen)
   */
  Buildings.tickGrowth = function (dt){
    const now = performance.now();

    // 1) laufende Overlays abschließen
    for (const b of Buildings.list){
      if (!b || b.id === 'b.hq') continue;
      const spr = b.__sprite;
      if (spr && spr.overlay && spr.overlayFrame){
        const t = (now - spr.overlay.start) / (spr.overlay.dur || 1);
        if (t >= 1){
          spr.frame = spr.overlayFrame;
          spr.overlayFrame = null;
          spr.overlay = null;
          b._grown = true;
        }
      }
    }

    // 2) neue Growths starten
    for (const b of Buildings.list){
      if (!b || b.id === 'b.hq') continue;
      if (!b.occupiedAt) continue;
      if (b._grown) continue;
      if (b.__sprite?.overlay) continue;

      const elapsed = now - b.occupiedAt;
      if (elapsed < 10000) continue; // 10s nach Eintritt

      Buildings.ensureSprite(b);
      if (b.__sprite){
        // Base-Frame sicherstellen (falls irgendwas es umgestellt hat)
        Buildings.setSpriteFrame(b, 'place', false);
        // Growth langsam
        Buildings.startOverlayReveal(b, 'live', 20000); // 20s: langsames, realistisches Wachstum

        try{
          window.dispatchEvent(new CustomEvent('cb:build:grow:start', { detail:{ uid:b.uid, id:b.id, x:b.x, y:b.y } }));
        }catch(e){}
        LOG('grow:start', b.id, b.uid);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Export + Sync
  // -------------------------------------------------------------------------
  window.Buildings = Buildings;

  function syncToGame () {
    if (window.Game) {
      window.Game.buildings = Buildings.list;
    }
  }
  syncToGame();

  window.addEventListener('cb:game:start', syncToGame);
  LOG('Buildings geladen (occupy/grow/entries)');
})();
