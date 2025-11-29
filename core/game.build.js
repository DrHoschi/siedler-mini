/* ============================================================================
 * Datei   : core/game.build.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-carriers
 * Zweck   : Gebäude platzieren + Baujobs erzeugen + cb:build:place anbinden
 * ========================================================================= */

(function(){
  'use strict';

  const TAG  = '[build]';
  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  EIN GEBÄUDE PLATZIEREN
  // -------------------------------------------------------------------------
  function place(id, x, y){
    const reg = window.Registry || {};

    // 1) Definition aus Registry holen (falls vorhanden)
    let def = null;
    if (typeof reg.getBuilding === 'function'){
      def = reg.getBuilding(id);
    } else if (reg.buildings && reg.buildings[id]){
      def = reg.buildings[id];
    }

    if (!def){
      WARN('Registry kennt Gebäude nicht → verwende Platzhalter 3x3:', id);
    }

    const w = def?.size?.w ?? def?.size?.width ?? 3;
    const h = def?.size?.h ?? def?.size?.height ?? 3;

    if (!window.Game){
      WARN('Game fehlt – kann Gebäude nicht anlegen');
      return;
    }
    if (!Array.isArray(Game.buildings)){
      Game.buildings = [];
    }

    const b = {
      id,
      type       : id,
      x : x|0,
      y : y|0,
      w,
      h,
      buildStage : 0,          // 0 = Baustelle_0
      buildTimer : 0,
      stock      : 0
    };

    Game.buildings.push(b);

    // -----------------------------------------------------------------------
    // HQ-SPEZIALFALL:
    //  - Position merken
    //  - falls noch keine Carrier existieren → direkt welche spawnen
    // -----------------------------------------------------------------------
    if (id === 'b.hq' && window.GameUnits){
      GameUnits.hqPos = { x: b.x, y: b.y };
      LOG('HQ gesetzt', GameUnits.hqPos);

      try{
        if (typeof GameUnits.spawnCarrier === 'function' &&
            Array.isArray(GameUnits.list) &&
            GameUnits.list.length === 0){
          // Drei Träger rund ums HQ
          GameUnits.spawnCarrier(b.x + 1, b.y);
          GameUnits.spawnCarrier(b.x - 1, b.y);
          GameUnits.spawnCarrier(b.x,     b.y + 1);
        }
      }catch(e){
        WARN('Carrier-Spawn bei HQ fehlgeschlagen:', e?.message || e);
      }
    }

    // -----------------------------------------------------------------------
    //  Baujob erzeugen (direkt an GameUnits) – nur wenn HQ-Position bekannt
    // -----------------------------------------------------------------------
    if (window.GameUnits?.assignJob && GameUnits.hqPos){
      GameUnits.assignJob({
        type      : 'build',
        res       : 'wood',
        from      : { x: GameUnits.hqPos.x, y: GameUnits.hqPos.y },
        to        : { x: b.x,               y: b.y },
        buildingId: id
      });
    } else {
      WARN('Kein Baujob erzeugt – GameUnits oder hqPos fehlen');
    }

    // Event für Construction/HUD/Inspector
    try{
      window.dispatchEvent(new CustomEvent('cb:build:placed',{
        detail:{ id, x:b.x, y:b.y, w:b.w, h:b.h }
      }));
    }catch(_){}

    LOG('Gebäude platziert:', id, '→', b.x, b.y, '| Anzahl=', Game.buildings.length);
  }

  // -------------------------------------------------------------------------
  //  EVENT-BRIDGE: cb:build:place → place(...)
  // -------------------------------------------------------------------------
  function onBuildPlace(ev){
    const d = ev?.detail || {};

    const id = String(d.buildingId ?? d.kind ?? d.type ?? d.id ?? '');
    if (!id){
      WARN('cb:build:place ohne gültige ID', d);
      return;
    }

    const rawX = d.x ?? d.tx;
    const rawY = d.y ?? d.ty;
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)){
      WARN('cb:build:place ohne Koordinaten', d);
      return;
    }

    place(id, rawX|0, rawY|0);
  }

  window.addEventListener('cb:build:place', onBuildPlace);

  // -------------------------------------------------------------------------
  //  EXPORT
  // -------------------------------------------------------------------------
  window.GameBuild = { place };

})();
